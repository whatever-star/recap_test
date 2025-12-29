
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DEFAULT_MONTHS } from './constants';
import { MonthData, AIAnalysis, Memory } from './types';
import { MonthSelector } from './components/MonthSelector';
import { PhotoGallery } from './components/PhotoGallery';
import { DetailModal } from './components/DetailModal';
import { ShareModal } from './components/ShareModal';
import { generateMonthlyRecap } from './services/gemini';
import { useBGM } from './hooks/useBGM';
import heic2any from 'heic2any';

const DB_NAME = 'YearlyRecapDB_v11';
const STORE_NAME = 'memories';
const BLOB_STORE = 'media_blobs';
const META_KEY = 'app_metadata';
const BGM_STORE_KEY = 'custom_bgm_blob';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 4);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveBlob = async (id: string, blob: Blob) => {
  const db = await initDB();
  const tx = db.transaction(BLOB_STORE, 'readwrite');
  tx.objectStore(BLOB_STORE).put(blob, id);
};

const getBlob = async (id: string): Promise<Blob | null> => {
  const db = await initDB();
  const tx = db.transaction(BLOB_STORE, 'readonly');
  return new Promise((resolve) => {
    const req = tx.objectStore(BLOB_STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
};

const App: React.FC = () => {
  const [allMonthsData, setAllMonthsData] = useState<MonthData[]>(DEFAULT_MONTHS);
  const [currentMonthId, setCurrentMonthId] = useState<number>(DEFAULT_MONTHS[0].id);
  const [currentYear, setCurrentYear] = useState<number>(DEFAULT_MONTHS[0].year);
  const [loadingAI, setLoadingAI] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Memory | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);
  
  // 커스텀 BGM URL 상태
  const [customBgmUrl, setCustomBgmUrl] = useState<string>("assets/bgm.mp3");
  
  const { 
    isMuted, 
    isPlaying, 
    isLoading: isBGMLoading, 
    isPreviewing,
    play, 
    preview,
    pause, 
    handleVideoStart, 
    handleVideoEnd 
  } = useBGM(customBgmUrl);

  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [editStory, setEditStory] = useState('');
  const [editMood, setEditMood] = useState('');
  
  const [blobUrlMap, setBlobUrlMap] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedMonth = useMemo(() => {
    return allMonthsData.find(m => m.id === currentMonthId && m.year === currentYear) || allMonthsData[0];
  }, [allMonthsData, currentMonthId, currentYear]);

  // 커스텀 BGM 로드
  useEffect(() => {
    const loadCustomBgm = async () => {
      const blob = await getBlob(BGM_STORE_KEY);
      if (blob) {
        setCustomBgmUrl(URL.createObjectURL(blob));
      }
    };
    loadCustomBgm();
  }, []);

  const handleBgmFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await saveBlob(BGM_STORE_KEY, file);
      const newUrl = URL.createObjectURL(file);
      setCustomBgmUrl(newUrl);
      alert("배경음악이 설정되었습니다. 바탕화면의 파일을 성공적으로 불러왔습니다.");
    }
  };

  useEffect(() => {
    if (selectedMedia?.type === 'video') {
      handleVideoStart();
    } else {
      handleVideoEnd();
    }
  }, [selectedMedia, handleVideoStart, handleVideoEnd]);

  const toggleMute = async () => {
    if (isBGMLoading) return;
    if (isMuted) {
      try { await play(); } catch (err) { console.warn("Interaction required"); }
    } else {
      pause();
    }
  };

  const handlePreviewBGM = async () => {
    if (isBGMLoading || isPreviewing) return;
    try { await preview(); } catch (err) { console.warn("Interaction required"); }
  };

  const loadAllMedia = async (data: MonthData[]) => {
    const urls: Record<string, string> = {};
    for (const m of data) {
      for (const mem of m.memories) {
        const b = await getBlob(mem.id);
        if (b) urls[mem.id] = URL.createObjectURL(b);
      }
    }
    setBlobUrlMap(urls);
  };

  useEffect(() => {
    const loadData = async () => {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(META_KEY);
      req.onsuccess = async () => {
        if (req.result) {
          const data = req.result as MonthData[];
          setAllMonthsData(data);
          await loadAllMedia(data);
        }
      };
    };
    loadData();
  }, []);

  const syncMetaData = useCallback((data: MonthData[]) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      initDB().then(db => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(data, META_KEY);
      });
    }, 500);
  }, []);

  const handleReorderMemories = useCallback((startIndex: number, endIndex: number) => {
    if (startIndex === endIndex) return;
    setAllMonthsData(prev => {
      const next = prev.map(m => {
        if (m.id === currentMonthId && m.year === currentYear) {
          const newMemories = [...m.memories];
          const [removed] = newMemories.splice(startIndex, 1);
          newMemories.splice(endIndex, 0, removed);
          return { ...m, memories: newMemories };
        }
        return m;
      });
      syncMetaData(next);
      return next;
    });
  }, [currentMonthId, currentYear, syncMetaData]);

  const startEditingAnalysis = () => {
    setEditStory(selectedMonth.analysis?.story || '');
    setEditMood(selectedMonth.analysis?.mood || '');
    setIsEditingAnalysis(true);
  };

  const saveAnalysis = () => {
    const nextData = allMonthsData.map(m => 
      (m.id === currentMonthId && m.year === currentYear)
      ? { ...m, analysis: { story: editStory, mood: editMood, keyHighlights: m.analysis?.keyHighlights || [] } }
      : m
    );
    setAllMonthsData(nextData);
    syncMetaData(nextData);
    setIsEditingAnalysis(false);
  };

  const handleAIGenerate = async () => {
    if (selectedMonth.analysis?.story && !window.confirm("덮어씌울까요?")) return;
    setLoadingAI(true);
    try {
      const res = await generateMonthlyRecap(selectedMonth.name, selectedMonth.memories);
      const nextData = allMonthsData.map(m => (m.id === currentMonthId && m.year === currentYear) ? { ...m, analysis: res } : m);
      setAllMonthsData(nextData);
      syncMetaData(nextData);
    } catch (err) { alert("AI 오류"); } finally { setLoadingAI(false); }
  };

  const handleFilesSelection = async (files: FileList) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setIsProcessingFile(true);
    setUploadProgress({ current: 0, total: fileArray.length });
    const processedMemories: Memory[] = [];
    const newUrls: Record<string, string> = {};
    for (let i = 0; i < fileArray.length; i++) {
      setUploadProgress(p => ({ ...p, current: i + 1 }));
      const file = fileArray[i], fileName = file.name.toLowerCase();
      const isVideo = file.type.includes('video') || ['.mp4', '.mov', '.hevc', '.qt'].some(ext => fileName.endsWith(ext));
      try {
        let finalBlob: Blob = file;
        const memoryId = `mem-${Date.now()}-${i}`;
        if (!isVideo) {
          let f: File | Blob = file;
          if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
            const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.7 });
            f = Array.isArray(converted) ? converted[0] : converted;
          }
          finalBlob = await compressImageToBlob(f);
        }
        await saveBlob(memoryId, finalBlob);
        newUrls[memoryId] = URL.createObjectURL(finalBlob);
        processedMemories.push({ id: memoryId, url: '', type: isVideo ? 'video' : 'image', caption: file.name.split('.')[0], tags: [isVideo ? 'video' : 'image'] });
      } catch (err) { console.error(err); }
    }
    setBlobUrlMap(prev => ({ ...prev, ...newUrls }));
    setAllMonthsData(prev => {
      const next = prev.map(m => (m.id === currentMonthId && m.year === currentYear) ? { ...m, memories: [...processedMemories, ...m.memories] } : m);
      syncMetaData(next); return next;
    });
    setIsProcessingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const compressImageToBlob = (file: File | Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1200; 
        let width = img.width, height = img.height;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject("Canvas failure");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => { URL.revokeObjectURL(url); if (blob) resolve(blob); else reject("failed"); }, 'image/jpeg', 0.8);
      };
      img.onerror = () => reject("Load failed");
    });
  };

  const handleMonthChange = (month: MonthData) => {
    if (month.id === currentMonthId && month.year === currentYear) return;
    setIsTransitioning(true);
    setIsEditingAnalysis(false);
    setTimeout(() => {
      setCurrentMonthId(month.id);
      setCurrentYear(month.year);
      setIsTransitioning(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  };

  const handleUpdateMemory = (memoryId: string, newCaption: string) => {
    setAllMonthsData(prev => {
        const next = prev.map(m => ({ ...m, memories: m.memories.map(mem => mem.id === memoryId ? { ...mem, caption: newCaption } : mem) }));
        syncMetaData(next); return next;
    });
  };

  const handleDeleteMemory = useCallback((memoryId: string) => {
    setAllMonthsData(prev => {
      const next = prev.map(m => ({ ...m, memories: m.memories.filter(mem => mem.id !== memoryId) }));
      syncMetaData(next); return next;
    });
    setSelectedMedia(null);
  }, [syncMetaData]);

  return (
    <div className="min-h-screen bg-[#020202] text-white overflow-x-hidden selection:bg-indigo-500">
      <DetailModal memory={selectedMedia} allMemories={selectedMonth.memories} blobUrlMap={blobUrlMap} onClose={() => setSelectedMedia(null)} onNavigate={setSelectedMedia} onUpdateCaption={handleUpdateMemory} onDelete={handleDeleteMemory} />
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} isPackaging={isPackaging} onShareNative={() => {}} onExport={() => {}} onImport={() => {}} />

      {/* 상단 전역 컨트롤러 */}
      <div className="fixed top-8 right-8 z-[100] flex items-center gap-4">
        
        {/* BGM 설정 버튼 */}
        <button 
          onClick={() => bgmInputRef.current?.click()}
          className="p-5 bg-white/5 text-white/40 border border-white/10 rounded-full hover:bg-white hover:text-black transition-all duration-500 shadow-2xl active:scale-90 group"
          title="바탕화면의 bgm.mp3 선택하기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform group-hover:rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <input type="file" ref={bgmInputRef} className="hidden" accept="audio/mp3,audio/*" onChange={handleBgmFileChange} />
        </button>

        {isMuted && (
          <button onClick={handlePreviewBGM} disabled={isBGMLoading || isPreviewing} className={`flex items-center gap-3 px-5 py-4 rounded-full transition-all duration-500 border glass hover:bg-white/10 active:scale-95 ${isBGMLoading || isPreviewing ? 'opacity-50 cursor-not-allowed' : ''}`}>
             <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isPreviewing ? 'animate-pulse text-indigo-400' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
             <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{isPreviewing ? 'Listening...' : 'Preview BGM'}</span>
          </button>
        )}

        <button onClick={toggleMute} disabled={isBGMLoading} className={`flex items-center gap-4 px-6 py-4 rounded-full transition-all duration-500 shadow-2xl backdrop-blur-3xl border active:scale-90 group ${isBGMLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isMuted ? 'bg-white/5 border-white/10 text-white/40' : 'bg-white text-black border-white ring-4 ring-white/10'}`}>
          {isBGMLoading ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : (
            <div className="flex items-end gap-[2px] h-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className={`w-[2px] rounded-full bg-current transition-all duration-500 ${!isMuted && isPlaying ? 'animate-bounce' : 'h-1 opacity-20'}`} style={{ animationDelay: `${i * 0.1}s`, height: !isMuted && isPlaying ? '100%' : '20%' }} />)}
            </div>
          )}
          <span className="text-[10px] font-black uppercase tracking-widest">{isBGMLoading ? 'Loading...' : isMuted ? 'Music Off' : 'Music On'}</span>
        </button>

        <button onClick={() => setIsShareModalOpen(true)} className="p-5 bg-white text-black rounded-full hover:bg-indigo-600 hover:text-white transition-all duration-500 shadow-2xl active:scale-90 group">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
        </button>
      </div>

      <section className="relative h-[85vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div className={`absolute inset-0 opacity-25 bg-gradient-to-br ${selectedMonth.gradient} blur-[140px] transition-all duration-1000 ${isTransitioning ? 'scale-150' : 'scale-100'}`} />
        <div className={`z-10 transition-all duration-1000 ${isTransitioning ? 'opacity-0 scale-95 translate-y-10' : 'opacity-100 scale-100 translate-y-0'}`}>
          <h2 className="text-[10px] sm:text-xs font-black tracking-[2em] text-white/40 mb-10 uppercase">Digital Time Archive</h2>
          <h1 className="text-7xl sm:text-9xl lg:text-[13rem] serif italic mb-8 leading-none select-none drop-shadow-2xl uppercase tracking-tighter">{selectedMonth.name}</h1>
          <p className="text-xl sm:text-4xl text-white/40 font-light italic max-w-3xl mx-auto px-6 leading-relaxed">"{selectedMonth.quote}"</p>
        </div>
      </section>

      <MonthSelector selectedMonth={selectedMonth} onSelect={handleMonthChange} />

      <main className="max-w-[1700px] mx-auto py-16 sm:py-40 px-6 sm:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 sm:gap-32">
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="glass p-10 sm:p-14 rounded-[50px] sm:rounded-[70px] sticky top-32 border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
              <div className="flex justify-between items-center mb-12">
                <span className="text-[11px] tracking-[0.3em] font-black text-white/30 uppercase">Monthly Reflection</span>
                <div className="flex gap-4">
                  {isEditingAnalysis ? (
                    <button onClick={saveAnalysis} className="px-6 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black tracking-widest hover:bg-white hover:text-black transition-all">저장</button>
                  ) : (
                    <button onClick={startEditingAnalysis} className="p-3 bg-white/5 rounded-full hover:bg-white hover:text-black transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  )}
                  <button onClick={handleAIGenerate} className="p-3 bg-white/5 rounded-full hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-30" disabled={selectedMonth.memories.length === 0 || loadingAI}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loadingAI ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </button>
                </div>
              </div>

              <div className="space-y-12">
                {isEditingAnalysis ? (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div>
                      <label className="text-[9px] font-black text-white/30 uppercase mb-3 block tracking-widest">이야기</label>
                      <textarea value={editStory} onChange={(e) => setEditStory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-xl italic font-serif outline-none focus:border-indigo-500/50" rows={5} placeholder="이야기를 적어보세요..." />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-white/30 uppercase mb-3 block tracking-widest">분위기</label>
                      <input value={editMood} onChange={(e) => setEditMood(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500/50" placeholder="무드..." />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-12 animate-in fade-in duration-700">
                    <p className="text-2xl sm:text-3xl text-white/90 italic font-light leading-snug font-serif">{selectedMonth.analysis?.story || '이야기가 없습니다.'}</p>
                    <div className="flex flex-wrap gap-4 items-center">
                      {selectedMonth.analysis?.mood && <span className="px-6 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-black tracking-widest uppercase">{selectedMonth.analysis.mood}</span>}
                    </div>
                  </div>
                )}

                <div className="relative p-8 sm:p-12 rounded-[50px] border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                  {isProcessingFile ? (
                    <div className="py-16 flex flex-col items-center gap-6 text-white/40">
                      <div className="w-16 h-16 border-[6px] border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em]">처리 중 {uploadProgress.current} / {uploadProgress.total}</span>
                    </div>
                  ) : (
                    <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer py-20 text-center group">
                      <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-700 shadow-2xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </div>
                      <span className="block text-[12px] font-black tracking-[0.4em] text-white/40 uppercase mb-3">기록 추가하기</span>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" multiple onChange={(e) => e.target.files && handleFilesSelection(e.target.files)} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 order-1 lg:order-2">
            <header className="flex justify-between items-end mb-16 border-b border-white/10 pb-8">
              <h3 className="text-6xl sm:text-8xl serif italic text-white/95 tracking-tight">Gallery</h3>
              <div className="text-right"><span className="block text-[12px] font-black text-white/20 uppercase tracking-[0.3em]">{selectedMonth.memories.length}개의 기록</span></div>
            </header>
            <PhotoGallery memories={selectedMonth.memories} blobUrlMap={blobUrlMap} onSelectMedia={setSelectedMedia} onReorder={handleReorderMemories} />
            {selectedMonth.memories.length === 0 && <div className="py-60 text-center bg-white/[0.01] rounded-[80px] border border-white/5 border-dashed"><p className="text-3xl italic text-white/5 font-serif">아직 등록된 흔적이 없습니다.</p></div>}
          </div>
        </div>
      </main>

      <footer className="py-40 border-t border-white/5 flex flex-col items-center gap-10 text-center px-6">
        <p className="text-[11px] font-black tracking-[0.8em] text-white/10 uppercase">Recap Journey — Since 2025</p>
        <button onClick={() => window.confirm("초기화?") && indexedDB.deleteDatabase(DB_NAME) && window.location.reload()} className="text-[11px] font-black text-red-500/10 hover:text-red-500 uppercase border border-red-500/10 px-10 py-4 rounded-full hover:bg-red-500/5 transition-all tracking-widest">전체 초기화</button>
      </footer>
    </div>
  );
};

export default App;

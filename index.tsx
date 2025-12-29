
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import heic2any from 'heic2any';

// --- TYPES ---
interface Memory {
  id: string;
  url: string;
  type: 'image' | 'video';
  caption: string;
  tags: string[];
}

interface AIAnalysis {
  story: string;
  mood: string;
  keyHighlights: string[];
}

interface MonthData {
  id: number;
  year: number;
  name: string;
  displayName: string;
  color: string;
  gradient: string;
  quote: string;
  memories: Memory[];
  analysis?: AIAnalysis;
}

// --- CONSTANTS ---
const DEFAULT_MONTHS: MonthData[] = [
  { id: 12, year: 2024, name: 'December 2024', displayName: 'DEC 24', color: '#1e40af', gradient: 'from-blue-900 to-indigo-950', quote: "The final chapter of one year, the prologue to another.", memories: [] },
  { id: 1, year: 2025, name: 'January', displayName: 'JAN', color: '#3b82f6', gradient: 'from-blue-600 to-indigo-900', quote: "A fresh start, a blank canvas for the new year.", memories: [] },
  { id: 2, year: 2025, name: 'February', displayName: 'FEB', color: '#ec4899', gradient: 'from-pink-500 to-rose-900', quote: "Quiet moments and cold mornings.", memories: [] },
  { id: 3, year: 2025, name: 'March', displayName: 'MAR', color: '#10b981', gradient: 'from-emerald-500 to-teal-900', quote: "Waiting for the first signs of spring.", memories: [] },
  { id: 4, year: 2025, name: 'April', displayName: 'APR', color: '#f59e0b', gradient: 'from-amber-500 to-orange-900', quote: "The world begins to change colors.", memories: [] },
  { id: 5, year: 2025, name: 'May', displayName: 'MAY', color: '#8b5cf6', gradient: 'from-violet-500 to-purple-900', quote: "Fresh blooms and warmer breezes.", memories: [] },
  { id: 6, year: 2025, name: 'June', displayName: 'JUN', color: '#0ea5e9', gradient: 'from-sky-500 to-blue-900', quote: "The long days of early summer.", memories: [] },
  { id: 7, year: 2025, name: 'July', displayName: 'JUL', color: '#ef4444', gradient: 'from-red-500 to-orange-800', quote: "Golden sun and infinite heat.", memories: [] },
  { id: 8, year: 2025, name: 'August', displayName: 'AUG', color: '#facc15', gradient: 'from-yellow-400 to-amber-700', quote: "Slow afternoons and hazy horizons.", memories: [] },
  { id: 9, year: 2025, name: 'September', displayName: 'SEP', color: '#d97706', gradient: 'from-orange-600 to-amber-900', quote: "The air turns crisp, the days shorten.", memories: [] },
  { id: 10, year: 2025, name: 'October', displayName: 'OCT', color: '#ea580c', gradient: 'from-orange-700 to-red-950', quote: "Autumn in its full, fiery glory.", memories: [] },
  { id: 11, year: 2025, name: 'November', displayName: 'NOV', color: '#713f12', gradient: 'from-brown-700 to-stone-900', quote: "Moments of gratitude and inner warmth.", memories: [] },
  { id: 12, year: 2025, name: 'December', displayName: 'DEC 25', color: '#1e40af', gradient: 'from-blue-800 to-slate-950', quote: "Coming full circle.", memories: [] }
];

// --- SERVICES (AI) ---
const generateMonthlyRecap = async (monthName: string, memories: Memory[]): Promise<AIAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    다음은 ${monthName}의 사진 캡션과 태그 목록입니다.
    이 데이터들을 바탕으로 이 달의 추억을 회상하는 아름답고, 향수를 불러일으키며, 시적인 짧은 요약(이야기)을 **한국어**로 작성해 주세요.
    또한, 이 달의 전체적인 분위기(Mood)를 한 단어로 정의하고, 가장 기억에 남는 3가지 하이라이트를 **한국어**로 추출해 주세요.

    추억 데이터:
    ${memories.map(m => `- 캡션: ${m.caption} (태그: ${m.tags.join(', ')})`).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            story: { type: Type.STRING },
            mood: { type: Type.STRING },
            keyHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["story", "mood", "keyHighlights"],
        },
      },
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      story: "조용히 흐르는 시간 속에서 소중한 성장의 흔적을 발견한 한 달이었습니다.",
      mood: "감성적인",
      keyHighlights: ["고요한 산책", "개인적인 성장", "평온한 저녁"]
    };
  }
};

// --- HOOKS (BGM) ---
let audioInstance: HTMLAudioElement | null = null;
const useBGM = (sourceUrl: string = "assets/bgm.mp3") => {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [wasPlayingBeforeVideo, setWasPlayingBeforeVideo] = useState(false);
  const fadeTimer = useRef<number | null>(null);
  const previewTimer = useRef<number | null>(null);

  useEffect(() => {
    if (audioInstance) {
      audioInstance.pause();
      audioInstance.src = sourceUrl;
      audioInstance.load();
      if (!isMuted && isPlaying) {
        audioInstance.play().catch(() => { setIsMuted(true); setIsPlaying(false); });
      }
    }
  }, [sourceUrl]);

  const fadeVolume = (to: number, duration = 1000) => {
    if (!audioInstance) return;
    if (fadeTimer.current) window.clearInterval(fadeTimer.current);
    const steps = 25, stepTime = duration / steps, from = audioInstance.volume, delta = (to - from) / steps;
    let step = 0;
    fadeTimer.current = window.setInterval(() => {
      if (!audioInstance) return;
      step++;
      audioInstance.volume = Math.min(1, Math.max(0, audioInstance.volume + delta));
      if (step >= steps) {
        audioInstance.volume = to;
        if (fadeTimer.current) { window.clearInterval(fadeTimer.current); fadeTimer.current = null; }
      }
    }, stepTime);
  };

  const play = useCallback(async (isUserEnabling = true) => {
    if (previewTimer.current) { window.clearTimeout(previewTimer.current); previewTimer.current = null; }
    if (isUserEnabling) setIsPreviewing(false);
    try {
      if (!audioInstance) {
        audioInstance = new Audio(sourceUrl);
        audioInstance.loop = true;
        audioInstance.volume = 0;
      }
      setIsLoading(true);
      await audioInstance.play();
      fadeVolume(0.35);
      if (isUserEnabling) { setIsMuted(false); setIsPlaying(true); }
    } catch (err) { setIsMuted(true); setIsPlaying(false); } finally { setIsLoading(false); }
  }, [sourceUrl]);

  const preview = useCallback(async () => {
    if (isPlaying && !isMuted) return;
    setIsPreviewing(true);
    await play(false);
    previewTimer.current = window.setTimeout(() => {
      fadeVolume(0, 1500);
      setTimeout(() => { if (isPreviewing) { audioInstance?.pause(); setIsPreviewing(false); } }, 1600);
    }, 6000);
  }, [isPlaying, isMuted, play, isPreviewing]);

  const pause = useCallback((immediate = false) => {
    if (!audioInstance) return;
    if (previewTimer.current) { window.clearTimeout(previewTimer.current); previewTimer.current = null; }
    if (immediate) { audioInstance.pause(); audioInstance.volume = 0; }
    else { fadeVolume(0, 800); setTimeout(() => audioInstance?.pause(), 850); }
    setIsMuted(true); setIsPlaying(false); setIsPreviewing(false);
  }, []);

  const handleVideoStart = useCallback(() => { if (!isMuted && isPlaying) { setWasPlayingBeforeVideo(true); pause(true); } }, [isMuted, isPlaying, pause]);
  const handleVideoEnd = useCallback(() => { if (wasPlayingBeforeVideo) { play().catch(() => {}); setWasPlayingBeforeVideo(false); } }, [wasPlayingBeforeVideo, play]);

  return { isMuted, isPlaying, isLoading, isPreviewing, play, preview, pause, handleVideoStart, handleVideoEnd };
};

// --- COMPONENTS ---

const MonthSelector = ({ selectedMonth, onSelect }: any) => (
  <div className="sticky top-0 z-50 w-full glass py-4 sm:py-6 overflow-x-auto no-scrollbar border-b border-white/5 bg-black/80">
    <div className="flex justify-start lg:justify-center min-w-max px-6 sm:px-12 gap-3 sm:gap-6">
      {DEFAULT_MONTHS.map((month) => {
        const isActive = selectedMonth.id === month.id && selectedMonth.year === month.year;
        return (
          <button key={`${month.id}-${month.year}`} onClick={() => onSelect(month)} className={`group relative px-5 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all duration-500 uppercase whitespace-nowrap ${isActive ? `bg-white text-black scale-105 shadow-xl` : `text-white/20 hover:text-white hover:bg-white/5`}`}>
            {month.displayName}
            {isActive && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full animate-pulse" />}
          </button>
        );
      })}
    </div>
  </div>
);

const PhotoGallery = ({ memories, blobUrlMap, onSelectMedia, onReorder }: any) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const handleDragStart = (e: any, id: string) => { setDraggedId(id); e.dataTransfer.setData('memoryId', id); };
  const handleDrop = (e: any, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('memoryId');
    if (sourceId && sourceId !== targetId) {
      onReorder(memories.findIndex((m:any) => m.id === sourceId), memories.findIndex((m:any) => m.id === targetId));
    }
    setDraggedId(null); setDragOverTarget(null);
  };
  return (
    <div className="animate-in fade-in duration-700">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-12">
        {memories.map((memory: any, index: number) => (
          <div key={memory.id} draggable onDragStart={(e) => handleDragStart(e, memory.id)} onDragOver={(e) => {e.preventDefault(); setDragOverTarget(memory.id)}} onDrop={(e) => handleDrop(e, memory.id)} className={`group relative aspect-square rounded-[40px] sm:rounded-[60px] overflow-hidden bg-zinc-950 cursor-grab active:cursor-grabbing border transition-all duration-500 shadow-2xl hover:scale-[1.05] ${draggedId === memory.id ? 'opacity-20 scale-90 blur-sm' : 'opacity-100'} ${dragOverTarget === memory.id ? 'border-indigo-500 ring-4 ring-indigo-500/20 z-10 scale-110' : 'border-white/5'}`} onClick={() => onSelectMedia(memory)}>
            {blobUrlMap[memory.id] ? (
              memory.type === 'video' ? <video src={blobUrlMap[memory.id]} className="w-full h-full object-cover" muted loop playsInline /> : <img src={blobUrlMap[memory.id]} className="w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-110" />
            ) : <div className="w-full h-full bg-white/5 animate-pulse" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 p-8 flex flex-col justify-end"><p className="text-white text-sm font-serif italic truncate">"{memory.caption}"</p></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DetailModal = ({ memory, allMemories, blobUrlMap, onClose, onNavigate, onUpdateCaption, onDelete }: any) => {
  const [caption, setCaption] = useState('');
  useEffect(() => { if (memory) setCaption(memory.caption); }, [memory?.id]);
  if (!memory) return null;
  const currentIndex = allMemories.findIndex((m:any) => m.id === memory.id);
  const mediaUrl = blobUrlMap[memory.id];
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center animate-in fade-in duration-500">
      <div className="fixed inset-0 bg-black/95 backdrop-blur-[40px]" onClick={onClose} />
      <div className="relative z-10 w-full lg:max-w-[90vw] h-full lg:h-[85vh] flex flex-col lg:flex-row bg-[#020202] lg:rounded-[60px] overflow-hidden border border-white/10">
        <div className="flex-1 bg-black flex items-center justify-center relative p-4 lg:p-12">
          <button onClick={onClose} className="absolute top-8 left-8 z-50 p-4 bg-white/5 text-white rounded-full">✕</button>
          {mediaUrl && (memory.type === 'video' ? <video src={mediaUrl} controls autoPlay loop className="max-w-full max-h-full rounded-3xl" /> : <img src={mediaUrl} className="max-w-full max-h-full rounded-3xl" />)}
        </div>
        <div className="w-full lg:w-[450px] p-10 bg-zinc-950/40 border-l border-white/5 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-12">
            <span className="text-[11px] font-black text-white/20 tracking-widest uppercase">Reflection</span>
            <textarea className="w-full bg-transparent border-b border-white/5 text-3xl text-white outline-none font-serif italic" rows={3} value={caption} onChange={(e) => { setCaption(e.target.value); onUpdateCaption(memory.id, e.target.value); }} />
          </div>
          <button onClick={() => window.confirm('삭제?') && onDelete(memory.id)} className="mt-12 w-full py-5 bg-red-900/5 text-red-500/40 rounded-3xl text-[10px] font-black tracking-widest uppercase border border-red-500/10">삭제</button>
        </div>
      </div>
    </div>
  );
};

const ShareModal = ({ isOpen, onClose }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="fixed inset-0 bg-black/95" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-zinc-900 rounded-[50px] p-10 border border-white/10">
        <h2 className="text-3xl font-serif italic text-white mb-8">Share Era</h2>
        <p className="text-white/40 text-sm mb-8">데이터를 외부로 전송하거나 백업할 수 있습니다.</p>
        <button onClick={onClose} className="w-full py-4 bg-white text-black rounded-full font-bold">닫기</button>
      </div>
    </div>
  );
};

// --- MAIN APP ---
const DB_NAME = 'YearlyRecapDB_v11', STORE_NAME = 'memories', BLOB_STORE = 'media_blobs', META_KEY = 'app_metadata', BGM_STORE_KEY = 'custom_bgm_blob';
const initDB = (): Promise<IDBDatabase> => new Promise((res, rej) => {
  const req = indexedDB.open(DB_NAME, 4);
  req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME); if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE); };
  req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
});

const App = () => {
  const [allMonthsData, setAllMonthsData] = useState<MonthData[]>(DEFAULT_MONTHS);
  const [currentMonthId, setCurrentMonthId] = useState(DEFAULT_MONTHS[0].id);
  const [currentYear, setCurrentYear] = useState(DEFAULT_MONTHS[0].year);
  const [loadingAI, setLoadingAI] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Memory | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [customBgmUrl, setCustomBgmUrl] = useState("assets/bgm.mp3");
  const [blobUrlMap, setBlobUrlMap] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);

  const { isMuted, isPlaying, isLoading: isBGMLoading, isPreviewing, play, preview, pause, handleVideoStart, handleVideoEnd } = useBGM(customBgmUrl);

  const selectedMonth = useMemo(() => allMonthsData.find(m => m.id === currentMonthId && m.year === currentYear) || allMonthsData[0], [allMonthsData, currentMonthId, currentYear]);

  const saveBlob = async (id: string, blob: Blob) => { const db = await initDB(); const tx = db.transaction(BLOB_STORE, 'readwrite'); tx.objectStore(BLOB_STORE).put(blob, id); };
  const getBlob = async (id: string): Promise<Blob | null> => { const db = await initDB(); return new Promise(res => { const req = db.transaction(BLOB_STORE, 'readonly').objectStore(BLOB_STORE).get(id); req.onsuccess = () => res(req.result); }); };

  useEffect(() => {
    (async () => {
      const db = await initDB();
      const meta = await new Promise(res => { const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(META_KEY); req.onsuccess = () => res(req.result); });
      if (meta) setAllMonthsData(meta as MonthData[]);
      const bgmBlob = await getBlob(BGM_STORE_KEY);
      if (bgmBlob) setCustomBgmUrl(URL.createObjectURL(bgmBlob));
      const urls: any = {};
      const data = (meta as MonthData[]) || DEFAULT_MONTHS;
      for (const m of data) for (const mem of m.memories) { const b = await getBlob(mem.id); if (b) urls[mem.id] = URL.createObjectURL(b); }
      setBlobUrlMap(urls);
    })();
  }, []);

  const syncData = (data: MonthData[]) => initDB().then(db => db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(data, META_KEY));

  const handleFilesSelection = async (files: FileList) => {
    setIsProcessingFile(true);
    const processed: Memory[] = [], newUrls: any = {};
    for (let i = 0; i < files.length; i++) {
      const file = files[i], id = `mem-${Date.now()}-${i}`, isVideo = file.type.includes('video');
      let final: any = file;
      if (!isVideo && (file.name.endsWith('.heic') || file.name.endsWith('.heif'))) {
        const conv = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.7 });
        final = Array.isArray(conv) ? conv[0] : conv;
      }
      await saveBlob(id, final);
      newUrls[id] = URL.createObjectURL(final);
      processed.push({ id, url: '', type: isVideo ? 'video' : 'image', caption: file.name.split('.')[0], tags: [] });
    }
    setBlobUrlMap(p => ({ ...p, ...newUrls }));
    setAllMonthsData(p => { const n = p.map(m => (m.id === currentMonthId && m.year === currentYear) ? { ...m, memories: [...processed, ...m.memories] } : m); syncData(n); return n; });
    setIsProcessingFile(false);
  };

  const handleAIGenerate = async () => {
    setLoadingAI(true);
    try {
      const res = await generateMonthlyRecap(selectedMonth.name, selectedMonth.memories);
      setAllMonthsData(p => { const n = p.map(m => (m.id === currentMonthId && m.year === currentYear) ? { ...m, analysis: res } : m); syncData(n); return n; });
    } finally { setLoadingAI(false); }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-indigo-500">
      <DetailModal memory={selectedMedia} allMemories={selectedMonth.memories} blobUrlMap={blobUrlMap} onClose={() => setSelectedMedia(null)} onUpdateCaption={(id:any, cap:any) => setAllMonthsData(p => { const n = p.map(m => ({ ...m, memories: m.memories.map(mem => mem.id === id ? { ...mem, caption: cap } : mem) })); syncData(n); return n; })} onDelete={(id:any) => { setAllMonthsData(p => { const n = p.map(m => ({ ...m, memories: m.memories.filter(mem => mem.id !== id) })); syncData(n); return n; }); setSelectedMedia(null); }} />
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />

      <div className="fixed top-8 right-8 z-[100] flex items-center gap-4">
        <button onClick={() => bgmInputRef.current?.click()} className="p-5 bg-white/5 border border-white/10 rounded-full hover:bg-white hover:text-black transition-all">⚙</button>
        <input type="file" ref={bgmInputRef} className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { await saveBlob(BGM_STORE_KEY, f); setCustomBgmUrl(URL.createObjectURL(f)); } }} />
        {isMuted && <button onClick={() => preview()} className="px-5 py-4 rounded-full border glass text-[10px] font-black">{isPreviewing ? 'Listening...' : 'Preview'}</button>}
        <button onClick={() => isMuted ? play() : pause()} className={`px-6 py-4 rounded-full border transition-all ${isMuted ? 'bg-white/5 text-white/40' : 'bg-white text-black'}`}>{isMuted ? 'Music Off' : 'Music On'}</button>
      </div>

      <section className="relative h-[85vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div className={`absolute inset-0 opacity-25 bg-gradient-to-br ${selectedMonth.gradient} blur-[140px]`} />
        <div className="z-10">
          <h1 className="text-7xl sm:text-9xl lg:text-[13rem] serif italic mb-8 uppercase tracking-tighter">{selectedMonth.name}</h1>
          <p className="text-xl sm:text-4xl text-white/40 font-light italic">"{selectedMonth.quote}"</p>
        </div>
      </section>

      <MonthSelector selectedMonth={selectedMonth} onSelect={(m:any) => { setIsTransitioning(true); setTimeout(() => { setCurrentMonthId(m.id); setCurrentYear(m.year); setIsTransitioning(false); }, 300); }} />

      <main className="max-w-[1700px] mx-auto py-16 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-5">
            <div className="glass p-10 rounded-[50px] sticky top-32">
              <div className="flex justify-between mb-8">
                 <button onClick={handleAIGenerate} className="p-3 bg-white/5 rounded-full" disabled={loadingAI}>AI Recap</button>
              </div>
              <p className="text-2xl italic font-serif mb-12">{selectedMonth.analysis?.story || '추억을 추가하고 AI 요약을 시작해보세요.'}</p>
              <div onClick={() => fileInputRef.current?.click()} className="py-20 text-center border-2 border-dashed border-white/10 rounded-3xl cursor-pointer">기록 추가 (+)</div>
              <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => e.target.files && handleFilesSelection(e.target.files)} />
            </div>
          </div>
          <div className="lg:col-span-7">
            <PhotoGallery memories={selectedMonth.memories} blobUrlMap={blobUrlMap} onSelectMedia={setSelectedMedia} onReorder={(s:any, e:any) => { setAllMonthsData(p => { const n = p.map(m => { if (m.id === currentMonthId && m.year === currentYear) { const mems = [...m.memories]; const [rem] = mems.splice(s, 1); mems.splice(e, 0, rem); return { ...m, memories: mems }; } return m; }); syncData(n); return n; }); }} />
          </div>
        </div>
      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

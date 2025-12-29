
import React, { useState, useEffect, useCallback } from 'react';
import { Memory } from '../types';

interface DetailModalProps {
  memory: Memory | null;
  allMemories: Memory[];
  blobUrlMap: Record<string, string>;
  onClose: () => void;
  onNavigate: (memory: Memory) => void;
  onUpdateCaption: (id: string, newCaption: string) => void;
  onDelete: (id: string) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ 
  memory, 
  allMemories,
  blobUrlMap, 
  onClose, 
  onNavigate,
  onUpdateCaption, 
  onDelete 
}) => {
  const [caption, setCaption] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const currentIndex = memory ? allMemories.findIndex(m => m.id === memory.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allMemories.length - 1;

  useEffect(() => {
    if (memory) {
      setCaption(memory.caption);
    }
  }, [memory?.id]);

  const handlePrev = useCallback(() => {
    if (hasPrev) onNavigate(allMemories[currentIndex - 1]);
  }, [hasPrev, currentIndex, allMemories, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) onNavigate(allMemories[currentIndex + 1]);
  }, [hasNext, currentIndex, allMemories, onNavigate]);

  // 키보드 내비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  if (!memory) return null;

  const mediaUrl = blobUrlMap[memory.id] || memory.url;

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setCaption(newVal);
    setIsSaving(true);
    onUpdateCaption(memory.id, newVal);
    setTimeout(() => setIsSaving(false), 500);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center animate-in fade-in duration-500">
      <div className="fixed inset-0 bg-black/95 backdrop-blur-[40px]" onClick={onClose} />
      
      {/* 내비게이션 화살표 - 왼쪽 */}
      {hasPrev && (
        <button 
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          className="fixed left-8 top-1/2 -translate-y-1/2 z-[310] p-6 text-white/20 hover:text-white hover:bg-white/5 rounded-full transition-all group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 transform group-hover:-translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* 내비게이션 화살표 - 오른쪽 */}
      {hasNext && (
        <button 
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          className="fixed right-8 top-1/2 -translate-y-1/2 z-[310] p-6 text-white/20 hover:text-white hover:bg-white/5 rounded-full transition-all group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 transform group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <div className="relative z-10 w-full max-w-[100vw] lg:max-w-[90vw] h-full lg:h-[85vh] flex flex-col lg:flex-row bg-[#020202] lg:rounded-[60px] overflow-hidden border border-white/10 shadow-2xl">
        
        {/* 미디어 영역 */}
        <div className="flex-1 bg-black flex items-center justify-center relative min-h-[40vh] lg:min-h-0">
          {/* 닫기 버튼 */}
          <button onClick={onClose} className="absolute top-8 left-8 z-50 p-4 bg-white/5 text-white rounded-full hover:bg-white hover:text-black transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {/* 인디케이터 */}
          <div className="absolute top-8 right-8 z-50 px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
            <span className="text-[10px] font-black text-white/40 tracking-widest uppercase">
              {currentIndex + 1} / {allMemories.length}
            </span>
          </div>
          
          <div className="w-full h-full flex items-center justify-center p-4 lg:p-12">
            {mediaUrl ? (
              memory.type === 'video' ? (
                <video key={memory.id} src={mediaUrl} controls autoPlay loop playsInline className="max-w-full max-h-full object-contain rounded-3xl" />
              ) : (
                <img key={memory.id} src={mediaUrl} className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_0_80px_rgba(255,255,255,0.05)]" />
              )
            ) : (
              <div className="w-64 h-64 bg-white/5 animate-pulse rounded-full flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
                <span className="text-white/20 text-xs font-black uppercase tracking-widest">Loading...</span>
              </div>
            )}
          </div>
        </div>

        {/* 정보 영역 */}
        <div className="w-full lg:w-[450px] p-10 sm:p-14 flex flex-col justify-between bg-zinc-950/40 border-t lg:border-t-0 lg:border-l border-white/5 overflow-y-auto">
          <div className="space-y-12">
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-black tracking-[0.5em] text-white/20 uppercase">Reflection</span>
              {isSaving && (
                <span className="text-[9px] font-bold text-indigo-400 animate-pulse uppercase tracking-widest">저장 중...</span>
              )}
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-black text-indigo-500/60 uppercase tracking-widest block">기억의 이름</label>
              <textarea
                className="w-full bg-transparent border-b border-white/5 p-0 text-3xl text-white outline-none focus:border-indigo-500/50 font-serif italic resize-none transition-all placeholder:text-white/10"
                rows={3}
                value={caption}
                onChange={handleCaptionChange}
                placeholder="이 순간을 설명해주세요..."
              />
            </div>

            <div className="space-y-4 pt-10 border-t border-white/5">
              <div className="flex flex-col gap-2">
                 <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">저장된 날짜</span>
                 <span className="text-xs font-medium text-white/40 italic">
                    {new Date(parseInt(memory.id.split('-')[1] || Date.now().toString())).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                 </span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => window.confirm('이 기록을 영구히 삭제하시겠습니까?') && onDelete(memory.id)}
            className="mt-12 w-full py-5 bg-red-900/5 text-red-500/40 hover:text-red-500 hover:bg-red-900/10 rounded-3xl text-[10px] font-black tracking-widest transition-all uppercase border border-red-500/10"
          >
            기록 삭제
          </button>
        </div>
      </div>
    </div>
  );
};

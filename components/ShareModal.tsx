
import React, { useRef } from 'react';
import { MonthData } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPackaging: boolean;
  onShareNative: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ 
  isOpen, 
  onClose, 
  isPackaging,
  onShareNative,
  onExport, 
  onImport 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-md bg-zinc-900/50 rounded-[50px] border border-white/10 p-10 shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
        
        {isPackaging ? (
          <div className="py-20 flex flex-col items-center text-center space-y-8 animate-pulse">
            <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <div>
              <h2 className="text-xl font-serif italic text-white mb-2">Packaging Memories...</h2>
              <p className="text-[10px] font-black tracking-[0.2em] text-white/30 uppercase">사진과 영상을 타임캡슐에 담고 있습니다</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-12">
              <div>
                <h2 className="text-3xl font-serif italic text-white mb-2">Share Era</h2>
                <p className="text-[10px] font-black tracking-widest text-white/30 uppercase">아카이브를 외부로 전송합니다</p>
              </div>
              <button onClick={onClose} className="text-white/20 hover:text-white transition-colors p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Native Share (Recommended for Mobile) */}
              <button 
                onClick={onShareNative}
                className="w-full group flex items-center gap-6 p-6 bg-indigo-600 hover:bg-white rounded-[30px] transition-all duration-500 text-left shadow-2xl shadow-indigo-500/20"
              >
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </div>
                <div>
                  <span className="block text-md font-bold text-white group-hover:text-indigo-600 transition-colors">Direct Share</span>
                  <span className="text-[10px] text-white/50 group-hover:text-indigo-600/50 uppercase font-black tracking-tighter">카톡/메시지로 즉시 보내기</span>
                </div>
              </button>

              <div className="grid grid-cols-2 gap-4">
                {/* Export File */}
                <button 
                  onClick={onExport}
                  className="group flex flex-col gap-4 p-6 bg-white/5 hover:bg-white rounded-[30px] transition-all duration-500 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-black transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white group-hover:text-black transition-colors">Download</span>
                    <span className="text-[8px] text-white/30 group-hover:text-black/50 uppercase font-black">.RECAP 파일 저장</span>
                  </div>
                </button>

                {/* Import File */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex flex-col gap-4 p-6 bg-white/5 hover:bg-white rounded-[30px] transition-all duration-500 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-black transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white group-hover:text-black transition-colors">Load</span>
                    <span className="text-[8px] text-white/30 group-hover:text-black/50 uppercase font-black">데이터 불러오기</span>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".recap,application/json"
                    onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
                  />
                </button>
              </div>

              <div className="pt-8 border-t border-white/5">
                <p className="text-[10px] text-center text-white/30 leading-relaxed font-medium">
                  파일 안에는 모든 고화질 사진과 영상이<br/>
                  <span className="text-indigo-400 font-bold">원본 데이터 그대로</span> 포함되어 있습니다.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

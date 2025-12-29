
import React, { useState } from 'react';
import { Memory } from '../types';

interface PhotoGalleryProps {
  memories: Memory[];
  blobUrlMap: Record<string, string>;
  onSelectMedia: (memory: Memory) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ 
  memories, 
  blobUrlMap, 
  onSelectMedia,
  onReorder
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('memoryId', id);
    e.dataTransfer.effectAllowed = 'move';
    
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; 
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverTarget(targetId);
  };

  const handleDrop = (e: React.DragEvent, targetMemoryId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('memoryId');
    if (sourceId && sourceId !== targetMemoryId) {
      const startIndex = memories.findIndex(m => m.id === sourceId);
      const endIndex = memories.findIndex(m => m.id === targetMemoryId);
      if (startIndex !== -1 && endIndex !== -1) {
        onReorder(startIndex, endIndex);
      }
    }
    setDraggedId(null);
    setDragOverTarget(null);
  };

  return (
    <div className="animate-in fade-in duration-700">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-12">
        {memories.map((memory, index) => (
          <MemoryCard 
            key={memory.id} 
            memory={memory} 
            mediaUrl={blobUrlMap[memory.id] || memory.url} 
            index={index} 
            onSelect={onSelectMedia}
            onDragStart={(e) => handleDragStart(e, memory.id)}
            onDragOver={(e) => handleDragOver(e, memory.id)}
            onDrop={(e) => handleDrop(e, memory.id)}
            isDragging={draggedId === memory.id}
            isDragOver={dragOverTarget === memory.id}
          />
        ))}
      </div>
    </div>
  );
};

const MemoryCard = ({ memory, mediaUrl, index, onSelect, onDragStart, onDragOver, onDrop, isDragging, isDragOver }: any) => (
  <div 
    draggable
    onDragStart={onDragStart}
    onDragOver={onDragOver}
    onDrop={onDrop}
    className={`group relative aspect-square rounded-[40px] sm:rounded-[60px] overflow-hidden bg-zinc-950 cursor-grab active:cursor-grabbing border transition-all duration-500 shadow-2xl hover:scale-[1.05] 
      ${isDragging ? 'opacity-20 scale-90 blur-sm' : 'opacity-100'} 
      ${isDragOver ? 'border-indigo-500 ring-4 ring-indigo-500/20 z-10 scale-110' : 'border-white/5'}`}
    onClick={() => onSelect(memory)}
    style={{ animation: `fade-in 0.8s forwards ${index * 0.03}s` }}
  >
    <div className="absolute top-8 left-8 z-20 p-2 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
      </svg>
    </div>
    
    {mediaUrl ? (
      memory.type === 'video' ? (
        <div className="w-full h-full relative">
          <video key={memory.id} src={mediaUrl} className="w-full h-full object-cover" muted loop playsInline preload="metadata" />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
        </div>
      ) : (
        <img key={memory.id} src={mediaUrl} alt={memory.caption} className="w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-110" loading="lazy" />
      )
    ) : (
      <div className="w-full h-full bg-white/5 animate-pulse" />
    )}
    
    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 p-8 flex flex-col justify-end">
      <p className="text-white text-sm font-serif italic truncate">"{memory.caption}"</p>
    </div>

    {isDragOver && (
      <div className="absolute inset-0 bg-indigo-500/10 animate-pulse pointer-events-none" />
    )}
  </div>
);

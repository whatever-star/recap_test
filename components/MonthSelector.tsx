
import React from 'react';
import { MonthData } from '../types';
import { DEFAULT_MONTHS } from '../constants';

interface MonthSelectorProps {
  selectedMonth: MonthData;
  onSelect: (month: MonthData) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ selectedMonth, onSelect }) => {
  return (
    <div className="sticky top-0 z-50 w-full glass py-4 sm:py-6 overflow-x-auto no-scrollbar border-b border-white/5 bg-black/80">
      <div className="flex justify-start lg:justify-center min-w-max px-6 sm:px-12 gap-3 sm:gap-6">
        {DEFAULT_MONTHS.map((month) => {
          const isActive = selectedMonth.id === month.id && selectedMonth.year === month.year;
          return (
            <button
              key={`${month.id}-${month.year}`}
              onClick={() => onSelect(month)}
              className={`
                group relative px-5 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all duration-500 uppercase whitespace-nowrap
                ${isActive 
                  ? `bg-white text-black scale-105 shadow-xl` 
                  : `text-white/20 hover:text-white hover:bg-white/5`
                }
              `}
            >
              {month.displayName}
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

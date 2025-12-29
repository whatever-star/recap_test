
export interface Memory {
  id: string;
  url: string;
  type: 'image' | 'video';
  caption: string;
  tags: string[];
}

export interface AIAnalysis {
  story: string;
  mood: string;
  keyHighlights: string[];
}

export interface MonthData {
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

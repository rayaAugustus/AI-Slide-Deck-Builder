export interface Slide {
  id: string;
  htmlContent: string;
  notes?: string;
}

export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export type ToolType = 'select' | 'text' | 'image' | 'rectangle';

export interface GenerationConfig {
  topic: string;
  slideCount: number;
  tone: string;
}
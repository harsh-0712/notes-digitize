export type DigitizationMode = 'structured' | 'visual';

export interface VisualElement {
  type: 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'list-item' | 'diagram';
  text?: string;
  mermaidCode?: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  fontSize?: number; // relative size
  width?: number; // percentage 0-100
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: 'normal' | 'medium' | 'bold';
}

export interface DigitizationResult {
  mode: DigitizationMode;
  content: string | VisualElement[];
}

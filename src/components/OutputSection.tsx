import React, { useState, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { motion } from 'motion/react';
import { Trash2, Move, Plus, Type, Layout, Square, GripVertical, Edit3 } from 'lucide-react';
import { MermaidDiagram } from './MermaidDiagram';
import { VisualElement } from '../types';
import { cn } from '../lib/utils';

interface OutputSectionProps {
  content: string | VisualElement[] | null;
  mode: 'structured' | 'visual' | null;
  contentRef: React.RefObject<HTMLDivElement | null>;
  isEditing?: boolean;
  onUpdateElement?: (index: number, updates: Partial<VisualElement>) => void;
  onUpdateElements?: (updates: { index: number, updates: Partial<VisualElement> }[]) => void;
  onRemoveElement?: (index: number) => void;
  onAddElement?: (type: VisualElement['type']) => void;
  onUpdateStructured?: (newText: string) => void;
  aspectRatio?: number | null;
}

export const OutputSection = ({ 
  content, 
  mode, 
  contentRef,
  isEditing = false,
  onUpdateElement,
  onUpdateElements,
  onRemoveElement,
  onAddElement,
  onUpdateStructured,
  aspectRatio
}: OutputSectionProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [selectionRect, setSelectionRect] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [tempOffsets, setTempOffsets] = useState<{ [key: number]: { x: number, y: number } }>({});
  const dragStartPositionsRef = useRef<{ [key: number]: { x: number, y: number } }>({});

  if (!content) return null;

  const handleElementClick = (e: React.MouseEvent, index: number) => {
    if (!isEditing) return;
    e.stopPropagation();
    setSelectedIndices([index]);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditing || e.button !== 0) return;
    
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionRect({ x1: x, y1: y, x2: x, y2: y });
    
    // Clear selection if clicking background (unless dragging starts)
    setSelectedIndices([]);
    setEditingIndex(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectionRect || !contentRef.current) return;

    const rect = contentRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionRect(prev => prev ? { ...prev, x2: x, y2: y } : null);
  };

  const handleMouseUp = () => {
    if (!selectionRect || !contentRef.current || !Array.isArray(content)) {
      setSelectionRect(null);
      return;
    }

    const containerRect = contentRef.current.getBoundingClientRect();
    
    // Convert selection rect to percentages to match element coordinates
    const selX1 = Math.min(selectionRect.x1, selectionRect.x2) / containerRect.width * 100;
    const selX2 = Math.max(selectionRect.x1, selectionRect.x2) / containerRect.width * 100;
    const selY1 = Math.min(selectionRect.y1, selectionRect.y2) / containerRect.height * 100;
    const selY2 = Math.max(selectionRect.y1, selectionRect.y2) / containerRect.height * 100;

    const newSelected = content.reduce((acc: number[], el, idx) => {
      // Check if element's top-left is inside the selection rectangle
      // We use a small buffer or check the center for better feel
      if (el.x >= selX1 && el.x <= selX2 && el.y >= selY1 && el.y <= selY2) {
        acc.push(idx);
      }
      return acc;
    }, []);

    if (newSelected.length > 0) {
      setSelectedIndices(newSelected);
    }
    setSelectionRect(null);
  };

  if (mode === 'structured' && typeof content === 'string') {
    return (
      <div ref={contentRef} className="markdown-content max-w-none relative">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => onUpdateStructured?.(e.target.value)}
            className="w-full min-h-[600px] p-8 font-mono text-sm border-2 border-line rounded-sm focus:outline-none focus:border-ink bg-paper shadow-inner leading-relaxed"
          />
        ) : (
          <Markdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                const code = String(children).replace(/\n$/, '');
                
                if (!inline && language === 'mermaid') {
                  return <MermaidDiagram code={code} />;
                }
                
                return (
                  <code className={cn("bg-ink text-paper px-2 py-0.5 rounded-sm font-mono text-[0.85em]", className)} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {content}
          </Markdown>
        )}
      </div>
    );
  }

  if (mode === 'visual' && Array.isArray(content)) {
    return (
      <div className="space-y-6">
        {isEditing && (
          <div className="edit-control flex flex-wrap items-center gap-3 p-4 bg-ink text-paper rounded-sm shadow-bold border border-ink">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-50 mr-4 w-full md:w-auto">Assembly_Controls:</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onAddElement?.('heading1')} className="flex items-center gap-2 px-4 py-2 border border-paper/20 hover:border-primary hover:text-primary transition-all font-display font-medium text-[10px] uppercase tracking-widest">
                <Type size={12} /> H1_Node
              </button>
              <button onClick={() => onAddElement?.('heading2')} className="flex items-center gap-2 px-4 py-2 border border-paper/20 hover:border-primary hover:text-primary transition-all font-display font-medium text-[10px] uppercase tracking-widest">
                <Type size={12} /> H2_Node
              </button>
              <button onClick={() => onAddElement?.('paragraph')} className="flex items-center gap-2 px-4 py-2 border border-paper/20 hover:border-primary hover:text-primary transition-all font-display font-medium text-[10px] uppercase tracking-widest">
                <Layout size={12} /> P_Block
              </button>
              <button onClick={() => onAddElement?.('diagram')} className="flex items-center gap-2 px-4 py-2 border border-paper/20 hover:border-primary hover:text-primary transition-all font-display font-medium text-[10px] uppercase tracking-widest">
                <Square size={12} /> Diagram_X
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div 
            ref={contentRef} 
            className="relative w-full bg-white rounded-sm overflow-hidden border border-line select-none visual-container shadow-inner"
            style={{ 
              aspectRatio: aspectRatio ? `${aspectRatio}` : 'auto',
              minHeight: aspectRatio ? 'auto' : '600px'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {selectionRect && (
              <div 
                className="absolute border-2 border-primary bg-primary/5 pointer-events-none z-[100] rounded-sm"
                style={{
                  left: Math.min(selectionRect.x1, selectionRect.x2),
                  top: Math.min(selectionRect.y1, selectionRect.y2),
                  width: Math.abs(selectionRect.x2 - selectionRect.x1),
                  height: Math.abs(selectionRect.y2 - selectionRect.y1),
                }}
              />
            )}
            {content.map((el, i) => {
              const isSelected = selectedIndices.includes(i);
              const offset = tempOffsets[i] || { x: 0, y: 0 };
              const style: React.CSSProperties = {
                position: 'absolute',
                left: `${el.x + offset.x}%`,
                top: `${el.y + offset.y}%`,
                width: el.width ? `${el.width}%` : 'auto',
                maxWidth: 'none',
                fontSize: el.fontSize 
                  ? `${el.fontSize}px` 
                  : '16px',
                fontWeight: el.fontWeight || 'normal',
                textAlign: 'left',
                lineHeight: '1.4',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                padding: '0',
                margin: '0',
                color: el.type.startsWith('heading') ? '#141414' : '#333',
                cursor: isEditing ? 'move' : 'default',
              };

            const isCurrentlyEditing = editingIndex === i;

            return (
              <motion.div
                key={`${i}-${el.x}-${el.y}`} 
                drag={isEditing}
                dragMomentum={false}
                dragElastic={0}
                dragListener={isEditing && !isCurrentlyEditing}
                onClick={(e) => handleElementClick(e, i)}
                onMouseDown={(e) => e.stopPropagation()}
                onDragStart={() => {
                  if (Array.isArray(content)) {
                    const positions: { [key: number]: { x: number, y: number } } = {};
                    if (selectedIndices.includes(i)) {
                      selectedIndices.forEach(idx => {
                        positions[idx] = { x: content[idx].x, y: content[idx].y };
                      });
                    } else {
                      positions[i] = { x: content[i].x, y: content[i].y };
                    }
                    dragStartPositionsRef.current = positions;
                  }
                }}
                onDrag={(event, info) => {
                  if (!selectedIndices.includes(i) || !contentRef.current) return;
                  
                  const containerRect = contentRef.current.getBoundingClientRect();
                  const deltaX = (info.offset.x / containerRect.width) * 100;
                  const deltaY = (info.offset.y / containerRect.height) * 100;

                  const newOffsets: { [key: number]: { x: number, y: number } } = {};
                  selectedIndices.forEach(idx => {
                    if (idx !== i) {
                      newOffsets[idx] = { x: deltaX, y: deltaY };
                    }
                  });
                  setTempOffsets(newOffsets);
                }}
                onDragEnd={(event, info) => {
                  setTempOffsets({});
                  if (!contentRef.current || !Array.isArray(content)) return;
                  
                  const draggedElement = (event.target as HTMLElement).closest('.visual-element-block') as HTMLElement;
                  if (!draggedElement) return;

                  const containerElement = contentRef.current;
                  const containerRect = containerElement.getBoundingClientRect();
                  const elementRect = draggedElement.getBoundingClientRect();
                  
                  const newX = ((elementRect.left - containerRect.left) / containerRect.width) * 100;
                  const newY = ((elementRect.top - containerRect.top) / containerRect.height) * 100;
                  
                  const initialPos = dragStartPositionsRef.current[i];
                  if (!initialPos) return;

                  const deltaX = newX - initialPos.x;
                  const deltaY = newY - initialPos.y;

                  if (selectedIndices.includes(i)) {
                    const updates = selectedIndices.map(idx => ({
                      index: idx,
                      updates: {
                        x: Math.max(0, Math.min(100, dragStartPositionsRef.current[idx].x + deltaX)),
                        y: Math.max(0, Math.min(100, dragStartPositionsRef.current[idx].y + deltaY))
                      }
                    }));
                    onUpdateElements?.(updates);
                  } else {
                    onUpdateElement?.(i, { x: newX, y: newY });
                  }
                }}
                style={style}
                className={cn(
                  "visual-element-block group transition-shadow",
                  isEditing && "hover:ring-1 hover:ring-primary/40 rounded p-1",
                  isSelected && "ring-2 ring-primary bg-primary/5 shadow-bold",
                  isCurrentlyEditing && "ring-2 ring-ink z-50 bg-paper shadow-bold"
                )}
              >
                {isEditing && (
                  <div className="edit-control absolute -top-10 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    <div className="p-2 bg-ink text-paper rounded-sm cursor-move shadow-bold">
                      <GripVertical size={12} />
                    </div>
                    <button 
                      onClick={() => setEditingIndex(isCurrentlyEditing ? null : i)}
                      className="p-2 bg-ink text-paper rounded-sm hover:text-primary transition-colors shadow-bold"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button 
                      onClick={() => onRemoveElement?.(i)}
                      className="p-2 bg-red-600 text-white rounded-sm hover:brightness-125 transition-colors shadow-bold"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="hidden sm:flex px-3 py-2 bg-paper border border-ink rounded-sm text-[8px] font-mono text-ink/40 items-center gap-2 shadow-bold">
                      <Move size={10} /> {Math.round(el.x)}%, {Math.round(el.y)}%
                    </div>
                  </div>
                )}

                {isCurrentlyEditing ? (
                  <div className="p-4 space-y-4 bg-paper w-[240px] sm:w-[300px] border border-ink shadow-bold">
                    {el.type === 'diagram' ? (
                      <textarea
                        value={el.mermaidCode || ''}
                        onChange={(e) => onUpdateElement?.(i, { mermaidCode: e.target.value })}
                        className="w-full min-h-[120px] p-3 text-[10px] font-mono border border-line focus:border-ink bg-white rounded-sm"
                        placeholder="Mermaid structure..."
                      />
                    ) : (
                      <textarea
                        value={el.text || ''}
                        onChange={(e) => onUpdateElement?.(i, { text: e.target.value })}
                        className="w-full p-3 text-sm font-sans border border-line focus:border-ink bg-white rounded-sm"
                        placeholder="Manuscript text..."
                      />
                    )}
                    <div className="space-y-3">
                      <div>
                        <label className="text-[8px] font-mono font-bold uppercase tracking-widest text-ink/40 block mb-1">Global Scale (X-Axis)</label>
                        <input 
                          type="range" min="5" max="100" 
                          value={el.width || 30} 
                          onChange={(e) => onUpdateElement?.(i, { width: parseInt(e.target.value) })}
                          className="w-full accent-primary"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-mono font-bold uppercase tracking-widest text-ink/40 block mb-1">Typography Step</label>
                        <input 
                          type="number" 
                          value={el.fontSize || 14} 
                          onChange={(e) => onUpdateElement?.(i, { fontSize: parseInt(e.target.value) })}
                          className="w-full p-2 text-xs font-mono border border-line rounded-sm"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => setEditingIndex(null)}
                      className="w-full py-3 bg-ink text-paper text-[10px] font-display font-bold uppercase tracking-widest rounded-sm hover:brightness-125 transition-all"
                    >
                      COMMIT_CHANGES
                    </button>
                  </div>
                ) : (
                  <>
                    {el.type === 'diagram' && el.mermaidCode ? (
                      <div className="z-10 bg-white/50 p-4 border border-dashed border-line">
                        <MermaidDiagram code={el.mermaidCode} noMargin />
                      </div>
                    ) : (
                      <div 
                        className={cn(
                          el.type.startsWith('heading') && "font-serif italic font-semibold tracking-tight"
                        )}
                      >
                        {el.text}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

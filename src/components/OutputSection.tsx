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
            className="w-full min-h-[500px] p-4 font-mono text-sm border border-[#F27D26]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20 bg-[#FDFCFB]"
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
                  <code className={className} {...props}>
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
      <div className="space-y-4">
        {isEditing && (
          <div className="edit-control flex flex-wrap items-center gap-2 p-2 sm:p-3 bg-[#1A1A1A]/5 rounded-2xl border border-[#1A1A1A]/10">
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-[#1A1A1A]/40 mr-1 sm:mr-2 w-full sm:w-auto mb-1 sm:mb-0">Add Element:</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onAddElement?.('heading1')} className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-white rounded-lg text-[10px] sm:text-xs font-medium border border-[#1A1A1A]/10 hover:border-[#F27D26]/50 transition-colors">
                <Type size={10} className="sm:w-3 sm:h-3" /> H1
              </button>
              <button onClick={() => onAddElement?.('heading2')} className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-white rounded-lg text-[10px] sm:text-xs font-medium border border-[#1A1A1A]/10 hover:border-[#F27D26]/50 transition-colors">
                <Type size={10} className="sm:w-3 sm:h-3" /> H2
              </button>
              <button onClick={() => onAddElement?.('paragraph')} className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-white rounded-lg text-[10px] sm:text-xs font-medium border border-[#1A1A1A]/10 hover:border-[#F27D26]/50 transition-colors">
                <Layout size={10} className="sm:w-3 sm:h-3" /> Para
              </button>
              <button onClick={() => onAddElement?.('diagram')} className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-white rounded-lg text-[10px] sm:text-xs font-medium border border-[#1A1A1A]/10 hover:border-[#F27D26]/50 transition-colors">
                <Square size={10} className="sm:w-3 sm:h-3" /> Diagram
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div 
            ref={contentRef} 
            className="relative w-full bg-white rounded-xl overflow-hidden shadow-inner border border-gray-100 select-none visual-container"
            style={{ 
              aspectRatio: aspectRatio ? `${aspectRatio}` : 'auto',
              minHeight: aspectRatio ? 'auto' : 'var(--visual-min-height, 500px)'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {selectionRect && (
              <div 
                className="absolute border-2 border-[#F27D26] bg-[#F27D26]/10 pointer-events-none z-[100] rounded-sm"
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
                  ? `calc(${el.fontSize / 10}cqw)` 
                  : '1.6cqw',
                fontWeight: el.fontWeight || 'normal',
                textAlign: 'left',
                lineHeight: '1.2',
                whiteSpace: 'nowrap',
                padding: '0',
                margin: '0',
                color: el.type.startsWith('heading') ? '#111827' : '#1f2937',
                cursor: isEditing ? 'move' : 'default',
              };

            const isCurrentlyEditing = editingIndex === i;

            return (
              <motion.div
                key={`${i}-${el.x}-${el.y}`} // Use key to force reset on position update
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
                  
                  // Find the closest parent that is our visual element block
                  const draggedElement = (event.target as HTMLElement).closest('.visual-element-block') as HTMLElement;
                  if (!draggedElement) return;

                  const containerElement = contentRef.current;
                  const containerRect = containerElement.getBoundingClientRect();
                  const elementRect = draggedElement.getBoundingClientRect();
                  
                  // Calculate position relative to container in percentages
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
                  isEditing && "hover:ring-1 hover:ring-[#F27D26]/30 rounded p-1",
                  isSelected && "ring-2 ring-[#F27D26]/50 bg-[#F27D26]/5 shadow-md",
                  isCurrentlyEditing && "ring-2 ring-[#F27D26] z-50 bg-white shadow-xl"
                )}
              >
                {isEditing && (
                  <div className="edit-control absolute -top-8 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    <div className="p-1 sm:p-1.5 bg-[#1A1A1A] text-white rounded-md cursor-move">
                      <GripVertical size={10} className="sm:w-3 sm:h-3" />
                    </div>
                    <button 
                      onClick={() => setEditingIndex(isCurrentlyEditing ? null : i)}
                      className="p-1 sm:p-1.5 bg-[#1A1A1A] text-white rounded-md hover:bg-[#F27D26] transition-colors"
                    >
                      <Edit3 size={10} className="sm:w-3 sm:h-3" />
                    </button>
                    <button 
                      onClick={() => onRemoveElement?.(i)}
                      className="p-1 sm:p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      <Trash2 size={10} className="sm:w-3 sm:h-3" />
                    </button>
                    <div className="hidden sm:flex px-2 py-1 bg-white border border-[#1A1A1A]/10 rounded-md text-[10px] font-mono text-[#1A1A1A]/40 items-center gap-1">
                      <Move size={10} /> {Math.round(el.x)}%, {Math.round(el.y)}%
                    </div>
                  </div>
                )}

                {isCurrentlyEditing ? (
                  <div className="p-2 space-y-3 bg-white w-[200px] sm:w-auto">
                    {el.type === 'diagram' ? (
                      <textarea
                        value={el.mermaidCode || ''}
                        onChange={(e) => onUpdateElement?.(i, { mermaidCode: e.target.value })}
                        className="w-full min-h-[80px] sm:min-h-[100px] p-2 text-[10px] sm:text-xs font-mono border rounded focus:outline-none focus:ring-1 focus:ring-[#F27D26]"
                        placeholder="Mermaid code..."
                      />
                    ) : (
                      <textarea
                        value={el.text || ''}
                        onChange={(e) => onUpdateElement?.(i, { text: e.target.value })}
                        className="w-full p-2 text-xs sm:text-sm border rounded focus:outline-none focus:ring-1 focus:ring-[#F27D26]"
                        placeholder="Text content..."
                      />
                    )}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      <div className="w-full sm:flex-1">
                        <label className="text-[9px] sm:text-[10px] uppercase text-gray-400 block mb-1">Width (%)</label>
                        <input 
                          type="range" min="5" max="100" 
                          value={el.width || 30} 
                          onChange={(e) => onUpdateElement?.(i, { width: parseInt(e.target.value) })}
                          className="w-full accent-[#F27D26]"
                        />
                      </div>
                      <div className="w-full sm:flex-1">
                        <label className="text-[9px] sm:text-[10px] uppercase text-gray-400 block mb-1">Font Size</label>
                        <input 
                          type="number" 
                          value={el.fontSize || 14} 
                          onChange={(e) => onUpdateElement?.(i, { fontSize: parseInt(e.target.value) })}
                          className="w-full p-1 text-[10px] sm:text-xs border rounded"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => setEditingIndex(null)}
                      className="w-full py-1.5 bg-[#F27D26] text-white text-[10px] sm:text-xs font-medium rounded-lg hover:bg-[#F27D26]/90"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    {el.type === 'diagram' && el.mermaidCode ? (
                      <div className="z-10">
                        <MermaidDiagram code={el.mermaidCode} noMargin />
                      </div>
                    ) : (
                      <div 
                        className={cn(
                          el.type.startsWith('heading') && "font-serif italic font-semibold"
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

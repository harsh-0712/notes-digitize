/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Loader2, 
  Image as ImageIcon, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Layout,
  Type,
  Upload,
  History,
  Moon,
  Sun,
  LogOut,
  FolderPlus,
  Save,
  Plus
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { digitizeNotes } from './services/geminiService';
import { DigitizationMode, VisualElement } from './types';
import { OutputSection } from './components/OutputSection';
import { compressImage } from './lib/imageUtils';
import { NoteHistory } from './components/NoteHistory';
import { FolderSelector } from './components/FolderSelector';
import { storageService } from './services/storageService';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [digitizedContent, setDigitizedContent] = useState<string | VisualElement[] | null>(null);
  const [currentMode, setCurrentMode] = useState<DigitizationMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleSaveToFolder = async (folderId: string) => {
    if (!digitizedContent || !currentMode) return;
    
    setIsSaving(true);
    setShowFolderSelector(false);
    
    try {
      const title = prompt('Enter a title for this note:', 'New Note') || 'Untitled Note';
      await storageService.saveNote({
        title,
        folderId,
        mode: currentMode,
        content: JSON.stringify(digitizedContent),
        aspectRatio,
        userId: 'local-user' // Placeholder for future DB integration
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Failed to save note to folder.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectHistoryNote = (content: string | VisualElement[], mode: DigitizationMode, ratio: number | null) => {
    setDigitizedContent(content);
    setCurrentMode(mode);
    setAspectRatio(ratio);
    setShowHistory(false);
    setImage(null); // Clear current image when viewing history
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          setAspectRatio(img.width / img.height);
          setImage(reader.result as string);
          setDigitizedContent(null);
          setCurrentMode(null);
          setError(null);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDigitize = async (mode: DigitizationMode) => {
    if (!image) return;

    setIsProcessing(true);
    setProcessingStep('Optimizing image...');
    setError(null);
    setCurrentMode(mode);

    try {
      // Compress image before sending to API to speed up upload and processing
      const compressedImage = await compressImage(image, 1600, 0.8);
      
      setProcessingStep('AI is analyzing your notes...');
      
      // Add a small timeout to update the message if it takes too long
      const longProcessTimeout = setTimeout(() => {
        setProcessingStep('Still processing... complex notes take a bit longer.');
      }, 8000);

      const result = await digitizeNotes(compressedImage, mode);
      clearTimeout(longProcessTimeout);
      
      setDigitizedContent(result);
    } catch (err) {
      console.error("Error processing image:", err);
      setError("Failed to process the image. Please try again with a clearer photo.");
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const downloadPDF = async () => {
    if (!contentRef.current) return;

    // Temporarily hide copy buttons and edit controls during export
    contentRef.current.classList.add('pdf-export');
    
    const copyButtons = contentRef.current.querySelectorAll('button');
    copyButtons.forEach(btn => btn.style.display = 'none');
    
    const editControls = contentRef.current.querySelectorAll('.edit-control');
    editControls.forEach(ctrl => (ctrl as HTMLElement).style.display = 'none');

    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F5F5F0',
        onclone: (clonedDoc) => {
          const clonedContent = clonedDoc.querySelector('.pdf-export');
          if (clonedContent) {
            (clonedContent as HTMLElement).style.width = '800px'; 
          }
          
          // html2canvas doesn't support modern color functions (oklch, oklab, color-mix, color).
          // We must replace them with a fallback to avoid parsing errors.
          // This regex handles up to one level of nested parentheses (e.g., color-mix with internal functions)
          const modernColorRegex = /(oklch|oklab|color-mix|color)\((?:[^()]|\([^()]*\))*\)/g;
          
          // 1. Clean up <style> tags - safer than innerHTML replacement
          const styleTags = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleTags.length; i++) {
            const styleTag = styleTags[i];
            if (styleTag.textContent && (styleTag.textContent.includes('oklch') || styleTag.textContent.includes('oklab') || styleTag.textContent.includes('color-mix'))) {
              // We use textContent to avoid HTML entity issues. Simple replacement for common modern color patterns.
              styleTag.textContent = styleTag.textContent.replace(modernColorRegex, 'rgb(0,0,0)');
            }
          }

          // 2. Process elements with potential modern color values in inline styles
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const inlineStyle = htmlEl.getAttribute('style');
            if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('oklab') || inlineStyle.includes('color-mix'))) {
              htmlEl.setAttribute('style', inlineStyle.replace(modernColorRegex, 'rgb(0,0,0)'));
            }
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const contentWidth = imgProps.width;
      const contentHeight = imgProps.height;
      
      // Calculate ratio to fit on one page with a small margin (10mm)
      const margin = 10;
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);
      
      const ratio = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);
      const finalWidth = contentWidth * ratio;
      const finalHeight = contentHeight * ratio;
      
      // Center horizontally and vertically within the margins
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      pdf.save(`digitized-notes-${currentMode}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      if (contentRef.current) {
        contentRef.current.classList.remove('pdf-export');
      }
      copyButtons.forEach(btn => btn.style.display = '');
      editControls.forEach(ctrl => (ctrl as HTMLElement).style.display = '');
    }
  };

  const handleUpdateElement = (index: number, updates: Partial<VisualElement>) => {
    if (!Array.isArray(digitizedContent)) return;
    const newContent = [...digitizedContent];
    newContent[index] = { ...newContent[index], ...updates };
    setDigitizedContent(newContent);
  };

  const handleUpdateElements = (updates: { index: number, updates: Partial<VisualElement> }[]) => {
    if (!Array.isArray(digitizedContent)) return;
    const newContent = [...digitizedContent];
    updates.forEach(({ index, updates: elementUpdates }) => {
      newContent[index] = { ...newContent[index], ...elementUpdates };
    });
    setDigitizedContent(newContent);
  };

  const handleRemoveElement = (index: number) => {
    if (!Array.isArray(digitizedContent)) return;
    const newContent = digitizedContent.filter((_, i) => i !== index);
    setDigitizedContent(newContent);
  };

  const handleAddElement = (type: VisualElement['type']) => {
    if (!Array.isArray(digitizedContent)) return;
    const newElement: VisualElement = {
      type,
      text: type === 'diagram' ? undefined : 'New ' + type,
      mermaidCode: type === 'diagram' ? 'graph TD\nA[Start] --> B[End]' : undefined,
      x: 10,
      y: 10,
      width: 30,
    };
    setDigitizedContent([...digitizedContent, newElement]);
  };

  const handleUpdateStructured = (newText: string) => {
    setDigitizedContent(newText);
  };

  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-primary/20">
      {/* Visual background elements */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#141414 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      
      {/* Header */}
      <header className="border-b border-line bg-paper/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/40 transition-colors" />
              <div className="relative w-12 h-12 bg-ink rounded-sm flex items-center justify-center text-paper shrink-0 shadow-bold border border-paper/10">
                <FileText size={24} />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-display font-black tracking-tighter uppercase leading-none italic">NoteDigitizer</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-[9px] font-mono opacity-40 uppercase tracking-[0.3em] font-bold">Transcription_Core v1.0.42</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "group relative flex items-center gap-2 px-5 py-2.5 rounded-full transition-all active:scale-95 border-2",
                showHistory 
                  ? "bg-ink text-paper border-ink" 
                  : "bg-transparent border-line hover:border-ink"
              )}
            >
              <History size={18} className={cn("transition-transform group-hover:rotate-[-20deg]", showHistory && "rotate-[-20deg]")} />
              <span className="text-sm font-display font-bold uppercase tracking-wider">
                {showHistory ? 'Scanner' : 'Library'}
              </span>
            </button>
            
            {digitizedContent && !showHistory && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-display font-bold uppercase tracking-wider transition-all active:scale-95 border-2 shadow-bold",
                  isEditing 
                    ? "bg-primary text-white border-primary shadow-primary/20" 
                    : "bg-ink text-paper border-ink"
                )}
              >
                <Layout size={16} />
                <span>{isEditing ? 'Finish' : 'Edit Mode'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col gap-2 relative">
                <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary" />
                <h2 className="text-5xl sm:text-8xl font-display font-black tracking-tighter uppercase leading-[0.8]">The <br /><span className="text-primary italic font-serif lowercase font-normal">Vault</span></h2>
                <div className="flex items-center gap-3 mt-4">
                  <div className="h-px bg-line flex-1" />
                  <span className="text-[10px] font-mono font-bold text-ink/20 tracking-widest uppercase">Secured Records</span>
                  <div className="h-px bg-line w-12" />
                </div>
              </div>
              <NoteHistory onSelectNote={handleSelectHistoryNote} />
            </motion.div>
          ) : (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12"
            >
              {/* Left Column: Input */}
              <section className="lg:col-span-5 space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-px bg-primary" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.3em] font-bold text-primary">Input Source</span>
                  </div>
                  <h2 className="text-5xl font-display font-bold tracking-tighter uppercase leading-[0.9]">Capture <br />Manuscript</h2>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative aspect-[3/4] rounded-sm border-2 transition-all cursor-pointer overflow-hidden group shadow-bold",
                    image ? "border-ink" : "border-ink border-dashed hover:border-primary bg-white/50"
                  )}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none z-10 overflow-hidden">
                    <div className="absolute top-2 right-[-24px] bg-primary text-white text-[8px] font-mono font-bold uppercase tracking-wider py-1 px-10 rotate-45">Source</div>
                  </div>
                  
                  {/* Grainy overlay for technical feel */}
                  <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
                  
                  {image ? (
                    <>
                      <img src={image} alt="Preview" className="w-full h-full object-cover grayscale-[0.2]" />
                      <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 rounded-full border border-paper/30 flex items-center justify-center text-paper animate-pulse">
                          <RefreshCw size={24} />
                        </div>
                        <p className="text-paper text-[10px] font-mono font-bold uppercase tracking-widest bg-ink px-4 py-2">
                          Replace Document
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 text-center bg-white/40">
                      <div className="w-20 h-20 rounded-sm border-2 border-ink flex items-center justify-center text-ink group-hover:scale-110 group-hover:rotate-3 transition-transform">
                        <Upload size={32} strokeWidth={1.5} />
                      </div>
                      <div className="space-y-3">
                        <p className="font-display text-2xl font-bold uppercase tracking-tight">Drop Manuscript</p>
                        <p className="text-[10px] font-mono text-ink/40 font-bold uppercase tracking-widest">
                          High-res PNG / JPG / JPEG <br /> up to 10MB
                        </p>
                      </div>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>

                {image && !isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    <button
                      onClick={() => handleDigitize('structured')}
                      className="group relative h-28 bg-white border border-line hover:border-ink transition-all flex flex-col items-center justify-center gap-2 overflow-hidden shadow-subtle hover:shadow-bold"
                    >
                      <div className="absolute top-2 left-2 text-[8px] font-mono text-ink/20 font-bold">01</div>
                      <Type size={24} className="text-ink/30 group-hover:text-primary transition-colors" />
                      <span className="font-display font-bold uppercase tracking-wider text-xs">Structured Layout</span>
                    </button>
                    <button
                      onClick={() => handleDigitize('visual')}
                      className="group relative h-28 bg-white border border-line hover:border-ink transition-all flex flex-col items-center justify-center gap-2 overflow-hidden shadow-subtle hover:shadow-bold"
                    >
                      <div className="absolute top-2 left-2 text-[8px] font-mono text-ink/20 font-bold">02</div>
                      <Layout size={24} className="text-ink/30 group-hover:text-primary transition-colors" />
                      <span className="font-display font-bold uppercase tracking-wider text-xs">Visual Replica</span>
                    </button>
                  </motion.div>
                )}

                {isProcessing && (
                  <div className="w-full p-8 bg-ink text-paper rounded-sm flex flex-col items-center justify-center gap-6 shadow-bold">
                    <div className="relative">
                      <Loader2 className="animate-spin text-primary" size={40} strokeWidth={3} />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="font-display text-xl font-bold uppercase tracking-tighter">{processingStep}</p>
                      <p className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-40">System Analyzing Content...</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-6 bg-red-50 border-l-4 border-red-500 rounded-sm flex items-start gap-4">
                    <AlertCircle className="text-red-500 shrink-0 mt-1" size={24} />
                    <div className="space-y-1">
                      <p className="font-display font-bold text-red-950 text-sm uppercase">Process Failed</p>
                      <p className="text-xs text-red-900/60 leading-relaxed font-medium">{error}</p>
                    </div>
                  </div>
                )}
              </section>

              {/* Right Column: Output */}
              <section className="lg:col-span-7 space-y-10 lg:border-l lg:border-line lg:pl-12">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-line">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-px bg-primary" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.3em] font-bold text-primary">Output Render</span>
                    </div>
                    <h2 className="text-5xl font-display font-bold tracking-tighter uppercase leading-[0.9]">Digital <br />Twin</h2>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {digitizedContent && (
                      <button
                        onClick={() => setShowFolderSelector(true)}
                        disabled={isSaving}
                        className={cn(
                          "flex items-center gap-2 px-6 py-3 rounded-full text-xs font-display font-bold uppercase tracking-widest transition-all shadow-bold active:scale-95",
                          saveSuccess 
                            ? "bg-green-600 text-white" 
                            : "bg-primary text-white hover:brightness-110"
                        )}
                      >
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : saveSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
                        <span>{saveSuccess ? 'Archive Success' : 'Archive Note'}</span>
                      </button>
                    )}
                    {digitizedContent && (
                      <button
                        onClick={downloadPDF}
                        className="p-3 bg-ink text-paper rounded-full hover:bg-neutral-800 transition-all shadow-bold active:scale-95"
                        title="Export Document"
                      >
                        <Download size={20} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative min-h-[600px] border border-line bg-white shadow-bold p-1 overflow-hidden">
                   {/* Mechanical corner decorations */}
                   <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-ink" />
                   <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-ink" />
                   <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-ink" />
                   <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-ink" />
                   
                  <AnimatePresence mode="wait">
                    {isProcessing ? (
                      <motion.div 
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-[600px] flex flex-col items-center justify-center p-12 text-center"
                      >
                        <div className="w-32 h-32 mb-8 flex items-center justify-center">
                          <div className="absolute w-24 h-24 border border-line animate-[spin_10s_linear_infinite]" />
                          <div className="absolute w-20 h-20 border border-primary/30 animate-[spin_7s_linear_infinite_reverse]" />
                          <div className="absolute w-16 h-16 border-2 border-ink animate-[spin_4s_linear_infinite]" />
                          <ImageIcon size={24} className="text-ink animate-pulse" />
                        </div>
                        <div className="space-y-4">
                          <p className="font-display font-bold text-3xl uppercase tracking-tighter">System Decoding</p>
                          <div className="flex items-center gap-1.5 justify-center">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="w-1.5 h-1.5 bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ) : digitizedContent ? (
                      <motion.div 
                        key="content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-[600px] p-6 sm:p-12 overflow-y-auto custom-scrollbar bg-white"
                      >
                        <OutputSection 
                          content={digitizedContent} 
                          mode={currentMode} 
                          contentRef={contentRef}
                          isEditing={isEditing}
                          onUpdateElement={handleUpdateElement}
                          onUpdateElements={handleUpdateElements}
                          onRemoveElement={handleRemoveElement}
                          onAddElement={handleAddElement}
                          onUpdateStructured={handleUpdateStructured}
                          aspectRatio={aspectRatio}
                        />
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-[600px] flex flex-col items-center justify-center p-12 text-center"
                      >
                        <div className="w-20 h-20 mb-8 rounded-full border border-ink/5 flex items-center justify-center text-ink/10">
                          <FileText size={40} strokeWidth={1} />
                        </div>
                        <p className="font-display font-bold text-2xl uppercase tracking-tighter opacity-10">Output Terminal Awaiting Data</p>
                        <p className="text-[10px] font-mono uppercase tracking-widest opacity-20 mt-4">Load document to start transcription sequence</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {showFolderSelector && (
        <FolderSelector 
          onSelect={handleSaveToFolder} 
          onClose={() => setShowFolderSelector(false)} 
        />
      )}

      <style>{`
        .visual-container {
          background-image: radial-gradient(rgba(20, 20, 20, 0.1) 1px, transparent 0);
          background-size: 24px 24px;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #141414; border-radius: 0; }

        .markdown-content h1 { font-family: var(--font-serif); font-style: italic; font-size: 3rem; line-height: 0.9; margin-bottom: 2rem; color: #141414; }
        .markdown-content h2 { font-family: var(--font-serif); font-style: italic; font-size: 2.25rem; line-height: 1; margin-top: 3rem; margin-bottom: 1.5rem; color: #141414; }
        .markdown-content h3 { font-family: var(--font-serif); font-style: italic; font-size: 1.75rem; line-height: 1.1; margin-top: 2rem; margin-bottom: 1rem; color: #141414; }
        .markdown-content p { font-size: 1rem; line-height: 1.7; margin-bottom: 1.5rem; color: #333; }
        .markdown-content ul, .markdown-content ol { margin-bottom: 1.5rem; padding-left: 1.5rem; }
        .markdown-content li { margin-bottom: 0.75rem; vertical-align: top; }
        .markdown-content b, .markdown-content strong { font-weight: 700; color: #141414; }
        .markdown-content blockquote { border-left: 2px solid #F27D26; padding-left: 1.5rem; font-family: var(--font-serif); font-style: italic; font-size: 1.25rem; margin: 2rem 0; color: #666; }
        .markdown-content table { width: 100%; border-collapse: collapse; margin: 2rem 0; border: 1px solid rgba(20, 20, 20, 0.1); }
        .markdown-content th { background: #F5F5F0; border-bottom: 2px solid #141414; padding: 1rem; text-align: left; font-family: var(--font-display); font-weight: bold; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.1em; }
        .markdown-content td { padding: 1rem; border-bottom: 1px solid #efefef; font-size: 0.9rem; }
        
        .pdf-export { width: 1000px !important; }
      `}</style>
    </div>
  );
}

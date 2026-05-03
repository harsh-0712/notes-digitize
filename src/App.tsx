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
        backgroundColor: '#FDFCFB',
        onclone: (clonedDoc) => {
          // Add the pdf-export class to the cloned document's contentRef equivalent
          const clonedContent = clonedDoc.querySelector('.pdf-export');
          if (clonedContent) {
            (clonedContent as HTMLElement).style.width = '800px'; // Force a fixed width for better scaling
          }
          
          // Workaround for html2canvas not supporting modern color functions (oklch, oklab, color-mix, color)
          // Use a more robust regex to handle potential nested parentheses (like var() or nested functions)
          const modernColorRegex = /(oklch|oklab|color-mix|color)\((?:[^()]+|\([^()]*\))+\)/g;
          
          // 1. Clean up all <style> tags and stylesheets
          const styleTags = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleTags.length; i++) {
            const styleTag = styleTags[i];
            if (styleTag.innerHTML.includes('oklch') || styleTag.innerHTML.includes('oklab') || styleTag.innerHTML.includes('color-mix') || styleTag.innerHTML.includes('color(')) {
              styleTag.innerHTML = styleTag.innerHTML.replace(modernColorRegex, 'rgb(0,0,0)');
            }
          }

          // Also check all stylesheets (including those added via CSSStyleSheet.replaceSync)
          try {
            for (let i = 0; i < clonedDoc.styleSheets.length; i++) {
              const sheet = clonedDoc.styleSheets[i];
              const rules = sheet.cssRules;
              for (let j = 0; j < rules.length; j++) {
                const rule = rules[j] as CSSStyleRule;
                if (rule.style && rule.style.cssText && (rule.style.cssText.includes('oklch') || rule.style.cssText.includes('oklab') || rule.style.cssText.includes('color-mix') || rule.style.cssText.includes('color('))) {
                  // We can't easily replace in cssText, but we can iterate over properties
                  for (let k = 0; k < rule.style.length; k++) {
                    const prop = rule.style[k];
                    const value = rule.style.getPropertyValue(prop);
                    if (value && (value.includes('oklch') || value.includes('oklab') || value.includes('color-mix') || value.includes('color('))) {
                      rule.style.setProperty(prop, 'rgb(0,0,0)', 'important');
                    }
                  }
                }
              }
            }
          } catch (e) {
            // Ignore cross-origin errors
          }

          // 2. Clean up inline styles and computed styles on all elements
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            
            // Check inline style attribute
            const inlineStyle = htmlEl.getAttribute('style');
            if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('oklab') || inlineStyle.includes('color-mix') || inlineStyle.includes('color('))) {
              htmlEl.setAttribute('style', inlineStyle.replace(modernColorRegex, 'rgb(0,0,0)'));
            }

            // Check computed styles and override if necessary
            // We iterate over ALL properties to be safe
            try {
              const style = window.getComputedStyle(el);
              for (let i = 0; i < style.length; i++) {
                const prop = style[i];
                const value = style.getPropertyValue(prop);
                if (value && (value.includes('oklch') || value.includes('oklab') || value.includes('color-mix') || value.includes('color('))) {
                  htmlEl.style.setProperty(prop, 'rgb(0,0,0)', 'important');
                }
              }
            } catch (e) {
              // Ignore errors for elements that don't support getComputedStyle
            }
          });

          // 3. Most aggressive: replace in the entire HTML string as a last resort
          // This catches any remaining strings in style tags or attributes that were missed
          try {
            const html = clonedDoc.documentElement.innerHTML;
            if (html.includes('oklch') || html.includes('oklab') || html.includes('color-mix') || html.includes('color(')) {
              clonedDoc.documentElement.innerHTML = html.replace(modernColorRegex, 'rgb(0,0,0)');
            }
          } catch (e) {
            // Ignore errors
          }
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
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-[#F27D26]/20 transition-colors">
      {/* Header */}
      <header className="border-b border-[#1A1A1A]/10 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#F27D26] rounded-lg flex items-center justify-center text-white shrink-0">
              <FileText size={20} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight italic serif truncate">NoteDigitizer</h1>
              <span className="text-[10px] font-mono text-[#F27D26] font-bold opacity-80">v1.0.0</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "p-2 rounded-full transition-colors",
                showHistory ? "bg-[#F27D26] text-white" : "hover:bg-gray-100"
              )}
            >
              <History size={20} />
            </button>
            {digitizedContent && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all active:scale-95",
                  isEditing 
                    ? "bg-[#F27D26] text-white shadow-lg shadow-[#F27D26]/20" 
                    : "bg-[#1A1A1A]/5 dark:bg-white/5 text-[#1A1A1A] dark:text-white hover:bg-[#1A1A1A]/10 dark:hover:bg-white/10"
                )}
              >
                <Layout size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{isEditing ? 'Finish' : 'Edit'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-light tracking-tight">Your History</h2>
                  <p className="text-[#1A1A1A]/60 font-mono text-xs sm:text-sm uppercase tracking-widest">Saved Digitizations</p>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="px-4 py-2 bg-[#1A1A1A] text-white rounded-xl text-sm font-bold"
                >
                  Back to Scanner
                </button>
              </div>
              <NoteHistory onSelectNote={handleSelectHistoryNote} />
            </motion.div>
          ) : (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12"
            >
              {/* Left Column: Upload & Preview */}
              <section className="space-y-6 sm:space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-light tracking-tight">Upload your notes</h2>
                  <p className="text-[#1A1A1A]/60 font-mono text-xs sm:text-sm uppercase tracking-widest">Handwritten to Digital</p>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative aspect-[4/5] sm:aspect-[3/4] rounded-3xl border-2 border-dashed transition-all cursor-pointer overflow-hidden group",
                    image ? "border-transparent" : "border-[#1A1A1A]/20 hover:border-[#F27D26]/50 bg-white"
                  )}
                >
                  {image ? (
                    <>
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white font-medium flex items-center gap-2">
                          <RefreshCw size={20} />
                          Change Image
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
                      <div className="w-16 h-16 rounded-full bg-[#F27D26]/10 flex items-center justify-center text-[#F27D26]">
                        <Upload size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">Click to upload or drag and drop</p>
                        <p className="text-sm text-[#1A1A1A]/40">PNG, JPG or JPEG (max. 10MB)</p>
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
                  >
                    <button
                      onClick={() => handleDigitize('structured')}
                      className="py-3 sm:py-4 bg-[#1A1A1A] text-white rounded-2xl font-semibold shadow-xl hover:bg-[#1A1A1A]/90 transition-all active:scale-95 flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-2"
                    >
                      <Type size={18} className="sm:w-5 sm:h-5" />
                      <span className="text-xs sm:text-sm">Structured Mode</span>
                    </button>
                    <button
                      onClick={() => handleDigitize('visual')}
                      className="py-3 sm:py-4 bg-[#F27D26] text-white rounded-2xl font-semibold shadow-xl shadow-[#F27D26]/20 hover:bg-[#F27D26]/90 transition-all active:scale-95 flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-2"
                    >
                      <Layout size={18} className="sm:w-5 sm:h-5" />
                      <span className="text-xs sm:text-sm">Visual Mode</span>
                    </button>
                  </motion.div>
                )}

                {isProcessing && (
                  <div className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-semibold flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-3">
                      <Loader2 className="animate-spin" />
                      <span>{processingStep}</span>
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">Mode: {currentMode}</p>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}
              </section>

              {/* Right Column: Results */}
              <section className="space-y-6 sm:space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-light tracking-tight">Digitized Output</h2>
                    <p className="text-[#1A1A1A]/60 font-mono text-xs sm:text-sm uppercase tracking-widest">
                      {currentMode === 'visual' ? 'Spatial Layout' : 'Structured Content'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {digitizedContent && (
                      <button
                        onClick={() => setShowFolderSelector(true)}
                        disabled={isSaving}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                          saveSuccess 
                            ? "bg-green-500 text-white" 
                            : "bg-[#F27D26] text-white hover:bg-[#F27D26]/90"
                        )}
                      >
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : saveSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
                        {saveSuccess ? 'Saved!' : 'Save to Folder'}
                      </button>
                    )}
                    {digitizedContent && (
                      <button
                        onClick={downloadPDF}
                        className="p-2 bg-[#1A1A1A] text-white rounded-xl hover:bg-[#1A1A1A]/90 transition-all"
                        title="Export PDF"
                      >
                        <Download size={20} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="min-h-[400px] sm:min-h-[600px] rounded-3xl bg-white border border-[#1A1A1A]/10 shadow-sm overflow-hidden flex flex-col">
                  <AnimatePresence mode="wait">
                    {isProcessing ? (
                      <motion.div 
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6"
                      >
                        <div className="relative">
                          <div className="w-20 h-20 border-4 border-[#F27D26]/20 border-t-[#F27D26] rounded-full animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center text-[#F27D26]">
                            <ImageIcon size={24} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xl font-medium">{processingStep || "AI is reading your notes"}</p>
                          <p className="text-sm text-[#1A1A1A]/40 max-w-[280px]">
                            {currentMode === 'visual' 
                              ? "Calculating spatial coordinates and relative sizes..." 
                              : "Recognizing handwriting and identifying diagrams..."}
                          </p>
                        </div>
                      </motion.div>
                    ) : digitizedContent ? (
                      <motion.div 
                        key="content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar"
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
                        className="flex-1 flex flex-col items-center justify-center p-12 text-center text-[#1A1A1A]/30"
                      >
                        <FileText size={48} strokeWidth={1} />
                        <p className="mt-4 font-medium">No content to display yet</p>
                        <p className="text-sm">Upload and choose a mode to see results</p>
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
        :root {
          --visual-min-height: 300px;
        }
        @media (min-width: 640px) {
          :root {
            --visual-min-height: 500px;
          }
        }
        @media (min-width: 1024px) {
          :root {
            --visual-min-height: 700px;
          }
        }

        .visual-container {
          background-image: radial-gradient(#1A1A1A/5 1px, transparent 1px);
          background-size: 20px 20px;
          min-width: 320px;
          container-type: inline-size;
        }

        .serif { font-family: 'Georgia', serif; }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.2);
        }

        .markdown-content h1 { font-family: 'Georgia', serif; font-style: italic; font-size: 1.5rem; margin-top: 1.5rem; margin-bottom: 1rem; font-weight: 600; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 0.5rem; }
        .markdown-content h2 { font-family: 'Georgia', serif; font-style: italic; font-size: 1.25rem; margin-top: 1.25rem; margin-bottom: 0.75rem; font-weight: 600; color: inherit; }
        .markdown-content h3 { font-family: 'Georgia', serif; font-style: italic; font-size: 1.1rem; margin-top: 1rem; margin-bottom: 0.5rem; font-weight: 600; color: inherit; }
        .markdown-content p { font-size: 0.9rem; margin-bottom: 1rem; line-height: 1.6; color: #333; white-space: pre-wrap; }

        @media (min-width: 640px) {
          .markdown-content h1 { font-size: 2rem; margin-top: 2rem; }
          .markdown-content h2 { font-size: 1.5rem; margin-top: 1.5rem; }
          .markdown-content h3 { font-size: 1.25rem; margin-top: 1.25rem; }
          .markdown-content p { font-size: 1rem; }
        }
        .markdown-content ul, .markdown-content ol { margin-bottom: 1rem; padding-left: 1.5rem; color: inherit; }
        .markdown-content li { margin-bottom: 0.5rem; color: inherit; }
        .markdown-content strong { font-weight: 600; color: #000; }
        .markdown-content blockquote { border-left: 4px solid #F27D26; padding-left: 1rem; font-style: italic; color: #666; margin: 1.5rem 0; }
        .markdown-content code { background: #f0f0f0; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #1A1A1A; }
        .markdown-content pre { background: #1a1a1a; color: #fff; padding: 1rem; border-radius: 12px; overflow-x: auto; margin-bottom: 1.5rem; }
        .markdown-content pre code { background: transparent; color: inherit; padding: 0; }
        .markdown-content table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; border: 1px solid rgba(0,0,0,0.1); color: inherit; }
        .markdown-content th { background: #f9fafb; border: 1px solid rgba(0,0,0,0.1); padding: 0.75rem; text-align: left; font-weight: 600; color: #1A1A1A; }
        .markdown-content td { border: 1px solid rgba(0,0,0,0.1); padding: 0.75rem; color: inherit; }
        .markdown-content tr:nth-child(even) { background: #fdfcfb; }

        .mermaid-diagram svg {
          max-width: 100% !important;
          height: auto !important;
        }

        /* PDF Export Styles */
        .pdf-export { padding: 20px !important; }
        .pdf-export .markdown-content h1 { font-size: 1.5rem; margin-top: 1rem; margin-bottom: 0.5rem; }
        .pdf-export .markdown-content h2 { font-size: 1.25rem; margin-top: 0.75rem; margin-bottom: 0.4rem; }
        .pdf-export .markdown-content h3 { font-size: 1.1rem; margin-top: 0.5rem; margin-bottom: 0.3rem; }
        .pdf-export .markdown-content p { font-size: 0.85rem; margin-bottom: 0.5rem; line-height: 1.4; }
        .pdf-export .markdown-content li { font-size: 0.85rem; margin-bottom: 0.25rem; }
        .pdf-export .mermaid-diagram { padding: 1rem !important; margin-top: 0.5rem !important; margin-bottom: 0.5rem !important; }
        .pdf-export .mermaid-diagram svg { max-width: 100% !important; height: auto !important; margin: 0 auto; }
        .pdf-export table { font-size: 0.75rem; margin-bottom: 1rem; }
        .pdf-export th, .pdf-export td { padding: 0.4rem; }
      `}</style>
    </div>
  );
}

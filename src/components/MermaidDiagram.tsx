import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import mermaid from 'mermaid';
import { cn } from '../lib/utils';

mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
});

export const MermaidDiagram = ({ code, noMargin = false }: { code: string, noMargin?: boolean }) => {
  const [svg, setSvg] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (code) {
        try {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, code);
          setSvg(svg);
        } catch (err) {
          console.error('Mermaid render error:', err);
          setSvg('<p class="text-red-500 text-xs text-center border p-4 rounded bg-red-50">Failed to render diagram. Check Mermaid syntax.</p>');
        }
      }
    };
    renderDiagram();
  }, [code]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className={cn("relative group w-full", !noMargin && "my-6")}>
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={copyToClipboard}
          className="p-2 bg-white/90 border border-[#1A1A1A]/10 rounded-lg shadow-sm hover:bg-white transition-all flex items-center gap-2 text-xs font-medium"
        >
          {isCopied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          {isCopied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>
      <div 
        ref={containerRef}
        className="mermaid-diagram bg-[#FDFCFB] border border-[#1A1A1A]/10 rounded-2xl p-6 flex justify-center overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
};

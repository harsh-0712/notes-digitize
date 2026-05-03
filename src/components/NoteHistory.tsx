import React, { useState, useEffect } from 'react';
import { storageService, Note as NoteType, Folder as FolderType } from '../services/storageService';
import { Search, Folder, FileText, Trash2, Calendar, Layout, Type, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { VisualElement } from '../types';
import { cn } from '../lib/utils';

interface NoteHistoryProps {
  onSelectNote: (content: string | VisualElement[], mode: 'structured' | 'visual', aspectRatio: number | null) => void;
}

export function NoteHistory({ onSelectNote }: NoteHistoryProps) {
  const [notes, setNotes] = useState<NoteType[]>([]);
  const [folders, setFolders] = useState<{ [key: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all'>('all');

  const loadData = async () => {
    const [notesData, foldersData] = await Promise.all([
      storageService.getNotes(),
      storageService.getFolders()
    ]);
    
    const folderMap: { [key: string]: string } = {};
    foldersData.forEach(f => {
      folderMap[f.id] = f.name;
    });
    
    setFolders(folderMap);
    setNotes(notesData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this note?')) return;
    try {
      await storageService.deleteNote(id);
      loadData();
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFolder = selectedFolderId === 'all' || note.folderId === selectedFolderId;
    return matchesSearch && matchesFolder;
  });

  const uniqueFolderIds = Array.from(new Set(notes.map(n => n.folderId)));

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row gap-8 pb-8 border-b border-line">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" size={18} />
          <input 
            type="text"
            placeholder="Search Archives..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-line rounded-sm focus:outline-none focus:ring-1 focus:ring-ink font-display font-medium uppercase text-xs tracking-widest placeholder:text-ink/20"
          />
        </div>
        <div className="relative min-w-[200px]">
          <select 
            value={selectedFolderId}
            onChange={(e) => setSelectedFolderId(e.target.value)}
            className="w-full appearance-none px-6 py-4 bg-white border border-line rounded-sm focus:outline-none focus:ring-1 focus:ring-ink font-display font-bold uppercase text-[10px] tracking-widest cursor-pointer pr-12"
          >
            <option value="all">Global Access [All]</option>
            {uniqueFolderIds.map(id => (
              <option key={id} value={id}>{folders[id] || 'Unknown'}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
            <Folder size={16} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredNotes.length === 0 ? (
          <div className="col-span-full text-center py-24 border border-dashed border-line rounded-sm bg-neutral-50 flex flex-col items-center gap-4">
            <FileText size={48} className="opacity-10" />
            <p className="font-display font-bold uppercase tracking-widest text-ink/20">Archive record null</p>
          </div>
        ) : (
          filteredNotes.map(note => (
            <div 
              key={note.id}
              onClick={() => onSelectNote(JSON.parse(note.content), note.mode, note.aspectRatio || null)}
              className="group relative flex flex-col p-6 bg-white border border-line hover:border-ink hover:shadow-bold cursor-pointer transition-all overflow-hidden"
            >
              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-ink/5 group-hover:border-primary/50 transition-colors" />
              
              <div className="flex items-start justify-between mb-8">
                <div className={cn(
                  "px-3 py-1 rounded-sm text-[8px] font-mono font-bold uppercase tracking-[0.2em]",
                  note.mode === 'visual' ? "bg-primary text-white" : "bg-ink text-paper"
                )}>
                  {note.mode} mode
                </div>
                <button 
                  onClick={(e) => handleDeleteNote(e, note.id)}
                  className="p-2 text-ink/20 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="text-2xl font-display font-bold tracking-tight uppercase group-hover:text-primary transition-colors leading-tight">
                  {note.title}
                </h4>
                
                <div className="flex flex-wrap items-center gap-6 text-[9px] font-mono font-bold uppercase tracking-widest text-ink/40 border-t border-dashed border-line pt-4">
                  <span className="flex items-center gap-2">
                    <Folder size={12} className="text-primary" /> {folders[note.folderId] || 'UNCATEGORIZED'}
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar size={12} className="text-primary" /> {note.createdAt ? format(note.createdAt, 'dd.MM.yyyy') : '??.??.????'}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-display font-bold text-primary tracking-widest">Access Protocol &rarr;</span>
                <ChevronRight size={16} className="text-primary" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20 focus:border-[#F27D26]"
          />
        </div>
        <select 
          value={selectedFolderId}
          onChange={(e) => setSelectedFolderId(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F27D26]/20"
        >
          <option value="all">All Folders</option>
          {uniqueFolderIds.map(id => (
            <option key={id} value={id}>{folders[id] || 'Unknown Folder'}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400">
            <FileText size={48} className="mx-auto mb-2 opacity-20" />
            <p>No notes found</p>
          </div>
        ) : (
          filteredNotes.map(note => (
            <div 
              key={note.id}
              onClick={() => onSelectNote(JSON.parse(note.content), note.mode, note.aspectRatio || null)}
              className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-[#F27D26] hover:shadow-lg hover:shadow-[#F27D26]/5 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  note.mode === 'visual' ? "bg-[#F27D26]/10 text-[#F27D26]" : "bg-[#1A1A1A]/5 text-[#1A1A1A]"
                )}>
                  {note.mode === 'visual' ? <Layout size={20} /> : <Type size={20} />}
                </div>
                <div className="truncate">
                  <h4 className="font-semibold truncate">{note.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Folder size={12} /> {folders[note.folderId] || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {note.createdAt ? format(note.createdAt, 'MMM d, yyyy') : 'Recently'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => handleDeleteNote(e, note.id)}
                  className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={18} />
                </button>
                <ChevronRight size={20} className="text-gray-300" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

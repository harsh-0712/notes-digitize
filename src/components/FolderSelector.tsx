import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { storageService, Folder as FolderType } from '../services/storageService';
import { Folder, Plus, Trash2, FolderOpen, X } from 'lucide-react';

interface FolderSelectorProps {
  onSelect: (folderId: string) => void;
  onClose: () => void;
}

export function FolderSelector({ onSelect, onClose }: FolderSelectorProps) {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadFolders = async () => {
    const data = await storageService.getFolders();
    setFolders(data);
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await storageService.createFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreating(false);
      loadFolders();
    } catch (err) {
      console.error('Error creating folder:', err);
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this folder? Notes inside will not be deleted but will become unorganized.')) return;
    try {
      await storageService.deleteFolder(id);
      loadFolders();
    } catch (err) {
      console.error('Error deleting folder:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-paper rounded-sm w-full max-w-md overflow-hidden shadow-bold border border-ink"
      >
        <div className="p-8 border-b border-line flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-display font-bold uppercase tracking-tight">Access Points</h3>
            <p className="text-[10px] font-mono uppercase tracking-widest opacity-40">System Directories</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-ink hover:text-paper rounded-full transition-all">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 max-h-[400px] overflow-y-auto space-y-3 custom-scrollbar">
          {folders.length === 0 && !isCreating && (
            <div className="text-center py-12 border border-dashed border-line">
              <FolderOpen size={48} className="mx-auto mb-4 opacity-10" />
              <p className="font-display font-bold text-xs uppercase tracking-widest opacity-20">No directories found</p>
            </div>
          )}
          
          {folders.map(folder => (
            <div 
              key={folder.id}
              onClick={() => onSelect(folder.id)}
              className="group flex items-center justify-between p-5 border border-line hover:border-ink hover:bg-white cursor-pointer transition-all"
            >
              <div className="flex items-center gap-4">
                <Folder size={18} className="text-primary group-hover:scale-110 transition-transform" />
                <span className="font-display font-bold uppercase text-xs tracking-widest">{folder.name}</span>
              </div>
              <button 
                onClick={(e) => handleDeleteFolder(e, folder.id)}
                className="p-2 text-ink/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          
          {isCreating ? (
            <form onSubmit={handleCreateFolder} className="p-6 border border-ink bg-white space-y-4">
              <div className="space-y-2">
                <label className="text-[8px] font-mono font-bold uppercase tracking-[0.3em] text-primary">New Directory ID</label>
                <input 
                  autoFocus
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="EX: FIELD_NOTES_2024"
                  className="w-full p-3 bg-paper border border-line focus:outline-none focus:border-ink font-display font-medium uppercase text-xs tracking-widest"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-3 bg-ink text-paper rounded-sm font-display font-bold uppercase text-[10px] tracking-widest hover:brightness-125 transition-all">Register</button>
                <button type="button" onClick={() => setIsCreating(false)} className="px-5 py-3 border border-line rounded-sm font-display font-bold uppercase text-[10px] tracking-widest hover:bg-neutral-50">Abort</button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-3 p-5 border border-dashed border-line text-ink/40 hover:border-ink hover:text-ink transition-all font-display font-bold uppercase text-[10px] tracking-widest"
            >
              <Plus size={18} />
              Construct New Directory
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

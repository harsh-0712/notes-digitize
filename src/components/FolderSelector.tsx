import React, { useState, useEffect } from 'react';
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Select Folder</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 max-h-[400px] overflow-y-auto space-y-2 custom-scrollbar">
          {folders.length === 0 && !isCreating && (
            <div className="text-center py-8 text-gray-400">
              <FolderOpen size={48} className="mx-auto mb-2 opacity-20" />
              <p>No folders yet</p>
            </div>
          )}
          
          {folders.map(folder => (
            <div 
              key={folder.id}
              onClick={() => onSelect(folder.id)}
              className="group flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-[#F27D26] hover:bg-[#F27D26]/5 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3">
                <Folder size={20} className="text-[#F27D26]" />
                <span className="font-medium">{folder.name}</span>
              </div>
              <button 
                onClick={(e) => handleDeleteFolder(e, folder.id)}
                className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          
          {isCreating ? (
            <form onSubmit={handleCreateFolder} className="p-4 rounded-2xl border-2 border-dashed border-[#F27D26]/30 bg-[#F27D26]/5 space-y-3">
              <input 
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="w-full p-2 bg-transparent border-b border-[#F27D26]/30 focus:outline-none focus:border-[#F27D26] font-medium"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-[#F27D26] text-white rounded-xl text-sm font-bold">Create</button>
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 bg-gray-200 rounded-xl text-sm font-bold">Cancel</button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#F27D26] hover:text-[#F27D26] transition-all font-medium"
            >
              <Plus size={20} />
              New Folder
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

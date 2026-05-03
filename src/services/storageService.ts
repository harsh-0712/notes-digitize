import { VisualElement } from '../types';

export interface Folder {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Note {
  id: string;
  title: string;
  userId: string;
  folderId: string;
  mode: 'structured' | 'visual';
  content: string; // JSON string
  aspectRatio: number | null;
  createdAt: Date;
}

export interface IStorageService {
  getFolders(): Promise<Folder[]>;
  createFolder(name: string): Promise<Folder>;
  deleteFolder(id: string): Promise<void>;
  
  getNotes(): Promise<Note[]>;
  saveNote(note: Omit<Note, 'id' | 'createdAt'>): Promise<Note>;
  deleteNote(id: string): Promise<void>;
}

class InMemoryStorageService implements IStorageService {
  private folders: Folder[] = [];
  private notes: Note[] = [];

  async getFolders(): Promise<Folder[]> {
    return [...this.folders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createFolder(name: string): Promise<Folder> {
    const newFolder: Folder = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      createdAt: new Date()
    };
    this.folders.push(newFolder);
    return newFolder;
  }

  async deleteFolder(id: string): Promise<void> {
    this.folders = this.folders.filter(f => f.id !== id);
  }

  async getNotes(): Promise<Note[]> {
    return [...this.notes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async saveNote(noteData: Omit<Note, 'id' | 'createdAt'>): Promise<Note> {
    const newNote: Note = {
      ...noteData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date()
    };
    this.notes.push(newNote);
    return newNote;
  }

  async deleteNote(id: string): Promise<void> {
    this.notes = this.notes.filter(n => n.id !== id);
  }
}

export const storageService = new InMemoryStorageService();

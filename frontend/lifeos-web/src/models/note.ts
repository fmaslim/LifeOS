export type NoteDomain = 'Work' | 'Content' | 'Home' | 'Health' | 'Finance' | 'Personal'
export interface Note { id: string; title: string; body: string; domain: NoteDomain; tags: string[]; pinned: boolean; inbox: boolean; createdAt: string; updatedAt: string }
export interface NoteData { notes: Note[] }

import { noteMockData } from '../data/noteMockData'
import type { NoteData } from '../models/note'
import type { NoteService } from './NoteService'
export class MockNoteService implements NoteService { getNoteData(): NoteData { return noteMockData } }

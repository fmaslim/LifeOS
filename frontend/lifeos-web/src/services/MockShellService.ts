import { shellMockData } from '../data/shellMockData'
import type { ShellData } from '../models/shell'
import type { ShellService } from './ShellService'

/** Frontend-only shell service; replace with an API implementation when needed. */
export class MockShellService implements ShellService { getShellData(): ShellData { return shellMockData } }

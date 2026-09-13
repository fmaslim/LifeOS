import { useEffect, useState } from 'react'
import { localStore } from './LocalStore'
export function usePersistentState<T>(key: string, seed: T) { const [value, setValue] = useState<T>(() => localStore.read(key, seed)); useEffect(() => { localStore.write(key, value) }, [key, value]); return [value, setValue] as const }

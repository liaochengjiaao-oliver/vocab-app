import type { IDBPDatabase } from 'idb'
import type { WordDB } from './index'
import type { WordProgress } from './types'

export async function getProgress(
  db: IDBPDatabase<WordDB>,
  wordId: string,
): Promise<WordProgress | undefined> {
  return db.get('progress', wordId)
}

export async function saveProgress(
  db: IDBPDatabase<WordDB>,
  progress: WordProgress,
): Promise<void> {
  await db.put('progress', progress)
}

export async function getDueWords(
  db: IDBPDatabase<WordDB>,
): Promise<string[]> {
  const today = new Date().toISOString().split('T')[0]
  const allProgress = await db.getAll('progress')
  return allProgress
    .filter((p) => p.nextReviewDate <= today)
    .map((p) => p.wordId)
}

export async function getAllProgress(
  db: IDBPDatabase<WordDB>,
): Promise<WordProgress[]> {
  return db.getAll('progress')
}

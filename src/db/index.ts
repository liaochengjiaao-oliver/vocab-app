import { openDB } from 'idb'
import type { IDBPDatabase } from 'idb'
import type { WordEntry } from '../data/words'
import type { WordProgress, DailyStats } from './types'

const DB_NAME = 'word-app'
const DB_VERSION = 1

export interface WordDB {
  words: {
    key: string
    value: WordEntry
    indexes: { 'by-tag': string; 'by-level': number }
  }
  progress: {
    key: string
    value: WordProgress
    indexes: { 'by-next-review': string }
  }
  stats: {
    key: string
    value: DailyStats
  }
}

export async function initDB(): Promise<IDBPDatabase<WordDB>> {
  return openDB<WordDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const wordStore = db.createObjectStore('words', { keyPath: 'id' })
      wordStore.createIndex('by-tag', 'tag')
      wordStore.createIndex('by-level', 'level')

      const progressStore = db.createObjectStore('progress', { keyPath: 'wordId' })
      progressStore.createIndex('by-next-review', 'nextReviewDate')

      db.createObjectStore('stats', { keyPath: 'date' })
    },
  })
}

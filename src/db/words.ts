import type { IDBPDatabase } from 'idb'
import type { WordEntry } from '../data/words'
import { words } from '../data/words'
import type { WordDB } from './index'

export async function importWords(db: IDBPDatabase<WordDB>): Promise<void> {
  const tx = db.transaction('words', 'readwrite')
  await Promise.all(words.map((word) => tx.store.put(word)))
  await tx.done
}

export async function importCustomWords(
  db: IDBPDatabase<WordDB>,
  words: WordEntry[],
): Promise<{ added: number; skipped: number }> {
  if (words.length === 0) {
    return { added: 0, skipped: 0 }
  }

  const existingWords = await db.getAll('words')
  const existingIds = new Set(existingWords.map((word) => word.id))
  const existingWordTexts = new Set(existingWords.map((word) => normalizeWordText(word.word)))
  const importedIds = new Set<string>()
  const importedWordTexts = new Set<string>()

  const newWords = words.filter((word) => {
    const normalizedWord = normalizeWordText(word.word)
    const isDuplicate = existingIds.has(word.id)
      || existingWordTexts.has(normalizedWord)
      || importedIds.has(word.id)
      || importedWordTexts.has(normalizedWord)

    if (!isDuplicate) {
      importedIds.add(word.id)
      importedWordTexts.add(normalizedWord)
    }

    return !isDuplicate
  })

  const tx = db.transaction('words', 'readwrite')
  await Promise.all(newWords.map((word) => tx.store.put(word)))
  await tx.done

  return {
    added: newWords.length,
    skipped: words.length - newWords.length,
  }
}

function normalizeWordText(word: string): string {
  return word.trim().toLowerCase()
}

export async function getAllWords(db: IDBPDatabase<WordDB>): Promise<WordEntry[]> {
  return db.getAll('words')
}

export async function getWordsByTag(
  db: IDBPDatabase<WordDB>,
  tag: WordEntry['tag'],
): Promise<WordEntry[]> {
  return db.getAllFromIndex('words', 'by-tag', tag)
}

export async function getUnlearnedWords(
  db: IDBPDatabase<WordDB>,
  limit: number,
  filter?: { tag?: WordEntry['tag']; level?: number },
): Promise<WordEntry[]> {
  const allWords = await db.getAll('words')
  const progressMap = new Map(
    (await db.getAll('progress')).map((p) => [p.wordId, true]),
  )
  let filtered = allWords.filter((w) => !progressMap.has(w.id))
  if (filter?.tag) filtered = filtered.filter((w) => w.tag === filter.tag)
  if (filter?.level) filtered = filtered.filter((w) => w.level === filter.level)
  return filtered.slice(0, limit)
}

export async function getFilteredWords(
  db: IDBPDatabase<WordDB>,
  filter?: { tag?: WordEntry['tag']; level?: number },
): Promise<WordEntry[]> {
  const allWords = await db.getAll('words')
  let filtered = allWords
  if (filter?.tag) filtered = filtered.filter((w) => w.tag === filter.tag)
  if (filter?.level) filtered = filtered.filter((w) => w.level === filter.level)
  return filtered
}

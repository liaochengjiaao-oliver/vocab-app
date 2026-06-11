import type { IDBPDatabase } from 'idb'
import type { WordDB } from './index'
import type { DailyStats } from './types'

function todayKey(): string {
  return new Date().toISOString().split('T')[0]
}

export async function getTodayStats(
  db: IDBPDatabase<WordDB>,
): Promise<DailyStats> {
  const date = todayKey()
  const existing = await db.get('stats', date)
  return existing ?? { date, newWords: 0, reviews: 0, correctCount: 0, totalCount: 0 }
}

export async function recordNewWord(db: IDBPDatabase<WordDB>): Promise<void> {
  const stats = await getTodayStats(db)
  stats.newWords += 1
  await db.put('stats', stats)
}

export async function recordReview(
  db: IDBPDatabase<WordDB>,
  grade: number,
): Promise<void> {
  const stats = await getTodayStats(db)
  stats.reviews += 1
  stats.totalCount += 1
  if (grade >= 2) stats.correctCount += 1
  await db.put('stats', stats)
}

export async function getRecentStats(
  db: IDBPDatabase<WordDB>,
  days: number,
): Promise<DailyStats[]> {
  const allStats = await db.getAll('stats')
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffKey = cutoff.toISOString().split('T')[0]
  return allStats.filter((s) => s.date >= cutoffKey).sort((a, b) => a.date.localeCompare(b.date))
}

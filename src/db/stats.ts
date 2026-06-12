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

export async function getConsecutiveStudyDays(db: IDBPDatabase<WordDB>): Promise<number> {
  const allStats = await db.getAll('stats')
  if (allStats.length === 0) return 0

  const sortedDates = allStats
    .filter((stat) => stat.newWords > 0 || stat.reviews > 0)
    .map((stat) => stat.date)
    .sort((a, b) => b.localeCompare(a))

  if (sortedDates.length === 0) return 0

  let consecutiveDays = 1
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = yesterday.toISOString().split('T')[0]

  const hasActivityToday = sortedDates.includes(today)
  const hasActivityYesterday = sortedDates.includes(yesterdayKey)

  if (!hasActivityToday && !hasActivityYesterday) return 0

  let lastDate = hasActivityToday ? today : yesterdayKey

  for (let i = 0; i < sortedDates.length - 1; i++) {
    const currentDate = new Date(lastDate)
    const nextDate = new Date(sortedDates[i + 1])
    const diffDays = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      consecutiveDays += 1
      lastDate = sortedDates[i + 1]
    } else {
      break
    }
  }

  return consecutiveDays
}

export async function getStudyTimeDistribution(db: IDBPDatabase<WordDB>): Promise<{ morning: number; afternoon: number; evening: number }> {
  const allStats = await db.getAll('stats')
  const distribution = { morning: 0, afternoon: 0, evening: 0 }

  for (const stat of allStats) {
    if (stat.newWords === 0 && stat.reviews === 0) continue

    const date = new Date(stat.date)
    const hour = date.getHours()

    if (hour >= 6 && hour < 12) {
      distribution.morning += 1
    } else if (hour >= 12 && hour < 18) {
      distribution.afternoon += 1
    } else {
      distribution.evening += 1
    }
  }

  return distribution
}

export async function getAtRiskWords(db: IDBPDatabase<WordDB>, daysAhead: number = 3): Promise<Array<{ wordId: string; riskScore: number }>> {
  const progressList = await db.getAll('progress')
  const now = new Date()
  const atRisk: Array<{ wordId: string; riskScore: number }> = []

  for (const progress of progressList) {
    if (progress.history.length === 0) continue

    const lastReview = progress.history[progress.history.length - 1]
    const lastReviewDate = new Date(lastReview.date)
    const daysSinceReview = Math.floor((now.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24))

    const lowGradeCount = progress.history.filter((r: { grade: number }) => r.grade <= 1).length
    const totalReviews = progress.history.length
    const forgetRate = totalReviews > 0 ? lowGradeCount / totalReviews : 0

    const nextReviewDate = new Date(progress.nextReviewDate)
    const daysUntilNext = Math.ceil((nextReviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilNext <= daysAhead || (forgetRate > 0.3 && daysSinceReview > 7)) {
      const riskScore = Math.min(100, Math.round((forgetRate * 50) + (daysSinceReview * 2) + (daysUntilNext <= 0 ? 30 : 0)))
      atRisk.push({ wordId: progress.wordId, riskScore })
    }
  }

  return atRisk.sort((a, b) => b.riskScore - a.riskScore).slice(0, 10)
}

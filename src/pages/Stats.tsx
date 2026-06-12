import { useState, useEffect } from 'react'
import type { IDBPDatabase } from 'idb'
import type { WordDB } from '../db'
import { getTodayStats, getRecentStats, getStudyTimeDistribution, getAtRiskWords } from '../db/stats'
import { getAllProgress } from '../db/progress'
import { getAllWords } from '../db/words'
import type { DailyStats, WordProgress } from '../db/types'
import type { WordEntry } from '../data/words'
import styles from './Stats.module.css'

interface StatsProps {
  db: IDBPDatabase<WordDB>
  onBack: () => void
  onNavigate: (page: string) => void
}

interface ReviewForecastDay {
  date: string
  label: string
  count: number
}

interface WeakWord {
  word: WordEntry
  progress: WordProgress
  weakCount: number
  totalReviews: number
}

interface ForgottenWord {
  word: WordEntry
  forgottenCount: number
  totalReviews: number
  latestGrade: number
}

interface WeakTrendDay {
  date: string
  label: string
  forgottenCount: number
  improvedCount: number
}

interface RecentChangeSummary {
  newWordsChange: number
  reviewsChange: number
  accuracyChange: number
  currentAccuracy: number
  previousAccuracy: number
}

export function Stats({ db, onBack, onNavigate }: StatsProps) {
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null)
  const [recentStats, setRecentStats] = useState<DailyStats[]>([])
  const [yearlyStats, setYearlyStats] = useState<DailyStats[]>([])
  const [allWords, setAllWords] = useState<WordEntry[]>([])
  const [allProgress, setAllProgress] = useState<WordProgress[]>([])

  useEffect(() => {
    async function load() {
      const [today, recent, yearly, words, progress] = await Promise.all([
        getTodayStats(db),
        getRecentStats(db, 30),
        getRecentStats(db, 365),
        getAllWords(db),
        getAllProgress(db),
      ])

      setTodayStats(today)
      setRecentStats(recent)
      setYearlyStats(yearly)
      setAllWords(words)
      setAllProgress(progress)
    }

    load()
  }, [db])

  const totalCount = allWords.length
  const learnedCount = allProgress.length
  const unlearnedCount = Math.max(totalCount - learnedCount, 0)
  const masteryRate = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0
  const todayAccuracy = todayStats && todayStats.totalCount > 0
    ? Math.round((todayStats.correctCount / todayStats.totalCount) * 100)
    : 0

  const heatmapData = buildHeatmap(recentStats)
  const forecast = buildReviewForecast(allProgress)
  const overdueCount = countOverdueReviews(allProgress)
  const dueTodayCount = forecast[0]?.count ?? 0
  const currentStatusDistribution = buildCurrentStatusDistribution(allProgress)
  const masteredCount = currentStatusDistribution[2] + currentStatusDistribution[3]
  const totalAccuracy = learnedCount > 0 ? Math.round((masteredCount / learnedCount) * 100) : 0
  const recentAccuracy = getRecentAccuracy(yearlyStats, 7)
  const currentStreak = getCurrentStreak(yearlyStats)
  const longestStreak = getLongestStreak(yearlyStats)
  const weakWords = buildWeakWords(allWords, allProgress)
  const recentChangeSummary = buildRecentChangeSummary(yearlyStats)
  const weakTrend = buildWeakTrend(allProgress)
  const forgottenWords = buildForgottenWords(allWords, allProgress)
  const [timeDistribution, setTimeDistribution] = useState<{ morning: number; afternoon: number; evening: number } | null>(null)
  const [atRiskWords, setAtRiskWords] = useState<Array<{ wordId: string; riskScore: number }>>([])

  useEffect(() => {
    async function loadInsights() {
      const dist = await getStudyTimeDistribution(db)
      setTimeDistribution(dist)
      const risks = await getAtRiskWords(db)
      setAtRiskWords(risks)
    }
    loadInsights()
  }, [db])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backArrow} onClick={onBack}>←</button>
        <h1 className={styles.title}>学习统计</h1>
      </div>

      <section className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <div>
            <p className={styles.cardEyebrow}>总体进度</p>
            <h2 className={styles.progressTitle}>{learnedCount} / {totalCount} 词</h2>
          </div>
          <span className={styles.progressPercent}>{masteryRate}%</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${masteryRate}%` }} />
        </div>
        <div className={styles.progressMeta}>
          <span>未学 {unlearnedCount} 词</span>
          <span>总正确率 {totalAccuracy}%</span>
        </div>
      </section>

      <div className={styles.metricGrid}>
        <MetricCard label="今日新学" value={todayStats?.newWords ?? 0} />
        <MetricCard label="今日复习" value={todayStats?.reviews ?? 0} />
        <MetricCard label="今日正确率" value={`${todayAccuracy}%`} />
        <MetricCard label="近 7 天正确率" value={`${recentAccuracy}%`} />
        <MetricCard label="当前连续" value={`${currentStreak} 天`} />
        <MetricCard label="最长连续" value={`${longestStreak} 天`} />
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>近 7 天变化</h3>
        <div className={styles.changeGrid}>
          <ChangeCard label="新学变化" value={formatSignedNumber(recentChangeSummary.newWordsChange)} />
          <ChangeCard label="复习变化" value={formatSignedNumber(recentChangeSummary.reviewsChange)} />
          <ChangeCard label="正确率变化" value={`${formatSignedNumber(recentChangeSummary.accuracyChange)}%`} />
        </div>
        <p className={styles.sectionHint}>
          当前 7 天正确率 {recentChangeSummary.currentAccuracy}%，前 7 天正确率 {recentChangeSummary.previousAccuracy}%。
        </p>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>复习压力</h3>
          {overdueCount > 0 && <span className={styles.warningBadge}>逾期 {overdueCount} 词</span>}
        </div>
        <div className={styles.forecastList}>
          {forecast.map((day) => (
            <div key={day.date} className={styles.forecastItem}>
              <span className={styles.forecastLabel}>{day.label}</span>
              <div className={styles.forecastBarTrack}>
                <div
                  className={styles.forecastBarFill}
                  style={{ width: `${getForecastBarWidth(day.count, forecast)}%` }}
                />
              </div>
              <span className={styles.forecastCount}>{day.count}</span>
            </div>
          ))}
        </div>
        <p className={styles.sectionHint}>今天待复习 {dueTodayCount} 词，未来 7 天预计 {forecast.reduce((sum, day) => sum + day.count, 0)} 词。</p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>当前掌握状态</h3>
        <div className={styles.gradeGrid}>
          {[
            { label: '忘了', count: currentStatusDistribution[0], className: styles.gradeForgot },
            { label: '模糊', count: currentStatusDistribution[1], className: styles.gradeVague },
            { label: '想起', count: currentStatusDistribution[2], className: styles.gradeRecall },
            { label: '熟练', count: currentStatusDistribution[3], className: styles.gradeSkilled },
          ].map((grade) => (
            <div key={grade.label} className={styles.gradeItem}>
              <div className={`${styles.gradeDot} ${grade.className}`} />
              <span className={styles.gradeLabel}>{grade.label}</span>
              <span className={styles.gradeCount}>{grade.count}</span>
            </div>
          ))}
        </div>
        <p className={styles.sectionHint}>按每个已学单词的最近一次评分统计，所以总数等于总体进度里的已学词数。</p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>薄弱改善趋势</h3>
        <div className={styles.trendList}>
          {weakTrend.map((day) => (
            <div key={day.date} className={styles.trendItem}>
              <span className={styles.trendLabel}>{day.label}</span>
              <span className={styles.trendForgot}>忘记 {day.forgottenCount}</span>
              <span className={styles.trendImprove}>改善 {day.improvedCount}</span>
            </div>
          ))}
        </div>
        <p className={styles.sectionHint}>按每天复习记录统计：评分 0/1 计为忘记，评分从 0/1 提升到 2/3 计为改善。</p>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>薄弱词 Top 10</h3>
          <button
            className={styles.sectionAction}
            onClick={() => onNavigate('weakReview')}
            disabled={weakWords.length === 0}
          >
            专项复习
          </button>
        </div>
        {weakWords.length > 0 ? (
          <div className={styles.weakList}>
            {weakWords.map((item, index) => (
              <div key={item.word.id} className={styles.weakItem}>
                <span className={styles.weakRank}>{index + 1}</span>
                <div className={styles.weakContent}>
                  <span className={styles.weakWord}>{item.word.word}</span>
                  <span className={styles.weakMeaning}>{item.word.meaning}</span>
                </div>
                <span className={styles.weakBadge}>薄弱 {item.weakCount}/{item.totalReviews}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>暂时还没有薄弱词，继续学习后这里会自动统计。</p>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>最常忘单词排行</h3>
        {forgottenWords.length > 0 ? (
          <div className={styles.weakList}>
            {forgottenWords.map((item, index) => (
              <div key={item.word.id} className={styles.weakItem}>
                <span className={styles.weakRank}>{index + 1}</span>
                <div className={styles.weakContent}>
                  <span className={styles.weakWord}>{item.word.word}</span>
                  <span className={styles.weakMeaning}>{item.word.meaning}</span>
                </div>
                <span className={styles.weakBadge}>忘记 {item.forgottenCount}/{item.totalReviews}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>暂时没有忘记记录，继续复习后这里会自动统计。</p>
        )}
      </section>

      {timeDistribution && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>学习时段分布</h3>
          <div className={styles.timeDistGrid}>
            <div className={styles.timeDistItem}>
              <span className={styles.timeDistValue}>{timeDistribution.morning}</span>
              <span className={styles.timeDistLabel}>☀️ 上午 (6-12点)</span>
            </div>
            <div className={styles.timeDistItem}>
              <span className={styles.timeDistValue}>{timeDistribution.afternoon}</span>
              <span className={styles.timeDistLabel}>🌤️ 下午 (12-18点)</span>
            </div>
            <div className={styles.timeDistItem}>
              <span className={styles.timeDistValue}>{timeDistribution.evening}</span>
              <span className={styles.timeDistLabel}>🌙 晚上 (18-6点)</span>
            </div>
          </div>
          <p className={styles.sectionHint}>统计你有学习活动的天数分布在哪些时段。</p>
        </section>
      )}

      {atRiskWords.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>⚠️ 未来3天可能遗忘的词</h3>
          <div className={styles.atRiskList}>
            {atRiskWords.slice(0, 8).map((item, index) => (
              <div key={item.wordId} className={styles.atRiskItem}>
                <span className={styles.atRiskRank}>{index + 1}</span>
                <span className={styles.atRiskWord}>{item.wordId}</span>
                <div className={styles.atRiskBar}>
                  <div className={styles.atRiskFill} style={{ width: `${item.riskScore}%` }} />
                </div>
                <span className={styles.atRiskScore}>{item.riskScore}%</span>
              </div>
            ))}
          </div>
          <p className={styles.sectionHint}>根据遗忘率、复习间隔预测风险，建议优先复习高分词。</p>
        </section>
      )}

      <section className={styles.heatmapSection}>
        <h3 className={styles.sectionTitle}>最近 30 天</h3>
        <div className={styles.heatmap}>
          {heatmapData.map((day) => (
            <div
              key={day.date}
              className={styles.heatmapCell}
              style={{ backgroundColor: getHeatColor(day.count) }}
              title={`${day.date}: ${day.count} 词`}
            />
          ))}
        </div>
        <div className={styles.legend}>
          <span>少</span>
          {[0, 1, 3, 5, 10].map((count) => (
            <div
              key={count}
              className={styles.legendCell}
              style={{ backgroundColor: getHeatColor(count) }}
            />
          ))}
          <span>多</span>
        </div>
      </section>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: number | string
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className={styles.metricCard}>
      <span className={styles.metricValue}>{value}</span>
      <span className={styles.metricLabel}>{label}</span>
    </div>
  )
}

interface ChangeCardProps {
  label: string
  value: string
}

function ChangeCard({ label, value }: ChangeCardProps) {
  const isPositive = value.startsWith('+')
  const isNegative = value.startsWith('-')

  return (
    <div className={styles.changeCard}>
      <span className={isPositive ? styles.changePositive : isNegative ? styles.changeNegative : styles.changeNeutral}>
        {value}
      </span>
      <span className={styles.metricLabel}>{label}</span>
    </div>
  )
}

interface HeatmapDay {
  date: string
  count: number
}

function buildHeatmap(stats: DailyStats[]): HeatmapDay[] {
  const statsMap = new Map(stats.map((stat) => [stat.date, stat]))
  const days: HeatmapDay[] = []

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = new Date()
    date.setDate(date.getDate() - dayOffset)
    const key = toDateKey(date)
    const stat = statsMap.get(key)
    days.push({
      date: key,
      count: stat ? stat.newWords + stat.reviews : 0,
    })
  }

  return days
}

function buildReviewForecast(progressList: WordProgress[]): ReviewForecastDay[] {
  const today = new Date()

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + index)
    const dateKey = toDateKey(date)
    const count = progressList.filter((progress) => {
      if (index === 0) {
        return progress.nextReviewDate <= dateKey
      }
      return progress.nextReviewDate === dateKey
    }).length

    return {
      date: dateKey,
      label: index === 0 ? '今天' : index === 1 ? '明天' : `${date.getMonth() + 1}/${date.getDate()}`,
      count,
    }
  })
}

function countOverdueReviews(progressList: WordProgress[]): number {
  const todayKey = toDateKey(new Date())
  return progressList.filter((progress) => progress.nextReviewDate < todayKey).length
}

function buildCurrentStatusDistribution(progressList: WordProgress[]): number[] {
  const distribution = [0, 0, 0, 0]

  for (const progress of progressList) {
    const latestRecord = progress.history.at(-1)
    if (latestRecord && latestRecord.grade >= 0 && latestRecord.grade <= 3) {
      distribution[latestRecord.grade] += 1
    }
  }

  return distribution
}

function getRecentAccuracy(stats: DailyStats[], days: number): number {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days + 1)
  const cutoffKey = toDateKey(cutoffDate)
  const recentStats = stats.filter((stat) => stat.date >= cutoffKey)
  const totalCount = recentStats.reduce((sum, stat) => sum + stat.totalCount, 0)
  const correctCount = recentStats.reduce((sum, stat) => sum + stat.correctCount, 0)

  return totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
}

function getCurrentStreak(stats: DailyStats[]): number {
  const activeDates = new Set(
    stats
      .filter((stat) => stat.newWords + stat.reviews > 0)
      .map((stat) => stat.date),
  )
  let streak = 0
  const date = new Date()

  while (activeDates.has(toDateKey(date))) {
    streak += 1
    date.setDate(date.getDate() - 1)
  }

  return streak
}

function getLongestStreak(stats: DailyStats[]): number {
  const activeDates = stats
    .filter((stat) => stat.newWords + stat.reviews > 0)
    .map((stat) => stat.date)
    .sort()

  let longestStreak = 0
  let currentStreak = 0
  let previousDate: Date | null = null

  for (const dateKey of activeDates) {
    const currentDate = new Date(dateKey)
    if (previousDate && daysBetween(previousDate, currentDate) === 1) {
      currentStreak += 1
    } else {
      currentStreak = 1
    }

    longestStreak = Math.max(longestStreak, currentStreak)
    previousDate = currentDate
  }

  return longestStreak
}

function buildWeakWords(words: WordEntry[], progressList: WordProgress[]): WeakWord[] {
  const wordMap = new Map(words.map((word) => [word.id, word]))

  return progressList
    .map((progress) => {
      const word = wordMap.get(progress.wordId)
      const weakCount = getActiveWeakCount(progress)
      return word && weakCount > 0
        ? { word, progress, weakCount, totalReviews: progress.history.length }
        : null
    })
    .filter((item): item is WeakWord => item !== null)
    .sort((left, right) => {
      if (right.weakCount !== left.weakCount) return right.weakCount - left.weakCount
      return right.totalReviews - left.totalReviews
    })
    .slice(0, 10)
}

function buildForgottenWords(words: WordEntry[], progressList: WordProgress[]): ForgottenWord[] {
  const wordMap = new Map(words.map((word) => [word.id, word]))

  return progressList
    .map((progress) => {
      const word = wordMap.get(progress.wordId)
      const forgottenCount = progress.history.filter((record) => record.grade <= 1).length
      const latestGrade = progress.history.at(-1)?.grade ?? 3

      return word && forgottenCount > 0
        ? { word, forgottenCount, totalReviews: progress.history.length, latestGrade }
        : null
    })
    .filter((item): item is ForgottenWord => item !== null)
    .sort((left, right) => {
      if (right.forgottenCount !== left.forgottenCount) return right.forgottenCount - left.forgottenCount
      if (right.totalReviews !== left.totalReviews) return right.totalReviews - left.totalReviews
      return left.latestGrade - right.latestGrade
    })
    .slice(0, 10)
}

function buildRecentChangeSummary(stats: DailyStats[]): RecentChangeSummary {
  const currentStats = getStatsInRange(stats, 6, 0)
  const previousStats = getStatsInRange(stats, 13, 7)
  const currentAccuracy = calculateAccuracy(currentStats)
  const previousAccuracy = calculateAccuracy(previousStats)

  return {
    newWordsChange: sumStats(currentStats, 'newWords') - sumStats(previousStats, 'newWords'),
    reviewsChange: sumStats(currentStats, 'reviews') - sumStats(previousStats, 'reviews'),
    accuracyChange: currentAccuracy - previousAccuracy,
    currentAccuracy,
    previousAccuracy,
  }
}

function buildWeakTrend(progressList: WordProgress[]): WeakTrendDay[] {
  return Array.from({ length: 7 }, (_, dayOffset) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - dayOffset))
    const dateKey = toDateKey(date)
    let forgottenCount = 0
    let improvedCount = 0

    for (const progress of progressList) {
      for (let recordIndex = 0; recordIndex < progress.history.length; recordIndex++) {
        const record = progress.history[recordIndex]
        if (record.date !== dateKey) {
          continue
        }

        if (record.grade <= 1) {
          forgottenCount += 1
        }

        const previousRecord = progress.history[recordIndex - 1]
        if (previousRecord && previousRecord.grade <= 1 && record.grade >= 2) {
          improvedCount += 1
        }
      }
    }

    return {
      date: dateKey,
      label: dayOffset === 6 ? '今天' : `${date.getMonth() + 1}/${date.getDate()}`,
      forgottenCount,
      improvedCount,
    }
  })
}

function getStatsInRange(stats: DailyStats[], startDaysAgo: number, endDaysAgo: number): DailyStats[] {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - startDaysAgo)
  const endDate = new Date()
  endDate.setDate(endDate.getDate() - endDaysAgo)
  const startKey = toDateKey(startDate)
  const endKey = toDateKey(endDate)

  return stats.filter((stat) => stat.date >= startKey && stat.date <= endKey)
}

function sumStats(stats: DailyStats[], key: 'newWords' | 'reviews'): number {
  return stats.reduce((sum, stat) => sum + stat[key], 0)
}

function calculateAccuracy(stats: DailyStats[]): number {
  const totalCount = stats.reduce((sum, stat) => sum + stat.totalCount, 0)
  const correctCount = stats.reduce((sum, stat) => sum + stat.correctCount, 0)
  return totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
}

function formatSignedNumber(value: number): string {
  if (value > 0) {
    return `+${value}`
  }

  return String(value)
}

function getActiveWeakCount(progress: WordProgress): number {
  if (hasRecentTwoCorrectReviews(progress)) {
    return 0
  }

  return progress.history.filter((record) => record.grade <= 1).length
}

function hasRecentTwoCorrectReviews(progress: WordProgress): boolean {
  const recentReviews = progress.history.slice(-2)
  return recentReviews.length === 2 && recentReviews.every((record) => record.grade >= 2)
}

function getForecastBarWidth(count: number, forecast: ReviewForecastDay[]): number {
  const maxCount = Math.max(...forecast.map((day) => day.count), 1)
  return Math.max((count / maxCount) * 100, count > 0 ? 8 : 0)
}

function daysBetween(left: Date, right: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const leftDate = new Date(left.getFullYear(), left.getMonth(), left.getDate())
  const rightDate = new Date(right.getFullYear(), right.getMonth(), right.getDate())
  return Math.round((rightDate.getTime() - leftDate.getTime()) / millisecondsPerDay)
}

function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getHeatColor(count: number): string {
  if (count === 0) return '#ebedf0'
  if (count <= 2) return '#9be9a8'
  if (count <= 5) return '#40c463'
  if (count <= 10) return '#30a14e'
  return '#216e39'
}

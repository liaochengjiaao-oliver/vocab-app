import { useState, useEffect } from 'react'
import type { IDBPDatabase } from 'idb'
import type { WordDB } from '../db'
import { getTodayStats, getRecentStats } from '../db/stats'
import { getAllProgress } from '../db/progress'
import { getAllWords } from '../db/words'
import type { DailyStats } from '../db/types'
import styles from './Stats.module.css'

interface StatsProps {
  db: IDBPDatabase<WordDB>
  onBack: () => void
}

export function Stats({ db, onBack }: StatsProps) {
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null)
  const [recentStats, setRecentStats] = useState<DailyStats[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [learnedCount, setLearnedCount] = useState(0)

  useEffect(() => {
    async function load() {
      const today = await getTodayStats(db)
      setTodayStats(today)
      const recent = await getRecentStats(db, 30)
      setRecentStats(recent)
      const allWords = await getAllWords(db)
      setTotalCount(allWords.length)
      const progress = await getAllProgress(db)
      setLearnedCount(progress.length)
    }
    load()
  }, [db])

  const heatmapData = buildHeatmap(recentStats)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backArrow} onClick={onBack}>←</button>
        <h1 className={styles.title}>学习统计</h1>
      </div>

      <div className={styles.overview}>
        <div className={styles.overviewItem}>
          <span className={styles.overviewNumber}>{learnedCount}</span>
          <span className={styles.overviewLabel}>已学 / {totalCount} 词</span>
        </div>
        <div className={styles.overviewItem}>
          <span className={styles.overviewNumber}>{todayStats?.newWords ?? 0}</span>
          <span className={styles.overviewLabel}>今日新学</span>
        </div>
        <div className={styles.overviewItem}>
          <span className={styles.overviewNumber}>{todayStats?.reviews ?? 0}</span>
          <span className={styles.overviewLabel}>今日复习</span>
        </div>
      </div>

      <div className={styles.heatmapSection}>
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
          {[0, 1, 3, 5, 10].map((n) => (
            <div
              key={n}
              className={styles.legendCell}
              style={{ backgroundColor: getHeatColor(n) }}
            />
          ))}
          <span>多</span>
        </div>
      </div>
    </div>
  )
}

interface HeatmapDay {
  date: string
  count: number
}

function buildHeatmap(stats: DailyStats[]): HeatmapDay[] {
  const statsMap = new Map(stats.map((s) => [s.date, s]))
  const days: HeatmapDay[] = []

  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const key = date.toISOString().split('T')[0]
    const stat = statsMap.get(key)
    days.push({
      date: key,
      count: stat ? stat.newWords + stat.reviews : 0,
    })
  }

  return days
}

function getHeatColor(count: number): string {
  if (count === 0) return '#ebedf0'
  if (count <= 2) return '#9be9a8'
  if (count <= 5) return '#40c463'
  if (count <= 10) return '#30a14e'
  return '#216e39'
}

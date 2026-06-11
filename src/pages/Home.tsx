import { useState, useEffect } from 'react'
import type { IDBPDatabase } from 'idb'
import type { WordDB } from '../db'
import { getUnlearnedWords } from '../db/words'
import { getDueWords } from '../db/progress'
import { getTodayStats } from '../db/stats'
import type { DailyStats } from '../db/types'
import styles from './Home.module.css'

interface HomeProps {
  db: IDBPDatabase<WordDB>
  onNavigate: (page: string) => void
}

export function Home({ db, onNavigate }: HomeProps) {
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [dueCount, setDueCount] = useState(0)
  const [unlearnedCount, setUnlearnedCount] = useState(0)

  useEffect(() => {
    async function load() {
      const todayStats = await getTodayStats(db)
      setStats(todayStats)
      const due = await getDueWords(db)
      setDueCount(due.length)
      const unlearned = await getUnlearnedWords(db, 999)
      setUnlearnedCount(unlearned.length)
    }
    load()
  }, [db])

  const accuracy = stats && stats.totalCount > 0
    ? Math.round((stats.correctCount / stats.totalCount) * 100)
    : 0

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>今日概览</h1>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{stats?.newWords ?? 0}</span>
          <span className={styles.statLabel}>新学单词</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{stats?.reviews ?? 0}</span>
          <span className={styles.statLabel}>今日复习</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{accuracy}%</span>
          <span className={styles.statLabel}>正确率</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{dueCount}</span>
          <span className={styles.statLabel}>待复习</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={() => onNavigate('learn')}>
          学习新词
        </button>
        <button
          className={styles.secondaryBtn}
          onClick={() => onNavigate('review')}
          disabled={dueCount === 0}
        >
          复习 ({dueCount} 词)
        </button>
        <button className={styles.ghostBtn} onClick={() => onNavigate('stats')}>
          查看统计
        </button>
      </div>

      <p className={styles.hint}>
        还有 {unlearnedCount} 个词未学习
      </p>
    </div>
  )
}

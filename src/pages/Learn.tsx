import { useState, useEffect, useCallback } from 'react'
import type { IDBPDatabase } from 'idb'
import type { WordDB } from '../db'
import type { WordEntry } from '../data/words'
import { getUnlearnedWords } from '../db/words'
import { getProgress, saveProgress } from '../db/progress'
import { recordNewWord, recordReview, getTodayStats } from '../db/stats'
import { createInitialProgress, applyGrade } from '../lib/sm2'
import type { Grade } from '../db/types'
import { FlashCard } from '../components/FlashCard'
import { FilterPanel } from '../components/FilterPanel'
import styles from './Learn.module.css'

interface LearnProps {
  db: IDBPDatabase<WordDB>
  onBack: () => void
}

const DAILY_LIMIT = 50

export function Learn({ db, onBack }: LearnProps) {
  const [words, setWords] = useState<WordEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [learnedCount, setLearnedCount] = useState(0)
  const [sessionGradeCounts, setSessionGradeCounts] = useState([0, 0, 0, 0])
  const [done, setDone] = useState(false)
  const [started, setStarted] = useState(false)
  const [filterTag, setFilterTag] = useState<WordEntry['tag'] | 'all'>('all')
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all')
  const [todayNewWords, setTodayNewWords] = useState(0)

  useEffect(() => {
    async function load() {
      const filter: { tag?: WordEntry['tag']; level?: number } = {}
      if (filterTag !== 'all') filter.tag = filterTag
      if (filterLevel !== 'all') filter.level = filterLevel

      const todayStats = await getTodayStats(db)
      const remainingGoalCount = Math.max(DAILY_LIMIT - todayStats.newWords, 0)
      const unlearned = remainingGoalCount > 0
        ? await getUnlearnedWords(db, remainingGoalCount, filter)
        : []

      setTodayNewWords(todayStats.newWords)
      setWords(unlearned)
      setCurrentIndex(0)
      setLearnedCount(0)
      setSessionGradeCounts([0, 0, 0, 0])
      setDone(false)
    }
    if (!started) load()
  }, [db, filterTag, filterLevel, started])

  const handleGrade = useCallback(async (grade: number) => {
    const word = words[currentIndex]
    if (!word) return

    let progress = await getProgress(db, word.id)
    if (!progress) {
      progress = createInitialProgress(word.id)
      await recordNewWord(db)
    }
    await recordReview(db, grade)

    const updated = applyGrade(progress, grade as Grade)
    await saveProgress(db, updated)

    setLearnedCount((c) => c + 1)
    setSessionGradeCounts((counts) => getNextGradeCounts(counts, grade))
    setStarted(true)

    if (currentIndex + 1 >= words.length) {
      setDone(true)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }, [db, words, currentIndex])

  const currentTodayNewWords = todayNewWords + learnedCount
  const remainingGoalCount = Math.max(DAILY_LIMIT - currentTodayNewWords, 0)
  const targetCompleted = remainingGoalCount === 0

  if (done) {
    return (
      <div className={styles.container}>
        <div className={styles.done}>
          <h2>{targetCompleted ? '今日新学目标完成' : '今日学习完成'}</h2>
          <p>{targetCompleted ? `今天已新学 ${currentTodayNewWords} 个词，可以去复习或休息一下。` : `已学习 ${learnedCount} 个新词，今日还需新学 ${remainingGoalCount} 个。`}</p>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${Math.min(100, Math.round((currentTodayNewWords / DAILY_LIMIT) * 100))}%` }} />
          </div>
          <p className={styles.progressText}>{currentTodayNewWords}/{DAILY_LIMIT}</p>
          <div className={styles.sessionSummary}>
            {[
              { label: '忘了', count: sessionGradeCounts[0] },
              { label: '模糊', count: sessionGradeCounts[1] },
              { label: '想起', count: sessionGradeCounts[2] },
              { label: '熟练', count: sessionGradeCounts[3] },
            ].map((item) => (
              <div key={item.label} className={styles.summaryItem}>
                <span className={styles.summaryValue}>{item.count}</span>
                <span className={styles.summaryLabel}>{item.label}</span>
              </div>
            ))}
          </div>
          <button className={styles.backBtn} onClick={onBack}>返回首页</button>
        </div>
      </div>
    )
  }

  if (words.length === 0 && !started) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backArrow} onClick={onBack}>←</button>
          <span className={styles.title}>学习新词</span>
        </div>
        <FilterPanel
          selectedTag={filterTag}
          selectedLevel={filterLevel}
          onTagChange={setFilterTag}
          onLevelChange={setFilterLevel}
        />
        <div className={styles.done}>
          <h2>{targetCompleted ? '今日新学目标已完成' : '暂无新词可学'}</h2>
          <p>{targetCompleted ? `今天已新学 ${currentTodayNewWords} 个词，建议去复习或休息一下。` : '当前筛选条件下的词都已学习过'}</p>
          <button className={styles.backBtn} onClick={onBack}>返回首页</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backArrow} onClick={onBack}>←</button>
        <span className={styles.progress}>
          {currentIndex + 1} / {words.length}
        </span>
      </div>
      <div className={styles.goalBanner}>
        <span>{targetCompleted ? '今日新学目标已完成' : `今日还需新学 ${remainingGoalCount} 个`}</span>
        <strong>{currentTodayNewWords}/{DAILY_LIMIT}</strong>
      </div>
      <div className={!started ? undefined : styles.filterHidden}>
        <FilterPanel
          selectedTag={filterTag}
          selectedLevel={filterLevel}
          onTagChange={setFilterTag}
          onLevelChange={setFilterLevel}
        />
      </div>
      <FlashCard key={words[currentIndex].id} word={words[currentIndex]} onGrade={handleGrade} />
    </div>
  )
}

function getNextGradeCounts(counts: number[], grade: number): number[] {
  if (grade < 0 || grade > 3) {
    return counts
  }

  return counts.map((count, index) => index === grade ? count + 1 : count)
}

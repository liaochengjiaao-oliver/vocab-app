import { useState, useEffect, useCallback } from 'react'
import type { IDBPDatabase } from 'idb'
import type { WordDB } from '../db'
import type { WordEntry } from '../data/words'
import { getFilteredWords } from '../db/words'
import { getDueWords, getProgress, saveProgress } from '../db/progress'
import { recordReview } from '../db/stats'
import { applyGrade } from '../lib/sm2'
import type { Grade } from '../db/types'
import { FlashCard } from '../components/FlashCard'
import { FilterPanel } from '../components/FilterPanel'
import styles from './Learn.module.css'

interface ReviewProps {
  db: IDBPDatabase<WordDB>
  onBack: () => void
}

export function Review({ db, onBack }: ReviewProps) {
  const [words, setWords] = useState<WordEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [done, setDone] = useState(false)
  const [started, setStarted] = useState(false)
  const [filterTag, setFilterTag] = useState<WordEntry['tag'] | 'all'>('all')
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all')

  useEffect(() => {
    async function load() {
      const dueIds = await getDueWords(db)
      if (dueIds.length === 0) {
        setWords([])
        return
      }
      const filter: { tag?: WordEntry['tag']; level?: number } = {}
      if (filterTag !== 'all') filter.tag = filterTag
      if (filterLevel !== 'all') filter.level = filterLevel
      const filtered = await getFilteredWords(db, filter)
      const dueWords = filtered.filter((w) => dueIds.includes(w.id))
      setWords(dueWords)
      setCurrentIndex(0)
      setReviewedCount(0)
      setDone(false)
    }
    if (!started) load()
  }, [db, filterTag, filterLevel, started])

  const handleGrade = useCallback(async (grade: number) => {
    const word = words[currentIndex]
    if (!word) return

    const progress = await getProgress(db, word.id)
    if (!progress) return

    await recordReview(db, grade)
    const updated = applyGrade(progress, grade as Grade)
    await saveProgress(db, updated)

    setReviewedCount((c) => c + 1)
    setStarted(true)

    if (currentIndex + 1 >= words.length) {
      setDone(true)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }, [db, words, currentIndex])

  if (done) {
    return (
      <div className={styles.container}>
        <div className={styles.done}>
          <h2>复习完成</h2>
          <p>已复习 {reviewedCount} 个词</p>
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
          <span className={styles.title}>复习</span>
        </div>
        <FilterPanel
          selectedTag={filterTag}
          selectedLevel={filterLevel}
          onTagChange={setFilterTag}
          onLevelChange={setFilterLevel}
        />
        <div className={styles.done}>
          <h2>暂无待复习的词</h2>
          <p>当前筛选条件下没有到期的词</p>
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
          复习 {currentIndex + 1} / {words.length}
        </span>
      </div>
      {!started && (
        <FilterPanel
          selectedTag={filterTag}
          selectedLevel={filterLevel}
          onTagChange={setFilterTag}
          onLevelChange={setFilterLevel}
        />
      )}
      <FlashCard word={words[currentIndex]} onGrade={handleGrade} />
    </div>
  )
}

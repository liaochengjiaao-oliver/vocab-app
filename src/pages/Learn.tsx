import { useState, useEffect, useCallback } from 'react'
import type { IDBPDatabase } from 'idb'
import type { WordDB } from '../db'
import type { WordEntry } from '../data/words'
import { getUnlearnedWords } from '../db/words'
import { getProgress, saveProgress } from '../db/progress'
import { recordNewWord, recordReview } from '../db/stats'
import { createInitialProgress, applyGrade } from '../lib/sm2'
import type { Grade } from '../db/types'
import { FlashCard } from '../components/FlashCard'
import { FilterPanel } from '../components/FilterPanel'
import styles from './Learn.module.css'

interface LearnProps {
  db: IDBPDatabase<WordDB>
  onBack: () => void
}

const DAILY_LIMIT = 10

export function Learn({ db, onBack }: LearnProps) {
  const [words, setWords] = useState<WordEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [learnedCount, setLearnedCount] = useState(0)
  const [done, setDone] = useState(false)
  const [started, setStarted] = useState(false)
  const [filterTag, setFilterTag] = useState<WordEntry['tag'] | 'all'>('all')
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all')

  useEffect(() => {
    async function load() {
      const filter: { tag?: WordEntry['tag']; level?: number } = {}
      if (filterTag !== 'all') filter.tag = filterTag
      if (filterLevel !== 'all') filter.level = filterLevel
      const unlearned = await getUnlearnedWords(db, DAILY_LIMIT, filter)
      setWords(unlearned)
      setCurrentIndex(0)
      setLearnedCount(0)
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
          <h2>今日学习完成</h2>
          <p>已学习 {learnedCount} 个新词</p>
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
          <h2>暂无新词可学</h2>
          <p>当前筛选条件下的词都已学习过</p>
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

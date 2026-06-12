import { useState, useEffect, useCallback } from 'react'
import type { IDBPDatabase } from 'idb'
import type { WordDB } from '../db'
import type { WordEntry } from '../data/words'
import { getFilteredWords } from '../db/words'
import { getDueWords, getProgress, getAllProgress, saveProgress } from '../db/progress'
import { recordReview } from '../db/stats'
import { applyGrade } from '../lib/sm2'
import type { Grade } from '../db/types'
import { FlashCard } from '../components/FlashCard'
import { FilterPanel } from '../components/FilterPanel'
import styles from './Learn.module.css'

interface ReviewProps {
  db: IDBPDatabase<WordDB>
  onBack: () => void
  weakOnly?: boolean
}

export function Review({ db, onBack, weakOnly = false }: ReviewProps) {
  const [words, setWords] = useState<WordEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [sessionGradeCounts, setSessionGradeCounts] = useState([0, 0, 0, 0])
  const [done, setDone] = useState(false)
  const [started, setStarted] = useState(false)
  const [filterTag, setFilterTag] = useState<WordEntry['tag'] | 'all'>('all')
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all')
  const [updateReviewPlan, setUpdateReviewPlan] = useState(false)

  useEffect(() => {
    async function load() {
      const filter: { tag?: WordEntry['tag']; level?: number } = {}
      if (filterTag !== 'all') filter.tag = filterTag
      if (filterLevel !== 'all') filter.level = filterLevel

      const filtered = await getFilteredWords(db, filter)

      if (weakOnly) {
        const progressList = await getAllProgress(db)
        const weakScoreByWordId = new Map(
          progressList
            .map((progress) => [progress.wordId, getActiveWeakCount(progress)] as const)
            .filter(([, weakCount]) => weakCount > 0),
        )

        const weakWords = filtered
          .filter((word) => weakScoreByWordId.has(word.id))
          .sort((left, right) => {
            const rightWeakScore = weakScoreByWordId.get(right.id) ?? 0
            const leftWeakScore = weakScoreByWordId.get(left.id) ?? 0
            return rightWeakScore - leftWeakScore
          })
          .slice(0, 20)

        setWords(weakWords)
        setCurrentIndex(0)
        setReviewedCount(0)
        setSessionGradeCounts([0, 0, 0, 0])
        setDone(false)
        return
      }

      const dueIds = await getDueWords(db)
      if (dueIds.length === 0) {
        setWords([])
        return
      }

      const dueWords = filtered.filter((word) => dueIds.includes(word.id))
      setWords(dueWords)
      setCurrentIndex(0)
      setReviewedCount(0)
      setSessionGradeCounts([0, 0, 0, 0])
      setDone(false)
    }

    if (!started) load()
  }, [db, filterTag, filterLevel, started, weakOnly])

  const handleGrade = useCallback(async (grade: number) => {
    const word = words[currentIndex]
    if (!word) return

    const progress = await getProgress(db, word.id)
    if (!progress) return

    if (!weakOnly || updateReviewPlan) {
      await recordReview(db, grade)
      const updated = applyGrade(progress, grade as Grade)
      await saveProgress(db, updated)
    }

    setReviewedCount((c) => c + 1)
    setSessionGradeCounts((counts) => getNextGradeCounts(counts, grade))
    setStarted(true)

    if (currentIndex + 1 >= words.length) {
      setDone(true)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }, [db, words, currentIndex, weakOnly, updateReviewPlan])

  if (done) {
    return (
      <div className={styles.container}>
        <div className={styles.done}>
          <h2>{weakOnly ? '薄弱词训练完成' : '复习完成'}</h2>
          <p>{weakOnly && !updateReviewPlan ? `已训练 ${reviewedCount} 个词，本次未改动正常复习计划。` : `已复习 ${reviewedCount} 个词，掌握状态已同步更新。`}</p>
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
          <span className={styles.title}>{weakOnly ? '薄弱词专项复习' : '复习'}</span>
        </div>
        <FilterPanel
          selectedTag={filterTag}
          selectedLevel={filterLevel}
          onTagChange={setFilterTag}
          onLevelChange={setFilterLevel}
        />
        <div className={styles.done}>
          <h2>{weakOnly ? '暂无薄弱词' : '暂无待复习的词'}</h2>
          <p>{weakOnly ? '当前筛选条件下没有薄弱词' : '当前筛选条件下没有到期的词'}</p>
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
          {weakOnly ? `薄弱词 ${currentIndex + 1} / ${words.length}` : `复习 ${currentIndex + 1} / ${words.length}`}
        </span>
      </div>
      {weakOnly && !started && (
        <div className={styles.modeCard}>
          <div>
            <h3 className={styles.modeTitle}>专项训练模式</h3>
            <p className={styles.modeDesc}>
              默认只训练薄弱词，不改动正常复习计划；开启后会正式更新复习间隔和统计。
            </p>
          </div>
          <label className={styles.modeToggle}>
            <input
              type="checkbox"
              checked={updateReviewPlan}
              onChange={(event) => setUpdateReviewPlan(event.target.checked)}
            />
            <span>正式更新复习计划</span>
          </label>
        </div>
      )}
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

function getActiveWeakCount(progress: { history: { grade: number }[] }): number {
  if (hasRecentTwoCorrectReviews(progress)) {
    return 0
  }

  return progress.history.filter((record) => record.grade <= 1).length
}

function hasRecentTwoCorrectReviews(progress: { history: { grade: number }[] }): boolean {
  const recentReviews = progress.history.slice(-2)
  return recentReviews.length === 2 && recentReviews.every((record) => record.grade >= 2)
}

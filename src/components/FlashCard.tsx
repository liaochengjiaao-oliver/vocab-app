import { useCallback, useEffect, useRef, useState } from 'react'
import type { WordEntry } from '../data/words'
import styles from './FlashCard.module.css'
import { TagBadge } from './TagBadge'

interface FlashCardProps {
  word: WordEntry
  onGrade: (grade: number) => void
}

export function FlashCard({ word, onGrade }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false)
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null)
  const shortcutTimerRef = useRef<number | null>(null)

  const highlightShortcut = useCallback((shortcut: string) => {
    setActiveShortcut(shortcut)

    if (shortcutTimerRef.current !== null) {
      window.clearTimeout(shortcutTimerRef.current)
    }

    shortcutTimerRef.current = window.setTimeout(() => {
      setActiveShortcut(null)
      shortcutTimerRef.current = null
    }, 180)
  }, [])

  const handleGradeSelection = useCallback((grade: number, shortcut: string) => {
    highlightShortcut(shortcut)

    window.setTimeout(() => {
      onGrade(grade)
      setFlipped(false)
    }, 120)
  }, [highlightShortcut, onGrade])

  useEffect(() => {
    return () => {
      if (shortcutTimerRef.current !== null) {
        window.clearTimeout(shortcutTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      if (isTyping) return

      if (event.code === 'Space') {
        event.preventDefault()
        highlightShortcut('space')
        setFlipped((prev) => !prev)
        return
      }

      const grade = Number(event.key) - 1
      if (flipped && grade >= 0 && grade <= 3) {
        event.preventDefault()
        handleGradeSelection(grade, event.key)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flipped, handleGradeSelection, highlightShortcut])

  return (
    <div className={styles.container}>
      <div
        className={styles.card}
        onClick={() => setFlipped((prev) => !prev)}
      >
        {!flipped ? (
          <div className={`${styles.cardFace} ${styles.front}`}>
            <TagBadge tag={word.tag} />
            <h2 className={styles.word}>{word.word}</h2>
            <p className={styles.ipa}>{word.ipa}</p>
            <p className={styles.hint}>点击或按空格翻转</p>
          </div>
        ) : (
          <div className={`${styles.cardFace} ${styles.back}`}>
            <TagBadge tag={word.tag} />
            <h2 className={styles.word}>{word.word}</h2>
            <p className={styles.meaning}>{word.meaning}</p>
            <div className={styles.example}>
              <p className={styles.exampleEn}>{word.example}</p>
              <p className={styles.exampleZh}>{word.exampleZh}</p>
            </div>
          </div>
        )}
      </div>

      {flipped && (
        <div className={styles.buttons}>
          <button className={`${styles.btn} ${styles.btn0} ${activeShortcut === '1' ? styles.shortcutActive : ''}`} onClick={(event) => { event.stopPropagation(); handleGradeSelection(0, '1') }}>
            <kbd className={styles.buttonKey}>1</kbd> 忘了
          </button>
          <button className={`${styles.btn} ${styles.btn1} ${activeShortcut === '2' ? styles.shortcutActive : ''}`} onClick={(event) => { event.stopPropagation(); handleGradeSelection(1, '2') }}>
            <kbd className={styles.buttonKey}>2</kbd> 模糊
          </button>
          <button className={`${styles.btn} ${styles.btn2} ${activeShortcut === '3' ? styles.shortcutActive : ''}`} onClick={(event) => { event.stopPropagation(); handleGradeSelection(2, '3') }}>
            <kbd className={styles.buttonKey}>3</kbd> 想起
          </button>
          <button className={`${styles.btn} ${styles.btn3} ${activeShortcut === '4' ? styles.shortcutActive : ''}`} onClick={(event) => { event.stopPropagation(); handleGradeSelection(3, '4') }}>
            <kbd className={styles.buttonKey}>4</kbd> 熟练
          </button>
        </div>
      )}

      <div className={styles.shortcutGuide}>
        <span className={activeShortcut === 'space' ? styles.shortcutActivePill : undefined}>
          <kbd>Space</kbd> 翻面
        </span>
        <span>
          <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> 评分
        </span>
      </div>
    </div>
  )
}

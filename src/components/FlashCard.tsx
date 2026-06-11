import { useState } from 'react'
import type { WordEntry } from '../data/words'
import styles from './FlashCard.module.css'
import { TagBadge } from './TagBadge'

interface FlashCardProps {
  word: WordEntry
  onGrade: (grade: number) => void
}

export function FlashCard({ word, onGrade }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false)

  function handleFlip() {
    setFlipped(!flipped)
  }

  function handleReset() {
    setFlipped(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.card} onClick={handleFlip}>
        <div className={`${styles.cardInner} ${flipped ? styles.flipped : ''}`}>
          <div className={styles.front}>
            <TagBadge tag={word.tag} />
            <h2 className={styles.word}>{word.word}</h2>
            <p className={styles.ipa}>{word.ipa}</p>
            <p className={styles.hint}>点击翻转</p>
          </div>
          <div className={styles.back}>
            <TagBadge tag={word.tag} />
            <h2 className={styles.word}>{word.word}</h2>
            <p className={styles.meaning}>{word.meaning}</p>
            <div className={styles.example}>
              <p className={styles.exampleEn}>{word.example}</p>
              <p className={styles.exampleZh}>{word.exampleZh}</p>
            </div>
          </div>
        </div>
      </div>

      {flipped && (
        <div className={styles.buttons}>
          <button className={`${styles.btn} ${styles.btn0}`} onClick={() => { onGrade(0); handleReset() }}>
            忘了
          </button>
          <button className={`${styles.btn} ${styles.btn1}`} onClick={() => { onGrade(1); handleReset() }}>
            模糊
          </button>
          <button className={`${styles.btn} ${styles.btn2}`} onClick={() => { onGrade(2); handleReset() }}>
            想起
          </button>
          <button className={`${styles.btn} ${styles.btn3}`} onClick={() => { onGrade(3); handleReset() }}>
            熟练
          </button>
        </div>
      )}
    </div>
  )
}

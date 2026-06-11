import type { WordEntry } from '../data/words'
import styles from './FilterPanel.module.css'

interface FilterPanelProps {
  selectedTag: WordEntry['tag'] | 'all'
  selectedLevel: number | 'all'
  onTagChange: (tag: WordEntry['tag'] | 'all') => void
  onLevelChange: (level: number | 'all') => void
}

const TAG_OPTIONS: { value: WordEntry['tag'] | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'daily', label: '日常' },
  { value: 'phrase', label: '短语' },
  { value: 'slang', label: '俚语' },
  { value: 'idiom', label: '习语' },
  { value: 'internet', label: '网络' },
]

const LEVEL_OPTIONS: { value: number | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 1, label: '基础' },
  { value: 2, label: '进阶' },
  { value: 3, label: '挑战' },
]

export function FilterPanel({ selectedTag, selectedLevel, onTagChange, onLevelChange }: FilterPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <span className={styles.label}>分类</span>
        <div className={styles.options}>
          {TAG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.chip} ${selectedTag === opt.value ? styles.active : ''}`}
              onClick={() => onTagChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>难度</span>
        <div className={styles.options}>
          {LEVEL_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              className={`${styles.chip} ${selectedLevel === opt.value ? styles.active : ''}`}
              onClick={() => onLevelChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

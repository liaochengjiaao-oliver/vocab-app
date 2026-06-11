import type { WordEntry } from '../data/words'
import styles from './TagBadge.module.css'

const TAG_LABELS: Record<WordEntry['tag'], string> = {
  daily: '日常',
  phrase: '短语',
  slang: '俚语',
  idiom: '习语',
  internet: '网络用语',
}

const TAG_COLORS: Record<WordEntry['tag'], string> = {
  daily: '#667eea',
  phrase: '#f59e0b',
  slang: '#ec4899',
  idiom: '#10b981',
  internet: '#8b5cf6',
}

interface TagBadgeProps {
  tag: WordEntry['tag']
}

export function TagBadge({ tag }: TagBadgeProps) {
  return (
    <span className={styles.badge} style={{ backgroundColor: TAG_COLORS[tag] }}>
      {TAG_LABELS[tag]}
    </span>
  )
}

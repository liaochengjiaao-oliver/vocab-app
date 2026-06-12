import { useState, useEffect, useRef } from 'react'
import type { IDBPDatabase } from 'idb'
import type { WordDB } from '../db'
import { getUnlearnedWords, importCustomWords, getAllWords } from '../db/words'
import { getDueWords, getAllProgress } from '../db/progress'
import { getTodayStats, getConsecutiveStudyDays } from '../db/stats'
import type { DailyStats } from '../db/types'
import type { WordEntry } from '../data/words'
import { parseCSVWithIssues, parseJSONWithIssues, type ImportParseIssue } from '../lib/importParser'
import styles from './Home.module.css'

interface HomeProps {
  db: IDBPDatabase<WordDB>
  onNavigate: (page: string) => void
}

interface ImportPreview {
  fileName: string
  words: WordEntry[]
  issues: ImportParseIssue[]
  duplicateCount: number
  importableCount: number
  sampleWords: WordEntry[]
}

const DAILY_NEW_WORD_GOAL = 50

export function Home({ db, onNavigate }: HomeProps) {
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [dueCount, setDueCount] = useState(0)
  const [weakCount, setWeakCount] = useState(0)
  const [unlearnedCount, setUnlearnedCount] = useState(0)
  const [consecutiveDays, setConsecutiveDays] = useState(0)
  const [dailyGoal, setDailyGoal] = useState(DAILY_NEW_WORD_GOAL)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)

  useEffect(() => {
    async function load() {
      const todayStats = await getTodayStats(db)
      setStats(todayStats)
      const due = await getDueWords(db)
      setDueCount(due.length)
      const progressList = await getAllProgress(db)
      setWeakCount(progressList.filter((progress) => getActiveWeakCount(progress) > 0).length)
      const unlearned = await getUnlearnedWords(db, 9999)
      setUnlearnedCount(unlearned.length)
      const consecutive = await getConsecutiveStudyDays(db)
      setConsecutiveDays(consecutive)
    }
    load()
  }, [db])

  const accuracy = stats && stats.totalCount > 0
    ? Math.round((stats.correctCount / stats.totalCount) * 100)
    : 0
  const todayNewWords = stats?.newWords ?? 0
  const newWordProgress = Math.min(100, Math.round((todayNewWords / dailyGoal) * 100))
  const reviewGoalFinished = dueCount === 0
  const dailyGoalFinished = todayNewWords >= dailyGoal && reviewGoalFinished
  const recommendation = getRecommendation(dueCount, weakCount, unlearnedCount)
  const showWeakAlert = weakCount >= 20

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportResult(null)
    setImportPreview(null)

    const text = await file.text()

    try {
      const parseResult = file.name.endsWith('.csv')
        ? parseCSVWithIssues(text)
        : file.name.endsWith('.json')
          ? parseJSONWithIssues(text)
          : null

      if (!parseResult) {
        setImportResult('不支持的文件格式，请使用 .csv 或 .json 文件')
        return
      }

      const existingWords = await getAllWords(db)
      setImportPreview(buildImportPreview(file.name, parseResult.words, parseResult.issues, existingWords))
    } catch (error) {
      setImportResult(`解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      event.target.value = ''
    }
  }

  const handleConfirmImport = async () => {
    if (!importPreview) return

    if (importPreview.importableCount === 0) {
      setImportResult('没有可导入的新单词，请检查重复项或错误行')
      return
    }

    const result = await importCustomWords(db, importPreview.words)
    const unlearned = await getUnlearnedWords(db, 9999)
    setUnlearnedCount(unlearned.length)
    setImportResult(`成功导入 ${result.added} 个单词，跳过 ${result.skipped} 个重复单词`)
    setImportPreview(null)
  }

  const handleCancelImport = () => {
    setImportPreview(null)
  }

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
          <span className={styles.statNumber}>{consecutiveDays}</span>
          <span className={styles.statLabel}>连续学习天数</span>
        </div>
      </div>

      <div className={styles.goalCard}>
        <div className={styles.goalHeader}>
          <div>
            <p className={styles.goalLabel}>今日目标</p>
            <h2 className={styles.goalTitle}>{dailyGoalFinished ? '今天目标已完成' : `新学 ${dailyGoal} 个，复习清零`}</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min="10"
              max="100"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Math.max(10, Math.min(100, parseInt(e.target.value) || 50)))}
              className={styles.goalInput}
              style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #eef0f4', fontSize: '0.9rem' }}
            />
            <span className={dailyGoalFinished ? styles.goalBadgeDone : styles.goalBadgeTodo}>
              {dailyGoalFinished ? '已完成' : '进行中'}
            </span>
          </div>
        </div>
        <div className={styles.goalProgressTrack}>
          <div className={styles.goalProgressFill} style={{ width: `${newWordProgress}%` }} />
        </div>
        <div className={styles.goalItems}>
          <div className={styles.goalItem}>
            <span className={styles.goalValue}>{todayNewWords}/{DAILY_NEW_WORD_GOAL}</span>
            <span className={styles.goalText}>今日新学</span>
          </div>
          <div className={styles.goalItem}>
            <span className={styles.goalValue}>{dueCount}</span>
            <span className={styles.goalText}>待复习</span>
          </div>
          <div className={styles.goalItem}>
            <span className={styles.goalValue}>{newWordProgress}%</span>
            <span className={styles.goalText}>新学进度</span>
          </div>
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
        <button className={styles.ghostBtn} onClick={handleImportClick}>
          导入词库
        </button>
      </div>

      {showWeakAlert && (
        <div className={styles.weakAlert}>
          <p className={styles.weakAlertText}>⚠️ 你有 {weakCount} 个薄弱词需要重点复习！</p>
          <button className={styles.weakAlertBtn} onClick={() => onNavigate('weakReview')}>
            立即专项复习
          </button>
        </div>
      )}

      {importResult && (
        <p className={styles.importResult}>{importResult}</p>
      )}

      {importPreview && (
        <div className={styles.importPreview}>
          <div className={styles.importPreviewHeader}>
            <div>
              <p className={styles.importPreviewLabel}>导入预览</p>
              <h2 className={styles.importPreviewTitle}>{importPreview.fileName}</h2>
            </div>
            <button className={styles.importCancelBtn} onClick={handleCancelImport}>
              取消
            </button>
          </div>

          <div className={styles.importSummaryGrid}>
            <div className={styles.importSummaryItem}>
              <span className={styles.importSummaryValue}>{importPreview.words.length}</span>
              <span className={styles.importSummaryLabel}>有效行</span>
            </div>
            <div className={styles.importSummaryItem}>
              <span className={styles.importSummaryValue}>{importPreview.importableCount}</span>
              <span className={styles.importSummaryLabel}>可导入</span>
            </div>
            <div className={styles.importSummaryItem}>
              <span className={styles.importSummaryValue}>{importPreview.duplicateCount}</span>
              <span className={styles.importSummaryLabel}>重复</span>
            </div>
            <div className={styles.importSummaryItem}>
              <span className={styles.importSummaryValue}>{importPreview.issues.length}</span>
              <span className={styles.importSummaryLabel}>错误行</span>
            </div>
          </div>

          {importPreview.sampleWords.length > 0 && (
            <div className={styles.importSection}>
              <p className={styles.importSectionTitle}>样例单词</p>
              <div className={styles.importSampleList}>
                {importPreview.sampleWords.map((word) => (
                  <span className={styles.importSampleWord} key={`${word.id}-${word.word}`}>
                    {word.word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {importPreview.issues.length > 0 && (
            <div className={styles.importSection}>
              <p className={styles.importSectionTitle}>错误行提示</p>
              <ul className={styles.importIssueList}>
                {importPreview.issues.slice(0, 6).map((issue) => (
                  <li key={`${issue.row}-${issue.message}`}>
                    第 {issue.row} 行：{issue.message}
                  </li>
                ))}
              </ul>
              {importPreview.issues.length > 6 && (
                <p className={styles.importMoreHint}>还有 {importPreview.issues.length - 6} 条错误未展示</p>
              )}
            </div>
          )}

          <button
            className={styles.importConfirmBtn}
            onClick={handleConfirmImport}
            disabled={importPreview.importableCount === 0}
          >
            确认导入 {importPreview.importableCount} 个新单词
          </button>
        </div>
      )}

      <p className={styles.hint}>
        还有 {unlearnedCount} 个词未学习
      </p>

      <div className={styles.recommendationCard}>
        <div>
          <p className={styles.recommendationLabel}>建议下一步</p>
          <h2 className={styles.recommendationTitle}>{recommendation.title}</h2>
          <p className={styles.recommendationDesc}>{recommendation.description}</p>
        </div>
        <button
          className={styles.recommendationBtn}
          onClick={() => onNavigate(recommendation.page)}
          disabled={recommendation.disabled}
        >
          {recommendation.buttonText}
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept=".csv,.json"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </div>
  )
}

function buildImportPreview(
  fileName: string,
  words: WordEntry[],
  issues: ImportParseIssue[],
  existingWords: WordEntry[],
): ImportPreview {
  const existingIds = new Set(existingWords.map((word) => word.id))
  const existingWordTexts = new Set(existingWords.map((word) => normalizeWordText(word.word)))
  const seenImportIds = new Set<string>()
  const seenImportWordTexts = new Set<string>()
  let duplicateCount = 0

  for (const word of words) {
    const normalizedWord = normalizeWordText(word.word)
    const isDuplicate = existingIds.has(word.id)
      || existingWordTexts.has(normalizedWord)
      || seenImportIds.has(word.id)
      || seenImportWordTexts.has(normalizedWord)

    if (isDuplicate) {
      duplicateCount += 1
    } else {
      seenImportIds.add(word.id)
      seenImportWordTexts.add(normalizedWord)
    }
  }

  return {
    fileName,
    words,
    issues,
    duplicateCount,
    importableCount: words.length - duplicateCount,
    sampleWords: words.slice(0, 6),
  }
}

function normalizeWordText(word: string): string {
  return word.trim().toLowerCase()
}

function getRecommendation(dueCount: number, weakCount: number, unlearnedCount: number) {
  if (dueCount > 0) {
    return {
      title: `先复习 ${dueCount} 个到期词`,
      description: '先清掉到期复习，记忆曲线会更稳。',
      buttonText: '继续复习',
      page: 'review',
      disabled: false,
    }
  }

  if (weakCount > 0) {
    return {
      title: `攻克 ${weakCount} 个薄弱词`,
      description: '今天没有到期复习，可以集中处理容易忘的词。',
      buttonText: '专项复习',
      page: 'weakReview',
      disabled: false,
    }
  }

  if (unlearnedCount > 0) {
    return {
      title: '学习一组新词',
      description: '当前复习压力较低，适合补充新词。',
      buttonText: '学习新词',
      page: 'learn',
      disabled: false,
    }
  }

  return {
    title: '今天已经全部完成',
    description: '没有待复习、薄弱词和未学词，可以休息一下。',
    buttonText: '查看统计',
    page: 'stats',
    disabled: false,
  }
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

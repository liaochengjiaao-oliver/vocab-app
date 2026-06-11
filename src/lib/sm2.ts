import type { Grade, WordProgress } from '../db/types'

export function createInitialProgress(wordId: string): WordProgress {
  return {
    wordId,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString().split('T')[0],
    lastGrade: -1,
    history: [],
  }
}

export function applyGrade(progress: WordProgress, grade: Grade): WordProgress {
  const { easeFactor, interval, repetitions } = progress
  const today = new Date()

  let newEF = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  if (newEF < 1.3) newEF = 1.3

  let newInterval: number
  let newRepetitions: number

  if (grade < 2) {
    newRepetitions = 0
    newInterval = 1
  } else {
    newRepetitions = repetitions + 1
    if (repetitions === 0) {
      newInterval = 1
    } else if (repetitions === 1) {
      newInterval = 6
    } else {
      newInterval = Math.round(interval * newEF)
    }
  }

  const nextReview = new Date(today)
  nextReview.setDate(nextReview.getDate() + newInterval)

  return {
    wordId: progress.wordId,
    easeFactor: newEF,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate: nextReview.toISOString().split('T')[0],
    lastGrade: grade,
    history: [
      ...progress.history,
      { date: today.toISOString().split('T')[0], grade },
    ],
  }
}

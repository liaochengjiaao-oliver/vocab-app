export interface ReviewRecord {
  date: string
  grade: number
}

export interface WordProgress {
  wordId: string
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewDate: string
  lastGrade: number
  history: ReviewRecord[]
}

export interface DailyStats {
  date: string
  newWords: number
  reviews: number
  correctCount: number
  totalCount: number
}

export type Grade = 0 | 1 | 2 | 3

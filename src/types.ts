export interface Instrument {
  id: string
  name: string
  color: string
  /** Objectif de temps de travail hebdomadaire, en minutes. 0 = pas d'objectif. */
  weeklyGoalMinutes: number
}

export interface Session {
  id: string
  instrumentId: string
  /** Date locale au format YYYY-MM-DD (jour où la séance a eu lieu) */
  date: string
  durationSeconds: number
  note?: string
  createdAt: number
}

export interface ActiveTimer {
  instrumentId: string
  /** Timestamp epoch (ms) du début du segment en cours */
  startedAt: number
  /** Secondes déjà accumulées avant le segment en cours (pauses incluses) */
  accumulatedSeconds: number
  isPaused: boolean
}

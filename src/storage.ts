import type { ActiveTimer, Instrument, Session } from './types'

const INSTRUMENTS_KEY = 'mpt_instruments_v1'
const SESSIONS_KEY = 'mpt_sessions_v1'
const ACTIVE_TIMER_KEY = 'mpt_active_timer_v1'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export const store = {
  // --- Instruments ---
  getInstruments(): Instrument[] {
    return read<Instrument[]>(INSTRUMENTS_KEY, [])
  },
  saveInstruments(list: Instrument[]): void {
    write(INSTRUMENTS_KEY, list)
  },
  addInstrument(instrument: Instrument): void {
    const list = this.getInstruments()
    list.push(instrument)
    this.saveInstruments(list)
  },
  updateInstrument(id: string, patch: Partial<Instrument>): void {
    const list = this.getInstruments().map((i) => (i.id === id ? { ...i, ...patch } : i))
    this.saveInstruments(list)
  },
  deleteInstrument(id: string): void {
    this.saveInstruments(this.getInstruments().filter((i) => i.id !== id))
  },

  // --- Sessions ---
  getSessions(): Session[] {
    return read<Session[]>(SESSIONS_KEY, [])
  },
  saveSessions(list: Session[]): void {
    write(SESSIONS_KEY, list)
  },
  addSession(session: Session): void {
    const list = this.getSessions()
    list.push(session)
    this.saveSessions(list)
  },
  deleteSession(id: string): void {
    this.saveSessions(this.getSessions().filter((s) => s.id !== id))
  },

  // --- Chronomètre actif (persisté pour survivre à un refresh/fermeture) ---
  getActiveTimer(): ActiveTimer | null {
    return read<ActiveTimer | null>(ACTIVE_TIMER_KEY, null)
  },
  setActiveTimer(timer: ActiveTimer | null): void {
    if (timer) write(ACTIVE_TIMER_KEY, timer)
    else localStorage.removeItem(ACTIVE_TIMER_KEY)
  },
}

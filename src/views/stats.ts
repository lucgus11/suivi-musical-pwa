import { store } from '../storage'
import { escapeHtml, formatDuration, formatMinutes } from '../utils'

export function renderStats(container: HTMLElement): () => void {
  container.innerHTML = ''
  const instruments = store.getInstruments()
  const sessions = store.getSessions()

  const wrapper = document.createElement('div')
  wrapper.className = 'stats-view'
  container.appendChild(wrapper)

  if (instruments.length === 0) {
    wrapper.innerHTML = '<p class="muted">Ajoute un instrument dans les Réglages pour voir tes statistiques.</p>'
    return () => {}
  }

  // Totaux tout-temps par instrument
  const totalsAllTime = new Map<string, number>()
  for (const s of sessions) totalsAllTime.set(s.instrumentId, (totalsAllTime.get(s.instrumentId) ?? 0) + s.durationSeconds)

  // Données des 7 derniers jours
  const days: { date: string; label: string; byInstrument: Map<string, number> }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const byInstrument = new Map<string, number>()
    for (const s of sessions.filter((s) => s.date === dateStr)) {
      byInstrument.set(s.instrumentId, (byInstrument.get(s.instrumentId) ?? 0) + s.durationSeconds)
    }
    days.push({ date: dateStr, label: d.toLocaleDateString('fr-FR', { weekday: 'short' }), byInstrument })
  }
  const maxDaySeconds = Math.max(
    1,
    ...days.map((d) => [...d.byInstrument.values()].reduce((a, b) => a + b, 0))
  )

  // Semaine en cours (lundi -> aujourd'hui) pour les objectifs
  const now = new Date()
  const weekday = (now.getDay() + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - weekday)
  monday.setHours(0, 0, 0, 0)
  const weekSessions = sessions.filter((s) => new Date(s.date + 'T00:00:00') >= monday)
  const weekTotals = new Map<string, number>()
  for (const s of weekSessions) weekTotals.set(s.instrumentId, (weekTotals.get(s.instrumentId) ?? 0) + s.durationSeconds)

  wrapper.innerHTML = `
    <div class="card">
      <h3>7 derniers jours</h3>
      <div class="bar-chart">
        ${days
          .map((d) => {
            const total = [...d.byInstrument.values()].reduce((a, b) => a + b, 0)
            const heightPct = total > 0 ? Math.max(4, (total / maxDaySeconds) * 100) : 0
            const segments = instruments
              .map((inst) => {
                const secs = d.byInstrument.get(inst.id) ?? 0
                if (secs === 0 || total === 0) return ''
                const segPct = (secs / total) * 100
                return `<div class="bar-segment" style="height:${segPct}%;background:${inst.color}"></div>`
              })
              .join('')
            return `
              <div class="bar-col">
                <div class="bar-track">
                  <div class="bar-fill" style="height:${heightPct}%">${segments}</div>
                </div>
                <span class="bar-label">${d.label}</span>
              </div>
            `
          })
          .join('')}
      </div>
    </div>

    <div class="card">
      <h3>Objectifs de la semaine</h3>
      <div id="goals-list"></div>
    </div>

    <div class="card">
      <h3>Total par instrument (tout temps)</h3>
      <div id="totals-list"></div>
    </div>
  `

  const goalsEl = wrapper.querySelector('#goals-list')!
  const withGoals = instruments.filter((i) => i.weeklyGoalMinutes > 0)
  if (withGoals.length === 0) {
    goalsEl.innerHTML = '<p class="muted">Aucun objectif défini. Ajoute-en un dans les Réglages.</p>'
  } else {
    goalsEl.innerHTML = withGoals
      .map((inst) => {
        const doneSeconds = weekTotals.get(inst.id) ?? 0
        const goalSeconds = inst.weeklyGoalMinutes * 60
        const pct = Math.min(100, Math.round((doneSeconds / goalSeconds) * 100))
        return `
          <div class="goal-row">
            <div class="goal-label"><span class="dot" style="background:${inst.color}"></span>${escapeHtml(inst.name)} — ${formatDuration(doneSeconds)} / ${formatMinutes(goalSeconds)}</div>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${inst.color}"></div></div>
          </div>
        `
      })
      .join('')
  }

  const totalsEl = wrapper.querySelector('#totals-list')!
  if (totalsAllTime.size === 0) {
    totalsEl.innerHTML = '<p class="muted">Aucune séance enregistrée pour le moment.</p>'
  } else {
    totalsEl.innerHTML = instruments
      .map((inst) => {
        const secs = totalsAllTime.get(inst.id) ?? 0
        return `<div class="summary-row"><span class="dot" style="background:${inst.color}"></span>${escapeHtml(inst.name)} <strong>${formatDuration(secs)}</strong></div>`
      })
      .join('')
  }

  return () => {}
}

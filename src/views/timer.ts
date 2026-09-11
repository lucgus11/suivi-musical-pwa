import { store } from '../storage'
import type { ActiveTimer } from '../types'
import { escapeHtml, formatClock, formatDuration, todayStr, uid } from '../utils'
import { promptDialog } from '../ui'

let intervalId: number | undefined

export function renderTimer(container: HTMLElement): () => void {
  container.innerHTML = ''
  const instruments = store.getInstruments()

  if (instruments.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'empty-state'
    empty.innerHTML = `
      <p>Aucun instrument configuré pour le moment.</p>
      <button class="btn btn-primary" id="go-settings">Ajouter un instrument</button>
    `
    container.appendChild(empty)
    empty.querySelector('#go-settings')!.addEventListener('click', () => {
      window.location.hash = '#/settings'
    })
    return () => {}
  }

  const wrapper = document.createElement('div')
  wrapper.className = 'timer-view'

  const active = store.getActiveTimer()
  const selectedInstrumentId = active?.instrumentId ?? instruments[0].id

  wrapper.innerHTML = `
    <div class="card timer-card">
      <label class="field-label" for="instrument-select">Instrument</label>
      <select id="instrument-select" class="select" ${active ? 'disabled' : ''}>
        ${instruments
          .map(
            (i) =>
              `<option value="${i.id}" ${i.id === selectedInstrumentId ? 'selected' : ''}>${escapeHtml(i.name)}</option>`
          )
          .join('')}
      </select>

      <div class="timer-display" id="timer-display">00:00:00</div>

      <div class="timer-controls" id="timer-controls"></div>
    </div>

    <div class="card">
      <h3>Séances récentes</h3>
      <div id="recent-sessions"></div>
    </div>
  `
  container.appendChild(wrapper)

  const display = wrapper.querySelector<HTMLDivElement>('#timer-display')!
  const controls = wrapper.querySelector<HTMLDivElement>('#timer-controls')!
  const select = wrapper.querySelector<HTMLSelectElement>('#instrument-select')!

  function currentElapsedSeconds(timer: ActiveTimer): number {
    if (timer.isPaused) return timer.accumulatedSeconds
    return timer.accumulatedSeconds + Math.floor((Date.now() - timer.startedAt) / 1000)
  }

  function tick() {
    const t = store.getActiveTimer()
    if (!t) return
    display.textContent = formatClock(currentElapsedSeconds(t))
  }

  function startTicking() {
    stopTicking()
    tick()
    intervalId = window.setInterval(tick, 1000)
  }

  function stopTicking() {
    if (intervalId !== undefined) {
      window.clearInterval(intervalId)
      intervalId = undefined
    }
  }

  function makeButton(text: string, cls: string): HTMLButtonElement {
    const b = document.createElement('button')
    b.className = `btn ${cls}`
    b.textContent = text
    return b
  }

  function renderControls() {
    const t = store.getActiveTimer()
    controls.innerHTML = ''

    if (!t) {
      const startBtn = makeButton('▶ Démarrer', 'btn-primary')
      startBtn.addEventListener('click', () => {
        const timer: ActiveTimer = {
          instrumentId: select.value,
          startedAt: Date.now(),
          accumulatedSeconds: 0,
          isPaused: false,
        }
        store.setActiveTimer(timer)
        select.disabled = true
        startTicking()
        renderControls()
      })
      controls.appendChild(startBtn)
      return
    }

    if (t.isPaused) {
      const resumeBtn = makeButton('▶ Reprendre', 'btn-primary')
      resumeBtn.addEventListener('click', () => {
        store.setActiveTimer({ ...t, isPaused: false, startedAt: Date.now() })
        startTicking()
        renderControls()
      })
      const stopBtn = makeButton('■ Terminer', 'btn-danger')
      stopBtn.addEventListener('click', () => void finishSession(t))
      controls.append(resumeBtn, stopBtn)
    } else {
      const pauseBtn = makeButton('❙❙ Pause', 'btn-secondary')
      pauseBtn.addEventListener('click', () => {
        const elapsed = currentElapsedSeconds(t)
        store.setActiveTimer({ ...t, isPaused: true, accumulatedSeconds: elapsed })
        stopTicking()
        tick()
        renderControls()
      })
      const stopBtn = makeButton('■ Terminer', 'btn-danger')
      stopBtn.addEventListener('click', () => void finishSession(t))
      controls.append(pauseBtn, stopBtn)
    }
  }

  async function finishSession(t: ActiveTimer) {
    stopTicking()
    const totalSeconds = currentElapsedSeconds(t)

    if (totalSeconds < 5) {
      store.setActiveTimer(null)
      select.disabled = false
      display.textContent = '00:00:00'
      renderControls()
      return
    }

    const note = await promptDialog('Une note sur cette séance ? (optionnel)', 'Ex : gammes, morceau X...')

    store.addSession({
      id: uid(),
      instrumentId: t.instrumentId,
      date: todayStr(),
      durationSeconds: totalSeconds,
      note: note && note.trim() ? note.trim() : undefined,
      createdAt: Date.now(),
    })
    store.setActiveTimer(null)
    select.disabled = false
    display.textContent = '00:00:00'
    renderControls()
    renderRecentSessions()
  }

  function renderRecentSessions() {
    const el = wrapper.querySelector<HTMLDivElement>('#recent-sessions')!
    const sessions = store
      .getSessions()
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)

    if (sessions.length === 0) {
      el.innerHTML = '<p class="muted">Aucune séance enregistrée pour le moment.</p>'
      return
    }

    const instrumentsMap = new Map(instruments.map((i) => [i.id, i]))
    el.innerHTML = sessions
      .map((s) => {
        const inst = instrumentsMap.get(s.instrumentId)
        return `
          <div class="session-row">
            <span class="dot" style="background:${inst?.color ?? '#888'}"></span>
            <span class="session-instrument">${escapeHtml(inst?.name ?? 'Instrument supprimé')}</span>
            <span class="session-duration">${formatDuration(s.durationSeconds)}</span>
            <span class="session-date">${s.date}</span>
          </div>
        `
      })
      .join('')
  }

  // Initialisation
  if (active) {
    display.textContent = formatClock(currentElapsedSeconds(active))
    if (!active.isPaused) startTicking()
  }
  renderControls()
  renderRecentSessions()

  return () => {
    stopTicking()
  }
}

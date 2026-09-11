import { store } from '../storage'
import type { Instrument, Session } from '../types'
import { escapeHtml, formatDuration, todayStr } from '../utils'
import { confirmDialog, showModal } from '../ui'

let currentMonth = new Date().getMonth()
let currentYear = new Date().getFullYear()

export function renderCalendar(container: HTMLElement): () => void {
  container.innerHTML = ''
  const wrapper = document.createElement('div')
  wrapper.className = 'calendar-view'
  container.appendChild(wrapper)

  draw()

  function draw() {
    const instruments = store.getInstruments()
    const instrumentsMap = new Map(instruments.map((i) => [i.id, i]))
    const sessions = store.getSessions()

    const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    })
    const firstDay = new Date(currentYear, currentMonth, 1)
    const startWeekday = (firstDay.getDay() + 6) % 7 // Lundi = 0
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    const sessionsByDay = new Map<string, Session[]>()
    for (const s of sessions) {
      if (!sessionsByDay.has(s.date)) sessionsByDay.set(s.date, [])
      sessionsByDay.get(s.date)!.push(s)
    }

    let cells = ''
    for (let i = 0; i < startWeekday; i++) cells += `<div class="cal-cell empty"></div>`
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const daySessions = sessionsByDay.get(dateStr) ?? []
      const isToday = dateStr === todayStr()
      const dots = [...new Set(daySessions.map((s) => s.instrumentId))]
        .map((id) => `<span class="cal-dot" style="background:${instrumentsMap.get(id)?.color ?? '#888'}"></span>`)
        .join('')
      cells += `
        <button type="button" class="cal-cell ${isToday ? 'today' : ''} ${daySessions.length ? 'has-session' : ''}" data-date="${dateStr}">
          <span class="cal-day-num">${d}</span>
          <span class="cal-dots">${dots}</span>
        </button>
      `
    }

    wrapper.innerHTML = `
      <div class="cal-header">
        <button type="button" class="btn-icon" id="prev-month" aria-label="Mois précédent">‹</button>
        <h2>${capitalize(monthLabel)}</h2>
        <button type="button" class="btn-icon" id="next-month" aria-label="Mois suivant">›</button>
      </div>
      <div class="cal-weekdays">
        ${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<div>${d}</div>`).join('')}
      </div>
      <div class="cal-grid">${cells}</div>
      <div class="card cal-month-summary">
        <h3>Ce mois-ci</h3>
        <div id="month-summary"></div>
      </div>
    `

    wrapper.querySelector('#prev-month')!.addEventListener('click', () => changeMonth(-1))
    wrapper.querySelector('#next-month')!.addEventListener('click', () => changeMonth(1))
    wrapper.querySelectorAll<HTMLButtonElement>('.cal-cell[data-date]').forEach((btn) => {
      btn.addEventListener('click', () => openDayModal(btn.dataset.date!, instrumentsMap))
    })

    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
    const monthSessions = sessions.filter((s) => s.date.startsWith(monthPrefix))
    const totals = new Map<string, number>()
    for (const s of monthSessions) totals.set(s.instrumentId, (totals.get(s.instrumentId) ?? 0) + s.durationSeconds)

    const summaryEl = wrapper.querySelector('#month-summary')!
    if (totals.size === 0) {
      summaryEl.innerHTML = '<p class="muted">Aucune séance ce mois-ci.</p>'
    } else {
      summaryEl.innerHTML = [...totals.entries()]
        .map(([id, secs]) => {
          const inst = instrumentsMap.get(id)
          return `<div class="summary-row"><span class="dot" style="background:${inst?.color ?? '#888'}"></span>${escapeHtml(inst?.name ?? 'Instrument supprimé')} <strong>${formatDuration(secs)}</strong></div>`
        })
        .join('')
    }
  }

  function changeMonth(delta: number) {
    currentMonth += delta
    if (currentMonth < 0) {
      currentMonth = 11
      currentYear--
    }
    if (currentMonth > 11) {
      currentMonth = 0
      currentYear++
    }
    draw()
  }

  function openDayModal(dateStr: string, instrumentsMap: Map<string, Instrument>) {
    showModal((root, close) => {
      let daySessions = store
        .getSessions()
        .filter((s) => s.date === dateStr)
        .sort((a, b) => b.createdAt - a.createdAt)

      root.innerHTML = `
        <h3>${dateStr}</h3>
        <p class="muted" id="day-total"></p>
        <div id="day-sessions-list"></div>
        <div class="modal-actions"><button type="button" class="btn btn-secondary" id="close-modal">Fermer</button></div>
      `
      root.querySelector('#close-modal')!.addEventListener('click', close)
      renderList()

      function renderList() {
        const total = daySessions.reduce((sum, s) => sum + s.durationSeconds, 0)
        root.querySelector('#day-total')!.textContent = `Total : ${formatDuration(total)}`

        const listEl = root.querySelector('#day-sessions-list')!
        if (daySessions.length === 0) {
          listEl.innerHTML = '<p class="muted">Aucune séance.</p>'
          return
        }
        listEl.innerHTML = daySessions
          .map((s) => {
            const inst = instrumentsMap.get(s.instrumentId)
            return `
              <div class="session-row" data-id="${s.id}">
                <span class="dot" style="background:${inst?.color ?? '#888'}"></span>
                <span class="session-instrument">${escapeHtml(inst?.name ?? 'Instrument supprimé')}</span>
                <span class="session-duration">${formatDuration(s.durationSeconds)}</span>
                <button type="button" class="btn-icon delete-session" data-id="${s.id}" aria-label="Supprimer">🗑</button>
                ${s.note ? `<div class="session-note">${escapeHtml(s.note)}</div>` : ''}
              </div>
            `
          })
          .join('')

        listEl.querySelectorAll<HTMLButtonElement>('.delete-session').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const ok = await confirmDialog('Supprimer cette séance ?')
            if (!ok) return
            store.deleteSession(btn.dataset.id!)
            daySessions = daySessions.filter((s) => s.id !== btn.dataset.id)
            renderList()
            draw()
          })
        })
      }
    })
  }

  return () => {}
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

import './style.css'
import { renderTimer } from './views/timer'
import { renderCalendar } from './views/calendar'
import { renderStats } from './views/stats'
import { renderSettings } from './views/settings'

type Route = 'timer' | 'calendar' | 'stats' | 'settings'

const TABS: { route: Route; label: string; icon: string }[] = [
  { route: 'timer', label: 'Chrono', icon: '⏱️' },
  { route: 'calendar', label: 'Calendrier', icon: '📅' },
  { route: 'stats', label: 'Stats', icon: '📊' },
  { route: 'settings', label: 'Réglages', icon: '⚙️' },
]

const renderers: Record<Route, (el: HTMLElement) => () => void> = {
  timer: renderTimer,
  calendar: renderCalendar,
  stats: renderStats,
  settings: renderSettings,
}

let cleanup: (() => void) | null = null

function currentRoute(): Route {
  const hash = window.location.hash.replace('#/', '')
  return (Object.keys(renderers) as Route[]).includes(hash as Route) ? (hash as Route) : 'timer'
}

function mount() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <header class="app-header">
      <span class="app-logo" aria-hidden="true">🎵</span>
      <h1>Suivi Musical</h1>
    </header>
    <main id="view" class="view"></main>
    <nav class="tab-bar">
      ${TABS.map(
        (t) => `
        <button type="button" class="tab-btn" data-route="${t.route}">
          <span class="tab-icon" aria-hidden="true">${t.icon}</span>
          <span class="tab-label">${t.label}</span>
        </button>
      `
      ).join('')}
    </nav>
  `

  app.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.location.hash = `#/${btn.dataset.route}`
    })
  })

  render()
}

function render() {
  const route = currentRoute()
  const view = document.querySelector<HTMLElement>('#view')!

  document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.route === route)
  })

  if (cleanup) cleanup()
  cleanup = renderers[route](view)
}

window.addEventListener('hashchange', render)
mount()

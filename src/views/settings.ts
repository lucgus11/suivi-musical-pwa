import { store } from '../storage'
import type { Instrument } from '../types'
import { confirmDialog, showModal } from '../ui'
import { escapeAttr, escapeHtml, uid } from '../utils'

const PRESET_COLORS = ['#6366f1', '#22c55e', '#f97316', '#ec4899', '#06b6d4', '#eab308', '#ef4444', '#8b5cf6']

export function renderSettings(container: HTMLElement): () => void {
  container.innerHTML = ''
  const wrapper = document.createElement('div')
  wrapper.className = 'settings-view'
  container.appendChild(wrapper)

  draw()

  function draw() {
    const instruments = store.getInstruments()

    wrapper.innerHTML = `
      <div class="card">
        <div class="card-header-row">
          <h3>Mes instruments</h3>
          <button type="button" class="btn btn-primary btn-sm" id="add-instrument">+ Ajouter</button>
        </div>
        <div id="instruments-list"></div>
      </div>

      <div class="card">
        <h3>Données</h3>
        <p class="muted">Toutes tes données sont stockées uniquement sur cet appareil (hors-ligne).</p>
        <div class="settings-actions">
          <button type="button" class="btn btn-secondary" id="export-json">Exporter en JSON</button>
          <button type="button" class="btn btn-secondary" id="export-csv">Exporter en CSV</button>
          <button type="button" class="btn btn-danger" id="reset-data">Réinitialiser toutes les données</button>
        </div>
      </div>

      <div class="card about-card">
        <h3>À propos</h3>
        <p class="muted">Suivi Musical — application de suivi du temps de travail et d'entraînement musical.</p>
      </div>
    `

    const listEl = wrapper.querySelector('#instruments-list')!
    if (instruments.length === 0) {
      listEl.innerHTML = '<p class="muted">Aucun instrument. Ajoutes-en un pour commencer.</p>'
    } else {
      listEl.innerHTML = instruments
        .map(
          (inst) => `
          <div class="instrument-row" data-id="${inst.id}">
            <span class="dot" style="background:${inst.color}"></span>
            <div class="instrument-info">
              <div class="instrument-name">${escapeHtml(inst.name)}</div>
              <div class="instrument-goal muted">${
                inst.weeklyGoalMinutes > 0 ? `Objectif : ${inst.weeklyGoalMinutes} min/semaine` : "Pas d'objectif"
              }</div>
            </div>
            <button type="button" class="btn-icon edit-instrument" data-id="${inst.id}" aria-label="Modifier">✎</button>
            <button type="button" class="btn-icon delete-instrument" data-id="${inst.id}" aria-label="Supprimer">🗑</button>
          </div>
        `
        )
        .join('')
    }

    wrapper.querySelector('#add-instrument')!.addEventListener('click', () => openInstrumentForm())
    wrapper.querySelectorAll<HTMLButtonElement>('.edit-instrument').forEach((btn) => {
      btn.addEventListener('click', () => {
        const inst = instruments.find((i) => i.id === btn.dataset.id)
        if (inst) openInstrumentForm(inst)
      })
    })
    wrapper.querySelectorAll<HTMLButtonElement>('.delete-instrument').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog(
          'Supprimer cet instrument ? Les séances déjà enregistrées seront conservées mais ne seront plus associées à un instrument actif.'
        )
        if (ok) {
          store.deleteInstrument(btn.dataset.id!)
          draw()
        }
      })
    })

    wrapper.querySelector('#export-json')!.addEventListener('click', exportJson)
    wrapper.querySelector('#export-csv')!.addEventListener('click', exportCsv)
    wrapper.querySelector('#reset-data')!.addEventListener('click', async () => {
      const ok = await confirmDialog(
        'Cette action supprimera définitivement tous les instruments et toutes les séances enregistrées. Continuer ?'
      )
      if (ok) {
        store.saveInstruments([])
        store.saveSessions([])
        store.setActiveTimer(null)
        draw()
      }
    })
  }

  function openInstrumentForm(existing?: Instrument) {
    showModal((root, close) => {
      root.innerHTML = `
        <h3>${existing ? 'Modifier' : 'Nouvel'} instrument</h3>
        <label class="field-label">Nom</label>
        <input type="text" id="inst-name" class="input" value="${existing ? escapeAttr(existing.name) : ''}" placeholder="Ex : Piano" />
        <label class="field-label">Couleur</label>
        <div class="color-picker" id="color-picker">
          ${PRESET_COLORS.map(
            (c) => `<button type="button" class="color-swatch" data-color="${c}" style="background:${c}"></button>`
          ).join('')}
        </div>
        <label class="field-label">Objectif hebdomadaire (minutes, 0 = aucun)</label>
        <input type="number" id="inst-goal" class="input" min="0" step="5" value="${existing?.weeklyGoalMinutes ?? 0}" />
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="cancel">Annuler</button>
          <button type="button" class="btn btn-primary" id="save">Enregistrer</button>
        </div>
      `

      let selectedColor = existing?.color ?? PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
      const swatches = root.querySelectorAll<HTMLButtonElement>('.color-swatch')
      swatches.forEach((btn) => {
        if (btn.dataset.color === selectedColor) btn.classList.add('selected')
        btn.addEventListener('click', () => {
          selectedColor = btn.dataset.color!
          swatches.forEach((b) => b.classList.remove('selected'))
          btn.classList.add('selected')
        })
      })

      root.querySelector('#cancel')!.addEventListener('click', close)
      root.querySelector('#save')!.addEventListener('click', () => {
        const nameInput = root.querySelector<HTMLInputElement>('#inst-name')!
        const goalInput = root.querySelector<HTMLInputElement>('#inst-goal')!
        const name = nameInput.value.trim()
        const goal = Math.max(0, Number(goalInput.value) || 0)
        if (!name) {
          nameInput.focus()
          return
        }
        if (existing) {
          store.updateInstrument(existing.id, { name, color: selectedColor, weeklyGoalMinutes: goal })
        } else {
          store.addInstrument({ id: uid(), name, color: selectedColor, weeklyGoalMinutes: goal })
        }
        close()
        draw()
      })
    })
  }

  function exportJson() {
    const data = {
      instruments: store.getInstruments(),
      sessions: store.getSessions(),
      exportedAt: new Date().toISOString(),
    }
    downloadFile(`suivi-musical-${dateSuffix()}.json`, JSON.stringify(data, null, 2), 'application/json')
  }

  function exportCsv() {
    const instrumentsMap = new Map(store.getInstruments().map((i) => [i.id, i.name]))
    const rows: string[][] = [['date', 'instrument', 'duree_secondes', 'duree', 'note']]
    for (const s of store
      .getSessions()
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))) {
      rows.push([
        s.date,
        instrumentsMap.get(s.instrumentId) ?? 'Instrument supprimé',
        String(s.durationSeconds),
        formatDurationShort(s.durationSeconds),
        s.note ?? '',
      ])
    }
    const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n')
    downloadFile(`suivi-musical-${dateSuffix()}.csv`, csv, 'text/csv')
  }

  return () => {}
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function dateSuffix(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`
  return v
}

function formatDurationShort(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  return `${h}h${String(m).padStart(2, '0')}`
}

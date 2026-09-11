export function showModal(builder: (root: HTMLElement, close: () => void) => void): () => void {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  const box = document.createElement('div')
  box.className = 'modal-box'
  overlay.appendChild(box)
  document.body.appendChild(overlay)

  const close = () => overlay.remove()
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close()
  })
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close()
  }
  document.addEventListener('keydown', onKeydown, { once: true })

  builder(box, close)
  return close
}

export function confirmDialog(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    showModal((root, closeFn) => {
      root.innerHTML = `
        <p>${message}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="cancel">Annuler</button>
          <button class="btn btn-danger" id="confirm">Confirmer</button>
        </div>
      `
      root.querySelector('#cancel')!.addEventListener('click', () => {
        closeFn()
        resolve(false)
      })
      root.querySelector('#confirm')!.addEventListener('click', () => {
        closeFn()
        resolve(true)
      })
    })
  })
}

export function promptDialog(title: string, placeholder = ''): Promise<string | null> {
  return new Promise((resolve) => {
    showModal((root, close) => {
      root.innerHTML = `
        <p>${title}</p>
        <textarea id="input" class="textarea" placeholder="${placeholder}" rows="3"></textarea>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="skip">Passer</button>
          <button class="btn btn-primary" id="save">Enregistrer</button>
        </div>
      `
      const textarea = root.querySelector<HTMLTextAreaElement>('#input')!
      textarea.focus()
      root.querySelector('#skip')!.addEventListener('click', () => {
        close()
        resolve(null)
      })
      root.querySelector('#save')!.addEventListener('click', () => {
        close()
        resolve(textarea.value)
      })
    })
  })
}

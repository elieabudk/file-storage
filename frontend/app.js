const API_URL = 'https://q2m3g5gwhc.execute-api.eu-west-3.amazonaws.com/dev'

function getFileIcon(type) {
  if (type.startsWith('image/')) return { bg: '#fef3c7', color: '#d97706', letter: 'IMG' }
  if (type === 'application/pdf') return { bg: '#fef2f2', color: '#dc2626', letter: 'PDF' }
  if (type.includes('word') || type.includes('document')) return { bg: '#eff6ff', color: '#2563eb', letter: 'DOC' }
  if (type.includes('sheet') || type.includes('excel')) return { bg: '#f0fdf4', color: '#16a34a', letter: 'XLS' }
  return { bg: '#f3f4f6', color: '#6b7280', letter: 'FILE' }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

async function doLogin() {
  const email = document.getElementById('emailInput').value.trim()
  const password = document.getElementById('passwordInput').value
  const btn = document.getElementById('loginBtn')
  const errorEl = document.getElementById('loginError')

  errorEl.classList.remove('show')

  if (!email || !password) {
    errorEl.textContent = 'Por favor completa todos los campos.'
    errorEl.classList.add('show')
    return
  }

  btn.disabled = true
  btn.innerHTML = '<span class="spinner"></span>'

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()

    if (!res.ok) {
      errorEl.textContent = data.error || 'Error al iniciar sesión.'
      errorEl.classList.add('show')
      return
    }

    document.getElementById('userEmail').textContent = data.email
    document.getElementById('loginScreen').style.display = 'none'
    document.getElementById('mainScreen').style.display = 'block'
    loadFiles()

  } catch (e) {
    errorEl.textContent = 'No se pudo conectar con el servidor.'
    errorEl.classList.add('show')
  } finally {
    btn.disabled = false
    btn.textContent = 'Iniciar sesión'
  }
}

async function doLogout() {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  })
  document.getElementById('loginScreen').style.display = 'flex'
  document.getElementById('mainScreen').style.display = 'none'
  document.getElementById('emailInput').value = ''
  document.getElementById('passwordInput').value = ''
}

async function loadFiles() {
  const container = document.getElementById('filesList')
  container.innerHTML = '<div class="empty-state"><p>Cargando...</p></div>'

  try {
    const res = await fetch(`${API_URL}/files`, {
      credentials: 'include'
    })

    if (res.status === 401) {
      doLogout()
      return
    }

    const data = await res.json()
    const files = data.files || []

    document.getElementById('fileCount').textContent =
      files.length + ' archivo' + (files.length !== 1 ? 's' : '')

    if (files.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          <p>Aún no tienes archivos subidos</p>
        </div>`
      return
    }

    container.innerHTML = `<div class="files-grid">
      ${files.map(f => renderFileCard(f)).join('')}
    </div>`

    files.filter(f => f.file_type.startsWith('image/')).forEach(f => {
      loadImagePreview(f.id, `prev-${f.id}`)
    })

  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>Error al cargar los archivos</p></div>'
  }
}

function renderFileCard(file) {
  const icon = getFileIcon(file.file_type)
  const isImage = file.file_type.startsWith('image/')

  const preview = isImage
    ? `<div class="file-preview" id="prev-${file.id}">
         <div style="color:#888;font-size:12px">Cargando...</div>
       </div>`
    : `<div class="file-preview">
         <div class="file-icon" style="background:${icon.bg}">
           <span style="font-size:13px;font-weight:500;color:${icon.color}">${icon.letter}</span>
         </div>
       </div>`

  return `
    <div class="file-card">
      ${preview}
      <div class="file-info">
        <div class="file-name" title="${file.file_name}">${file.file_name}</div>
        <div class="file-meta">${formatSize(file.file_size)} · ${formatDate(file.created_at)}</div>
        <div class="file-actions">
          <button class="btn-action btn-download" onclick="downloadFile('${file.id}', '${file.file_name}')">Descargar</button>
          <button class="btn-action btn-delete" onclick="deleteFile('${file.id}')">Eliminar</button>
        </div>
      </div>
    </div>`
}

async function loadImagePreview(fileId, elementId) {
  try {
    const res = await fetch(`${API_URL}/files/${fileId}/download`, {
      credentials: 'include'
    })
    const data = await res.json()
    const el = document.getElementById(elementId)
    if (el && data.downloadUrl) {
      el.innerHTML = `<img src="${data.downloadUrl}" alt="preview">`
    }
  } catch (e) {}
}

async function downloadFile(fileId, fileName) {
  try {
    const res = await fetch(`${API_URL}/files/${fileId}/download`, {
      credentials: 'include'
    })
    const data = await res.json()
    if (data.downloadUrl) {
      const a = document.createElement('a')
      a.href = data.downloadUrl
      a.download = fileName
      a.click()
    }
  } catch (e) {
    alert('Error al descargar el archivo')
  }
}

async function deleteFile(fileId) {
  if (!confirm('¿Eliminar este archivo?')) return
  try {
    await fetch(`${API_URL}/files/${fileId}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    loadFiles()
  } catch (e) {
    alert('Error al eliminar el archivo')
  }
}

async function uploadFile(file) {
  const progressBar = document.getElementById('progressBar')
  const progressFill = document.getElementById('progressFill')
  progressBar.style.display = 'block'
  progressFill.style.width = '20%'

  try {
    const urlRes = await fetch(`${API_URL}/files/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type || 'application/octet-stream'
      })
    })
    const { uploadUrl, s3Key } = await urlRes.json()
    progressFill.style.width = '50%'

    await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    })
    progressFill.style.width = '80%'

    await fetch(`${API_URL}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        s3Key
      })
    })

    progressFill.style.width = '100%'
    setTimeout(() => {
      progressBar.style.display = 'none'
      progressFill.style.width = '0%'
    }, 800)

    loadFiles()

  } catch (e) {
    alert('Error al subir el archivo')
    progressBar.style.display = 'none'
  }
}

document.getElementById('loginBtn').addEventListener('click', doLogin)
document.getElementById('logoutBtn').addEventListener('click', doLogout)

document.getElementById('selectFileBtn').addEventListener('click', (e) => {
  e.stopPropagation()
  document.getElementById('fileInput').click()
})

document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (file) uploadFile(file)
})

document.getElementById('uploadZone').addEventListener('click', () => {
  document.getElementById('fileInput').click()
})

document.getElementById('uploadZone').addEventListener('dragover', (e) => {
  e.preventDefault()
  document.getElementById('uploadZone').classList.add('dragover')
})

document.getElementById('uploadZone').addEventListener('dragleave', () => {
  document.getElementById('uploadZone').classList.remove('dragover')
})

document.getElementById('uploadZone').addEventListener('drop', (e) => {
  e.preventDefault()
  document.getElementById('uploadZone').classList.remove('dragover')
  const file = e.dataTransfer.files[0]
  if (file) uploadFile(file)
})

document.getElementById('passwordInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin()
})

async function checkSession() {
    try {
      const res = await fetch(`${API_URL}/files`, {
        credentials: 'include'
      })
  
      if (res.ok) {
        const data = await res.json()
        
        // La cookie es válida — restaura la sesión
        const files = data.files || []
        document.getElementById('loginScreen').style.display = 'none'
        document.getElementById('mainScreen').style.display = 'block'
  
        document.getElementById('fileCount').textContent =
          files.length + ' archivo' + (files.length !== 1 ? 's' : '')
  
        if (files.length === 0) {
          document.getElementById('filesList').innerHTML = `
            <div class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
              </svg>
              <p>Aún no tienes archivos subidos</p>
            </div>`
        } else {
          document.getElementById('filesList').innerHTML = `<div class="files-grid">
            ${files.map(f => renderFileCard(f)).join('')}
          </div>`
          files.filter(f => f.file_type.startsWith('image/')).forEach(f => {
            loadImagePreview(f.id, `prev-${f.id}`)
          })
        }
      }
    } catch (e) {}
  }
  
  checkSession()
'use client'

import { useState, useRef, useEffect } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { API_URL } from '@/lib/api-config'
import Cookies from 'js-cookie'

interface Project {
  id: string
  name: string
  color: string
}

export default function CapturePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [newProjectName, setNewProjectName] = useState('')
  const [captureMode, setCaptureMode] = useState<'photo' | 'text'>('photo')
  const [textNote, setTextNote] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    if (!token) return
    fetch(`${API_URL}/api/v1/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => setProjects(Array.isArray(json.data) ? json.data : []))
      .catch(() => {})
  }, [])

  const resizeImage = (dataUrl: string, maxWidth = 1280): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        // Always convert to JPEG to reduce size
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.src = dataUrl
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const resized = await resizeImage(reader.result as string)
      setPreview(resized)
      setStatus(`Image loaded (${Math.round(resized.length / 1024)}KB)`)
    }
    reader.readAsDataURL(file)
  }

  const handleCapture = async () => {
    const token = Cookies.get('auth_token')
    if (!token) { setStatus('Not logged in'); return }

    setUploading(true)
    setStatus('Uploading...')

    try {
      let projectId = selectedProject
      if (newProjectName.trim()) {
        const pRes = await fetch(`${API_URL}/api/v1/projects`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newProjectName.trim() }),
        })
        const pJson = await pRes.json()
        if (pRes.ok && pJson.data?.id) {
          projectId = pJson.data.id
          setProjects(prev => [...prev, pJson.data])
          setSelectedProject(projectId)
          setNewProjectName('')
        }
      }

      if (captureMode === 'photo' && preview) {
        const payloadSize = preview.length
        if (payloadSize > 30 * 1024 * 1024) {
          setStatus(`Error: Image too large (${Math.round(payloadSize / 1024 / 1024)}MB). Max 30MB.`)
          setUploading(false)
          return
        }
        setStatus(`Uploading ${Math.round(payloadSize / 1024)}KB to ${API_URL}...`)
        const res = await fetch(`${API_URL}/api/v1/captures`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            capture_type: 'photo',
            image_data: preview,
            project_id: projectId || null,
          }),
        })
        if (res.ok) {
          setStatus('Captured! Ready for AI processing.')
          setPreview(null)
          if (fileRef.current) fileRef.current.value = ''
        } else {
          const err = await res.json()
          setStatus(`Error: ${err.error?.message || 'Upload failed'}`)
        }
      } else if (captureMode === 'text' && textNote.trim()) {
        const res = await fetch(`${API_URL}/api/v1/captures`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            capture_type: 'text',
            text_content: textNote.trim(),
            project_id: projectId || null,
          }),
        })
        if (res.ok) {
          setStatus('Note saved!')
          setTextNote('')
        } else {
          const err = await res.json()
          setStatus(`Error: ${err.error?.message || 'Save failed'}`)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setStatus(`Error: ${msg}`)
      console.error('Capture error:', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-semibold">Capture</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Snap a photo of an email, business card, or note. AI will extract contacts and details.
        </p>

        <div className="mt-6 flex gap-2">
          <button onClick={() => setCaptureMode('photo')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              captureMode === 'photo' ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
            }`}>Photo</button>
          <button onClick={() => setCaptureMode('text')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              captureMode === 'text' ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
            }`}>Quick Note</button>
        </div>

        <div className="mt-4 space-y-2">
          <div>
            <label className="text-sm font-medium">Project scope</label>
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
              placeholder="Or create new project..." className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="mt-6">
          {captureMode === 'photo' ? (
            <div className="space-y-4">
              <input ref={fileRef} type="file" accept="image/*" capture="environment"
                onChange={handleFileSelect} className="hidden" id="camera-input" />
              <label htmlFor="camera-input"
                className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:bg-muted/50">
                <div>
                  <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                  <p className="mt-2 text-sm font-medium">Tap to take photo</p>
                  <p className="text-xs text-muted-foreground">or drag & drop an image</p>
                </div>
              </label>
              {preview && (
                <div className="relative">
                  <img src={preview} alt="Preview" className="w-full rounded-lg" />
                  <button onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <textarea value={textNote} onChange={e => setTextNote(e.target.value)}
              placeholder="Type a quick note about a contact, meeting, or idea..." rows={6}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          )}
        </div>

        <button onClick={handleCapture}
          disabled={uploading || (captureMode === 'photo' && !preview) || (captureMode === 'text' && !textNote.trim())}
          className="mt-4 w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
          {uploading ? 'Processing...' : captureMode === 'photo' ? 'Capture & Save' : 'Save Note'}
        </button>

        {status && (
          <p className={`mt-3 text-center text-sm ${status.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {status}
          </p>
        )}

        <p className="mt-4 text-xs text-muted-foreground text-center">
          AI processing requires Ollama (local) or Anthropic API key configured.
        </p>
      </main>
    </>
  )
}

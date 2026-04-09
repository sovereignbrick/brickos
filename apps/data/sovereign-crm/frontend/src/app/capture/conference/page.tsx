'use client'

import { useState, useRef } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { API_URL } from '@/lib/api-config'
import Cookies from 'js-cookie'

export default function ConferenceModePage() {
  const [projectName, setProjectName] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [captureCount, setCaptureCount] = useState(0)
  const [started, setStarted] = useState(false)
  const [lastCapture, setLastCapture] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const startSession = async () => {
    if (!projectName.trim()) return
    const token = Cookies.get('auth_token')
    if (!token) return
    const res = await fetch(`${API_URL}/api/v1/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectName.trim(), color: '#f59e0b' }),
    })
    const json = await res.json()
    if (res.ok && json.data?.id) {
      setProjectId(json.data.id)
      setStarted(true)
    }
  }

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !projectId) return
    const reader = new FileReader()
    reader.onload = async () => {
      const token = Cookies.get('auth_token')
      if (!token) return
      setLastCapture(reader.result as string)
      await fetch(`${API_URL}/api/v1/captures`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capture_type: 'photo',
          image_data: reader.result,
          project_id: projectId,
        }),
      })
      setCaptureCount(c => c + 1)
      if (fileRef.current) fileRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  const processAll = async () => {
    const token = Cookies.get('auth_token')
    if (!token) return
    await fetch(`${API_URL}/api/v1/queue/process-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-semibold">Conference Mode</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rapid business card and email scanning. Capture now, process later.
        </p>

        {!started ? (
          <div className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium">Conference / Event name</label>
              <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
                placeholder="e.g. BTC Prague 2026"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>
            <button onClick={startSession} disabled={!projectName.trim()}
              className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
              Start Scanning Session
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Counter */}
            <div className="text-center">
              <p className="text-5xl font-bold">{captureCount}</p>
              <p className="mt-1 text-sm text-muted-foreground">captures in {projectName}</p>
            </div>

            {/* Camera button */}
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              onChange={handleCapture} className="hidden" id="conf-camera" />
            <label htmlFor="conf-camera"
              className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-blue-600 bg-blue-600/10 p-12 text-center transition-colors hover:bg-blue-600/20">
              <div>
                <svg className="mx-auto h-16 w-16 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
                <p className="mt-3 text-lg font-semibold text-blue-400">Tap to Capture</p>
              </div>
            </label>

            {/* Last capture preview */}
            {lastCapture && (
              <div className="rounded-lg border overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lastCapture} alt="Last capture" className="w-full h-32 object-cover opacity-50" />
              </div>
            )}

            {/* Process all */}
            <button onClick={processAll}
              className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              Process All {captureCount} Captures
            </button>
          </div>
        )}
      </main>
    </>
  )
}

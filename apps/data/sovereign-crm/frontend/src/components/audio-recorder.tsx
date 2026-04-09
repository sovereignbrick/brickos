'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface AudioRecorderProps {
  onRecordingComplete: (audioBase64: string, durationSecs: number) => void
}

export function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setRecording(false)
  }, [])

  const startRecording = async () => {
    setError('')
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const totalSecs = Math.round((Date.now() - startTimeRef.current) / 1000)
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          onRecordingComplete(base64, totalSecs)
        }
        reader.readAsDataURL(blob)
      }

      recorder.start(1000) // collect data every second
      startTimeRef.current = Date.now()
      setDuration(0)
      setRecording(true)

      timerRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000))
      }, 500)
    } catch {
      setError('Microphone access denied or unavailable.')
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-sm font-medium mb-3">Audio Recording</p>

      {error && (
        <p className="text-sm text-red-400 mb-3">{error}</p>
      )}

      <div className="flex items-center gap-4">
        {!recording ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
          >
            <span className="inline-block h-3 w-3 rounded-full bg-white" />
            Record
          </button>
        ) : (
          <>
            {/* Waveform animation */}
            <div className="flex items-center gap-0.5 h-8">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-500 rounded-full"
                  style={{
                    animation: `waveform 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                    height: '100%',
                  }}
                />
              ))}
            </div>

            <span className="font-mono text-sm tabular-nums text-red-400">
              {formatDuration(duration)}
            </span>

            <button
              onClick={stopRecording}
              className="flex items-center gap-2 rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
            >
              <span className="inline-block h-3 w-3 rounded bg-white" />
              Stop
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes waveform {
          0% { height: 20%; }
          100% { height: 100%; }
        }
      `}</style>
    </div>
  )
}

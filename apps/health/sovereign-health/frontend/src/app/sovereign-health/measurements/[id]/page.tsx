'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Measurement } from '@/lib/types'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { StatusBadge } from '@/components/status-badge'
import Link from 'next/link'
import { toast } from '@/lib/toast'
import { Breadcrumb } from '@/components/breadcrumb'
import { useTranslations } from 'next-intl'
import { formatDateTime, formatDate } from '@/lib/date-format'
import { useUnitPreferences } from '@/hooks/use-unit-preferences'

export default function MeasurementDetailPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const tMeasurements = useTranslations('newMeasurement')
  const tCommon = useTranslations('common')
  const { formatDisplay } = useUnitPreferences()

  const [measurement, setMeasurement] = useState<Measurement | null>(null)
  const [fetching, setFetching] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return }
    if (!loading && user) {
      api.measurements.get(id)
        .then(res => setMeasurement(res.data))
        .catch(() => setMeasurement(null))
        .finally(() => setFetching(false))
    }
  }, [user, loading, router, id])

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      await api.measurements.delete(id)
      toast.success(tMeasurements('deleted'))
      router.back()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading || fetching) return <div className="min-h-screen" suppressHydrationWarning>{tCommon('loading')}</div>

  if (!measurement) return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Measurement not found.</p>
        <Link href="/sovereign-health/measurements" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">
          ← Back to history
        </Link>
      </main>
    </div>
  )

  const fields: { label: string; value: string | number | null | undefined }[] = [
    { label: 'Marker', value: measurement.marker_name },
    { label: 'Value', value: formatDisplay(measurement.marker_slug, measurement.value, measurement.unit).formatted },
    { label: 'Timestamp', value: formatDateTime(measurement.timestamp, user?.country_code) },
    { label: 'Protocol', value: measurement.protocol_tag },
    { label: 'Diet Protocol', value: measurement.diet_protocol },
    { label: 'Fasting Protocol', value: measurement.fasting_protocol },
    { label: 'Fasting Hours', value: measurement.fasting_hours },
    { label: 'Meal Timing', value: measurement.meal_timing_tag },
    { label: 'Exercise', value: measurement.exercise_activity },
    { label: 'Sleep Hours', value: measurement.sleep_hours },
    { label: 'Sleep Quality', value: measurement.sleep_quality },
    { label: 'Stress Level', value: measurement.stress_level != null ? (measurement.stress_level <= 2 ? 'None' : measurement.stress_level <= 4 ? 'Low' : measurement.stress_level <= 6 ? 'Moderate' : measurement.stress_level <= 8 ? 'High' : 'Very High') : null },
    { label: 'Note', value: measurement.lifestyle_note },
    { label: 'Created', value: formatDateTime(measurement.created_at, user?.country_code) },
  ]

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-8">
        <div className="mb-6">
          <Breadcrumb items={[
            { label: 'Overview', href: '/sovereign-health/dashboard' },
            { label: 'History', href: '/sovereign-health/measurements' },
            { label: `${measurement.marker_name}  - ${formatDate(measurement.timestamp, user?.country_code)}` },
          ]} />
        </div>

        <div className="rounded-2xl border p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">{measurement.marker_name}</h1>
              <p className="text-muted-foreground text-sm">{formatDateTime(measurement.timestamp, user?.country_code)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{formatDisplay(measurement.marker_slug, measurement.value, measurement.unit).value.toFixed(2)} <span className="text-sm text-muted-foreground">{formatDisplay(measurement.marker_slug, measurement.value, measurement.unit).unit}</span></p>
              <StatusBadge status={measurement.status as 'green' | 'orange' | 'red' | null} showLabel />
            </div>
          </div>

          <div className="space-y-2">
            {fields.map(({ label, value }) => {
              if (value === null || value === undefined || value === '') return null
              return (
                <div key={label} className="flex justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium capitalize">{String(value)}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/sovereign-health/measurements/${id}/edit`}
            className="flex-1 text-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            Edit measurement
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
              confirmDelete
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-accent text-red-400 hover:bg-red-500/10 border border-red-500/30'
            } disabled:opacity-50`}
          >
            {deleting ? 'Deleting...' : confirmDelete ? `Confirm: Delete from ${formatDate(measurement.timestamp, user?.country_code)}?` : 'Delete'}
          </button>
        </div>
        {confirmDelete && (
          <button
            onClick={() => setConfirmDelete(false)}
            className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Cancel
          </button>
        )}
      </main>
      <Footer />
    </div>
  )
}

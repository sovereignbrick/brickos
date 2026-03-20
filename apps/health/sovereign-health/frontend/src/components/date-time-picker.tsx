'use client'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

interface DateTimePickerProps {
  value: string // YYYY-MM-DDTHH:mm format
  onChange: (value: string) => void
  countryCode?: string | null
  className?: string
}

function formatLocalDatetime(date: Date): string {
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

function is24h(countryCode?: string | null): boolean {
  const cc = countryCode?.toUpperCase()
  if (!cc) return true
  return cc !== 'US'
}

function dateFormat(countryCode?: string | null): string {
  const cc = countryCode?.toUpperCase()
  if (cc === 'US') return 'MM/dd/yyyy h:mm aa'
  if (cc === 'DE' || cc === 'AT' || cc === 'CH') return 'dd.MM.yyyy HH:mm'
  if (cc === 'GB') return 'dd/MM/yyyy HH:mm'
  return 'dd.MM.yyyy HH:mm'
}

export function DateTimePicker({ value, onChange, countryCode, className }: DateTimePickerProps) {
  const selected = value ? new Date(value) : new Date()
  const use24 = is24h(countryCode)

  return (
    <DatePicker
      selected={selected}
      onChange={(date: Date | null) => {
        if (date) onChange(formatLocalDatetime(date))
      }}
      showTimeSelect
      timeIntervals={5}
      timeFormat={use24 ? 'HH:mm' : 'h:mm aa'}
      dateFormat={dateFormat(countryCode)}
      showPopperArrow={false}
      className={className ?? 'w-full bg-transparent text-sm focus:outline-none border rounded-lg px-2.5 py-1.5'}
      calendarClassName="sh-datepicker"
      popperPlacement="bottom-start"
    />
  )
}

interface DateOnlyPickerProps {
  value: string // YYYY-MM-DD format
  onChange: (value: string) => void
  countryCode?: string | null
  className?: string
  placeholder?: string
}

function dateOnlyFormat(countryCode?: string | null): string {
  const cc = countryCode?.toUpperCase()
  if (cc === 'US') return 'MM/dd/yyyy'
  if (cc === 'DE' || cc === 'AT' || cc === 'CH') return 'dd.MM.yyyy'
  if (cc === 'GB') return 'dd/MM/yyyy'
  return 'dd.MM.yyyy'
}

export function DateOnlyPicker({ value, onChange, countryCode, className, placeholder }: DateOnlyPickerProps) {
  const selected = value ? new Date(value + 'T00:00:00') : null

  return (
    <DatePicker
      selected={selected}
      onChange={(date: Date | null) => {
        if (date) {
          const p = (n: number) => n.toString().padStart(2, '0')
          onChange(`${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`)
        } else {
          onChange('')
        }
      }}
      dateFormat={dateOnlyFormat(countryCode)}
      showPopperArrow={false}
      isClearable
      placeholderText={placeholder}
      className={className ?? 'w-full bg-transparent text-sm focus:outline-none border rounded-lg px-2.5 py-1.5'}
      calendarClassName="sh-datepicker"
      popperPlacement="bottom-start"
    />
  )
}

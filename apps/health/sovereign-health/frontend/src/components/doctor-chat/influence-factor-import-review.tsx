'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { ExtractedMedication } from '@/lib/types'

const UNIT_KEYS = ['mg', 'g', 'mcg', 'ml', 'iu', 'pct', 'mmol', 'noUnit']

interface EditableIngredient {
  name: string
  amount: string
  unit: string
  role: string // "active" or "auxiliary"
  notes: string
}

interface EditableMedication {
  name: string
  brand: string
  factor_type: string // "medication" or "supplement"
  dosage: string
  frequency: string
  form: string
  prescriber: string
  ingredients: EditableIngredient[]
  selected: boolean
  editing: boolean
}

interface InfluenceFactorImportReviewProps {
  sessionId: string
  medications: ExtractedMedication[]
  onConfirm: (medications: Array<{
    name: string
    brand?: string
    factor_type?: string
    dosage?: string
    frequency?: string
    form?: string
    prescriber?: string
    ingredients?: Array<{ name: string; amount?: string; role?: string }>
  }>) => void
  onCancel: () => void
  isLoading: boolean
}

const FREQUENCY_OPTIONS = [
  { value: '1x daily', labelKey: 'frequencies.onceDaily' },
  { value: '2x daily', labelKey: 'frequencies.twiceDaily' },
  { value: '3x daily', labelKey: 'frequencies.thriceDaily' },
  { value: 'weekly', labelKey: 'frequencies.weekly' },
  { value: 'as needed', labelKey: 'frequencies.asNeeded' },
]

const FORM_OPTIONS = [
  { value: 'tablet', labelKey: 'forms.tablet' },
  { value: 'capsule', labelKey: 'forms.capsule' },
  { value: 'liquid', labelKey: 'forms.liquid' },
  { value: 'injection', labelKey: 'forms.injection' },
  { value: 'patch', labelKey: 'forms.patch' },
  { value: 'cream', labelKey: 'forms.cream' },
  { value: 'inhaler', labelKey: 'forms.inhaler' },
  { value: 'drops', labelKey: 'forms.drops' },
  { value: 'powder', labelKey: 'forms.powder' },
]

export function InfluenceFactorImportReview({
  sessionId,
  medications: extractedMedications,
  onConfirm,
  onCancel,
  isLoading,
}: InfluenceFactorImportReviewProps) {
  const t = useTranslations('medications')

  const [medications, setMedications] = useState<EditableMedication[]>(() =>
    extractedMedications.map((m) => ({
      name: m.name,
      brand: m.brand ?? '',
      factor_type: m.type === 'supplement' ? 'supplement' : 'medication',
      dosage: m.dosage ?? '',
      frequency: m.frequency ?? '',
      form: m.form ?? '',
      prescriber: '',
      ingredients: (m.ingredients ?? []).map((ing) => {
        const raw = ing.amount ?? ''
        const match = raw.match(/^([\d.,]+)\s*(mg|g|µg|mcg|ml|IU|IE|%|mmol)?$/i)
        return {
          name: ing.name,
          amount: match ? match[1] : raw.replace(/\s*(mg|g|µg|mcg|ml|IU|IE|%|mmol)$/i, '').trim(),
          unit: match?.[2]?.toLowerCase().replace('µg', 'mcg').replace('ie', 'iu') || 'mg',
          role: ing.role === 'auxiliary' ? 'auxiliary' : 'active',
          notes: (ing as { notes?: string }).notes ?? '',
        }
      }),
      selected: true,
      editing: false,
    }))
  )

  const selectedCount = medications.filter((m) => m.selected).length

  const updateMed = useCallback((index: number, updates: Partial<EditableMedication>) => {
    setMedications((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...updates } : m))
    )
  }, [])

  const updateIngredient = useCallback((medIndex: number, ingIndex: number, updates: Partial<EditableIngredient>) => {
    setMedications((prev) =>
      prev.map((m, mi) => {
        if (mi !== medIndex) return m
        const newIngs = m.ingredients.map((ing, ii) =>
          ii === ingIndex ? { ...ing, ...updates } : ing
        )
        return { ...m, ingredients: newIngs }
      })
    )
  }, [])

  const addIngredient = useCallback((medIndex: number) => {
    setMedications((prev) =>
      prev.map((m, i) => {
        if (i !== medIndex) return m
        return {
          ...m,
          ingredients: [...m.ingredients, { name: '', amount: '', unit: 'mg', role: 'active', notes: '' }],
        }
      })
    )
  }, [])

  const removeIngredient = useCallback((medIndex: number, ingIndex: number) => {
    setMedications((prev) =>
      prev.map((m, mi) => {
        if (mi !== medIndex) return m
        return {
          ...m,
          ingredients: m.ingredients.filter((_, ii) => ii !== ingIndex),
        }
      })
    )
  }, [])

  const handleConfirm = () => {
    const selected = medications
      .filter((m) => m.selected)
      .map((m) => ({
        name: m.name,
        brand: m.brand || undefined,
        factor_type: m.factor_type || undefined,
        dosage: m.dosage || undefined,
        frequency: m.frequency || undefined,
        form: m.form || undefined,
        prescriber: m.prescriber || undefined,
        ingredients: m.ingredients
          .filter((ing) => ing.name.trim())
          .map((ing) => ({
            name: ing.name,
            amount: ing.amount || undefined,
            unit: ing.unit === 'noUnit' ? undefined : ing.unit || undefined,
            role: ing.role,
            notes: ing.notes || undefined,
          })),
      }))
    onConfirm(selected)
  }

  const _sessionId = sessionId // used by parent

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              {t('importReview.title')} ({extractedMedications.length})
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--muted-foreground)]"
          >
            {t('importReview.cancel')}
          </button>
        </div>

        {/* Medication cards */}
        <div className="space-y-3">
          {medications.map((med, medIdx) => (
            <div
              key={medIdx}
              className={`border rounded-xl overflow-hidden transition-all ${
                med.selected
                  ? 'border-[var(--border)] bg-[var(--muted)]/20'
                  : 'border-[var(--border)]/50 bg-[var(--muted)]/10 opacity-50'
              }`}
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={med.selected}
                    onChange={(e) =>
                      updateMed(medIdx, { selected: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-lg">
                    {med.factor_type === 'supplement' ? '\uD83C\uDF3F' : '\uD83D\uDC8A'}
                  </span>
                  {med.editing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) =>
                          updateMed(medIdx, { name: e.target.value })
                        }
                        className="bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--foreground)] font-medium"
                      />
                      <input
                        type="text"
                        value={med.brand}
                        onChange={(e) =>
                          updateMed(medIdx, { brand: e.target.value })
                        }
                        placeholder={t('brandLabel')}
                        className="bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--muted-foreground)]"
                      />
                    </div>
                  ) : (
                    <span className="text-[var(--foreground)] font-medium">
                      {med.name}
                      {med.brand && <span className="text-[var(--muted-foreground)] font-normal ml-1.5 text-xs">({med.brand})</span>}
                    </span>
                  )}
                </div>
                <button
                  onClick={() =>
                    updateMed(medIdx, { editing: !med.editing })
                  }
                  className="text-xs text-[var(--foreground)]/40 hover:text-[var(--muted-foreground)] px-2 py-1 border border-[var(--border)] rounded"
                >
                  {t('importReview.edit')}
                </button>
              </div>

              {/* Card body */}
              <div className="px-4 pb-4 space-y-3">
                {/* Type, Dosage, Frequency row */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[var(--foreground)]/40 block mb-1">
                      {t('typeLabel')}
                    </label>
                    <select
                      value={med.factor_type}
                      onChange={(e) =>
                        updateMed(medIdx, { factor_type: e.target.value })
                      }
                      disabled={!med.editing}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] disabled:opacity-60"
                    >
                      <option value="medication">{t('typeMedication')}</option>
                      <option value="supplement">{t('typeSupplement')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--foreground)]/40 block mb-1">
                      {t('dosageLabel')}
                    </label>
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) =>
                        updateMed(medIdx, { dosage: e.target.value })
                      }
                      disabled={!med.editing}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] disabled:opacity-60"
                      placeholder={t('placeholders.dosageMed')}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--foreground)]/40 block mb-1">
                      {t('frequencyLabel')}
                    </label>
                    <select
                      value={med.frequency}
                      onChange={(e) =>
                        updateMed(medIdx, { frequency: e.target.value })
                      }
                      disabled={!med.editing}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] disabled:opacity-60"
                    >
                      <option value="">{t('selectFrequency')}</option>
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Form row (only in edit mode) */}
                {med.editing && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-[var(--foreground)]/40 block mb-1">
                        {t('formLabel')}
                      </label>
                      <select
                        value={med.form}
                        onChange={(e) =>
                          updateMed(medIdx, { form: e.target.value })
                        }
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)]"
                      >
                        <option value="">{t('selectForm')}</option>
                        {FORM_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {t(opt.labelKey)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[var(--foreground)]/40 block mb-1">
                        {t('prescriberLabel')}
                      </label>
                      <input
                        type="text"
                        value={med.prescriber}
                        onChange={(e) =>
                          updateMed(medIdx, { prescriber: e.target.value })
                        }
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)]"
                        placeholder={t('placeholders.prescriber')}
                      />
                    </div>
                  </div>
                )}

                {/* Ingredients section */}
                <div>
                  <label className="text-xs text-[var(--foreground)]/40 block mb-1.5">
                    {t('ingredientsTitle')}
                  </label>
                  {med.ingredients.length === 0 ? (
                    <p className="text-xs text-[var(--foreground)]/20 italic">
                      {t('noIngredients')}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {med.ingredients.map((ing, ingIdx) => (
                        <div
                          key={ingIdx}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="text-[var(--muted-foreground)]/50 text-xs w-4">
                            {ingIdx === med.ingredients.length - 1
                              ? '\u2514\u2500'
                              : '\u251C\u2500'}
                          </span>
                          {med.editing ? (
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={ing.name}
                                  onChange={(e) =>
                                    updateIngredient(medIdx, ingIdx, { name: e.target.value })
                                  }
                                  placeholder={t('placeholders.ingredientName')}
                                  className="w-40 min-w-0 bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--foreground)]"
                                />
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={ing.amount}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9.,]/g, '')
                                    updateIngredient(medIdx, ingIdx, { amount: val })
                                  }}
                                  placeholder={t('placeholders.ingredientAmount')}
                                  className="w-16 bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--foreground)]"
                                />
                                <select
                                  value={ing.unit || 'mg'}
                                  onChange={(e) =>
                                    updateIngredient(medIdx, ingIdx, { unit: e.target.value })
                                  }
                                  className="w-16 bg-[var(--background)] border border-[var(--border)] rounded px-1 py-1 text-xs text-[var(--foreground)]"
                                >
                                  {UNIT_KEYS.map((u) => (
                                    <option key={u} value={u}>{t(`units.${u}`)}</option>
                                  ))}
                                </select>
                                <select
                                  value={ing.role}
                                  onChange={(e) =>
                                    updateIngredient(medIdx, ingIdx, { role: e.target.value })
                                  }
                                  className="w-24 bg-[var(--background)] border border-[var(--border)] rounded px-1 py-1 text-xs text-[var(--foreground)]"
                                >
                                  <option value="active">{t('roleActive')}</option>
                                  <option value="auxiliary">{t('roleAuxiliary')}</option>
                                </select>
                                <button
                                  onClick={() => removeIngredient(medIdx, ingIdx)}
                                  className="text-red-400/60 hover:text-red-400 text-xs px-1"
                                >
                                  x
                                </button>
                              </div>
                              <input
                                type="text"
                                value={ing.notes}
                                onChange={(e) =>
                                  updateIngredient(medIdx, ingIdx, { notes: e.target.value })
                                }
                                placeholder={t('ingredientNotes')}
                                className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-[10px] text-[var(--muted-foreground)] italic"
                              />
                            </div>
                          ) : (
                            <>
                              <span className="text-[var(--foreground)] text-xs">{ing.name}</span>
                              {ing.amount && (
                                <span className="text-[var(--muted-foreground)] text-xs">
                                  {ing.amount}{ing.unit && ing.unit !== 'noUnit' ? ` ${ing.unit === 'mcg' ? 'µg' : ing.unit === 'iu' ? 'IU' : ing.unit}` : ''}
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  ing.role === 'active'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-[var(--muted)]/30 text-[var(--muted-foreground)]'
                                }`}
                              >
                                {ing.role === 'active' ? t('roleActive') : t('roleAuxiliary')}
                              </span>
                              {ing.notes && (
                                <span className="text-[10px] text-[var(--muted-foreground)]/60 italic">{ing.notes}</span>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {med.editing && (
                    <button
                      onClick={() => addIngredient(medIdx)}
                      className="mt-2 text-xs text-blue-400/60 hover:text-blue-400"
                    >
                      + {t('addIngredient')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--muted-foreground)]">
            {selectedCount === 0
              ? t('importReview.noSelection')
              : `${selectedCount} / ${medications.length}`}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-lg transition-colors"
            >
              {t('importReview.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedCount === 0 || isLoading}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading
                ? '...'
                : t('importReview.confirm', { count: selectedCount })}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

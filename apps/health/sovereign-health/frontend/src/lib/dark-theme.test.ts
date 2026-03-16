// Sovereign Health Intelligence — AGPL-3.0 — https://sovereignhealth.io/
//
// Dark theme consistency tests — catches white backgrounds on selects,
// missing border colors, and hardcoded light-theme colors.
//
// These tests exist because:
// - The "Typ" select dropdown had a white background on dark theme
// - Inputs had inconsistent border styles (some `border` without color)
// - Select <option> elements need explicit bg-zinc-900 for dark mode

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findTsxFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (entry === 'node_modules' || entry === '.next') continue
    if (statSync(full).isDirectory()) {
      files.push(...findTsxFiles(full))
    } else if (entry.endsWith('.tsx')) {
      files.push(full)
    }
  }
  return files
}

const SRC_DIR = join(__dirname, '..')
const tsxFiles = findTsxFiles(join(SRC_DIR, 'app')).concat(findTsxFiles(join(SRC_DIR, 'components')))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('dark theme: select elements', () => {
  test('all <select> elements have dark background', () => {
    const violations: string[] = []

    for (const file of tsxFiles) {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line, i) => {
        // Find <select with className
        if (line.includes('<select') && line.includes('className')) {
          const hasClass = line.match(/className="([^"]*)"/)
          if (hasClass) {
            const cls = hasClass[1]
            // Must have dark bg — either bg-zinc-900, bg-zinc-800, or bg-white/5
            if (!cls.match(/bg-zinc-[89]00|bg-white\/5/)) {
              const rel = file.replace(SRC_DIR, 'src')
              violations.push(`${rel}:${i + 1} — select missing dark bg: "${cls.slice(0, 60)}..."`)
            }
          }
        }
      })
    }

    if (violations.length > 0) {
      throw new Error(
        `${violations.length} <select> elements without dark background:\n${violations.join('\n')}`
      )
    }
  })
})

describe('dark theme: no hardcoded light colors', () => {
  // Known exceptions: pages that intentionally use bg-white (e.g. print views, QR codes)
  // Update this count when fixing existing violations — it should only go DOWN.
  const KNOWN_BG_WHITE_COUNT = 8
  const KNOWN_TEXT_BLACK_COUNT = 1

  test('no NEW bg-white (without opacity) in component classNames', () => {
    const violations: string[] = []

    for (const file of tsxFiles) {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line, i) => {
        if (line.match(/bg-white(?!\/)\b/) && line.includes('className')) {
          const rel = file.replace(SRC_DIR, 'src')
          violations.push(`${rel}:${i + 1}`)
        }
      })
    }

    // Fail if NEW violations appear (count goes UP)
    if (violations.length > KNOWN_BG_WHITE_COUNT) {
      throw new Error(
        `${violations.length} bg-white found (was ${KNOWN_BG_WHITE_COUNT}). New violations:\n${violations.join('\n')}`
      )
    }
  })

  test('no NEW text-black in component classNames', () => {
    const violations: string[] = []

    for (const file of tsxFiles) {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line, i) => {
        if (line.includes('text-black') && line.includes('className')) {
          const rel = file.replace(SRC_DIR, 'src')
          violations.push(`${rel}:${i + 1}`)
        }
      })
    }

    if (violations.length > KNOWN_TEXT_BLACK_COUNT) {
      throw new Error(
        `${violations.length} text-black found (was ${KNOWN_TEXT_BLACK_COUNT}). New violations:\n${violations.join('\n')}`
      )
    }
  })
})

// ISO 3166-1 alpha-2 country list for signup country selector
export const COUNTRIES: { code: string; name: { en: string; de: string } }[] = [
  { code: 'DE', name: { en: 'Germany', de: 'Deutschland' } },
  { code: 'AT', name: { en: 'Austria', de: 'Österreich' } },
  { code: 'CH', name: { en: 'Switzerland', de: 'Schweiz' } },
  { code: 'US', name: { en: 'United States', de: 'Vereinigte Staaten' } },
  { code: 'GB', name: { en: 'United Kingdom', de: 'Vereinigtes Königreich' } },
  { code: 'FR', name: { en: 'France', de: 'Frankreich' } },
  { code: 'IT', name: { en: 'Italy', de: 'Italien' } },
  { code: 'ES', name: { en: 'Spain', de: 'Spanien' } },
  { code: 'NL', name: { en: 'Netherlands', de: 'Niederlande' } },
  { code: 'BE', name: { en: 'Belgium', de: 'Belgien' } },
  { code: 'PL', name: { en: 'Poland', de: 'Polen' } },
  { code: 'SE', name: { en: 'Sweden', de: 'Schweden' } },
  { code: 'DK', name: { en: 'Denmark', de: 'Dänemark' } },
  { code: 'NO', name: { en: 'Norway', de: 'Norwegen' } },
  { code: 'FI', name: { en: 'Finland', de: 'Finnland' } },
  { code: 'IE', name: { en: 'Ireland', de: 'Irland' } },
  { code: 'PT', name: { en: 'Portugal', de: 'Portugal' } },
  { code: 'CZ', name: { en: 'Czech Republic', de: 'Tschechien' } },
  { code: 'RO', name: { en: 'Romania', de: 'Rumänien' } },
  { code: 'HU', name: { en: 'Hungary', de: 'Ungarn' } },
  { code: 'GR', name: { en: 'Greece', de: 'Griechenland' } },
  { code: 'BG', name: { en: 'Bulgaria', de: 'Bulgarien' } },
  { code: 'HR', name: { en: 'Croatia', de: 'Kroatien' } },
  { code: 'SK', name: { en: 'Slovakia', de: 'Slowakei' } },
  { code: 'SI', name: { en: 'Slovenia', de: 'Slowenien' } },
  { code: 'LT', name: { en: 'Lithuania', de: 'Litauen' } },
  { code: 'LV', name: { en: 'Latvia', de: 'Lettland' } },
  { code: 'EE', name: { en: 'Estonia', de: 'Estland' } },
  { code: 'LU', name: { en: 'Luxembourg', de: 'Luxemburg' } },
  { code: 'MT', name: { en: 'Malta', de: 'Malta' } },
  { code: 'CY', name: { en: 'Cyprus', de: 'Zypern' } },
  { code: 'CA', name: { en: 'Canada', de: 'Kanada' } },
  { code: 'AU', name: { en: 'Australia', de: 'Australien' } },
  { code: 'NZ', name: { en: 'New Zealand', de: 'Neuseeland' } },
  { code: 'JP', name: { en: 'Japan', de: 'Japan' } },
  { code: 'KR', name: { en: 'South Korea', de: 'Südkorea' } },
  { code: 'SG', name: { en: 'Singapore', de: 'Singapur' } },
  { code: 'BR', name: { en: 'Brazil', de: 'Brasilien' } },
  { code: 'MX', name: { en: 'Mexico', de: 'Mexiko' } },
  { code: 'IN', name: { en: 'India', de: 'Indien' } },
  { code: 'ZA', name: { en: 'South Africa', de: 'Südafrika' } },
  { code: 'IL', name: { en: 'Israel', de: 'Israel' } },
  { code: 'TR', name: { en: 'Turkey', de: 'Türkei' } },
  { code: 'UA', name: { en: 'Ukraine', de: 'Ukraine' } },
  { code: 'IS', name: { en: 'Iceland', de: 'Island' } },
  { code: 'LI', name: { en: 'Liechtenstein', de: 'Liechtenstein' } },
]

export function detectCountryFromLocale(): string {
  if (typeof navigator === 'undefined') return ''
  const lang = navigator.language || ''
  // navigator.language is like "de-DE", "en-US", "fr-FR"
  const parts = lang.split('-')
  if (parts.length >= 2) {
    const country = parts[parts.length - 1].toUpperCase()
    if (country.length === 2 && COUNTRIES.some(c => c.code === country)) {
      return country
    }
  }
  return ''
}

/**
 * Date formatting utilities for Sovereign Health.
 *
 * Formats dates according to the user's country_code from their profile:
 *   DE/AT/CH  → DD.MM.YYYY, HH:mm (24h)
 *   US        → MM/DD/YYYY, h:mm a (12h)
 *   GB        → DD/MM/YYYY, HH:mm (24h)
 *   default   → YYYY-MM-DD, HH:mm (ISO, 24h)
 */

function toDate(date: Date | string): Date {
  if (date instanceof Date) return date;
  return new Date(date);
}

function localeFor(countryCode?: string | null): string {
  const code = countryCode?.toUpperCase();
  switch (code) {
    case "DE":
    case "AT":
    case "CH":
      return "de-DE";
    case "US":
      return "en-US";
    case "GB":
      return "en-GB";
    default:
      return "sv-SE"; // sv-SE gives ISO-style YYYY-MM-DD
  }
}

function isDefault(countryCode?: string | null): boolean {
  const code = countryCode?.toUpperCase();
  return !code || !["DE", "AT", "CH", "US", "GB"].includes(code);
}

function is24h(countryCode?: string | null): boolean {
  const code = countryCode?.toUpperCase();
  return code !== "US";
}

/**
 * Format date portion only.
 *   DE/AT/CH → DD.MM.YYYY
 *   US       → MM/DD/YYYY
 *   GB       → DD/MM/YYYY
 *   default  → YYYY-MM-DD
 */
export function formatDate(date: Date | string, countryCode?: string | null): string {
  const d = toDate(date);

  if (isDefault(countryCode)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const locale = localeFor(countryCode);
  const fmt = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return fmt.format(d);
}

/**
 * Format time portion only.
 *   US      → h:mm AM/PM (12h)
 *   others  → HH:mm (24h)
 */
export function formatTime(date: Date | string, countryCode?: string | null): string {
  const d = toDate(date);

  const locale = localeFor(countryCode);
  const use24 = is24h(countryCode);

  const fmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24,
  });

  return fmt.format(d);
}

/**
 * Format full date + time.
 *   DE/AT/CH → DD.MM.YYYY, HH:mm
 *   US       → MM/DD/YYYY, h:mm AM/PM
 *   GB       → DD/MM/YYYY, HH:mm
 *   default  → YYYY-MM-DD, HH:mm
 */
export function formatDateTime(date: Date | string, countryCode?: string | null): string {
  return `${formatDate(date, countryCode)}, ${formatTime(date, countryCode)}`;
}

/**
 * Format a short date (no year).
 *   US      → Mar 9
 *   others  → 9 Mar
 *   default → 9 Mar
 */
export function formatShortDate(date: Date | string, countryCode?: string | null): string {
  const d = toDate(date);
  const code = countryCode?.toUpperCase();

  const locale = code === "US" ? "en-US" : "en-GB";

  const fmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  });

  return fmt.format(d);
}

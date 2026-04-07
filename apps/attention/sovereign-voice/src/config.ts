import { config as dotenvConfig } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompanionNote {
  kind: 1;
  content: string;
}

export interface ScheduledNote {
  id: string;
  publishAt: string; // ISO 8601 timestamp or cron expression
  kind: 1 | 30023;
  content?: string;
  contentFile?: string;
  title?: string;
  slug?: string;
  summary?: string;
  hashtags?: string[];
  companion?: CompanionNote;
}

export interface ScheduleConfig {
  relays: string[];
  notes: ScheduledNote[];
}

export interface AppConfig {
  nsec: string;
  relays: string[];
  logFile: string;
  sovereignLinkApiUrl: string | null;
  sovereignLinkApiKey: string | null;
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

export function loadEnv(): AppConfig {
  dotenvConfig();

  const nsec = process.env.NOSTR_NSEC;
  if (!nsec) {
    throw new Error("NOSTR_NSEC is required. Set it in .env or as an environment variable.");
  }

  const relaysRaw = process.env.NOSTR_RELAYS || "";
  const relays = relaysRaw
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  const logFile = process.env.LOG_FILE || "./publish.log";

  const sovereignLinkApiUrl = process.env.SOVEREIGN_LINK_API_URL || null;
  const sovereignLinkApiKey = process.env.SOVEREIGN_LINK_API_KEY || null;

  return { nsec, relays, logFile, sovereignLinkApiUrl, sovereignLinkApiKey };
}

// ---------------------------------------------------------------------------
// Schedule file
// ---------------------------------------------------------------------------

export function loadSchedule(filePath: string): ScheduleConfig {
  const abs = resolve(filePath);
  if (!existsSync(abs)) {
    throw new Error(`Schedule file not found: ${abs}`);
  }

  const raw = readFileSync(abs, "utf-8");
  const data = JSON.parse(raw) as ScheduleConfig;

  if (!Array.isArray(data.relays) || data.relays.length === 0) {
    throw new Error("Schedule file must contain a non-empty 'relays' array.");
  }
  if (!Array.isArray(data.notes) || data.notes.length === 0) {
    throw new Error("Schedule file must contain a non-empty 'notes' array.");
  }

  return data;
}

// ---------------------------------------------------------------------------
// Resolve note content
// ---------------------------------------------------------------------------

export function resolveContent(note: ScheduledNote): string {
  if (note.content) return note.content;

  if (note.contentFile) {
    const abs = resolve(note.contentFile);
    if (!existsSync(abs)) {
      throw new Error(`Content file not found for note "${note.id}": ${abs}`);
    }
    return readFileSync(abs, "utf-8");
  }

  throw new Error(`Note "${note.id}" has neither 'content' nor 'contentFile'.`);
}

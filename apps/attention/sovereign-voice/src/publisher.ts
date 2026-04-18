import { finalizeEvent, nip19 } from "nostr-tools";
import { Relay } from "nostr-tools/relay";
import { appendFileSync } from "node:fs";
import type { AppConfig, NoteImage } from "./config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublishOptions {
  content: string;
  kind: 1 | 30023;
  tags?: string[][];
  image?: NoteImage;
}

export interface RelayResult {
  url: string;
  success: boolean;
  error?: string;
}

export interface PublishResult {
  eventId: string;
  relayResults: RelayResult[];
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function logLine(logFile: string, line: string): void {
  const ts = new Date().toISOString();
  const entry = `[${ts}] ${line}\n`;
  process.stdout.write(entry);
  try {
    appendFileSync(logFile, entry);
  } catch {
    // If we cannot write the log file, at least stdout got it.
  }
}

// ---------------------------------------------------------------------------
// Decode nsec to secret key bytes
// ---------------------------------------------------------------------------

function decodeNsec(nsec: string): Uint8Array {
  const decoded = nip19.decode(nsec);
  if (decoded.type !== "nsec") {
    throw new Error(`Expected nsec, got ${decoded.type}`);
  }
  return decoded.data;
}

// ---------------------------------------------------------------------------
// Publish to a single relay with retry
// ---------------------------------------------------------------------------

async function publishToRelay(
  url: string,
  event: ReturnType<typeof finalizeEvent>,
  maxRetries: number = 3,
  retryDelayMs: number = 2000
): Promise<RelayResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let relay: Relay | undefined;
    try {
      relay = await Relay.connect(url);
      await relay.publish(event);
      relay.close();
      return { url, success: true };
    } catch (err) {
      if (relay) {
        try { relay.close(); } catch { /* ignore */ }
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === maxRetries) {
        return { url, success: false, error: msg };
      }
      // Wait before retrying
      await new Promise((r) => setTimeout(r, retryDelayMs * attempt));
    }
  }

  // Should not reach here, but TypeScript needs it.
  return { url, success: false, error: "unknown" };
}

// ---------------------------------------------------------------------------
// Core publish function
// ---------------------------------------------------------------------------

export async function publish(
  config: AppConfig,
  relays: string[],
  options: PublishOptions
): Promise<PublishResult> {
  const sk = decodeNsec(config.nsec);

  // Attach image: URL appended to content (so plain-URL-detecting clients render
  // it inline) + NIP-92 imeta tag (so metadata-aware clients get dim/alt/hash).
  const { content, tags } = applyImage(options);

  // Pre-publish validation: warn if content references an image URL but we did
  // not build an imeta tag for it. This prevents the "image not shown" regression.
  warnIfImageUrlWithoutImeta(config.logFile, content, tags);

  const event = finalizeEvent(
    {
      kind: options.kind,
      content,
      tags,
      created_at: Math.floor(Date.now() / 1000),
    },
    sk
  );

  const eventId = event.id;
  const effectiveRelays = config.relays.length > 0 ? config.relays : relays;

  logLine(config.logFile, `Publishing event ${eventId} (kind ${options.kind}) to ${effectiveRelays.length} relays...`);

  const results = await Promise.all(
    effectiveRelays.map((url) => publishToRelay(url, event))
  );

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success);

  logLine(config.logFile, `Event ${eventId}: ${succeeded}/${effectiveRelays.length} relays OK`);

  for (const f of failed) {
    logLine(config.logFile, `  FAIL ${f.url}: ${f.error}`);
  }

  return { eventId, relayResults: results };
}

// ---------------------------------------------------------------------------
// Image attachment (NIP-92 imeta + plain-URL append)
// ---------------------------------------------------------------------------

const CONTENT_IMAGE_URL_REGEX =
  /https?:\/\/[^\s<>"')\]]+\.(?:jpe?g|png|gif|webp|avif|svg|bmp)(?:\?[^\s<>"')\]]*)?/gi;

export function buildImetaTag(image: NoteImage): string[] {
  const parts: string[] = ["imeta", `url ${image.url}`];
  if (image.mimeType) parts.push(`m ${image.mimeType}`);
  if (image.dim) parts.push(`dim ${image.dim}`);
  if (image.alt) parts.push(`alt ${image.alt}`);
  if (image.sha256) parts.push(`x ${image.sha256}`);
  return parts;
}

function applyImage(options: PublishOptions): { content: string; tags: string[][] } {
  const tags: string[][] = [...(options.tags ?? [])];
  let content = options.content;

  if (options.image) {
    // Append the URL to content only if it is not already there -- clients
    // render the first bare URL match inline.
    if (!content.includes(options.image.url)) {
      content = content.length > 0 ? `${content}\n\n${options.image.url}` : options.image.url;
    }
    tags.push(buildImetaTag(options.image));
  }

  return { content, tags };
}

function warnIfImageUrlWithoutImeta(
  logFile: string,
  content: string,
  tags: string[][]
): void {
  const imageUrls = content.match(CONTENT_IMAGE_URL_REGEX);
  if (!imageUrls || imageUrls.length === 0) return;

  const imetaUrls = new Set<string>();
  for (const tag of tags) {
    if (tag[0] !== "imeta") continue;
    for (const part of tag.slice(1)) {
      if (part.startsWith("url ")) imetaUrls.add(part.slice(4));
    }
  }

  for (const url of imageUrls) {
    if (!imetaUrls.has(url)) {
      logLine(
        logFile,
        `WARN image URL in content without imeta tag: ${url} -- some clients may not render it; declare an 'image' field on the note.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Build NIP-23 tags for long-form content
// ---------------------------------------------------------------------------

export function buildLongFormTags(options: {
  title?: string;
  slug?: string;
  summary?: string;
  hashtags?: string[];
}): string[][] {
  const tags: string[][] = [];

  if (options.slug) {
    tags.push(["d", options.slug]);
  }
  if (options.title) {
    tags.push(["title", options.title]);
  }
  if (options.summary) {
    tags.push(["summary", options.summary]);
  }

  tags.push(["published_at", String(Math.floor(Date.now() / 1000))]);

  if (options.hashtags) {
    for (const tag of options.hashtags) {
      tags.push(["t", tag]);
    }
  }

  return tags;
}

// ---------------------------------------------------------------------------
// Publish a kind 5 deletion event (for test cleanup)
// ---------------------------------------------------------------------------

export async function publishDeletion(
  config: AppConfig,
  relays: string[],
  eventId: string
): Promise<void> {
  const sk = decodeNsec(config.nsec);

  const event = finalizeEvent(
    {
      kind: 5,
      content: "test note cleanup",
      tags: [["e", eventId]],
      created_at: Math.floor(Date.now() / 1000),
    },
    sk
  );

  const effectiveRelays = config.relays.length > 0 ? config.relays : relays;

  await Promise.all(
    effectiveRelays.map((url) => publishToRelay(url, event, 1, 1000))
  );

  logLine(config.logFile, `Deletion event sent for ${eventId}`);
}

/**
 * URL shortening via Sovereign Link service account API.
 *
 * Extracts URLs from note content, shortens them via the Sovereign Link
 * service API, and replaces them in the text. Fails gracefully -- if
 * the API is unreachable or not configured, returns original content.
 */

import type { AppConfig } from "./config.js";

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g;
// Skip media URLs -- shortening them hides the file extension from NOSTR clients,
// which rely on it to decide whether to inline-render as image/video/audio.
const MEDIA_EXT_REGEX = /\.(jpe?g|png|gif|webp|avif|svg|bmp|ico|mp4|webm|mov|mp3|wav|m4a|ogg|opus|flac)(\?.*)?$/i;
const TIMEOUT_MS = 5000;

// In-memory cache to avoid duplicate API calls for the same URL
const cache = new Map<string, string>();

interface ShortenResult {
  content: string;
  shortened: number;
  errors: number;
}

/**
 * Shorten all URLs in the given content string.
 * Returns the content with URLs replaced by short links.
 * If Sovereign Link is not configured or unreachable, returns original content.
 */
export async function shortenUrls(
  content: string,
  config: AppConfig
): Promise<ShortenResult> {
  if (!config.sovereignLinkApiUrl || !config.sovereignLinkApiKey) {
    return { content, shortened: 0, errors: 0 };
  }

  const urls = content.match(URL_REGEX);
  if (!urls || urls.length === 0) {
    return { content, shortened: 0, errors: 0 };
  }

  // Deduplicate URLs
  const unique = [...new Set(urls)];
  let shortened = 0;
  let errors = 0;
  let result = content;

  for (const url of unique) {
    // Skip URLs that are already shortened (brickos.io/r/)
    if (url.includes("brickos.io/r/")) continue;

    // Skip media URLs -- clients need the extension to render inline
    if (MEDIA_EXT_REGEX.test(url)) continue;

    // Check cache first
    if (cache.has(url)) {
      result = result.replaceAll(url, cache.get(url)!);
      shortened++;
      continue;
    }

    try {
      const shortUrl = await createShortLink(url, config);
      if (shortUrl) {
        cache.set(url, shortUrl);
        result = result.replaceAll(url, shortUrl);
        shortened++;
      }
    } catch (err) {
      console.warn(`  [shortener] Failed to shorten ${url}: ${err}`);
      errors++;
    }
  }

  return { content: result, shortened, errors };
}

async function createShortLink(
  targetUrl: string,
  config: AppConfig
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(config.sovereignLinkApiUrl!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.sovereignLinkApiKey}`,
      },
      body: JSON.stringify({
        target_url: targetUrl,
        link_type: "voice",
        app_key: "sovereign-voice",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`  [shortener] API ${res.status}: ${body.slice(0, 100)}`);
      return null;
    }

    const data = (await res.json()) as { code?: string; id?: string };
    if (data.code) {
      return `https://brickos.io/r/${data.code}`;
    }

    return null;
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === "AbortError") {
      console.warn(`  [shortener] Timeout after ${TIMEOUT_MS}ms for ${targetUrl}`);
    }
    throw err;
  }
}

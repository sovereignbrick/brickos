import { Cron } from "croner";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { publish, buildLongFormTags } from "./publisher.js";
import { resolveContent } from "./config.js";
import { shortenUrls } from "./shortener.js";
import type { AppConfig, ScheduleConfig, ScheduledNote } from "./config.js";

// ---------------------------------------------------------------------------
// Published state tracking
// ---------------------------------------------------------------------------

const STATE_FILE = ".publish-state.json";

interface PublishState {
  [noteId: string]: {
    publishedAt: string;
    eventId: string;
  };
}

function loadState(): PublishState {
  const abs = resolve(STATE_FILE);
  if (!existsSync(abs)) return {};
  try {
    return JSON.parse(readFileSync(abs, "utf-8")) as PublishState;
  } catch {
    return {};
  }
}

function saveState(state: PublishState): void {
  writeFileSync(resolve(STATE_FILE), JSON.stringify(state, null, 2));
}

function isPublished(state: PublishState, noteId: string): boolean {
  return noteId in state;
}

function markPublished(state: PublishState, noteId: string, eventId: string): void {
  state[noteId] = {
    publishedAt: new Date().toISOString(),
    eventId,
  };
  saveState(state);
}

// ---------------------------------------------------------------------------
// Publish a single scheduled note
// ---------------------------------------------------------------------------

async function publishNote(
  config: AppConfig,
  relays: string[],
  note: ScheduledNote,
  state: PublishState
): Promise<void> {
  if (isPublished(state, note.id)) {
    console.log(`  Skipping "${note.id}" - already published.`);
    return;
  }

  let content = resolveContent(note);

  // Shorten URLs via Sovereign Link (graceful: publishes original if SL unavailable)
  const shortResult = await shortenUrls(content, config);
  content = shortResult.content;
  if (shortResult.shortened > 0) {
    console.log(`  Shortened ${shortResult.shortened} URL(s) via Sovereign Link`);
  }
  if (shortResult.errors > 0) {
    console.warn(`  ${shortResult.errors} URL(s) failed to shorten (publishing with originals)`);
  }

  const tags: string[][] = [];

  // Build tags based on kind
  if (note.kind === 30023) {
    tags.push(
      ...buildLongFormTags({
        title: note.title,
        slug: note.slug,
        summary: note.summary,
        hashtags: note.hashtags,
      })
    );
  } else if (note.hashtags) {
    for (const ht of note.hashtags) {
      tags.push(["t", ht]);
    }
  }

  const result = await publish(config, relays, {
    content,
    kind: note.kind,
    tags,
    image: note.image,
  });

  markPublished(state, note.id, result.eventId);

  // Publish companion kind 1 note if defined
  if (note.companion) {
    const companionId = `${note.id}__companion`;
    if (!isPublished(state, companionId)) {
      const companionTags: string[][] = [];
      if (note.hashtags) {
        for (const ht of note.hashtags) {
          companionTags.push(["t", ht]);
        }
      }

      const companionResult = await publish(config, relays, {
        content: note.companion.content,
        kind: 1,
        tags: companionTags,
        image: note.companion.image,
      });

      markPublished(state, companionId, companionResult.eventId);
    }
  }
}

// ---------------------------------------------------------------------------
// Check if a publishAt value is a cron expression
// ---------------------------------------------------------------------------

function isCronExpression(value: string): boolean {
  // Cron expressions have spaces separating fields (5 or 6 fields).
  // ISO timestamps start with a digit and contain "T".
  return !value.includes("T") && value.split(" ").length >= 5;
}

// ---------------------------------------------------------------------------
// One-shot mode: publish any notes whose time has come
// ---------------------------------------------------------------------------

export async function runOnce(
  config: AppConfig,
  schedule: ScheduleConfig
): Promise<void> {
  const state = loadState();
  const now = Date.now();

  console.log(`Checking ${schedule.notes.length} scheduled notes...`);

  for (const note of schedule.notes) {
    if (isPublished(state, note.id)) continue;

    if (isCronExpression(note.publishAt)) {
      // For cron expressions in one-shot mode, check if the cron would fire now.
      // This is handled by the daemon mode; skip in one-shot.
      console.log(`  Skipping "${note.id}" - cron expressions require daemon mode.`);
      continue;
    }

    const publishTime = new Date(note.publishAt).getTime();
    if (publishTime <= now) {
      console.log(`  Publishing "${note.id}" (due ${note.publishAt})...`);
      await publishNote(config, schedule.relays, note, state);
    } else {
      const minutes = Math.round((publishTime - now) / 60000);
      console.log(`  Waiting: "${note.id}" due in ${minutes} minutes.`);
    }
  }

  console.log("Done.");
}

// ---------------------------------------------------------------------------
// Daemon mode: keep running and fire notes at their scheduled times
// ---------------------------------------------------------------------------

export async function runDaemon(
  config: AppConfig,
  schedule: ScheduleConfig
): Promise<void> {
  const state = loadState();
  const jobs: Cron[] = [];

  console.log(`Starting scheduler daemon with ${schedule.notes.length} notes...`);

  // First pass: publish anything already due (fixed timestamps in the past)
  const now = Date.now();
  for (const note of schedule.notes) {
    if (isPublished(state, note.id)) {
      console.log(`  Already published: "${note.id}"`);
      continue;
    }

    if (isCronExpression(note.publishAt)) {
      // Schedule a cron job
      console.log(`  Scheduling cron for "${note.id}": ${note.publishAt}`);
      const job = new Cron(note.publishAt, async () => {
        const currentState = loadState();
        if (isPublished(currentState, note.id)) {
          job.stop();
          return;
        }
        console.log(`  Cron firing for "${note.id}"...`);
        await publishNote(config, schedule.relays, note, currentState);
        job.stop(); // One-time publish, stop after firing
      });
      jobs.push(job);
    } else {
      const publishTime = new Date(note.publishAt).getTime();

      if (publishTime <= now) {
        console.log(`  Publishing overdue "${note.id}"...`);
        await publishNote(config, schedule.relays, note, state);
      } else {
        // Schedule for future
        const delay = publishTime - now;
        const date = new Date(note.publishAt);
        console.log(`  Scheduling "${note.id}" for ${date.toISOString()} (in ${Math.round(delay / 60000)} min)`);

        const job = new Cron(date, async () => {
          const currentState = loadState();
          if (!isPublished(currentState, note.id)) {
            console.log(`  Timer firing for "${note.id}"...`);
            await publishNote(config, schedule.relays, note, currentState);
          }
        });
        jobs.push(job);
      }
    }
  }

  // Check if all notes are published
  const updatedState = loadState();
  const unpublished = schedule.notes.filter((n) => !isPublished(updatedState, n.id));

  if (unpublished.length === 0) {
    console.log("All notes already published. Nothing to schedule.");
    return;
  }

  console.log(`Daemon running. ${unpublished.length} notes pending. Press Ctrl+C to stop.`);

  // Keep the process alive
  await new Promise<void>((resolve) => {
    const check = setInterval(() => {
      const s = loadState();
      const remaining = schedule.notes.filter((n) => !isPublished(s, n.id));
      if (remaining.length === 0) {
        console.log("All notes published. Shutting down.");
        for (const job of jobs) job.stop();
        clearInterval(check);
        resolve();
      }
    }, 30000);

    process.on("SIGINT", () => {
      console.log("\nShutting down scheduler...");
      for (const job of jobs) job.stop();
      clearInterval(check);
      resolve();
    });

    process.on("SIGTERM", () => {
      console.log("\nShutting down scheduler...");
      for (const job of jobs) job.stop();
      clearInterval(check);
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// List notes and their status
// ---------------------------------------------------------------------------

export function listNotes(schedule: ScheduleConfig): void {
  const state = loadState();

  console.log(`\n  ${"ID".padEnd(35)} ${"KIND".padEnd(8)} ${"PUBLISH AT".padEnd(25)} STATUS`);
  console.log(`  ${"".padEnd(35, "-")} ${"".padEnd(8, "-")} ${"".padEnd(25, "-")} ------`);

  for (const note of schedule.notes) {
    const status = isPublished(state, note.id) ? "PUBLISHED" : "PENDING";
    const eventInfo = state[note.id] ? ` (${state[note.id].eventId.slice(0, 12)}...)` : "";
    console.log(
      `  ${note.id.padEnd(35)} ${String(note.kind).padEnd(8)} ${note.publishAt.padEnd(25)} ${status}${eventInfo}`
    );
  }

  console.log("");
}

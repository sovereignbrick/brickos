#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, loadSchedule, resolveContent } from "./config.js";
import { publish, buildLongFormTags, publishDeletion } from "./publisher.js";
import { runOnce, runDaemon, listNotes } from "./scheduler.js";

const program = new Command();

program
  .name("nostr-schedule")
  .description("Schedule and publish NOSTR notes to relays")
  .version("0.1.0");

// ---------------------------------------------------------------------------
// publish <note-file>
// ---------------------------------------------------------------------------

program
  .command("publish")
  .description("Publish a note immediately from a text file")
  .argument("<note-file>", "Path to a text file containing the note content")
  .option("-k, --kind <kind>", "Event kind (1 or 30023)", "1")
  .option("-t, --title <title>", "Title for NIP-23 long-form notes")
  .option("-s, --slug <slug>", "Slug / d-tag for NIP-23 long-form notes")
  .option("--summary <summary>", "Summary for NIP-23 long-form notes")
  .option("--tags <tags>", "Comma-separated hashtags")
  .option("-r, --relays <relays>", "Comma-separated relay URLs (overrides .env)")
  .action(async (noteFile: string, opts) => {
    try {
      const config = loadEnv();
      const content = readFileSync(resolve(noteFile), "utf-8");
      const kind = parseInt(opts.kind, 10) as 1 | 30023;

      const relays = opts.relays
        ? opts.relays.split(",").map((r: string) => r.trim())
        : config.relays;

      if (relays.length === 0) {
        console.error("Error: No relays configured. Set NOSTR_RELAYS in .env or use --relays.");
        process.exit(1);
      }

      const tags: string[][] = [];

      if (kind === 30023) {
        tags.push(
          ...buildLongFormTags({
            title: opts.title,
            slug: opts.slug,
            summary: opts.summary,
            hashtags: opts.tags?.split(","),
          })
        );
      } else if (opts.tags) {
        for (const ht of opts.tags.split(",")) {
          tags.push(["t", ht.trim()]);
        }
      }

      const result = await publish(config, relays, { content, kind, tags });

      const succeeded = result.relayResults.filter((r) => r.success).length;
      console.log(`\nPublished! Event ID: ${result.eventId}`);
      console.log(`Relays: ${succeeded}/${result.relayResults.length} succeeded`);
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// schedule <config-file>
// ---------------------------------------------------------------------------

program
  .command("schedule")
  .description("Run the scheduler from a JSON config file")
  .argument("<config-file>", "Path to schedule JSON file")
  .option("--once", "Run once (publish due notes and exit) instead of daemon mode")
  .action(async (configFile: string, opts) => {
    try {
      const config = loadEnv();
      const schedule = loadSchedule(configFile);

      if (opts.once) {
        await runOnce(config, schedule);
      } else {
        await runDaemon(config, schedule);
      }
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// list <config-file>
// ---------------------------------------------------------------------------

program
  .command("list")
  .description("List scheduled notes and their publish status")
  .argument("<config-file>", "Path to schedule JSON file")
  .action((configFile: string) => {
    try {
      const schedule = loadSchedule(configFile);
      listNotes(schedule);
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// test
// ---------------------------------------------------------------------------

program
  .command("test")
  .description("Publish a test note and request its deletion")
  .option("-r, --relays <relays>", "Comma-separated relay URLs")
  .action(async (opts) => {
    try {
      const config = loadEnv();
      const relays = opts.relays
        ? opts.relays.split(",").map((r: string) => r.trim())
        : config.relays;

      if (relays.length === 0) {
        console.error("Error: No relays configured. Set NOSTR_RELAYS in .env or use --relays.");
        process.exit(1);
      }

      console.log("Publishing test note...");
      const result = await publish(config, relays, {
        content: `NOSTR Scheduler test note - ${new Date().toISOString()} - this will be deleted shortly.`,
        kind: 1,
        tags: [["t", "test"]],
      });

      const succeeded = result.relayResults.filter((r) => r.success).length;
      console.log(`\nTest note published: ${result.eventId}`);
      console.log(`Relays: ${succeeded}/${result.relayResults.length} succeeded`);

      // Wait briefly, then request deletion
      console.log("\nWaiting 3 seconds before requesting deletion...");
      await new Promise((r) => setTimeout(r, 3000));

      console.log("Requesting deletion...");
      await publishDeletion(config, relays, result.eventId);
      console.log("Deletion event sent. Relays may take time to process it.");
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

program.parse();

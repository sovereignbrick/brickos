import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadSchedule, resolveContent } from "../src/config.js";
import type { ScheduledNote } from "../src/config.js";

// ---------------------------------------------------------------------------
// loadSchedule
// ---------------------------------------------------------------------------

describe("loadSchedule", () => {
  const tempFiles: string[] = [];

  function writeTempSchedule(data: unknown): string {
    const dir = mkdtempSync(join(tmpdir(), "sv-test-"));
    const filePath = join(dir, "schedule.json");
    writeFileSync(filePath, JSON.stringify(data));
    tempFiles.push(filePath);
    return filePath;
  }

  afterEach(() => {
    for (const f of tempFiles) {
      try { unlinkSync(f); } catch { /* ignore */ }
    }
    tempFiles.length = 0;
  });

  it("loads a valid schedule JSON", () => {
    const path = writeTempSchedule({
      relays: ["wss://relay.damus.io"],
      notes: [
        {
          id: "test-note",
          publishAt: "2026-04-06T10:00:00Z",
          kind: 1,
          content: "Hello nostr",
        },
      ],
    });

    const schedule = loadSchedule(path);
    assert.equal(schedule.relays.length, 1);
    assert.equal(schedule.relays[0], "wss://relay.damus.io");
    assert.equal(schedule.notes.length, 1);
    assert.equal(schedule.notes[0].id, "test-note");
  });

  it("rejects empty relays array", () => {
    const path = writeTempSchedule({
      relays: [],
      notes: [{ id: "n1", publishAt: "2026-04-06T10:00:00Z", kind: 1, content: "x" }],
    });

    assert.throws(
      () => loadSchedule(path),
      /non-empty 'relays'/,
    );
  });

  it("rejects empty notes array", () => {
    const path = writeTempSchedule({
      relays: ["wss://relay.example.com"],
      notes: [],
    });

    assert.throws(
      () => loadSchedule(path),
      /non-empty 'notes'/,
    );
  });

  it("throws when file does not exist", () => {
    assert.throws(
      () => loadSchedule("/tmp/nonexistent-schedule-file-12345.json"),
      /not found/,
    );
  });
});

// ---------------------------------------------------------------------------
// resolveContent
// ---------------------------------------------------------------------------

describe("resolveContent", () => {
  const tempFiles: string[] = [];

  afterEach(() => {
    for (const f of tempFiles) {
      try { unlinkSync(f); } catch { /* ignore */ }
    }
    tempFiles.length = 0;
  });

  it("returns inline content when content field is set", () => {
    const note: ScheduledNote = {
      id: "inline-test",
      publishAt: "2026-04-06T10:00:00Z",
      kind: 1,
      content: "This is inline content.",
    };

    assert.equal(resolveContent(note), "This is inline content.");
  });

  it("reads content from contentFile", () => {
    const dir = mkdtempSync(join(tmpdir(), "sv-test-"));
    const contentPath = join(dir, "article.md");
    writeFileSync(contentPath, "# Article from file\n\nBody text here.");
    tempFiles.push(contentPath);

    const note: ScheduledNote = {
      id: "file-test",
      publishAt: "2026-04-06T10:00:00Z",
      kind: 30023,
      contentFile: contentPath,
    };

    const result = resolveContent(note);
    assert.equal(result, "# Article from file\n\nBody text here.");
  });

  it("throws when neither content nor contentFile is provided", () => {
    const note: ScheduledNote = {
      id: "empty-test",
      publishAt: "2026-04-06T10:00:00Z",
      kind: 1,
    };

    assert.throws(
      () => resolveContent(note),
      /neither 'content' nor 'contentFile'/,
    );
  });

  it("throws when contentFile points to a missing file", () => {
    const note: ScheduledNote = {
      id: "missing-file-test",
      publishAt: "2026-04-06T10:00:00Z",
      kind: 30023,
      contentFile: "/tmp/nonexistent-content-file-99999.md",
    };

    assert.throws(
      () => resolveContent(note),
      /not found/,
    );
  });
});

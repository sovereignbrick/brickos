import { describe, it } from "node:test";
import assert from "node:assert/strict";

// The isCronExpression function is not exported, so we replicate its logic
// to test the detection pattern used in scheduler.ts.
// The function checks: no "T" in the string AND >= 5 space-separated fields.
function isCronExpression(value: string): boolean {
  return !value.includes("T") && value.split(" ").length >= 5;
}

describe("isCronExpression", () => {
  it("detects a standard 5-field cron expression", () => {
    assert.equal(isCronExpression("0 9 * * 1"), true);
    assert.equal(isCronExpression("*/5 * * * *"), true);
    assert.equal(isCronExpression("30 14 1 * *"), true);
  });

  it("detects a 6-field cron expression (with seconds)", () => {
    assert.equal(isCronExpression("0 0 9 * * 1"), true);
  });

  it("rejects ISO 8601 timestamps", () => {
    assert.equal(isCronExpression("2026-04-06T10:00:00Z"), false);
    assert.equal(isCronExpression("2026-12-25T00:00:00+01:00"), false);
    assert.equal(isCronExpression("2025-01-01T12:30:00"), false);
  });

  it("rejects a plain date string without T (edge case)", () => {
    // "2026-04-06" has no T and only 1 field, so it is not cron
    assert.equal(isCronExpression("2026-04-06"), false);
  });
});

describe("publishAt ISO parsing", () => {
  it("correctly parses an ISO timestamp to a Date", () => {
    const iso = "2026-04-06T10:00:00Z";
    const parsed = new Date(iso);
    assert.equal(parsed.getUTCFullYear(), 2026);
    assert.equal(parsed.getUTCMonth(), 3); // April is month index 3
    assert.equal(parsed.getUTCDate(), 6);
    assert.equal(parsed.getUTCHours(), 10);
    assert.equal(parsed.getUTCMinutes(), 0);
  });

  it("correctly parses an ISO timestamp with timezone offset", () => {
    const iso = "2026-04-06T12:00:00+02:00";
    const parsed = new Date(iso);
    // 12:00+02:00 = 10:00 UTC
    assert.equal(parsed.getUTCHours(), 10);
  });

  it("getTime() returns milliseconds for comparison", () => {
    const iso = "2026-04-06T10:00:00Z";
    const publishTime = new Date(iso).getTime();
    assert.equal(typeof publishTime, "number");
    assert.ok(publishTime > 0);
  });
});

describe("isPublished logic", () => {
  // Replicate the state structure used in scheduler.ts
  interface PublishState {
    [noteId: string]: {
      publishedAt: string;
      eventId: string;
    };
  }

  function isPublished(state: PublishState, noteId: string): boolean {
    return noteId in state;
  }

  it("returns false for a note not in state", () => {
    const state: PublishState = {};
    assert.equal(isPublished(state, "note-1"), false);
  });

  it("returns true for a note already in state", () => {
    const state: PublishState = {
      "note-1": {
        publishedAt: "2026-04-06T10:00:00Z",
        eventId: "abc123",
      },
    };
    assert.equal(isPublished(state, "note-1"), true);
  });

  it("skips already-published notes (simulated loop)", () => {
    const state: PublishState = {
      "note-1": { publishedAt: "2026-04-01T08:00:00Z", eventId: "aaa" },
    };

    const notes = [
      { id: "note-1", publishAt: "2026-04-01T08:00:00Z" },
      { id: "note-2", publishAt: "2026-04-06T10:00:00Z" },
    ];

    const pending = notes.filter((n) => !isPublished(state, n.id));
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, "note-2");
  });
});

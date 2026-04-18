import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shortenUrls } from "../src/shortener.js";
import type { AppConfig } from "../src/config.js";

// Config with shortener disabled -- exercises the short-circuit branch
const disabledConfig: AppConfig = {
  nsec: "nsec1dummy",
  relays: [],
  logFile: "/tmp/sv-test.log",
  sovereignLinkApiUrl: null,
  sovereignLinkApiKey: null,
};

// Config pointing at a non-existent endpoint; every shorten call throws and is
// counted as an error, so the original URL survives in the output. This lets us
// test that media URLs are NOT even attempted against the API.
const enabledButBrokenConfig: AppConfig = {
  nsec: "nsec1dummy",
  relays: [],
  logFile: "/tmp/sv-test.log",
  sovereignLinkApiUrl: "http://127.0.0.1:1/does-not-exist",
  sovereignLinkApiKey: "test-key",
};

describe("shortenUrls -- media-URL preservation (fixes image-not-rendering bug)", () => {
  it("preserves direct image URLs when shortener is disabled", async () => {
    const input = "Check this chart https://sovereignhealth.io/assets/chart.png";
    const result = await shortenUrls(input, disabledConfig);

    assert.equal(result.content, input, "content must be untouched when shortener is off");
    assert.equal(result.shortened, 0);
    assert.equal(result.errors, 0);
  });

  it("skips media URLs even when shortener is enabled", async () => {
    const cases = [
      "Look: https://example.com/photo.jpg",
      "Look: https://example.com/photo.jpeg",
      "Look: https://example.com/photo.png",
      "Look: https://example.com/photo.gif",
      "Look: https://example.com/photo.webp",
      "Look: https://example.com/photo.avif",
      "Look: https://example.com/photo.svg",
      "Watch: https://example.com/clip.mp4",
      "Watch: https://example.com/clip.webm",
      "Listen: https://example.com/track.mp3",
    ];

    for (const input of cases) {
      const result = await shortenUrls(input, enabledButBrokenConfig);
      assert.equal(result.content, input, `media URL must not be shortened: ${input}`);
      assert.equal(result.shortened, 0, `no shortening counted for ${input}`);
      assert.equal(result.errors, 0, `no errors counted (media should be skipped pre-fetch) for ${input}`);
    }
  });

  it("skips media URLs carrying query strings (e.g. CDN cache busters)", async () => {
    const input = "Cache-busted: https://cdn.example.com/img.jpg?v=123&w=800";
    const result = await shortenUrls(input, enabledButBrokenConfig);
    assert.equal(result.content, input);
    assert.equal(result.errors, 0);
  });

  it("does not count already-shortened URLs as errors", async () => {
    const input = "Already short: https://brickos.io/r/abc123";
    const result = await shortenUrls(input, enabledButBrokenConfig);
    assert.equal(result.content, input);
    assert.equal(result.errors, 0);
  });

  it("is case-insensitive on the extension (.JPG vs .jpg)", async () => {
    const input = "Upper: https://example.com/PHOTO.JPG";
    const result = await shortenUrls(input, enabledButBrokenConfig);
    assert.equal(result.content, input);
    assert.equal(result.errors, 0);
  });
});

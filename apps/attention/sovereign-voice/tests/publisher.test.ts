import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLongFormTags, buildImetaTag } from "../src/publisher.js";

describe("buildLongFormTags", () => {
  it("returns correct d-tag, title, summary, hashtags, and published_at", () => {
    const before = Math.floor(Date.now() / 1000);

    const tags = buildLongFormTags({
      slug: "my-article",
      title: "My Article",
      summary: "A short summary",
      hashtags: ["nostr", "bitcoin"],
    });

    const after = Math.floor(Date.now() / 1000);

    // d-tag
    const dTag = tags.find((t) => t[0] === "d");
    assert.ok(dTag, "should have a d-tag");
    assert.equal(dTag[1], "my-article");

    // title
    const titleTag = tags.find((t) => t[0] === "title");
    assert.ok(titleTag, "should have a title tag");
    assert.equal(titleTag[1], "My Article");

    // summary
    const summaryTag = tags.find((t) => t[0] === "summary");
    assert.ok(summaryTag, "should have a summary tag");
    assert.equal(summaryTag[1], "A short summary");

    // published_at
    const pubTag = tags.find((t) => t[0] === "published_at");
    assert.ok(pubTag, "should have a published_at tag");
    const ts = Number(pubTag[1]);
    assert.ok(ts >= before && ts <= after, "published_at should be current unix timestamp");

    // hashtags
    const tTags = tags.filter((t) => t[0] === "t");
    assert.equal(tTags.length, 2);
    assert.equal(tTags[0][1], "nostr");
    assert.equal(tTags[1][1], "bitcoin");
  });

  it("handles missing optional fields gracefully", () => {
    const tags = buildLongFormTags({});

    // Should only have published_at
    const dTag = tags.find((t) => t[0] === "d");
    assert.equal(dTag, undefined, "no d-tag when slug is missing");

    const titleTag = tags.find((t) => t[0] === "title");
    assert.equal(titleTag, undefined, "no title tag when title is missing");

    const summaryTag = tags.find((t) => t[0] === "summary");
    assert.equal(summaryTag, undefined, "no summary tag when summary is missing");

    const tTags = tags.filter((t) => t[0] === "t");
    assert.equal(tTags.length, 0, "no hashtag tags when hashtags is missing");

    const pubTag = tags.find((t) => t[0] === "published_at");
    assert.ok(pubTag, "published_at is always present");
  });

  it("produces correct publish options shape for kind 30023", () => {
    const content = "# Hello World\n\nThis is a long-form article.";
    const tags = buildLongFormTags({
      slug: "hello-world",
      title: "Hello World",
    });

    const options = {
      content,
      kind: 30023 as const,
      tags,
    };

    assert.equal(options.kind, 30023);
    assert.equal(options.content, content);
    assert.ok(Array.isArray(options.tags));
    assert.ok(options.tags.some((t) => t[0] === "d" && t[1] === "hello-world"));
  });

  it("produces correct publish options shape for kind 1", () => {
    const content = "A short note on nostr.";

    const options = {
      content,
      kind: 1 as const,
      tags: [["t", "nostr"]],
    };

    assert.equal(options.kind, 1);
    assert.equal(options.content, content);
    assert.deepEqual(options.tags, [["t", "nostr"]]);
  });
});

describe("buildImetaTag (NIP-92 -- fixes image-not-rendering bug)", () => {
  it("emits url + known metadata fields in the NIP-92 space-separated format", () => {
    const tag = buildImetaTag({
      url: "https://cdn.example.com/chart.png",
      mimeType: "image/png",
      dim: "1200x630",
      alt: "BTC price chart",
      sha256: "deadbeef",
    });

    assert.equal(tag[0], "imeta");
    assert.ok(tag.includes("url https://cdn.example.com/chart.png"));
    assert.ok(tag.includes("m image/png"));
    assert.ok(tag.includes("dim 1200x630"));
    assert.ok(tag.includes("alt BTC price chart"));
    assert.ok(tag.includes("x deadbeef"));
  });

  it("omits optional fields when not provided", () => {
    const tag = buildImetaTag({ url: "https://example.com/a.jpg" });
    assert.deepEqual(tag, ["imeta", "url https://example.com/a.jpg"]);
  });
});

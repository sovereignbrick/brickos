/**
 * k6 baseline load test -- Sovereign Health API (public endpoints only)
 *
 * Tests unauthenticated endpoints for baseline performance metrics.
 * For authenticated endpoint testing, see api.js.
 *
 * Usage:
 *   # Smoke run (2 VUs, 10s)
 *   k6 run --duration 10s --vus 2 load-tests/baseline.js
 *
 *   # Full baseline (ramp profile below)
 *   k6 run load-tests/baseline.js
 *
 *   # Against staging
 *   k6 run -e API_URL=https://api-demo.sovereignhealth.io load-tests/baseline.js
 *
 *   # Against local Docker
 *   k6 run -e API_URL=http://localhost:8080 load-tests/baseline.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const healthDuration = new Trend("health_duration");
const searchDuration = new Trend("search_duration");
const demoDuration = new Trend("demo_duration");

export const options = {
  stages: [
    { duration: "30s", target: 10 }, // ramp up
    { duration: "1m", target: 10 }, // steady state
    { duration: "10s", target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95th percentile < 500ms
    http_req_failed: ["rate<0.01"], // < 1% error rate
    errors: ["rate<0.01"],
    health_duration: ["p(95)<100"], // health should be fast
    search_duration: ["p(95)<500"],
    demo_duration: ["p(95)<500"],
  },
};

const BASE = __ENV.API_URL || "http://localhost:8080";

export default function () {
  // ── Health check ────────────────────────────────────────────────
  {
    const start = Date.now();
    const res = http.get(`${BASE}/health`);
    healthDuration.add(Date.now() - start);
    const ok = check(res, {
      "health 200": (r) => r.status === 200,
      "health has status ok": (r) => {
        try {
          return JSON.parse(r.body).status === "ok";
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  }

  // ── Public search ───────────────────────────────────────────────
  {
    const start = Date.now();
    const res = http.get(`${BASE}/api/v1/search?q=glucose&locale=en&limit=5`);
    searchDuration.add(Date.now() - start);
    const ok = check(res, {
      "search 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  }

  // ── Search suggest ──────────────────────────────────────────────
  {
    const res = http.get(
      `${BASE}/api/v1/search/suggest?q=gluc&locale=en&limit=5`
    );
    const ok = check(res, {
      "suggest 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  }

  // ── Public tier features ────────────────────────────────────────
  {
    const res = http.get(`${BASE}/api/tiers/features`);
    const ok = check(res, {
      "tiers/features 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  }

  // ── Demo zones ─────────────────────────────────────────────────
  {
    const start = Date.now();
    const res = http.get(`${BASE}/demo/zones`);
    demoDuration.add(Date.now() - start);
    const ok = check(res, {
      "demo zones 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  }

  // ── Demo measurements ──────────────────────────────────────────
  {
    const res = http.get(`${BASE}/demo/measurements`);
    const ok = check(res, {
      "demo measurements 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  }

  sleep(1);
}

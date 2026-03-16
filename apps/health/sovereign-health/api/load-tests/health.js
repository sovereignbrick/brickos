/**
 * k6 load test — health-tracker-backend
 *
 * Requirements: https://k6.io/docs/getting-started/installation/
 *
 * Usage:
 *   # Smoke run (1 user, 10s)
 *   k6 run load-tests/health.js
 *
 *   # Load test (50 concurrent users, 2 minutes)
 *   k6 run --vus 50 --duration 2m load-tests/health.js
 *
 *   # Stress test (ramp up to 200 users)
 *   k6 run --stage 30s:50,1m:200,30s:0 load-tests/health.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");

export const options = {
  // Default: smoke run
  vus: 1,
  duration: "10s",

  thresholds: {
    // 99% of requests must complete under 200ms
    http_req_duration: ["p(99)<200"],
    // Error rate must be below 1%
    errors: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

export default function () {
  // Test /health
  const healthRes = http.get(`${BASE_URL}/health`);
  const healthOk = check(healthRes, {
    "GET /health status 200": (r) => r.status === 200,
    "GET /health has status field": (r) => JSON.parse(r.body).status === "ok",
    "GET /health response time < 100ms": (r) => r.timings.duration < 100,
  });
  errorRate.add(!healthOk);

  // Test /api/v1/hello
  const helloRes = http.get(`${BASE_URL}/api/v1/hello`);
  const helloOk = check(helloRes, {
    "GET /api/v1/hello status 200": (r) => r.status === 200,
    "GET /api/v1/hello has message": (r) => !!JSON.parse(r.body).message,
    "GET /api/v1/hello response time < 100ms": (r) => r.timings.duration < 100,
  });
  errorRate.add(!helloOk);

  sleep(0.1);
}

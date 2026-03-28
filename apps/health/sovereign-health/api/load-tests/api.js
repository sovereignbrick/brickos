/**
 * k6 load test — Sovereign Health API (authenticated endpoints)
 *
 * Requirements: https://k6.io/docs/getting-started/installation/
 *
 * Usage:
 *   # Smoke run (1 user, 30s)
 *   k6 run load-tests/api.js
 *
 *   # Load test (20 concurrent users, 2 minutes)
 *   k6 run --vus 20 --duration 2m load-tests/api.js
 *
 *   # Against staging
 *   k6 run -e BASE_URL=https://api-demo.sovereignhealth.io -e EMAIL=demo@sovereignhealth.io -e PASSWORD=SovereignDemo1 load-tests/api.js
 *
 * Environment variables:
 *   BASE_URL  - API base URL (default: http://localhost:8080)
 *   EMAIL     - Login email
 *   PASSWORD  - Login password
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const loginDuration = new Trend("login_duration");
const dashboardDuration = new Trend("dashboard_duration");
const measurementsDuration = new Trend("measurements_duration");
const licenseDuration = new Trend("license_duration");

export const options = {
  // Default: smoke run
  vus: 1,
  duration: "30s",

  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    errors: ["rate<0.05"],
    login_duration: ["p(95)<1000"],
    dashboard_duration: ["p(95)<2000"],
    measurements_duration: ["p(95)<1000"],
    license_duration: ["p(95)<500"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const EMAIL = __ENV.EMAIL || "demo@sovereignhealth.io";
const PASSWORD = __ENV.PASSWORD || "SovereignDemo1";

let authToken = null;

export function setup() {
  // Login once to get token
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" } }
  );

  const ok = check(loginRes, {
    "login status 200": (r) => r.status === 200,
    "login returns token": (r) => {
      try {
        const body = JSON.parse(r.body);
        return !!(body.token || body.data?.token);
      } catch {
        return false;
      }
    },
  });

  if (!ok) {
    console.error(`Login failed: ${loginRes.status} ${loginRes.body}`);
    return { token: null };
  }

  const body = JSON.parse(loginRes.body);
  const token = body.token || body.data?.token;
  return { token };
}

function authHeaders(data) {
  return {
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
  };
}

export default function (data) {
  if (!data.token) {
    console.error("No auth token, skipping iteration");
    errorRate.add(true);
    sleep(1);
    return;
  }

  // Health check (unauthenticated)
  group("health", function () {
    const res = http.get(`${BASE_URL}/health`);
    const ok = check(res, {
      "health 200": (r) => r.status === 200,
      "health has version": (r) => {
        try {
          return !!JSON.parse(r.body).version;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  // Zones (dashboard data)
  group("zones", function () {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/zones`, authHeaders(data));
    dashboardDuration.add(Date.now() - start);
    const ok = check(res, {
      "zones 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  // Markers list
  group("markers", function () {
    const res = http.get(`${BASE_URL}/markers`, authHeaders(data));
    const ok = check(res, {
      "markers 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  // Measurements list
  group("measurements", function () {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/measurements?per_page=20`,
      authHeaders(data)
    );
    measurementsDuration.add(Date.now() - start);
    const ok = check(res, {
      "measurements 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  // License/tier info
  group("license", function () {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/license`, authHeaders(data));
    licenseDuration.add(Date.now() - start);
    const ok = check(res, {
      "license 200": (r) => r.status === 200,
      "license has tier": (r) => {
        try {
          const body = JSON.parse(r.body);
          return !!(body.tier || body.data?.tier);
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  // Tier features matrix
  group("tier-features", function () {
    const res = http.get(
      `${BASE_URL}/license/tiers`,
      authHeaders(data)
    );
    const ok = check(res, {
      "tiers 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  // Doctor chat conversations list
  group("doctor-chat", function () {
    const res = http.get(
      `${BASE_URL}/doctor-chat/conversations`,
      authHeaders(data)
    );
    const ok = check(res, {
      "conversations 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  // User settings
  group("settings", function () {
    const res = http.get(
      `${BASE_URL}/settings`,
      authHeaders(data)
    );
    const ok = check(res, {
      "settings 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(0.5);
}

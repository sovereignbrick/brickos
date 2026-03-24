import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  ExpirationPlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const apiCacheRules: RuntimeCaching[] = [
  // Content endpoints — cache-first (rarely changes)
  {
    matcher: ({ url }) => url.pathname.startsWith("/v1/content/") || url.pathname.startsWith("/api/v1/content/"),
    handler: new CacheFirst({
      cacheName: "api-content",
      plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 3600 })],
    }),
  },
  // Public config/tiers — cache-first
  {
    matcher: ({ url }) => url.pathname.startsWith("/api/tiers/") || url.pathname.startsWith("/api/config/"),
    handler: new CacheFirst({
      cacheName: "api-config",
      plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 1800 })],
    }),
  },
  // Dashboard — network-first, fallback to stale cache
  {
    matcher: ({ url }) => url.pathname.includes("/dashboard"),
    handler: new NetworkFirst({
      cacheName: "api-dashboard",
      plugins: [new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 600 })],
    }),
  },
  // Measurements — network-first, fallback to stale cache
  {
    matcher: ({ url }) => url.pathname.includes("/measurements"),
    handler: new NetworkFirst({
      cacheName: "api-measurements",
      plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 600 })],
    }),
  },
  // Markers (user) — network-first
  {
    matcher: ({ url }) => url.pathname.includes("/markers/") && !url.pathname.startsWith("/v1/content/"),
    handler: new NetworkFirst({
      cacheName: "api-markers",
      plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 600 })],
    }),
  },
  // Zones — cache-first (stable data)
  {
    matcher: ({ url }) => url.pathname.includes("/zones/"),
    handler: new CacheFirst({
      cacheName: "api-zones",
      plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 3600 })],
    }),
  },
  // Auth, billing, affiliate — network-only (security-sensitive / real-time)
  {
    matcher: ({ url }) =>
      url.pathname.startsWith("/api/v1/auth/") ||
      url.pathname.startsWith("/auth/") ||
      url.pathname.startsWith("/billing/") ||
      url.pathname.startsWith("/api/affiliate/"),
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...apiCacheRules, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// --- Push Notifications ---

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || "Sovereign Health", {
        body: data.body || "",
        icon: "/android-chrome-192x192.png",
        badge: "/favicon-32x32.png",
        data: { url: data.url || "/dashboard" },
      })
    );
  } catch {
    // Invalid push payload
  }
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          return (client as WindowClient).navigate(url);
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

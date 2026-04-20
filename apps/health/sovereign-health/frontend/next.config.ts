import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@brickos/ui"],
  env: {
    NEXT_PUBLIC_APP_VERSION: require("./package.json").version,
  },
  async headers() {
    return [
      {
        // Prevent caching on auth-sensitive pages - fixes Chrome serving stale content
        source: "/(checkout|signup|login|billing|settings)(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/pricing",
        destination: "https://sovereignhealth.io/pricing",
        permanent: true,
      },
      // Sprint 046 #570: /org/* folded into /platform/org/*
      {
        source: "/org",
        destination: "/platform/org",
        permanent: true,
      },
      {
        source: "/org/:path*",
        destination: "/platform/org/:path*",
        permanent: true,
      },
      // Sprint 046 #572: /admin hard-removed; legacy route redirects to the
      // unified /platform admin home. No users / no bookmarks to preserve,
      // so 308 permanent.
      {
        source: "/admin",
        destination: "/platform",
        permanent: true,
      },
      {
        source: "/admin/:path*",
        destination: "/platform",
        permanent: true,
      },
      // Sprint 047 #577: SHI end-user routes moved under /sovereign-health/*
      // so each URL names the app it belongs to. 308 the old root paths to
      // the new prefixed ones for a 90-day window; remove after audit.
      //
      // `missing` host guard: on the SHI-branded domain sovereignhealth.io
      // we want /dashboard to STAY clean in the URL bar (Phase C does an
      // internal nginx rewrite to /sovereign-health/dashboard before Next.js
      // sees it). Firing the 308 there would flip /dashboard to the ugly
      // /sovereign-health/dashboard in the browser. The guard skips the
      // redirect on any sovereignhealth.io hostname.
      ...(() => {
        const legacyShiPaths = [
          'dashboard',
          'measurements',
          'doctor-chat',
          'markers',
          'trends',
          'zones',
          'practitioner',
        ] as const
        const skipOnSovereignHealth = [
          { type: 'host', value: '.*sovereignhealth\\.io' },
        ] as const
        return legacyShiPaths.flatMap(p => [
          {
            source: `/${p}`,
            destination: `/sovereign-health/${p}`,
            permanent: true,
            missing: skipOnSovereignHealth as unknown as { type: 'host'; value: string }[],
          },
          {
            source: `/${p}/:path*`,
            destination: `/sovereign-health/${p}/:path*`,
            permanent: true,
            missing: skipOnSovereignHealth as unknown as { type: 'host'; value: string }[],
          },
        ])
      })(),
    ];
  },
};

export default withSerwist(withNextIntl(nextConfig));

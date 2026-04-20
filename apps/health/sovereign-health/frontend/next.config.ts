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
    ];
  },
};

export default withSerwist(withNextIntl(nextConfig));

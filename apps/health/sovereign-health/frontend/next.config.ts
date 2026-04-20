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
      { source: "/dashboard", destination: "/sovereign-health/dashboard", permanent: true },
      { source: "/dashboard/:path*", destination: "/sovereign-health/dashboard/:path*", permanent: true },
      { source: "/measurements", destination: "/sovereign-health/measurements", permanent: true },
      { source: "/measurements/:path*", destination: "/sovereign-health/measurements/:path*", permanent: true },
      { source: "/doctor-chat", destination: "/sovereign-health/doctor-chat", permanent: true },
      { source: "/doctor-chat/:path*", destination: "/sovereign-health/doctor-chat/:path*", permanent: true },
      { source: "/markers", destination: "/sovereign-health/markers", permanent: true },
      { source: "/markers/:path*", destination: "/sovereign-health/markers/:path*", permanent: true },
      { source: "/trends", destination: "/sovereign-health/trends", permanent: true },
      { source: "/trends/:path*", destination: "/sovereign-health/trends/:path*", permanent: true },
      { source: "/zones", destination: "/sovereign-health/zones", permanent: true },
      { source: "/zones/:path*", destination: "/sovereign-health/zones/:path*", permanent: true },
      { source: "/practitioner", destination: "/sovereign-health/practitioner", permanent: true },
      { source: "/practitioner/:path*", destination: "/sovereign-health/practitioner/:path*", permanent: true },
    ];
  },
};

export default withSerwist(withNextIntl(nextConfig));

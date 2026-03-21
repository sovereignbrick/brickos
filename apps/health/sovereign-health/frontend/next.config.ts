import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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
    ];
  },
};

export default withNextIntl(nextConfig);

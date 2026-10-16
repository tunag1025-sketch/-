import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // kuromoji는 런타임에 사전 파일을 읽으므로 번들하지 않고, 사전 파일을 서버 함수에 포함시킨다.
  serverExternalPackages: ["kuromoji"],
  outputFileTracingIncludes: {
    "/api/tokenize": ["./node_modules/kuromoji/dict/**/*"],
    "/api/analyze": ["./node_modules/kuromoji/dict/**/*"],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;

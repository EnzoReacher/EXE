import type { NextConfig } from "next";
import { PRIVATE_NO_STORE_HEADERS, SECURITY_HEADERS } from "./src/lib/http/security-headers";

const nextConfig: NextConfig = {
  experimental: {
    // Proxy truncates rather than rejects: retain one byte beyond intake's limit
    // so oversized chunked bodies cannot become successful partial documents.
    proxyClientMaxBodySize: 5 * 1024 * 1024 + 1,
    // The TypeScript API avoids depending on captured child-process output during builds.
    useTypeScriptCli: false,
  },
  async headers() {
    return [
      { source: "/:path*", headers: [...SECURITY_HEADERS] },
      { source: "/api/:path*", headers: [...PRIVATE_NO_STORE_HEADERS] },
      ...["/app/:path*", "/cv-review", "/experience-translator", "/assessment", "/saved-work", "/analysis/:path*", "/credential-versions/:path*", "/expert/:path*", "/opportunities"].map((source) => ({
        source, headers: [...PRIVATE_NO_STORE_HEADERS, { key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
      {
        source: "/review/:path*",
        headers: [
          ...PRIVATE_NO_STORE_HEADERS,
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;

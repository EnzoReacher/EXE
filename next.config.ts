import type { NextConfig } from "next";
import { PRIVATE_NO_STORE_HEADERS, SECURITY_HEADERS } from "./src/lib/http/security-headers";

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: [...SECURITY_HEADERS] },
      { source: "/api/:path*", headers: [...PRIVATE_NO_STORE_HEADERS] },
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

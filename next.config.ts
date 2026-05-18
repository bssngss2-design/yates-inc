import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/upd", destination: "/update", permanent: false }];
  },
};

export default nextConfig;

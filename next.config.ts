import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the Raspberry Pi load the dev server over the LAN later (npm run dev:lan).
  // Add your laptop's LAN IP or hostname here when you get to Phase 3.
  allowedDevOrigins: [],
};

export default nextConfig;

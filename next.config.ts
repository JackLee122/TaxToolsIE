import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module and must run un-bundled on the Node server.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
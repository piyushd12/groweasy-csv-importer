import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow importing from the shared workspace package
  transpilePackages: ["@groweasy/shared"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  // Env variables available at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  },
};

export default nextConfig;

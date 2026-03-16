import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ramcar/ui", "@ramcar/shared", "@ramcar/store"],
};

export default nextConfig;

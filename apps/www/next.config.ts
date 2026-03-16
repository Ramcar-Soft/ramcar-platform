import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ramcar/ui", "@ramcar/shared"],
};

export default nextConfig;

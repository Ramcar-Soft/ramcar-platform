import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@ramcar/ui", "@ramcar/shared", "@ramcar/store", "@ramcar/i18n", "@ramcar/features"],
};

export default withNextIntl(nextConfig);

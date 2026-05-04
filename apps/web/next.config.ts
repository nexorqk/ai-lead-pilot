import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
  transpilePackages: ["@leadpilot/shared", "@leadpilot/ui"]
};

export default nextConfig;

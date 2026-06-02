import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  /* config options here */
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/.git/**",
          "**/node_modules/**",
          "**/.next/**",
          "**/.next-smoke/**",
          "**/.playwright-mcp/**",
          "**/dev.log",
          "**/server.log",
        ],
      };
    }

    return config;
  },
};

export default nextConfig;

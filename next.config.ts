import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: `/${process.env.GITHUB_OWNER ?? "*"}/${process.env.GITHUB_REPO ?? "rs-backoffice"}/${process.env.GITHUB_ASSETS_BRANCH ?? "assets"}/**`,
      },
    ],
  },
};

export default nextConfig;

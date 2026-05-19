import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "20mb" },
  },
  serverExternalPackages: ["nodemailer", "@prisma/adapter-pg", "pg"],
  async headers() {
    const allowedOrigin = process.env.ALLOWED_ORIGINS || "*";
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: allowedOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, Cookie, X-Requested-With" },
        ],
      },
    ];
  },
};

export default nextConfig;

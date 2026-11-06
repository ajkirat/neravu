import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Bank alert emails (.eml) and complaint photos are uploaded through server actions. Photos are
    // shrunk on the phone first; Vercel itself caps a request at about 4.5 MB.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;

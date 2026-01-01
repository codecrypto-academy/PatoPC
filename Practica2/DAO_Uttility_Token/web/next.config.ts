import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  env: {
    NEXT_PUBLIC_DAO_ADDRESS: process.env.NEXT_PUBLIC_DAO_ADDRESS,
    NEXT_PUBLIC_FORWARDER_ADDRESS: process.env.NEXT_PUBLIC_FORWARDER_ADDRESS,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  },
};

export default nextConfig;

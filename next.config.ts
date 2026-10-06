import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // El servidor de deploy tiene pocos recursos y el build se colgaba a los 15
  // minutos (en local tarda ~25s). TypeScript se verifica en local con
  // `npm run typecheck` antes de subir, así que en el build se saltea.
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
      },
    ],
  },
  experimental: {
    // Un solo worker para no agotar la memoria del servidor de build.
    cpus: 1,
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

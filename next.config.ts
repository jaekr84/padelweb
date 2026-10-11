import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
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
  // Media de la landing: sin esto Next sirve /public con max-age=0 y cada
  // visita vuelve a pedir los videos del hero. Un mes de caché; si un archivo
  // cambia, se publica con otro nombre (remateN-web.mp4 → remateN-web2.mp4).
  async headers() {
    const longCache = [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }];
    return [
      { source: "/mp4/:path*", headers: longCache },
      { source: "/img/landing/:path*", headers: longCache },
    ];
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

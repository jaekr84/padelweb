import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/onboarding/'],
    },
    sitemap: 'https://acap-padel.com.ar/sitemap.xml',
  };
}

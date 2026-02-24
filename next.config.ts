
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Genkit y sus dependencias de servidor deben marcarse como externas
  // Eliminamos express y body-parser para evitar errores de compilación y vulnerabilidades en Vercel
  serverExternalPackages: [
    'genkit', 
    '@genkit-ai/core', 
    '@genkit-ai/google-genai', 
    '@genkit-ai/ai'
  ],
};

export default nextConfig;

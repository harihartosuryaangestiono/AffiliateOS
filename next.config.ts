import type {NextConfig} from 'next';
// Keep conventional Next.js artifacts separate from the Sites preview's generated types.
const nextConfig:NextConfig={distDir:'.next-standard',typescript:{tsconfigPath:'tsconfig.next.json'}};
export default nextConfig;

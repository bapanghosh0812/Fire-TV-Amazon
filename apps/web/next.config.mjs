/** Static export: the whole site is plain files on S3 behind CloudFront (no servers to run). */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { externalDir: true },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'v2.exercisedb.io',
      'exercisedb.io'
    ],
  },
  env: {
    CUSTOM_KEY: 'gymlog-app',
  },
}

module.exports = nextConfig
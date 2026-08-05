import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cho phép build kiểm thử tách cache khi dev server vẫn đang chạy.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Giữ các route vừa biên dịch trong bộ nhớ lâu hơn khi chuyển qua lại lúc dev.
  onDemandEntries: {
    maxInactiveAge: 25 * 60 * 1000,
    pagesBufferLength: 10,
  },
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "framer-motion"],
  },
};

export default nextConfig;

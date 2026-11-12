import type { NextConfig } from "next";

// A página de vendas (v2) é um HTML estático em public/v2. As rotas "/" e "/alem-do-obvio"
// passam a servi-lo; /inscricao e as rotas de /api continuam no app Next.
const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/v2/index.html" },
        { source: "/alem-do-obvio", destination: "/v2/index.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;

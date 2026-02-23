import type { NextConfig } from "next";
import path from "path";

// Project root = directory containing this config (absolute path)
const projectRoot = path.resolve(__dirname);

const projectNodeModules = path.join(projectRoot, "node_modules");
const tailwindcssPath = path.join(projectNodeModules, "tailwindcss");
const tailwindcssPostcssPath = path.join(projectNodeModules, "@tailwindcss", "postcss");

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Static export for Electron production build (output in ./out)
  output: "export",
  // Leading slash satisfies next/font; resolves correctly with app:// protocol
  assetPrefix: "/",
  webpack: (config) => {
    config.context = projectRoot;
    config.resolve = config.resolve ?? {};
    config.resolve.modules = [projectNodeModules, "node_modules"];
    config.resolve.alias = {
      ...config.resolve.alias,
      tailwindcss: tailwindcssPath,
      "@tailwindcss/postcss": tailwindcssPostcssPath,
    };
    return config;
  },
};

export default nextConfig;

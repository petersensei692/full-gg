import type { NextConfig } from "next";
import path from "path";

// Project root = directory containing this config (absolute path)
const projectRoot = path.resolve(__dirname);

const projectNodeModules = path.join(projectRoot, "node_modules");
const tailwindcssPath = path.join(projectNodeModules, "tailwindcss");
const tailwindcssPostcssPath = path.join(projectNodeModules, "@tailwindcss", "postcss");

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // Force this directory as root (Next otherwise infers root from lockfiles in parent dirs, e.g. GG2 or user home)
    root: projectRoot,
    // Resolve tailwind from this project's node_modules (Turbopack ignores webpack config)
    resolveAlias: {
      tailwindcss: tailwindcssPath,
      "@tailwindcss/postcss": tailwindcssPostcssPath,
    },
  },
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

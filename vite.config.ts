/// <reference types="vitest/config" />
import pkgJson from "./package.json";
import { defineConfig } from "vite";
import url from "node:url";
import dts from "vite-plugin-dts";
import path from "node:path";
import babel from "vite-plugin-babel";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const externals = [
  ...Object.keys(pkgJson.dependencies || []),
  ...Object.keys(pkgJson.devDependencies || []),
];

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    dts({
      entryRoot: path.resolve(__dirname, "./src"),
      outDir: path.resolve(__dirname, "./dist/types"),
      rollupTypes: false,
    }),
    babel({
      babelConfig: {
        presets: ["@babel/preset-typescript"],
        plugins: [
          [
            "babel-plugin-polyfill-corejs3",
            {
              method: "usage-pure",
              version: "3.81",
            },
          ],
        ],
        targets: {
          node: "18",
        },
      },
      filter: /\.[jt]sx?$/,
    }),
  ],
  test: {
    watch: false,
    dir: path.resolve(__dirname, "./src"),
  },
  build: {
    sourcemap: true,
    minify: false,
    lib: {
      entry: path.resolve(__dirname, "./src/index.ts"),
      name: "createCodeEasy",
      formats: ["es", "cjs"],
      fileName: (format) => {
        if (["es", "esm"].includes(format)) {
          return `esm/index.mjs`;
        }
        if (["cjs"].includes(format)) {
          return `cjs/index.cjs`;
        }
        throw Error(`unknown format`);
      },
    },
    rollupOptions: {
      external: (id: string) => {
        if (id.startsWith("node:")) {
          return true;
        }
        return externals.some((pkg) => id === pkg || id.startsWith(`${pkg}/`));
      },
    },
  },
});

/// <reference types="vitest/config" />
import { extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { glob } from "glob";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { libInjectCss } from "vite-plugin-lib-inject-css";

const fromRoot = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    libInjectCss(),
    dts({
      tsconfigPath: fromRoot("tsconfig.lib.json"),
      include: ["lib"],
      // Tests are not part of the published package
      exclude: ["lib/**/*.test.ts", "lib/**/*.test.tsx"],
    }),
  ],
  build: {
    copyPublicDir: false,
    lib: {
      entry: fromRoot("lib/main.ts"),
      formats: ["es"],
    },
    rollupOptions: {
      external: (id) => {
        // The peer dependencies and socket.io-client, a dependency that the
        // application installs: none of them is copied into the package
        const isPackage =
          /^(react|react-dom|react-bootstrap|react-bootstrap-icons|socket\.io-client)(\/.*)?$/.test(
            id,
          );
        const isNodeModule =
          /\/node_modules\/(react|react-dom|react-bootstrap|react-bootstrap-icons|socket\.io-client)\//.test(
            id,
          );
        return isPackage || isNodeModule;
      },
      input: Object.fromEntries(
        // https://rollupjs.org/configuration-options/#input
        glob
          .sync("lib/**/*.{ts,tsx}", {
            ignore: ["lib/**/*.d.ts", "lib/**/*.test.{ts,tsx}"],
          })
          .map((file) => [
            // 1. The name of the entry point
            // lib/nested/foo.js becomes nested/foo
            relative("lib", file.slice(0, file.length - extname(file).length)),
            // 2. The absolute path to the entry file
            // lib/nested/foo.ts becomes /project/lib/nested/foo.ts
            fileURLToPath(new URL(file, import.meta.url)),
          ]),
      ),
      output: {
        assetFileNames: "assets/[name][extname]",
        entryFileNames: "[name].js",
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
  test: {
    // The components run in a browser: the tests render them in jsdom
    // (ADM-N10)
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Since Node 25, Node has its own localStorage, undefined without a
    // storage file, and Vitest keeps it instead of the one of jsdom
    execArgv: ["--no-experimental-webstorage"],
    unstubGlobals: true,
    unstubEnvs: true,
    coverage: {
      provider: "v8",
      // Every file of the library, tested or not
      include: ["lib/**/*.{ts,tsx}"],
      exclude: ["lib/**/*.d.ts", "lib/**/*.test.{ts,tsx}", "lib/**/index.ts"],
      // A summary in the terminal: no report file to keep out of git
      reporter: ["text-summary"],
      // Just under the measure of 2026-11-23 (94.02 / 85.64 / 94.29 / 95.02).
      // Raise them, never lower them.
      thresholds: {
        statements: 93,
        branches: 84,
        functions: 93,
        lines: 94,
      },
    },
  },
});

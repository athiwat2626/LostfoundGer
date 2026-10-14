import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(here, "../../FOUNDLOST/frontend");
const fromFrontend = (pkg) => path.join(FRONTEND_DIR, "node_modules", pkg);

export default defineConfig({
  // ใช้ JSX runtime แบบ automatic เหมือนโปรเจกต์จริง
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    // React ต้องมีชุดเดียว: ทั้งโค้ดแอปและ Testing Library ใช้ไลบรารีจาก frontend/node_modules
    alias: [
      { find: /^react$/, replacement: fromFrontend("react") },
      { find: /^react\/(.*)$/, replacement: `${fromFrontend("react")}/$1` },
      { find: /^react-dom$/, replacement: fromFrontend("react-dom") },
      { find: /^react-dom\/(.*)$/, replacement: `${fromFrontend("react-dom")}/$1` },
      { find: /^react-router-dom$/, replacement: fromFrontend("react-router-dom") },
      { find: /^react-router$/, replacement: fromFrontend("react-router") },
      { find: /^axios$/, replacement: fromFrontend("axios") },
      { find: /^lucide-react$/, replacement: fromFrontend("lucide-react") },
      { find: /^react-leaflet$/, replacement: fromFrontend("react-leaflet") },
      // ใช้ ESM build ของ Testing Library เพื่อให้ import react ผ่าน alias ด้านบน (CJS build จะ require react เอง)
      {
        find: /^@testing-library\/react$/,
        replacement: path.join(here, "node_modules/@testing-library/react/dist/@testing-library/react.esm.js"),
      },
      { find: "@app", replacement: path.join(FRONTEND_DIR, "src") },
    ],
  },
  server: { fs: { allow: [here, FRONTEND_DIR] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.{js,jsx}"],
    server: { deps: { inline: [/@testing-library/, /react-router/, /lucide-react/] } },
    coverage: {
      provider: "v8",
      allowExternal: true,
      include: [path.join(FRONTEND_DIR, "src").replace(/\\/g, "/") + "/**"],
      reporter: ["text", "html"],
    },
  },
});

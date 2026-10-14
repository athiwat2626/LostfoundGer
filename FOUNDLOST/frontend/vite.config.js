import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // เปิดผ่าน Cloudflare Tunnel ได้ (ทดสอบ LINE บนมือถือ)
    allowedHosts: [".trycloudflare.com"],
    watch: {
      ignored: ["**/backend/**"],
    },
  },
});

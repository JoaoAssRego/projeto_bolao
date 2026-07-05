import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    port: 4173,
    strictPort: false,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: ["favicon.svg", "icon.svg"],
      manifest: {
        name: "Bolão",
        short_name: "Bolão",
        description: "Bolão",
        lang: "pt-BR",
        theme_color: "#052e16",
        background_color: "#052e16",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        // Sender ID genérico do FCM (não é um projeto Firebase nosso — é a
        // constante pública usada por qualquer Web Push via VAPID no Chrome/
        // Android). Sem isso, alguns Chrome/WebView Android recusam o
        // registro do push com "Registration failed - push service error".
        // Não tipado em ManifestOptions, daí o spread via Record<string, unknown>.
        ...({ gcm_sender_id: "103953800507" } as Record<string, unknown>),
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});

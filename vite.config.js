var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
            manifest: __assign(__assign({ name: "Bolão", short_name: "Bolão", description: "Bolão", lang: "pt-BR", theme_color: "#052e16", background_color: "#052e16", display: "standalone", orientation: "portrait", start_url: "/" }, { gcm_sender_id: "103953800507" }), { icons: [
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
                ] }),
        }),
    ],
});

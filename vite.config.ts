import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
    root: "src/",
    base: "/modules/pf2e-xp/",
    publicDir: path.resolve(__dirname, "public"),
    server: {
        port: 30001,
        open: true,
        proxy: {
            "^(?!/modules/pf2e-xp)": "http://localhost:30000/",
            "/socket.io": {
                target: "ws://localhost:30000",
                ws: true,
            },
        },
    },
    resolve: {
        alias: [
            {
                find: "./runtimeConfig",
                replacement: "./runtimeConfig.browser",
            },
        ],
    },
    build: {
        outDir: path.resolve(__dirname, "dist"),
        sourcemap: true,
        emptyOutDir: false,
        lib: {
            name: "pf2e-xp",
            entry: path.resolve(__dirname, "src/main.ts"),
            formats: ["es"],
            fileName: "pf2e-xp"
        }
    },
    esbuild: {
        minifyIdentifiers: false,
        keepNames: true
    },
});

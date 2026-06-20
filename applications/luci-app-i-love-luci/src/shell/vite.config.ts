import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
	base: "/luci-static/i-love-luci-app/",
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	plugins: [react(), tailwindcss()],
	build: {
		outDir: "../../htdocs/luci-static/i-love-luci-app",
		emptyOutDir: true,
		manifest: true,
		sourcemap: false,
		rollupOptions: {
			output: {
				entryFileNames: "assets/app.js",
				chunkFileNames: "assets/[name].js",
				assetFileNames: (assetInfo) => {
					if (assetInfo.names?.some((name) => name.endsWith(".css"))) {
						return "assets/app.css";
					}

					return "assets/[name][extname]";
				},
			},
		},
	},
});

import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		sveltekit()
	],
	server: {
		port: 4173
	},
	preview: {
		allowedHosts: [
			'doors.i3.lc'
		]
	}
});

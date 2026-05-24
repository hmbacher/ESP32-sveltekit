import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';
import Icons from 'unplugin-icons/vite';
import viteLittleFS from './vite-plugin-littlefs';
import viteAppVersion from './vite-plugin-app-version';
import tailwindcss from '@tailwindcss/vite';

const config: UserConfig = {
	plugins: [
		sveltekit(),
		Icons({
			compiler: 'svelte'
		}),
		tailwindcss(),
		// Shorten file names for LittleFS 32 char limit
		viteLittleFS(),
		// Stamp APP_VERSION_FULL into version.ts (frontend) and AppVersion.h (firmware)
		viteAppVersion()
	],
	server: {
		proxy: {
			// Proxying REST: http://localhost:5173/rest/bar -> http://192.168.178.122/rest/bar
			'/rest': {
				target: 'http://192.168.178.122',
				changeOrigin: true
			},
			// Proxying websockets ws://localhost:5173/ws -> ws://192.168.178.122/ws
			'/ws': {
				target: 'ws://192.168.178.122',
				changeOrigin: true,
				ws: true
			}
		}
	},
	build: {
		minify: 'terser',
		sourcemap: false,
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules')) return 'vendor';
				}
			}
		},
		cssCodeSplit: true
	}
};

export default config;

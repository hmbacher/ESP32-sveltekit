import { sveltekit } from '@sveltejs/kit/vite';
import { createLogger } from 'vite';
import type { Logger, UserConfig } from 'vite';
import Icons from 'unplugin-icons/vite';
import viteLittleFS from './vite-plugin-littlefs';
import viteAppVersion from './vite-plugin-app-version';
import tailwindcss from '@tailwindcss/vite';

/**
 * Dev server only: a browser that drops its connection while the proxy writes to it - a reload, a
 * phone that switches networks or apps - makes the proxy log an error with a stack trace. These codes
 * are expected and get one short line instead; every other error is logged as before.
 */
const CLOSED_BY_BROWSER = new Set(['ECONNABORTED', 'ECONNRESET', 'EPIPE']);

function proxyQuietLogger(): Logger {
	const logger = createLogger();
	const error = logger.error.bind(logger);
	logger.error = (msg, options) => {
		const code = (options?.error as { code?: string } | undefined)?.code;
		if (code && CLOSED_BY_BROWSER.has(code) && msg.includes('proxy')) {
			logger.warn(`proxy: connection closed by the browser (${code})`, { timestamp: true });
			return;
		}
		error(msg, options);
	};
	return logger;
}

const config: UserConfig = {
	customLogger: proxyQuietLogger(),
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

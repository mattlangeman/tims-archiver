import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from './types';

export function createClient(fetch?: typeof globalThis.fetch) {
	if (isBrowser()) {
		return createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			global: { fetch }
		});
	}

	throw new Error('createClient should only be called in browser context');
}

export function createServerClientFromCookies(
	cookies: {
		get: (key: string) => string | undefined;
		set: (key: string, value: string, options: object) => void;
		delete: (key: string, options: object) => void;
	},
	fetch?: typeof globalThis.fetch
) {
	return createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			get: (key) => cookies.get(key),
			set: (key, value, options) => {
				cookies.set(key, value, { ...options, path: '/' });
			},
			remove: (key, options) => {
				cookies.delete(key, { ...options, path: '/' });
			}
		},
		global: { fetch }
	});
}

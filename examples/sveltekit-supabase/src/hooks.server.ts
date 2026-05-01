import { createServerClient } from '@supabase/ssr';
import { error } from '@sveltejs/kit';
import { createSupabaseAdapter } from '@prefig/upact-supabase';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// One Supabase client per request, bound to the request's cookies.
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				for (const { name, value, options } of cookiesToSet) {
					event.cookies.set(name, value, { ...options, path: '/' });
				}
			},
		},
	});

	// The adapter wraps the request-bound client.
	// Substrate state stays in closure — never on locals directly.
	event.locals.identity = createSupabaseAdapter(event.locals.supabase);

	// Resolve the current upactor once per request so route loaders
	// can read it from locals without each making their own round-trip.
	// SubstrateUnavailableError is allowed to propagate — SvelteKit's
	// error boundary renders the 500 page; the outage is distinct from
	// "no current user" (null) and should not be silently swallowed.
	try {
		event.locals.upactor = await event.locals.identity.currentUpactor(event.request);
	} catch {
		event.locals.upactor = null;
		throw error(503, 'Identity substrate unavailable');
	}

	return resolve(event);
};

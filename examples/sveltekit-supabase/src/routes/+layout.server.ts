import type { LayoutServerLoad } from './$types';

// Pass the upactor (or null) to all routes so Svelte components
// can show sign-in state without a per-route server load.
export const load: LayoutServerLoad = ({ locals }) => {
	return { upactor: locals.upactor };
};

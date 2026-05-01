import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	// Not signed in — redirect to the sign-in page.
	if (!locals.upactor) redirect(303, '/auth/sign-in');

	return {
		// The page sees id, display_hint (maybe), and capabilities.
		// Email, phone, metadata, JWT claims are not available here —
		// that is the point of the port.
		upactor: locals.upactor,
		// Gate on capability rather than branching on substrate type.
		canUpdateEmail: locals.upactor.capabilities.has('email'),
	};
};

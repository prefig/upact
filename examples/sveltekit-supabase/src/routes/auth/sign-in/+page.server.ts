import { fail, redirect } from '@sveltejs/kit';
import type { AuthError } from '@prefig/upact';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	// Already signed in — redirect to the dashboard.
	if (locals.upactor) redirect(303, '/dashboard');
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const email = form.get('email');
		const password = form.get('password');

		if (typeof email !== 'string' || typeof password !== 'string') {
			return fail(400, { error: 'Missing fields.' });
		}

		const result = await locals.identity.authenticate({ kind: 'password', email, password });

		// AuthError has `code` and `message`; a Session is an opaque value.
		if (typeof result === 'object' && result !== null && 'code' in result) {
			const authError = result as AuthError;
			const message =
				authError.code === 'credential_rejected'
					? 'Invalid email or password.'
					: authError.code === 'substrate_unavailable'
						? 'Service temporarily unavailable.'
						: 'Sign-in failed.';
			return fail(400, { error: message });
		}

		redirect(303, '/dashboard');
	},
};

// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import { SubstrateUnavailableError } from '../src/errors.js';

describe('SubstrateUnavailableError', () => {
	it('is an Error subclass', () => {
		const err = new SubstrateUnavailableError();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(SubstrateUnavailableError);
	});

	it('sets name to SubstrateUnavailableError', () => {
		expect(new SubstrateUnavailableError().name).toBe('SubstrateUnavailableError');
	});

	it('carries kind = substrate_unavailable so adapters share the AuthError vocabulary', () => {
		const err = new SubstrateUnavailableError();
		expect(err.kind).toBe('substrate_unavailable');
	});

	it('uses a substrate-agnostic default message', () => {
		const err = new SubstrateUnavailableError();
		expect(err.message).toBe('identity substrate is unreachable');
	});

	it('accepts a substrate-specific override message', () => {
		const err = new SubstrateUnavailableError('SimpleX daemon is unreachable');
		expect(err.message).toBe('SimpleX daemon is unreachable');
	});

	it('is catchable as the typed class through normal throw flow', () => {
		const fn = () => {
			throw new SubstrateUnavailableError('Supabase auth API unreachable');
		};
		expect(fn).toThrow(SubstrateUnavailableError);
		try {
			fn();
		} catch (e) {
			expect(e).toBeInstanceOf(SubstrateUnavailableError);
			if (e instanceof SubstrateUnavailableError) {
				expect(e.kind).toBe('substrate_unavailable');
			}
		}
	});
});

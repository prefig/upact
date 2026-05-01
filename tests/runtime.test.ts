// SPDX-License-Identifier: Apache-2.0
/**
 * Runtime opacity tests for `createSession` and `_unwrapSession`.
 *
 * These tests verify SPEC.md §7.4 holds at runtime: a Session value
 * produced by `createSession` cannot be decomposed by any common
 * inspection vector — JSON.stringify, Object.keys, Object.getOwnPropertyNames,
 * Reflect.ownKeys, structuredClone, util.inspect, console.log, or direct
 * property access. The escape hatch is `_unwrapSession`, reachable only
 * via `@prefig/upact/internal`, which is the contract signal that the
 * caller has crossed the opacity boundary deliberately.
 */

import { describe, it, expect } from 'vitest';
import util from 'node:util';
import { createSession } from '../src/runtime.js';
import { _unwrapSession } from '../src/internal.js';

interface Substrate {
	access_token: string;
	refresh_token: string;
	user: { id: string; email: string };
}

function fixture(): Substrate {
	return {
		access_token: 'eyJexampleJWT.body.signature',
		refresh_token: 'rt_secret_value',
		user: { id: 'u-1', email: 'alice@example.com' },
	};
}

describe('createSession — JSON.stringify opacity', () => {
	it('serialises to the opaque token literal', () => {
		const session = createSession(fixture());
		expect(JSON.stringify(session)).toBe('"[upact:session]"');
	});

	it('does not leak substrate values via JSON.stringify', () => {
		const session = createSession(fixture());
		const json = JSON.stringify(session);
		expect(json).not.toContain('eyJexampleJWT');
		expect(json).not.toContain('rt_secret_value');
		expect(json).not.toContain('alice@example.com');
		expect(json).not.toContain('u-1');
	});

	it('does not leak substrate values when nested in a larger object', () => {
		const session = createSession(fixture());
		const wrapper = { kind: 'session-holder', session };
		const json = JSON.stringify(wrapper);
		expect(json).toContain('session-holder');
		expect(json).not.toContain('eyJexampleJWT');
		expect(json).not.toContain('rt_secret_value');
	});
});

describe('createSession — property enumeration opacity', () => {
	it('Object.keys returns no substrate fields', () => {
		const session = createSession(fixture());
		expect(Object.keys(session)).toEqual([]);
	});

	it('Object.getOwnPropertyNames returns no substrate fields', () => {
		const session = createSession(fixture());
		expect(Object.getOwnPropertyNames(session)).toEqual(['toJSON']);
	});

	it('Reflect.ownKeys returns no substrate fields', () => {
		const session = createSession(fixture());
		expect(Reflect.ownKeys(session)).toEqual(['toJSON']);
	});

	it('Object.getOwnPropertySymbols returns no substrate fields', () => {
		const session = createSession(fixture());
		expect(Object.getOwnPropertySymbols(session)).toEqual([]);
	});

	it('for-in iteration yields nothing', () => {
		const session = createSession(fixture());
		const keys: string[] = [];
		for (const key in session) keys.push(key);
		expect(keys).toEqual([]);
	});
});

describe('createSession — direct property access opacity', () => {
	it('property reads return undefined', () => {
		const session = createSession(fixture()) as unknown as Record<string, unknown>;
		expect(session['access_token']).toBeUndefined();
		expect(session['refresh_token']).toBeUndefined();
		expect(session['user']).toBeUndefined();
	});
});

describe('createSession — structural cloning and inspection opacity', () => {
	it('structuredClone does not preserve the substrate value', () => {
		const session = createSession(fixture());
		const cloned = structuredClone(session) as unknown;
		expect(_unwrapSession(cloned as never)).toBeUndefined();
	});

	it('util.inspect does not leak substrate fields', () => {
		const session = createSession(fixture());
		const inspected = util.inspect(session, { depth: null, showHidden: true });
		expect(inspected).not.toContain('eyJexampleJWT');
		expect(inspected).not.toContain('rt_secret_value');
		expect(inspected).not.toContain('alice@example.com');
	});
});

describe('createSession — runtime immutability', () => {
	it('the returned object is frozen', () => {
		const session = createSession(fixture());
		expect(Object.isFrozen(session)).toBe(true);
	});

	it('attempts to mutate fail silently or throw', () => {
		'use strict';
		const session = createSession(fixture()) as unknown as Record<string, unknown>;
		// Frozen objects in strict mode throw on assignment; non-strict silently fails.
		// Either way, the substrate value is not exposed.
		try {
			session['access_token'] = 'attacker-injected';
		} catch {
			// expected in strict mode
		}
		expect(session['access_token']).toBeUndefined();
	});
});

describe('_unwrapSession — controlled escape hatch', () => {
	it('returns the substrate value for a session created in this process', () => {
		const substrate = fixture();
		const session = createSession(substrate);
		const recovered = _unwrapSession<Substrate>(session);
		expect(recovered).toBe(substrate); // reference equality — same WeakMap entry
	});

	it('returns undefined for a non-session input', () => {
		const fake = { _opaque: Symbol() } as never;
		expect(_unwrapSession(fake)).toBeUndefined();
	});

	it('returns undefined for a structuredClone of a session', () => {
		const session = createSession(fixture());
		const cloned = structuredClone(session) as never;
		expect(_unwrapSession(cloned)).toBeUndefined();
	});
});

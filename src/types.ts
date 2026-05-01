// SPDX-License-Identifier: Apache-2.0
/**
 * upact — identity port v0.1
 *
 * Reference TypeScript types for the identity port specification.
 * See SPEC.md in this repo for the normative document.
 */

/**
 * A self-described provider feature. The application branches on capability
 * presence; it never branches on substrate identity or provider type.
 *
 * The vocabulary is intentionally minimal (SPEC.md §5.1, F1). Providers do
 * not expand it pre-emptively; new capabilities land via §5.2 extension when
 * concrete consumers surface. Applications SHOULD treat unknown capabilities
 * as absent.
 *
 * v0.1 vocabulary: only `email` and `recovery` — what shipped consumers gate
 * on. Additional capabilities (messaging, p2p_matching, etc.) land when an
 * adopter needs them.
 */
export type Capability = 'email' | 'recovery';

/**
 * Session lifecycle metadata. Surfaced when the substrate provides an
 * explicit TTL (OIDC JWT `exp` claim, session-cookie `Max-Age`). Providers
 * that have no intrinsic expiry omit this field. See SPEC.md §8.
 */
export interface IdentityLifecycle {
	/** Absolute expiry time. Omitted for substrates with no intrinsic TTL. */
	expires_at?: Date;
	/**
	 * How the identity can be renewed once `expires_at` is reached.
	 * - `'reauth'` — full credential exchange required (OIDC, password re-entry).
	 * - `'represence'` — presence renewal suffices (P2P presence-based substrates).
	 * - `'never'` — identity does not expire.
	 */
	renewable: 'reauth' | 'represence' | 'never';
}

/**
 * The application's view of "who is this." Opaque, capability-negotiated,
 * privacy-bounded by construction.
 *
 * No email, phone, legal name, IP, or device identifier appears here.
 * Providers MUST strip such fields from their substrate before returning an
 * Upactor. See SPEC.md §7 for the privacy minima.
 */
export interface Upactor {
	/** Opaque, stable for the lifetime of this identity. Compare by equality only. */
	id: string;
	/** Best-effort display string. Not unique, not a contact identifier. */
	display_hint?: string;
	capabilities: ReadonlySet<Capability>;
	/**
	 * Session lifecycle metadata. Present when the substrate has an explicit TTL
	 * (e.g. OIDC JWT `exp`). Omitted for substrates with no intrinsic expiry.
	 * See SPEC.md §8 and IdentityLifecycle.
	 */
	lifecycle?: IdentityLifecycle;
	/**
	 * Cross-substrate provenance. Distinguishes identity sources in multi-IDP
	 * deployments. `substrate` is a short identifier ('oidc', 'supabase',
	 * 'simplex'); `instance` is the issuer URL or equivalent.
	 * Decision 6 — SPEC.md §4.4.
	 */
	provenance?: { substrate: string; instance?: string };
}

/**
 * Deprecated alias for compatibility with v0.1.0-draft consumers. Will be
 * removed in v0.2. New code should use `Upactor`.
 *
 * @deprecated Use `Upactor` instead.
 */
export type UserIdentity = Upactor;

/**
 * A provider-shaped credential exchange result. Opaque to the application.
 * The only valid use is to pass it back to the port (e.g. for invalidate).
 * See SPEC.md §7.4.
 */
export interface Session {
	readonly _opaque: unique symbol;
}

/**
 * Port-level error vocabulary, normative per SPEC.md §6.5 (Decision 4).
 * Adapters return one of these codes; substrate-specific detail goes in
 * `message`. Applications branch on `code` for substrate-portable error
 * handling.
 */
export type AuthErrorCode =
	| 'credential_invalid'
	| 'credential_rejected'
	| 'substrate_unavailable'
	| 'identity_unavailable'
	| 'rate_limited'
	| 'auth_failed';

export interface AuthError {
	code: AuthErrorCode;
	message: string;
}

/**
 * The four operations every conforming provider implements.
 * See SPEC.md §6.
 */
export interface IdentityPort {
	authenticate(credential: unknown): Promise<Session | AuthError>;
	currentUpactor(request: Request): Promise<Upactor | null>;
	invalidate(session: Session): Promise<void>;
	issueRenewal(
		identity: Upactor,
		evidence: unknown,
	): Promise<Upactor | null>;
}

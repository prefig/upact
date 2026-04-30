/**
 * upact — identity port v0.1-draft
 *
 * Reference TypeScript types for the identity port specification.
 * See SPEC.md in this repo for the normative document.
 *
 * License: CC BY 4.0
 */

/**
 * A self-described provider feature. The application branches on capability
 * presence; it never branches on substrate identity or provider type.
 *
 * The named members are the v0.1 core vocabulary (SPEC.md §5.1). Providers
 * MAY self-declare capabilities outside this set; applications SHOULD treat
 * unknown capabilities as absent.
 *
 * The trailing `string & {}` keeps the named completions visible to editors
 * while permitting custom capability strings.
 */
export type Capability =
	| 'email'
	| 'push'
	| 'webauthn'
	| 'presence_renewal'
	| 'threshold_attestation'
	| 'p2p_matching'
	| 'recovery'
	| (string & {});

/**
 * The application's view of "who is this." Opaque, capability-negotiated,
 * privacy-bounded by construction.
 *
 * No email, phone, legal name, IP, or device identifier appears here.
 * Providers MUST strip such fields from their substrate before returning a
 * UserIdentity. See SPEC.md §7 for the privacy minima.
 */
export interface UserIdentity {
	/** Opaque, stable for the lifetime of this identity. Compare by equality only. */
	id: string;
	/** Best-effort display string. Not unique, not a contact identifier. */
	display_hint?: string;
	lifecycle: IdentityLifecycle;
	capabilities: ReadonlySet<Capability>;
}

export interface IdentityLifecycle {
	/** ISO 8601 timestamp at which this id first became valid. */
	issued_at: string;
	/** ISO 8601 timestamp at which this identity ceases to be valid. */
	expires_at?: string;
	/** How this identity may be refreshed (SPEC.md §4.3). */
	renewable: 'reauth' | 'represence' | 'never';
}

/**
 * A provider-shaped credential exchange result. Opaque to the application.
 * The only valid use is to pass it back to the port (e.g. for invalidate).
 * See SPEC.md §7.4.
 */
export interface Session {
	readonly _opaque: unique symbol;
}

export interface AuthError {
	code: string;
	message: string;
}

/**
 * The four operations every conforming provider implements.
 * See SPEC.md §6.
 */
export interface IdentityPort {
	authenticate(credential: unknown): Promise<Session | AuthError>;
	currentIdentity(request: Request): Promise<UserIdentity | null>;
	invalidate(session: Session): Promise<void>;
	issueRenewal(
		identity: UserIdentity,
		evidence: unknown,
	): Promise<UserIdentity | null>;
}

/**
 * Annotation contract for application-layer records that reference identities.
 * See SPEC.md §9 (decay-aware data model).
 *
 * Records MUST be one of:
 *   - 'preserve' — survive past identity expiry, with identity-bearing fields
 *     replaced by tombstones at expiry.
 *   - 'expire' — be deleted or expire-marked alongside the identity.
 */
export interface IdentityDecayAware {
	belongs_to_identity: string;
	cascade_on_identity_expiry: 'preserve' | 'expire';
}

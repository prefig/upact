import type { SupabaseClient } from '@supabase/supabase-js';
import type { IdentityPort, Upactor } from '@prefig/upact';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			identity: IdentityPort;
			upactor: Upactor | null;
		}
		interface PageData {
			upactor: Upactor | null;
		}
	}
}

export {};

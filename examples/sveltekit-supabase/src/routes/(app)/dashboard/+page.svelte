<script lang="ts">
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<h1>Dashboard</h1>

{#if data.upactor.display_hint}
	<p>Hello, {data.upactor.display_hint}.</p>
{:else}
	<p>Hello.</p>
{/if}

{#if data.canUpdateEmail}
	<a href="/settings/email">Update email address</a>
{/if}

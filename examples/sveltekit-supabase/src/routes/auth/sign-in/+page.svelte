<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	const { form }: { form: ActionData } = $props();
</script>

<form method="POST" use:enhance>
	{#if form?.error}
		<p>{form.error}</p>
	{/if}
	<label>Email <input name="email" type="email" required /></label>
	<label>Password <input name="password" type="password" required /></label>
	<button type="submit">Sign in</button>
</form>

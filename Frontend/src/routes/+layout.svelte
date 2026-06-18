<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-screen bg-parchment">
	<nav class="border-b-2 border-gold bg-parchment-dark/80 backdrop-blur-sm">
		<div class="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
			<a href="/" class="font-heading text-xl font-bold text-ink hover:text-aged-red transition-colors">
				Scripture Fetcher
			</a>
			<div class="flex items-center gap-4">
				<a href="/" class="font-body text-brown hover:text-aged-red transition-colors">Home</a>
				<a href="/history" class="font-body text-brown hover:text-aged-red transition-colors">History</a>
				{#if data.user}
					<form method="POST" action="/logout">
						<button type="submit" class="font-body text-brown hover:text-aged-red transition-colors text-sm">
							Sign out
						</button>
					</form>
				{/if}
			</div>
		</div>
	</nav>
	<main class="max-w-6xl mx-auto px-4 py-8">
		{@render children()}
	</main>
</div>

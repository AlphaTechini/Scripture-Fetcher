<script lang="ts">
	import type { PageData } from './$types';
	import WelcomeHeader from '$lib/components/WelcomeHeader.svelte';
	import QuoteDisplay from '$lib/components/QuoteDisplay.svelte';
	import InputForm from '$lib/components/InputForm.svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="text-center mb-12">
	<WelcomeHeader username={data.user.email?.split('@')[0] ?? 'Scholar'} />
	<p class="font-body text-lg text-brown-light mb-6">
		A random verse to inspire your Bible study.
	</p>
	{#if data.quote}
		<QuoteDisplay
			verseText={data.quote.verseText}
			verseReference={data.quote.verseReference}
		/>
	{/if}
</div>

<div class="max-w-3xl mx-auto">
	<InputForm
		timeOfDay={data.timeOfDay}
		timeOfYear={data.timeOfYear}
		currentDate={data.currentDate}
	/>
</div>

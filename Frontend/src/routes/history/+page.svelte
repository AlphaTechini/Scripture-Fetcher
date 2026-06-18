
<script lang="ts">
	import type { PageData } from './$types';
	import HistoryTimeline from '$lib/components/HistoryTimeline.svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="mb-8">
	<h2 class="font-heading text-3xl font-bold text-ink mb-2">Study History</h2>
	<p class="font-body text-brown-light">Your journey through Scripture.</p>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
	<div class="lg:col-span-2 space-y-6">
		{#if data.sessions.length > 0}
			<HistoryTimeline sessions={data.sessions} />
		{:else}
			<div class="scroll-card text-center py-12">
				<p class="font-body text-brown text-lg">No sessions yet.</p>
				<p class="font-body text-brown-light text-sm mt-2">Start your first study to see it here.</p>
			</div>
		{/if}
	</div>

	<div class="space-y-6">
		<div class="scroll-card">
			<h3 class="font-heading text-lg font-bold text-ink mb-4">Metrics</h3>
			<div class="space-y-4">
				<div>
					<p class="text-xs font-body text-brown-light uppercase tracking-wide">Reading Streak</p>
					<p class="font-heading text-2xl text-gold font-bold">{data.readingStreak} days</p>
				</div>
				<div>
					<p class="text-xs font-body text-brown-light uppercase tracking-wide">Total Verses Read</p>
					<p class="font-heading text-2xl text-gold font-bold">{data.totalVerses}</p>
				</div>
				<div>
					<p class="text-xs font-body text-brown-light uppercase tracking-wide mb-2">Categories</p>
					{#if data.categoryDistribution.length > 0}
						<ul class="space-y-1">
							{#each data.categoryDistribution as item}
								<li class="flex justify-between font-body text-sm text-brown">
									<span>{item.category}</span>
									<span class="text-gold font-semibold">{item.count}</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="font-body text-brown-light text-sm">No data yet.</p>
					{/if}
				</div>
			</div>
		</div>

		<div class="scroll-card">
			<h3 class="font-heading text-lg font-bold text-ink mb-4">Quote History</h3>
			{#if data.quoteHistory.length > 0}
				<ul class="space-y-3 max-h-96 overflow-auto">
					{#each data.quoteHistory as q}
						<li class="border-b border-gold/20 pb-2 last:border-0">
							<p class="font-accent italic text-sm text-brown">"{q.verseText}"</p>
							<p class="font-heading text-xs text-gold mt-1">— {q.verseReference}</p>
							<p class="text-brown-light text-xs mt-0.5">{new Date(q.shownAt).toLocaleDateString()}</p>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="font-body text-brown-light text-sm">No quotes yet.</p>
			{/if}
		</div>
	</div>
</div>


<script lang="ts">
	import { enhance } from '$app/forms';
	import PassageDisplay from './PassageDisplay.svelte';
	import PrayerPoints from './PrayerPoints.svelte';
	import Button from './ui/Button.svelte';

	interface Passage {
		reference: string;
		passageText: string;
		book: string;
		chapter: string;
		orderIndex: number;
	}

	interface PrayerPoint {
		content: string;
		passageRef: string | null;
		orderIndex: number;
	}

	interface Props {
		id: string;
		label: string;
		influenceType: string;
		storyTitle: string;
		storySummary: string;
		reasoning?: string | null;
		passages: Passage[];
		prayerPoints: PrayerPoint[];
		isPicked: boolean;
		isReused: boolean;
		alternativeId: string;
	}

	let {
		label,
		influenceType,
		storyTitle,
		storySummary,
		reasoning,
		passages,
		prayerPoints,
		isPicked,
		isReused,
		alternativeId
	}: Props = $props();

	let expanded = $state(false);
	let showReasoning = $state(false);
</script>

<article class="scroll-card relative flex flex-col">
	{#if isReused}
		<span class="absolute top-3 right-3 text-xs font-heading font-semibold text-gold bg-parchment-dark border border-gold/50 px-2 py-1 rounded">
			Previously offered
		</span>
	{/if}

	<div class="mb-4">
		<span class="inline-block text-xs font-heading font-bold text-gold uppercase tracking-wider mb-1">
			{label}
		</span>
		<h3 class="font-heading text-xl font-bold text-ink mb-2">{storyTitle}</h3>
		<p class="font-body text-brown text-sm leading-relaxed mb-3">{storySummary}</p>
		<div class="flex items-center gap-3 text-xs font-body text-brown-light">
			<span>{passages.length} passage{passages.length === 1 ? '' : 's'}</span>
			<span class="w-1 h-1 bg-brown-light rounded-full"></span>
			<span class="capitalize">{influenceType.replace('_', ' ')}</span>
		</div>
	</div>

	<div class="mt-auto">
		<button
			type="button"
			onclick={() => (expanded = !expanded)}
			class="text-aged-red hover:text-aged-red-light text-sm font-body underline transition-colors"
		>
			{expanded ? 'Collapse' : 'Read this story'}
		</button>

		{#if expanded}
			<div class="mt-4 space-y-4 border-t border-gold/30 pt-4">
				{#each [...passages].sort((a, b) => a.orderIndex - b.orderIndex) as passage (passage.reference)}
					<PassageDisplay {...passage} />
				{/each}

				{#if prayerPoints.length > 0}
					<PrayerPoints points={prayerPoints} />
				{/if}

				{#if reasoning}
					<button
						type="button"
						onclick={() => (showReasoning = !showReasoning)}
						class="text-brown-light hover:text-brown text-xs font-body underline transition-colors"
					>
						{showReasoning ? 'Hide reasoning' : 'Why was this chosen?'}
					</button>
					{#if showReasoning}
						<div class="mt-2 p-3 bg-parchment border border-gold/30 rounded text-sm font-body text-brown italic">
							{reasoning}
						</div>
					{/if}
				{/if}
			</div>
		{/if}

		{#if !isPicked}
			<form method="POST" action="?/pick" use:enhance class="mt-4 pt-4 border-t border-gold/30">
				<input type="hidden" name="alternativeId" value={alternativeId} />
				<Button type="submit" variant="seal" size="sm">Pick this alternative</Button>
			</form>
		{:else}
			<div class="mt-4 pt-4 border-t border-gold/30 text-gold font-heading font-semibold text-sm">
				You chose this story
			</div>
		{/if}
	</div>
</article>

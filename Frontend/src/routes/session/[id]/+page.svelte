
<script lang="ts">
	import type { PageData } from './$types';
	import AlternativeCard from '$lib/components/AlternativeCard.svelte';
	import CommentBox from '$lib/components/CommentBox.svelte';
	import VerseTracker from '$lib/components/VerseTracker.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	const influenceOrder: Record<string, number> = {
		primary: 0,
		historical: 1,
		user_directed: 2
	};

	let sortedAlternatives = $derived(
		[...data.alternatives].sort((a, b) => influenceOrder[a.influenceType] - influenceOrder[b.influenceType])
	);

	function getPassagesForAlt(altId: string) {
		return data.passages.filter((p) => p.alternativeId === altId);
	}

	function getPrayerPointsForAlt(altId: string) {
		return data.prayerPoints.filter((pp) => pp.alternativeId === altId);
	}

	let pickedAlt = $derived(data.alternatives.find((a) => a.picked));
</script>

<div class="mb-6">
	<h2 class="font-heading text-2xl font-bold text-ink mb-1">Your Study Session</h2>
	<p class="font-body text-brown-light text-sm">
		{data.session.mood} • {data.session.category} • {new Date(data.session.createdAt).toLocaleDateString()}
	</p>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
	{#each sortedAlternatives as alt (alt.id)}
		<AlternativeCard
			id={alt.id}
			label={alt.label}
			influenceType={alt.influenceType}
			storyTitle={alt.storyTitle}
			storySummary={alt.storySummary}
			reasoning={alt.reasoning}
			passages={getPassagesForAlt(alt.id)}
			prayerPoints={getPrayerPointsForAlt(alt.id)}
			isPicked={alt.picked}
			isReused={!!alt.reusedFrom}
			alternativeId={alt.id}
		/>
	{/each}
</div>

{#if pickedAlt}
	<VerseTracker
		passages={getPassagesForAlt(pickedAlt.id)}
		versesRead={data.versesRead}
		alternativeId={pickedAlt.id}
	/>

	<CommentBox comments={data.comments} />
{/if}

<div class="mt-8 flex justify-between items-center">
	<form method="POST" action="?/bookmark" use:enhance>
		<Button type="submit" variant="secondary" size="sm" disabled={data.isBookmarked}>
			{data.isBookmarked ? 'Bookmarked' : 'Bookmark Session'}
		</Button>
	</form>

	<a href="/" class="font-body text-aged-red hover:text-aged-red-light underline text-sm">
		Start a new session
	</a>
</div>

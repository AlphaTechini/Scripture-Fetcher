
<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from './ui/Button.svelte';

	interface PassageItem {
		reference: string;
		passageText: string;
		book: string;
		chapter: string;
		orderIndex: number;
	}

	interface VerseReadItem {
		verseReference: string;
	}

	interface Props {
		passages: PassageItem[];
		versesRead: VerseReadItem[];
		alternativeId?: string | null;
	}

	let { passages, versesRead, alternativeId }: Props = $props();

	let readRefs = $state<Set<string>>(new Set());

	$effect(() => {
		readRefs = new Set(versesRead.map((v) => v.verseReference));
	});
</script>

<div class="scroll-card mt-6">
	<h4 class="font-heading text-sm font-bold text-ink mb-3">Mark Passages as Read</h4>
	<form
		method="POST"
		action="?/markVerse"
		use:enhance={() => {
			return async ({ update }) => {
				update();
			};
		}}
	>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			{#each [...passages].sort((a, b) => a.orderIndex - b.orderIndex) as passage}
				<label
					class="flex items-start gap-3 p-3 bg-parchment rounded border border-gold/30 cursor-pointer transition-colors hover:bg-gold/10"
				>
					<input
						type="checkbox"
						name="verseReference"
						value={passage.reference}
						checked={readRefs.has(passage.reference)}
						onchange={() => {
							if (readRefs.has(passage.reference)) {
								readRefs.delete(passage.reference);
							} else {
								readRefs.add(passage.reference);
							}
						}}
						class="mt-1 accent-aged-red"
					/>
					<div>
						<p class="font-heading text-xs font-semibold text-gold">{passage.reference}</p>
					</div>
				</label>
			{/each}
		</div>
		{#if alternativeId}
			<input type="hidden" name="alternativeId" value={alternativeId} />
		{/if}
		<div class="mt-4 flex justify-end">
			<Button type="submit" variant="secondary" size="sm">Save Progress</Button>
		</div>
	</form>
</div>

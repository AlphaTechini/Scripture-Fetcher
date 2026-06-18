<script lang="ts">
	import { enhance } from '$app/forms';
	import SearchableDropdown from './ui/SearchableDropdown.svelte';
	import TextArea from './ui/TextArea.svelte';
	import Button from './ui/Button.svelte';

	interface Props {
		timeOfDay: string;
		timeOfYear: string;
		currentDate: string;
	}

	let { timeOfDay, timeOfYear, currentDate }: Props = $props();

	const moods = [
		'Joyful', 'Anxious', 'Grateful', 'Weary', 'Hopeful', 'Confused', 'Angry',
		'Peaceful', 'Lonely', 'Courageous', 'Tempted', 'Grieving', 'Celebrating',
		'Doubtful', 'Determined', 'Restless', 'Content', 'Overwhelmed', 'Humble',
		'Patient', 'Fearful', 'Excited', 'Reflective', 'Tired', 'Inspired'
	];

	const categories = [
		'Faith', 'Love', 'Wisdom', 'Strength', 'Forgiveness', 'Purpose', 'Patience',
		'Humility', 'Justice', 'Mercy', 'Hope', 'Salvation', 'Prayer', 'Worship',
		'Discipleship', 'Prophecy', 'Creation', 'End Times', 'Relationships',
		'Leadership', 'Suffering', 'Joy', 'Peace', 'Trust', 'Grace', 'Obedience',
		'Courage', 'Healing', 'Provision', 'Protection', 'Guidance', 'Repentance'
	];

	let selectedMood = $state('');
	let selectedCategory = $state('');
	let userNotes = $state('');
	let isSubmitting = $state(false);
	let errorMsg = $state('');
</script>

<form
	method="POST"
	action="?/submit"
	use:enhance={() => {
		if (!selectedMood || !selectedCategory) {
			errorMsg = 'Please select both a mood and a category.';
			return;
		}
		errorMsg = '';
		isSubmitting = true;
		return async ({ result, update }) => {
			isSubmitting = false;
			if (result.type === 'failure') {
				errorMsg = (result.data?.error as string) || 'Something went wrong.';
			}
			update();
		};
	}}
	class="space-y-6"
>
	<input type="hidden" name="mood" bind:value={selectedMood} />
	<input type="hidden" name="category" bind:value={selectedCategory} />
	<input type="hidden" name="userNotes" bind:value={userNotes} />
	<input type="hidden" name="timeOfDay" value={timeOfDay} />
	<input type="hidden" name="timeOfYear" value={timeOfYear} />
	<input type="hidden" name="currentDate" value={currentDate} />

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<SearchableDropdown label="Mood" options={moods} bind:value={selectedMood} />
		<SearchableDropdown
			label="Category"
			options={categories}
			bind:value={selectedCategory}
		/>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div>
			<p class="block font-heading text-sm font-semibold text-brown mb-2">Time of Day</p>
			<div class="px-4 py-2.5 bg-parchment border-2 border-gold/30 rounded font-body text-brown opacity-75">
				{timeOfDay}
			</div>
		</div>
		<div>
			<p class="block font-heading text-sm font-semibold text-brown mb-2">Time of Year</p>
			<div class="px-4 py-2.5 bg-parchment border-2 border-gold/30 rounded font-body text-brown opacity-75">
				{timeOfYear}
			</div>
		</div>
		<div>
			<p class="block font-heading text-sm font-semibold text-brown mb-2">Date</p>
			<div class="px-4 py-2.5 bg-parchment border-2 border-gold/30 rounded font-body text-brown opacity-75">
				{currentDate}
			</div>
		</div>
	</div>

	<TextArea
		label="Additional Notes (optional)"
		bind:value={userNotes}
		placeholder="e.g., I want to learn more about Peter..."
		rows={3}
	/>

	{#if errorMsg}
		<div class="text-center">
			<p class="text-aged-red font-body text-sm">{errorMsg}</p>
		</div>
	{/if}

	<div class="text-center">
		<Button
			type="submit"
			variant="seal"
			size="lg"
			disabled={!selectedMood || !selectedCategory || isSubmitting}
		>
			{#if isSubmitting}
				Unfurling...
			{:else}
				Open the Scroll
			{/if}
		</Button>
	</div>
</form>

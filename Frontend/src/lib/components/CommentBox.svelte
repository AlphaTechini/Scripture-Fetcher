
<script lang="ts">
	import { enhance } from '$app/forms';
	import TextArea from './ui/TextArea.svelte';
	import Button from './ui/Button.svelte';

	interface Comment {
		id: string;
		content: string;
		createdAt: Date | string;
	}

	interface Props {
		comments: Comment[];
	}

	let { comments }: Props = $props();

	let commentText = $state('');
	let saving = $state(false);
</script>

<div class="scroll-card mt-8">
	<h4 class="font-heading text-lg font-bold text-ink mb-4">Reflections</h4>

	{#if comments.length > 0}
		<div class="space-y-3 mb-6">
			{#each comments as comment}
				<div class="bg-parchment p-3 rounded border border-gold/30">
					<p class="font-body text-brown text-sm">{comment.content}</p>
					<p class="text-brown-light text-xs mt-1">{new Date(comment.createdAt).toLocaleString()}</p>
				</div>
			{/each}
		</div>
	{/if}

	<form
		method="POST"
		action="?/comment"
		use:enhance={() => {
			if (!commentText.trim()) return;
			saving = true;
			return async ({ result, update }) => {
				saving = false;
				if (result.type === 'success') {
					commentText = '';
				}
				update();
			};
		}}
		class="space-y-3"
	>
		<TextArea
			label="Add a reflection (optional)"
			bind:value={commentText}
			placeholder="What moved you today?"
			rows={3}
		/>
		<Button type="submit" variant="secondary" size="sm" disabled={!commentText.trim() || saving}>
			{saving ? 'Saving…' : 'Save Reflection'}
		</Button>
	</form>
</div>

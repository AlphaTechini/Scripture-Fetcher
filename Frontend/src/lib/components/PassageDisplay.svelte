
<script lang="ts">
	import ScrollCard from './ui/ScrollCard.svelte';

	interface Props {
		reference: string;
		passageText: string;
		book: string;
		chapter: string;
	}

	let { reference, passageText, book, chapter }: Props = $props();
</script>

<ScrollCard title="{book} {chapter}">
	<p class="font-heading text-xs font-semibold text-gold mb-2">{reference}</p>
	<p class="font-body text-brown leading-relaxed whitespace-pre-wrap">{passageText}</p>
</ScrollCard>

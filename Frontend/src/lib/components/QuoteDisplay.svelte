<script lang="ts">
	interface Props {
		verseText: string;
		verseReference: string;
	}

	let { verseText, verseReference }: Props = $props();
</script>

<div class="scroll-card max-w-2xl mx-auto mb-8">
	<div class="text-center">
		<p class="font-accent italic text-xl md:text-2xl text-brown leading-relaxed mb-4">
			"{verseText}"
		</p>
		<p class="font-heading text-gold font-semibold">— {verseReference}</p>
	</div>
</div>

<script lang="ts">
	let { title, class: className = '', children }: { title?: string; class?: string; children: import('svelte').Snippet } = $props();
</script>

<div class="scroll-card {className}">
	{#if title}
		<div class="absolute -top-3 left-6 bg-parchment-dark px-3">
			<span class="font-heading text-sm font-semibold text-gold">{title}</span>
		</div>
	{/if}
	<div class="ink-border rounded p-4">
		{@render children()}
	</div>
</div>

<script lang="ts">
	let { class: className = '', children }: { class?: string; children: import('svelte').Snippet } = $props();
</script>

<div class="bg-parchment-dark border border-gold/50 rounded-lg shadow-md p-6 {className}">
	{@render children()}
</div>

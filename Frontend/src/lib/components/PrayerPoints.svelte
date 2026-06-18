
<script lang="ts">
	interface Point {
		content: string;
		passageRef: string | null;
		orderIndex: number;
	}

	interface Props {
		points: Point[];
	}

	let { points }: Props = $props();
</script>

<div>
	<h4 class="font-heading text-sm font-bold text-ink mb-3">Prayer Points</h4>
	<ol class="space-y-2 list-decimal list-inside">
		{#each [...points].sort((a, b) => a.orderIndex - b.orderIndex) as point}
			<li class="font-body text-brown text-sm">
				{point.content}
				{#if point.passageRef}
					<span class="text-gold text-xs ml-1">({point.passageRef})</span>
				{/if}
			</li>
		{/each}
	</ol>
</div>

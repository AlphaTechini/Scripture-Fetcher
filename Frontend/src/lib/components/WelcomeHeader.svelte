<script lang="ts">
	interface Props {
		username: string;
	}

	let { username }: Props = $props();
</script>

<h1 class="font-heading text-5xl md:text-7xl font-bold text-ink text-center mb-4">
	Welcome {username}!
</h1>
<div class="w-24 h-1 bg-gold mx-auto mb-6"></div>

<script lang="ts">
	interface Props {
		label: string;
		options: string[];
		value?: string;
		onchange?: (value: string) => void;
	}

	let { label, options, value = $bindable(''), onchange }: Props = $props();

	let isOpen = $state(false);
	let searchText = $state('');
	let buttonId = $state(`dd-${Math.random().toString(36).slice(2)}`);

	let filteredOptions = $derived(
		searchText
			? options.filter((opt) => opt.toLowerCase().includes(searchText.toLowerCase()))
			: options
	);

	function selectOption(option: string) {
		value = option;
		searchText = '';
		isOpen = false;
		onchange?.(option);
	}
</script>

<div class="relative">
	<label for={buttonId} class="block font-heading text-sm font-semibold text-brown mb-2">{label}</label>
	<button
		id={buttonId}
		type="button"
		class="w-full px-4 py-2.5 bg-parchment-dark border-2 border-gold/50 rounded font-body text-left text-brown hover:border-gold transition-colors"
		onclick={() => (isOpen = !isOpen)}
	>
		{value || 'Select...'}
	</button>

	{#if isOpen}
		<div class="absolute z-10 w-full mt-1 bg-parchment-dark border-2 border-gold rounded shadow-lg max-h-60 overflow-auto">
			<div class="p-2 border-b border-gold/30">
				<input
					type="text"
					bind:value={searchText}
					placeholder="Search..."
					class="w-full px-3 py-1.5 bg-parchment border border-gold/30 rounded font-body text-sm text-brown focus:outline-none focus:border-gold"
				/>
			</div>
			{#each filteredOptions as option}
				<button
					type="button"
					class="w-full px-4 py-2 text-left font-body text-brown hover:bg-gold/20 transition-colors"
					onclick={() => selectOption(option)}
				>
					{option}
				</button>
			{/each}
			{#if filteredOptions.length === 0}
				<p class="px-4 py-2 text-sm text-brown-light font-body">No matches found</p>
			{/if}
		</div>
	{/if}
</div>

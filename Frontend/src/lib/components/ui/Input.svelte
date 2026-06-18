<script lang="ts">
	interface Props {
		label: string;
		type?: string;
		value: string;
		onchange?: (value: string) => void;
		placeholder?: string;
		required?: boolean;
		readonly?: boolean;
	}

	let { label, type = 'text', value, onchange, placeholder, required = false, readonly = false }: Props = $props();
	let inputId = $state(crypto.randomUUID());
</script>

<div>
	<label for={inputId} class="block font-heading text-sm font-semibold text-brown mb-2">{label}</label>
	<input
		id={inputId}
		{type}
		bind:value
		{placeholder}
		{required}
		{readonly}
		class="w-full px-4 py-2.5 bg-parchment border-2 border-gold/50 rounded font-body text-brown focus:outline-none focus:border-gold transition-colors {readonly ? 'opacity-75 cursor-not-allowed' : ''}"
		onchange={onchange ? (e) => onchange((e.target as HTMLInputElement).value) : undefined}
	/>
</div>

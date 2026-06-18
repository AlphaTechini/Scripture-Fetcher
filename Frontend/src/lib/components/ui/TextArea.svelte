<script lang="ts">
	interface Props {
		label: string;
		value?: string;
		onchange?: (value: string) => void;
		placeholder?: string;
		rows?: number;
	}

	let { label, value = $bindable(''), onchange, placeholder, rows = 3 }: Props = $props();
	let inputId = $state(`ta-${Math.random().toString(36).slice(2)}`);
</script>

<div>
	<label for={inputId} class="block font-heading text-sm font-semibold text-brown mb-2">{label}</label>
	<textarea
		id={inputId}
		bind:value
		{placeholder}
		{rows}
		class="w-full px-4 py-2.5 bg-parchment border-2 border-gold/50 rounded font-body text-brown focus:outline-none focus:border-gold transition-colors resize-none"
		onchange={onchange ? (e) => onchange((e.target as HTMLTextAreaElement).value) : undefined}
	></textarea>
</div>

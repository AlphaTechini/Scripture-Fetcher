<script lang="ts">
	let {
		variant = 'seal',
		size = 'md',
		disabled = false,
		type = 'button',
		children
	}: {
		variant?: 'primary' | 'secondary' | 'seal';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		type?: 'button' | 'submit';
		children: import('svelte').Snippet;
	} = $props();

	const baseClasses = 'font-heading font-semibold rounded transition-colors inline-flex items-center justify-center';

	const variantClasses = {
		primary: 'bg-brown text-parchment hover:bg-brown-light',
		secondary: 'bg-parchment-dark text-brown border-2 border-gold hover:bg-gold/20',
		seal: 'bg-aged-red text-parchment hover:bg-seal shadow-md'
	};

	const sizeClasses = {
		sm: 'text-sm px-3 py-1.5',
		md: 'text-base px-5 py-2.5',
		lg: 'text-lg px-8 py-3.5'
	};
</script>

<button
	{type}
	{disabled}
	class="{baseClasses} {variantClasses[variant]} {sizeClasses[size]} {disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
>
	{@render children()}
</button>

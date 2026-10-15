<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let {
		data,
		form
	}: { data: { email: string }; form: { error?: string; success?: string } | null } = $props();

	let code = $state('');
	let verifying = $state(false);
	let resending = $state(false);

	function handleCodeInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const digits = input.value.replace(/\D/g, '').slice(0, 6);
		input.value = digits;
		code = digits;
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-[#F5E6C8] px-4">
	<div class="w-full max-w-md">
		<div class="text-center mb-8">
			<h1 class="font-[Cinzel] text-4xl font-bold text-[#1A1A1A] mb-2">Scripture Fetcher</h1>
			<p class="font-[Cormorant_Garamond] text-lg text-[#3E2723]">Verify your email to begin</p>
		</div>

		<div class="bg-[#E8D5B7] border-2 border-[#C9A84C] rounded-lg p-8 shadow-lg">
			<p class="font-[Cormorant_Garamond] text-base text-[#3E2723] text-center mb-6">
				We sent a 6-digit code to
				<span class="font-semibold text-[#1A1A1A] block mt-1 break-all">{data.email}</span>
			</p>

			{#if form?.error}
				<div
					class="mb-4 p-3 bg-[#8B2500]/10 border border-[#8B2500] rounded text-[#8B2500] text-sm"
				>
					{form.error}
				</div>
			{/if}

			{#if form?.success}
				<div
					class="mb-4 p-3 bg-green-900/10 border border-green-900 rounded text-green-900 text-sm"
				>
					{form.success}
				</div>
			{/if}

			<form
				method="POST"
				action="?/verify"
				use:enhance={() => {
					verifying = true;
					return async ({ update }) => {
						verifying = false;
						update();
					};
				}}
				class="space-y-6"
			>
				<div>
					<label
						for="code"
						class="block font-[Cormorant_Garamond] text-sm font-semibold text-[#3E2723] mb-2 text-center"
					>
						Verification Code
					</label>
					<input
						type="text"
						id="code"
						name="code"
						value={code}
						oninput={handleCodeInput}
						required
						inputmode="numeric"
						autocomplete="one-time-code"
						maxlength="6"
						pattern="[0-9]{6}"
						placeholder="000000"
						class="w-full px-4 py-3 bg-[#F5E6C8] border-2 border-[#C9A84C] rounded font-[Courier_New] text-2xl tracking-[0.5em] text-center text-[#1A1A1A] focus:outline-none focus:border-[#8B2500]"
					/>
				</div>

				<button
					type="submit"
					disabled={!/^\d{6}$/.test(code) || verifying}
					class="w-full py-3 bg-[#8B2500] text-[#F5E6C8] font-[Cinzel] font-semibold rounded hover:bg-[#6B1D00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{verifying ? 'Verifying…' : 'Verify & Enter'}
				</button>
			</form>

			<form
				method="POST"
				action="?/resend"
				use:enhance={() => {
					resending = true;
					return async ({ update }) => {
						resending = false;
						update();
					};
				}}
				class="mt-4 text-center"
			>
				<button
					type="submit"
					disabled={resending}
					class="font-[Cormorant_Garamond] text-sm text-[#8B2500] hover:text-[#6B1D00] underline disabled:opacity-50"
				>
					{resending ? 'Sending…' : "Didn't get the code? Resend"}
				</button>
			</form>

			<div class="mt-6 text-center">
				<a
					href={resolve('/auth/login')}
					class="font-[Cormorant_Garamond] text-sm text-[#5D4037] hover:text-[#3E2723] underline"
				>
					Wrong email? Start over
				</a>
			</div>
		</div>
	</div>
</div>

<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();

	let mode: 'signin' | 'signup' = $state('signin');
</script>

<div class="min-h-screen flex items-center justify-center bg-[#F5E6C8] px-4">
	<div class="w-full max-w-md">
		<div class="text-center mb-8">
			<h1 class="font-[Cinzel] text-4xl font-bold text-[#1A1A1A] mb-2">Scripture Fetcher</h1>
			<p class="font-[Cormorant_Garamond] text-lg text-[#3E2723]">
				{mode === 'signin' ? 'Welcome back, scholar' : 'Begin your journey'}
			</p>
		</div>

		<div class="bg-[#E8D5B7] border-2 border-[#C9A84C] rounded-lg p-8 shadow-lg">
			{#if form?.error}
				<div class="mb-4 p-3 bg-[#8B2500]/10 border border-[#8B2500] rounded text-[#8B2500] text-sm">
					{form.error}
				</div>
			{/if}

			{#if form?.success}
				<div class="mb-4 p-3 bg-green-900/10 border border-green-900 rounded text-green-900 text-sm">
					{form.success}
				</div>
			{/if}

			<form method="POST" action="?/{mode}" use:enhance>
				<div class="mb-4">
					<label for="email" class="block font-[Cormorant_Garamond] text-sm font-semibold text-[#3E2723] mb-2">
						Email
					</label>
					<input
						type="email"
						id="email"
						name="email"
						required
						class="w-full px-4 py-2 bg-[#F5E6C8] border border-[#C9A84C] rounded font-[Cormorant_Garamond] text-[#1A1A1A] focus:outline-none focus:border-[#8B2500]"
					/>
				</div>

				<div class="mb-4">
					<label for="password" class="block font-[Cormorant_Garamond] text-sm font-semibold text-[#3E2723] mb-2">
						Password
					</label>
					<input
						type="password"
						id="password"
						name="password"
						required
						minlength="6"
						class="w-full px-4 py-2 bg-[#F5E6C8] border border-[#C9A84C] rounded font-[Cormorant_Garamond] text-[#1A1A1A] focus:outline-none focus:border-[#8B2500]"
					/>
				</div>

				{#if mode === 'signup'}
					<div class="mb-6">
						<label for="confirmPassword" class="block font-[Cormorant_Garamond] text-sm font-semibold text-[#3E2723] mb-2">
							Confirm Password
						</label>
						<input
							type="password"
							id="confirmPassword"
							name="confirmPassword"
							required
							minlength="6"
							class="w-full px-4 py-2 bg-[#F5E6C8] border border-[#C9A84C] rounded font-[Cormorant_Garamond] text-[#1A1A1A] focus:outline-none focus:border-[#8B2500]"
						/>
					</div>
				{/if}

				<button
					type="submit"
					class="w-full py-3 bg-[#8B2500] text-[#F5E6C8] font-[Cinzel] font-semibold rounded hover:bg-[#6B1D00] transition-colors"
				>
					{mode === 'signin' ? 'Enter' : 'Create Account'}
				</button>
			</form>

			<div class="mt-6 text-center">
				<button
					type="button"
					class="font-[Cormorant_Garamond] text-sm text-[#8B2500] hover:text-[#6B1D00] underline"
					onclick={() => (mode = mode === 'signin' ? 'signup' : 'signin')}
				>
					{mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
				</button>
			</div>
		</div>
	</div>
</div>

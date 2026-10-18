<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();

	let mode: 'signin' | 'signup' = $state('signin');
	let showPassword = $state(false);
	let showConfirm = $state(false);
</script>

<div class="min-h-screen flex items-center justify-center bg-[#F5E6C8] px-4">
	<div class="w-full max-w-md animate-rise-in motion-reduce:animate-none">
		<div class="text-center mb-8">
			<h1 class="font-[Cinzel] text-4xl font-bold text-[#1A1A1A] mb-2">Scripture Fetcher</h1>
			<p class="font-[Cormorant_Garamond] text-lg text-[#3E2723]">
				{mode === 'signin' ? 'Welcome back, scholar' : 'Begin your journey'}
			</p>
		</div>

		<div class="bg-[#E8D5B7] border-2 border-[#C9A84C] rounded-lg p-8 shadow-lg">
			{#if form?.error}
				<div
					class="mb-4 p-3 bg-[#8B2500]/10 border border-[#8B2500] rounded text-[#8B2500] text-sm"
				>
					{form.error}
				</div>
			{/if}

			<form method="POST" action="?/{mode}" use:enhance>
				<div class="mb-4">
					<label
						for="email"
						class="block font-[Cormorant_Garamond] text-sm font-semibold text-[#3E2723] mb-2"
					>
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
					<label
						for="password"
						class="block font-[Cormorant_Garamond] text-sm font-semibold text-[#3E2723] mb-2"
					>
						Password
					</label>
					<div class="relative">
						<input
							type={showPassword ? 'text' : 'password'}
							id="password"
							name="password"
							required
							minlength="6"
							class="w-full px-4 py-2 pr-10 bg-[#F5E6C8] border border-[#C9A84C] rounded font-[Cormorant_Garamond] text-[#1A1A1A] focus:outline-none focus:border-[#8B2500]"
						/>
						<button
							type="button"
							aria-label={showPassword ? 'Hide password' : 'Show password'}
							class="absolute inset-y-0 right-0 px-3 text-[#3E2723] hover:text-[#8B2500]"
							onclick={() => (showPassword = !showPassword)}
						>
							{#if showPassword}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="lucide lucide-eye-off"
									><path
										d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
									/><line x1="1" y1="1" x2="23" y2="23" /></svg
								>
							{:else}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="lucide lucide-eye"
									><path
										d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
									/><circle cx="12" cy="12" r="3" /></svg
								>
							{/if}
						</button>
					</div>
				</div>

				{#if mode === 'signup'}
					<div class="mb-6">
						<label
							for="confirmPassword"
							class="block font-[Cormorant_Garamond] text-sm font-semibold text-[#3E2723] mb-2"
						>
							Confirm Password
						</label>
						<div class="relative">
							<input
								type={showConfirm ? 'text' : 'password'}
								id="confirmPassword"
								name="confirmPassword"
								required
								minlength="6"
								class="w-full px-4 py-2 pr-10 bg-[#F5E6C8] border border-[#C9A84C] rounded font-[Cormorant_Garamond] text-[#1A1A1A] focus:outline-none focus:border-[#8B2500]"
							/>
							<button
								type="button"
								aria-label={showConfirm ? 'Hide password' : 'Show password'}
								class="absolute inset-y-0 right-0 px-3 text-[#3E2723] hover:text-[#8B2500]"
								onclick={() => (showConfirm = !showConfirm)}
							>
								{#if showConfirm}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="lucide lucide-eye-off"
										><path
											d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
										/><line x1="1" y1="1" x2="23" y2="23" /></svg
									>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="lucide lucide-eye"
										><path
											d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
										/><circle cx="12" cy="12" r="3" /></svg
									>
								{/if}
							</button>
						</div>
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
					{mode === 'signin'
						? "Don't have an account? Sign up"
						: 'Already have an account? Sign in'}
				</button>
			</div>
		</div>
	</div>
</div>

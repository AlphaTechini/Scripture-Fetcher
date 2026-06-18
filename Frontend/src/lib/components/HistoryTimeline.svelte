
<script lang="ts">
	interface SessionItem {
		id: string;
		mood: string;
		category: string;
		timeOfDay: string;
		timeOfYear: string;
		currentDateText: string;
		createdAt: Date | string;
		storyTitles: string | string[] | null;
	}

	interface Props {
		sessions: SessionItem[];
	}

	let { sessions }: Props = $props();
</script>

<div class="space-y-4">
	{#each sessions as session (session.id)}
		<a
			href="/session/{session.id}"
			class="block scroll-card hover:border-gold hover:shadow-lg transition-all"
		>
			<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
				<div>
					<p class="font-heading text-sm font-bold text-gold">
						{new Date(session.createdAt).toLocaleDateString()}
					</p>
					<p class="font-body text-brown text-base font-semibold mt-1">
						{session.mood} • {session.category}
					</p>
					{#if session.storyTitles}
						<p class="font-body text-brown-light text-sm mt-1">
							{#each session.storyTitles as title, i}
								{title}{#if i < session.storyTitles.length - 1}, {/if}
							{/each}
						</p>
					{/if}
				</div>
				<div class="text-left md:text-right">
					<span class="text-xs font-body text-brown-light">{session.timeOfDay} • {session.timeOfYear}</span>
				</div>
			</div>
		</a>
	{/each}
</div>

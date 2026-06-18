export function getTimeOfDay(): string {
	const hour = new Date().getHours();
	if (hour >= 5 && hour < 12) return 'Morning';
	if (hour >= 12 && hour < 17) return 'Afternoon';
	if (hour >= 17 && hour < 21) return 'Evening';
	return 'Night';
}

export function getTimeOfYear(): string {
	const now = new Date();
	const month = now.getMonth();
	const day = now.getDate();

	if (month === 11 && day >= 20) return 'Christmas';
	if (month === 0) return 'New Year';
	if (month === 2 || month === 3) return 'Lent';
	if (month === 3 || month === 4) return 'Easter';
	if (month >= 5 && month <= 7) return 'Summer';
	if (month >= 8 && month <= 10) return 'Autumn';
	return 'Winter';
}

export function getCurrentDateText(): string {
	return new Date().toISOString().split('T')[0];
}

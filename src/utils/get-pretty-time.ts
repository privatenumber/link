export const getPrettyTime = () => (new Date()).toLocaleTimeString(
	undefined,
	{
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric',
		hour12: true,
	},
);

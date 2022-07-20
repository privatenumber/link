console.log(JSON.stringify([
	'package-entry',
	require('package-binary'),
	require('package-files'),
	require('@scope/package-scoped'),
	require('package-deep-link'),
]));

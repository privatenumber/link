console.log(JSON.stringify([
	'package-entry',
	require('package-binary'),
	require('package-files'),
	require('@organization/package-organization'),
	require('package-nested-link'),
]));

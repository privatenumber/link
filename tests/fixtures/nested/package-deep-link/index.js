const requireSafe = (specifier) => {
	try {
		return require(specifier);
	} catch {
		return null;
	}
};

module.exports = [
	'package-deep-link',
	requireSafe('package-files'),
	requireSafe('@organization/package-organization'),
];

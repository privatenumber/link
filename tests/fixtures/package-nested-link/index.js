const requireSafe = (specifier) => {
	try {
		return require(specifier);
	} catch {
		return null;
	}
};

module.exports = [
	'package-nested-link',
	requireSafe('package-files'),
];

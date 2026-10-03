const PROFILE_ROUTE_PATTERN = /["']\/\{\-\$locale\}\/profile\/\$handle["']\)\(\{/;

export function findProfileFunctionBinding(mainScript) {
	const routeMatch = PROFILE_ROUTE_PATTERN.exec(mainScript);
	if (!routeMatch) throw new Error('Could not locate the Maishift profile route.');

	const routeSource = mainScript.slice(routeMatch.index, routeMatch.index + 8_000);
	const loaderIndex = routeSource.indexOf('loader:');
	if (loaderIndex < 0) throw new Error('Could not locate the Maishift profile loader.');

	const loaderSource = routeSource.slice(loaderIndex, loaderIndex + 3_000);
	const binding = loaderSource.match(/([\w$]+)\(\{data:/)?.[1];
	if (!binding) throw new Error('Could not resolve the Maishift profile function binding.');
	return binding;
}

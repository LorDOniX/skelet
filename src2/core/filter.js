/**
 * Filter process input data and output can be used in template or in the code.
 *
 * @class $filter
 */
onix.factory("$filter", [
	"$di",
function(
	$di
) {
	/**
	 * Return filter by his name or returns empty filter. Filter name is concatenation of $filter + Filter name.
	 *
	 * @method filter
	 * @param  {String} filterName 
	 * @return {Object}
	 * @member $filter
	 */
	return function(filterName) {
		let emptyFilter = (value) => {
			return value || "";
		};
		
		if (!filterName) {
			return emptyFilter;
		}

		return $di.run({
			fn: (moduleObj) => {
				return moduleObj || emptyFilter;
			},
			// get filter name for injection
			inject: [$di.getFilterName(filterName)]
		});
	};
}]);

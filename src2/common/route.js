/**
 * Simple router for the application.
 * 
 * @class $route
 */
onix.service("$route", [
	"$location",
	"$template",
	"$di",
	"$routeParams",
function(
	$location,
	$template,
	$di,
	$routeParams
) {
	/**
	 * All routes.
	 *
	 * @private
	 * @type {Array}
	 * @member $route
	 */
	
	this._routes = [];

	/**
	 * Otherwise route.
	 *
	 * @private
	 * @type {Object}
	 * @member $route
	 */
	this._otherwise = null;

	/**
	 * Set $routeParams object. First clear all old keys and add new ones, if the available.
	 *
	 * @private
	 * @param {Object} [routeParams] Route params object
	 * @type {Object}
	 * @member $route
	 */
	this._setRouteParams = function(routeParams) {
		Object.keys($routeParams).forEach(key => {
			delete $routeParams[key];
		});

		routeParams = routeParams || {};

		Object.keys(routeParams).forEach(key => {
			$routeParams[key] = routeParams[key];
		});
	};

	/**
	 * Add route to the router.
	 *
	 * @chainable
	 * @param  {String} url 
	 * @param  {Object} config
	 * @param  {String} [config.templateId] Template ID which will be used for templateUrl
	 * @param  {String} [config.templateUrl] Template URL which will be loaded and cached in the $template
	 * @param  {String} [config.controller] Run this function if the route is used
	 * @param  {Object} [config.xyz] Rest parameters goes to the $routeParams
	 * @member $route
	 */
	this.when = function(url, config) {
		this._routes.push({
			url: url,
			config: config
		});

		return this;
	};

	/**
	 * Otherwise.
	 *
	 * @chainable
	 * @param  {String} page
	 * @param  {Object} config
	 * @param  {String} [config.templateId] Template ID which will be used for templateUrl
	 * @param  {String} [config.templateUrl] Template URL which will be loaded and cached in the $template
	 * @param  {String} [config.controller] Run this function if the route is used
	 * @param  {Object} [config.xyz] Rest parameters goes to the $routeParams
	 * @member $route
	 */
	this.otherwise = function(config) {
		this._otherwise = {
			config: config
		};

		return this;
	};

	/**
	 * Run controller from route path.
	 *
	 * @private
	 * @param  {Array|Function} contr
	 * @param  {Object} [routeParams] Additonal data
	 * @member $route
	 */
	this._runController = function(contr, routeParams) {
		let pp = $di.parseParam(contr);

		this._setRouteParams(routeParams);

		$di.run({
			fn: pp.fn,
			inject: pp.inject
		});
	};

	/**
	 * Route GO. Walk through all routes, if there is match, route controller will be called.
	 *
	 * @member $route
	 */
	this.go = function() {
		let path = $location.get();
		let find = false;
		let config = null;

		this._routes.every(item => {
			// exact match or regular expression
			if (path == item.url || path.match(new RegExp(item.url))) {
				config = item.config;
				find = true;
				
				return false;
			}
			else {
				return true;
			}
		});

		if (!find && this._otherwise) {
			config = this._otherwise.config;
		}

		if (config) {
			let templateId = "";
			let templateUrl = null;
			let contr = null;
			let routeParams = {};

			Object.keys(config).forEach(key => {
				let value = config[key];

				switch (key) {
					case "templateId":
						templateId = value;
						break;

					case "templateUrl":
						templateUrl = value;
						break;
						
					case "controller":
						contr = value;
						break;

					default:
						routeParams[key] = value;
				}
			});

			// run controller function
			let runController = () => {
				if (contr) {
					this._runController(contr, routeParams);
				}
			};

			if (templateUrl) {
				$template.load(config.templateId || config.templateUrl, config.templateUrl).then(runController);
			}
			else {
				runController();
			}
		}
	};
}]);

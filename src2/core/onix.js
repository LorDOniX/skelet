onix = (function() {
	/* ************************************* $module **************************** */

	/**
	 * Module object - handles one module object with services, factories etc.
	 * This object cannot be used in dependency injection!
	 * 
	 * @class $module
	 */
	class $module { 
		/**
		 * New module.
		 * 
		 * @param  {String} name Module name
		 * @param  {Array} dependencies Other modules dependencies
		 */
		constructor(name, dependencies) {
			/**
			 * All objects.
			 *
			 * @type {Object}
			 * @member $module
			 * @private
			 */
			this._objects = {};

			/**
			 * All run objects.
			 *
			 * @type {Object}
			 * @member $module
			 * @private
			 */
			this._runs = [];

			/**
			 * All config objects.
			 *
			 * @type {Object}
			 * @member $module
			 * @private
			 */
			this._configs = [];

			/**
			 * Module name.
			 * 
			 * @type {String}
			 * @member $module
			 * @private
			 */
			this._name = name || "";

			/**
			 * Module dependencies.
			 * 
			 * @type {Array}
			 * @member $module
			 * @private
			 */
			this._dependencies = dependencies || [];
		}

		/**
		 * Parse parameters. From param parse function and dependencies.
		 *
		 * @property {Function}
		 * @param  {Array|Function} param 
		 * @return {Object} Parse object
		 * @member $module
		 * @static
		 * @method parseParam
		 */
		static parseParam(param) {
			let fn;
			let inject = [];

			if (Array.isArray(param)) {
				param.every(item => {
					if (typeof item === "function") {
						fn = item;

						return false;
					}
					else if (typeof item === "string") {
						inject.push(item);
					}

					return true;
				});
			}
			else {
				fn = param;
			}

			return {
				fn: fn,
				inject: inject
			}
		}

		/**
		 * Get filter name.
		 * 
		 * @param  {String} name
		 * @return {String}
		 * @member $module
		 * @static
		 * @method getFilterName
		 */
		static getFilterName(name) {
			name = name || "";

			return $module.CONST.FILTER_NAME + name[0].toUpperCase() + name.substr(1);
		}

		/**
		 * Get dependencies.
		 * 
		 * @return {Array}
		 * @member $module
		 * @method getDependencies
		 */
		getDependencies() {
			return this._dependencies;
		}

		/**
		 * Get module name.
		 * 
		 * @return {String}
		 * @member $module
		 * @method getName
		 */
		getName() {
			return this._name;
		}

		/**
		 * Get module configs.
		 * 
		 * @return {Array}
		 * @member $module
		 * @method getConfigs
		 */
		getConfigs() {
			return this._configs;
		}

		/**
		 * Get module runs.
		 * 
		 * @return {Array}
		 * @member $module
		 * @method getRuns
		 */
		getRuns() {
			return this._runs;
		}

		/**
		 * Get module objects.
		 * 
		 * @return {Array}
		 * @member $module
		 * @method getObjects
		 */
		getObjects() {
			return this._objects;
		}

		/**
		 * Add provider to the application.
		 *
		 * @chainable
		 * @param  {String} name 
		 * @param  {Function} param
		 * @member $module
		 * @method provider
		 */
		provider(name, param) {
			if (!name || !param) {
				return this;
			}

			let pp = $module.parseParam(param);

			this._objects[name + $module.CONST.PROVIDER_NAME] = {
				name: name + $module.CONST.PROVIDER_NAME,
				inject: pp.inject,
				fn: pp.fn,
				cache: null,
				type: $module.CONST.TYPE.PROVIDER
			};

			this._objects[name] = {
				name: name,
				inject: null,
				fn: null,
				cache: null,
				provider: name + $module.CONST.PROVIDER_NAME,
				type: $module.CONST.TYPE.FACTORY
			};

			return this;
		}

		/**
		 * Add service to the application.
		 *
		 * @chainable
		 * @param  {String} name 
		 * @param  {Function|Array} param
		 * @member $module
		 * @method service
		 */
		service(name, param) {
			if (!name || !param) {
				return this;
			}

			let pp = $module.parseParam(param);

			this._objects[name] = {
				name: name,
				inject: pp.inject,
				fn: pp.fn,
				cache: null,
				type: $module.CONST.TYPE.SERVICE
			};

			return this;
		}

		/**
		 * Add factory to the application.
		 *
		 * @chainable
		 * @param  {String} name 
		 * @param  {Function|Array} param
		 * @member $module
		 * @method factory
		 */
		factory(name, param) {
			if (!name || !param) {
				return this;
			}

			let pp = $module.parseParam(param);

			this._objects[name] = {
				name: name,
				inject: pp.inject,
				fn: pp.fn,
				cache: null,
				type: $module.CONST.TYPE.FACTORY
			};

			return this;
		}

		/**
		 * Add new constant.
		 *
		 * @chainable
		 * @param  {String} name
		 * @param  {Object} param
		 * @member $module
		 * @method constant
		 */
		constant(name, obj) {
			if (!name || !obj) {
				return this;
			}

			this._objects[name] = {
				name: name,
				cache: obj,
				type: $module.CONST.TYPE.CONSTANT
			};

			return this;
		}

		/**
		 * Add a new value.
		 *
		 * @chainable
		 * @param  {String} name
		 * @param  {Object} param
		 * @member $module
		 * @method value
		 */
		value(name, obj) {
			if (!name || !obj) {
				return this;
			}

			this._objects[name] = {
				name: name,
				cache: obj,
				type: $module.CONST.TYPE.VALUE
			};

			return this;
		}

		/**
		 * Add filter to the application.
		 *
		 * @chainable
		 * @param  {String} name 
		 * @param  {Function|Array} param
		 * @member $module
		 * @method filter
		 */
		filter(name, param) {
			if (!name || !param) {
				return this;
			}

			let pp = $module.parseParam(param);

			this._objects[$module.getFilterName(name)] = {
				name: name,
				inject: pp.inject,
				fn: pp.fn,
				cache: null,
				type: $module.CONST.TYPE.FILTER
			};

			return this;
		}

		/**
		 * Add a new config.
		 *
		 * @chainable
		 * @param  {Array|Function} param With DI
		 * @member $module
		 * @method config
		 */
		config(param) {
			if (!param) {
				return this;
			}

			let pp = $module.parseParam(param);

			this._configs.push({
				fn: pp.fn,
				inject: pp.inject,
				type: $module.CONST.TYPE.CONFIG
			});

			return this;
		}

		/**
		 * Add a new run.
		 *
		 * @chainable
		 * @param  {Array|Function} param With DI
		 * @member $module
		 * @method run
		 */
		run(param) {
			if (!param) {
				return this;
			}

			let pp = $module.parseParam(param);

			this._runs.push({
				fn: pp.fn,
				inject: pp.inject,
				type: $module.CONST.TYPE.RUN
			});

			return this;
		}

		/**
		 * Add a new controller - only for back comptability with angular modules.
		 * This feature is not implemented!
		 *
		 * @chainable
		 * @member $module
		 * @method controller
		 */
		controller() {
			return this;
		}

		/**
		 * Add a new directive - only for back comptability with angular modules.
		 * This feature is not implemented!
		 *
		 * @chainable
		 * @member $module
		 * @method directive
		 */
		directive() {
			return this;
		}
	};

	/**
	 * Module constants.
	 *
	 * @property {Object}
	 * @type {Object}
	 * @member $module
	 * @private
	 * @static
	 */
	$module.CONST = {
		PROVIDER_NAME: "Provider",
		FILTER_NAME: "$filter",
		TYPE: {
			PROVIDER: 1,
			SERVICE: 2,
			FACTORY: 3,
			CONSTANT: 4,
			VALUE: 5,
			FILTER: 6,
			CONFIG: 7,
			RUN: 8
		}
	};

	/* ************************************* $modules **************************** */

	/**
	 * Modules object - handles all modules in the application; runs object.
	 * This object cannot be used in dependency injection!
	 *
	 * @class $modules
	 */
	class $modules {
		constructor() {
			/**
			 * All modules array.
			 *
			 * @private
			 * @member $modules
			 * @type {Array}
			 */
			this._modules = [];

			/**
			 * All modules object - quick access.
			 *
			 * @private
			 * @member $modules
			 * @type {Object}
			 */
			this._modulesObj = {};

			/**
			 * All objects cache - quick access.
			 *
			 * @private
			 * @member $modules
			 * @type {Object}
			 */
			this._objectsCache = {};

			/**
			 * Modules constants.
			 *
			 * @private
			 * @member $modules
			 * @type {Object}
			 */
			this._CONST = {
				MODULE_SEPARATOR: "::",
			};

			// bind DOM ready
			document.addEventListener("DOMContentLoaded", () => {
				this._domLoad();
			});
		}

		/**
		 * Event - Dom LOAD.
		 *
		 * @member $modules
		 * @private
		 * @method _domLoad
		 */
		_domLoad() {
			let configs = [];
			let runs = [];

			this._modules.forEach(module => {
				let error = false;
				let dependencies = module.getDependencies();

				dependencies.every((dep) => {
					if (!(dep in this._modulesObj)) {
						console.error("Module '" + this._name + "' dependency '" + dep + "' not found!");
						error = true;

						return false;
					}
					else {
						return true;
					}
				});

				if (!error) {
					configs = configs.concat(module.getConfigs());
					runs = runs.concat(module.getRuns());
				}
			});

			// run all configs
			configs.forEach(config => {
				this.run(config, true);
			});

			// run all runs
			runs.forEach(run => {
				this.run(run);
			});
		}

		/**
		 * Get object by his name.
		 *
		 * @param {String} name Object name
		 * @return {Object} Object data
		 * @member $modules
		 * @private
		 * @method _getObject
		 */
		_getObject(name) {
			let output = null;

			// get from cache
			if (name in this._objectsCache) {
				output = this._objectsCache[name];
			}
			else {
				let searchModuleName = "";
				let searchObjectName = "";

				if (name.indexOf(this._CONST.MODULE_SEPARATOR) != -1) {
					let parts = name.split(this._CONST.MODULE_SEPARATOR);

					if (parts.length == 2) {
						searchModuleName = parts[0];
						searchObjectName = parts[1];
					}
					else {
						console.error("Get object " + name + " error! Wrong module separator use.");

						return null;
					}
				}
				else {
					searchObjectName = name;
				}

				this._modules.every(module => {
					let moduleObjects = module.getObjects();

					if (searchModuleName) {
						if (module.getName() != searchModuleName) return true;

						if (searchObjectName in moduleObjects) {
							output = moduleObjects[searchObjectName];

							return false;
						}
						else {
							console.error("Get object " + searchObjectName + " error! Cannot find object in the module " + searchModuleName + ".");

							return false;
						}
					}
					else {
						if (searchObjectName in moduleObjects) {
							output = moduleObjects[searchObjectName];

							return false;
						}
						else {
							return true;
						}
					}
				});

				// save to cache
				this._objectsCache[name] = output;
			}

			return output;
		};

		/**
		 * Function which does nothing.
		 *
		 * @member $modules
		 * @method noop
		 */
		noop() {}

		/**
		 * Run object configuration; returns his cache (data).
		 *
		 * @param  {Object}  obj Object configuration
		 * @param  {Boolean} [isConfig] Is config phase?
		 * @param  {Array} [parent] Parent objects
		 * @return {Object}
		 * @member $modules
		 * @method run
		 */
		run(obj, isConfig, parent) {
			parent = parent || [];

			if (parent.indexOf(obj.name) != -1) {
				console.error("Circular dependency error! Object name: " + obj.name + ", parents: " + parent.join("|"));

				return null;
			}

			let inject = [];

			if (obj.provider) {
				let providerObj = this._getObject(obj.provider);

				if (!providerObj.cache) {
					let providerFn = providerObj.fn || this.noop;

					providerObj.cache = new providerFn();
				}

				let getFn = providerObj.cache["$get"] || this.noop;
				let pp = $module.parseParam(getFn);

				obj.fn = pp.fn;
				obj.inject = pp.inject;

				delete obj.provider;
			}

			if (obj.inject && obj.inject.length) {
				obj.inject.forEach(objName => {
					if (typeof objName === "string") {
						let injObj = this._getObject(objName);

						if (!injObj) {
							console.error("Object name: " + objName + " not found!");

							inject.push(null);
						}
						else {
							inject.push(this.run(injObj, isConfig, obj.name ? parent.concat(obj.name) : parent));
						}
					}
					else if (typeof objName === "object") {
						inject.push(objName);
					}
				});
			}

			// config phase
			if (isConfig) {
				switch (obj.type) {
					case $module.CONST.TYPE.PROVIDER:
						if (!obj.cache) {
							let fn = obj.fn || this.noop;

							obj.cache = new fn();
						}

						return obj.cache;
						break;

					case $module.CONST.TYPE.CONSTANT:
						return obj.cache;
						break;

					case $module.CONST.TYPE.CONFIG:
						let fn = obj.fn || this.noop;

						return fn.apply(fn, inject);
						break;

					default:
						return null;
				}
			}
			// run phase
			else {
				switch (obj.type) {
					case $module.CONST.TYPE.FACTORY:
					case $module.CONST.TYPE.FILTER:
						if (!obj.cache) {
							let fn = obj.fn || this.noop;

							obj.cache = fn.apply(fn, inject);
						}

						return obj.cache;
						break;

					case $module.CONST.TYPE.SERVICE:
						if (!obj.cache) {
							let fn = obj.fn || this.noop;
							let serviceObj = Object.create(fn.prototype);

							fn.apply(serviceObj, inject);
							obj.cache = serviceObj;
						}
						
						return obj.cache;
						break;

					case $module.CONST.TYPE.VALUE:
						return obj.cache;
						break;

					case $module.CONST.TYPE.CONSTANT:
						return obj.cache;
						break;

					case $module.CONST.TYPE.RUN:
						let fn = obj.fn || this.noop;

						return fn.apply(fn, inject);
						break;

					default:
						return null;
				}
			}
		}

		/**
		 * Add a new module to the application.
		 * 
		 * @param {String} name Module name
		 * @param {Array} [dependencies] Module dependencies
		 * @return {Object} Created module
		 * @member $modules
		 * @method addModule
		 */
		addModule(name, dependencies) {
			let module = new $module(name, dependencies);

			this._modulesObj[name] = module
			this._modules.push(module);

			return module;
		}
	};

	// new instance from $modules class
	let $modulesInst = new $modules();

	/* ************************************* onix **************************** */

	/**
	 * Main framework object, which is created like new module with name 'onix'.
	 * Module has addtional functions.
	 * 
	 * @class onix
	 */
	let onix = $modulesInst.addModule("onix");

	/**
	 * Add a new module to the application.
	 * 
	 * @param {String} name Module name
	 * @param {Array} [dependencies] Module dependencies
	 * @return {$module} Created module
	 * @static
	 * @member onix
	 */
	onix.module = function(name, dependencies) {
		return $modulesInst.addModule(name, dependencies);
	};

	/**
	 * Empty function.
	 *
	 * @member onix
	 * @method noop
	 * @static
	 */
	onix.noop = $modulesInst.noop;

	/**
	 * Return all occurences between left and right delimeter inside string value.
	 * 
	 * @param  {String} txt Input string
	 * @param  {String} leftDelimeter  one or more characters
	 * @param  {String} rightDelimeter one or more characters
	 * @method match
	 * @static
	 * @return {Array}
	 */
	onix.match = function(txt, leftDelimeter, rightDelimeter) {
		let matches = [];
		let open = 0;
		let ldl = leftDelimeter.length;
		let rdl = rightDelimeter.length;
		let match = "";

		for (let i = 0; i < txt.length; i++) {
			let item = txt[i];
			let lpos = i - ldl + 1;
			let rpos = i - rdl + 1;

			// one sign - only check; more - check current + prev items to match leftDelimeter
			if ((ldl == 1 && item == leftDelimeter) || (ldl > 1 && (lpos >= 0 ? txt.substr(lpos, ldl) : "") == leftDelimeter)) {
				open++;

				if (open == 1) {
					continue;
				}
			}

			// same as left + remove
			if ((rdl == 1 && item == rightDelimeter) || (rdl > 1 && (rpos >= 0 ? txt.substr(rpos, rdl) : "") == rightDelimeter)) {
				open--;

				if (rdl > 1) {
					// remove rightDelimeter rest parts
					match = match.substr(0, match.length - rdl + 1);
				}
			}

			if (open > 0) {
				match += item;
			}

			if (!open && match.length) {
				matches.push(match);
				match = "";
			}
		}

		return matches;
	};

	/**
	 * Split string with delimeter. Similar to string.split(), but keeps opening strings/brackets in the memory.
	 * "5, {x:5, c: 6}, 'Roman, Peter'".split(",") => ["5", " {x:5", " c: 6}", " 'Roman", " Peter'"]
	 * onix.split("5, {x:5, c: 6}, 'Roman, Peter'", ",") => ["5", "{x:5, c: 6}", "'Roman, Peter"]
	 * 
	 * @param  {String} txt Input string
	 * @param  {String} delimeter one character splitter
	 * @method match
	 * @static
	 * @return {Array}
	 */
	onix.split = function(txt, delimeter) {
		txt = txt || "";
		delimeter = delimeter || ",";

		let open = 0;
		let matches = [];
		let match = "";
		let strStart = false;
		let len = txt.length;

		for (let i = 0; i < len; i++) {
			let item = txt[i];

			switch (item) {
				case "'":
				case '"':
					if (strStart) {
						strStart = false;
						open--;
					}
					else {
						strStart = true;
						open++;
					}
					break;

				case "{":
				case "[":
					open++;
					break;

				case "}":
				case "]":
					open--;
					break;
			}

			// delimeter
			if (item == delimeter && !open) {
				if (match.length) {
					matches.push(match);
				}

				match = "";
			}
			else {
				match += item;
			}

			// end
			if (i == len - 1 && match.length) {
				matches.push(match);
			}
		}

		return matches;
	};

	/**
	 * Framework info.
	 *
	 * @member onix
	 * @static
	 */
	onix.info = function() {
		console.log("{ONIX_INFO}");
	};

	/* ************************************* $di **************************** */

	onix.factory("$di", function() {
		/**
		 * Helper factory for dependency injection and parsing function parameters.
		 * 
		 * @class $di
		 */
		return {
			/**
			 * Parse parameters. From param parse function and dependencies.
			 *
			 * @param  {Array|Function} param 
			 * @return {Object} Parse object
			 * @member $di
			 */
			parseParam: $module.parseParam,

			/**
			 * Get filter name.
			 * 
			 * @param  {String} name
			 * @return {String}
			 * @member $di
			 */
			getFilterName: $module.getFilterName,

			/**
			 * Run function with possible inject - handles dependency injection.
			 * 
			 * @param  {Object} runObj
			 * @param  {Function} runObj.fn
			 * @param  {Array} runObj.inject
			 * @return {Object} Function output
			 * @member $di
			 */
			run: function(runObj) {
				if (!runObj) return null;
				
				if (!runObj.fn) {
					runObj.fn = () => {};
				}

				// def. type
				runObj.type = $module.CONST.TYPE.RUN;

				return $modulesInst.run(runObj);
			}
		}
	});

	return onix;
})();

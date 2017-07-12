/**
 * Support class for location operations.
 * 
 * @class $location
 */
onix.service("$location", function() {
	// ------------------------ public ----------------------------------------
	
	/**
	 * Page refresh.
	 *
	 * @member $location
	 */
	this.refresh = function() {
		location.reload();
	};

	/**
	 * Create a new search url. This method appends ? to the start of the url.
	 * 
	 * @param  {Object} obj
	 * @return {String}
	 * @member $location
	 */
	this.createSearchURL = function(obj) {
		let url = this.objToURL(obj);

		return url ? "?" + url : "";
	};

	/**
	 * Object to url.
	 * 
	 * @param  {Array|Object} { name: x, value: y} | obj Mapping key -> name, value -> value.
	 * @return {String}
	 * @member $location
	 */
	this.objToURL = function(obj) {
		let url = [];

		if (Array.isArray(obj)) {
			obj.forEach(item => {
				url.push(encodeURIComponent(item.name) + "=" + encodeURIComponent(item.value));
			});
		}
		else if (typeof obj === "object") {
			Object.keys(obj).forEach(key => {
				url.push(encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]));
			});
		}

		return url.join("&");
	};

	/**
	 * Get or set new url search. obj -> set new url from obj; !obj -> create obj from search part of url.
	 *
	 * @param  {Object} [obj]
	 * @return {Object}
	 * @member $location
	 */
	this.search = function(obj) {
		if (obj) {
			// write
			let newURL = this.createSearchURL(obj);

			if (newURL) {
				location.search = newURL;
			}
		}
		else {
			// read
			return this.parseSearch();
		}
	};

	/**
	 * Get current location - path + search (without hash).
	 *
	 * @return {String}
	 * @member $location
	 */
	this.get = function() {
		return location.pathname + location.search;
	};

	/**
	 * Decode value from URL.
	 * 
	 * @param  {String} value Input value
	 * @return {String}
	 * @member $location
	 */
	this.decodeSearchValue = function(value) {
		return decodeURIComponent(value.replace(/\+/g, " "));
	};

	/**
	 * Parse search part of the URL.
	 * 
	 * @param  {String} [query] Optinal query, default is location.search
	 * @return {Object} Object with keys and values from the search
	 * @member $location
	 */
	this.parseSearch = function(query) {
		// read
		query = query || location.search.substring(1);

		let match;
		let search = /([^&=]+)=?([^&]*)/g;
		let output = {};

		while (match = search.exec(query)) {
			let key = this.decodeSearchValue(match[1]);
			let value = this.decodeSearchValue(match[2]);

			if (key in output) {
				if (!Array.isArray(output[key])) {
					output[key] = [output[key]];
				}

				output[key].push(value);
			}
			else {
				output[key] = value;
			}
		}

		return output;
	};

	/**
	 * Parse URL to object.
	 * 
	 * @param {String} url Input URL
	 * @param {Object} [optsArg] optional configuration
	 * @param {Boolean} [optsArg.autoNumber = false] find number in string and convert it
	 * @param {Object} [optsArg.hints = {}] { key name : convert operation }, operations: "json" value -> object, "number" -> value -> number, fn(value) -> value
	 * @return {Object} parse url to object with keys like host, protocol etc.
	 * @member $location
	 */
	this.parseURL = function(url, optsArg) {
		let opts = {
			autoNumber: false,
			hints: {}
		};

		let obj = {
			protocol: "",
			host: "",
			port: null,
			path: "",
			search: null,
			hash: ""
		};

		for (let key in optsArg) {
			opts[key] = optsArg[key];
		}

		url = (url || "").trim();

		// protocol
		let test = url.match(/([a-zA-Z0-9]+):\/\//);

		if (test) {
			obj.protocol = test[1];
			url = url.replace(test[0], "");
		}

		// host
		test = url.match(/^[^?:#\/]+/);

		if (test) {
			obj.host = test[0];
			url = url.replace(obj.host, "");
		}

		// port
		test = url.match(/^:([0-9]+)[\/?#]?/);

		if (test) {
			obj.port = parseFloat(test[1]);
			url = url.replace(":" + test[1], "");
		}

		// path
		test = url.match(/^[^?#]+/);

		if (test) {
			obj.path = test[0];
			url = url.replace(obj.path, "");
		}

		// search
		test = url.match(/\?([^#]+)/);

		if (test) {
			let searchObj = this.parseSearch(test[1]);

			// update
			Object.keys(searchObj).forEach(key => {
				let value = searchObj[key];

				if (key in opts.hints) {
					let hintValue = opts.hints[key];

					if (typeof hintValue === "string") {
						switch (opts.hints[key]) {
							case "json":
								try {
									searchObj[key] = JSON.parse(value);
								}
								catch (err) {
									console.error(err);
								}
								break;

							case "number":
								searchObj[key] = parseFloat(value);
								break;
						}
					}
					else if (typeof hintValue === "function") {
						searchObj[key] = hintValue(value);
					}
				}
				else if (opts.autoNumber) {
					let numTest = value.match(/^[-]?[0-9]+\.?[0-9e]*$/);

					if (numTest) {
						let num = parseFloat(numTest[0]);

						searchObj[key] = isNaN(num) ? value : num;
					}
				}
			});

			obj.search = searchObj;

			url = url.replace(test[0], "");
		}

		// hash
		test = url.match(/#(.*)$/);

		if (test) {
			obj.hash = test[1];
		}

		return obj;
	};
});

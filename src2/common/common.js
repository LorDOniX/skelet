/**
 * Commom functions used in whole application.
 *
 * @class $common
 */
onix.service("$common", [
	"$promise",
function(
	$promise
) {
	/**
	 * Object copy, from source to dest.
	 *
	 * @param  {Object} dest
	 * @param  {Object} source
	 * @member $common
	 * @private
	 */
	this._objCopy = function(dest, source) {
		Object.keys(source).forEach(prop => {
			if (source.hasOwnProperty(prop)) {
				dest[prop] = this.cloneValue(source[prop]);
			}
		});
	};

	/**
	 * Inner method for chaining promises.
	 * 
	 * @param  {Object[]} opts
	 * @param  {String|Function} opts.method Function or method name inside scope
	 * @param  {Object} opts.scope Scope for method function
	 * @param  {Array} opts.args Additional arguments for function
	 * @param  {Function} resolve Resolve callback for $promise
	 * @param  {Array} outArray Array for output from all executed promises
	 * @param  {Number} rejected Number of rejected promises
	 * @private
	 * @member $common
	 */
	this._chainPromisesInner = function(opts, resolve, outArray, rejected) {
		let firstItem = opts.shift();

		if (firstItem) {
			// string or function itself
			let fn;
			let error = false;

			switch (typeof firstItem.method) {
				case "string":
					if (!firstItem.scope || !(firstItem.method in firstItem.scope)) {
						error = true;
					}
					else {
						fn = firstItem.scope[firstItem.method];

						if (typeof fn !== "function") {
							error = true;
						}
					}
					break;
				case "function":
					fn = firstItem.method;
					break;
				default:
					error = true;
			}

			if (!error) {
				fn.apply(firstItem.scope || fn, firstItem.args || []).then((data) => {
					outArray.push(data);

					this._chainPromisesInner(opts, resolve, outArray, rejected);
				}, (err) => {
					outArray.push(err);

					this._chainPromisesInner(opts, resolve, outArray, rejected + 1);
				});
			}
			else {
				resolve({
					output: outArray,
					rejected: rejected
				});
			}
		}
		else {
			resolve({
				output: outArray,
				rejected: rejected
			});
		}
	};

	/**
	 * Clone value without references.
	 * 
	 * @param  {Object} value Input value
	 * @param  {Number} [lvl] Recursive threshold
	 * @return {Object} cloned value
	 * @private
	 * @member $common
	 */
	this._cloneValue = function(value, lvl) {
		lvl = lvl || 0;

		// recursive call threshold
		if (lvl > 100) return null;

		switch (typeof value) {
			case "object":
				if (Array.isArray(value)) {
					// array
					let newArray = [];

					value.forEach(item => {
						newArray.push(this._cloneValue(item, lvl + 1));
					});

					return newArray;
				}
				else if (value && value instanceof Date) {
					// date
					return new Date(value.getTime());
				}
				else if (this.isElement(value)) {
					// element
					return value;
				}
				else if (value) {
					// object
					let newObj = {};

					Object.keys(value).forEach(prop => {
						if (value.hasOwnProperty(prop)) {
							newObj[prop] = this._cloneValue(value[prop], lvl + 1);
						}
					});

					return newObj;
				}
				else {
					// null
					return null;
				}

			case "undefined":
			case "boolean":
			case "function":
			case "number":
			case "string":
				return value;
		}
	};

	/**
	 * Compare two objects - returns array of differences between left -> right object.
	 * If length is 0 -> there is no difference.
	 * 
	 * @param  {Object} leftObj
	 * @param  {Object} rightObj
	 * @param  {Array[String]} [path] Object path
	 * @param  {Array[String]} [output] All differences
	 * @return {Array}
	 * @private
	 * @member $common
	 */
	this._compare = function(leftObj, rightObj, path, output) {
		path = path || [];
		output = output || [];
		
		Object.keys(leftObj).forEach(key => {
			let itemLeft = leftObj[key];
			let itemRight = rightObj[key];
			let curPath = path.concat(key).join(".");

			if (this.isObject(itemLeft)) {
				if (this.isObject(itemRight)) {
					this._compare(itemLeft, itemRight, path.concat(key), output);
				}
				else {
					output.push("missing object at path \"{0}\"".format(curPath));
				}
			}
			else if (typeof itemLeft === "string" && typeof itemRight !== "string") {
				output.push("wrong type at path \"{0}\"".format(curPath));
			}
		});

		return output;
	};

	/**
	 * Confirm window, returns promise.
	 *
	 * @param  {String} txt
	 * @return {$promise}
	 * @member $common
	 */
	this.confirm = function(txt) {
		return new $promise((resolve, reject) => {
			if (confirm(txt)) {
				resolve();
			}
			else {
				reject();
			}
		});
	};

	/**
	 * Merge multiple objects into the single one.
	 *
	 * @return {Object}
	 * @member $common
	 */
	this.merge = function() {
		let count = arguments.length;
		let dest = {};
		
		if (count > 0) {
			for (let i = 0; i < count; i++) {
				let source = arguments[i];

				this._objCopy(dest, source);
			}
		}

		return dest;
	};

	/**
	 * Extend one object by other; from source to dest.
	 *
	 * @param  {Object} dest
	 * @param  {Object} source
	 * @member $common
	 */
	this.extend = function(dest, source) {
		dest = dest || {};
		source = source || {};

		this._objCopy(dest, source);
	};

	/**
	 * Clone value without references.
	 * 
	 * @param  {Object} value Input value
	 * @return {Object} cloned value
	 * @member $common
	 */
	this.cloneValue = function(value) {
		return this._cloneValue(value, 0);
	};

	/**
	 * Inherit function with another function/s.
	 * First argument is source function, others are for inheritance.
	 * Last parameters have higher priority than the previous ones.
	 *
	 * @member $common
	 */
	this.inherit = function() {
		// first is source, rest is inherit classess
		let args = arguments;

		if (args.length < 2) return;

		let source = args[0].prototype;
		let inherits = Array.prototype.slice.call(args, 1);

		// all inherits items
		inherits.forEach(inhItem => {
			// iterate prototype items
			for (let p in inhItem.prototype) {
				source[p] = typeof inhItem.prototype[p] != "object"
					? inhItem.prototype[p]
					: JSON.parse(JSON.stringify(inhItem.prototype[p]));

			}
		});
	};

	/**
	 * Bind function arguments without scope.
	 *
	 * @param  {Function} cb
	 * @return {Function}
	 * @member $common
	 */
	this.bindWithoutScope = function(cb) {
		let bindArgs = Array.prototype.slice.call(arguments, 1);

		return function () {
			let internalArgs = Array.prototype.slice.call(arguments, 0);
			let args = Array.prototype.concat(internalArgs, bindArgs);

			return cb.apply(this, args);
		};
	};
	
	/**
	 * Missing for each for Node array.
	 *
	 * @param  {Object[]} nodes
	 * @param  {Function} cb
	 * @param  {Object|Function} scope
	 * @member $common
	 */
	this.nodesForEach = function(nodes, cb, scope) {
		if (typeof cb !== "function") return;
		
		if (nodes) {
			Array.prototype.slice.call(nodes).forEach((item, ind) => {
				cb.apply(scope || cb, [item, ind]);
			});
		}
	};

	/**
	 * Reverse for each.
	 *
	 * @param {Array} arr
	 * @param {Function} cb
	 * @param {Function} [scope]
	 * @member $common
	 */
	this.reverseForEach = function(arr, cb, scope) {
		if (typeof cb !== "function") return;

		arr = arr || [];

		for (let i = arr.length - 1; i >= 0; i--) {
			cb.apply(scope || this, [arr[i], i]);
		}
	};

	/**
	 * HEX value to DEC.
	 *
	 * @param  {String} hex
	 * @return {Number}
	 * @member $common
	 */
	this.hexToD = function(hex) {
		hex = hex.toLowerCase();

		switch (hex) {
			case "a":
				return 10;
			case "b":
				return 11;
			case "c":
				return 12;
			case "d":
				return 13;
			case "e":
				return 14;
			case "f":
				return 15;
			default:
				return parseInt(hex, 10);
		}
	};

	/**
	 * HEX value to RGB.
	 *
	 * @param  {String} hexColor
	 * @return {Object}
	 * @member $common
	 */
	this.hexToRGB = function(hexColor) {
		if (hexColor[0] == "#") {
			hexColor = hexColor.replace("#", "");

			if (hexColor.length == 3) {
				return {
					r: this.hexToD(hexColor[0]) * 16 + this.hexToD(hexColor[0]),
					g: this.hexToD(hexColor[1]) * 16 + this.hexToD(hexColor[1]),
					b: this.hexToD(hexColor[2]) * 16 + this.hexToD(hexColor[2])
				};
			}
			else {
				return {
					r: this.hexToD(hexColor[0]) * 16 + this.hexToD(hexColor[1]),
					g: this.hexToD(hexColor[2]) * 16 + this.hexToD(hexColor[3]),
					b: this.hexToD(hexColor[4]) * 16 + this.hexToD(hexColor[5])
				};
			}
		}
		else {
			return hexColor;
		}
	};

	/**
	 * Is value element?
	 *
	 * @param  {Object} val
	 * @return {Boolean}
	 * @member $common
	 */
	this.isElement = function(val) {
		return (val && val instanceof Element);
	};

	/**
	 * Is item object?
	 * 
	 * @param  {Object} item
	 * @return {Boolean}
	 * @member $common
	 */
	this.isObject = function(item) {
		return (typeof item === "object" && !Array.isArray(item) && item !== null);
	};


	/**
	 * Cover function for console.log, which allows to replace {0..n} occurences inside string.
	 * First argument is string, other arguments are for replace objects by key.
	 * 
	 * @member $common
	 */
	this.col = function() {
		let args = arguments;

		if (args.length) {
			let str = args[0];

			console.log(str.format.apply(str, Array.prototype.slice.call(args, 1)));
		}
	};

	/**
	 * Format size in bytes.
	 * 
	 * @param  {Number} size
	 * @return {String}
	 * @member $common
	 */
	this.formatSize = function(size) {
		if (typeof size !== "number") {
			return "null";
		}

		let lv = size > 0 ? Math.floor(Math.log(size) / Math.log(1024)) : 0;
		let sizes = ["", "K", "M", "G", "T"];

		lv = Math.min(sizes.length, lv);
		
		let value = lv > 0 ? (size / Math.pow(1024, lv)).toFixed(2) : size;

		return value + " " + sizes[lv] + "B";
	};

	/**
	 * Chaining multiple methods with promises, returns promise.
	 * 
	 * @param  {Object[]} opts
	 * @param  {String|Function} opts.method Function or method name inside scope
	 * @param  {Object} opts.scope Scope for method function
	 * @param  {Array} opts.args Additional arguments for function
	 * @return {$promise} Resolve with object { outArray: [promise outputs], rejected: 0..n count of rejected promise }
	 * @member $common
	 */
	this.chainPromises = function(opts) {
		return new $promise(resolve => {
			this._chainPromisesInner(opts, resolve, [], 0);
		});
	};

	/**
	 * Cancel event and his propagation.
	 * 
	 * @param  {Event} e
	 * @member $common
	 */
	this.cancelEvents = function(e) {
		if (e) {
			e.stopPropagation();
			e.preventDefault();
		}
	};

	/**
	 * Converts css name to javascript style interpretation.
	 * 
	 * @param {String} value
	 * @return {String} "z-index" -> zIndex
	 * @member $common
	 */
	this.cssNameToJS = function(value) {
		let parts = value.split("-");
		let output = "";

		parts.forEach((part, ind) => {
			output += !ind ? part : part[0].toUpperCase() + part.substr(1);
		});

		return output;
	};

	/**
	 * Get value from object using JSON path.
	 * 
	 * @param  {Object} obj
	 * @param  {String} path "key.subkey.keyxy", "key.subkey.key[5].keyYZ"
	 * @param  {Object} [defValue] Default value if path does not exist
	 * @return {Object} value from path|default value|null
	 * @member $common
	 */
	this.valueFromObject = function(obj, path, defValue) {
		if (arguments.length < 2) {
			return null;
		}

		let curObj = obj;
		let parts = path.split(".");

		parts.every(part => {
			part = part.trim();
			
			let arrayMatch = part.match(/\[\s*(\d+)\s*\]/);
			let isOk = false;

			if (arrayMatch) {
				let arrayObj = curObj[part.replace(arrayMatch[0], "")];
				let ind = parseFloat(arrayMatch[1]);

				if (Array.isArray(arrayObj) && ind >= 0 && ind < arrayObj.length) {
					curObj = arrayObj[ind];
					isOk = true;
				}
			}
			else if (this.isObject(curObj)) {
				curObj = curObj[part];
				isOk = true;
			}

			if (!isOk || typeof curObj === "undefined") {
				curObj = defValue || null;

				return false;
			}
			else {
				return true;
			}
		});

		return curObj;
	};

	/**
	 * Format time duration in secods.
	 * Output in format: hours:minutes:seconds.
	 * 
	 * @param  {Number} seconds Number of seconds
	 * @return {String}
	 * @member $common
	 */
	this.timeDuration = function(seconds) {
		seconds = seconds || 0;

		let output = "";
		let days = Math.floor(seconds / (3600 * 24));
		seconds -= days * 3600 * 24;

		if (days) {
			output += days + "d ";
		}

		let hours = Math.floor(seconds / 3600);
		seconds -= hours * 3600;
		output += (hours < 10 ? "0" + hours : hours) + ":";

		let minutes = Math.floor(seconds / 60);
		output += (minutes < 10 ? "0" + minutes : minutes) + ":";
		seconds -= minutes * 60;

		output += (seconds < 10 ? "0" + seconds : seconds);
		
		return output;
	};

	/**
	 * Compare two objects - returns array of differences between left -> right object.
	 * If length is 0 -> there is no difference.
	 * 
	 * @param  {Object} leftObj
	 * @param  {Object} rightObj
	 * @return {Array}
	 * @member $common
	 */
	this.compareObjects = function(leftObj, rightObj) {
		leftObj = leftObj || {};
		rightObj = rightObj || {};

		return this._compare(leftObj, rightObj);
	};
}]);

/*
	Any copyright is dedicated to the Public Domain.
	http://creativecommons.org/publicdomain/zero/1.0/
*/
(function () {
	if (window.Promise) { return; }

	/**
	 * @class A promise - value to be resolved in the future.
	 * Implements the "Promises/A+ 1.1" specification.
	 * @param {function} [resolver]
	 */
	var Promise = function(resolver) {
		this._state = 0; /* 0 = pending, 1 = fulfilled, 2 = rejected */
		this._value = null; /* fulfillment / rejection value */
		this._timeout = null;

		this._cb = {
			fulfilled: [],
			rejected: []
		}

		this._thenPromises = []; /* promises returned by then() */

		if (resolver) { this._invokeResolver(resolver); }
	}

	Promise.resolve = function(value) {
		return new this(function(resolve, reject) {
			resolve(value);
		});
	}

	Promise.reject = function(reason) {
		return new this(function(resolve, reject) {
			reject(reason);
		});
	}

	/**
	 * Wait for all these promises to complete. One failed => this fails too.
	 */
	Promise.all = Promise.when = function(all) {
		return new this(function(resolve, reject) {
			var counter = 0;
			var results = [];

			if (all.length === 0) {
				resolve([]);
				return;
			}

			all.forEach(function(promise, index) {
				counter++;
				promise.then(function(result) {
					results[index] = result;
					counter--;
					if (!counter) { resolve(results); }
				}, function(reason) {
					counter = 1/0;
					reject(reason);
				});
			});
		});
	}

	Promise.race = function(all) {
		return new this(function(resolve, reject) {
			all.forEach(function(promise) {
				promise.then(resolve, reject);
			});
		});
	}

	/**
	 * @param {function} onFulfilled To be called once this promise gets fulfilled
	 * @param {function} onRejected To be called once this promise gets rejected
	 * @returns {Promise}
	 */
	Promise.prototype.then = function(onFulfilled, onRejected) {
		this._cb.fulfilled.push(onFulfilled);
		this._cb.rejected.push(onRejected);

		var thenPromise = new Promise();

		this._thenPromises.push(thenPromise);

		if (this._state > 0) { this._schedule(); }

		/* 2.2.7. then must return a promise. */
		return thenPromise;
	}

	/**
	 * Fulfill this promise with a given value
	 * @param {any} value
	 */
	Promise.prototype.fulfill = function(value) {
		if (this._state != 0) { return this; }

		this._state = 1;
		this._value = value;

		if (this._thenPromises.length) { this._schedule(); }

		return this;
	}

	/**
	 * Reject this promise with a given value
	 * @param {any} value
	 */
	Promise.prototype.reject = function(value) {
		if (this._state != 0) { return this; }

		this._state = 2;
		this._value = value;

		if (this._thenPromises.length) { this._schedule(); }

		return this;
	}

	Promise.prototype.resolve = function(x) {
		/* 2.3.1. If promise and x refer to the same object, reject promise with a TypeError as the reason. */
		if (x == this) {
			this.reject(new TypeError("Promise resolved by its own instance"));
			return;
		}

		/* 2.3.2. If x is a promise, adopt its state */
		if (x instanceof this.constructor) {
			x.chain(this);
			return;
		}

		/* 2.3.3. Otherwise, if x is an object or function,  */
		if (x !== null && (typeof(x) == "object" || typeof(x) == "function")) {
			try {
				var then = x.then;
			} catch (e) {
				/* 2.3.3.2. If retrieving the property x.then results in a thrown exception e, reject promise with e as the reason. */
				this.reject(e);
				return;
			}

			if (typeof(then) == "function") {
				/* 2.3.3.3. If then is a function, call it */
				var called = false;
				var resolvePromise = function(y) {
					/* 2.3.3.3.1. If/when resolvePromise is called with a value y, run [[Resolve]](promise, y). */
					if (called) { return; }
					called = true;
					this.resolve(y);
				}
				var rejectPromise = function(r) {
					/* 2.3.3.3.2. If/when rejectPromise is called with a reason r, reject promise with r. */
					if (called) { return; }
					called = true;
					this.reject(r);
				}

				try {
					then.call(x, resolvePromise.bind(this), rejectPromise.bind(this));
				} catch (e) { /* 2.3.3.3.4. If calling then throws an exception e, */
					/* 2.3.3.3.4.1. If resolvePromise or rejectPromise have been called, ignore it. */
					if (called) { return; }
					/* 2.3.3.3.4.2. Otherwise, reject promise with e as the reason. */
					this.reject(e);
				}
			} else {
				/* 2.3.3.4 If then is not a function, fulfill promise with x. */
				this.fulfill(x);
			}
			return;
		}

		/* 2.3.4. If x is not an object or function, fulfill promise with x. */
		this.fulfill(x);
	}

	/**
	 * Pass this promise's resolved value to another promise
	 * @param {Promise} promise
	 */
	Promise.prototype.chain = function(promise) {
		var resolve = function(value) {
			promise.resolve(value);
		}
		var reject = function(value) {
			promise.reject(value);
		}
		return this.then(resolve, reject);
	}

	/**
	 * @param {function} onRejected To be called once this promise gets rejected
	 * @returns {Promise}
	 */
	Promise.prototype["catch"] = function(onRejected) {
		return this.then(null, onRejected);
	}

	Promise.prototype._schedule = function() {
		if (this._timeout) { return; } /* resolution already scheduled */
		this._timeout = setTimeout(this._processQueue.bind(this), 0);
	}

	Promise.prototype._processQueue = function() {
		this._timeout = null;

		while (this._thenPromises.length) {
			var onFulfilled = this._cb.fulfilled.shift();
			var onRejected = this._cb.rejected.shift();
			this._executeCallback(this._state == 1 ? onFulfilled : onRejected);
		}
	}

	Promise.prototype._executeCallback = function(cb) {
		var thenPromise = this._thenPromises.shift();

		if (typeof(cb) != "function") {
			if (this._state == 1) {
				/* 2.2.7.3. If onFulfilled is not a function and promise1 is fulfilled, promise2 must be fulfilled with the same value. */
				thenPromise.fulfill(this._value);
			} else {
				/* 2.2.7.4. If onRejected is not a function and promise1 is rejected, promise2 must be rejected with the same reason. */
				thenPromise.reject(this._value);
			}
			return;
		}

		try {
			var x = cb(this._value);
			/* 2.2.7.1. If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x). */
			thenPromise.resolve(x);
		} catch (e) {
			/* 2.2.7.2. If either onFulfilled or onRejected throws an exception, promise2 must be rejected with the thrown exception as the reason. */
			thenPromise.reject(e);
		}
	}

	Promise.prototype._invokeResolver = function(resolver) {
		try {
			resolver(this.resolve.bind(this), this.reject.bind(this));
		} catch (e) {
			this.reject(e);
		}
	}

	window.Promise = Promise;
})();

// ie shim for slice on host objects like NamedNodeMap, NodeList, and HTMLCollection
(function () {
  'use strict';
  var _slice = Array.prototype.slice;

  try {
    // Can't be used with DOM elements in IE < 9
    _slice.call(document.documentElement);
  } catch (e) { // Fails in IE < 9
    // This will work for genuine arrays, array-like objects, 
    // NamedNodeMap (attributes, entities, notations),
    // NodeList (e.g., getElementsByTagName), HTMLCollection (e.g., childNodes),
    // and will not fail on other DOM objects (as do DOM elements in IE < 9)
    Array.prototype.slice = function(begin, end) {
      // IE < 9 gets unhappy with an undefined end argument
      end = (typeof end !== 'undefined') ? end : this.length;

      // For native Array objects, we use the native slice function
      if (Object.prototype.toString.call(this) === '[object Array]'){
        return _slice.call(this, begin, end); 
      }

      // For array like object we handle it ourselves.
      var i, cloned = [],
        size, len = this.length;

      // Handle negative value for "begin"
      var start = begin || 0;
      start = (start >= 0) ? start : Math.max(0, len + start);

      // Handle negative value for "end"
      var upTo = (typeof end == 'number') ? Math.min(end, len) : len;
      if (end < 0) {
        upTo = len + end;
      }

      // Actual expected size of the slice
      size = upTo - start;

      if (size > 0) {
        cloned = new Array(size);
        if (this.charAt) {
          for (i = 0; i < size; i++) {
            cloned[i] = this.charAt(start + i);
          }
        } else {
          for (i = 0; i < size; i++) {
            cloned[i] = this[start + i];
          }
        }
      }

      return cloned;
    };
  }
}());

(function() {
	// event
	Event = Event || window.Event;

	Event.prototype.stopPropagation = Event.prototype.stopPropagation || function() {
		this.cancelBubble = true;
	};

	Event.prototype.preventDefault = Event.prototype.preventDefault || function () {
		this.returnValue = false;
	};

	// btoa
	if (!("btoa" in window)) {
		window.btoa = function(val) {
			return val;
		}
	}

	// array
	if(!Array.isArray) {
		// Array.isArray by ES5 - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
		Array.isArray = function (vArg) {
			return Object.prototype.toString.call(vArg) === "[object Array]";
		};
	}

	if (!Array.prototype.forEach) { 
		Array.prototype.forEach = function(cb, _this) {
		    var len = this.length;
		    for (var i=0;i<len;i++) { 
				if (i in this) { cb.call(_this, this[i], i, this); }
			}
		}
	}

	if (!Array.prototype.every) { 
		Array.prototype.every = function(cb, _this) {
		    var len = this.length;
		    for (var i=0;i<len;i++) {
				if (i in this && !cb.call(_this, this[i], i, this)) { return false; }
		    }
		    return true;
		}
	}

	if (!Array.prototype.indexOf) { 
		Array.prototype.indexOf = function(item, from) {
		    var len = this.length;
		    var i = from || 0;
		    if (i < 0) { i += len; }
		    for (;i<len;i++) {
				if (i in this && this[i] === item) { return i; }
		    }
		    return -1;
		}
	}

	// objects
	// Object.keys by ES5 - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
	if (!Object.keys) {
	    Object.keys = (function () {
	        'use strict';

	        var hasOwnProperty = Object.prototype.hasOwnProperty,
	            hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
	            dontEnums = [
	                'toString',
	                'toLocaleString',
	                'valueOf',
	                'hasOwnProperty',
	                'isPrototypeOf',
	                'propertyIsEnumerable',
	                'constructor'
	            ],
	            dontEnumsLength = dontEnums.length;

	        return function (obj) {
	            if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
	                throw new TypeError('Object.keys called on non-object');
	            }

	            var result = [], prop, i;

	            for (prop in obj) {
	                if (hasOwnProperty.call(obj, prop)) {
	                    result.push(prop);
	                }
	            }

	            if (hasDontEnumBug) {
	                for (i = 0; i < dontEnumsLength; i++) {
	                    if (hasOwnProperty.call(obj, dontEnums[i])) {
	                        result.push(dontEnums[i]);
	                    }
	                }
	            }
	            return result;
	        };
	    }());
	}
	
	// Object.defineProperty
	try {
		Object.defineProperty({}, "a", {value:3});
	} catch (e) {
		var nativeDefineProperty = Object.defineProperty;
		Object.defineProperty = function(obj, prop, descriptor) {
			try {
				return nativeDefineProperty.apply(Object, arguments);
			} catch (e) {
				obj[prop] = descriptor.value;
				return obj;
			}
		}

		Object.defineProperties = function(obj, props) {
		    for (var p in props) {
		        Object.defineProperty(obj, p, props[p]);
		    }
			return obj;
		}
	}

	// object.create
	if (!Object.create) {
		Object.create = function(proto, props) {
		    var tmp = function() {};
		    tmp.prototype = proto;
		    var result = new tmp();
		    Object.defineProperties(result, props);
		    return result;
		}
	}

	// Object.getPrototypeOf
	var testObject = {};

	if (!(Object.setPrototypeOf || testObject.__proto__)) {
		var nativeGetPrototypeOf = Object.getPrototypeOf;

		Object.getPrototypeOf = function(object) {
			if (object.__proto__) {
				return object.__proto__;
			} else {
				return nativeGetPrototypeOf.call(Object, object);
			}
		}
	}

	if (typeof Object.assign != 'function') {
	  // Must be writable: true, enumerable: false, configurable: true
	  Object.defineProperty(Object, "assign", {
	    value: function assign(target, varArgs) { // .length of function is 2
	      'use strict';
	      if (target == null) { // TypeError if undefined or null
	        throw new TypeError('Cannot convert undefined or null to object');
	      }

	      var to = Object(target);

	      for (var index = 1; index < arguments.length; index++) {
	        var nextSource = arguments[index];

	        if (nextSource != null) { // Skip over if undefined or null
	          for (var nextKey in nextSource) {
	            // Avoid bugs when hasOwnProperty is shadowed
	            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
	              to[nextKey] = nextSource[nextKey];
	            }
	          }
	        }
	      }
	      return to;
	    },
	    writable: true,
	    configurable: true
	  });
	}

	// date timestamp by ES5 - http://dailyjs.com/2010/01/07/ecmascript5-date/
	if (!Date.now) {
		Date.now = function() { return +(new Date); }
	}

	// functions
	if (!Function.prototype.bind) {
		Function.prototype.bind = function(thisObj) {
			var fn = this;
			var args = Array.prototype.slice.call(arguments, 1);
			return function() {
				return fn.apply(thisObj, args.concat(Array.prototype.slice.call(arguments)));
			}
		}
	};

	// strings
	if (!String.prototype.trim) {
		String.prototype.trim = function () {
			return this.replace(/^\s+|\s+$/g, '');
		};
	}

	// console
	if (!("console" in window)) {
		var emptyFn = function() {};

		window.console = {};

		["log", "warn", "error", "clear", "info"].forEach(function(name) {
			window.console[name] = emptyFn;
		});
	}

	// old ie
	if (!("addEventListener" in document)) {
		var w = Window.prototype;
		var h = HTMLDocument.prototype;
		var e = Element.prototype;

		document["addEventListener"] = w["addEventListener"] = h["addEventListener"] = e["addEventListener"] = function(eventName, listener) {
			if (!this.__eventListeners) {
				this.__eventListeners = {};
			}

			if (eventName == "DOMContentLoaded") {
				this.attachEvent("onreadystatechange", function() {
					if (document.readyState === "complete") {
						listener();
					}
				});
			}
			else {
				if (!this.__eventListeners[eventName]) {
					this.__eventListeners[eventName] = [];
				}

				var fn = function() {
					return listener.apply(this, arguments);
				}.bind(this);

				this.__eventListeners[eventName].push({
					fn: fn,
					listener: listener
				});

				this.attachEvent("on" + eventName, fn);
			}
		};

		document["removeEventListener"] = w["removeEventListener"] = h["removeEventListener"] = e["removeEventListener"] = function(eventName, listener) {
			var all = this.__eventListeners || {};
			var items = all[eventName] || [];
			var fn = null;
			var pos = -1;

			for (var i = 0; i < items.length; i++) {
				var item = items[i];

				if (item.listener == listener) {
					fn = item.fn;
					pos = i;
					break;
				}
			}

			if (fn) {
				items.splice(pos, 1);

				if (!items.length) {
					delete all[eventName];
				}
				
				return this.detachEvent("on" + eventName, fn);
			}
			else return null;
		};
	}

	// dom classList
	if (!("classList" in document.documentElement) && window.Element) {
		(function () {
			var prototype = Array.prototype,
			indexOf = prototype.indexOf,
			slice = prototype.slice,
			push = prototype.push,
			splice = prototype.splice,
			join = prototype.join;

			function DOMTokenList(elm) {
				this._element = elm;
				if (elm.className == this._classCache) { return; }
				this._classCache = elm.className;
				if (!this._classCache) { return; }

				var classes = this._classCache.replace(/^\s+|\s+$/g,'').split(/\s+/);
				for (var i = 0; i < classes.length; i++) {
					push.call(this, classes[i]);
				}
			}
			window.DOMTokenList = DOMTokenList;

			function setToClassName(el, classes) {
				el.className = classes.join(" ");
			}

			DOMTokenList.prototype = {
				add: function(token) {
					if (this.contains(token)) { return; }
					push.call(this, token);
					setToClassName(this._element, slice.call(this, 0));
				},
				contains: function(token) {
					return (indexOf.call(this, token) != -1);
				},
				item: function(index) {
					return this[index] || null;
				},
				remove: function(token) {
					var i = indexOf.call(this, token);
					if (i == -1) { return; }
					splice.call(this, i, 1);
					setToClassName(this._element, slice.call(this, 0));
				},
				toString: function() {
					return join.call(this, " ");
				},
				toggle: function(token) {
					if (indexOf.call(this, token) == -1) {
						this.add(token);
						return true;
					} else {
						this.remove(token);
						return false;
					}
				}
			};

			function defineElementGetter (obj, prop, getter) {
				if (Object.defineProperty) {
					Object.defineProperty(obj, prop, {
						get: getter
					});
				} else {
					obj.__defineGetter__(prop, getter);
				}
			}

			defineElementGetter(Element.prototype, "classList", function() {
				return new DOMTokenList(this);
			});
		})();
	}
})();

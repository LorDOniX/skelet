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

	if (!String.prototype.replaceAll) {
		String.prototype.replaceAll = function(target, replacement) {
			return this.split(target).join(replacement);
		};
	}

	// "hi {0}".format("Roman") => "hi Roman" {0..n}, args...
	if (!String.prototype.format) {
		String.prototype.format = function() {
			var args = Array.prototype.slice.call(arguments);
			var output = this.toString();

			args.forEach(function(arg, ind) {
				output = output.replace(new RegExp("{\\s*" + ind + "\\s*}", "g"), arg);
			});

			return output;
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

/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * https://raw.github.com/facebook/regenerator/master/LICENSE file. An
 * additional grant of patent rights can be found in the PATENTS file in
 * the same directory.
 */

!(function(global) {
  "use strict";

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  var inModule = typeof module === "object";
  var runtime = global.regeneratorRuntime;
  if (runtime) {
    if (inModule) {
      // If regeneratorRuntime is defined globally and we're in a module,
      // make the exports object identical to regeneratorRuntime.
      module.exports = runtime;
    }
    // Don't bother evaluating the rest of this file if the runtime was
    // already defined globally.
    return;
  }

  // Define the runtime globally (as expected by generated code) as either
  // module.exports (if we're in a module) or a new, empty object.
  runtime = global.regeneratorRuntime = inModule ? module.exports : {};

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  runtime.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  IteratorPrototype[iteratorSymbol] = function () {
    return this;
  };

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunctionPrototype[toStringTagSymbol] =
    GeneratorFunction.displayName = "GeneratorFunction";

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      prototype[method] = function(arg) {
        return this._invoke(method, arg);
      };
    });
  }

  runtime.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  runtime.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      if (!(toStringTagSymbol in genFun)) {
        genFun[toStringTagSymbol] = "GeneratorFunction";
      }
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  runtime.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return Promise.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return Promise.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration. If the Promise is rejected, however, the
          // result for this iteration will be rejected with the same
          // reason. Note that rejections of yielded Promises are not
          // thrown back into the generator function, as is the case
          // when an awaited Promise is rejected. This difference in
          // behavior between yield and await is important, because it
          // allows the consumer to decide what to do with the yielded
          // rejection (swallow it and continue, manually .throw it back
          // into the generator, abandon iteration, whatever). With
          // await, by contrast, there is no opportunity to examine the
          // rejection reason outside the generator function, so the
          // only option is to throw it from the await expression, and
          // let the generator function handle the exception.
          result.value = unwrapped;
          resolve(result);
        }, reject);
      }
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new Promise(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);
  AsyncIterator.prototype[asyncIteratorSymbol] = function () {
    return this;
  };
  runtime.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  runtime.async = function(innerFn, outerFn, self, tryLocsList) {
    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList)
    );

    return runtime.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined) {
      // A .throw or .return when the delegate iterator has no .throw
      // method always terminates the yield* loop.
      context.delegate = null;

      if (context.method === "throw") {
        if (delegate.iterator.return) {
          // If the delegate iterator has a return method, give it a
          // chance to clean up.
          context.method = "return";
          context.arg = undefined;
          maybeInvokeDelegate(delegate, context);

          if (context.method === "throw") {
            // If maybeInvokeDelegate(context) changed context.method from
            // "return" to "throw", let that override the TypeError below.
            return ContinueSentinel;
          }
        }

        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  Gp[toStringTagSymbol] = "Generator";

  // A Generator should always return itself as the iterator object when the
  // @@iterator function is called on it. Some browsers' implementations of the
  // iterator prototype chain incorrectly implement this, causing the Generator
  // object to not be returned from this call. This ensures that doesn't happen.
  // See https://github.com/facebook/regenerator/issues/274 for more details.
  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  runtime.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  runtime.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined;
      }

      return ContinueSentinel;
    }
  };
})(
  // In sloppy mode, unbound `this` refers to the global object, fallback to
  // Function constructor if we're in global strict mode. That is sadly a form
  // of indirect eval which violates Content Security Policy.
  (function() { return this })() || Function("return this")()
);

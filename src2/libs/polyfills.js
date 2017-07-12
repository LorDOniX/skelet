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

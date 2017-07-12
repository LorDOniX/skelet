onix.factory("$myQuery", [
	"$common",
function(
	$common
) {
	/**
	 * DOM manipulation in the style of jquery.
	 * 
	 * @class $myQuery
	 * @chainable
	 * @param {String|HTMLElement|Array} value
	 * @param {$myQuery|HTMLElement} [parent]
	 * @member $myQuery
	 */
	class $myQuery {
		constructor(value, parent) {
			this._els = this._getElementsFromValue(value, parent);
			this._eventsCache = {};

			return this;
		}

		/**
		 * Get elements from value [parent].
		 * 
		 * @param {String|HTMLElement|Array} value
		 * @param {$myQuery|HTMLElement} [parent]
		 * @return {Array}
		 * @member $myQuery
		 * @method _getElementsFromValue
		 * @private
		 */
		_getElementsFromValue(value, parent) {
			value = Array.isArray(value) ? value : [value];

			let els = [];

			value.forEach(val => {
				if (typeof val === "string") {
					if (val.match(/[<]\s*[a-zA-Z0-9]+[^>]*[>]/)) {
						let df = document.createDocumentFragment();
						let divEl = document.createElement("div");

						divEl.insertAdjacentHTML("afterbegin", val);

						// copy child from div -> fragment
						while (divEl.firstChild) {
							df.appendChild(divEl.firstChild);
						}

						els.push(df);
					}
					else {
						// selector
						if (parent && parent instanceof $myQuery) {
							parent = parent.getEl();
						}

						parent = (parent && parent instanceof Element) || parent == window || parent == document ? parent : document;

						let selValues = parent.querySelectorAll(val);

						if (selValues) {
							els = els.concat(Array.prototype.slice.call(selValues));
						}
					}

					return;
				}
				else if (val && val instanceof $myQuery) {
					val = val.getEl();
				}

				if ($common.isElement(val) || val == document || val == window) {
					els.push(val);
				}
			});

			return els;
		}

		/**
		 * Operation on elements.
		 * 
		 * @param  {Function} cb
		 * @param  {Function} [scope]
		 * @member $myQuery
		 * @private
		 * @method _operation
		 */
		_operation(cb, scope) {
			// NodeList -> Array
			if (!Array.isArray(this._els)) {
				this._els = Array.prototype.slice.call(this._els);
			}

			this._els.forEach((item, ind) => {
				cb.apply(scope || cb, [item, ind]);
			});
		}

		/**
		 * Set or get all - cover function.
		 * 
		 * @chainable
		 * @param  {String} attr
		 * @param  {String} [newValue]
		 * @member $myQuery
		 * @private
		 * @method _setGetAll
		 */
		_setGetAll(attr, newValue) {
			if (typeof attr !== "undefined") {
				if (typeof newValue !== "undefined") {
					this._operation(item => {
						item[attr] = newValue;
					});

					return this;
				}
				else {
					let values = [];

					this._operation(item => {
						values.push(item[attr]);
					});

					if (!values.length) {
						return null;
					}
					else if (values.length == 1) {
						return values[0];
					}
					else {
						return values;
					}
				}
			}
			else {
				return this;
			}
		}

		/**
		 * Bind event.
		 *
		 * @param {String} eventName Event name
		 * @param {Function} cb Callback function
		 * @param {Object} [scope] cb function scope
		 * @chainable
		 * @private
		 * @method _bindEvent
		 */
		_bindEvent(eventName, cb, scope) {
			this._operation(item => {
				// create new item in events cache
				if (!this._eventsCache[eventName]) {
					this._eventsCache[eventName] = [];
				}

				let eventObj = {
					item: item,
					cb: cb,
					bindFn: event => {
						cb.apply(scope || item, [event, item, this]);
					}
				};

				this._eventsCache[eventName].push(eventObj);

				item.addEventListener(eventName, eventObj.bindFn);
			});

			return this;
		}

		/**
		 * Get original element.
		 *
		 * @param  {Number} [ind]
		 * @return {HTMLElement}
		 * @member $myQuery
		 * @method get
		 */
		get(ind) {
			ind = ind || 0;

			if (ind > this._els.length) {
				return null;
			}
			else {
				return this._els[ind];
			}
		}

		/**
		 * Get original element.
		 *
		 * @param  {Number} [ind]
		 * @return {HTMLElement}
		 * @member $myQuery
		 * @method getEl
		 */
		getEl(ind) {
			return this.get(ind);
		}

		/**
		 * Get or set attribute.
		 *
		 * @chainable
		 * @param  {String} name
		 * @param  {String} [newValue]
		 * @return {String|Array}
		 * @member $myQuery
		 * @method attr
		 */
		attr(name, newValue) {
			if (typeof name !== "undefined") {
				if (typeof newValue !== "undefined") {
					this._operation(item => {
						item.setAttribute(name, newValue);
					});

					return this;
				}
				else {
					let values = [];

					this._operation(item => {
						values.push(item.getAttribute(name));
					});

					if (!values.length) {
						return null;
					}
					else if (values.length == 1) {
						return values[0];
					}
					else {
						return values;
					}
				}
			}
			else {
				return this;
			}
		}

		/**
		 * Get or set css value.
		 *
		 * @chainable
		 * @param  {String|Object} name
		 * @param  {String} [newValue]
		 * @return {String}
		 * @member $myQuery
		 * @method css
		 */
		css(name, newValue) {
			if (typeof name !== "undefined") {
				if (typeof newValue !== "undefined") {
					this._operation(item => {
						item.style[$common.cssNameToJS(name)] = newValue;
					});

					return this;
				}
				else if (typeof name === "object" && !Array.isArray(name)) {
					Object.keys(name).forEach(key => {
						this._operation(item => {
							item.style[$common.cssNameToJS(key)] = name[key];
						});
					});

					return this;
				}
				else {
					let el = this.getEl();

					return el ? el.style[$common.cssNameToJS(name)] : null;
				}
			}
			else {
				return this;
			}
		}

		/**
		 * Get or set src.
		 * 
		 * @param  {String} [newValue]
		 * @return {String}
		 * @member $myQuery
		 * @method src
		 */
		src(newValue) {
			return this._setGetAll("src", newValue);
		}

		/**
		 * Hide element.
		 * 
		 * @chainable
		 * @member $myQuery
		 * @method hide
		 */
		hide() {
			return this.css("display", "none");
		}

		/**
		 * Show element.
		 *
		 * @chainable
		 * @param  {String} [displayStyle]
		 * @member $myQuery
		 * @method show
		 */
		show(displayStyle) {
			return this.css("display", displayStyle || "");
		}

		/**
		 * Get or set value.
		 *
		 * @chainable
		 * @param  {String} [newValue]
		 * @return {String}
		 * @member $myQuery
		 * @method val
		 */
		val(newValue) {
			return this._setGetAll("value", newValue);
		}

		/**
		 * Get or set HTML.
		 * 
		 * @param  {String} [newValue]
		 * @return {String}
		 * @member $myQuery
		 * @method html
		 */
		html(newValue) {
			return this._setGetAll("innerHTML", newValue);
		}

		/**
		 * Add CSS class.
		 *
		 * @chainable
		 * @param  {String} className
		 * @member $myQuery
		 * @method addClass
		 */
		addClass(className) {
			this._operation(item => {
				item.classList.add(className);
			});

			return this;
		}

		/**
		 * Remove CSS class.
		 *
		 * @chainable
		 * @param  {String} className
		 * @member $myQuery
		 * @method removeClass
		 */
		removeClass(className) {
			this._operation(item => {
				item.classList.remove(className);
			});

			return this;
		}

		/**
		 * Toggle CSS class.
		 *
		 * @chainable
		 * @param  {String} className
		 * @member $myQuery
		 * @method toggleClass
		 */
		toggleClass(className) {
			this._operation(item => {
				item.classList.toggle(className);
			});

			return this;
		}

		/**
		 * Get width.
		 * 
		 * @return {Number}
		 * @member $myQuery
		 * @method width
		 */
		width() {
			let width = 0;

			this._operation(item => {
				width += item.offsetWidth;
			});

			return width;
		}

		/**
		 * Get height.
		 * 
		 * @return {Number}
		 * @member $myQuery
		 * @method height
		 */
		height() {
			let height = 0;

			this._operation(item => {
				height += item.offsetHeight;
			});

			return height;
		}

		/**
		 * Click event.
		 *
		 * @chainable
		 * @param  {Function} cb
		 * @param  {Function} [scope]
		 * @member $myQuery
		 * @method click
		 */
		click(cb, scope) {
			return this._bindEvent("click", cb, scope);
		}

		/**
		 * Change event.
		 *
		 * @chainable
		 * @param  {Function} cb
		 * @param  {Function} [scope]
		 * @member $myQuery
		 * @method change
		 */
		change(cb, scope) {
			return this._bindEvent("change", cb, scope);
		}

		/**
		 * Mouse enter event.
		 *
		 * @chainable
		 * @param  {Function} cb
		 * @param  {Function} [scope]
		 * @member $myQuery
		 * @method mouseenter
		 */
		mouseenter(cb, scope) {
			return this._bindEvent("mouseenter", cb, scope);
		}

		/**
		 * Mouse leave event.
		 *
		 * @chainable
		 * @param  {Function} cb
		 * @param  {Function} [scope]
		 * @member $myQuery
		 * @method mouseleave
		 */
		mouseleave(cb, scope) {
			return this._bindEvent("mouseleave", cb, scope);
		}

		/**
		 * Mouse move event.
		 *
		 * @chainable
		 * @param  {Function} cb
		 * @param  {Function} [scope]
		 * @member $myQuery
		 * @method mouseleave
		 */
		mousemove(cb, scope) {
			return this._bindEvent("mousemove", cb, scope);
		}

		/**
		 * Mouse move event.
		 *
		 * @chainable
		 * @param  {Function} cb
		 * @param  {Function} [scope]
		 * @member $myQuery
		 * @method mouseleave
		 */
		mousewheel(cb, scope) {
			return this._bindEvent("DOMMouseScroll", cb, scope)._bindEvent("mousewheel", cb, scope);
		}

		/**
		 * Key down event.
		 *
		 * @chainable
		 * @param  {Function} cb
		 * @param  {Function} [scope]
		 * @member $myQuery
		 * @method keydown
		 */
		keydown(cb, scope) {
			return this._bindEvent("keydown", cb, scope);
		}

		/**
		 * Key up event.
		 *
		 * @chainable
		 * @param  {Function} cb
		 * @param  {Function} [scope]
		 * @member $myQuery
		 * @method keyup
		 */
		keyup(cb, scope) {
			return this._bindEvent("keyup", cb, scope);
		}

		/**
		 * Key press event.
		 *
		 * @chainable
		 * @param  {Function} cb
		 * @param  {Function} [scope]
		 * @member $myQuery
		 * @method keypress
		 */
		keypress(cb, scope) {
			return this._bindEvent("keypress", cb, scope);
		}

		/**
		 * Blur event.
		 *
		 * @chainable
		 * @param  {Function} cb
		 * @param  {Function} [scope]
		 * @member $myQuery
		 * @method blur
		 */
		blur(cb, scope) {
			return this._bindEvent("blur", cb, scope);
		}

		/**
		 * Focus event.
		 *
		 * @chainable
		 * @param  {Function} cb
		 * @param  {Function} [scope]
		 * @member $myQuery
		 * @method focus
		 */
		focus(cb, scope) {
			return this._bindEvent("focus", cb, scope);
		}

		/**
		 * Each.
		 *
		 * @chainable
		 * @param  {Function} cb
		 * @param  {Function} [scope]
		 * @member $myQuery
		 * @method each
		 */
		each(cb, scope) {
			this._operation((item, ind) => {
				cb.apply(scope || cb, [item, ind]);
			});

			return this;
		}

		/**
		 * Foreach.
		 *
		 * @chainable
		 * @param  {Function} cb
		 * @param  {Function} [scope]
		 * @member $myQuery
		 * @method forEach
		 */
		forEach(cb, scope) {
			return this.each(cb, scope);
		}

		/**
		 * Remove element.
		 *
		 * @chainable
		 * @member $myQuery
		 * @method remove
		 */
		remove() {
			this._operation(item => {
				item.parentNode.removeChild(item);
			});

			return this;
		}

		/**
		 * Append another element to this one.
		 *
		 * @chainable
		 * @param {HTMLElement|$myQuery|String} child
		 * @member $myQuery
		 * @method  append
		 */
		append(child) {
			child = this._getElementsFromValue(child);

			if (child.length) {
				this._operation((item, ind) => {
					let appChild = ind ? child[0].cloneNode(true) : child[0];

					item.appendChild(appChild);
				});
			}

			return this;
		}

		/**
		 * Prepend element.
		 *
		 * @chainable
		 * @param {HTMLElement|$myQuery|string} child
		 * @member $myQuery
		 * @method prepend
		 */
		prepend(child) {
			child = this._getElementsFromValue(child);

			if (child.length) {
				this._operation((item, ind) => {
					let prepChild = ind ? child[0].cloneNode(true) : child[0];

					item.insertBefore(prepChild, item.firstChild);
				});
			}

			return this;
		}

		/**
		 * Insert current element before element.
		 *
		 * @chainable
		 * @param {HTMLElement|$myQuery|string} beforeEl
		 * @member $myQuery
		 * @method prepend
		 */
		insertBefore(beforeEl) {
			beforeEl = this._getElementsFromValue(beforeEl);

			let el = this.getEl();

			if (el && beforeEl.length) {
				beforeEl[0].parentNode.insertBefore(el, beforeEl[0]);
			}

			return this;
		}

		/**
		 * Empty element - clear all its children.
		 * Much faster than innerHTML = "".
		 * 
		 * @chainable
		 * @member $myQuery
		 * @method empty
		 */
		empty() {
			this._operation(item => {
				while (item.firstChild) {
					item.removeChild(item.firstChild);
				}
			});

			return this;
		}

		/**
		 * Get all elements length.
		 * 
		 * @return {Number}
		 * @member $myQuery
		 * @method len
		 */
		len() {
			return this._els.length;
		}

		/**
		 * Get parent node.
		 * 
		 * @return {$myQuery} new instance with parent node
		 * @member $myQuery
		 * @method parent
		 */
		parent() {
			let el = this.getEl();

			return el ? new this(el) : null;
		}

		/**
		 * Get children.
		 * 
		 * @return {Array} Children array
		 * @member $myQuery
		 * @method children
		 */
		children() {
			let el = this.getEl();

			return el ? el.children : [];
		}

		/**
		 * Get scroll top offset.
		 * 
		 * @return {Number} Scroll top in [px]
		 * @member $myQuery
		 * @method scrollTop
		 */
		scrollTop() {
			let el = this.getEl();
			let docOffset = document.body.scrollTop;

			return el ? el.scrollTop + docOffset : docOffset + 0;
		}

		/**
		 * Get scroll left offset.
		 * 
		 * @return {Number} Scroll left in [px]
		 * @member $myQuery
		 * @method scrollLeft
		 */
		scrollLeft() {
			let el = this.getEl();
			let docOffset = document.body.scrollLeft;

			return el ? el.scrollLeft + docOffset : docOffset + 0;
		}

		/**
		 * Bind event to the element.
		 * 
		 * @param {String} eventType click, mousedown etc.
		 * @param {Function} handler Event callback function
		 * @param {Object} [scope] Handler scope
		 * @chainable
		 * @member $myQuery
		 * @method bind
		 */
		bind(eventType, handler, scope) {
			if (eventType && typeof handler === "function") {
				this._bindEvent(eventType, handler, scope);
			}

			return this;
		}

		/**
		 * Unbind events.
		 * 
		 * @param {String} eventType click, mousedown etc.
		 * @param {Function} [handler] Event callback function
		 * @chainable
		 * @member $myQuery
		 * @method unbind
		 */
		unbind(eventType, handler) {
			if (eventType) {
				let all = this._eventsCache[eventType] || [];
				let len = all.length - 1;

				for (let i = len; i >= 0; i--) {
					let eventItem = all[i];

					if (!handler || (typeof handler === "function" && eventItem.cb == handler)) {
						eventItem.item.removeEventListener(eventType, eventItem.bindFn);

						// remove
						all.splice(i, 1);
					}
				}
			}

			return this;
		}
	};

	/**
	 * Quick acces to myQuery and DOM manipulation.
	 *
	 * @param  {String|HTMLElement|Array} value
	 * @param {HTMLElement|$myQuery} [parent] Parent node
	 * @return {$myQuery}
	 * @member onix
	 * @property {Function}
	 */
	onix.element = function(value, parent) {
		return new $myQuery(value, parent);
	};

	return {
		 /**
		 * Main cover function.
		 * 
		 * @param  {String|HTMLElement|Array} value
		 * @param {HTMLElement} [parent]
		 * @return {$myQuery}
		 * @member $myQuery
		 */
		get: function(value, parent) {
			return new $myQuery(value, parent);
		}
	};
}]);

/**
 * Run for cache $myQuery object.
 */
onix.run(["$myQuery", function() {
	// empty
}]);

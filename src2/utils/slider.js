onix.factory("$slider", [
	"$dom",
	"$event",
	"$common",
	"$math",
function(
	$dom,
	$event,
	$common,
	$math
) {
	/**
	 * Slider - slider with input for selecting numbers from the range.
	 * 
	 * @param {HTMLElement} parent Where is canvas appended
	 * @param {Object} [optsArg] Configuration
	 * @param {Number} [optsArg.min=0] Min value
	 * @param {Number} [optsArg.max=100] Max value
	 * @param {Number} [optsArg.wheelStep=1] Mouse wheel step value
	 * @param {Number} [optsArg.timeout=333] Timeout for signal fire (keydown, move)
	 * @class $slider
	 */
	class $slider extends $event {
		constructor(parent, optsArg) {
			super();
			
			this._parent = parent;
			this._root = this._create();

			this._opts = {
				min: 0,
				max: 100,
				wheelStep: 1,
				timeout: 333
			};

			for (let key in optsArg) {
				this._opts[key] = optsArg[key];
			}

			// selected value
			this._value = null;

			// signal change - helper
			this._signalObj = {
				id: null,
				lastValue: null
			};

			parent.appendChild(this._root);

			this._binds = {
				keyUp: this._keyUp.bind(this),
				click: this._click.bind(this),
				mouseDownCaret: this._mouseDownCaret.bind(this),
				mouseMove: this._mouseMove.bind(this),
				mouseWheel: this._mouseWheel.bind(this),
				mouseUp: this._mouseUp.bind(this),
				sendSignalInner: this._sendSignalInner.bind(this)
			};

			this._mouse = {
				bcr: null
			};

			this._els.input.addEventListener("keyup", this._binds.keyUp);
			this._els.tube.addEventListener("click", this._binds.click);
			this._els.caret.addEventListener("mousedown", this._binds.mouseDownCaret);
			// firefox
			this._els.lineHolder.addEventListener("DOMMouseScroll", this._binds.mouseWheel);
			// others
			this._els.lineHolder.addEventListener("mousewheel", this._binds.mouseWheel);
			
			// def. max value
			this.setValue(this._opts.max);
		}

		/**
		 * Create slider and his children.
		 *
		 * @member $slider
		 * @private
		 * @method _create
		 */
		_create() {
			this._els = {};

			return $dom.create({
				el: "div",
				class: "slider",
				child: [{
					el: "input",
					type: "text",
					value: "",
					_exported: "input"
				}, {
					el: "span",
					class: "line-holder",
					_exported: "lineHolder",
					child: [{
						el: "span",
						class: "lh-tube",
						_exported: "tube"
					}, {
						el: "span",
						class: "lh-caret",
						_exported: "caret"
					}]
				}]
			}, this._els);
		}

		/**
		 * Set caret position.
		 * 
		 * @param {Number} posX Value [px] caret offset accord to the start
		 * @member $slider
		 * @private
		 * @method _setCaret
		 */
		_setCaret(posX) {
			let width = this._els.lineHolder.offsetWidth;

			if (posX < 0) {
				posX = 0;
			}
			else if (posX > width) {
				posX = width;
			}

			this._els.caret.style.left = posX.toFixed(2) + "px";
		}

		/**
		 * Get mouse coordinates.
		 * 
		 * @param  {Event} e
		 * @return {Object}
		 * @private
		 * @member $slider
		 * @method _getMouseXY
		 */
		_getMouseXY(e) {
			return {
				x: e.clientX - this._mouse.bcr.left,
				y: e.clientY - this._mouse.bcr.top
			}
		}

		/**
		 * Set mouse bounding client rect from canvas el.
		 * 
		 * @private
		 * @member $slider
		 * @method _setBCR
		 */
		_setBCR() {
			this._mouse.bcr = this._els.lineHolder.getBoundingClientRect();
		}

		/**
		 * Key up event from the input.
		 *
		 * @member $slider
		 * @private
		 * @method _keyUp
		 */
		_keyUp() {
			var inputEl = this._els.input;
			var value = parseFloat(inputEl.value);
			var errors = false;

			if (isNaN(value) || value < this._opts.min || value > this._opts.max) {
				errors = true;
			}
			else {
				// set new value
				this.setValue(value);
				this._sendSignal(true);
			}

			inputEl.classList[errors ? "add" : "remove"]("error");
		}

		/**
		 * Click on tube event.
		 *
		 * @param {Event} e
		 * @member $slider
		 * @private
		 * @method _click
		 */
		_click(e) {
			$common.cancelEvents(e);
			this._setBCR();

			let width = this._els.lineHolder.offsetWidth;
			let value = this._getMouseXY(e).x;
			let ratio = value / width;

			// increate click range
			if (ratio <= 0.05) {
				value = 0;
			}
			else if (ratio >= 0.95) {
				value = width;
			}

			this._setCaret(value);
			this._setValue(value, true);
		}

		/**
		 * Click on the caret event, binds mouse up over the document.
		 *
		 * @param {Event} e
		 * @member $slider
		 * @private
		 * @method _mouseDownCaret
		 */
		_mouseDownCaret(e) {
			$common.cancelEvents(e);
			this._setBCR();

			document.addEventListener("mousemove", this._binds.mouseMove);
			document.addEventListener("mouseup", this._binds.mouseUp);
		}

		/**
		 * Mouse move event over line holder - only if was clicked on the caret.
		 *
		 * @param {Event} e
		 * @member $slider
		 * @private
		 * @method _mouseMove
		 */
		_mouseMove(e) {
			let caretEl = this._els.caret;
			let posX = this._getMouseXY(e).x;

			this._setCaret(posX);
			this._setValue(posX);
		}

		/**
		 * Mouse up event over the document.
		 * 
		 * @member $slider
		 * @private
		 * @method _mouseUp
		 */
		_mouseUp() {
			document.removeEventListener("mousemove", this._binds.mouseMove);
			document.removeEventListener("mouseup", this._binds.mouseUp);
		}

		/**
		 * Mouse wheel event.
		 *
		 * @param {Event} e Mouse event
		 * @private
		 * @member $slider
		 * @method _mouseWheel
		 */
		_mouseWheel(e) {
			let delta = e.wheelDelta || -e.detail;

			if (!delta) { return; }

			$common.cancelEvents(e);

			if (delta > 0) {
				this.setValue(this._value + this._opts.wheelStep);
				this._sendSignal();
			}
			else {
				this.setValue(this._value - this._opts.wheelStep);
				this._sendSignal();
			}
		}

		/**
		 * Get value -> position convert.
		 *
		 * @param {Number} value Value in the range --> [px] position for the caret.
		 * @return {Number}
		 * @member $slider
		 * @private
		 * @method _getPosFromValue
		 */
		_getPosFromValue(value) {
			value = value || this._value;

			let width = this._els.lineHolder.offsetWidth;
			let range = this._opts.max - this._opts.min;
			let posX = (value - this._opts.min) / range * width;

			return posX;
		}

		/**
		 * Set value using caret position. Fires signal "change".
		 *
		 * @param {Number} posX Value on the axe x
		 * @param {Boolean} [fromClick] It was called from click method?
		 * @member $slider
		 * @private
		 * @method _setValue
		 */
		_setValue(posX, fromClick) {
			posX = posX || 0;

			let width = this._els.lineHolder.offsetWidth;
			let range = this._opts.max - this._opts.min;

			if (posX < 0) {
				posX = 0;
			}
			else if (posX > width) {
				posX = width;
			}

			let value = Math.round(posX / width * range + this._opts.min);

			this._value = value;
			this._els.input.value = value;
			this._els.input.classList.remove("error");

			this._sendSignal(!fromClick);
		}

		/**
		 * Delayed sending of signal.
		 *
		 * @param {Boolean} [withTimeout] Send with timeout?
		 * @member $slider
		 * @private
		 * @method _sendSignal
		 */
		_sendSignal(withTimeout) {
			if (this._signalObj.id) {
				clearTimeout(this._signalObj.id);
				this._signalObj.id = null;
			}

			if (withTimeout) {
				this._signalObj.id = setTimeout(this._binds.sendSignalInner, this._opts.timeout);
			}
			else {
				this._sendSignalInner();
			}
		}

		/**
		 * Delayed sending of signal - inner method.
		 *
		 * @member $slider
		 * @private
		 * @method _sendSignalInner
		 */
		_sendSignalInner() {
			if (this._value == this._signalObj.lastValue) return;

			this._signalObj.lastValue = this._value;
			this.trigger("change", this._value);
		}

		/**
		 * Set slider value.
		 * 
		 * @param {Number} value New value
		 * @return {Boolean} If there was error, it returns false
		 * @member $slider
		 * @method setValue
		 */
		setValue(value) {
			if (typeof value === "number") {
				value = $math.setRange(value, this._opts.min, this._opts.max);

				this._value = value;
				this._els.input.value = value;
				this._els.input.classList.remove("error");

				this._setCaret(this._getPosFromValue(value));

				return true;
			}
			else {
				return false;
			}
		}

		/**
		 * Get slider value.
		 * 
		 * @return {Number}
		 * @member $slider
		 * @method getValue
		 */
		getValue() {
			return this._value;
		}

		/**
		 * Overwrite configuration object.
		 *
		 * @param {Object} optsArg See constructor.
		 * @member $slider
		 * @method rewriteOpts
		 */
		rewriteOpts(optsArg) {
			for (let key in optsArg) {
				this._opts[key] = optsArg[key];
			}

			this._value = $math.setRange(this._value, this._opts.min, this._opts.max);

			this.setValue(this._value);
		}
	};

	return $slider;
}]);

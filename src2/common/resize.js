onix.factory("$resize", [
	"$event",
function(
	$event
) {
	// ------------------------ private ----------------------------------------
	
	/**
	 * Handle window resize event, triggers signal "resize".
	 *
	 * @class $resize
	 */
	class $resize extends $event {
		constructor() {
			super();

			/**
			 * Is active?
			 *
			 * @member $resize
			 * @private
			 */
			this._active = false;
			
			/**
			 * Resize object.
			 *
			 * @member $resize
			 * @private
			 */
			this._resizeObj = {
				id: null,
				timeout: 333
			};

			/**
			 * Binds for functions.
			 *
			 * @member $resize
			 * @private
			 */
			this._binds = {
				resize: this._resize.bind(this),
				resizeInner: this._resizeInner.bind(this)
			};
		}

		/**
		 * Window resize event.
		 *
		 * @member $resize
		 * @private
		 * @method _resize
		 */
		_resize() {
			if (this._resizeObj.id) {
				clearTimeout(this._resizeObj.id);
				this._resizeObj.id = null;
			}

			this._resizeObj.id = setTimeout(this._binds.resizeInner, this._resizeObj.timeout);
		}

		/**
		 * Window resize event - trigger signal "resize".
		 *
		 * @member $resize
		 * @private
		 * @method _resizeInner
		 */
		_resizeInner() {
			this.trigger("resize");
		}
		
		// ------------------------ public ----------------------------------------

		/**
		 * Bind resize event to window object.
		 *
		 * @member $resize
		 * @method start
		 */
		start() {
			if (this._active) return;

			window.addEventListener("resize", this._binds.resize);

			this._active = true;
		}

		/**
		 * Unbind resize event from window object.
		 *
		 * @member $resize
		 * @method end
		 */
		end() {
			if (!this._active) return;

			window.removeEventListener("resize", this._binds.resize);
			
			this._active = false;
		}

		/**
		 * Is resize event captured?
		 *
		 * @return {Boolean}
		 * @member $resize
		 * @method isActive
		 */
		isActive() {
			return this._active;
		}
	};

	return new $resize();
}]);

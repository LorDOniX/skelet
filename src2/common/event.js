onix.factory("$event", function() {
	/**
	 * This class is used for extending existing objects and brings signal functionality.
	 * 
 	 * @class $event
 	 */
	class $event {
		constructor() {
			/**
			 * All events. { name: name, event: function, scope, [once] }
			 * 
			 * @type {Array}
			 * @member $event
			 * @private
			 */
			this._allEvents = [];
		}

		/**
		 * Add new event to the stack.
		 * 
		 * @param  {String} name 
		 * @param  {Function} fn
		 * @param  {Object|Function} [scope]
		 * @member $event
		 * @method on
		 */
		on(name, fn, scope) {
			if (!name || !fn) return;

			this._allEvents.push({ 
				name: name,
				fn: fn,
				scope: scope
			});
		}

		/**
		 * Remove event from the stack.
		 * 
		 * @param  {String} name 
		 * @param  {Function} [fn]
		 * @param  {Object|Function} [scope]
		 * @member $event
		 * @method off
		 */
		off(name, fn, scope) {
			if (!name) return;

			let len = this._allEvents.length - 1;

			for (let i = len; i >= 0; i--) {
				let item = this._allEvents[i];

				if (item.name != name) continue;

				if ((!fn || fn == item.fn) && (!scope || scope == item.scope)) {
					this._allEvents.splice(i, 1);
				}
			}
		}

		/**
		 * Add one time event to the stack.
		 * 
		 * @param  {String} name
		 * @param  {Function} [fn]
		 * @param  {Object|Function} [scope]
		 * @member $event
		 * @method once
		 */
		once(name, fn, scope) {
			if (!name || !fn) return;

			this._allEvents.push({ 
				name: name,
				fn: fn,
				scope: scope,
				once: true
			});
		}

		/**
		 * Trigger event with arguments 0..n.
		 * 
		 * @param  {String} name
		 * @member $event
		 * @method trigger
		 */
		trigger(name) {
			if (!name) return;
			
			let args = Array.prototype.slice.call(arguments, 1);
			let len = this._allEvents.length - 1;

			for (let i = len; i >= 0; i--) {
				let item = this._allEvents[i];

				if (item.name != name) continue;

				// call fn
				item.fn.apply(item.scope || this, args);

				// once event
				if (item.once) {
					this._allEvents.splice(i, 1);
				}
			}
		}
	};

	return $event;
});

onix.factory("$promise", function() {
	/**
	 * ES6 promise implementation.
	 * Handle function(resolve, reject) object
	 *
	 * @param  {Function} cbFn Handle function
	 * @class $promise
	 */
	class $promise {
		constructor(cbFn) {
			/**
			 * Promise states.
			 *
			 * @member $promise
			 * @private
			 */
			this._STATES = {
				IDLE: 0,
				RESOLVED: 1,
				REJECTED: 2
			};

			// current state
			this._state = this._STATES.IDLE;

			// all funcs
			this._thens = [];

			// fulfill data
			this._fulfillData = null;

			// call promise cb function
			if (cbFn && typeof cbFn === "function") {
				try {
					cbFn.apply(cbFn, [
						this._resolve.bind(this),
						this._reject.bind(this)
					]);
				}
				catch (err) {
					console.error("$promise exception " + err);
				}
			}
		}

		/**
		 * Resolve promise using obj.
		 *
		 * @private
		 * @param  {Object} obj
		 * @member $promise
		 * @method _resolve
		 */
		_resolve(obj) {
			this._fulfillData = obj;

			this._state = this._STATES.RESOLVED;

			this._resolveFuncs();
		}

		/**
		 * Reject promise using obj.
		 *
		 * @private
		 * @param  {Object} obj
		 * @member $promise
		 * @method _reject
		 */
		_reject(obj) {
			this._fulfillData = obj;

			this._state = this._STATES.REJECTED;

			this._resolveFuncs();
		}

		/**
		 * Resolve all functions.
		 *
		 * @member $promise
		 * @private
		 * @method _resolveFuncs
		 */
		_resolveFuncs() {
			let len = this._thens.length;
			let isCatch = this._state == this._STATES.REJECTED;

			for (let i = 0; i < len; i++) {
				let thenItem = this._thens[i];
				let fn = isCatch && thenItem.rejectCb ? thenItem.rejectCb : (!isCatch && thenItem.resolveCb ? thenItem.resolveCb : null);

				if (!fn) continue;

				try {
					let output = fn(this._fulfillData);

					// promise flattening
					if (output) {
						if (i != len -1) {
							let resolveCb = null;
							let rest = this._thens.slice(i + 1);
							let prom;

							if (output instanceof $promise) {
								prom = output;
							}
							else {
								prom = new $promise(resolve => {
									resolveCb = resolve;
								});
							}

							rest.forEach(restItem => {
								prom.then(restItem.resolveCb, restItem.rejectCb);
							});

							if (resolveCb) {
								resolveCb(output);
							}
							break;
						}
					}
				}
				catch (err) {
					console.error(err);
				}
			}
			
			// clear array
			this._thens.length = 0;
		}

		/**
		 * Is promise already finished?
		 *
		 * @return {Boolean}
		 * @member $promise
		 * @private
		 * @method _isAlreadyFinished
		 */
		_isAlreadyFinished() {
			if (this._state != this._STATES.IDLE) {
				this._resolveFuncs();
			}
		}

		/**
		 * After promise resolve/reject call then (okFn, errorFn).
		 *
		 * @chainable
		 * @param {Function} [resolveCb] Resolve function
		 * @param {Function} [rejectCb] Reject function
		 * @member $promise
		 * @method then
		 */
		then(resolveCb, rejectCb) {
			this._thens.push({
				resolveCb: resolveCb && typeof resolveCb === "function" ? resolveCb : null,
				rejectCb: rejectCb && typeof rejectCb === "function" ? rejectCb : null
			});

			this._isAlreadyFinished();
			
			return this;
		}

		/**
		 * After promise reject call then rejectCb.
		 *
		 * @chainable
		 * @param  {Function} rejectCb Reject function
		 * @member $promise
		 * @method catch
		 */
		"catch"(rejectCb) {
			this._thens.push({
				resolveCb: null,
				rejectCb: rejectCb && typeof rejectCb === "function" ? rejectCb : null
			});

			this._isAlreadyFinished();

			return this;
		}

		/**
		 * Resolve multiple promises.
		 * 
		 * @param {$promise[]} promises
		 * @param  {Boolean} isRace Is race?
		 * @return {Boolean}
		 * @member $promise
		 * @private
		 * @static
		 * @method _multiplePromises
		 */
		static _multiplePromises(promises, isRace) {
			return new $promise(resolve => {
				if (Array.isArray(promises) && promises.length) {
					let count = isRace ? 1 : promises.length;

					let test = (data) => {
						count--;

						if (count == 0) {
							resolve(isRace ? data : null);
						}
					};

					promises.forEach(item => {
						item.then(okData => {
							test(okData);
						}, errorData => {
							test(errorData);
						});
					});
				}
				else {
					resolve();
				}
			});
		}

		/**
		 * Resolve all promises in the array.
		 *
		 * @param {$promise[]} promises
		 * @return {$promise}
		 * @member $promise
		 * @static
		 * @method all
		 */
		static all(promises) {
			return $promise._multiplePromises(promises);
		}

		/**
		 * Race all promises in the array - first one resolves promise.
		 *
		 * @param {$promise[]} promises
		 * @return {$promise} With the value from the first resolved promise.
		 * @member $promise
		 * @static
		 * @method race
		 */
		static race(promises) {
			return $promise._multiplePromises(promises, true);
		}

		/**
		 * Resolve promise with variable object.
		 *
		 * @param {Object} [obj] Resolved object
		 * @return {$promise}
		 * @member $promise
		 * @static
		 * @method resolve
		 */
		static resolve(obj) {
			return new $promise(resolve => {
				resolve(obj);
			});
		}

		/**
		 * Reject promise with variable object.
		 *
		 * @param {Object} [obj] Rejected object
		 * @return {$promise}
		 * @member $promise
		 * @static
		 * @method reject
		 */
		static reject(obj) {
			return new $promise((resolve, reject) => {
				reject(obj);
			});
		}
	};

	return $promise;
});

/**
 * Cover class for localStorage.
 * 
 * @class $localStorage
 */
onix.factory("$localStorage", [
	"$features",
function(
	$features
) {

	// localStorage provider
	let provider = $features.LOCAL_STORAGE ? window.localStorage : {
		_data: {},

		setItem: function(key, value) {
			if (!key) return;

			this._data[key] = value;
		},

		getItem: function(key) {
			if (!key) return null;

			return this._data[key];
		},

		removeItem: function(key) {
			if (!key) return;

			if (key in this._data) {
				delete this._data[key];
			}
		}
	};

	return {
		/**
		 * Set value to localStorage.
		 *
		 * @param {String} key
		 * @param {String} [value]
		 * @member $localStorage
		 */
		set: function(key, value) {
			provider.setItem(key, value);
		},

		/**
		 * Get value from localStorage.
		 *
		 * @param {String} key
		 * @return {String}
		 * @member $localStorage
		 */
		get: function(key) {
			return provider.getItem(key);
		},

		/**
		 * Remove key from localStorage.
		 *
		 * @param {String} key
		 * @return {Boolean}
		 * @member $localStorage
		 */
		remove: function(key) {
			provider.removeItem(key);
		}
	};
}]);

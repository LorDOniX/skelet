/**
 * Class for creating DOM elements and getting their references.
 * 
 * @class $dom
 */
onix.service("$dom", [
	"$common",
function(
	$common
) {
	/**
	 * Create $dom from the configuration.
	 *
	 * @param  {Object} config
	 * @param  {String} config.el Element name, default creates "div", for text node use "text"
	 * @param  {Object} [config.attrs] Atributes
	 * @param  {Object} [config.css] Object with css styles
	 * @param  {Array|Object} [config.events] Bind events {event, fn}
	 * @param  {Array|Object} [config.child] Child nodes
	 * @param  {String|Array} [config.class] Add CSS class/es
	 * @param  {Object} [exported] to this object will be exported all marked elements (_exported attr.)
	 * @return {Element}
	 * @member $dom
	 */
	this.create = function(config, exported) {
		let elName = config.el || "div";
		let el;

		if (elName == "text") {
			el = document.createTextNode("");
		}
		else {
			el = document.createElement(elName);
		}

		Object.keys(config).forEach(key => {
			let value;

			switch (key) {
				case "el":
					break;

				case "attrs":
					value = config.attrs;

					if (value && typeof value === "object" && !Array.isArray(value)) {
						Object.keys(value).forEach(attr => {
							el.setAttribute(attr, value[attr]);
						});
					}
					break;

				case "css":
					value = config.css;

					if (value && typeof value === "object" && !Array.isArray(value)) {
						Object.keys(value).forEach(name => {
							el.style[$common.cssNameToJS(name)] = value[name];
						});
					}
					break;

				case "events":
					value = config.events;

					if (!Array.isArray(value)) {
						value = [value];
					}
					
					value.forEach(item => {
						el.addEventListener(item.event, item.fn);
					});
					break;

				case "child":
					value = config.child;

					if (!Array.isArray(value)) {
						value = [value];
					}
					
					value.forEach(child => {
						el.appendChild(this.create(child, exported));
					});
					break;

				case "_exported":
					exported[config._exported] = el;
					break;

				case "class":
					value = config.class;

					if (typeof value === "string") {
						el.classList.add(value);
					}
					else if (Array.isArray(value)) {
						value.forEach(item => {
							el.classList.add(item);
						});
					}
					break;

				default:
					el[key] = config[key];
			}
		});

		return el;
	};

	/**
	 * Get element from the document.
	 *
	 * @param  {String|Array} els Els = "" -> element; [x, y] -> { x: el, y: el }; [{sel: "div", name: "xyz"}] -> { "xyz": div el }
	 * @param  {Object} [parent]
	 * @return {Object|Element}
	 * @member $dom
	 */
	this.get = function(els, parent) {
		parent = parent || document;
		
		let output;
		// remove .# and white space from the beginning of the string
		let rexp = /^[.# ]+/g;

		if (typeof els === "string" && els) {
			output = parent.querySelector(els);
		}
		else if (Array.isArray(els)) {
			output = {};

			els.forEach((item) => {
				let name;

				if (typeof item === "string") {
					name = item.replace(rexp, "");

					output[name] = parent.querySelector(item);
				}
				else {
					name = item.sel.replace(rexp, "");

					output[item.name || name] = parent.querySelector(item.sel);
				}
			});
		}

		return output;
	};
}]);

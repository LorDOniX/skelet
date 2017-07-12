/**
 * Browser features.
 * 
 * @class $features
 */
onix.service("$features", function() {
	// ------------------------ public ----------------------------------------

	/**
	 * FileReader is available.
	 *
	 * @member $features
	 * @type {Boolean}
	 */
	this.FILE_READER = "FileReader" in window;

	/**
	 * Canvas is available.
	 *
	 * @member $features
	 * @type {Boolean}
	 */
	this.CANVAS = !!document.createElement("canvas").getContext;

	// local storage
	let locStor = true;

	try {
		window.localStorage;
	}
	catch (err) {
		locStor = false;
	}

	/**
	 * Local storage is available.
	 *
	 * @member $features
	 * @type {Boolean}
	 */
	this.LOCAL_STORAGE = locStor;

	/**
	 * Media queries are available.
	 *
	 * @member $features
	 * @type {Boolean}
	 */
	this.MEDIA_QUERY = "matchMedia" in window && "matches" in window.matchMedia("(min-width: 500px)");

	// mouse wheel event name
	let mouseWheel = "DOMMouseScroll";

	if ("onwheel" in window) {
		mouseWheel = "wheel";
	}
	else if ("onmousewheel" in window) {
		mouseWheel = "mousewheel";
	}

	/**
	 * Event name for mouse wheel.
	 *
	 * @member $features
	 * @type {String}
	 */
	this.MOUSE_WHEEL_EVENT_NAME = mouseWheel;
});

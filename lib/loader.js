(function() {
	var loadScriptAsync = function(src, cb) {
		var script = document.createElement("script");
		script.type = "text/javascript";
		script.async = true;
		script.onload = function() {
			if (typeof cb === "function") {
				cb();
			}
		};
		script.src = src;
		document.getElementsByTagName('head')[0].appendChild(script);
	};

	var loadScriptSync = function(src) {
		var req = new XMLHttpRequest();
		req.open("GET", src, false);
		req.send(null);

		if (req.status == 200) {
			var headElement = document.getElementsByTagName("head")[0];
			var script = document.createElement("script");

			script.type = "text/javascript";
			script.text = req.responseText;
			headElement.appendChild(script);
		}
	};

	var isNewBrowser = function() {
		var newBrowser = false;

		if (typeof ("".padStart) === "function") {
			var firefox = "navigator" in window ? navigator.userAgent.match(/Firefox\/(.*)$/) : null;

			newBrowser = !firefox || (firefox && parseFloat(firefox[1]) >= 52);
		}

		return newBrowser;
	};

	// nacteni
	var async = true;
	var getScript = async ? loadScriptAsync : loadScriptSync;
	var newBrowserSrc = "/dist/main-rollup.js";
	var oldBrowserSrc = "/dist/main-babel.js";
	var polyfillsSrc = "/lib/polyfills.js";

	if (isNewBrowser()) {
		getScript(newBrowserSrc);
	}
	else {
		if (async) {
			getScript(polyfillsSrc, function() {
				getScript(oldBrowserSrc);
			});
		}
		else {
			getScript(polyfillsSrc);
			getScript(oldBrowserSrc);
		}
	}
})();

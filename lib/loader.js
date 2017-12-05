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
		req.open("GET", src, false); // 'false': synchronous.
		req.send(null);

		if (req.status == 200) {
			var headElement = document.getElementsByTagName("head")[0];
			var script = document.createElement("script");

			script.type = "text/javascript";
			script.text = req.responseText;
			headElement.appendChild(script);
		}
	};

	var loader = function(newBrowserSrc, oldBrowserSrc, isAsync) {
		var newBrowser = false;
		var getScript = isAsync ? loadScriptAsync : loadScriptSync;

		// lepsi test jak async
		if (typeof ("".padStart) === "function") {
			var firefox = "navigator" in window ? navigator.userAgent.match(/Firefox\/(.*)$/) : null;

			newBrowser = !firefox || (firefox && parseFloat(firefox[1]) >= 52);
		}

		if (newBrowser) {
			getScript(newBrowserSrc);
		}
		else {
			if (isAsync) {
				getScript("/dist/polyfills.js", function() {
					getScript(oldBrowserSrc);
				});
			}
			else {
				getScript("/dist/polyfills.js");
				getScript(oldBrowserSrc);
			}
		}
	};

	// nacteni
	loader("/dist/main-rollup.js", "/dist/main-babel.js", true);
})();

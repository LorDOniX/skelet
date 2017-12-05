Loader = (function() {
	var Loader = function() {
		this._version = "";
		this._head = document.getElementsByTagName("head")[0];
		this._newBrowser = this._isNewBrowser();
	};

	Loader.prototype.version = function(version) {
		this._version = version ? "?" + version : "";
	};

	Loader.prototype.load = function(newJs, oldJs, async) {
		this._js = this._newBrowser ? newJs : oldJs;

		if (async) {
			this._asyncJs();
		}
		else {
			while (this._js.length) {
				this._loadSync(this._js.shift());
			}
		}
	};

	Loader.prototype._isNewBrowser = function() {
		var newBrowser = false;

		if (typeof ("".padStart) === "function") {
			var firefox = "navigator" in window ? navigator.userAgent.match(/Firefox\/(.*)$/) : null;

			newBrowser = !firefox || (firefox && parseFloat(firefox[1]) >= 52);
		}

		return newBrowser;
	};

	Loader.prototype._loadSync = function(src) {
		var req = new XMLHttpRequest();
		req.open("GET", src + this._version, false);
		req.send(null);

		if (req.status == 200) {
			var script = document.createElement("script");

			script.type = "text/javascript";
			script.text = req.responseText;
			this._head.appendChild(script);
		}
	};

	Loader.prototype._loadAsync = function(src, cb) {
		var script = document.createElement("script");
		script.type = "text/javascript";
		script.async = true;
		script.onload = function() {
			if (typeof cb === "function") {
				cb();
			}
		};
		script.onerror = function() {
			if (typeof cb === "function") {
				cb();
			}
		};
		script.src = src + this._version;
		this._head.appendChild(script);
	};

	Loader.prototype._asyncJs = function() {
		var jsFile = this._js.shift();

		if (jsFile) {
			this._loadAsync(jsFile, function() {
				this._asyncJs();
			}.bind(this));
		}
	};

	return new Loader();
})();

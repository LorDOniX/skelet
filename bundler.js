var rollup = require('rollup');
var less = require('less');
var pluginLoader = new less.PluginLoader(less);
var fs = require('fs');
var chokidar = require('chokidar');
var UglifyJS = require("uglify-js");
var { getConf, getJs } = require("./conf");

const WATCHER_TIMEOUT = 500;

class Bundler {
	constructor() {
		this._args = this._getArgs();
		this._conf = getConf();

		let arg = this._args.length ? this._args[0] : "";

		switch (arg) {
			case "js":
				this._makeJs().then(() => {}, e => {
					console.error(e.id);
					console.error(e.codeFrame);
				});
				break;

			case "watch":
				this._makeAll().then(() => {
					this._watcher();
				}, e => {
					console.error(e.id);
					console.error(e.codeFrame);
				});
				break;

			case "compress":
				this._compress();
				break;

			case "css":
				this._makeLess().then(() => {}, () => {});
				break;

			case "dev":
				this._makeAll().then(() => {}, e => {
					console.error(e.id);
					console.error(e.codeFrame);
				});
				break;

			case "dist":
				this._makeAll().then(() => {
					this._compress();
				}, e => {
					console.error(e.id);
					console.error(e.codeFrame);
				});
				break;

			default:
				console.log("Missing parameter! Options: [js|jsBabel|watch|compress|css|dev|dist");
		}
	}

	_getArgs() {
		return Array.prototype.slice.call(process.argv, 2).map(arg => {
			return arg.trim();
		});
	}

	_watch(watchPath, cb) {
		if (!watchPath || typeof cb !== "function") return false;

		let timeoutId = null;
		let buffer = [];

		chokidar.watch(watchPath).on('change', (path, stats) => {
			buffer.push(path);

			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}

			timeoutId = setTimeout(() => {
				if (buffer.length < 1) return;

				let file = buffer[0];

				cb(file, buffer);
				
				buffer = [];
			}, WATCHER_TIMEOUT);
		});

		return true;
	}

	_makeAll() {
		return new Promise((resolve, reject) => {
			this._makeJs().then(() => {
				this._makeLess().then(() => {
					resolve();
				}, e => {
					reject(e);
				});
			}, e => {
				reject(e);
			});
		});
	}

	_watcher() {
		let conf = this._conf.watcher;

		if (!conf) return;

		conf.forEach(item => {
			this._watch(item.path, () => {
				switch (item.type) {
					case "js":
						this._makeJs().then(() => {}, e => {
							console.error(e.id);
							console.error(e.codeFrame);
						});
						break

					case "less":
						this._makeLess().then(() => {}, () => {});
						break;
				}
			});
		});
	}

	_makeJs() {
		return new Promise((resolve, reject) => {
			let conf = getJs();

			rollup.rollup(conf).then(bundle => {
				bundle.write(conf).then(() => {
					resolve();
				}, e => {
					reject(e);
				});
			}, e => {
				reject(e);
			});
		});
	}

	_makeLess(file, output) {
		return new Promise((resolve, reject) => {
			let conf = this._conf.less;
			let data = fs.readFileSync(conf.file, "utf8");
			let opts = {};
			opts.filename = conf.file;
			opts.paths = conf.paths;
			opts.plugins = [];

			// pluginy
			Object.keys(conf.plugins).forEach(name => {
				let plugin = pluginLoader.tryLoadPlugin("less-plugin-" + name, conf.plugins[name]);
				
				if (plugin) {
					opts.plugins.push(plugin);
				}
			});

			less.render(data, opts).then(result => {
				fs.writeFileSync(conf.output, result.css, {encoding: 'utf8'});
				let size = this._getSize(result.css.length);
				console.log(`Write css file ${conf.output}, size ${size}`);
				resolve();
			}, e => {
				console.error(e);
				reject(e);
			});
		});
	}

	_compress() {
		let conf = this._conf.compress;
		let data = fs.readFileSync(conf.file, "utf8");
		let compressData = UglifyJS.minify(data).code;

		fs.writeFileSync(conf.output, compressData, {encoding: 'utf8'});
		let size = this._getSize(compressData.length);
		console.log(`Write compress file ${conf.output}, size ${size}`);
	}

	_getSize(size) {
		if (typeof size !== "number") {
			return "null";
		}

		let lv = size > 0 ? Math.floor(Math.log(size) / Math.log(1024)) : 0;
		let sizes = ["", "K", "M", "G", "T"];
		lv = Math.min(sizes.length, lv);
		let value = lv > 0 ? (size / Math.pow(1024, lv)).toFixed(2) : size;

		return value + " " + sizes[lv] + "B";
	}
}

new Bundler();

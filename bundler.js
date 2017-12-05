var babel = require('babel-core');
var rollup = require('rollup');
var less = require('less');
var pluginLoader = new less.PluginLoader(less);
var fs = require('fs');
var chokidar = require('chokidar');
var UglifyJS = require("uglify-es");
var { CONF, getRollup } = require("./conf");

const WATCHER_TIMEOUT = 500;

class Bundler {
	constructor() {
		this._args = this._getArgs();
		this._run(this._args.length ? this._args[0] : "");
	}

	async _run(param) {
		try {
			switch (param) {
				case "watch":
					await this._makeJs();
					await this._makeLess();
					this._watcher();
					break;

				case "dev":
					await this._makeJs();
					await this._makeLess();
					break;

				case "dist":
					await this._makeJs();
					// rollup
					this._compress(CONF.rollup.dest, CONF.rollup.compress);
					// babel
					this._babel(CONF.babel.input, CONF.babel.dest);
					this._compress(CONF.babel.dest, CONF.babel.compress);
					// css
					this._makeLess();
					break;

				default:
					console.log("Missing parameter! Options: [js|jsBabel|watch|compress|css|dev|dist");
			}
		}
		catch (e) {
			if ("id" in e) {
				console.error(e.id);
			}

			if ("codeFrame" in e) {
				console.error(e.codeFrame);
			}
			else {
				console.log(e);
			}
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

	_watcher() {
		let conf = CONF.watcher;

		if (!conf) return;

		conf.forEach(item => {
			this._watch(item.path, () => {
				switch (item.type) {
					case "js":
						this._makeJs();
						break

					case "less":
						this._makeLess();
						break;
				}
			});
		});
	}

	async _makeJs() {
		let conf = getRollup();
		let bundle = await rollup.rollup(getRollup(conf));
		await bundle.write(conf);
	}

	async _makeLess(file, output) {
		let conf = CONF.less;
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

		let result = await less.render(data, opts);
		fs.writeFileSync(conf.output, result.css, {encoding: 'utf8'});
		let size = this._getSize(result.css.length);
		console.log(`Write css file ${conf.output}, size ${size}`);
	}

	_babel(file, output) {
		let result = babel.transformFileSync(file);

		if (result.code) {
			let size = this._getSize(result.code.length);

			fs.writeFileSync(output, babel.buildExternalHelpers() + "\n" + result.code, {encoding: 'utf8'});
			console.log(`Write babel file ${output}, size ${size}`);
		}
		else {
			console.log("Empty babel data!");
		}
	}

	_compress(file, output) {
		let data = fs.readFileSync(file, "utf8");
		let compressData = UglifyJS.minify(data);

		if (compressData.error) {
			console.log(compressData.error.message);
		}
		else {
			let size = this._getSize(compressData.code.length);

			fs.writeFileSync(output, compressData.code, {encoding: 'utf8'});
			console.log(`Write compress file ${output}, size ${size}`);
		}
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

var chokidar = require('chokidar');
var exec = require('child_process').exec;

const TIMEOUT = 300;

class Watcher {
	constructor(delay) {
		this._timeoutID = null;
		this._timeDelay = delay || 500;
		this._buffer = [];
	}

	/**
	 * Start watching files.
	 */
	watch(watchPath, cb) {
		if (!watchPath || typeof cb !== "function") return false;

		chokidar.watch(watchPath).on('change', (path, stats) => {
			this._buffer.push(path);

			if (this._timeoutID) {
				clearTimeout(this._timeoutID);
				this._timeoutID = null;
			}

			this._timeoutID = setTimeout(() => {
				if (this._buffer.length < 1) return;

				let file = this._buffer[0];

				cb(file, this._buffer);
				
				this._buffer = [];
			}, this._timeDelay);
		});

		return true;
	}
};

class Main {
	constructor() {
		this._jsProm = null;
		this._jsBind = false;
		this._cssProm = null;
		this._cssBind = false;
		this._watcher = new Watcher();

		console.log("waiting for changes...");

		// sledujeme slozky
		this._watcher.watch("src", () => {
			this._src();
		});

		this._watcher.watch("less", () => {
			this._less();
		});
	}

	_runTask(task) {
		return new Promise(resolve => {
			console.log(`npm run ${task}`);
			exec(`npm run ${task}`, (error, stdout, stderr) => {
				if (stdout) {
					console.log(stdout);
				}

				if (stderr) {
					console.log(stderr);
				}

				resolve();
			});
		});
	}

	_src() {
		if (!this._jsProm) {
			this._jsBind = false;
			this._jsProm = this._runTask("js").then(() => {
				this._jsBind = false;
				this._jsProm = null;
			});
		}
		else if (!this._jsBind) {
			this._jsBind = true;
			this._jsProm.then(() => {
				this._less();
			});
		}
	}

	_less() {
		if (!this._cssProm) {
			this._cssBind = false;
			this._cssProm = this._runTask("css").then(() => {
				this._cssBind = false;
				this._cssProm = null;
			});
		}
		else if (!this._cssBind) {
			this._cssBind = true;
			this._cssProm.then(() => {
				this._less();
			});
		}
	}
};

new Main();

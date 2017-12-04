var includePaths = require("rollup-plugin-includepaths");
var multiEntry = require('rollup-plugin-multi-entry');
var filesize = require('./filesize');

exports.getConf = () => {
	return {
		watcher: [{
			path: "src",
			type: "js"
		}, {
			path: "less",
			type: "less"
		}],
		babel: {
			input: "dist/main-rollup.js",
			dest: "dist/main-babel.js",
			compress: "dist/main-babel.min.js"
		},
		rollup: {
			entry: "./src/main.js",
			dest: "dist/main-rollup.js",
			compress: "dist/main-rollup.min.js",
			moduleName: "main",
			format: "iife"
		},
		less: {
			file: "./less/style.less",
			output: "./dist/style.css",
			paths: ["less"],
			plugins: {
				"autoprefix": "Android 2.3,Android >= 4,Chrome >= 35,Firefox >= 30,Explorer >= 10,iOS >= 8,Opera >= 21,Safari >= 7",
				"clean-css": "--s1 --advanced --compatibility=ie8"
			}
		}
	};
};

exports.getRollupPlugins = () => {
	return [
		multiEntry(),
		includePaths({paths:["src"]}),
		filesize()
	];
};

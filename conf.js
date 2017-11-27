var includePaths = require("rollup-plugin-includepaths");
var multiEntry = require('rollup-plugin-multi-entry');
var babel = require('rollup-plugin-babel');
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
		less: {
			file: "./less/style.less",
			output: "./dist/style.css",
			paths: ["less"],
			plugins: {
				"autoprefix": "Android 2.3,Android >= 4,Chrome >= 35,Firefox >= 30,Explorer >= 10,iOS >= 8,Opera >= 21,Safari >= 7",
				"clean-css": "--s1 --advanced --compatibility=ie8"
			}
		},
		compress: {
			file: "./dist/main.js",
			output: "./dist/main.min.js"
		}
	};
};

exports.getJs = () => {
	return {
		entry: "./src/main.js",
		moduleName: "main",
		format: "iife",
		dest: "dist/main.js",
		plugins: [ multiEntry(), includePaths({paths:["src"]}), filesize(), babel({
			exclude: 'node_modules/**'
		})]
	};
};

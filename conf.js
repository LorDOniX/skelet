var includePaths = require("rollup-plugin-includepaths");
var multiEntry = require('rollup-plugin-multi-entry');
var filesize = require('rollup-plugin-filesize');
var babel = require('rollup-plugin-babel');

module.exports = {
	getConf: isDist => {
		let jsPlugins = [ multiEntry(), includePaths({paths:["src"]}), filesize() ];

		if (isDist) {
			jsPlugins.push(babel({
				exclude: 'node_modules/**'
			}));
		}

		return {
			watcher: [{
				path: "src",
				type: "js"
			}, {
				path: "less",
				type: "less"
			}],
			js: {
				entry: "./src/main.js",
				moduleName: "main",
				format: "iife",
				dest: "dist/main.js",
				plugins: jsPlugins
			},
			less: {
				file: "less\\style.less",
				output: "dist\\style.css",
				paths: ["less"],
				plugins: {
					"autoprefix": "Android 2.3,Android >= 4,Chrome >= 35,Firefox >= 30,Explorer >= 10,iOS >= 8,Opera >= 21,Safari >= 7",
					"clean-css": "--s1 --advanced --compatibility=ie8"
				}
			},
			compress: {
				file: "dist\\main.js",
				output: "dist\\main.min.js"
			}
		};
	}
};

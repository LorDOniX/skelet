import includePaths from "rollup-plugin-includepaths";
import multiEntry from 'rollup-plugin-multi-entry';
import filesize from 'rollup-plugin-filesize';

export default {
	entry: "./src/main.js",
	moduleName: "main",
	format: "iife",
	dest: "dist/main.js",
	plugins: [ multiEntry(), includePaths({paths:["src"]}), filesize() ]
};

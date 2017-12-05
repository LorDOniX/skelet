var fileSize = require("filesize");
var boxen = require("boxen");
var colors = require("colors");
var gzip = require("gzip-size");

const FORMAT = {};
const THEME = "dark";
const PRIMARY_COLOR = THEME === "dark" ? "green" : "black";
const SECONDARY_COLOR = THEME === "dark" ? "yellow" : "blue";

module.exports = () => {
	return {
		getData(bundle, code) {
			let size = fileSize(Buffer.byteLength(code), FORMAT);
			let gzipSize = fileSize(gzip.sync(code), FORMAT);
			let date = new Date();
			let strDate = 
				[
					date.getDate().toString().padStart(2, "0"),
					(date.getMonth() + 1).toString().padStart(2, "0"),
					date.getFullYear()
				].join(".") + " " +
				[
					date.getHours().toString().padStart(2, "0"),
					date.getMinutes().toString().padStart(2, "0"),
					date.getSeconds().toString().padStart(2, "0")
				].join(":")
			;

			return boxen(
				`${colors[PRIMARY_COLOR].bold("Date & time: ")}${colors[SECONDARY_COLOR](strDate) + "\n"}${bundle.file ? colors[PRIMARY_COLOR].bold("Destination: ") + 
				colors[SECONDARY_COLOR](bundle.file) + "\n" : ""}${colors[PRIMARY_COLOR].bold("Bundle size: ")}${colors[SECONDARY_COLOR](size)}${", " + colors[PRIMARY_COLOR].bold("Gzipped size: ") + 
				colors[SECONDARY_COLOR](gzipSize)}`, { padding: 1 }
			);
		},

		ongenerate(bundle, { code }) {
			console.log(this.getData(bundle, code));
		}
	};
};

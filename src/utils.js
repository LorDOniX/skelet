import EXIF from "exif";

/**
 * Pres reader precte soubor, pote ho proxuje z _getCanvas, mezitim se nactou EXIF informace.
 * @param  {File} file vstupni soubor
 * @return {Promise}
 */
export function getEXIF(file) {
	return new Promise((resolve, reject) => {
		readBinary(file).then(binData => {
			let exifTags = null;
			
			if (file.type == "image/jpeg" || file.type == "image/pjpeg") {
				if (file.type == "image/jpeg" || file.type == "image/pjpeg") {
					try {
						let exif = new EXIF(binData);
						exifTags = exif.getTags();
					}
					catch(e) {
						console.error(e);
					}
				}
			}

			resolve(exifTags);
		}, e => {
			reject(e);
		});
	});
}

/**
 * Prevod binarnich dat do base64
 * @param  {String} fileType Typ dat
 * @param  {Array} binaryData
 * @returns {String}
 */
export function readBinary(file) {
	return new Promise((resolve, reject) => {
		let reader = new FileReader();

		reader.onload = e => {
			let result = e.target.result;

			resolve(new Uint8Array(result));
		};

		reader.onerror = e => {
			reject(e);
		};

		reader.readAsArrayBuffer(file);
	});
};

export function imageFileToImg(file) {
	return new Promise((resolve, reject) => {
		let reader = new FileReader();

		reader.onload = e => {
			let img = new Image;
			img.onload = () => {
				resolve(img);
			};
			img.onerror = e2 => {
				reject(e2);
			};
			img.src = reader.result;
		};

		reader.onerror = e => {
			reject(e);
		};

		reader.readAsDataURL(file);
	});
};

/**
 * Ze vstupniho obrazku/canvasu udela novy.
 * 
 * @param  {Image|Canvas} img
 * @param  {Object} [options]
 * @param  {Number} [options.angle] Pocatecni uhel
 * @param  {Canvas} [options.canvas = null] Nevytvaret novy canvas, pouzit vlastni
 * @param  {Number} [options.orientation = null] EXIF orientace nebo uhly 90, 180, 270 12.hodin po smeru hodinovych rucicek
 * @param  {Boolean} [options.scaled = true] Skalovat obrazek
 * @return {Object}
 */
export function getDataFromImg(img, options) {
	let opts = {
		angle: 0,
		canvas: null,
		width: img.width,
		height: img.height,
		orientation: null,
		scaled: true
	};

	for (let key in options) {
		opts[key] = options[key];
	}
	
	let canvas = opts.canvas || document.createElement("canvas");
	canvas.width = opts.width;
	canvas.height = opts.height;
	let ctx = canvas.getContext("2d");
	let angle = opts.angle;
	let draw = true;

	// rotate
	if (opts.orientation) {
		switch (opts.orientation) {
			case 2:
				// horizontal flip
				ctx.translate(opts.width, 0);
				ctx.scale(-1, 1);
				break;
		
			case 180:
			case 3:
				// 180° rotate left
				ctx.translate(opts.width, opts.height);
				ctx.rotate(Math.PI);
				angle = 180;
				break;

			case 4:
				// vertical flip
				ctx.translate(0, opts.height);
				ctx.scale(1, -1);
				break;

			case 5:
				// vertical flip + 90 rotate right
				canvas.width = opts.height;
				canvas.height = opts.width;
				ctx.rotate(0.5 * Math.PI);
				ctx.scale(1, -1);

				if (opts.scaled) {
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.height, canvas.width);
					draw = false;
				}

				angle += 90;
				break;
			
			case 90:
			case 6:
				// 90° rotate right
				canvas.width = opts.height;
				canvas.height = opts.width;
				ctx.rotate(0.5 * Math.PI);
				ctx.translate(0, -opts.height);
				
				if (opts.scaled) {
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, opts.width, opts.height);
					draw = false;
				}
				
				angle += 90;
				break;

			case 7:
				// horizontal flip + 90 rotate right
				canvas.width = opts.height;
				canvas.height = opts.width;
				ctx.rotate(0.5 * Math.PI);
				ctx.translate(opts.width, -opts.height);
				ctx.scale(-1, 1);

				if (opts.scaled) {
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.height, canvas.width);
					draw = false;
				}

				angle += 90;
				break;
			
			case 270:
			case 8:
				// 90° rotate left
				canvas.width = opts.height;
				canvas.height = opts.width;
				ctx.rotate(-0.5 * Math.PI);
				ctx.translate(-opts.width, 0);

				if (opts.scaled) {
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.height, canvas.width);
					draw = false;
				}
				
				angle += 270;
		}
	}

	if (draw) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (opts.scaled) {
			ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
		}
		else {
			ctx.drawImage(img, 0, 0);
		}
	}

	return {
		canvas,
		angle,
		isPortrait: canvas.height > canvas.width
	};
}

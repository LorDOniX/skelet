/**
* Nahravany obrazek z nacteny ze souboru a zoreacovavany pres cancas
*/
class UploadImage {
	constructor() {
	
	}
	
	destroy() {}

	/**
	 * Spocita rozmery obrazku/canvasu; prepocita v pripade zadani options.maxSize
	 * @param  {Image|Canvas} img
	 * @param  {Object} [options]
	 * @param  {Number} [options.maxSize]
	 * @return {Object}
	 */
	getImageDim(img, options) {
		let largeWidth = options.maxSize && img.width > options.maxSize;
		let largeHeight = options.maxSize && img.height > options.maxSize;

		let output = {
			width: img.width,
			height: img.height,
			scale: 1
		}
	
		if (largeWidth || largeHeight) {
			// resizneme obrazek
			let imgWidth = img.width;
			let imgHeight = img.height;
	
			// vybereme vetsi ze stran
			if (img.width > img.height) {
				// sirka
				imgHeight = options.maxSize * imgHeight / imgWidth;
				imgWidth = options.maxSize;
			}
			else {
				// vyska
				imgWidth = options.maxSize * imgWidth / imgHeight;
				imgHeight = options.maxSize;
			}
	
			output.scale = img.width / imgWidth; // pomer orig. a zmenseneho obrazku
			output.width = imgWidth;
			output.height = imgHeight;
		}
	
		return output;
	}

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
	getCanvasFromImg(img, options) {
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
		if (!canvas.parentNode) {
			document.body.appendChild(canvas);
		}

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

		if (canvas.parentNode === document.body) {
			canvas.remove();
		}
	
		return {
			canvas: canvas,
			angle: angle
		};
	}
	
	/**
	 * Ziska novy, otoceny obraz vcetne exifu
	 * @param  {String} srcData Image.src data
	 * @param  {Object|Null} exifTags
	 * @param  {Object} [options]
	 * @return {JAK.Promise}
	 */
	_getCanvas(srcData, exifTags, options) {
		let promise = new JAK.Promise();
		let img = document.createElement('img');

		// pri loadu
		img.onload = () => {
			document.body.appendChild(img);

			if (options.minSize) {
				let width = img.width;
				let height = img.height;
				let test = 0;
		
				// na sirku
				if (width >= options.minSize.width && height >= options.minSize.height) {
					test++;
				}
				if (width >= options.minSize.height && height >= options.minSize.width) {
					test++;
				}
		
				if (!test) {
					promise.reject({
						E_SMALL: true
					});
					return; // nepokracujeme dal
				}
			}

			// img dimension
			let imd = this.getImageDim(img, options);

			// canvas data
			let cd = this.getCanvasFromImg(img, {
				width: imd.width,
				height: imd.height,
				orientation: exifTags ? exifTags.Orientation : null
			});

			promise.fulfill({
				canvas: cd.canvas,
				angle: cd.angle,
				scale: imd.scale,
				exifTags: exifTags,
				frpcBinaryData: null
			});

			img.remove();
		};

		img.src = srcData;

		return promise;
	}
	
	/**
	 * Pres reader precte soubor, pote ho proxuje z _getCanvas, mezitim se nactou EXIF informace.
	 * @param  {File} file vstupni soubor
	 * @param  {Object} [options]
	 * @param  {Integer} [options.maxSize] 0 def. bez omezeni
	 * @param  {Object|Null} [options.minSize] null nebo { width: x, height: y }
	 * @return {JAK.Promise}
	 */
	load(file, options) {
		let promise = new JAK.Promise();

		Mapy.Util.readBinary(file).then(binData => {
			let exifTags = null;
			
			if (file.type == "image/jpeg" || file.type == "image/pjpeg") {
				if (file.type == "image/jpeg" || file.type == "image/pjpeg") {
					try {
						var exif = new Mapy.EXIF(binData.binary);
						exifTags = exif.getTags();
					} catch(e) {}
				}
			}

			let srcData = Mapy.Util.fileToBase64(file.type, binData.binary);

			this._getCanvas(srcData, exifTags, options).then((data) => {
				data.frpcBinaryData = binData.frpc;

				promise.fulfill(data);
			}, (errorData) => {
				promise.reject(errorData);
			});
		}, err => {
			promise.reject();
		});

		return promise;
	}
}

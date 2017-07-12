/**
 * Class for creating img previews from File[] variable.
 * 
 * @class $image
 */
onix.service("$image", [
	"$promise",
	"$features",
function(
	$promise,
	$features
) {

	/**
	 * Read one image file - gets canvas with it. EXIF is readed, you can specific max size for image scale.
	 *
	 * @param  {Object} file Input file
	 * @param  {Number} [maxSize] If image width/height is higher than this value, image will be scaled to this dimension
	 * @return {$promise} Promise with output object
	 * @member $image
	 */
	this.readFromFile = function(file, maxSize) {
		return new $promise((resolve, reject) => {
			if (!$features.FILE_READER) {
				reject();

				return;
			}

			let reader = new FileReader();
			let output = {
				img: null,
				exif: null,
				canvas: null
			};

			reader.onload = e => {
				let binaryData = reader.result;
				let binaryDataArray = new Uint8Array(binaryData);
				let exif = null;

				// exif only for jpeg
				if (file.type == "image/jpeg" || file.type == "image/pjpeg") {
					exif = this.getEXIF(binaryData);
				}

				let img = new Image();

				img.onload = () => {
					let imd = this.getImageDim(img, maxSize);
					
					let canvas = this.getCanvas(img, {
						width: imd.width,
						height: imd.height,
						orientation: exif ? exif.Orientation : 0,
						scaled: imd.scale != 1
					});

					output.img = img;
					output.exif = exif;
					output.canvas = canvas;

					resolve(output);
				};

				img.src = this.fileToBase64(file.type, binaryDataArray);
			};

			reader.readAsArrayBuffer(file);
		});
	};

	/**
	 * Counts image dimension; if maxSize is available, new dimension is calculated.
	 *
	 * @param  {Image} img
	 * @param  {Number} [maxSize] If image width/height is higher than this value, image will be scaled to this dimension
	 * @return {Object}
	 * @member $image
	 */
	this.getImageDim = function(img, maxSize) {
		maxSize = maxSize || 0;
		
		let largeWidth = maxSize > 0 && img.width > maxSize;
		let largeHeight = maxSize > 0 && img.height > maxSize;

		let output = {
			width: img.width,
			height: img.height,
			scale: 1
		};

		if (largeWidth || largeHeight) {
			// resize picture
			let imgWidth = img.width;
			let imgHeight = img.height;

			// portrait x landscape
			if (img.width > img.height) {
				// landscape
				imgHeight = maxSize * imgHeight / imgWidth;
				imgWidth = maxSize;
			}
			else {
				// portrait
				imgWidth = maxSize * imgWidth / imgHeight;
				imgHeight = maxSize;
			}

			output.scale = img.width / imgWidth; // ratio between original x scaled image
			output.width = imgWidth;
			output.height = imgHeight;
		}

		return output;
	};

	/**
	 * Get canvas from image/canvas - read input imgData, create canvas with it.
	 *
	 * @param  {Image} imgData
	 * @param  {Object} [optsArg] Variable options
	 * @param  {Number} [optsArg.width] Output canvas width
	 * @param  {Number} [optsArg.height] Output canvas height
	 * @param  {Number} [optsArg.orientation = 0] EXIF orientation; degrees 90, 180, 270 CCW
	 * @param  {Boolean} [optsArg.scaled = false]
	 * @param  {Canvas} [optsArg.canvas = null] Do not create canvas - use canvas from options
	 * @return {Canvas}
	 * @member $image
	 */
	this.getCanvas = function(imgData, optsArg) {
		let opts = {
			width: imgData.width || 0,
			height: imgData.height || 0,
			orientation: 0,
			scaled: false,
			canvas: null
		};

		for (let key in optsArg) {
			opts[key] = optsArg[key];
		}

		if (!$features.CANVAS) {
			return null;
		}

		let canvas = opts.canvas || document.createElement("canvas");
		canvas.width = opts.width;
		canvas.height = opts.height;

		let ctx = canvas.getContext("2d");
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
						ctx.drawImage(imgData, 0, 0, imgData.width, imgData.height, 0, 0, canvas.height, canvas.width);

						draw = false;
					}
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
						ctx.drawImage(imgData, 0, 0, imgData.width, imgData.height, 0, 0, canvas.height, canvas.width);

						draw = false;
					}
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
						ctx.drawImage(imgData, 0, 0, imgData.width, imgData.height, 0, 0, canvas.height, canvas.width);

						draw = false;
					}
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
						ctx.drawImage(imgData, 0, 0, imgData.width, imgData.height, 0, 0, canvas.height, canvas.width);

						draw = false;
					}
			}
		}

		if (draw) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			if (opts.scaled) {
				ctx.drawImage(imgData, 0, 0, imgData.width, imgData.height, 0, 0, canvas.width, canvas.height);
			}
			else {
				ctx.drawImage(imgData, 0, 0);
			}
		}

		return canvas;
	};

	/**
	 * Binary data to base64.
	 *
	 * @param  {String} fileType
	 * @param  {Array} binaryData
	 * @return {String}
	 * @member $image
	 */
	this.fileToBase64 = function(fileType, binaryData) {
		let length = binaryData.length;
		let output = "";

		for (let i = 0; i < length; i += 1) {
			output += String.fromCharCode(binaryData[i]);
		}

		return 'data:' + fileType + ';base64,' + btoa(output);
	};

	/**
	 * Is file a picture?
	 *
	 * @param  {File}  file
	 * @return {Boolean}
	 * @member $image
	 */
	this.isPicture = function(file) {
		return file && (file.type == "image/jpeg" || file.type == "image/pjpeg" || file.type == "image/png");
	};

	/**
	 * Get picture files from array of files.
	 * 
	 * @param  {Array} array of files
	 * @return {Array}
	 * @member $image
	 */
	this.getPictureFiles = function(files) {
		let pictureFiles = [];

		if (files && files.length) {
			for (let i = 0; i < files.length; i++) {
				let item = files[i];

				if (this.isPicture(item)) {
					pictureFiles.push(item);
				}
			}
		}

		return pictureFiles;
	};

	/**
	 * Get picture files count from the array of Files. This function uses 'getPictureFiles'.
	 * 
	 * @param  {Array} array of files
	 * @return {Boolean}
	 * @member $image
	 */
	this.getPicturesCount = function(files) {
		return this.getPictureFiles(files).length;
	};

	/**
	 * Get image EXIF information.
	 * 
	 * @param  {Binary[]} imgData Binary img data
	 * @return {Object}
	 * @member $image
	 */
	this.getEXIF = function(imgData) {
		if ("EXIF" in window) {
			return EXIF.readFromBinaryFile(imgData);
		}
		else {
			return {};
		}
	};
}]);

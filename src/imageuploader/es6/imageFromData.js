/**
* Editovany obrazek nacteny ze url a zpracovavany pres cancas
*/
class EditImage extends UploadImage {
	constructor() {
		super();
	}
	
	destroy() {}
	
	_getCanvas(img, orientation, options) {
		let promise = new JAK.Promise();

		// img dimension
		let imd = this.getImageDim(img, options);

		// canvas data
		let cd = this.getCanvasFromImg(img, {
			width: imd.width,
			height: imd.height,
			orientation: orientation ? orientation : null
		});

		return {
			canvas: cd.canvas,
			angle: cd.angle,
			scale: imd.scale,
			exifTags: null,
			frpcBinaryData: null
		}
	}
	
	/**
	 * Pres nacteme soubor, pote ho proxuje z _getCanvas
	 * @param  {String} src source editovaneho obrazku
	 * @param  {Object} [options]
	 * @param  {Integer} [options.maxSize] 0 def. bez omezeni
	 * @param  {Object|Null} [options.minSize] null nebo { width: x, height: y }
	 * @return {JAK.Promise}
	 */
	load(src, orientation,options) {
		let promise = new JAK.Promise();

		options = options || {};
		var img = new Image();
		img.crossOrigin = "Anonymous";
		
		img.onload = (e) => {
			document.body.appendChild(img);
			var data = this._getCanvas(img, orientation, options)
			promise.fulfill(data);

			img.remove();
		}
		
		img.onerror = function(e) {
			promise.reject(e);
		};

		img.src = src;

		return promise;
	}	
}

/**
* Orezavatko fotografii
*/
class UploadCrop {
	constructor(options) {
		this._options = {
			width: 250, // initial size
			height: 250,
			minWidth: 10,
			minHeight: 10, // always higher than 0! if resizable=true
			maxWidth: Infinity,
			maxHeight: Infinity,
			resizable: true,
			aspectRatio: null
		};

		for (var op in options) {
			this._options[op] = options[op];
		}

		// areas dimensions
		this._dim = {
			areaWidth: 0,
			areaHeight: 0,
			width: this._options.width,
			height: this._options.height
		};

		this._changed = false;

		this._backupData = null;

		this._groups = {
			"point-nw": [{ type: "nw", x: true, y: true }, { type: "sw", x: true }, { type: "ne", y: true }],
			"point-ne": [{ type: "ne", x: true, y: true }, { type: "se", x: true }, { type: "nw", y: true }],
			"point-sw": [{ type: "sw", x: true, y: true }, { type: "nw", x: true }, { type: "se", y: true }],
			"point-se": [{ type: "se", x: true, y: true }, { type: "ne", x: true }, { type: "sw", y: true }]
		};

		this._points = { nw: { x: 0, y: 0 }, ne: { x: 0, y: 0 }, sw: { x: 0, y: 0 }, se: { x: 0, y: 0 }};
		this._type = null;

		this._mouse = {
			startXSave: 0,
			startYSave: 0,
			startX: 0,
			startY: 0
		};

		this._binds = {
			mouseDown: this._mouseDown.bind(this),
			mouseMove: this._mouseMove.bind(this),
			mouseUp: this._mouseUp.bind(this)
		};

		this._dom = {};

		this._create();

		this._dom.container.addEventListener("mousedown", this._binds.mouseDown);
	}

	destroy() {
		var c = this.getContainer();
		c.remove();
	
		this._dom.container.removeEventListener("mousedown", this._binds.mouseDown);
	}

	/**
	 * Ziskani containeru s croppem
	 * @return {HTMLElement}
	 */
	getContainer() {
		return this._dom.container;
	}

	/**
	 * Create crop element.
	 * 
	 * @return {Element}
	 * @private
	 */
	_create() {
		var cropEl = document.createElement("div");
		cropEl.classList.add("upload-crop");

		this._dom.container = cropEl;
	
		var cropTop = document.createElement("div");
		cropTop.classList.add("crop-top");
	
		this._dom.cropTop = cropTop;
	
		var cropBottom = document.createElement("div");
		cropBottom.classList.add("crop-bottom");
	
		this._dom.cropBottom = cropBottom;
	
		var cropLeft = document.createElement("div");
		cropLeft.classList.add("crop-left");
	
		this._dom.cropLeft = cropLeft;
	
		var cropRight = document.createElement("div");
		cropRight.classList.add("crop-right");
	
		this._dom.cropRight = cropRight;
	
		var cropMiddle = document.createElement("div");
		cropMiddle.classList.add("crop-middle");
		
		this._dom.cropMiddle = cropMiddle;
	
		cropEl.appendChild(cropTop);
		cropEl.appendChild(cropBottom);
		cropEl.appendChild(cropLeft);
		cropEl.appendChild(cropRight);
		cropEl.appendChild(cropMiddle);
	
		var pointNW = document.createElement("span");
		pointNW.classList.add("point-nw");
	
		var pointNE = document.createElement("span");
		pointNE.classList.add("point-ne");
	
		cropTop.appendChild(pointNW);
		cropTop.appendChild(pointNE);
	
		var pointSW = document.createElement("span");
		pointSW.classList.add("point-sw");
	
		var pointSE = document.createElement("span");
		pointSE.classList.add("point-se");
	
		if (this._options.resizable) {
			cropEl.classList.add("resizable");
		}
		
		cropBottom.appendChild(pointSW);
		cropBottom.appendChild(pointSE);
	}

	/**
	 * Set crop center above his area.
	 *
	 * @private
	 */
	_setCenter() {
		var width = this._dim.width;
		var height = this._dim.height;

		var leftDiff = Math.round((this._dim.areaWidth - width) / 2);
		var topDiff = Math.round((this._dim.areaHeight - height) / 2);

		var p = this._points;

		p.nw.x = leftDiff;
		p.nw.y = topDiff;

		p.ne.x = p.nw.x + width;
		p.ne.y = p.nw.y + height;

		p.sw.x = this._dim.areaWidth - leftDiff;
		p.sw.y = this._dim.areaHeight - topDiff;

		p.se.x = p.ne.x;
		p.se.y = p.ne.y;
	}

	/**
	 * Set value in selected range.
	 * 
	 * @param {Number} value Input value
	 * @param {Number} min Min value
	 * @param {Number} max Max value
	 * @return {Number}
	 */
	_setRange(value, min, max) {
		if (value < min) {
			return min;
		}
		else if (value > max) {
			return max;
		}
		else {
			return value;
		}
	}

	/**
	 * Align crop points inside his area.
	 * 
	 * @private
	 */
	_alignPoints() {
		var p = this._points;

		p.nw.x = this._setRange(p.nw.x, 0, this._dim.areaWidth - this._dim.width);
		p.sw.x = this._setRange(p.sw.x, 0, this._dim.areaWidth - this._dim.width);
		p.ne.x = this._setRange(p.ne.x, this._dim.width, this._dim.areaWidth);
		p.se.x = this._setRange(p.se.x, this._dim.width, this._dim.areaWidth);

		p.nw.y = this._setRange(p.nw.y, 0, this._dim.areaHeight - this._dim.height);
		p.ne.y = this._setRange(p.ne.y, 0, this._dim.areaHeight - this._dim.height);
		p.sw.y = this._setRange(p.sw.y, this._dim.height, this._dim.areaHeight);
		p.se.y = this._setRange(p.se.y, this._dim.height, this._dim.areaHeight);
	}

	/**
	 * Redraw crop - calculate all his points and set them in dom objects.
	 * 
	 * @private
	 */
	_redraw() {
		var p = this._points;

		var leftX = p.nw.x;
		var leftY = p.nw.y;
		var size = this._getSize();

		this._dom.cropTop.style.left = leftX + "px";
		this._dom.cropTop.style.width = size.width + "px";
		this._dom.cropTop.style.height = leftY + "px";

		this._dom.cropBottom.style.left = leftX + "px";
		this._dom.cropBottom.style.width = size.width + "px";
		this._dom.cropBottom.style.height = (this._dim.areaHeight - p.sw.y) + "px";

		this._dom.cropLeft.style.width = leftX + "px";
		this._dom.cropLeft.style.height = this._dim.areaHeight + "px";

		this._dom.cropRight.style.width = (this._dim.areaWidth - p.ne.x) + "px";
		this._dom.cropRight.style.height = this._dim.areaHeight + "px";

		this._dom.cropMiddle.style.width = size.width + "px";
		this._dom.cropMiddle.style.height = size.height + "px";
		this._dom.cropMiddle.style.left = leftX + "px";
		this._dom.cropMiddle.style.top = leftY + "px";
	}

	/**
	 * Mouse down - move/resize crop.
	 * 
	 * @param  {Event} e
	 * @private
	 */
	_mouseDown(e) {
		e.stopPropagation();
		e.preventDefault();

		// ie8
		var target = e.target || e.srcElement;

		this._type = target.getAttribute("class");

		switch (this._type) {
			case "crop-top":
			case "crop-bottom":
			case "crop-left":
			case "crop-right":
				return;
		}

		// save values during click
		this._mouse.startX = e.clientX;
		this._mouse.startY = e.clientY;
		this._mouse.startXSave = e.clientX;
		this._mouse.startYSave = e.clientY;

		document.addEventListener("mousemove", this._binds.mouseMove);
		document.addEventListener("mouseup", this._binds.mouseUp);
	}

	/**
	 * Mouse move - move/resize crop.
	 * 
	 * @param  {Event} e
	 * @private
	 */
	_mouseMove(e) {
		e.stopPropagation();
		e.preventDefault();

		var diffX =  e.clientX - this._mouse.startX;
		var diffY = e.clientY - this._mouse.startY;

		if (this._type == "crop-middle") {
			// move
			Object.keys(this._points).forEach(function(key) {
				this._points[key].x += diffX;
				this._points[key].y += diffY;
			}, this);

			this._alignPoints();
			this._redraw();
		}
		else {
			// resize - which group?
			var group = this._groups[this._type];

			if (this._options.aspectRatio) {
				diffY = diffX / this._options.aspectRatio * (this._type == "point-nw" || this._type == "point-se" ? 1 : -1);
			}

			if (this._resizeTest(diffX, diffY, group)) {
				group.forEach(function(i) {
					var point = this._points[i.type];

					// add diffx, diffy to all group members
					point.x += i.x ? diffX : 0;
					point.y += i.y ? diffY : 0;
				}, this);

				// update size
				var size = this._getSize();

				this._dim.width = size.width;
				this._dim.height = size.height;

				this._redraw();
			}
		}

		// overwrite
		this._mouse.startX = e.clientX;
		this._mouse.startY = e.clientY;
	}

	/**
	 * Mouse up - end of move/resize crop.
	 * 
	 * @param  {Event} e
	 * @private
	 */
	_mouseUp(e) {
		e.stopPropagation();
		e.preventDefault();

		document.removeEventListener("mousemove", this._binds.mouseMove);
		document.removeEventListener("mouseup", this._binds.mouseUp);

		if (this._mouse.startXSave != e.clientX || this._mouse.startYSave != e.clientY) {
			// crop was changed
			this._changed = true;
		}
	}

	/**
	 * Get size of crop.
	 * 
	 * @param  {Object} [points] Points object, default is used crop points.
	 * @return {Object}
	 */
	_getSize(points) {
		points = points || this._points;

		return {
			width: Math.abs(points.ne.x - points.nw.x),
			height: Math.abs(points.sw.y - points.nw.y)
		};
	}

	/**
	 * Resize test - if returns false, crop size is on the edge of the area.
	 * 
	 * @param  {Number} diffX Increment on axe X
	 * @param  {Number} diffY Increment on axe Y
	 * @param  {Array[Object]} group Selected group from mouse down
	 * @return {Boolean} false - error
	 */
	_resizeTest(diffX, diffY, group) {
		if (!this._options.aspectRatio) {
			return false;
		}

		var points = {
			nw: {
				x: this._points.nw.x,
				y: this._points.nw.y
			},
			ne: {
				x: this._points.ne.x,
				y: this._points.ne.y
			},
			sw: {
				x: this._points.sw.x,
				y: this._points.sw.y
			},
			se: {
				x: this._points.se.x,
				y: this._points.se.y
			}
		}

		group.forEach(function(i) {
			var point = points[i.type];

			// add diffx, diffy to all group members
			point.x = this._points[i.type].x + (i.x ? diffX : 0);
			point.y = this._points[i.type].y + (i.y ? diffY : 0);
		}, this);

		// min. and max. value
		var size = this._getSize(points);

		// test
		if (
			size.width < this._options.minWidth || size.width > this._options.maxWidth ||
			size.height < this._options.minHeight || size.height > this._options.maxHeight ||
			points.nw.x < 0 || points.se.x > this._dim.areaWidth ||
			points.nw.y < 0 || points.sw.y > this._dim.areaHeight
		) {
			return false;
		}
		else {
			return true;
		}
	}

	/**
	 * Set crop center above his area.
	 * 
	 */
	setCenter() {
		this._setCenter();
		this._redraw();
	}

	/**
	 * Set crop dimensions - area;
	 * 
	 * @param {Object} [dim]
	 * @param {Number} [dim.areaWidth] Area width
	 * @param {Number} [dim.areaHeight] Area height
	 */
	setDim(dim) {
		dim = dim || {};

		if (dim.areaWidth) {
			this._dim.areaWidth = dim.areaWidth;

			this._dom.container.style.width = this._dim.areaWidth + "px";
		}

		if (dim.areaHeight) {
			this._dim.areaHeight = dim.areaHeight;

			this._dom.container.style.height = this._dim.areaHeight + "px";
		}
	}

	/**
	 * Fit crop to whole area.
	 */
	fitToArea() {
		let width;
		let height;

		if (this._options.aspectRatio) {
			let ratio = this._options.aspectRatio;

			// zkusime sirku
			width = this._dim.areaWidth;
			height = Math.round(width / ratio);

			// musime vysku
			if (height > this._dim.areaHeight) {
				height = this._dim.areaHeight;
				width = Math.round(height * ratio);
			}
		}
		else {
			width = Math.min(this._options.maxWidth, this._dim.areaWidth);
			height = Math.min(this._options.maxHeight, this._dim.areaHeight);
		}
		
		this._dim.width = width;
		this._dim.height = height;

		this.setCenter();
	}

	/**
	 * Is crop changed?
	 * 
	 * @return {Boolean}
	 */
	isChanged() {
		return this._changed;
	}

	/**
	 * Backup current crop state - his position and change state.
	 * 
	 */
	backup() {
		this._backupData = {
			changed: this._changed,
			aabb: this.getAABB()
		};
	}

	/**
	 * Restore crop saved state - his position and change state.
	 * 
	 */
	restore(restoreData) {
		var data = restoreData || this._backupData.aabb
		var restoreMode = !!!restoreData;

		if (!data) return;
		
		if (!this.restoreMode && this._backupData) {
			this._changed = this._backupData.changed;
		}

		var aabb = data;

		var nw = this._points["nw"];
		var ne = this._points["ne"];
		var sw = this._points["sw"];
		var se = this._points["se"];

		// restore
		nw.x = aabb[0];
		nw.y = aabb[1];
		se.x = aabb[2];
		se.y = aabb[3];

		ne.x = se.x;
		ne.y = nw.y;
		sw.x = nw.x;
		sw.y = se.y;

		var size = this._getSize();

		this._dim.width = size.width;
		this._dim.height = size.height;

		this._redraw();

		if(!restoreMode) {
			this._backupData = null;
		}
	}

	/**
	 * Get crop bounding box.
	 * 
	 * @param {Number} [scale=1] Recalculate all positions using scale constants, def. is 1
	 * @return {Array} [x1, y1, x2, y2] 2 points coordinates from top left corner
	 */
	getAABB(scale) {
		var nw = this._points["nw"];
		var se = this._points["se"];

		scale = scale || 1.0;

		return [
			Math.round(nw.x * scale),
			Math.round(nw.y * scale),
			Math.round(se.x * scale),
			Math.round(se.y * scale)
		];
	}
};

onix.factory("$anonymizer", [
	"$math",
	"$event",
	"$loader",
	"$promise",
	"$common",
	"$features",
function(
	$math,
	$event,
	$loader,
	$promise,
	$common,
	$features
) {
	/**
	 * Anonymizer - canvas for image preview with posibility for add geometries.
	 *
	 * @param {HTMLElement} parent Where is canvas appended
	 * @param {Object} [optsArg] Configuration
	 * @param {Number} [optsArg.canWidth] Canvas width
	 * @param {Number} [optsArg.canHeight] Canvas height
	 * @param {Number} [optsArg.zoom = 100] start zoom in [%]
	 * @param {Number} [optsArg.minZoom = 20] min zoom in [%]
	 * @param {Number} [optsArg.maxZoom = 100] max zoom in [%]
	 * @param {Number} [optsArg.zoomStep = 10] How many [%] add/dec with zoom change
	 * @param {Number} [optsArg.zoomMoveStep = 1] Under 100% multiplier for faster image movement
	 * @param {Object} [optsArg.curEntity = $anonymizer.ENTITES.CIRCLE] Start entity from $anonymizer.ENTITES
	 * @param {Number} [optsArg.showPreview = true] Show preview - image overview
	 * @param {Number} [optsArg.previewLeft = 17] Preview location from left top corner, axe x [px]
	 * @param {Number} [optsArg.previewTop = 17] Preview location from left top corner, axe y [px]
	 * @param {Number} [optsArg.previewWidth = 200] Preview image width [px]
	 * @param {HTMLElement} [optsArg.entityPreview = null] Create entity preview? Parent for append.
	 * @class $anonymizer
	 */
	class $anonymizer extends $event {
		constructor(parent, optsArg) {
			super();

			// is canvas available?
			if (!$features.CANVAS) {
				console.error("Canvas is not available!");
				return;
			}
			
			// parent reference
			this._parent = parent;
			this._parent.classList.add("anonymizer");

			this._opts = {
				canWidth: parent.offsetWidth || 0,
				canHeight: parent.offsetHeight || 0,
				zoom: 100,
				minZoom: 20,
				maxZoom: 100,
				zoomStep: 10,
				zoomMoveStep: 1,
				curEntity: $anonymizer.ENTITES.CIRCLE,
				showPreview: true,
				previewLeft: 17,
				previewTop: 17,
				previewWidth: 200,
				entityPreview: null
			};

			for (var key in optsArg) {
				this._opts[key] = optsArg[key];
			}

			// canvas width & height
			this._canWidth = this._opts.canWidth;
			this._canHeight = this._opts.canHeight;

			// zoom
			this._zoom = this._opts.zoom;
			// zoom step
			this._zoomStep = this._opts.zoomStep;
			// step for zoom move
			this._zoomMoveStep = 0;

			// act. image width
			this._curWidth = 0;
			// act. image height
			this._curHeight = 0;

			// create main canvas
			this._canvas = document.createElement("canvas");
			this._canvas.width = this._canWidth;
			this._canvas.height = this._canHeight;

			// ctx of main canvas
			this._ctx = this._canvas.getContext("2d");
			// loaded image
			this._img = null;

			// original image width
			this._imgWidth = 0;
			// original image height
			this._imgHeight = 0;

			// canvas & ctx for create line
			this._lineCanvas = null;
			this._lineCanvasCtx = null;

			// canvas & ctx for preview of a entity
			this._entityCanvas = null;
			this._entityCanvasCtx = null;

			// entites to draw
			this._entites = [];

			// image draw offset axe x
			this._x = 0;

			// image draw offset axe y
			this._y = 0;

			// threshold for click
			this._THRESHOLD = {
				MIN: -1,
				MAX: 1
			};

			// helper for mouse event
			this._mouse = {
				startXSave: 0,
				startYSave: 0,
				startX: 0,
				startY: 0,
				bcr: null
			};

			this._flags = {
				wasRightClick: false,
				wasMove: false,
				wasPreview: false,
				wasLine: false,
				wasImgMove: false
			};

			// binds
			this._binds = {
				mouseWheel: this._mouseWheel.bind(this),
				mouseDown: this._mouseDown.bind(this),
				mouseMove: this._mouseMove.bind(this),
				mouseUp: this._mouseUp.bind(this),
				mouseMoveLine: this._mouseMoveLine.bind(this),
				mouseUpLine: this._mouseUpLine.bind(this),
				contextMenu: this._cancelEvents.bind(this)
			};

			// firefox
			this._canvas.addEventListener("DOMMouseScroll", this._binds.mouseWheel);
			// others
			this._canvas.addEventListener("mousewheel", this._binds.mouseWheel);
			this._canvas.addEventListener("mousedown", this._binds.mouseDown);
			this._canvas.addEventListener("contextmenu", this._binds.contextMenu);

			// spinner - progress for image load
			this._spinner = $loader.getSpinner();
			parent.appendChild(this._spinner);
			parent.appendChild(this._canvas);

			// preview canvas
			if (this._opts.entityPreview) {
				this._entityCanvas = document.createElement("canvas");
				this._entityCanvas.width = 300;
				this._entityCanvas.height = 150;
				this._entityCanvasCtx = this._entityCanvas.getContext("2d");

				this._opts.entityPreview.appendChild(this._entityCanvas);
			}
		}

		/**
		 * Scene redraw - clear, picture, entites.
		 *
		 * @private
		 * @method _redraw
		 * @member $anonymizer
		 */
		_redraw() {
			// pictue
			this._ctx.clearRect(0, 0, this._canWidth, this._canHeight);
			this._ctx.drawImage(this._img, this._x, this._y, this._img.width, this._img.height, 0, 0, this._curWidth, this._curHeight);

			// entites
			if (this._entites.length) {
				let zc = this._zoom / 100;
				let xc = this._x * zc;
				let yc = this._y * zc;

				this._entites.forEach(entity => {
					let x;
					let y;

					switch (entity.id) {
						case $anonymizer.ENTITES.CIRCLE.id:
							let radius = Math.round(entity.value * zc);
							x = Math.round(this._curWidth * entity.xRatio - xc);
							y = Math.round(this._curHeight * entity.yRatio - yc);

							this._drawCircle(this._ctx, x, y, radius);
							break;

						case $anonymizer.ENTITES.LINE.id:
							let lineWidth = Math.round(entity.value * zc);
							x = Math.round(this._curWidth * entity.xRatio - xc);
							y = Math.round(this._curHeight * entity.yRatio - yc);
							let x2 = Math.round(this._curWidth * entity.x2Ratio - xc);
							let y2 = Math.round(this._curHeight * entity.y2Ratio - yc);

							this._drawLine(this._ctx, x, y, x2, y2, lineWidth);
							break;
					}
				});
			}

			// image preview
			this._drawPreview();
		}

		/**
		 * Draw white canvas.
		 * 
		 * @private
		 * @method _setWhiteCanvas
		 * @member $anonymizer
		 */
		_setWhiteCanvas() {
			this._ctx.clearRect(0, 0, this._canWidth, this._canHeight);
			this._drawFillRect(this._ctx, 0, 0, this._canWidth, this._canHeight, "#fff");
		}

		/**
		 * Draw a circle.
		 * 
		 * @param  {Canvas} ctx Canvas context
		 * @param  {Number} x Center coordinates axe x
		 * @param  {Number} y Center coordinates axe y
		 * @param  {Number} radius Circle radius
		 * @private
		 * @method _drawCircle
		 * @member $anonymizer
		 */
		_drawCircle(ctx, x, y, radius) {
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, 2*Math.PI);
			ctx.fillStyle = $anonymizer.ENTITES.CIRCLE.fillStyle;
			ctx.closePath();
			ctx.fill();
		}

		/**
		 * Draw a line.
		 * 
		 * @param  {Canvas} ctx Canvas context
		 * @param  {Number} x Line start coordinates axe x
		 * @param  {Number} y Line start coordinates axe y
		 * @param  {Number} x2 Line end coordinates axe x
		 * @param  {Number} y2 Line end coordinates axe y
		 * @param  {Number} lineWidth Line width [px]
		 * @private
		 * @method _drawLine
		 * @member $anonymizer
		 */
		_drawLine(ctx, x, y, x2, y2, lineWidth) {
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x2, y2);
			ctx.lineWidth = lineWidth;
			ctx.strokeStyle = $anonymizer.ENTITES.LINE.strokeStyle;
			ctx.closePath();
			ctx.stroke();
		}

		/**
		 * Draw a filled rectangle.
		 * 
		 * @param  {Canvas} ctx Canvas context
		 * @param  {Number} x Start coordinates axe x
		 * @param  {Number} y Start coordinates axe y
		 * @param  {Number} width Rectangle width
		 * @param  {Number} height Rectangle height
		 * @param  {String} fillStyle Fill style
		 * @private
		 * @method _drawFillRect
		 * @member $anonymizer
		 */
		_drawFillRect(ctx, x, y, width, height, fillStyle) {
			ctx.beginPath();
			ctx.fillStyle = fillStyle || "";
			ctx.fillRect(x, y, width, height);
			ctx.closePath();
		}

		/**
		 * Draw a rectangle, only border.
		 * 
		 * @param  {Canvas} ctx Canvas context
		 * @param  {Number} x Start coordinates axe x
		 * @param  {Number} y Start coordinates axe y
		 * @param  {Number} width Rectangle width
		 * @param  {Number} height Rectangle height
		 * @param  {String} strokeStyle Border style
		 * @param  {Number} lineWidth Border width
		 * @private
		 * @method _drawRect
		 * @member $anonymizer
		 */
		_drawRect(ctx, x, y, width, height, strokeStyle, lineWidth) {
			ctx.beginPath();
			ctx.rect(x, y, width, height);
			ctx.lineWidth = lineWidth || 1;
			ctx.strokeStyle = strokeStyle || "";
			ctx.closePath();
			ctx.stroke();
		}

		/**
		 * Draw a image preview.
		 *
		 * @private
		 * @method _drawPreview
		 * @member $anonymizer
		 */
		_drawPreview() {
			if (!this._opts.showPreview) return;

			let ratio = this._imgWidth / this._imgHeight;
			let height = Math.round(this._opts.previewWidth / ratio);

			// background
			this._drawFillRect(this._ctx, this._opts.previewLeft - 1, this._opts.previewTop - 1, this._opts.previewWidth + 2, height + 2, "rgba(255, 255, 255, 0.5)");

			// picture
			this._ctx.drawImage(this._img, 0, 0, this._img.width, this._img.height, this._opts.previewLeft, this._opts.previewTop, this._opts.previewWidth, height);

			// red border - current view
			let zc = this._zoom / 100;
			let xc = this._x * zc;
			let yc = this._y * zc;

			let xRatio = xc / this._curWidth;
			let yRatio = yc / this._curHeight;
			let x2Ratio = (xc + this._canWidth) / this._curWidth;
			let y2Ratio = (yc + this._canHeight) / this._curHeight;

			// restrictions
			xRatio = $math.setRange(xRatio, 0, 1);
			yRatio = $math.setRange(yRatio, 0, 1);
			x2Ratio = $math.setRange(x2Ratio, 0, 1);
			y2Ratio = $math.setRange(y2Ratio, 0, 1);

			let x1 = Math.round(this._opts.previewLeft + xRatio * this._opts.previewWidth);
			let y1 = Math.round(this._opts.previewTop + yRatio * height);
			let x2 = Math.round(this._opts.previewLeft + x2Ratio * this._opts.previewWidth);
			let y2 = Math.round(this._opts.previewTop + y2Ratio * height);

			// red border
			this._drawRect(this._ctx, x1, y1, x2 - x1, y2 - y1, "#C01", 1);
		}

		/**
		 * Draw a entity preview for circle/line.
		 *
		 * @private
		 * @method _drawEntityPreview
		 * @member $anonymizer
		 */
		_drawEntityPreview() {
			if (!this._opts.entityPreview) return;

			let width = this._entityCanvas.width;
			let height = this._entityCanvas.height;

			this._entityCanvasCtx.clearRect(0, 0, width, height);
			this._drawFillRect(this._entityCanvasCtx, 0, 0, width, height, "#f9f9f9");

			let curEnt = this._opts.curEntity;
			let zc = this._zoom / 100;

			switch (curEnt.id) {
				case $anonymizer.ENTITES.CIRCLE.id:
					let radius = Math.round(curEnt.value * zc);
					let x = Math.round(width / 2);
					let y = Math.round(height / 2);

					this._drawCircle(this._entityCanvasCtx, x, y, radius);
					break;

				case $anonymizer.ENTITES.LINE.id:
					let x1 = Math.round(width * 0.2);
					let y1 = Math.round(height / 2);
					let x2 = Math.round(width * 0.8);
					// y2 = y1
					let lineWidth = Math.round(curEnt.value * zc);

					this._drawLine(this._entityCanvasCtx, x1, y1, x2, y1, lineWidth);
					break;
			}
		}

		/**
		 * Get center point for zoom, otherwise is used point with mouse wheel and cursor position.
		 *
		 * @param {Number} [x] Coordinates on canvas axe x, otherwise is used center point on axe x
		 * @param {Number} [y] Coordinates on canvas axe y, otherwise is used center point on axe y
		 * @return {Object}
		 * @private
		 * @method _getFromPoint
		 * @member $anonymizer
		 */
		_getFromPoint(x, y) {
			let fromPoint = {
				x: x || Math.round(this._canWidth / 2),
				y: y || Math.round(this._canHeight / 2)
			};

			let zc = this._zoom / 100;
			let newX = Math.round(this._x * zc) + fromPoint.x;
			let newY = Math.round(this._y * zc) + fromPoint.y;

			fromPoint.xRatio = newX / this._curWidth;
			fromPoint.yRatio = newY / this._curHeight;

			return fromPoint;
		}

		/**
		 * Post zoom operation - new image dimenstions, new move zoom step.
		 * 
		 * @private
		 * @method _postZoom
		 * @member $anonymizer
		 */
		_postZoom() {
			var zc = this._zoom / 100;

			this._curWidth = Math.round(this._img.width * zc);
			this._curHeight = Math.round(this._img.height * zc);

			if (this._zoom < 100) {
				// function for zoom and mouse move
				this._zoomMoveStep = Math.max(((100 - this._zoom) / 10 * this._opts.zoomMoveStep) / 2, 1);
			}
		}

		/**
		 * Set image center on the canvas center.
		 *
		 * @private
		 * @method _setCenter
		 * @member $anonymizer
		 */
		_setCenter() {
			this._setPosition(0.5, 0.5);
		}
		
		/**
		 * Set image offset position.
		 * 
		 * @param {Number} xRatio <0;1> Point position on the image
		 * @param {Number} yRatio <0;1> Point position on the image
		 * @param {Number} [x] Screen offset, otherwise center [px], axe x
		 * @param {Number} [y] Screen offset, otherwise center [px], axe y
		 * @private
		 * @method _setPosition
		 * @member $anonymizer
		 */
		_setPosition(xRatio, yRatio, x, y) {
			x = x || this._canWidth / 2;
			y = y || this._canHeight / 2;

			xRatio = $math.setRange(xRatio, 0, 1);
			yRatio = $math.setRange(yRatio, 0, 1);

			let zc = this._zoom / 100;
			let xc = (this._curWidth * xRatio) - x;
			let yc = (this._curHeight * yRatio) - y;

			this._x = Math.max(Math.round(xc / zc), 0);
			this._y = Math.max(Math.round(yc / zc), 0);
		}

		/**
		 * Align image to the canvas - left top corner and bottom right corner.
		 *
		 * @private
		 * @method _alignImgToCanvas
		 * @member $anonymizer
		 */
		_alignImgToCanvas() {
			let maxX = Math.max(this._curWidth - this._canWidth, 0);
			let currX = Math.round(this._x * this._zoom / 100);

			if (this._x < 0) {
				this._x = 0;
			}
			else if (currX > maxX) {
				this._x = Math.round(maxX * 100 / this._zoom);
			}

			let maxY = Math.max(this._curHeight - this._canHeight, 0);
			let currY = Math.round(this._y * this._zoom / 100);

			if (this._y < 0) {
				this._y = 0;
			}
			else if (currY > maxY) {
				this._y = Math.round(maxY * 100 / this._zoom);
			}
		}

		/**
		 * It event contains right mouse click?
		 *
		 * @param {Event} e Mouse event
		 * @return {Boolean}
		 * @private
		 * @method _isRightClick
		 * @member $anonymizer
		 */
		_isRightClick(e) {
			if (e && ((e.which && e.which == 3) || (e.button && e.button == 2))) {
				return true;
			}
			else {
				return false;
			}
		}

		/**
		 * Cancel events.
		 * 
		 * @param  {Event} e Mouse event
		 * @private
		 * @method _cancelEvents
		 * @member $anonymizer
		 */
		_cancelEvents(e) {
			$common.cancelEvents(e);
		}

		/**
		 * Mouse wheel event.
		 *
		 * @param {Event} e Mouse event
		 * @private
		 * @method  _mouseWheel
		 * @member $anonymizer
		 */
		_mouseWheel(e) {
			if (!this._imgWidth && !this._imgHeight) return;

			let delta = e.wheelDelta || -e.detail;
			if (!delta) { return; }

			this._cancelEvents(e);
			this._setBCR();

			let data = this._getMouseXY(e);
			let fromPoint = this._getFromPoint(data.x, data.y);

			if (delta > 0) {
				this._setZoom(this._zoom + this._zoomStep, fromPoint);
			}
			else {
				this._setZoom(this._zoom - this._zoomStep, fromPoint);
			}
		}

		/**
		 * Get mouse coordinates.
		 * 
		 * @param  {Event} e
		 * @return {Object}
		 * @private
		 * @method _getMouseXY
		 * @member $anonymizer
		 */
		_getMouseXY(e) {
			return {
				x: e.clientX - this._mouse.bcr.left,
				y: e.clientY - this._mouse.bcr.top
			}
		}

		/**
		 * Set mouse bounding client rect from canvas el.
		 * 
		 * @private
		 * @method _setCBR
		 * @member $anonymizer
		 */
		_setBCR() {
			this._mouse.bcr = this._canvas.getBoundingClientRect();
		}

		/**
		 * Mouse down - create a circle, start of the line, start of move.
		 *
		 * @param {Event} e Mouse event
		 * @private
		 * @method _mouseDown
		 * @member $anonymizer
		 */
		_mouseDown(e) {
			if (!this._imgWidth && !this._imgHeight) return;

			this._cancelEvents(e);
			this._setBCR();

			let data = this._getMouseXY(e);

			this._mouse.startXSave = data.x;
			this._mouse.startYSave = data.y;
			this._mouse.startX = this._mouse.startXSave;
			this._mouse.startY = this._mouse.startYSave;

			this._flags.wasMove = false;
			this._flags.wasRightClick = this._isRightClick(e);

			// circle
			if (this._opts.curEntity == $anonymizer.ENTITES.CIRCLE) {
				this._flags.wasImgMove = false;
				this._flags.wasPreview = false;

				document.addEventListener("mousemove", this._binds.mouseMove);
				document.addEventListener("mouseup", this._binds.mouseUp);
			}
			// line
			else if (this._opts.curEntity == $anonymizer.ENTITES.LINE) {
				// add canvas
				let lineCanvas = document.createElement("canvas");
				lineCanvas.width = this._canWidth;
				lineCanvas.height = this._canHeight;
				lineCanvas.classList.add("line-canvas");

				this._flags.wasPreview = false;
				this._flags.wasLine = false;

				this._lineCanvas = lineCanvas;
				this._lineCanvas.addEventListener("contextmenu", this._binds.contextMenu);

				document.addEventListener("mousemove", this._binds.mouseMoveLine);
				document.addEventListener("mouseup", this._binds.mouseUpLine);

				if (this._flags.wasRightClick) {
					this._lineCanvas.classList.add("is-dragged");
				}

				this._lineCanvasCtx = this._lineCanvas.getContext("2d");

				this._parent.appendChild(lineCanvas);
			}
		}

		/**
		 * Image move - according to the coordinates of the mouse.
		 * 
		 * @param  {Number} newX New value on the axe x
		 * @param  {Number} newY New value on the axe y
		 * @private
		 * @method _imgMove
		 * @member $anonymizer
		 */
		_imgMove(newX, newY) {
			let diffX = this._mouse.startX - newX;
			let diffY = this._mouse.startY - newY;

			if (diffX == 0 && diffY == 0) {
				return;
			}

			// image movement constant
			let zms = this._zoomMoveStep > 0 ? this._zoomMoveStep : 1;

			// move image to the new coordinates
			this._x = diffX * zms + this._x;
			this._y = diffY * zms + this._y;

			this._alignImgToCanvas();

			this._redraw();
		}

		/**
		 * Mouse move over the canvas.
		 *
		 * @param {Event} e Mouse event
		 * @private
		 * @method _mouseMove
		 * @member $anonymizer
		 */
		_mouseMove(e) {
			let data = this._getMouseXY(e);

			// mouse cursor
			if (!this._flags.wasMove) {
				this._canvas.classList.add("is-dragged");
			}

			// mouse move flag
			this._flags.wasMove = true;

			// mouse move over the preview?
			let isPreview = this._isPreview(data.x, data.y);

			if (!this._flags.wasRightClick && !this._flags.wasImgMove && isPreview) {
				// set preview flag
				this._flags.wasPreview = true;

				// image move over the preview
				this._setPosition(isPreview.xRatio, isPreview.yRatio);

				this._alignImgToCanvas();

				this._redraw();
			}
			else if (!this._flags.wasPreview) {
				// image move - flag
				this._flags.wasImgMove = true;

				// image move
				this._imgMove(data.x, data.y);
			}

			// save
			this._mouse.startX = data.x;
			this._mouse.startY = data.y;
		}

		/**
		 * Is there a preview on coordinates x, y?
		 * 
		 * @param  {Number} x Click position on canvas, axe x
		 * @param  {Number} y Click position on canvas, axe y
		 * @return {Object} Object with percent ration or null
		 * @private
		 * @method _isPreview
		 * @member $anonymizer
		 */
		_isPreview(x, y) {
			if (!this._opts.showPreview) return null;

			let ratio = this._imgWidth / this._imgHeight;

			// sirka a vyska nahledu
			let width = this._opts.previewWidth;
			let height = Math.round(this._opts.previewWidth / ratio);

			let left = this._opts.previewLeft;
			let top = this._opts.previewTop;
			let zc = this._zoom / 100;

			x = x || 0;
			y = y || 0;

			if (x >= left && x <= left + width && y >= top && y <= top + height) {
				return {
					xRatio: (x - left) / width,
					yRatio: (y - top) / height
				};
			}
			else {
				return null;
			}
		}

		/**
		 * Mouse up - draw a circle, end of move, preview click.
		 *
		 * @param {Event} e Mouse event
		 * @private
		 * @method _mouseUp
		 * @member $anonymizer
		 */
		_mouseUp(e) {
			let data = this._getMouseXY(e);
			let thresholdTest = false;

			// only it was move
			if (this._flags.wasMove) {
				// difference towards start click
				let diffX = this._mouse.startXSave - data.x;
				let diffY = this._mouse.startYSave - data.y;

				if (diffX >= this._THRESHOLD.MIN && diffX <= this._THRESHOLD.MAX && diffY >= this._THRESHOLD.MIN && diffY <= this._THRESHOLD.MAX) {
					// we are in the range
					thresholdTest = true;
				}
			}

			// click - there was no move, threshold test, it is disabled for right mouse click
			if (!this._flags.wasRightClick && (!this._flags.wasMove || thresholdTest)) {
				let isPreview = this._isPreview(data.x, data.y);

				if (isPreview) {
					// preview click - click coordinates on the canvas center
					this._setPosition(isPreview.xRatio, isPreview.yRatio);
					this._alignImgToCanvas();
					this._redraw();
				}
				else {
					// add circle
					let zc = this._zoom / 100;
					let x = Math.round(this._x * zc) + data.x;
					let y = Math.round(this._y * zc) + data.y;

					this._entites.push({
						id: this._opts.curEntity.id,
						value: this._opts.curEntity.value,
						xRatio: x / this._curWidth,
						yRatio: y / this._curHeight
					});

					this._redraw();
				}
			}

			this._canvas.classList.remove("is-dragged");

			document.removeEventListener("mousemove", this._binds.mouseMove);
			document.removeEventListener("mouseup", this._binds.mouseUp);
		}

		/**
		 * Mouse move over canvas - line draw.
		 *
		 * @param {Event} e Mouse event
		 * @private
		 * @method _mouseMoveLine
		 * @member $anonymizer
		 */
		_mouseMoveLine(e) {
			let data = this._getMouseXY(e);

			// mouse move
			this._flags.wasMove = true;

			// right mouse click
			if (this._flags.wasRightClick) {
				// image move
				this._imgMove(data.x, data.y);

				// save
				this._mouse.startX = data.x;
				this._mouse.startY = data.y;
			}
			// left mouse click
			else {
				let isPreview = this._isPreview(data.x, data.y);
				let wasPreview = this._flags.wasPreview;

				if (!this._flags.wasLine && isPreview) {
					this._flags.wasPreview = true;

					// move over preview
					this._setPosition(isPreview.xRatio, isPreview.yRatio);

					this._alignImgToCanvas();

					this._redraw();
				}
				else if (!this._flags.wasPreview) {
					this._flags.wasLine = true;

					// line width
					let lineWidth = Math.round(this._opts.curEntity.value * this._zoom / 100);

					// clear
					this._lineCanvasCtx.clearRect(0, 0, this._canWidth, this._canHeight);

					// draw a line
					this._drawLine(this._lineCanvasCtx, this._mouse.startX, this._mouse.startY, data.x, data.y, lineWidth);
				}

				// change of state
				if (!wasPreview && this._flags.wasPreview) {
					this._lineCanvas.classList.add("is-dragged");
				}
			}
		}

		/**
		 * End of move over canvas - create line, image move.
		 * Draw a line in main canvas.
		 *
		 * @param {Event} e Mouse event
		 * @private
		 * @method _mouseUpLine
		 * @member $anonymizer
		 */
		_mouseUpLine(e) {
			let data = this._getMouseXY(e);
			let isPreview = null;

			if (!this._flags.wasMove) {
				isPreview = this._isPreview(data.x, data.y);
			}

			// only for left mouse click
			if (!this._flags.wasRightClick) {
				if (isPreview) {
					// preview click - click coordinates on the canvas center
					this._setPosition(isPreview.xRatio, isPreview.yRatio);

					this._alignImgToCanvas();

					this._redraw();
				}
				else if (this._flags.wasLine) {
					// create a line
					let zc = this._zoom / 100;
					let xc = Math.round(this._x * zc);
					let yc = Math.round(this._y * zc);

					let x = xc + this._mouse.startX;
					let y = yc + this._mouse.startY;
					let x2 = xc + data.x;
					let y2 = yc + data.y;

					this._entites.push({
						id: this._opts.curEntity.id,
						value: this._opts.curEntity.value,
						xRatio: x / this._curWidth,
						yRatio: y / this._curHeight,
						x2Ratio: x2 / this._curWidth,
						y2Ratio: y2 / this._curHeight
					});

					this._redraw();
				}
			}

			this._lineCanvas.classList.remove("is-dragged");
			this._lineCanvas.removeEventListener("contextmenu", this._binds.contextMenu);

			document.removeEventListener("mousemove", this._binds.mouseMoveLine);
			document.removeEventListener("mouseup", this._binds.mouseUpLine);

			this._parent.removeChild(this._lineCanvas);

			this._lineCanvas = null;
		}

		/**
		 * Set new value for zoom.
		 * 
		 * @param  {Number} value New value
		 * @param  {Object} [fromPoint] Center of the screen or data from mouse wheel
		 * @private
		 * @method _setZoom
		 * @member $anonymizer
		 */
		_setZoom(value, fromPoint) {
			fromPoint = fromPoint || this._getFromPoint();

			var oldZoom = this._zoom;
			var newZoom = $math.setRange(value, this._opts.minZoom, this._opts.maxZoom);

			if (newZoom == oldZoom) return;

			this._zoom = newZoom;

			this.trigger("zoom", this._zoom);

			this._postZoom();
			this._setPosition(fromPoint.xRatio, fromPoint.yRatio, fromPoint.x, fromPoint.y);
			this._alignImgToCanvas();
			this._drawEntityPreview();
			this._redraw();
		}

		/**
		 * Load and show image in canvas. Returns promise after load.
		 * 
		 * @param  {String} url Path to image
		 * @return {$promise} Promise
		 * @method loadImage
		 * @member $anonymizer
		 */
		loadImage(url) {
			return new $promise((resolve, reject) => {
				this._setWhiteCanvas();

				this._spinner.classList.remove("hide");

				var img = new Image();

				img.addEventListener("load", () => {
					this._spinner.classList.add("hide");
					this._img = img;
					this._imgWidth = img.width;
					this._imgHeight = img.height;
					this._zoom = this._opts.zoom;

					this.trigger("zoom", this._zoom);

					this._postZoom();
					this._setCenter();
					this._alignImgToCanvas();
					this._drawEntityPreview();
					this._redraw();

					resolve();
				});

				img.addEventListener("error", () => {
					this._spinner.classList.add("hide");

					this._img = null;
					this._imgWidth = 0;
					this._imgHeight = 0;

					reject();
				});

				img.src = url || "";
			});
		}

		/**
		 * Increase zoom by one step, fires signal "zoom".
		 * 
		 * @member $anonymizer
		 * @method zoomPlus
		 */
		zoomPlus() {
			this._setZoom(this._zoom + this._zoomStep);
		}

		/**
		 * Decrease zoom by one step, fires signal "zoom".
		 * 
		 * @member $anonymizer
		 * @method zoomMinus
		 */
		zoomMinus() {
			this._setZoom(this._zoom - this._zoomStep);
		}

		/**
		 * Set new value for zoom.
		 * 
		 * @param  {Number} value New value
		 * @member $anonymizer
		 * @method setZoom
		 */
		setZoom(value) {
			this._setZoom(value);
		}

		/**
		 * Get current draw entity ID.
		 * 
		 * @return {String}
		 * @member $anonymizer
		 * @method getEntityId
		 */
		getEntityId() {
			return this._opts.curEntity.id;
		}

		/**
		 * Switch to other entity, uses priority.
		 *
		 * @member $anonymizer
		 * @method switchEntity
		 */
		switchEntity() {
			let variants = Object.keys($anonymizer.ENTITES);
			let priority = this._opts.curEntity.priority;
			let selVariant = null;
			let lowestVariant = null;

			variants.forEach(variant => {
				let varObj = $anonymizer.ENTITES[variant];

				if (!selVariant && varObj.priority > this._opts.curEntity.priority) {
					selVariant = varObj;
				}

				if (!lowestVariant || varObj.priority < lowestVariant.priority) {
					lowestVariant = varObj;
				}
			});

			if (!selVariant) {
				selVariant = lowestVariant;
			}

			this._opts.curEntity = selVariant;

			this._drawEntityPreview();
		}

		/**
		 * Get current entity object.
		 * 
		 * @return {Object}
		 * @member $anonymizer
		 * @method getEntity
		 */
		getEntity() {
			return this._opts.curEntity;
		}

		/**
		 * Set value for current entity.
		 * 
		 * @param {Number} val New value
		 * @return {Boolean} If there was an error -> it returns false
		 * @member $anonymizer
		 * @method setEntityValue
		 */
		setEntityValue(val) {
			val = val || 0;

			if (val >= this._opts.curEntity.min && val <= this._opts.curEntity.max) {
				this._opts.curEntity.value = val;

				this._drawEntityPreview();

				return true;
			}
			else {
				return false;
			}
		}

		/**
		 * Set circle as a selected entity.
		 *
		 * @member $anonymizer
		 * @method setCircleEntity
		 */
		setCircleEntity() {
			this._opts.curEntity = $anonymizer.ENTITES.CIRCLE;

			this._drawEntityPreview();
		}

		/**
		 * Set line as a selected entity.
		 *
		 * @member $anonymizer
		 * @method setLineEntity
		 */
		setLineEntity() {
			this._opts.curEntity = $anonymizer.ENTITES.LINE;

			this._drawEntityPreview();
		}

		/**
		 * Take last entity and redraw a scene.
		 * 
		 * @member $anonymizer
		 * @method stepBack
		 */
		stepBack() {
			if (!this._imgWidth && !this._imgHeight) return;
			
			this._entites.pop();

			this._redraw();
		}

		/**
		 * Remove all entites and redraw a scene.
		 * 
		 * @member $anonymizer
		 * @method removeAll
		 */
		removeAll() {
			if (!this._imgWidth && !this._imgHeight) return;

			this._entites = [];

			this._redraw();
		}

		/**
		 * Export all entites on the screen and count them towards original image size.
		 * 
		 * @return {Object}
		 * @member $anonymizer
		 * @method exportEntites
		 */
		exportEntites() {
			let output = {
				actions: [],
				image: {
					width: this._imgWidth,
					height: this._imgHeight
				}
			};

			this._entites.forEach(entity => {
				switch (entity.id) {
					case $anonymizer.ENTITES.CIRCLE.id:
						output.actions.push({
							type: entity.id.toLowerCase(),
							x: $math.setRange(Math.round(this._imgWidth * entity.xRatio), 0, this._imgWidth),
							y: $math.setRange(Math.round(this._imgHeight * entity.yRatio), 0, this._imgHeight),
							r: entity.value
						});
						break;

					case $anonymizer.ENTITES.LINE.id:
						output.actions.push({
							type: entity.id.toLowerCase(),
							x1: $math.setRange(Math.round(this._imgWidth * entity.xRatio), 0, this._imgWidth),
							y1: $math.setRange(Math.round(this._imgHeight * entity.yRatio), 0, this._imgHeight),
							x2: $math.setRange(Math.round(this._imgWidth * entity.x2Ratio), 0, this._imgWidth),
							y2: $math.setRange(Math.round(this._imgHeight * entity.y2Ratio), 0, this._imgHeight),
							width: entity.value
						});
						break;
				}
			});

			return output;
		}

		/**
		 * Resize canvas with new width and height.
		 * 
		 * @param  {Number} [width] New width in [px]
		 * @param  {Number} [height] New height in [px]
		 * @member $anonymizer
		 * @method syncPort
		 */
		syncPort(width, height) {
			width = width || this._parent.offsetWidth;
			height = height || this._parent.offsetHeight;

			this._canWidth = width;
			this._canHeight = height;

			this._canvas.width = width;
			this._canvas.height = height;

			if (this._img) {
				this._postZoom();
				this._setCenter();
				this._alignImgToCanvas();
				this._drawEntityPreview();
				this._redraw();
			}
		}
	};

	/**
	 * List of entites.
	 * 
	 * @type {Object}
	 * @param {Object} CIRCLE Circle entity
	 * @param {Object} LINE Line entity
	 * @member $anonymizer
	 * @static
	 */
	$anonymizer.ENTITES = {
		CIRCLE: {
			min: 10,
			value: 50,
			max: 100,
			id: "CIRCLE",
			fillStyle: "rgba(0, 0, 255, 0.5)",
			priority: 1
		},
		LINE: {
			min: 10,
			value: 20,
			max: 100,
			id: "LINE",
			strokeStyle: "rgba(0, 255, 0, 0.5)",
			priority: 2
		}
	};

	return $anonymizer;
}]);

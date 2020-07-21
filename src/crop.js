
import { getDataFromImg } from "utils";

const ROTATE_STEP = 90;
const TYPES = {
	nw: "NW",
	ne: "NE",
	sw: "SW",
	se: "SE",
	area: "AREA"
};

/**
 * Signaly:
 * @crop-rotate nad window, detail obsahuje angle
 */
export default class Crop {
	constructor(optionsArg) {
		this._options = Object.assign({
			img: null,
			exif: null,
			previewCanvas: null,
			width: 600,
			height: 450,
			minWidth: 50,
			minHeight: 50,
			background: "#fff",
			overlay: "rgba(255,255,255,.5)",
			color: "#29ac07",
			lineWidth: 2,
			padding: 5,
			pointWidth: 10, // [px]
			ratio: 1
		}, optionsArg);
		this._imgData = getDataFromImg(this._options.img);
		this._angle = this._imgData.angle;
		this._dom = {
			canvas: null,
			canvasImage: null,
			cover: null
		};
		this._ctxs = {
			canvas: null,
			canvasImage: null,
			canvasPreview: this._options.previewCanvas ? this._options.previewCanvas.getContext("2d") : null
		};
		this._pointsData = this._getPointsData();
		this._mousePos = {
			x: 0,
			y: 0
		};
		this._selected = null;
		this._cursor = "";
		this._savedData = {
			aabb: null,
			angle: 0
		};

		// init
		this._build();
		this._fitSize();
		this._saveData();
		this._redraw(true);
		this.setPreview();
	}

	/**
	 * Destroy cropu.
	 */
	destroy() {
		this._dom.cover.remove();
		this._dom.cover.removeEventListener("pointerdown", this);
		this._removeCursor();
	}

	/**
	 * Ulozeni zmen.
	 */
	save() {
		this._saveData();
		this.setPreview();
	}

	/**
	 * Zruseni zmen. Prekresleni canvasu.
	 */
	cancel() {
		this._setAngle(this._savedData.angle);
		this.loadAABB(this._savedData.aabb);
		this.setPreview();
		this._removeCursor();
	}

	/**
	 * Vykresleni preview canvasu.
	 */
	setPreview() {
		if (!this._options.previewCanvas) return;
		
		let p = this._pointsData.obj;
		let padding = this._options.padding;
		let x1 = p.nw.x - padding;
		let y1 = p.nw.y - padding;
		let w = p.ne.x - p.nw.x - padding;
		let h = p.sw.y - p.nw.y - padding;
		let cw = this._dom.canvas.width - padding;
		let ch = this._dom.canvas.height - padding;
		// image
		let ix1 = x1 / cw * this._imgData.canvas.width;
		let iy1 = y1 / ch * this._imgData.canvas.height;
		let iw = w / cw * this._imgData.canvas.width;
		let ih = h / ch * this._imgData.canvas.height;
		// vykreslime obrazek
		this._ctxs.canvasPreview.clearRect(0, 0, this._options.previewCanvas.width, this._options.previewCanvas.height);
		this._ctxs.canvasPreview.drawImage(this._imgData.canvas, ix1, iy1, iw, ih, 0, 0, this._options.previewCanvas.width, this._options.previewCanvas.height);
	}

	/**
	 * Rotace o 90 stupnu doprava.
	 */
	rotate() {
		this._setAngle(this._angle + ROTATE_STEP);
		let event = new CustomEvent('crop-rotate', {
			detail: {
				angle: this._angle
			}
		});
		window.dispatchEvent(event);
	}

	/**
	 * Nacteni AABB suradnice.
	 */
	loadAABB(aabb) {
		// pouze kladne cisla
		for (let i = 0, max = aabb.length; i < max; i++) {
			aabb[i] = Math.max(0, aabb[i]);
		}

		// nastavime aabb
		let x = this._options.padding + aabb[0];
		let y = this._options.padding + aabb[1];
		let w = Math.max(x + aabb[2] - aabb[0], this._options.minWidth);
		let h = Math.max(y + aabb[3] - aabb[1], this._options.minHeight);
		// omezeni
		if (x + w >= this._dom.canvas.width - 2 * this._options.padding) {
			w = this._dom.canvas.width - this._options.padding - x;
		}

		if (y + h >= this._dom.canvas.height - 2 * this._options.padding) {
			h = this._dom.canvas.height - this._options.padding - y;
		}
		
		// nastaveni
		this._pointsData.obj.nw.x = x;
		this._pointsData.obj.nw.y = y;
		this._pointsData.obj.ne.x = this._pointsData.obj.nw.x + w;
		this._pointsData.obj.ne.y = this._pointsData.obj.nw.y;
		this._pointsData.obj.sw.x = this._pointsData.obj.nw.x;
		this._pointsData.obj.sw.y = this._pointsData.obj.nw.y + h;
		this._pointsData.obj.se.x = this._pointsData.obj.ne.x;
		this._pointsData.obj.se.y = this._pointsData.obj.sw.y;
		// prekreslime
		this._redraw();
		this._saveData();
	}

	/**
	 * Get crop bounding box.
	 * 
	 * @param {Number} [scale] Recalculate all positions using scale constants
	 * @return {Array} [x1, y1, x2, y2] 2 points coordinates from top left corner
	 */
	getAABB(scale) {
		if (typeof scale === "undefined") {
			scale = this._imgData.canvas.width / (this._dom.canvas.width - 2 * this._options.padding);
		}

		let nw = this._pointsData.obj.nw;
		let se = this._pointsData.obj.se;

		return [
			Math.round((nw.x - this._options.padding) * scale),
			Math.round((nw.y - this._options.padding) * scale),
			Math.round((se.x - this._options.padding) * scale),
			Math.round((se.y - this._options.padding) * scale)
		];
	}

	get container() {
		return this._dom.cover;
	}

	get changed() {
		let curAABB = this.getAABB();
		let savedAABB = this._savedData.aabb;

		return (curAABB[0] != savedAABB[0] || curAABB[1] != savedAABB[1] || curAABB[2] != savedAABB[2] || curAABB[3] != savedAABB[3]);
	}

	handleEvent(e) {
		switch (e.type) {
			case "pointerdown":
				this._down(e);
				break;
			case "pointermove":
				this._move(e);
				break;
			case "pointerup":
				this._up(e);
				break;
		}
	}

	_build() {
		this._dom.cover = document.createElement("div");
		this._dom.cover.classList.add("crop-cover");
		this._dom.canvas = document.createElement("canvas");
		this._dom.canvas.classList.add("canvas-edit");
		this._dom.canvasImage = document.createElement("canvas");
		this._dom.canvasImage.classList.add("canvas-image");
		this._dom.cover.appendChild(this._dom.canvasImage);
		this._dom.cover.appendChild(this._dom.canvas);
		// ctx
		this._ctxs.canvas = this._dom.canvas.getContext("2d");
		this._ctxs.canvasImage = this._dom.canvasImage.getContext("2d");
		// eventy
		this._dom.cover.addEventListener("pointerdown", this);
		this._dom.cover.addEventListener("pointermove", e => {
			this._moveCursor(e);
		});
	}

	_redraw(full) {
		// drawing
		let padding = this._options.padding;
		let cw = this._dom.canvas.width - 2 * padding;
		let ch = this._dom.canvas.height - 2 * padding;

		if (full) {
			// obrazek
			this._ctxs.canvasImage.clearRect(0, 0, this._dom.canvas.width, this._dom.canvas.height);
			this._ctxs.canvasImage.drawImage(this._imgData.canvas, 0, 0, this._imgData.canvas.width, this._imgData.canvas.height, padding, padding, cw, ch);
		}

		// vykresleni prekryvu
		this._ctxs.canvas.clearRect(0, 0, this._dom.canvas.width, this._dom.canvas.height);
		this._ctxs.canvas.fillStyle = this._options.overlay;
		this._ctxs.canvas.fillRect(padding, padding, cw, ch);
		// vykresleni obrazku do prekryvu
		let p = this._pointsData.obj;
		let halfPointWidth = this._options.pointWidth / 2;
		let halfLineWidth = this._options.lineWidth / 2;
		let width = p.ne.x - p.nw.x;
		let height = p.sw.y - p.nw.y;
		// dira
		this._ctxs.canvas.clearRect(p.nw.x, p.nw.y, width, height);
		// vykresleni car
		this._ctxs.canvas.fillStyle = this._options.color;
		// vykresleni bodu
		this._pointsData.array.forEach(i => {
			this._ctxs.canvas.fillRect(i.x - halfPointWidth, i.y - halfPointWidth, this._options.pointWidth, this._options.pointWidth);
		});
		this._ctxs.canvas.fillRect(p.nw.x, p.nw.y - halfLineWidth, width, this._options.lineWidth);
		this._ctxs.canvas.fillRect(p.sw.x, p.sw.y - halfLineWidth, width, this._options.lineWidth);
		this._ctxs.canvas.fillRect(p.nw.x - halfLineWidth, p.nw.y, this._options.lineWidth, height);
		this._ctxs.canvas.fillRect(p.ne.x - halfLineWidth, p.ne.y, this._options.lineWidth, height);
	}

	_fitSize() {
		// zdroj pro sirku a vysku
		let padding2x = this._options.padding * 2;
		let width = this._imgData.isPortrait ? this._options.height : this._options.width;
		let height = this._imgData.isPortrait ? this._options.width : this._options.height;
		// nastavime canvasy
		this._dom.canvas.width = width + padding2x;
		this._dom.canvas.height = height + padding2x;
		this._dom.canvasImage.width = this._dom.canvas.width;
		this._dom.canvasImage.height = this._dom.canvas.height;
		// rozmery
		let cropWidth = width;
		let cropHeight = Math.floor(width / this._options.ratio);
		
		if (cropHeight > this._dom.canvas.height - padding2x) {
			cropHeight = this._dom.canvas.height - padding2x;
			cropWidth = Math.floor(cropHeight * this._options.ratio);
		}

		let paddingLeft =  Math.floor((width - cropWidth) / 2);
		let paddingTop =  Math.floor((height - cropHeight) / 2);
		// nastaveni bodu
		this._pointsData.obj.nw.x = this._options.padding + paddingLeft;
		this._pointsData.obj.nw.y = this._options.padding + paddingTop;
		this._pointsData.obj.ne.x = this._pointsData.obj.nw.x + cropWidth;
		this._pointsData.obj.ne.y = this._pointsData.obj.nw.y;
		this._pointsData.obj.sw.x = this._pointsData.obj.nw.x;
		this._pointsData.obj.sw.y = this._pointsData.obj.nw.y + cropHeight;
		this._pointsData.obj.se.x = this._pointsData.obj.ne.x;
		this._pointsData.obj.se.y = this._pointsData.obj.sw.y;
	}

	_down(e) {
		this._selected = this._getItemOnPos(e.layerX, e.layerY);

		if (this._selected) {
			this._mousePos.x = Math.floor(e.clientX);
			this._mousePos.y = Math.floor(e.clientY);
	
			document.body.addEventListener("pointermove", this);
			document.body.addEventListener("pointerup", this);
		}
	}

	_move(e) {
		let x = Math.floor(e.clientX);
		let y = Math.floor(e.clientY);
		let diffX = x - this._mousePos.x;
		let diffY = y - this._mousePos.y;
		
		if (!diffX && !diffY) return;

		if (this._applyDiff(diffX, diffY)) {
			this._redraw();
		}

		this._mousePos.x = x;
		this._mousePos.y = y;
	}

	_up(e) {
		this._selected = null;
		document.body.removeEventListener("pointermove", this);
		document.body.removeEventListener("pointerup", this);
	}

	_moveCursor(e) {
		if (this._selected) return;

		let item = this._getItemOnPos(e.layerX, e.layerY);
		let newCursor = "";

		if (item) {
			switch (item.type) {
				case TYPES.area:
					newCursor = "type-area";
					break;
				case TYPES.nw:
					newCursor = "type-nw";
					break;
				case TYPES.ne:
					newCursor = "type-ne";
					break;
				case TYPES.sw:
					newCursor = "type-sw";
					break;
				case TYPES.se:
					newCursor = "type-se";
					break;
			}
		}

		if (newCursor != this._cursor) {
			this._removeCursor();
			this._cursor = newCursor;

			if (this._cursor) {
				this._dom.canvas.classList.add(this._cursor);
			}
		}
	}

	_getItemOnPos(x, y) {
		// prvni test na body
		// pak test na prostredek
		let halfPointWidth = this._options.pointWidth / 2;
		let p = this._pointsData.obj;
		// test body
		for (let point of this._pointsData.array) {
			let px = point.x - halfPointWidth;
			let py = point.y - halfPointWidth;
			let px2 = point.x + halfPointWidth;
			let py2 = point.y + halfPointWidth;

			if (x >= px && x <= px2 && y >= py && y <= py2) {
				return point;
			}
		}

		if (x >= p.nw.x && x <= p.ne.x && y >= p.nw.y && y <= p.sw.y) {
			return {
				type: TYPES.area
			};
		}
		else return null;
	}

	_getPointsData() {
		let nw = {
			type: TYPES.nw,
			x: 0,
			y: 0,
			// spolecny bod - stejne x
			adjacentX: null,
			// spolecny bod - stejne y
			adjacentY: null
		};
		let ne = {
			type: TYPES.ne,
			x: 0,
			y: 0,
			adjacentX: null,
			adjacentY: null
		};
		let se = {
			type: TYPES.se,
			x: 0,
			y: 0,
			adjacentX: null,
			adjacentY: null
		};
		let sw = {
			type: TYPES.sw,
			x: 0,
			y: 0,
			adjacentX: null,
			adjacentY: null
		};
		// spolecne body
		nw.adjacentX = sw;
		nw.adjacentY = ne;
		ne.adjacentX = se;
		ne.adjacentY = nw;
		se.adjacentX = ne;
		se.adjacentY = sw;
		sw.adjacentX = nw;
		sw.adjacentY = se;

		return {
			array: [nw, ne, se, sw],
			obj: { nw, ne, se, sw }
		};
	}

	_applyDiff(diffX, diffY) {
		let p = this._pointsData.obj;
		let padding = this._options.padding;

		if (this._selected.type == TYPES.area) {
			// x test
			let xTest1 = p.nw.x + diffX;
			let xTest2 = p.ne.x + diffX;
			let applyX = xTest1 >= padding && xTest2 <= this._dom.canvas.width - padding;
			// y test
			let yTest1 = p.nw.y + diffY;
			let yTest2 = p.sw.y + diffY;
			let applyY = yTest1 >= padding && yTest2 <= this._dom.canvas.height - padding;

			for (let point of this._pointsData.array) {
				if (applyX) {
					point.x += diffX;
				}
				if (applyY) {
					point.y += diffY;
				}
			}

			return true;
		}
		else {
			// rohove body
			// spocitame y podle pomeru
			diffY = diffX / this._options.ratio * (this._selected.type == TYPES.nw || this._selected.type == TYPES.se ? 1 : -1);
			// nove souradnice pro x a y tahaneho bodu + okolnich bodu
			let newX1 = this._selected.x + diffX;
			let newY1 = this._selected.y + diffY;
			let newX2 = this._selected.adjacentX.x + diffX;
			let newY2 = this._selected.adjacentY.y + diffY;
			let xTest = newX1 >= padding && newX1 <= this._dom.canvas.width - padding && newX2 >= padding && newX2 <= this._dom.canvas.width - padding;
			let yTest = newY1 >= padding && newY1 <= this._dom.canvas.height - padding && newY2 >= padding && newY2 <= this._dom.canvas.height - padding;
			let width = (this._selected.type == TYPES.nw || this._selected.type == TYPES.sw) ? p.ne.x - newX1 : newX1 - p.nw.x;
			let height = (this._selected.type == TYPES.nw || this._selected.type == TYPES.ne) ? p.sw.y - newY1 : newY1 - p.nw.y;
			
			if (xTest && yTest && width >= this._options.minWidth && height >= this._options.minHeight) {
				this._selected.x = newX1;
				this._selected.y = newY1;
				this._selected.adjacentX.x = newX2;
				this._selected.adjacentY.y = newY2;
				return true;
			}
			else return false;
		}
	}

	_setAngle(angle) {
		this._angle = angle;
		if (this._angle >= 360) this._angle = 0;
		this._imgData = getDataFromImg(this._options.img, {
			orientation: this._angle
		});
		this._fitSize();
		this._redraw(true);
	}

	_saveData() {
		this._savedData.aabb = this.getAABB();
		this._savedData.angle = this._angle;
	}

	_removeCursor() {
		if (this._cursor) {
			this._dom.canvas.classList.remove(this._cursor);
		}

		this._cursor = "";
	}
};

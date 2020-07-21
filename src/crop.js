
import { getDataFromImg } from "utils";

const ROTATE_STEP = 90;
const TYPES = {
	nw: "NW",
	ne: "NE",
	sw: "SW",
	se: "SE",
	area: "AREA"
};

// todo
// nahledy, signal pro otoceni vsech, ts prepsani, zelene cary pro spojeni, hotovo/zrusit tlacitko
// 2 canvas, jeden s fotkou na pozadi, pak se udela druhy canvas nad tim, ktery je pruhledny, ale pres clearRect se vyreze to co chceme videt
// cd \\wsl$\Ubuntu-20.04\home\roman\mnt\frasier.dev
// udelat kurzory

export default class Crop {
	constructor(optionsArg) {
		this._options = Object.assign({
			img: null,
			exif: null,
			canvasPreview: null,
			width: 600,
			height: 450,
			minWidth: 100,
			minHeight: 100,
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
			canvasImage: null
		};
		this._ctxPreview = this._options.canvasPreview;
		this._pointsData = this._getPointsData();
		this._mousePos = {
			x: 0,
			y: 0
		};
		this._selected = null;
		console.log(this);
		this._build();
	}

	destroy() {

	}

	setAngle(angle) {
		this._angle = angle;
		if (this._angle >= 360) this._angle = 0;
		this._imgData = getDataFromImg(this._options.img, {
			orientation: this._angle
		});
		this._fitSize();
		this._redraw(true);
	}

	handleEvent(e) {
		switch (e.type) {
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
		Object.assign(this._dom.cover.style, {
			margin: "0 auto",
			width: "1000px"
		});
		Object.assign(this._dom.cover.style, {
			position: "relative"
		});
		this._dom.canvas = document.createElement("canvas");
		this._dom.canvasImage = document.createElement("canvas");
		Object.assign(this._dom.canvas.style, {
			position: "absolute",
			left: 0,
			top: 0,
			right: 0,
			bottom: 0
		});
		this._dom.cover.addEventListener("pointerdown", e => {
			this._down(e);
		});
		this._dom.cover.appendChild(this._dom.canvasImage);
		this._dom.cover.appendChild(this._dom.canvas);
		this._ctxs.canvas = this._dom.canvas.getContext("2d");
		this._ctxs.canvasImage = this._dom.canvasImage.getContext("2d");
		document.body.appendChild(this._dom.cover);
		let rotateBtn = document.createElement("button");
		rotateBtn.textContent = "Rotate";
		rotateBtn.addEventListener("click", e => {
			this.setAngle(this._angle + ROTATE_STEP);
		});
		document.body.appendChild(rotateBtn);
		this._fitSize();
		this._redraw(true);
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
		let width = this._imgData.isPortrait ? this._options.height : this._options.width;
		let height = this._imgData.isPortrait ? this._options.width : this._options.height;
		this._dom.canvas.width = width + this._options.padding * 2;
		this._dom.canvas.height = height + this._options.padding * 2;
		this._dom.canvasImage.width = this._dom.canvas.width;
		this._dom.canvasImage.height = this._dom.canvas.height;
		// todo sirka a vyska podle 1x1 fix
		let cropWidth = width;
		let cropHeight = Math.floor(width / this._options.ratio);
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
			let applyX = xTest1 >= padding && xTest2 <= this._dom.canvas.width - this._options.padding;
			// y test
			let yTest1 = p.nw.y + diffY;
			let yTest2 = p.sw.y + diffY;
			let applyY = yTest1 >= padding && yTest2 <= this._dom.canvas.height - this._options.padding;

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
	}
};

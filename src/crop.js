
import { getDataFromImg } from "utils";

const ROTATE_STEP = 90;

// todo
// nahledy, signal pro otoceni vsech, ts prepsani, zelene cary pro spojeni, hotovo/zrusit tlacitko

export default class Crop {
	constructor(optionsArg) {
		this._options = Object.assign({
			img: null,
			exif: null,
			canvasPreview: null,
			width: 600,
			height: 450,
			overlay: "rgba(255,255,255,.5)",
			color: "#29ac07",
			lineWidth: 2,
			padding: 5,
			pointWidth: 10, // [px]
			ratio: 1
		}, optionsArg);
		this._imgData = getDataFromImg(this._options.img);
		this._angle = this._imgData.angle;
		this._ctx = null;
		this._ctxPreview = this._options.canvasPreview;
		this._canvas = null;
		this._pointsData = this._getPointsData();
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
		this._redraw();
	}

	_build() {
		this._canvas = document.createElement("canvas");
		this._canvas.addEventListener("pointerdown", e => {
			this._click(e);
		});
		this._ctx = this._canvas.getContext("2d");
		document.body.appendChild(this._canvas);
		let rotateBtn = document.createElement("button");
		rotateBtn.textContent = "Rotate";
		rotateBtn.addEventListener("click", e => {
			this.setAngle(this._angle + ROTATE_STEP);
		});
		document.body.appendChild(rotateBtn);
		this._fitSize();
		this._redraw();
	}

	_redraw() {
		// drawing
		let padding = this._options.padding;
		let cw = this._canvas.width - 2 * padding;
		let ch = this._canvas.height - 2 * padding;
		this._ctx.drawImage(this._imgData.canvas, 0, 0, this._imgData.canvas.width, this._imgData.canvas.height, padding, padding, cw, ch);
		// vykresleni prekryvu
		this._ctx.fillStyle = this._options.overlay;
		this._ctx.fillRect(padding, padding, cw, ch);
		// vykresleni obrazku do prekryvu
		let p = this._pointsData.obj;
		let halfPointWidth = this._options.pointWidth / 2;
		let halfLineWidth = this._options.lineWidth / 2;
		let width = p.ne.x - p.nw.x;
		let height = p.sw.y - p.nw.y;
		let ox = this._imgData.canvas.width * (p.nw.x - padding) / cw;
		let oy = this._imgData.canvas.height * (p.nw.y - padding) / ch;
		let ow = this._imgData.canvas.width * (width - padding) / cw;
		let oh = this._imgData.canvas.height * (height - padding) / ch;
		this._ctx.drawImage(this._imgData.canvas, ox, oy, ow, oh, p.nw.x, p.nw.y, width, height);
		// vykresleni car
		this._ctx.fillStyle = this._options.color;
		// vykresleni bodu
		this._pointsData.array.forEach(i => {
			this._ctx.fillRect(i.x - halfPointWidth, i.y - halfPointWidth, this._options.pointWidth, this._options.pointWidth);
		});
		this._ctx.fillRect(p.nw.x, p.nw.y - halfLineWidth, width, this._options.lineWidth);
		this._ctx.fillRect(p.sw.x, p.sw.y - halfLineWidth, width, this._options.lineWidth);
		this._ctx.fillRect(p.nw.x - halfLineWidth, p.nw.y, this._options.lineWidth, height);
		this._ctx.fillRect(p.ne.x - halfLineWidth, p.ne.y, this._options.lineWidth, height);
	}

	_fitSize() {
		let width = this._imgData.isPortrait ? this._options.height : this._options.width;
		let height = this._imgData.isPortrait ? this._options.width : this._options.height;
		this._canvas.width = width + this._options.padding * 2;
		this._canvas.height = height + this._options.padding * 2;

		// todo sirka a vyska podle 1x1 fix
		let cropWidth = width;
		let cropHeight = Math.floor(width / this._options.ratio);

		let paddingLeft =  Math.floor((width - cropWidth) / 2);
		let paddingTop =  Math.floor((height - cropHeight) / 2);

		this._pointsData.obj.nw.x = this._options.padding + paddingLeft;
		this._pointsData.obj.nw.y = this._options.padding + paddingTop;
		this._pointsData.obj.ne.x = this._pointsData.obj.nw.x + cropWidth;
		this._pointsData.obj.ne.y = this._pointsData.obj.nw.y;
		this._pointsData.obj.sw.x = this._pointsData.obj.nw.x;
		this._pointsData.obj.sw.y = this._pointsData.obj.nw.y + cropHeight;
		this._pointsData.obj.se.x = this._pointsData.obj.ne.x;
		this._pointsData.obj.se.y = this._pointsData.obj.sw.y;
	}

	_click(e) {
		console.log(e);
		// klik na bod
		// klik do prostoru fotku pro pohyb
	}

	_getPointsData() {
		let nw = {
			type: "NW",
			x: 0,
			y: 0,
			// spolecny bod - stejne x
			adjacentX: null,
			// spolecny bod - stejne y
			adjacentY: null
		};
		let ne = {
			type: "NE",
			x: 0,
			y: 0,
			adjacentX: null,
			adjacentY: null
		};
		let se = {
			type: "SE",
			x: 0,
			y: 0,
			adjacentX: null,
			adjacentY: null
		};
		let sw = {
			type: "SW",
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
		Object.assign

		return {
			array: [nw, ne, se, sw],
			obj: { nw, ne, se, sw }
		};
	}
};

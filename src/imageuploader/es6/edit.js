/**
* Editovatko fotografii
*/
class UploadEdit {
	constructor(owner, canvas, angle) {
		this._owner = owner;
		this._canvas = canvas;
		this._dom = {};
		this._dim = {
			width: 0,
			height: 0
		};
		this._rotateStep = 90; // o kolik stupnu otocit fotku
		this._startAngle = angle || 0;
		this._angle = 0;
		this._savedAngle = 0;
		this._ctx = null;
		this._savedCtx = null;
		this._crop = null;
		this._create();

		this._setImage();
	}
	
	destroy() {
		// hlavni container
		var c = this.getContainer();
		c.remove();

		this._dom.cancelBtn.removeEventListener("click", this, false);
		this._dom.doneBtn.removeEventListener("click", this, false);
		this._dom.rotateLeftBtn.removeEventListener("click", this, false);
		this._dom.rotateRightBtn.removeEventListener("click", this, false);
	}
	
	/**
	 * Vykresli a nastavi obrazek z dat konstruktoru.
	 */
	_setImage() {
		this._dim.width = this._canvas.width;
		this._dim.height = this._canvas.height;
		this._dom.editCanvas.width = this._canvas.width;
		this._dom.editCanvas.height = this._canvas.height;
		this._dom.canvasCover.style.width = this._canvas.width + "px";
		this._dom.canvasCover.style.height = this._canvas.height + "px";
		this._ctx.clearRect(0, 0, this._dom.editCanvas.width, this._dom.editCanvas.height);
		this._ctx.drawImage(this._canvas, 0, 0);
	}
	
	/**
	 * Ziskani celeho containeru se editaci fotky
	 * @return {HTMLElement}
	 */
	getContainer() {
		return this._dom.container;
	}
	
	/**
	 * Ziskani containeru, ktery obaluje canvas.
	 * @return {HTMLElement}
	 */
	getCanvasContainer() {
		return this._dom.canvasCover;
	}

	_removeCrop() {
		if(this._crop) {
			var cont = this._crop.getContainer();
			cont.remove();
			this._crop = null;
		}
	}
	
	/**
	 * Vytvoreni vsech prvku
	 */
	_create() {
		// editace
		var editCont = document.createElement("div");
		editCont.classList.add("edit-cont");
	
		this._dom.container = editCont;
	
		var canvasCover = document.createElement("div");
		canvasCover.classList.add("canvas-cover");
	
		this._dom.canvasCover = canvasCover;
	
		// canvas
		var editCanvas = document.createElement("canvas");
		canvasCover.appendChild(editCanvas);
	
		this._dom.editCanvas = editCanvas;
		this._dom.savedCanvas = document.createElement("canvas");
		this._ctx = editCanvas.getContext("2d");
		this._savedCtx = this._dom.savedCanvas.getContext("2d");
	
		editCont.appendChild(canvasCover);
	
		var buttonLine = document.createElement("div");
		buttonLine.classList.add("button-line");
		buttonLine.classList.add("first");
	
		// otoceni btn
		var rotateLeftBtn = document.createElement("button");
		rotateLeftBtn.setAttribute("type", "button");
		rotateLeftBtn.classList.add("rotate-left");
		rotateLeftBtn.addEventListener("click", this, false);

		var rotateRightBtn = document.createElement("button");
		rotateRightBtn.setAttribute("type", "button");
		rotateRightBtn.classList.add("rotate-right");
		rotateRightBtn.addEventListener("click", this, false);
	
		this._dom.rotateLeftBtn = rotateLeftBtn;
		this._dom.rotateRightBtn = rotateRightBtn;
	
		buttonLine.appendChild(rotateRightBtn);
		buttonLine.appendChild(rotateLeftBtn);
		editCont.appendChild(buttonLine);
	
		var buttonLine2 = document.createElement("div");
		buttonLine2.classList.add("button-line");
	
		// hotovo
		var doneBtn = document.createElement("button");
		doneBtn.setAttribute("type", "button");
		doneBtn.classList.add("done");
		doneBtn.innerHTML = _("imageUploader.done");
		doneBtn.addEventListener("click", this, false);
	
		this._dom.doneBtn = doneBtn;
	
		buttonLine2.appendChild(doneBtn);
	
		// zrusit
		var cancelBtn = document.createElement("button");
		cancelBtn.setAttribute("type", "button");
		cancelBtn.classList.add("cancel");
		cancelBtn.innerHTML = _("cancel");
		cancelBtn.addEventListener("click", this, false);
	
		this._dom.cancelBtn = cancelBtn;
	
		buttonLine2.appendChild(cancelBtn);
		
		editCont.appendChild(buttonLine2);
	}
	
	handleEvent(e) {
		var type = e ? e.type : "";
	
		if (type != "click") return;
	
		var target = e.target;
	
		if (target == this._dom.rotateLeftBtn) {
			this._rotate(-1);
		}
		else if (target == this._dom.rotateRightBtn) {
			this._rotate(1);
		}
		else if (target == this._dom.doneBtn) {
			if (this._angle != this._savedAngle) {
				this._owner.rotateDone(this._dom.editCanvas, this._crop);
			}

			this._owner.editDone(this._dom.editCanvas);
			this._removeCrop();
		}
		else if (target == this._dom.cancelBtn) {
			if (this._angle != this._savedAngle) {
				this._dom.editCanvas.width = this._dom.savedCanvas.width;
				this._dom.editCanvas.height = this._dom.savedCanvas.height;
				this._dom.canvasCover.style.width = this._dom.savedCanvas.width + "px";
				this._dom.canvasCover.style.height = this._dom.savedCanvas.height + "px";

				this._crop.setDim({
					areaWidth: this._dom.savedCanvas.width,
					areaHeight: this._dom.savedCanvas.height
				});
				
				this._ctx.drawImage(this._dom.savedCanvas, 0, 0, this._dom.savedCanvas.width, this._dom.savedCanvas.height);
			}

			this._crop.restore();
			this._angle = this._savedAngle;
			this._owner.editCancel(this._dom.editCanvas, this._crop);
			this._removeCrop();
		}
	}
	
	/**
	 * Otoceni fotografie o 90 stupnu doprava.
	 */
	_rotate(direction) {
		direction = direction || 1;

		this._angle = this.setDegRange(this._angle + this._rotateStep * direction);

		let uploadImg = this._owner.getUploadImage();
		let imd = uploadImg.getImageDim(this._canvas, this._owner.uploadParams);

		uploadImg.getCanvasFromImg(this._canvas, {
			canvas: this._dom.editCanvas,
			orientation: this._angle,
			width: imd.width,
			height: imd.height
		});

		this._dom.canvasCover.style.width = this._dom.editCanvas.width + "px";
		this._dom.canvasCover.style.height = this._dom.editCanvas.height + "px";

		// update cropu po otoceni
		this._crop.setDim({
			areaWidth: this._dom.editCanvas.width,
			areaHeight: this._dom.editCanvas.height
		});
		this._crop.fitToArea();
	}

	open(crop) {
		this._crop = crop;
		this._crop.backup();
		this._savedAngle = this._angle;
		this._dom.savedCanvas.width = this._dom.editCanvas.width;
		this._dom.savedCanvas.height = this._dom.editCanvas.height;
		this._savedCtx.drawImage(this._dom.editCanvas, 0, 0, this._dom.editCanvas.width, this._dom.editCanvas.height);
		this._dom.canvasCover.appendChild(this._crop.getContainer());
	}

	setDegRange(val) {
		val = val || 0;

		if (val < 0) {
			val += 360;
		}
		else if (val > 360) {
			val -= 360;
		}

		return (val % 360);
	}
	
	/**
	 * Ziskani uhlu 0 - 360
	 * @return {Integer}
	 */
	getAngle() {
		return this.setDegRange(this._startAngle + this._angle);
	}
	
	/**
	 * Ziskani canvasu
	 * @return {Image}
	 */
	getCanvas() {
		return this._canvas;
	}
}

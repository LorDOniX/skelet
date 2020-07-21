import Crop from "crop";
import { getEXIF, imageFileToImg } from "utils";

const SIZES = [
	{
		width: 323,
		height: 100,
		key: "3x1"
	}, {
		width: 400,
		height: 225,
		key: "16x9"
	}, {
		width: 80,
		height: 80,
		key: "1x1"
}];

const MIN_SIZE = {
	width: 800,
	height: 600
};

class Main {
	constructor() {
		window.xyz = [];
		this._main();
	}

	_main() {
		let fileInput = document.createElement("input");
		fileInput.type = "file";
		fileInput.addEventListener("change", async(e) => {
			let file = e.target.files[0];
			let img = await imageFileToImg(file);
			let isOK = false;
	
			// na sirku
			if (img.width >= MIN_SIZE.width && img.height >= MIN_SIZE.height) {
				isOK = true;
			}
			else if (img.width >= MIN_SIZE.height && img.height >= MIN_SIZE.width) {
				isOK = true;
			}

			if (!isOK) {
				alert("Fuck you!");
			}
			else {
				let exif = await getEXIF(file);

				this._createCrop(exif, img, SIZES[0]);
				this._createCrop(exif, img, SIZES[1]);
				this._createCrop(exif, img, SIZES[2]);
			}
		});
		document.body.appendChild(fileInput);
	}

	_createCrop(exif, img, size) {
		let cover = document.createElement("div");
		cover.classList.add("item-cover");
		let info = document.createElement("p");
		info.textContent = `width: ${size.width}, height: ${size.height}, key: ${size.key}`;
		cover.appendChild(info);

		let previewCanvas = document.createElement("canvas");
		Object.assign(previewCanvas.style, {
			border: "1px solid black"
		});
		let ratio = size.width / size.height;
		previewCanvas.width = 100;
		previewCanvas.height = Math.floor(previewCanvas.width / ratio);
		cover.appendChild(previewCanvas);

		let crop = new Crop({
			img,
			exif,
			previewCanvas,
			ratio
		});
		window.xyz.push(crop);
		cover.appendChild(crop.container);

		let rotateBtn = document.createElement("button");
		rotateBtn.textContent = "Rotate";
		rotateBtn.addEventListener("click", e => {
			crop.rotate();
		});
		cover.appendChild(rotateBtn);

		let doneBtn = document.createElement("button");
		doneBtn.textContent = "Hotovo";
		doneBtn.addEventListener("click", e => {
			crop.save();
		});
		cover.appendChild(doneBtn);

		let cancelBtn = document.createElement("button");
		cancelBtn.textContent = "Zrušit";
		cancelBtn.addEventListener("click", e => {
			crop.cancel();
		});
		cover.appendChild(cancelBtn);
		document.body.appendChild(cover);
	}
};

new Main();

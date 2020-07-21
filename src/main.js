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
		console.log("app start");
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
				let previewCanvas = document.createElement("canvas");
				previewCanvas.width = 100;
				previewCanvas.height = 50;
				document.body.appendChild(previewCanvas);
				let crop = new Crop({
					img,
					exif,
					previewCanvas,
					ratio: SIZES[0].width / SIZES[0].height
				});
			}
		});
		document.body.appendChild(fileInput);
	}
};

new Main();

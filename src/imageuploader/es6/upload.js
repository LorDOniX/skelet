/**
* Nahravani obrazku nebo editavanych dat a vizualizace nahravani
*/
class UploadItem {
	constructor(owner,data,previews) {
		this._owner = owner;
		this._data = data;
		this._dom = {
			container: JAK.mel("div", { className:"upload-upload-container"}),
			countBox: JAK.mel("span", {className:"upload-item count-box"}),
			imageBox:JAK.mel("span", {className:"upload-item image-box"}),
			infoBox:JAK.mel("span", {className:"upload-item info-box"}),
			progressBox:JAK.mel("span", {className:"upload-item progress"}),
			uploadAbort: JAK.mel("button", {className:"upload-abort", innerHTML:_("imageUploader.abort")}),
			uploadError: JAK.mel("span", {className: "upload-error", innerHTML:_("imageUploader.uploadError")}),
			uploadDone: JAK.mel("span", { className: "upload-done", innerHTML:_("imageUploader.uploadDone")})
		}
		JAK.DOM.append([
			this._dom.container,
			this._dom.countBox,
			this._dom.imageBox,
			this._dom.infoBox
		]);
		this._success = false;
		this._state = 0;
		this._dom.uploadAbort.addEventListener("click", this, false);
		var image = this._data.image;
		this._dom.imageBox.appendChild(image.canvas);
		var ctx = image.canvas.getContext("2d");
		this._request = null;
		ctx.putImageData(image.data, 0, 0);
		this._build();
		this.updateCount(this._data.total,this._data.step);
		this._start();
	}

	destroy() {
		if(this._request) {
			this._request.abort();
		}
		this._dom.uploadAbort.removeEventListener("click", this, false);
		if(this._request.removeEventListener) {
			this._request.removeEventListener("load", this, false);
			this._request.removeEventListener("error", this, false);
		}
		this._dom.container.remove();
	}

	abort() {
		this._request.abort();
		this._dom.uploadError.innerHTML = _("imageUploader.aborted");
		this._changeInfo(this._dom.uploadError);

	}

	getState() {
		return this._state;
	}

	getSuccess() {
		return this._success;
	}

	updateCount(total,count) {
		this._dom.countBox.innerHTML = "<span>" + count + "/" + total;
	}

	getContainer() {
		return this._dom.container;
	}

	handleEvent(e) {
		if(e.type == "load") {
			// FIXME lip ziskat finalni delku
			if (this._request.status.toString().charAt(0) == "2") {
				this._dom.progress.style.width = 200 + "px";
				this._uploadDone();
			}
			else {
				this._uploadError(this._request.status);
			}
		}

		if(e.type == "error") {
			this._uploadError(this._request.status);
		}

		if(e.type == "progress") {
			this._uploadProgress(e.loaded/e.total);
		}

		if(e.type == "click") {
			if(e.target == this._dom.uploadAbort) {
				this.abort();
			}
		}

	}

	_uploadDone() {
		this._changeInfo(this._dom.uploadDone);
		this._success =true;
	}

	_changeInfo(node) {
		JAK.DOM.clear(this._dom.infoBox);
		this._dom.infoBox.appendChild(node);
		this._state = 1;
		this._owner.uploadEnd();
	}

	_start() {
		if(this._data.source == "firm") {
			this._sendFirm();
		} else if(this._owner.getEditMode()) {
			this._sendEdit();
		} else {
			this._send();
		}
	}

	_build() {
		this._dom.progressLine = JAK.mel("strong");
		this._dom.progress = JAK.mel("em");
		this._dom.progressLine.appendChild(this._dom.progress);
		this._dom.progressBox.appendChild(this._dom.progressLine);
	}

	_sendFirm() {
		this._request = new XMLHttpRequest();
		this._request.open("POST", this._owner.FIRM_UPLOAD_URL);
		this._request.addEventListener("load", this, false);
		this._request.addEventListener("error", this, false);
		if("upload" in this._request) {
			this._request.upload.addEventListener("progress", this, false);
			this._progressStart(true);
		} else {
			this._progressStart(false);
		}

		var fd = new FormData();
		fd.append("premiseImageData", this._data.inputFile);
		fd.append("premiseId", this._data.id);
		var rusId = Mapy.getComponent("login").getRusId();
		if (rusId) {
			fd.append("rusId", rusId);
		}

		this._request.send(fd);
	}

	_send() {
		this._request  = new JAK.RPC(JAK.RPC.AUTO,{
			endpoint: Mapy.Config.media,
			withCredentials: true
		});

		this._request.setCallback(this, "_uploadResponse");
		this._request.setErrorCallback(this, "_uploadResponse");
		if("upload" in new XMLHttpRequest()) {
			this._request.setProgressCallback(this,"_uploadProgress");
			this._progressStart(true);
		} else {
			this._progressStart(false);
		}

		this._request.send("gallery.media.new", this._data.params, this._data.hints);
	}

	_sendEdit() {
		this._request  = new JAK.RPC(JAK.RPC.AUTO,{
			endpoint: Mapy.Config.media,
			withCredentials: true
		});

		this._request.setCallback(this, "_editResponse");
		this._request.setErrorCallback(this, "_editResponse");
		if("upload" in new XMLHttpRequest()) {
			this._request.setProgressCallback(this,"_uploadProgress");
			this._progressStart(true);
		} else {
			this._progressStart(false);
		}

		// vyhodime pole license - destructuring by byl nejjednodussi, ale ten se tusim docela objemne polyfilluje
		let params = {};
		for (let param in this._data.params[1]) {
			if (param !== 'license') {
				params[param] = this._data.params[1][param];
			}
		}

		this._request.send("media.edit", [this._data.params[0], params], this._data.hints);
	}

	_progressStart(progressSupport) {
		if(!progressSupport) {
			this._dom.infoBox.appendChild(this._dom.progressBox)
			this._dom.progress.classList.add("transitionExtra")
			var w = Math.round(160*0.70);// FIXME lip ziskat finalni delku
			window.setTimeout(() => {this._dom.progress.style.width = w + "px"},500)
			//this._dom.progress.style.width = w + "px";
		} else {
			this._dom.infoBox.appendChild(this._dom.progressBox);
			this._dom.progress.classList.add("transition");
		}
		this._dom.infoBox.appendChild(this._dom.uploadAbort);
	}

	_uploadResponse(data, status) {
		if(status < 200 || status > 299) {
			this._uploadError({status: status});
			return;
		}

		if(!data.status) {
			this._uploadError();
			return;
		}

		if(data.status < 200 || data.status > 299) {
			this._uploadError(data);
			return;
		}
		this._uploadDone();
	}

	_editResponse(data,status) {
		if(status < 200 || status > 299) {
			this._uploadError(status);
			return;
		}

		if(!data.status) {
			this._uploadError();
			return;
		}

		if(data.status < 200 || data.status > 299) {
			this._uploadError(data);
			return;
		}
		this._uploadDone();
	}

	_uploadProgress(e) {
		var w = Math.round(this._dom.progressLine.offsetWidth*e);
		this._dom.progress.style.width = w + "px";
	}

	_uploadError(data, generic) {
		var msg;
		if(!data) {
			// nic proste chyba
		}
		if(!isNaN(data)) {
			//HTTP CHYBA
			msg = " " + _("imageUploader.error.later");
		}

		if(data.status) {
			switch(data.status) {
				case 200:
				break;
				// ne firmy
				case 400:
					msg = " " + _("imageUploader.error.data");
					break;

				case 415:
					msg = " " + _("imageUploader.error.size");
					break;

				// firmy
				case 413:
					msg = " " + _("imageUploader.error.bigImage");
					break;

				case 461: // ne firmy
				case 406: // firmy
					msg = " " + _("imageUploader.error.border");
					break;

				case 460: // ne firmy
				case 402: // firmy
					msg = " " + _("imageUploader.error.smallImage");
					break;

				default:
					msg = " " + _("imageUploader.error.general");
			}

		}

		if(msg) {
			var node = JAK.ctext(msg)
			this._dom.uploadError.appendChild(node);
		}
		this._changeInfo(this._dom.uploadError);
	}
}

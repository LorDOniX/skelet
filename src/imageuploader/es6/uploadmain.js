/**
* Hlavni trida, ktera obhospodaruje nahrani a editaci foografie, nahrava se az na vyzadani
*/
class Upload {
	constructor(owner,data,logged) {
		this._owner = owner;
		this._maxMegabytes = 30;
		this._editMode = data.editMode;
		this._formData = null;
		if(this._editMode) {
			this._formData = data._formData;
		}
		this._data = data;
		this._dataFiles = Array.from(data.data);
		this._total = this._dataFiles.length;
		this._loadStep = 0;
		this._poi = data.poi;
		this._logged = logged;
		this._uploadImage = null;
		this._processFile = null;
		this._edit = null;
		this._crops = [];
		this._form = null;
		this._imageChanged = false;
		this._deleteId = null;
		this._maxTitleLength = 150;
		this._dom = {
			container: JAK.mel("div",{className:"uploader-container"}),
			dataBox: JAK.mel("div",{className:"upload-data-box"}),
			formBox:JAK.mel("div",{className:"upl-form-box"}),
			previewBox:JAK.mel("div",{className:"upl-preview-box"}),
			licenseSendBox: JAK.mel("div", {className:"upl-license-send-box"}),
			progressBox:JAK.mel("div",{className:"upl-progress-box"}),
			titleBox:JAK.mel("div",{className:"upl-title-box"}),
			continueButton: JAK.mel("button",{type:"button", className:"continue-button", innerHTML:_("imageUploader.continue")}),
			loginLine:null,
			licenseLine:null,
			title: JAK.mel("h3"),
			licenceError: JAK.mel("p", {className:"license-error", innerHTML:_("imageUploader.error.acceptAgreement")}),
			licenceUpdated: Mapy.Util.node("p"),
			licenceValid: Mapy.Util.node("span"),
			editInfo: JAK.mel("div", {className:"edit-info"}),
			progressUploadBox:JAK.mel("div",{className:"progress-upload-box"})
		}

		this._dom.titleBox.appendChild(this._dom.title);
		this._dom.continueButton.addEventListener("click", this, false);

		JAK.DOM.append([
			this._dom.container,
			this._dom.titleBox,
			this._dom.dataBox,
			this._dom.licenseSendBox,
			this._dom.progressBox
		]);
		JAK.DOM.append([
			this._dom.dataBox,
			this._dom.previewBox,
			this._dom.formBox
		]);

		this.ERRORS = {
			DEFAULT:"",
			SMALL: _("imageUploader.error.smallImage"),
			BAD_FORMAT: _("imageUploader.error.badFormat"),
			READ_SOURCE_ERROR: _("imageUploader.error.readSource"),
			NO_DELETE: _("imageUploader.error.deleteReject"),
			TOO_LARGE_FILE: _("imageUploader.error.largeFile", {"mb": this._maxMegabytes})
		}


		this.FORM_PARAMS = [
			{
				name:"name",
				label:_("imageUploader.name"),
				maxlength: this._maxTitleLength
			},
			{
				name:"description",
				label:_("imageUploader.desc")
			},
			{
				name:"takeDate",
				label:_("imageUploader.date"),
				placeholder:_("imageUploader.datePlaceholder"),
				required: true
			},
			{
				name:"mark",
				label:_("imageUploader.coords"),
				placeholder:_("imageUploader.coordsPlaceholder"),
				required: true
			},
			{
				name:"place",
				label:_("imageUploader.suggest"),
				suggest:true,
				skip:true
			}
		];

		this.FIRM_UPLOAD_URL = "/firmyImageUpload";
		this.CANVAS_PREVIEW_LONG_HEIGHT = 89; // vyska nahledu dlouheho
		this.CANVAS_PREVIEW_SHORT_HEIGHT = 101; // vyska nahledu ostatnich
		this.SIZES = [
		{
			minWidth: 323,
			minHeight: 100,
			key: "3x1",
			aspectRatio: 1
		}, {
			minWidth: 400,
			minHeight: 225,
			key: "16x9",
			aspectRatio: 1 // dopocita se
		}, {
			minWidth: 80,
			minHeight: 80,
			key: "1x1",
			aspectRatio: 1
		}];

		this.MAX_FILE_SIZE = this._maxMegabytes * 1024 * 1024;

		this.SIZES.forEach(function(size) {
			size.aspectRatio = size.minWidth / size.minHeight;
		});

		this.UPLOAD_MIN_SIZE = { // min. rozmery obrazku pri uploadu
			width: 800,
			height: 600
		};
		this.CANVAS_DIM = {
			MIN_HEIGHT: 300,
			MAX_HEIGHT: 600,
			BODY_DECR: 350
		}

		this._angleChange = false;
		this._form = null;
		this._previews = null;
		this._uploadItems = [];
		this._activeUploadItem = null;
		this.uploadParams = {
			maxSize: this._getMaxSize(),
			minSize: this.UPLOAD_MIN_SIZE
		};
		this._build();
		this._set(); //FIXME asi ne spiz zavolat rovnou update
		this._lastDocumentId = "";

		this._sc = [];
		if (Mapy.CUS.userweb && Mapy.CUS.userweb.licence) {
			this._sc.push(JAK.signals.addListener(this, "log-in", "updateLoginBlock", Mapy.getComponent("login")));
			this._sc.push(JAK.signals.addListener(this, "log-out", "updateLoginBlock", Mapy.getComponent("login")));
			this._sc.push(JAK.signals.addListener(this, "licence-approved", "updateLicenceBlock", Mapy.getComponent("licence")));
		}
	}

	destroy() {
		this._clear();
		this._dom.container.remove();
		this._dom.continueButton.removeEventListener("click", this, false);
		if(this._dom.sgButton) {
			this._dom.sgButton.removeListener("click", this, false);
		}
		Mapy.getComponent("imageUploader").removeUploadBox(this._dom.upload);
		this._dom.upload = null;
		JAK.signals.removeListeners(this._sc);
	}

	getEditMode() {
		return this._editMode;
	}

	skip() {
		//this._continueAction();
				this._total--;
				this._loadStep--;
				this._updateTitle();

				if(!this._dataFiles.length) {
					this._showUpload();
					this._dom.dataBox.style.minHeight = 0;
				}
				this.start();
	}

	deletePhoto(id, data) {
		if (id) {
			this._request  = new JAK.RPC(JAK.RPC.AUTO,{
				endpoint: Mapy.Config.media,
				withCredentials: true
			});

			this._deleteId = id;

			this._request.send("media.del", [id]).then(
				this._deleteResponse.bind(this),
				this._deleteReject.bind(this)
			);
		} else if (data && "status" in data) {
			this._deleteResponse(data);
		}
	}

	update(data) {
		var newData = Array.from(data.data);
		this._node = data.node;
		this._dataFiles = newData;
		this._poi = data.poi;
		this._total += this._dataFiles.length;
		this._updateUploadItems();
		this.start();
	}

	startSend(id) {
		var sendData = {
			source:this._poi.source,
			id:this._poi.id,
			image:this._previews.getExportImage(),
			inputFile:this._processFile,
			total: this._total,
			step:this._loadStep,
			license: Mapy.CUS.userweb && Mapy.CUS.userweb.licence ? this._dom.licenseInput.checked : this._owner.getAgreementCache()
		};

		if(id !== null) {
			sendData.mediaId = id;
		}

		var errors;
		if(this._editMode) {
			errors = this._makeEditData(sendData);
		} else {
			errors = this._makeSendData(sendData);
		}

		if (Mapy.CUS.userweb && Mapy.CUS.userweb.licence) {
			if(!this._editMode && !this._dom.licenseInput.checked) {
				this._showLicenseError();
				return;
			}
		}
		else {
			if(!this._editMode && !this._owner.getAgreementCache()) {
				this._showLicenseError();
				return;
			}
		}

		if(errors) {
			return;
		}

		var testItem = new UploadItem(this, sendData,this._previews);
		this._activeUploadItem = testItem;
		this._dom.progressBox.insertBefore(testItem.getContainer(), this._dom.progressBox.firstChild);
		this._uploadItems.push(testItem);
		this._fullStep = false;
		this.start();
	}

	getForm() {
		return this._form;
	}

	start() {
		this._dom.editInfo.remove();
		this._dom.dataBox.style.minHeight = "";
		if(this._dataFiles.length) {
			this._hideUpload();
			this._set();

			//this._setFormVisibility(true);
		} else {
			this._clearStep();
			//this._showUpload();
			this._setSendVisibility(false);

		}
	}

	uploadEnd() {
		//this._activeUploadItem = null;
		this._updateTitle();

		if (Mapy.CUS.userweb && Mapy.CUS.userweb.licence) {
			if(this._dom.licenseInput.checked) {
				this.updateLoginBlock();
				this.updateLicenceBlock();
			}
		}
		else {
			if(this._owner.getAgreementCache()) {
				this.updateLicenceBlock();
			}
		}

		if(!this._fullStep && !this._rejectInfo){
			this._showUpload();
		} else {
			this._hideUpload();
		}

		// aktualizace fotomap galerie -> pri update

		var detail = Mapy.getComponent("detail");
		if (detail.isActive()) {
			var data = detail.getState();
			data.show = false;
			if (data.source == "foto") { // aktualizujeme jen foto detail, jinak se fotka stejne musi schvalit
				detail.setState(data).then(function() { Mapy.getComponent("history").save(); });
			}
		}
	}

	getContainer() {
		return this._dom.container;
	}

	getCrops() {
		return this._crops;
	}

	getEdit() {
		return this._edit;
	}

	handleEvent(e) {
		if(e.target == this._dom.continueButton) {
			this._continueAction();
			return;
		}

		if(e.type == "click") {

			switch(e.target) {
				case this._dom.loginButton:
					Mapy.getComponent("login").open();
				break;

				case this._dom.licenseInput:
					if (Mapy.CUS.userweb && Mapy.CUS.userweb.licence) {
						if(this._activeUploadItem && !this._dom.licenseInput.checked) {
							this._activeUploadItem.abort();
						}

						if(this._dom.licenseInput.checked) {
							this._hideLicenseError();
						}
					}
					else {
						this._owner.setAgreementCache(this._dom.licenseInput.checked);
						if(this._activeUploadItem && !this._owner.getAgreementCache()) {
							this._activeUploadItem.abort();
						}
						if(this._owner.getAgreementCache()) {
							this._hideLicenseError()
						}
					}
				break;

				case this._dom.sendButton:
					if(this._editMode) {
						this._form.send();
						return;
					}

					if (Mapy.CUS.userweb && Mapy.CUS.userweb.licence) {
						if(this._dom.licenseInput.checked) {
							const licence = Mapy.getComponent("licence");
							if (!licence.getApprove("mapy_lu")[0]) {
								licence.getDocument("mapy_lu").then(doc => {
									Mapy.getComponent("logger").log("condition_accepted", {
										logged: !!Mapy.getComponent("login").getLogged(),
										origin: "fotky",
										document_id: doc.document_id,
										document_type: doc.document_type
									});
								});
							}
							licence.setApprove("mapy_lu", true);
							this._form.send();
						} else {
							this._showLicenseError();
						}
					}
					else {
						if(this._owner.getAgreementCache()) {
							this._form.send();
						} else {
							this._showLicenseError();
						}
					}

				break;

				case this._dom.progressClose:
					this._owner.deactivate();
				break;

				case this._dom.sgButton:
					this._getSuggestedData();
				break;

			}
		}

		if(e.type == "drop"
			|| e.type == "dragleave"
			|| e.type == "dragover"){
			e.preventDefault();
			e.stopPropagation();
			var files = e.target.files || e.dataTransfer.files;

			if(e.type == "drop") {
				if (files && files.length) {
					var param = {
						data:files,
						poi:this._owner.getPoiData()
					}

					this._editMode = false;
					this._owner.setData(param);
				}
			}

		}
	}


	openEdit(index) {
		let crop = this._crops[index];

		this._edit.open(crop);
		this._dom.container.replaceChild(this._edit.getContainer(),this._dom.dataBox);
		this._dom.container.removeChild(this._dom.licenseSendBox);
		this._dom.container.removeChild(this._dom.progressBox);

	}

	closeEdit() {
		this._dom.container.replaceChild(this._dom.dataBox, this._edit.getContainer());
		this._dom.container.appendChild(this._dom.licenseSendBox);
		this._dom.container.appendChild(this._dom.progressBox);
	}

	rotateDone(canvas, currentCrop) {
		this._crops.forEach(crop => {
			if (crop == currentCrop) return;

			crop.setDim({
				areaWidth: canvas.width,
				areaHeight: canvas.height
			});

			crop.fitToArea();
		});

		this._angleChange = true;
		this._changePreviews(canvas);
	}

	editDone(canvas) {
		this._imageChanged = true;
		this._changePreviews(canvas);
		this.closeEdit();
	}

	editCancel(canvas, crop) {
		this._changePreviews(canvas);
		this.closeEdit();
	}

	updateLoginBlock() {
		// jestlize jsem prihlaseny, nevidim vyzvu k loginu [musim poslouchat na prihlaseni odjinud]
		if(Mapy.getComponent("login").getLogged()) {
			this._dom.loginLine.remove();
		} else {
			this._dom.licenseSendBox.insertBefore(this._dom.loginLine, this._dom.licenseSendBox.firstChild)
		}
	}

	updateLicenceBlock() {
		if (Mapy.CUS.userweb && Mapy.CUS.userweb.licence) {
			Mapy.getComponent("licence").getDocument("mapy_lu").then(doc => {
				this._lastDocumentId = doc.document_id;
				this._dom.licenseTitle.innerHTML = _("imageUploader.agreementLicence", { url: `https://licence.mapy.${Mapy.Config.TLD}/?doc=mapy_lu`, title: doc.title });

				const approved = Mapy.getComponent("licence").getApprove("mapy_lu")[0];

				// jestlize mam odsouhlaseno, nevidim ani vyzvu k odsouhlaseni, ale vidim datum odsouhlaseni
				if (approved) {
					const date = new Date(approved.date * 1000);
					this._dom.licenceValid.innerHTML = `<br /><span class="valid-agreement">${_("imageUploader.validAgreement", { date: Mapy.Util.dateFormat(date, "d. m. yyyy") })}</span>`;
					this._dom.licenseLine.appendChild(this._dom.licenceValid);
					this._dom.licenseInput.checked = true;
					if (doc.version !== approved.version && Mapy.getComponent("licence").updated.map(doc => doc.version).indexOf(doc.version) === -1) {
						this._dom.licenceValid.remove();
						this._dom.licenceUpdated.innerHTML = _("imageUploader.updateAgreement", { date: Mapy.Util.dateFormat(date, "d. m. yyyy") });
						this._dom.licenseSendBox.insertBefore(this._dom.licenceUpdated, this._dom.loginLine.parentNode ? this._dom.licenseLine : this._dom.licenseSendBox.firstChild);
						this._dom.sendButton.before(this._dom.licenseLine);
						this._dom.licenseInput.checked = false;
					} else {
						this._dom.licenceUpdated.remove();
					}
				} else {
					this._dom.sendButton.before(this._dom.licenseLine);
					this._dom.licenseInput.checked = false;
					if (Mapy.getComponent("imageUploader").isActive() && !this._rejectInfo) {
						Mapy.getComponent("logger").log("conditions_impress", {
							logged: !!Mapy.getComponent("login").getLogged(),
							origin: "fotky",
							document_id: doc.document_id,
							document_type: doc.document_type
						});
					}
				}
			});
		}
		else {
			//jestlize jsem prihlaseny nevidim vyzvu k loginu [musim poslouchat na prihlaseni odjinud]
			if(Mapy.getComponent("login").getLogged()) {
				this._dom.loginLine.remove();
			} else {
				this._dom.licenseSendBox.insertBefore(this._dom.loginLine, this._dom.licenseSendBox.firstChild)
			}
			//jestlize mam odsuhlaseno nevidim ani vyzvu k odsouhlaseni
			if(this._owner.getAgreementCache()) {
				this._setAgreementBox(true);
			} else {
				this._setAgreementBox(false);
				this._dom.sendButton.before(this._dom.licenseLine);
				this._dom.licenseInput.checked = false;
			}
		}
	}

	getUploadImage() {
		return this._uploadImage;
	}

	// !Mapy.CUS.userweb.licence
	_setAgreementBox(readOnly) {
		let ro = !!readOnly;
		this._dom.licenseLine.classList[ro ? "add" : "remove"]("readonly")
		let cb = this._dom.licenseLine.querySelector("label input[name=license]");
		if (cb) {
			cb.checked = ro;
			cb.disabled = ro;
			this._dom.licenseInput[ro ? "removeEventListener" : "addEventListener"]("click", this, false);
		}
	}

	_changePreviews(canvas) {
		var previewsData = {
			sizes:this.SIZES,
			canvas: canvas,
			crops:this._crops,
			source:this._poi.source
		}
		var previews = new UploadPreviews(this, previewsData);
		this._dom.previewBox.replaceChild(previews.getContainer(), this._previews.getContainer());
		this._previews.destroy();
		this._previews = previews;
	}

	_build() {
		this._buildUpload();
		this._buildLicenceBlock();

		var arr = [_("imageUploader.previewsTitleLine1"),_("imageUploader.previewsTitleLine2")];
		for(var i = 0; i < arr.length; i++) {
			var node = JAK.mel("p", {innerHTML:arr[i]});
			this._dom.editInfo.appendChild(node);
		}

	}

	_buildLicenceBlock() {
		var line = JAK.mel("p",{ className:"login-line"});
		line.innerHTML = _("imageUploader.author") + " ";
		this._dom.loginButton = JAK.mel("button", {type:"button", className:"license-login-button", innerHTML:_("imageUploader.authorLogin")});
		line.appendChild(this._dom.loginButton);
		this._dom.loginButton.addEventListener("click", this, false);
		this._dom.loginLine = line;
		this._dom.licenseSendBox.appendChild(line);

		line = JAK.mel("p",{ className:"license-line"});
		if (Mapy.CUS.userweb && Mapy.CUS.userweb.licence) {
			var check = Mapy.Util.buildRadioCheck("checkbox", "license", _("imageUploader.agreementLicence", { url: `https://licence.mapy.${Mapy.Config.TLD}/?doc=mapy_lu`, title: "" }));
			this._dom.licenseInput = check.input;
			this._dom.licenseTitle = check.title;
			line.appendChild(check.label);
		}
		else {
			var label = JAK.mel("label");
			var chb = JAK.mel("input", { type:"checkbox", name:"license"});
			var txt = JAK.ctext(_("imageUploader.agreement"));
			this._dom.licenseInput = chb;

			var licenseLink = JAK.mel("a", {target:"_blank", href:"https://napoveda.seznam.cz/cz/mapy/pravidla-uzivani-fotomapy", innerHTML:_("imageUploader.agreementLink")});
			JAK.DOM.append([
				label,
				chb,
				txt
			]);

			JAK.DOM.append([
				line,
				label,
				licenseLink,
				JAK.ctext(".")
			]);
		}
		this._dom.licenseInput.addEventListener("click", this, false);

		this._dom.licenseLine = line;
		this._dom.licenseSendBox.appendChild(line);

		if(this._editMode) {
			this._dom.licenseSendBox.classList.add("edit-mode");
		} else {
			this._dom.licenseSendBox.classList.remove("edit-mode");
		}

		this._dom.sendButton = JAK.mel("button", {type:"button", className:"upload-send-button", innerHTML:_("imageUploader.send")});
		this._dom.licenseSendBox.appendChild(this._dom.sendButton);
		this._dom.sendButton.addEventListener("click", this, false);
	}

	_clear() {
		this._clearStep();
		while(this._uploadItems.length) {
			var item = this._uploadItems.splice(0,1)[0];
			item.destroy();
		}
		if(this._dom.upload) {
			this._dom.upload.removeEventListener("drop", this, false);
			this._dom.upload.removeEventListener("dragover", this, false);
			this._dom.upload.removeEventListener("dragleave", this, false);
			Mapy.getComponent("imageUploader").removeUploadBox(this._dom.upload);
			this._dom.upload = null;
		}

		if(this._dom.progressClose) {
			this._dom.progressClose.removeEventListener("click", this, false);
		}
	}

	_clearStep() {
		var arr = ["form","edit","uploadImage","previews"];
		arr.forEach(function(name,n){
			var fncName = "_" + name;
			if(this[fncName]) {
				this[fncName].destroy();
				this[fncName] = null;
			}
		},this);

		while(this._crops.length) {
			var crop = this._crops.splice(0,1)[0];
			crop.destroy();
		}
		if(this._rejectInfo) {
			this._rejectInfo.remove();
			this._rejectInfo = null;
		}
		this._processFile = null;
		this._uploadImage = null;
		this._deleteId = null;
	}

	_updateTitle() {
		var text = "";
		if(this._uploadItems.length < this._total) {
			if(this._editMode) {
				text = _("imageUploader.titleEdit");
			} else {
				text = _("imageUploader.title");
				if(this._loadStep && this._total) {
					text += " " + this._loadStep + "/" + this._total;
				}
			}
		} else {
			if(this._total > 1) {
				text = _("imageUploader.photosProcessed");
			} else if(this._total == 1) {
				text = _("imageUploader.onePhotoProcessed");
			} else {
				text = "";
			}
		}
		this._dom.title.innerHTML = text;
	}

	_updateUploadItems() {
		var len = this._uploadItems.length
		for(var i = 0; i < len; i++) {
			this._uploadItems[i].updateCount(this._total, i+1);
		}
	}

	_set() {
		this._clearStep()
		this._loadStep++;
		if(this._loadStep == 1) {
			this._dom.licenseSendBox.style.borderBottom = "none";
		} else {
			this._dom.licenseSendBox.style.borderBottom = "";
		}
		var file = this._dataFiles.splice(0,1)[0];
		if(this._editMode) {
			this._readSource(file);
		} else {
			this._readFile(file);
		}
		this._updateTitle();
	}

	_readFile(file) {
		this._fullStep = true;
		this._processFile = null;
		var formatOk = this._owner.MIME_TYPES.indexOf(file.type) < 0 ? false : true;

		if(!formatOk) {
			//this._dataFiles.splice(0,1)
			//window.setTimeout(() => this._readReject({BAD_FORMAT:1}),1);
			this._readReject({BAD_FORMAT:1});
			return;
		}

		if (file.size > this.MAX_FILE_SIZE) {
			this._readReject({TOO_LARGE_FILE:1});
			return;
		}

		this._processFile = file;
		if(!this._uploadImage) {
			this._uploadImage = new UploadImage();
		}

		this._uploadImage.load(file, this.uploadParams).then(
			(data) => {
				this._readResponse(data);
				if (Mapy.CUS.userweb && Mapy.CUS.userweb.licence) {
					this.updateLoginBlock();
					this.updateLicenceBlock();
				}
			},
			(data) => this._readReject(data)
		);
	}

	/**
	 * Nacteni souboru pri uploadu.
	 */
	_readResponse(response) {
		var coords = this._parseExifGPS(response.exifTags || {});

		if(!coords) {
			if(this._poi.mark) {
				coords = Scene.coordsFromWGS84(this._poi.mark.lon, this._poi.mark.lat);
			} else {
				coords = "";
			}
		}

		var exif = response.exifTags || {};
		var formData = {
			coords: coords,
			time: this._parseExifTime(response.exifTags || {}),
			poi:this._poi,
			description: exif.ImageDescription || exif["270"] || "",
			name: exif.DocumentName || exif["269"] || ""
		};
		if (formData.name.length > this._maxTitleLength) {
			formData.name = formData.name.substr(0, this._maxTitleLength - 1) + "…";
		}
		this._processData = response;

		// editace obrazku a nahledy
		this._edit = new UploadEdit(this, response.canvas, response.angle);

		// editace orezu
		this._makeCrops();
		// nahledy orezu v podporovanych zobrazenich
		var previewsData = {
			sizes:this.SIZES,
			canvas:this._edit.getCanvas(),
			crops:this._crops,
			source:this._poi.source
		};
		if(this._loadStep == 1) {
			this._dom.titleBox.appendChild(this._dom.editInfo)
		}
		this._previews = new UploadPreviews(this, previewsData);

		this._dom.previewBox.appendChild(this._previews.getContainer());
		formData.id = -1;
		formData.urls = {
			"canvasData": (() => {
				let oldCanvas = this._processData.canvas;
				let canvas = Mapy.Util.node("canvas");
				canvas.width = 368;
				canvas.height = Math.floor(oldCanvas.height * canvas.width / oldCanvas.width);
				let ctx = canvas.getContext('2d');
				ctx.drawImage(oldCanvas, 0, 0, oldCanvas.width, oldCanvas.height, 0, 0, canvas.width, canvas.height);
				return canvas.toDataURL();
			})()
		};

		this._form = new UploadForm(this, formData, this._logged);
		this._dom.formBox.appendChild(this._form.getContainer());
		this._finishStep(true);
	}

	_readReject(data) {
		var message = this.ERRORS.DEFAULT;
		if(data && data.E_SMALL) {
			message = this.ERRORS.SMALL;
		} else if(data && data.BAD_FORMAT) {
			message = this.ERRORS.BAD_FORMAT;
		} else if (data && data.TOO_LARGE_FILE) {
			message = this.ERRORS.TOO_LARGE_FILE;
		}
		var info = this._buildRejectInfo(message,true);
		this._rejectInfo = info;
		this._dom.formBox.appendChild(info);
		this._hideLicenseBlock();
		this._fullStep = false;
		this._finishStep(false);
	}


	_finishStep(success) {
		if(success) {
			//if(this._dataFiles.length) {
				this._setSendVisibility(true);
			//}
		} else {
			if(this._total == 1) {
				this._total--;
				this._loadStep--;
				this._updateTitle();
				if(!this._total || !this._dataFiles.length
				&& !this._fullStep
				&& !this._uploadItems.length) {
					this._showUpload();
					this._dom.dataBox.style.minHeight = 0;
				}
			}
		}
	}

	// nacteni z URL
	_readSource(data) {
		if(!this._uploadImage) {
			this._uploadImage = new EditImage();
		}

		var rotation = data.rotation > 0 ? 360 - data.rotation : 0;

		var formData = this._prepareFormData();
		this._form = new UploadForm(this,formData,this._logged);
		this._dom.formBox.appendChild(this._form.getContainer());

		var loader = Mapy.getComponent("loader");
		var node = loader.getBigCon();
		this._dom.previewBox.appendChild(node);
		loader.start(true);

		this._uploadImage.load(data.urls["original"], rotation, this.uploadParams).then(
			data => this._readSourceResponse(data),
			data => this._readSourceReject(data)
		);
	}

	/**
	 * Nacteni souboru pri editaci.
	 *
	 * @param  {[type]} response [description]
	 * @return {[type]}          [description]
	 */
	_readSourceResponse(response) {
		this._processData = response;

		this._edit = new UploadEdit(this, response.canvas, response.angle);
		this._makeCrops();
		var previewsData = {
			sizes:this.SIZES,
			canvas:this._edit.getCanvas(),
			crops:this._crops,
			source:this._poi.source
		}
		this._loaderEnd();
		this._previews = new UploadPreviews(this, previewsData);
		this._dom.previewBox.appendChild(this._previews.getContainer());

	}

	_readSourceReject(data) {
		this._loaderEnd();
		var message = this.ERRORS.READ_SOURCE_ERROR;
		var info = this._buildRejectInfo(message);
		this._rejectInfo = info;
		this._dom.formBox.appendChild(info);
		this._hideLicenseBlock();
		if(this._total == 1) {
			this._continueAction();
		}
	}

	_loaderEnd() {
		var loader = Mapy.getComponent("loader");
		loader.getBigCon().remove();
		loader.end(true);
	}

	_prepareFormData() {
		var coords = Scene.coordsFromWGS84(this._poi.mark.lon, this._poi.mark.lat);
		var source = this._data.data[0];
		var time = this._parseEditDataTime(source.takeDate);
		var out = {
			coords:coords,
			time:time,
			poi:this._poi,
			name: source.name || "",
			description: source.description || "",
			id:source.id,
			urls: source.urls
		};

		return out;
	}

	_buildRejectInfo(message, upload) {
		var node = JAK.mel("div", {className:"upl-rejectInfo"});
		node.innerHTML = "<p><strong>" +(upload ?  _("imageUploader.readReject") : "")
		+ (upload && message ? ": " : "") + (message ? message : "")  + "</strong></p>";
		if(this._total > 1) {
			node.appendChild(this._dom.continueButton);
		}
		return node;
	}

	_continueAction() {
		this._total--;
		this._loadStep--;
		this._updateTitle();
		this._updateUploadItems();
		this.start();
		if(!this._total || !this._dataFiles.length && !this._fullStep) {
			this._showUpload();
		}
	}

	_makeCrops() {
		// crops
		this.SIZES.forEach(function(size, ind) {
			var width = this._processData.canvas.width;
			var height = this._processData.canvas.height;

			var cropperOptions = {
				width: width,
				height: height,
				minWidth: Math.round(size.minWidth / this._processData.scale),
				minHeight: Math.round(size.minHeight / this._processData.scale),
				aspectRatio: size.aspectRatio
			};

			var cropper = new UploadCrop(cropperOptions);

			cropper.setDim({
				areaWidth: width,
				areaHeight: height
			});

			cropper.fitToArea();

			// pri editaci nastavuji crop jaky je ulozeny u fotky
			var data = this._data.data[0]
			if(data.ratios && data.ratios[size.key]) {
				if(data.ratios[size.key].crop) {
					var abc = data.ratios[size.key].crop.map(function(i) {
						var out = Math.round(i / this._processData.scale)
						return out;
					}, this);
					cropper.restore([abc[0], abc[1], abc[0] + abc[2], abc[1] + abc[3]]);
				}
			}

			this._crops.push(cropper);
		}, this);
	}

	/**
	 * Ziskani max. vysky pro vykresleni canvasu pro editaci orezu fotky.
	 * Odecita se konstanta, vysledna vyska je v rozmezi.
	 * @return {Integer}
	 */
	_getMaxSize() {
		var output = document.getElementById("mapycz").offsetHeight;//FIXME upravit pro pravy panel
		var cc = this.CANVAS_DIM;

		output -= cc.BODY_DECR;

		// min
		if (output < cc.MIN_HEIGHT) {
			output = cc.MIN_HEIGHT;
		}
		else if (output > cc.MAX_HEIGHT) {
			output = cc.MAX_HEIGHT;
		}

		return output;
	}

	_parseEditDataTime(data) {
		if(!data) { return ""; }

		if (!Mapy.Util.testTimeZone(data)) {
			let tzo = (new Date()).getTimezoneOffset() * -1;
			let tzoHours = parseInt(Math.abs(tzo) / 60).toString().lpad("0", 2);
			let tzoMinutes = (Math.abs(tzo) % 60).toString().lpad("0", 2);
			data += (tzo < 0 ? "-" : "+") + tzoHours + ":" + tzoMinutes;
		}

		var date = new Date(data);
		var format = !!(date.getHours() || date.getMinutes() || date.getSeconds());
		return Mapy.Util.dateToLocaleFormatLocal(date, format);
	}

	_parseExifTime(exifTags) {
		var time = exifTags.DateTimeOriginal || exifTags.DateTimeDigitized || exifTags.DateTime;
		if (time) {
			// YYYY:MM:DD HH:MM:SS
			var parts = time.split(" ");

			var d = parts[0].split(":");
			return [d[2], d[1], d[0]].join(".") + " " + parts[1];
		}
		else {
			return "";
		}
	}

	_parseExifGPS(exifTags) {
		if (exifTags.GPSLatitude && exifTags.GPSLongitude) {
			var lon = exifTags.GPSLongitude[0] + "°" + exifTags.GPSLongitude[1] + "'" + exifTags.GPSLongitude[2] + "\"" + exifTags.GPSLongitudeRef;
			var lat = exifTags.GPSLatitude[0] + "°" + exifTags.GPSLatitude[1] + "'" + exifTags.GPSLatitude[2] + "\"" + exifTags.GPSLatitudeRef + " ";
			var coords = Scene.coordsFromWGS84(lon,lat) //.toWGS84();
			return coords;
		} else {
			return null;
		}
	}

	_makeSendData(dataObject) {
		var formData = this._form.getData();
		if(!formData) {
			return 'formError';
		}

		var source;
		if(this._poi.source == Mapy.ImageUploader.NO_POI_SOURCE) {
			source = "coor";
		} else {
			source = this._poi.source;
		}

		var source = this._poi.source == Mapy.ImageUploader.NO_POI_SOURCE ? "coor" : this._poi.source;
		var params = [
			source,
			parseInt(this._poi.id),
			this._processData.frpcBinaryData
		]

		var rotation = this._edit.getAngle();
		rotation = rotation > 0 ? 360 - rotation : 0;

		var cropsData = this._getCropsData();

		var requestDataObject = formData;

		requestDataObject.rotation = rotation;
		if(cropsData) {
			requestDataObject.ratios = cropsData;
		}


		if (requestDataObject.takeDate instanceof Date) {
			requestDataObject.takeDate = Mapy.Util.dateToISO(requestDataObject.takeDate);
		}

		if (Mapy.CUS.userweb && Mapy.CUS.userweb.licence) {
			requestDataObject.license = this._lastDocumentId;
		}

		params.push(requestDataObject);

		var hints = {
			"2": "binary",
			"3.mark.lon": "float",
			"3.mark.lat": "float"
		};

		dataObject.params = params;
		dataObject.hints = hints;

		return false;
	}

	_makeEditData(dataObject) {
		var formData = this._form.getData();
		if(!formData) {
			return 'formError';
		}

		var params = [
			dataObject.mediaId
		];

		var rotation = this._edit.getAngle();
		rotation = rotation > 0 ? 360 - rotation : 0;
		var cropsData = this._getCropsData();

		var opt = formData;
		opt.rotation = rotation;
		if(cropsData) {
			opt.ratios = cropsData;
		}

		if (opt.takeDate instanceof Date) {
			opt.takeDate = Mapy.Util.dateToISO(opt.takeDate);
		}

		if (Mapy.CUS.userweb && Mapy.CUS.userweb.licence) {
			opt.license = this._lastDocumentId;
		}

		params.push(opt);

		var hints = {
			"1.mark.lon": "float",
			"1.mark.lat": "float"
		};

		dataObject.params = params;
		dataObject.hints = hints;

		return false;

	}


	/**
	 * Ziskani orezu. Pouze zmenene orezy, prepocet podle orig. velikosti obrazku.
	 * @return {Object|Null}
	 */
	_getCropsData() {
		var ratios = {};
		//console.log("CHANGED", this._isAnyCropChanged());
		if(this._isAnyCropChanged()) {
			this._crops.forEach(function(crop, ind) {
				//if (crop.isChanged()) {
					var key = this.SIZES[ind].key;
					var aabb = crop.getAABB(this._processData.scale); // prepocitame oblast vzhledem ke skutecnym rozmerum obrazku

					if (!ratios) {
						ratios = {};
					}

					ratios[key] = {
						crop: [
							aabb[0], // left
							aabb[1], // top
							aabb[2] - aabb[0], // width
							aabb[3] - aabb[1] // height
						]
					};
				//}
			}, this);
		} else if (this._imageChanged && !this._angleChange) {
				return null
		} else {
			if(!this._imageChanged) {
				return null;
			}
		}
		return ratios;
	}

	_isAnyCropChanged() {
		var out = false;
		this._crops.forEach(function(crop, ind) {
			if(crop.isChanged()) {
				out = true;
			}
		},this);
		return out;
	}

	_buildUpload() {
		this._dom.upload = Mapy.getComponent("imageUploader").getUploadBox(this._poi);

		var nodes = this._dom.upload.childNodes;
		var arr = Array.from(nodes);
		for(var i = 0; i < arr.length; i++) {
			if(arr[i].nodeType == 3) {
				arr[i].remove();
			}
		}

		var prgInfo = JAK.mel("p", {innerHTML:_("imageUploader.progressUploadInfo") + " "});
		this._dom.progressClose = JAK.mel("button", {innerHTML:_("close")});
		this._dom.progressClose.addEventListener("click", this, false)
		prgInfo.appendChild(this._dom.progressClose)
		this._dom.progressUploadBox.appendChild(prgInfo);
		this._dom.progressUploadBox.appendChild(this._dom.upload);

		this._dom.upload.appendChild(JAK.mel("span",{innerHTML: _("imageUploader.uploadArea")}));
		this._dom.upload.addEventListener("drop", this, false);
		this._dom.upload.addEventListener("dragover", this, false);
		this._dom.upload.addEventListener("dragleave", this, false);
	}

	_showUpload() {
		this._dom.progressBox.appendChild(this._dom.progressUploadBox);
	}

	_hideUpload() {
		this._dom.progressUploadBox.remove();
	}

	_uploadAction() {
		//fixme bude to potreba??
	}

	_setSendVisibility(visibility) {
		if(visibility) {
			this._dom.dataBox.style.minHeight = "";
			this._showLicenseBlock();
		} else {
			this._dom.dataBox.style.minHeight = 0;
			this._hideLicenseBlock();
		}
	}

	_showLicenseBlock() {
		this._dom.licenseSendBox.style.display = "";
	}

	_hideLicenseBlock() {
		this._dom.licenseSendBox.style.display = "none";
	}

	_showLicenseError() {
		this._dom.sendButton.before(this._dom.licenceError);
	}

	_hideLicenseError() {
		this._dom.licenceError.remove();
	}

	_deleteResponse(response) {
		if(response.status < 200 && response.status > 299) {
			this._deleteReject(response);
			return;
		}
		Mapy.getComponent("photos").removePhotoFromList(this._deleteId);
		this._closeDetail();
		this._continueAction();

		var layout = Mapy.getComponent("layout");
		if (layout.getWidth() > 1) { layout.setWidth(1); }
	}

	_deleteReject(reject) {
		var message = this.ERRORS.NO_DELETE;
		var info = this._buildRejectInfo(message);
		this._rejectInfo = info;
		this._dom.formBox.appendChild(info);
		this._hideLicenseBlock();
	}

	_closeDetail() {
		var detail = Mapy.getComponent("detail");
		if(!detail.isActive()) { return }

		var data = detail.getData();
		if(data.source == "foto" && data.id == this._deleteId) {
			detail.deactivate();
		}
		this._deleteId = null;
	}
}

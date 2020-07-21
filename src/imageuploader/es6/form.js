/**
* Formular pro zadani a editaci doplnujicich informaci k fotografii
* obsahuje naseptavac pomoci ktereho se da v mape vyhledat lokalita
* zadavani souradnic kliknutim do mapy
*/
class UploadForm {
	constructor(owner, data, logged) {
		this._owner = owner;
		this._data = data;
		this._logged = logged;
		this._cursor = null;
		this._dom = {
			container:JAK.mel("div",{className:"upload-box"}),
			formBox: JAK.mel("form",{className:"form-box",action:"#",method:"post"}),
			deleteButton: JAK.mel("button", {type: "button", className:"delete-button", innerHTML: !data || data.id == -1 ? _("imageUploader.deleteFoto") : _("mymap.photos.deleteBtn") }),
			inputs:{}
		}
		this._dom.deleteButton.addEventListener("click", this, false);
		JAK.DOM.append([
			this._dom.container,
			this._dom.formBox
		]);

		this._suggest = null;
		this._markerLayer = Scene.createLayerMarker();
		this._marker = null;
		this._outputMark = null;
		this._inputTimeout = null;
		this._ss = [];

		Scene.addLayer(this._markerLayer).enable();

		this._cursor = Mapy.Cursor.add({ cursor: "crosshair", callback: this });

		this._build();
		this._setData();
	}

	destroy() {
		this._dom.container.remove();
		this._dom.deleteButton.removeEventListener("click", this, false);
		this._removeListeners();
		this._removeMarker();
		if (this._cursor) {
			Mapy.Cursor.remove(this._cursor);
			this._cursor = null;
		}
		this._markerLayer.disable();
		Scene.removeLayer(this._markerLayer);
	}

	send() {
		this._submit();
	}

	mapClick(e) {
		var coords = Scene.coordsFromEvent(e);
		this._addMarker(coords);
		this._removeError(this._dom.inputs.mark);

	}

	getContainer() {
		return this._dom.container;
	}

	getSubmitButton() {
		return this._dom.submitButton;
	}

	getData() {
		var arr = this._owner.FORM_PARAMS;
		var out = {};

		if(this._data.poi.source == "firm") {
			// firmy nic z toho nezajima
			return out;
		}

		var errors = [];
		for(var i = 0; i < arr.length; i++) {
			if(arr[i].skip) { continue }
			var trg = this._dom.inputs;
			var name = arr[i].name;
			if(arr[i].required && !trg[name].value) {
				errors.push(name);
				this._appendError(trg[name],name);
				continue;
			} else {
				this._removeError(trg[name]);
			}
			var methodName = "_parse" + name.substring(0,1).toUpperCase() + name.substring(1);
			var state = this[methodName](out,trg[name].value,name);
			if(state === false) {
				errors.push(name);
				this._appendError(trg[name],name,true);
				continue;
			} else {
				this._removeError(trg[name]);
			}
		}

		if(errors.length) {
			return null;
		}

		return out;
	}

	handleEvent(e) {
		if(e.type == "submit") {
			e.preventDefault();

			this._submit();
			return;
		}

		if (e.target == this._dom.sgButton) {
			this._getSuggestedData();
			return;
		}

		if(e.target == this._dom.deleteButton) {
			this._deletePhoto();
			return;
		}

		if(e.type == "input") {
			if(document.activeElement != this._dom.inputs.mark) { return }
			if(this._inputTimeout) {
				window.clearTimeout(this._inputTimeout);
			}
			this._inputTimeout = window.setTimeout(this._onInputHandler.bind(this),250);
		}
	}

	getMediaId() {
		return this._data.id;
	}

	_submit() {
		if(this._data.poi.source == "firm") {
			this._sendProcess();
			return;
		}

		var id = this._data.id || null;
		this._testGPS().then(
			this._testGPSResponse.bind(this),
			this._testGPSReject.bind(this)
		)
		//this._owner.startSend(id);
	}

	_testGPS() {
		var value = this._dom.inputs.mark.value;
		if(!value) {
			var promise = new JAK.Promise();
			this._outputMark = null;
			this._sendProcess();
			promise.reject({});
			return promise;
		}
		var request = new JAK.RPC(JAK.RPC.AUTO, { endpoint: Mapy.Config.requestUrl + "/search", withCredentials: true });
		return request.send("search",[value,0,10,{}]);

	}

	_testGPSResponse(response) {
		/* neco je spatne */
		if(response.data.status < 200 || response.data.status > 299) {
			this._testGPSReject(response);
			return;
		}
		/* nenaslo se nic nebo se toho naslo moc */
		if(response.data.result.length != 1) {
			this._testGPSReject(response);
			return;
		}
		/* to co se naslo neni souradnice*/
		if(response.data.result[0].source != "coor") {
			this._testGPSReject(response);
			return;
		}

		this._outputMark = response.data.result[0].mark;

		this._sendProcess();
	}

	_testGPSReject(data) {
		//console.log("REJECT",data)
		this._outputMark = null;
		this._sendProcess();
	}

	_sendProcess() {
		var id = this._data.id || null;
		this._owner.startSend(id);
	}


	_setData() {
		if(this._data.poi.source == "firm") {
			// firmam netreba formulare
			return;
		}

		if (this._data.coords) {
			let wgs84 = this._data.coords.toWGS84();
			let x = Math.abs(wgs84[0]);
			let y = Math.abs(wgs84[1]);
			// limit, nechceme uplnou nulu; 5ta souradnice jsou metry, 10m tolerance
			let threshold = 0.00001 * 10;

			if (x > threshold || y > threshold) {
				this._dom.inputs.mark.value = this._data.coords.toWGS84(2).reverse().join(" ");
			}
		}

		if(this._data.coords) {
			Scene.setCenter(this._data.coords);
			if(!this._owner.getEditMode()) {
				this._addMarker(this._data.coords,true);
			}
		}
		this._dom.inputs.mark.addEventListener("input",this, false);

		if(this._data.time) {
			this._dom.inputs.takeDate.value = this._data.time;
		}

		if(this._data.name) {
			this._dom.inputs.name.value = this._data.name;
		}

		if(this._data.description) {
			this._dom.inputs.description.value = this._data.description;
		}
	}

	_build() {
		if(this._data.poi.source == "firm") {
			// firmam netreba formulare
			return;
		}
		var arr = this._owner.FORM_PARAMS;
		for(var i = 0; i < arr.length; i++) {
			var label = JAK.mel("label", {innerHTML: "<span>" + arr[i].label + "</span>"});
			if(arr[i].required) {
				label.classList.add("required");
			}
			if(arr[i].name == "place") {
				var node = this._buildPlaceInput(arr[i]);
				this._dom.formBox.appendChild(node);
				continue;

			}
			var inputParams = {
				type: "text",
				name: arr[i].name
			};

			var input = JAK.mel("input", inputParams);

			this._dom.inputs[arr[i].name] = input;

			if(arr[i].placeholder) {
				input.placeholder = arr[i].placeholder;
			}

			if(arr[i].maxlength) {
				input.setAttribute("maxlength", arr[i].maxlength);
			}

			label.appendChild(input);
			this._dom.formBox.appendChild(label);
		}

		this._setSuggest();

		this._dom.submitButton = JAK.mel("input", {type:"submit", value:"Odeslat", className:"upload-submit"}, {display:"none"});
		this._dom.formBox.appendChild(this._dom.submitButton)

		this._dom.formBox.addEventListener("submit", this, false);


		var deleteLine = JAK.mel("div", {className:"delete-line"});
		deleteLine.appendChild(this._dom.deleteButton);

		this._dom.formBox.appendChild(deleteLine);

	}

	_setSuggest() {
		this._suggest = new SMap.Suggest(this._dom.sgInput, {
			factory: function(data, pos) {
				return new Mapy.PrehistorikSuggestItem(data, pos);
			},
			provider: new SMap.SuggestProvider({
				url: Mapy.Config.requestUrl + "/suggest/",
				poiaggUrl: Mapy.Config.requestUrl + "/poiagg"
			}),
			abTest: Mapy.Config.abTest ? Mapy.Config.abTest.flags : ""
		});
		this._suggest.addListener("enter", function() {
			this._getSuggestedData();
		}, this);
		this._suggest.addListener("suggest", function(suggestData) {
			this._showSuggested(suggestData.data);
		}, this);
		this._suggest.addListener("request-items", this._suggestResponseData, this);
		this._suggest.getProvider().updateParams(function(paramsObj) {
			var coords = Scene.getCenter().toWGS84();

			paramsObj.lon = coords[0];
			paramsObj.lat = coords[1];
			paramsObj.zoom = Scene.getZoom();
			paramsObj.lang = _i18n.getAllLangs().join(",");
			paramsObj.personalize = 1;
		});
	}

	_buildPlaceInput(param) {
		//FIXME naprdrelit sem naseptavac
		this._dom.suggestBox = JAK.mel("label", {className:"label-suggest",innerHTML:"<span>" + param.label + "</span>"});
		this._dom.sgInput = JAK.mel("input", {type:"text",name:param.name});
		this._dom.sgInput.autocomplete = "off";
		this._dom.suggestBox.appendChild(this._dom.sgInput);

		this._dom.sgButton = JAK.mel("button", {type:"button",className:"sg-button"});
		this._dom.suggestBox.appendChild(this._dom.sgButton);
		this._dom.sgButton.addEventListener("click", this, false);

		return this._dom.suggestBox;
	}

	_suggestResponseData(items) {
		if (items.length < 1) { return; }

		var item = items[0];

		if(!this._suggest.isActive()) {
			this._showSuggested(item);
			this._dom.sgInput.value = item.title;
		}

		this._cachedSuggestData = item;
	}

	_getSuggestedData() {
		if (!this._dom.sgInput.value) return;

		if(this._dom.sgInput.value == this._suggest.getPhrase() && this._cachedSuggestData) {
			var data = this._cachedSuggestData;

			this._showSuggested(data);
			this._dom.sgInput.value = data.title;
		}
		else {
			this._suggest.send();
		}
	}

	_parseDefault(output,value,name) {
		if(!value) {
			return false;
		}
		output[name] = value.trim();
		return true;
	}

	_parseName(output,value,name) {
		output[name] = value.trim();
		return true;
	}

	_parseDescription(output,value,name) {
		output[name] = value.trim();
		return true;
	}

	_parseTakeDate(output,value,name) {
		if(!value) {
			return false;
		}
		var shortVer = value.match(/[0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4}/) ? true : false;
		var longVer = value.match(/.*[0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4}.*[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}/) ? true : false;

		if(!shortVer && !longVer) {
			return false;
		}
		var parts = value.split(" ");
		var first = parts[0].split(".");

		if(longVer) {
			var second = parts[1].split(":");
			// format data
			output["takeDate"] = new Date(
				parseInt(first[2], 10), parseInt(first[1], 10) - 1, parseInt(first[0]),
				parseInt(second[0], 10), parseInt(second[1], 10), second[2] ? parseInt(second[2], 10, 0) : 0
			);
		}
		else if (shortVer) {
			// format data
			output["takeDate"] = new Date(
				parseInt(first[2], 10), parseInt(first[1], 10) - 1, parseInt(first[0])
			);
		}
		return true;
	}

	_parseMark(output,value,name) {
		if(!value) {
			return false;
		}

		if(this._outputMark === null) {
			return false;
		}

		output[name] = {
			lon: this._outputMark.lon,
			lat: this._outputMark.lat
		}
		return true;
	}

	_showSuggested(data) {
		var coords = Scene.coordsFromWGS84(parseFloat(data.longitude),parseFloat(data.latitude));
		Scene.setCenterZoom(coords, Mapy.Util.computeZoom(data));
	}

	_addMarker(coords, keepValue) {
		if(this._inputTimeout) {
			window.clearTimeout(this._inputTimeout);
			this._inputTimeout = null;
		}
		if(!this._marker) {
			this._marker = Scene.createMarkerPOI(coords,1234567, {visual:Scene.VISUAL.MARKER_POI.UNIVERSAL});
			this._marker.decorateDraggable();

			this._ss.push(Scene.addListener("marker-drag-move", "_dragMove", this, this._marker));
			this._ss.push(Scene.addListener("marker-drag-stop", "_dragStop", this, this._marker));

			this._markerLayer.addMarker(this._marker);
		} else {
			this._marker.setCoords(coords);
		}

		if(!keepValue) {
			this._dragStop();
		}
	}

	_removeMarker() {
		if(this._marker) {
			this._markerLayer.removeMarker(this._marker);
			this._marker = null;
			this._removeListeners();
		}
	}

	_removeListeners() {
		Scene.removeListeners(this._ss);
	}

	_dragMove() {
		this._dragStop()

	}

	_dragStop() {
		var coords = this._marker.getCoords();
		var str = coords.toWGS84(2).reverse().join(", ");
		this._dom.inputs.mark.value = str;
	}

	_deletePhoto() {
		if(this._owner.getEditMode()) {
			new PhotosPopup({
					item: this._data,
					cb: data => {
						this._owner.deletePhoto(data.deletedId || null, data);
					}
				});
		} else {
			new PhotosPopup({
					item: this._data,
					cb: () => {
						this._owner.skip();
					}
				});
		}
	}

	_appendError(node,name,parse) {
		var msg;
		switch(name) {
			case "takeDate":
				if(parse) {
					msg = _("imageUploader.error.takeDateError");
				} else {
					msg = _("imageUploader.error.takeDate");
				}
			break;
			case "mark":
				if(parse) {
					msg = _("imageUploader.error.markError");
				} else {
					msg = _("imageUploader.error.mark");
				}
			break;
		}
		if(msg) {
			var error = JAK.mel("strong", {className:"form-error", innerHTML:msg});
			if( node.parentNode.querySelector("strong.form-error")) {
				node.parentNode.replaceChild(error,node.parentNode.querySelector("strong.form-error"));
			} else {
				node.parentNode.appendChild(error)
			}
		}
	}

	_removeError(node) {
		var trg = node.parentNode.querySelector("strong.form-error");
		if(trg) {
			trg.remove();
		}
	}

	_onInputHandler() {
		this._inputTimeout = null;
		this._testGPS().then(
			this._testGPSMarkResponse.bind(this),
			this._testGPSMarkReject.bind(this)
		);
	}

	_testGPSMarkResponse(response) {
		/* neco je spatne */
		if(response.data.status < 200 || response.data.status > 299) {
			this._testGPSMarkReject(response);
			return;
		}
		/* nenaslo se nic nebo se toho naslo moc */
		if(response.data.result.length != 1) {
			this._testGPSMarkReject(response);
			return;
		}
		/* to co se naslo neni souradnice*/
		if(response.data.result[0].source != "coor") {
			this._testGPSMarkReject(response);
			return;
		}
		var mark = response.data.result[0].mark;
		var coords = Scene.coordsFromWGS84(mark.lon,mark.lat);
		this._addMarker(coords,true);
		Scene.setCenter(coords);
	}

	_testGPSMarkReject(data) {
		//doNothing
	}
}

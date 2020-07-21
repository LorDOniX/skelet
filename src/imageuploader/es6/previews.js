/**
* Vyroba malych nahledu v zakladnich formatech pro nahravani i editaci
*/
class UploadPreviews {
	constructor(owner,data) {
		this._owner = owner;
		this._sizes = data.sizes;
		this._canvas = data.canvas;
		this._crops = data.crops;
		this._source = data.source;
		this._dom = {
			container: JAK.mel("div", { className:"upl-previews"}),
			
		}
		this._items = [];
		if(this._source != "firm") {
			this._dom.container.addEventListener("click", this, false);
		}
		this._build();
	}
	
	destroy() {
		this._dom.container.remove();
		this._dom.container.removeEventListener("click", this, false)
	}
	
	getExportImage() {
		return this._exportImage;
	}
	
	getContainer() {
		return this._dom.container;
	}
	
	handleEvent(e) {
		var trg = this._getClickTarget(e.target,(node)=>{return node.classList.contains("preview")},this._dom.container);
		var index = this._items.indexOf(trg);
		this._owner.openEdit(index);
	}

	/* hledam uzel od 'startNode', ktery vyhovuje podmince
		'testFnc' a nehledam v DOMu vyse nez k 'endNode'
	*/
	_getClickTarget(startNode, testFnc, endNode) {
		var node = startNode;
		
		if(testFnc(node)) {
			return node;
		}
		var lastNode = endNode || document.getElementById("mapycz");
		while(node != lastNode) {
			if(node == endNode) {
				return null;
			}
			
			if(testFnc(node)) {
				return node;
			}
			node = node.parentNode;
		}
		return null;
	}
	
	_build() {
		this._sizes.forEach((size,index) => this._buildItem(size,index));
		this._syncWidth();
	}
	
	_buildItem(size,index) {
		var previewCover = JAK.mel("span", {className:"preview item_" + size.key});
	
		var canvas = document.createElement("canvas");
		document.body.appendChild(canvas);
		if(index == 0) {
			canvas.width = this._owner.CANVAS_PREVIEW_LONG_HEIGHT * size.aspectRatio;
			canvas.height = this._owner.CANVAS_PREVIEW_LONG_HEIGHT;
		} else {
			canvas.width = this._owner.CANVAS_PREVIEW_SHORT_HEIGHT * size.aspectRatio;
			canvas.height = this._owner.CANVAS_PREVIEW_SHORT_HEIGHT;
		}
		
		if(this._source != "firm") {
			var previewEdit = JAK.mel("button", {type:"button", innerHTML:_("imageUploader.edit")});
			previewCover.appendChild(previewEdit);
			this._dom.container.classList.add("editable");
		} 
		
		var crop = this._crops[index];
		var aabb = crop.getAABB();
		var ctx = canvas.getContext("2d");
		
		this._dom.container.appendChild(previewCover);
		this._items.push(previewCover);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(this._canvas, aabb[0], aabb[1], aabb[2] - aabb[0], aabb[3] - aabb[1], 0, 0, canvas.width, canvas.height);
		if(size.key == "16x9") {
			this._exportImage = {
				canvas: canvas.cloneNode(true),
				data: ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
			};
		}

		previewCover.appendChild(canvas);
	} 
	
	_syncWidth() {
		var items = Array.from(this._dom.container.querySelectorAll("canvas"));
		var maxWidth = parseInt(items[0].width);
		var margin =  maxWidth - (parseInt(items[1].width) + parseInt(items[2].width));
		
		items[2].parentNode.style.marginLeft = margin + "px";
		this._dom.container.style.width = maxWidth + "px";
	}
}

onix.factory("$lightbox", [
	"$dom",
	"$common",
	"$resize",
	"$event",
	"$loader",
function(
	$dom,
	$common,
	$resize,
	$event,
	$loader
) {
	/**
	 * Create $lightbox window.
	 * 
	 * @param {Object} [options] Configuration
	 * @param {Number} [options.fadeTime = 20] Fade time between image switch
	 * @param {Boolean} [options.loop = true] Loop all images
	 * @param {Object} [options.dict] Optional translations, keys: close, noDesc, prev, next
	 * @param {String} [options.hideClass = "hide"] hide class for CSS
	 * @param {Number} [options.firstRunClass = "first-run"] first run class for CSS
	 * @class $lightbox
	 */
	class $lightbox extends $event {
		constructor(options) {
			super();
			
			this._opts = {
				fadeTime: 20,
				loop: true,
				dict: {
					close: "Close",
					noDesc: "Empty description",
					prev: "Prev",
					next: "Next"
				},
				hideClass: "hide",
				firstRunClass: "first-run"
			};

			for (let opt in options) {
				this._opts[opt] = options[opt];
			}

			this._data = [];
			this._ind = 0;
			this._dom = {};
			this._disableMouse = true;
			this._binds = {
				keyDown: this._keyDown.bind(this),
				mouseMove: this._mouseMove.bind(this)
			};
			this._firstOpen = false;
			this._wasMove = false;
			this._opened = false;
			this._fadeId = null;
			this._firstRunId = null;
			this._width = 0;
			this._height = 0;
		}

		/**
		 * Show prev button.
		 *
		 * @private
		 * @member $lightbox
		 * @method _showPrevBtn
		 */
		_showPrevBtn() {
			this._dom.prevBtn.classList.remove(this._opts.hideClass);
			this._dom.nextBtn.classList.add(this._opts.hideClass);
		}

		/**
		 * Show next button.
		 *
		 * @private
		 * @member $lightbox
		 * @method _showNextBtn
		 */
		_showNextBtn() {
			this._dom.prevBtn.classList.add(this._opts.hideClass);
			this._dom.nextBtn.classList.remove(this._opts.hideClass);
		}

		/**
		 * Lightbox cover DOM create.
		 *
		 * @private
		 * @member $lightbox
		 * @method _createCover
		 */
		_createCover() {
			this._dom.cover = $dom.create({
				el: "div",
				class: "lightbox-cover",
				events: [{
					event: "click",
					fn: e => {
						this.close();
					}
				}, {
					event: "DOMMouseScroll",
					fn: e => {
						this._mouseScroll(e);
					}
				}, {
					event: "mousewheel",
					fn: e => {
						this._mouseScroll(e);
					}
				}]
			});

			document.body.appendChild(this._dom.cover);
		}

		/**
		 * Lightbox DOM create.
		 *
		 * @private
		 * @member $lightbox
		 * @method _create
		 */
		_create() {
			let exported = {};

			this._dom.container = $dom.create({
				el: "div",
				class: ["lightbox", this._opts.firstRunClass],
				events: [{
					event: "DOMMouseScroll",
					fn: e => {
						this._mouseScroll(e);
					}
				}, {
					event: "mousewheel",
					fn: e => {
						this._mouseScroll(e);
					}
				}],
				child: [{
					el: "div",
					class: "close-holder",
					child: {
						el: "button",
						class: "exit-btn",
						attrs: {
							type: "button",
							title: this._opts.dict.close
						},
						events: {
							event: "click",
							fn: e => {
								this.close();
							}
						}
					},
					_exported: "closeHolder"
				}, {
					el: "div",
					class: "img-holder",
					child: [{
						el: "div",
						class: "left-part",
						events: [{
							event: "click",
							fn: e => {
								this.prev();
							}
						}, {
							event: "mouseenter",
							fn: e => {
								if (this._disableMouse) return;

								this._dom.prevBtn.classList.remove(this._opts.hideClass);
							}
						}, {
							event: "mouseleave",
							fn: e => {
								if (this._disableMouse) return;

								this._dom.prevBtn.classList.add(this._opts.hideClass);
							}
						}],
						child: {
							el: "button",
							attrs: {
								type: "button"
							},
							class: ["prev-btn", this._opts.hideClass],
							innerHTML: this._opts.dict.prev,
							_exported: "prevBtn"
						},
						_exported: "leftPart"
					}, {
						el: "div",
						class: "right-part",
						events: [{
							event: "click",
							fn: e => {
								this.next();
							}
						}, {
							event: "mouseenter",
							fn: e => {
								if (this._disableMouse) return;

								this._dom.nextBtn.classList.remove(this._opts.hideClass);
							}
						}, {
							event: "mouseleave",
							fn: e => {
								if (this._disableMouse) return;

								this._dom.nextBtn.classList.add(this._opts.hideClass);
							}
						}],
						child: {
							el: "button",
							attrs: {
								type: "button"
							},
							class: ["next-btn", this._opts.hideClass],
							innerHTML: this._opts.dict.next,
							_exported: "nextBtn"
						},
						_exported: "rightPart"
					}],
					_exported: "imgHolder"
				}, {
					el: "div",
					class: "footer",
					child: [{
						el: "p",
						class: "desc",
						_exported: "desc"
					}, {
						el: "p",
						class: "pos",
						_exported: "pos"
					}],
					_exported: "footer"
				}]
			}, exported);

			$common.extend(this._dom, exported);
			document.body.appendChild(this._dom.container);
		}

		/**
		 * Show lightbox at index.
		 *
		 * @param {Number} [ind] Photo number
		 * @param {Number|String} [dir] View direction (-1 left, 1 right)
		 * @private
		 * @member $lightbox
		 * @method _show
		 */
		_show(ind, dir) {
			if (typeof ind === "string") {
				ind = parseFloat(ind);
			}

			let count = this._data.length;
			if (!count) return;

			dir = dir || 0;
			ind = (ind || 0) + dir;

			if (ind < 0) {
				if (this._opts.loop) {
					ind = count - 1;
				}
				else {
					return;
				}
			}
			else if (ind > count - 1) {
				if (this._opts.loop) {
					ind = 0;
				}
				else {
					return;
				}
			}

			// save index
			this._ind = ind;

			let data = this._data[ind];

			// cleart timeouts
			this._clearFade();
			this._clearFirstRun();

			// img
			let oldImg = this._dom.img;
			if (oldImg) {
				this._dom.imgHolder.removeChild(oldImg);
				this._dom.img = null;
			}

			if (this._firstOpen) {
				this._dom.loader = $loader.getSpinner();
				this._dom.imgHolder.appendChild(this._dom.loader);
			}

			let start = Date.now();
			let img = new Image();
			let makeFade = this._opts.fadeTime > 0;

			if (makeFade) {
				img.setAttribute("data-src", "");
			}
			img.alt = data.desc;
			img.onload = e => {
				this._width = img.width;
				this._height = img.height;

				if (this._firstOpen) {
					this._firstOpen = false;

					if (this._dom.loader) {
						this._dom.imgHolder.removeChild(this._dom.loader);
					}

					this._firstRunId = setTimeout(() => {
						this._dom.container.classList.remove(this._opts.firstRunClass);
					}, 200);
				}

				this._dom.imgHolder.appendChild(img);
				this._dom.img = img;
				
				this._resize();
				
				if (makeFade) {
					let diff = Date.now() - start;
					let time = diff < this._opts.fadeTime ? this._opts.fadeTime - diff : 0;

					this._fadeId = setTimeout(() => {
						img.removeAttribute("data-src");
						this._fadeId = null;
					}, time);
				}
			};
			img.src = data.url;

			// desc
			this._dom.desc.innerHTML = data.desc;
			this._dom.pos.innerHTML = (ind + 1) + " / " + count;
		}

		/**
		 * Mouse scroll event - disable scroll lightbox -> parent propagation.
		 *
		 * @param {Event} e Mouse scroll event
		 * @private
		 * @member $lightbox
		 * @method _mouseScroll
		 */
		_mouseScroll(e) {
			e.preventDefault();
		}

		/**
		 * Key down event - image switch, close lightbox.
		 *
		 * @param {Event} e Keyboard event
		 * @private
		 * @member $lightbox
		 * @method _keyDown
		 */
		_keyDown(e) {
			let keyCode = e.which || e.keyCode;

			// left, up
			if (keyCode == 37 || keyCode == 38) {
				this.prev(true);

				if (keyCode == 38) {
					e.preventDefault();
				}
			}
			// right, down
			else if (keyCode == 39 || keyCode == 40) {
				this.next(true);

				if (keyCode == 40) {
					e.preventDefault();
				}
			}
			else if (keyCode == 27) {
				// esc
				this.close();
			}
		}

		/**
		 * Mouse move event - hide prev/next buttons.
		 *
		 * @param {Event} e Mouse event
		 * @private
		 * @member $lightbox
		 * @method _mouseMove
		 */
		_mouseMove(e) {
			if (!this._wasMove) {
				this._wasMove = true;
				return;
			}

			this._disableMouse = false;

			let target = e.target || e.srcElement;

			if (target == this._dom.leftPart) {
				this._showPrevBtn();
			}
			else if (target == this._dom.rightPart) {
				this._showNextBtn();
			}

			document.removeEventListener("mousemove", this._binds.mouseMove);
		}

		/**
		 * Resize event - resize lightbox.
		 * 
		 * @private
		 * @member $lightbox
		 * @method _resize
		 */
		_resize() {
			if (!this._width || !this._height) return;

			let top = this._dom.container.offsetTop;
			let availWidth = document.body.offsetWidth - 2*top;
			let availHeight = window.innerHeight - 2 * top - this._dom.closeHolder.offsetHeight - this._dom.footer.offsetHeight;
			let width = 0;
			let height = 0;
			let ratio = this._width / this._height;

			if (this._width > this._height) {
				// landscape
				width = Math.min(this._width, availWidth);
				height = width / ratio;

				if (height > availHeight) {
					height = availHeight;
					width = height * ratio;
				}
			}
			else {
				// portrait
				height = Math.min(this._height, availHeight);
				width = height * ratio;

				if (width > availWidth) {
					width = availWidth;
					height = width / ratio;
				}
			}

			this._dom.imgHolder.style.width = width + "px";
			this._dom.imgHolder.style.height = height + "px";
		}

		/**
		 * Clear fade timeout.
		 *
		 * @member $lightbox
		 * @method _clearFade
		 */
		_clearFade() {
			if (this._fadeId) {
				clearTimeout(this._fadeId);
				this._fadeId = null;
			}
		}

		/**
		 * Clear first run timeout.
		 *
		 * @member $lightbox
		 * @method _clearFirstRun
		 */
		_clearFirstRun() {
			if (this._firstRunId) {
				clearTimeout(this._firstRunId);
				this._firstRunId = null;
			}
		}

		/**
		 * Add image to the lightbox.
		 *
		 * @param {String} url Image path
		 * @param {String} preview Preview image path
		 * @param {String} [desc] Image description
		 * @member $lightbox
		 * @method add
		 */
		add(url, preview, desc) {
			if (!url || !preview) return;

			this._data.push({
				url: url,
				preview: preview,
				desc: desc || this._opts.dict.noDesc
			});
		}

		/**
		 * Open lightbox, you can also choose open index.
		 *
		 * @param {Number} [ind] Open index
		 * @member $lightbox
		 * @method open
		 */
		open(ind) {
			if (this._opened) {
				this._show(ind);
				return;
			}

			this._opened = true;
			this._firstOpen = true;

			this._createCover();
			this._create();

			this._show(ind);

			document.addEventListener("keydown", this._binds.keyDown);
			document.addEventListener("mousemove", this._binds.mouseMove);

			$resize.on("resize", this._resize, this);
			
			this.trigger("open");
		}

		/**
		 * Close lightbox window.
		 *
		 * @param {Number} [ind] Open index
		 * @member $lightbox
		 * @method close
		 */
		close() {
			if (!this._opened) {
				return;
			}

			this._opened = false;
			this._firstOpen = false;

			// remove
			if (this._dom.cover) {
				document.body.removeChild(this._dom.cover);
			}

			if (this._dom.container) {
				document.body.removeChild(this._dom.container);
			}

			if (!this._wasMove) {
				document.removeEventListener("mousemove", this._binds.mouseMove);
			}

			// clear
			this._dom = {};
			this._ind = 0;
			this._disableMouse = true;
			this._wasMove = false;

			document.removeEventListener("keydown", this._binds.keyDown);

			$resize.off("resize", this._resize, this);

			this._clearFade();
			this._clearFirstRun();

			this.trigger("close");
		}

		/**
		 * Jump to prev photo, you can also set visibility for step button.
		 *
		 * @param {Boolean} [showBtn] Show prev button
		 * @member $lightbox
		 * @method prev
		 */
		prev(showBtn) {
			this._show(this._ind, -1);

			if (showBtn) {
				this._showPrevBtn();
			}
		}

		/**
		 * Jump to next photo, you can also set visibility for step button.
		 *
		 * @param {Boolean} [showBtn] Show next button
		 * @member $lightbox
		 * @method next
		 */
		next(showBtn) {
			this._show(this._ind, 1);

			if (showBtn) {
				this._showNextBtn();
			}
		}

		/**
		 * Set language object.
		 *
		 * @param {Object} obj Object with translations
		 * @member $lightbox
		 * @method setDict
		 */
		setDict(obj) {
			for (let key in obj) {
				this._opts.dict[key] = obj[key];
			}
		}
	};

	return $lightbox;
}]);

onix.factory("$select", [
	"$common",
	"$event",
	"$dom",
function(
	$common,
	$event,
	$dom
) {
	/**
	 * $select uses bootstrap dropdown and provides additional functionality.
	 *
	 * @class $select
	 * @param {HTMLElement} el Where element has class "dropdown"
	 * @param {Object} [opts]
	 * @param {Boolean} [opts.addCaption = false] Add caption to select
	 */
	class $select extends $event {
		constructor(el, opts) {
			super();
			
			this._opts = {
				addCaption: false
			};

			for (let key in opts) {
				this._opts[key] = opts[key];
			}

			this._CONST = {
				CAPTION_SEL: ".dropdown-toggle",
				OPTIONS_SEL: ".dropdown-menu a",
				CARET_SEL: ".caret",
				OPEN_DROPDOWN_SEL: ".dropdown.open",
				OPEN_CLASS: "open",
				ACTIVE_CLASS: "active"
			};

			this._el = el;

			this._optinsRef = [];
			this._captionEl = null;
			this.captionTextEl = null;

			this._binds = {
				captionClick: this._captionClick.bind(this),
				choiceClick: this._choiceClick.bind(this),
				removeAllOpened: this._removeAllOpened.bind(this),
				click: this._click.bind(this)
			};

			this._bind();
		}

		/**
		 * Bind clicks on the select.
		 *
		 * @member $select
		 * @private
		 * @method _bind
		 */
		_bind() {
			this._bindCaption();
			this._bindChoices();
		};

		/**
		 * Bind caption el.
		 * 
		 * @member $select
		 * @private
		 * @method _bindCaption
		 */
		_bindCaption() {
			let captionEl = this._el.querySelector(this._CONST.CAPTION_SEL);

			if (captionEl) {
				// click on the caption
				captionEl.addEventListener("click", this._binds.captionClick);

				// insert span placeholder for caption
				if (this._opts.addCaption) {
					let caretEl = captionEl.querySelector(this._CONST.CARET_SEL);

					if (caretEl) {
						let captionTextEl = $dom.create({
							el: "span",
							class: "add-caption"
						});

						captionEl.insertBefore(captionTextEl, caretEl);

						this._captionTextEl = captionTextEl;
					}
				}
			}

			this._captionEl = captionEl;
		}

		/**
		 * Remove all opened selectors -> close all.
		 *
		 * @member $select
		 * @private
		 * @method _removeAllOpened
		 */
		_removeAllOpened() {
			// remove all
			onix.element(this._CONST.OPEN_DROPDOWN_SEL).forEach(item => {
				item.classList.remove(this._CONST.OPEN_CLASS);
			});
		}

		/**
		 * Outside click.
		 * 
		 * @member $select
		 * @private
		 * @method _click
		 */
		_click() {
			this._removeAllOpened();

			document.removeEventListener("click", this._binds.click);
		}

		/**
		 * Event - click on caption.
		 * 
		 * @param  {Event} e 
		 * @member $select
		 * @private
		 * @method _captionClick
		 */
		_captionClick(e) {
			e.stopPropagation();

			let isOpen = this._el.classList.contains(this._CONST.OPEN_CLASS);

			this._binds.removeAllOpened();

			if (isOpen) {
				// outside click
				document.removeEventListener("click", this._binds.click);
			}
			else {
				// outside click
				document.addEventListener("click", this._binds.click);

				this._el.classList.add(this._CONST.OPEN_CLASS);
			}
		}

		/**
		 * Bind choices inside select.
		 *
		 * @member $select
		 * @private
		 * @method _bindChoices
		 */
		_bindChoices() {
			onix.element(this._CONST.OPTIONS_SEL, this._el).forEach(option => {
				option.addEventListener("click", this._binds.choiceClick);

				// event ref
				this._optinsRef.push({
					el: option,
					event: "click",
					fn: this._binds.choiceClick
				});
			});
		}

		/**
		 * Event - click on option.
		 * 
		 * @param  {Event} e 
		 * @member $select
		 * @private
		 * @method _choiceClick
		 */
		_choiceClick(e) {
			e.stopPropagation();

			var el = e.target || e.srcElement;

			if (el && !el.parentNode.classList.contains(this._CONST.ACTIVE_CLASS)) {
				// remove previously selected
				let active = el.parentNode.parentNode.querySelector("." + this._CONST.ACTIVE_CLASS);
				
				if (active) {
					active.classList.remove(this._CONST.ACTIVE_CLASS);
				}

				// add to the current
				el.parentNode.classList.add(this._CONST.ACTIVE_CLASS);

				this._el.classList.remove(this._CONST.OPEN_CLASS);

				if (this._opts.addCaption && this._captionTextEl) {
					this._captionTextEl.innerHTML = el.innerHTML;
				}

				// trigger click
				let value = el.getAttribute("data-value") || "";

				this.trigger("change", value);
			}
		}

		/**
		 * Unbind choices.
		 *
		 * @member $select
		 * @method unbindChoices
		 */
		unbindChoices() {
			if (this._optinsRef.length) {
				this._optinsRef.forEach(option => {
					option.el.removeEventListener(option.event, option.fn);
				});

				this._optinsRef = [];
			}
		}

		/**
		 * Rebind choices.
		 *
		 * @member $select
		 * @method rebindChoices
		 */
		rebindChoices() {
			this.unbindChoices();
			this._bindChoices();
		}

		/**
		 * Select option from the select.
		 * 
		 * @param {Number} ind Position 0..n
		 * @member $select
		 * @method selectOption
		 */
		selectOption(ind) {
			ind = ind || 0;

			let optionsCount = this._optinsRef.length;

			if (optionsCount > 0 && ind >= 0 && ind < optionsCount) {
				let el = this._optinsRef[ind].el;
				let parent = this._optinsRef[ind].el.parentNode;

				if (!parent.classList.contains(this._CONST.ACTIVE_CLASS)) {
					parent.classList.add(this._CONST.ACTIVE_CLASS);

					if (this._opts.addCaption && this._captionTextEl) {
						this._captionTextEl.innerHTML = el.innerHTML;
					}

					// trigger click
					let value = el.getAttribute("data-value") || "";

					this.trigger("change", value);
				}
			}
		}

		/**
		 * Set add caption from the current value.
		 *
		 * @member $select
		 * @method setAddCaption
		 */
		setAddCaption() {
			if (!this._opts.addCaption) return;

			this._optinsRef.every((item) => {
				let parent = item.el.parentNode;

				if (parent.classList.contains(this._CONST.ACTIVE_CLASS)) {
					this._captionTextEl.innerHTML = item.el.innerHTML;

					return false;
				}
				else {
					return true;
				}
			});
		}
	};

	return $select;
}]);

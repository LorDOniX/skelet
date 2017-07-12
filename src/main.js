import Roman from "roman/roman";

class Main {
	constructor() {
		this._roman = new Roman();
	}

	getX() {
		return this._roman.getX();
	}

	getY() {
		return "bla bla";
	}
};

new Main();

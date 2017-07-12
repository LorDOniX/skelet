(function (Roman) {
'use strict';

Roman = Roman && 'default' in Roman ? Roman['default'] : Roman;

class Main {
	constructor() {
		this._roman = new Roman();
	}

	getX() {
		return this._roman.getX();
	}
}

new Main();

}(Roman));

import Roman from "roman/roman";

class Main {
	constructor() {
		console.log("app start");

		this._roman = new Roman();

		this._start();
	}

	getX() {
		return this._roman.getX();
	}

	getY() {
		return "bla bla";
	}

	async _start() {
		console.log("waiting...");
		let data = await this._test();
		console.log("start data");
		console.log(data);
	}

	_test() {
		return new Promise(resolve => {
			setTimeout(() => {
				resolve({ a: 5 });
			}, 500);
		});
	}
};

new Main();

import Roman from "roman/roman";

class Main {
	constructor() {
		console.log("app start");

		this._roman = new Roman();

		this._start();

		//this._x("onix", 5, {z:4});
		this._rom((...args) => {
			console.log("zavolana funkce");
			console.log(args);
		});

		this.getX();
	}

	getX() {
		let x = await this._roman.getX();
		console.log(x);
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

	_x(...args) {
		console.log("x func");
		console.log(args);
		console.log(args.length);
	}

	_rom(cb) {
		cb("onix", 5, {z:4});
	}
};

new Main();

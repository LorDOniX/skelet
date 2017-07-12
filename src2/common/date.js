/**
 * Date operations.
 * 
 * @class $date
 */
onix.service("$date", function() {
	/**
	 * Parse EN date to CS format.
	 * year-month-day -> day. month. year
	 * 2016-06-31 -> 31. 6. 2016
	 * 
	 * @param {String} enDate
	 * @return {String}
	 * @member $date
	 */
	this.dateENtoCS = function(enDate) {
		enDate = enDate || "";

		let parts = enDate.split("-");

		if (parts.length == 3) {
			// delete first 0
			return [parts[2].replace(/^0/, ""), parts[1].replace(/^0/, ""), parts[0]].join(". ");
		}
		else {
			return "";
		}
	};

	/**
	 * Parse CS date to EN format.
	 * day. month. year -> year-month-day
	 * 31. 6. 2016 -> 2016-06-31
	 * 
	 * @param {String} csDate
	 * @return {String}
	 * @member $date
	 */
	this.dateCStoEN = function(csDate) {
		// day. month. year 31. 12. 2015
		csDate = csDate || "";

		let parts = csDate.split(".");

		if (parts.length == 3) {
			let year = parts[2].trim();
			let month = parts[1].trim();
			let date = parts[0].trim();

			// add 0 from left
			date = date.length == 1 ? "0" + date : date;
			month = month.length == 1 ? "0" + month : month;

			return [year, month, date].join("-");
		}
		else {
			return "";
		}
	};


	/**
	 * Is string contains CS date format?
	 * 
	 * @param  {String} csDate
	 * @return {Boolean}
	 * @member $date
	 */
	this.isCSdate = function(csDate) {
		csDate = csDate || "";

		return !!(csDate.match(/([1-9]|[1-3][0-9])\.[ ]*([1-9]|1[0-2])\.[ ]*[1-9][0-9]{3}/));
	};

	/**
	 * Add days to date.
	 * 
	 * @param  {Date} date
	 * @param  {Number} days
	 * @return {Date}
	 * @member $date
	 */
	this.addDays = function(date, days) {
		days = days || 0;

		let addTime = 1000 * 60 * 60 * 24 * days;

		return new Date(date.getTime() + addTime);
	};

	/**
	 * Date - string format.
	 * yyyy - full year; m - month; d - day; s - secods; M - minutes; h - hours;
	 * double: dd, ss, MM, hh - left pad with zero.
	 * 
	 * @param  {Date} date Input date
	 * @param  {String} format Format string
	 * @return {String}
	 */
	this.format = function(date, format) {
		format = format || "d. m. yyyy hh:MM:ss";

		let day = date.getDate();
		let month = date.getMonth() + 1;
		let year = date.getFullYear();

		let seconds = date.getSeconds();
		let minutes = date.getMinutes();
		let hours = date.getHours();

		let dateObj = {
			"yyyy": year,
			"m": month,
			"mm": month < 10 ? "0" + month : month,
			"d": day,
			"dd": day < 10 ? "0" + day : day,
			"s": seconds,
			"ss": seconds < 10 ? "0" + seconds : seconds,
			"M": minutes,
			"MM": minutes < 10 ? "0" + minutes : minutes,
			"h": hours,
			"hh": hours < 10 ? "0" + hours : hours,
		};

		let keys = Object.keys(dateObj).sort((a, b) => {
			return b.length - a.length;
		});

		keys.forEach(key => {
			format = format.replace(new RegExp(key, "g"), dateObj[key]);
		});

		return format;
	};
});

/**
 * Many useful alghoritms.
 * 
 * @class $math
 */
onix.service("$math", function() {
	/**
	 * Math constants.
	 *
	 * @private
	 * @type {Object}
	 * @member $math
	 */
	this._CONST = {
		ZOOM: 156543.034
	};

	/**
	 * Is there two bounding box intersection?
	 * 
	 * @param  {Object} bbox1
	 * @param  {Number} bbox1.x Left top coordinates - axe x
	 * @param  {Number} bbox1.y Left top coordinates - axe y
	 * @param  {Number} bbox1.width Width of the bbox
	 * @param  {Number} bbox1.height Height of the bbox
	 * @param  {Object} bbox2
	 * @param  {Number} bbox2.x Left top coordinates - axe x
	 * @param  {Number} bbox2.y Left top coordinates - axe y
	 * @param  {Number} bbox2.width Width of the bbox
	 * @param  {Number} bbox2.height Height of the bbox
	 * @return {Boolean}
	 * @member $math
	 */
	this.isBBoxIntersection = function(bbox1, bbox2) {
		let ltx = Math.max(bbox1.x, bbox2.x);
		let lty = Math.max(bbox1.y, bbox2.y);
		let rbx = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
		let rby = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height);

		// width and height of intesection has to be higher than 0
		let width = Math.abs(rbx - ltx);
		let height = Math.abs(rby - lty);

		if (ltx <= rbx && lty <= rby && width * height > 0) {
			return true;
		}
		else {
			return false;
		}
	};

	/**
	 * Get BBox from points.
	 * 
	 * @param  {Object[]} points
	 * @param  {Number} points.x Coordinate on axe x
	 * @param  {Number} points.y Coordinate on axe y
	 * @return {Object} Output bbox with x, y, width and height variables
	 * @member $math
	 */
	this.getBBox = function(points) {
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		// for each point
		for (let i = 0; i < points.length; i++) {
			minX = Math.min(points[i].x, minX);
			minY = Math.min(points[i].y, minY);
			maxX = Math.max(points[i].x, maxX);
			maxY = Math.max(points[i].y, maxY);
		}

		return {
			x: minX,
			y: minY,
			width: Math.abs(maxX - minX),
			height: Math.abs(maxY - minY)
		};
	};

	/**
	 * Determinant 2x2 count.
	 * 
	 * @param {Number} x1
	 * @param {Number} x2
	 * @param {Number} y1
	 * @param {Number} y2
	 * @returns {Number}
	 * @member $math
	 */
	this.det2 = function(x1, x2, y1, y2) {
		return (x1 * y2 - y1 * x2);
	};

	/**
	 * Intersection of two lines.
	 * 
	 * @param  {Object} firstLine
	 * @param  {Object} firstLine.x1 Line start axe x
	 * @param  {Object} firstLine.y1 Line start axe y
	 * @param  {Object} firstLine.x2 Line end axe x
	 * @param  {Object} firstLine.y2 Line end axe y
	 * @param  {Object} secondLine
	 * @param  {Object} secondLine.x1 Line start axe x
	 * @param  {Object} secondLine.y1 Line start axe y
	 * @param  {Object} secondLine.x2 Line end axe x
	 * @param  {Object} secondLine.y2 Line end axe y
	 * @returns {Object} Intersection point x, y
	 * @member $math
	 */
	this.linesIntersection = function(firstLine, secondLine) {
		let TOLERANCE = 0.000001;

		let a = this.det2(firstLine.x1 - firstLine.x2, firstLine.y1 - firstLine.y2, secondLine.x1 - secondLine.x2, secondLine.y1 - secondLine.y2);
		
		// lines are parallel
		if (Math.abs(a) < TOLERANCE) { return null; }

		let d1 = this.det2(firstLine.x1, firstLine.y1, firstLine.x2, firstLine.y2);
		let d2 = this.det2(secondLine.x1, secondLine.y1, secondLine.x2, secondLine.y2);
		let x = this.det2(d1, firstLine.x1 - firstLine.x2, d2, secondLine.x1 - secondLine.x2) / a;
		let y = this.det2(d1, firstLine.y1 - firstLine.y2, d2, secondLine.y1 - secondLine.y2) / a;

		if (x < Math.min(firstLine.x1, firstLine.x2) - TOLERANCE || x > Math.max(firstLine.x1, firstLine.x2) + TOLERANCE) { return null; }
		if (y < Math.min(firstLine.y1, firstLine.y2) - TOLERANCE || y > Math.max(firstLine.y1, firstLine.y2) + TOLERANCE) { return null; }
		if (x < Math.min(secondLine.x1, secondLine.x2) - TOLERANCE || x > Math.max(secondLine.x1, secondLine.x2) + TOLERANCE) { return null; }
		if (y < Math.min(secondLine.y1, secondLine.y2) - TOLERANCE || y > Math.max(secondLine.y1, secondLine.y2) + TOLERANCE) { return null; }

		return {
			x: Math.round(x),
			y: Math.round(y)
		};
	};

	/**
	 * Is there point and bounding box intersection?
	 * 
	 * @param  {Object} point
	 * @param  {Number} point.x Point coordinates - axe x
	 * @param  {Number} point.y Point coordinates - axe y
	 * @param  {Object} bbox
	 * @param  {Number} bbox.x Left top coordinates - axe x
	 * @param  {Number} bbox.y Left top coordinates - axe y
	 * @param  {Number} bbox.width Width of the bbox
	 * @param  {Number} bbox.height Height of the bbox
	 * @return {Boolean}
	 * @member $math
	 */
	this.pointBBoxIntersection = function(point, bbox) {
		return point.x >= bbox.x && point.x <= (bbox.x + bbox.width) && point.y >= bbox.y && point.y <= (bbox.y + bbox.height);
	};

	/**
	 * Logarithm - base 2.
	 * 
	 * @param  {Number} val Input value
	 * @return {Number}
	 * @member $math
	 */
	this.log2 = function(val) {
		return Math.log(val) / Math.log(2);
	};

	/**
	 * Map zoom in mercator projection to distance in meters.
	 * 
	 * @param  {Number} zoom   Mercator zoom - 2..n
	 * @param  {Number} horFOV Horizontal field of view
	 * @param  {Number} height Screen height size
	 * @return {Number} Distance in meters
	 * @member $math
	 */
	this.zoomToDistance = function(zoom, horFOV, height) {
		let resolution = this._CONST.ZOOM / Math.pow(2, zoom); // m/px
		let halfHeight = height / 2;
		let y = Math.floor(resolution * halfHeight);

		// we need a half - its in degrees - thats why / 2 * / 180 for radians [rad]; vertical fov -> we need height
		let alfa = horFOV / 360 * Math.PI;

		return Math.floor(y / Math.tan(alfa));
	};

	/**
	 * Reverse function for zoomToDistance - distance in meters to zoom in mercator projection.
	 * 
	 * @param  {Number} distance Distance in meters
	 * @param  {Number} horFOV Horizontal field of view
	 * @param  {Number} height Screen height size
	 * @return {Number} Mercator zoom
	 * @member $math
	 */
	this.distanceToZoom = function(distance, horFOV, height) {
		let alfa = horFOV / 360 * Math.PI;
		let y = Math.tan(alfa) * distance;
		let mPPx = 2 * y / height; // distance / half of height; meters per pixel

		return Math.floor(this.log2(this._CONST.ZOOM / mPPx));
	};

	/**
	 * Move point coordinates by angle in degrees.
	 * 
	 * @param  {Object} point
	 * @param  {Number} point.x Point coordinates - axe x
	 * @param  {Number} point.y Point coordinates - axe y
	 * @param  {Number} angle Angle in degrees CW
	 * @member $math
	 */
	this.movePointByAngle = function(point, angle) {
		let rad = (360 - angle) / 180 * Math.PI;
		let x = point.x;
		let y = point.y;

		point.x = x * Math.cos(rad) - y * Math.sin(rad);
		point.y = x * Math.sin(rad) + y * Math.cos(rad)
	};

	/**
	 * Move point by vector, you can also rotate vector by angle in degrees.
	 * 
	 * @param  {Object} point
	 * @param  {Number} point.x Point coordinates - axe x
	 * @param  {Number} point.y Point coordinates - axe y
	 * @param  {Object} vector
	 * @param  {Number} vector.x Point coordinates - axe x
	 * @param  {Number} vector.y Point coordinates - axe y
	 * @param  {Number} [angle] Angle in degrees for vector rotation CW
	 * @member $math
	 */
	this.movePointByVector = function(point, vector, angle) {
		// because overwrite reference object
		let vectorSave = {
			x: vector.x,
			y: vector.y
		};

		this.movePointByAngle(vectorSave, angle || 0);

		point.x += vectorSave.x;
		point.y += vectorSave.y;
	};

	/**
	 * Set value in selected range.
	 * 
	 * @param {Number} value Input value
	 * @param {Number} min Min value
	 * @param {Number} max Max value
	 * @return {Number}
	 * @member $math
	 */
	this.setRange = function(value, min, max) {
		if (value < min) {
			return min;
		}
		else if (value > max) {
			return max;
		}
		else {
			return value;
		}
	};

	/**
	 * Get middle angle between start and end angle.
	 * Negative angle is computed like 360 + negative angle.
	 * 
	 * @param {Number} startAngle
	 * @param {Number} endAngle
	 * @return {Number}
	 * @member $math
	 */
	this.getMiddleAngle = function(startAngle, endAngle) {
		startAngle = startAngle || 0;
		endAngle = endAngle || 0;

		let value = ((startAngle + endAngle) / 2) % 180;

		return (value < 0 ? 360 + value : value);
	};
});

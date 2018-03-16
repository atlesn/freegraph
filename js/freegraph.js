/*

FreeGraph

Copyright (C) 2018 Atle Solbakken atle@goliathdns.no

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/

function setAttributeToElements (elements, attribute, value) {
	for (var i = 0; i < elements.length; i++) {
		elements[i].setAttribute(attribute, value);
	}
}

function FreeGraphAxis(name, direction) {
	this.name = name;
	this.ticks = 10;

	this.min_address = null;
	this.max_address = null;
	this.range = undefined;
	this.intersect = undefined;
	this.ticks_spacing = undefined;
	this.labels_count = undefined;

	this.abstract_line = undefined;

	if (direction == undefined) {
		throw "direction argument not given to FreeGraphAxis constructor";
	}
	else if (direction != "horizontal" && direction != "vertical") {
			throw "invalid direction argument '" + direction + "' given to FreeGraphAxis constructor"; 
	}

	this.direction = direction;

	this.getAddressDistance = function(address) {
		if (this.range == undefined) {
			throw "getAddressPosition called before fitAddresses";
		}
		if (this.abstract_line == undefined) {
			throw "getAddressPosition called before setAbstractLine";
		}

		return this.abstrace_line.getDistance(this.range / address.getInteger());
	}
	
	this.reset = function() {
		this.min_address = null;
		this.max_address = null;
	}

	this.fitAddresses = function(addresses) {
		for (var i = 0; i < addresses.length; i++) {
			if (this.min_address == null) {
				this.min_address = addresses[i];
				this.max_address = addresses[i];
				continue;
			}

			if (addresses[i].cmp(this.min_address) < 0) {
				this.min_address = addresses[i];
			}
			if (this.max_address.cmp(addresses[i]) < 0) {
				this.max_address = addresses[i];
			}
		}

		this.range = this.max_address.getInteger() - this.min_address.getInteger();
		this.ticks_spacing = this.range / this.ticks;
		this.intersect = (
			this.max_address.getInteger() < 0 ?
			-this.min_address.getInteger() - -this.max_address.getInteger() :
			(
				this.min_address.getInteger() < 0 ?
				-this.min_address.getInteger() :
				0
			)
		);

		console.log ("Min/max value for axis " + this.name + " is " + this.min_address.getInteger() + "/" + this.max_address.getInteger() + " intersect: " + this.intersect);
	}

	this.getLabelCount = function() {
		if (this.labels_count == undefined) {
			throw "getLabels() must be called prior to getLabelsCount()";
		}
		return this.labels_count;
	}

	this.getLabels = function() {
		var ret = Array();
		// TODO : Transformation to other value text types
		var ticks_spacing = Math.floor(this.ticks_spacing);
		if (ticks_spacing == 0) {
			ticks_spacing = 1;
		}
		for (var i = this.min_address.getInteger(); i < this.max_address.getInteger(); i += ticks_spacing) {
			ret.push("" + i);
		}

		// Add label at the end
		ret.push("" + this.max_address.getInteger());
		
		this.labels_count = ret.length;

		return ret;
	}

	this.getAbstract1DVector = function(value) {
		var distance = value - this.min_address.getInteger();
		var factor = distance / this.range;
	
		return this.abstract_line.getAbstract1DVector(factor);
	}
	
	this.getAbstractTicks = function() {
		return this.abstract_line.generateTicks(this);
	}

	this.getAbstractLabels = function() {
		return this.abstract_line.generateLabels(this);
	}

	this.getIntersectPosition = function() {
		return this.intersect / this.range;
	}

	this.setAbstractLine = function(abstract_line) {
		this.abstract_line = abstract_line;
	}

	this.draw = function(canvas) {
		// Axes
		canvas.drawProjectLine(this.abstract_line).setAttribute("class", "axis");

		var transform = this.abstract_line.getLineTransformationFactors();

		var label_elements = canvas.drawLabels(this);

		console.log ("Theta: " + transform.theta + " PI/2: " + Math.PI/2);

		// TODO : Make better transformation for non-vertical/non-horizontal axes
		if (transform.theta > -Math.PI/2 && transform.theta < Math.PI/2) {
			setAttributeToElements(label_elements, "class", "axis-legend axis-legend-horizontal");
		}
		else {
			setAttributeToElements(label_elements, "class", "axis-legend axis-legend-vertical");
		}

		setAttributeToElements(canvas.drawTicks(this), "class", "axis-tick");
	}
}

function FreeGraphPointAddress(value, cmp_function) {
	this.value = value;

	if (cmp_function == undefined) {
		this.cmp = function(arg) {
			return this.value - arg.value;
		};
	}
	else {
		this.cmp = cmp_function;
	}

	this.getInteger = function() {
		return 0 + this.value;
	}
}

function FreeGraphPoint(addresses) {
	this.addresses = new Array();

	if (Array.isArray(addresses)) {
		this.addresses = addresses;
	}
	else {
		this.addresses.push(addresses);
	}

	this.getAddress = function(index) {
		return addresses[index];
	}
	
	this.getLabel = function() {
		var label = "";
		for (var i = 0; i < this.addresses.length; i++) {
			if (i > 0) {
				label = label + ",";
			}
			label = label + this.addresses[i].getInteger();
		}
		return label;
	}
}

function FreeGraphSeries(name, axes) {
	this.name = name;
	this.points = new Array();
	this.axes = new Array();

	if (axes == undefined) {
		throw "axes not defined for newFreeGraphSeries()";
	}
	else if (Array.isArray(axes)) {
		if (axes.length > 3) {
			throw "Cannot have more than 3 axes for a series, but " + axes.length + " was given";
		}
		for (var i = 0; i < axes.length; i++) {
			this.axes.push(axes[i]);
		}
	}
	else {
		this.axes.push(axes);
	}

	// Adapt the axis to our data
	this.fitAxes = function() {
		for (var i = 0; i < this.axes.length; i++) {
			var axis = this.axes[i];
			var addresses = new Array();
			for (var j = 0; j < this.points.length; j++) {
				addresses.push(this.points[j].getAddress(i));
			}
			axis.reset();
			axis.fitAddresses(addresses);
		}
	}

	this.draw = function (canvas) {
		var points = new Array();
		for (var i = 0; i < this.points.length; i++) {
			var point = this.points[i];

			var vectors = new Array();
			for (var j = 0; j < this.axes.length; j++) {
				var vector = this.axes[j].getAbstract1DVector(point.getAddress(j).getInteger());
				vectors.push(vector);
			}

			var x;
			var y;

			if (vectors.length == 1) {
				x = vectors[0].x * Math.cos(vectors[0].theta);
				y = 0;
			}
			else if (vectors.length == 2) {
				x = vectors[0].x;
				y = vectors[1].x;

				console.log ("x, y: " + x + "," + y);

				var common_theta = vectors[1].theta - vectors[0].theta;
			
				console.log ("Theta y: " + vectors[1].theta + " sin theta y " + Math.sin(vectors[1].theta));
				console.log ("Theta x: " + vectors[0].theta + " cos theta x " + Math.cos(vectors[0].theta));

				x *= Math.cos(vectors[0].theta);
				y *= Math.sin(vectors[1].theta);

				// TODO : Transform common axis skew (advanced)

				// We just assume axis 0 is horizontal and axis 1 is vertical
				x += vectors[0].start_x;
				y += vectors[1].start_y;
				
				console.log ("xt, yt: " + x + "," + y);
				
			}
			else {
				throw "given number of axes not supported (" + vectors.length + ")";
			}

			console.log ("New point at " + x + "x" + y);

			points.push(new FreeGraphAbstractLabel(x, y, point.getLabel()));
		}
		
		canvas.drawPoints(points);
	}

	// Add a new point to the series, the number of points must match the number of axes
	this.newPoint = function(axis_addresses_ints) {
		if (axis_addresses_ints == undefined || axis_addresses_ints == null || !Array.isArray(axis_addresses_ints)) {
			throw "Invalid non-array axis addresses argument given to FreeGraphSeries.newPoint(): " + axis_addresses_ints;
			return false;
		}
		if (axis_addresses_ints.length != this.axes.length) {
			throw "Invalid number of axis adresses given to FreeGraphSeries.addPoint(). " +
					axis_addresses_ints.length + " was given but " + this.axes.length + " are required";
			return false;
		}

		var addresses = new Array();
		for (var i = 0; i < axis_addresses_ints.length; i++) {
			addresses.push(new FreeGraphPointAddress(axis_addresses_ints[i]));
		}

		this.points.push(new FreeGraphPoint(addresses));

		return true;
	}
}

function FreeGraphPlane(axes, canvas, x1, y1, x2, y2) {
	this.x1 = x1;
	this.y1 = y1;
	this.x2 = x2;
	this.y2 = y2;

	this.axes = axes;
	this.canvas = canvas;

	this.draw = function (series) {
		var horizontal_axis = null;
		var vertical_axis = null;

		for (var i = 0; i < series.length; i++) {
			var series_ = series[i];
			// TODO : Should we sort the data?
			series_.fitAxes();
		}

		for (var i = 0; i < this.axes.length; i++) {
			var axis = this.axes[i];
			if (axis.direction == "horizontal") {
				if (horizontal_axis != null) {
					throw "More than 1 horizontal axis defined for FreeGraphPlane.drawAxes()";
				}
				horizontal_axis = this.axes[i];
			}
			else if (axis.direction == "vertical") {
				if (vertical_axis != null) {
					throw "More than 1 vertical axis defined for FreeGraphPlane.drawAxes()";
				}
				vertical_axis = this.axes[i];
			}
			else {
				throw "Unknown axis direction '" + axis.direction + "' for FreeGraphPlane.drawAxes()";
			}
		}

		console.log("Get axes intersection positions");
		var vertical_intersect = vertical_axis.getIntersectPosition();
		var horizontal_intersect = horizontal_axis.getIntersectPosition();

		console.log("Generate abstract lines");

		var vertical_line = new FreeGraphAbstractProjectLine(
				this.x1, this.y2, 1, this.x1, this.y1,
				horizontal_intersect, 0, this.canvas.width, this.canvas.height
		);

		var horizontal_line = new FreeGraphAbstractProjectLine(
				this.x1, this.y2, 0, this.x2, this.y2,
				0, vertical_intersect, this.canvas.width, this.canvas.height
		);

		vertical_axis.setAbstractLine(vertical_line);
		horizontal_axis.setAbstractLine(horizontal_line);

		vertical_axis.draw(this.canvas);
		horizontal_axis.draw(this.canvas);

		// The series should already contain their axes which they get relative
		// position formation from
		for (var i = 0; i < series.length; i++) {
			console.log("Drawing series " + i);
			series[i].draw (canvas);
		}
	}
}

function FreeGraphCanvas(width, height) {
	// innerHTML-hack, problems with setting width and height at least in Chrome
	//var element_text = "<svg width='" + width + "' height='" + height + "' version='1.1'></svg>";
	//parent.innerHTML = element_text;
	this.element = document.createElementNS('http://www.w3.org/2000/svg', "svg:svg");
	this.element.setAttribute("width", width);
	this.element.setAttribute("height", height);
	this.element.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");

	// TODO : check real size of SVG
	this.width = width;
	this.height = height;

	this.clear = function() {
		while (this.element.childNodes.length > 0) {
			this.element.removeChild(this.element.childNodes[0]);
		}
	}

	this.getElement = function() {
		return this.element;
	}

	this.drawLine = function(line) {
		var element = document.createElementNS('http://www.w3.org/2000/svg','line');

		// Reverse Y to fit reverse canvas coordinates
		element.setAttribute('x1', line.x1);
		element.setAttribute('y1', this.height - line.y1);
		element.setAttribute('x2', line.x2);
		element.setAttribute('y2', this.height - line.y2);

		this.element.appendChild(element);

		return element;
	}

	this.drawTicks = function(axis) {
		var ret = new Array();

		var ticks = axis.getAbstractTicks();

		for (var i = 0; i < ticks.length; i++) {
			ret.push(this.drawLine(ticks[i]));
		}

		return ret;
	}

	this.drawLabel = function(label) {
		var element = document.createElementNS('http://www.w3.org/2000/svg','text');

		// Reverse Y to fit reverse canvas coordinates
		element.setAttribute("x", label.x);
		element.setAttribute("y", this.height - label.y);
		element.innerHTML = label.label;

		this.element.appendChild(element);

		return element;
	}

	this.drawLabels = function(axis) {
		var labels = axis.getLabels();
		var labels_count = labels.length;

		var ret = new Array();

		var labels = axis.getAbstractLabels();

		for (var i = 0; i < labels.length; i++) {
			ret.push(this.drawLabel(labels[i]));
		}

		return ret;
	}

	this.drawPoint = function(label) {
		var element = document.createElementNS('http://www.w3.org/2000/svg','circle');

		// Reverse Y to fit reverse canvas coordinates
		element.setAttribute("cx", label.x);
		element.setAttribute("cy", this.height - label.y);
		element.setAttribute("r", 4);

		element.innerHTML = "<!-- " + label.label + " -->";
		
		this.element.appendChild(element);

		return element;
	}
	
	this.drawPoints = function(points) {
		var labels = points;

		var ret = new Array();
		
		var prev_label = null
		for (var i = 0; i < labels.length; i++) {
			ret.push(this.drawPoint(labels[i]));

			if (prev_label != null) {
				var line = new FreeGraphAbstractLine(prev_label.x, prev_label.y, labels[i].x, labels[i].y);
				this.drawLine(line);
				ret.push(line);
			}
			
			prev_label = labels[i];
		}

		return ret;
	}
	
	this.drawProjectLine = function(line) {
		var element = document.createElementNS('http://www.w3.org/2000/svg','line');

		// Reverse Y to fit reverse canvas coordinates
		element.setAttribute('x1', line.start_x);
		element.setAttribute('y1', this.height - line.start_y);
		element.setAttribute('x2', line.stop_x);
		element.setAttribute('y2', this.height - line.stop_y);

		this.element.appendChild(element);

		return element;
	}
}

function FreeGraphAbstractLine(x1, y1, x2, y2) {
	this.x1 = x1;
	this.y1 = y1;
	this.x2 = x2;
	this.y2 = y2;
}

function FreeGraphAbstractLabel(x, y, label) {
	this.x = x;
	this.y = y;
	this.label = label;
}

function FreeGraphAbstract1DVector(theta, x, start_x, start_y) {
	this.theta = theta;
	this.x = x;
	this.start_x = start_x;
	this.start_y = start_y;
}

/*
 * A line with a start point and an angle with automatic length bounded by the canvas width and height
 */
function FreeGraphAbstractProjectLine(start_x, start_y, direction, margin_x, margin_y, factor_x, factor_y, canvas_width, canvas_height) {
	// TODO : Support angles not just horizontal/vertical
	if (direction != 0 && direction != 1) {
		throw "direction to FreeGraphAbstractProjectLine must be 1 or 0, " + direction + " was given";
	}
	
	
	var max_x = canvas_width - margin_x;
	var max_y = canvas_height - margin_y;

	var offset_x = Math.floor((max_x - start_x) * factor_x);
	var offset_y = Math.floor((max_y - start_y) * factor_y);

	console.log ("start x: " + start_x + " start_y: " + start_y + "offset_x:" + offset_x + "offset_y: " + offset_y);
	start_x += offset_x;
	start_y += offset_y;

	var stop_y = (direction == 1 ? max_y : start_y);
	var stop_x = (direction == 0 ? max_x : start_x);

	this.start_x = start_x;
	this.start_y = start_y;
	this.stop_x = stop_x;
	this.stop_y = stop_y;

	this.distance_x = stop_x - start_x;
	this.distance_y = stop_y - start_y;

	// Calculate transformation factors for transforming the large triangle
	// with the line as hyp to the congruent smaller triangels with hyp distances
	// equal to a point along the line
	this.getLineTransformationFactors = function(count) {
		var ret = {};

		ret.distance_max = Math.sqrt(Math.pow(this.distance_x, 2) + Math.pow(this.distance_y, 2));
		ret.interval = ret.distance_max / count;
		ret.factor_x = this.distance_x / ret.distance_max;
		ret.factor_y = this.distance_y / ret.distance_max;
		ret.theta = Math.acos(this.distance_x / ret.distance_max);

		return ret;
	}

	this.getAbstract1DVector = function(factor) {
		var distance_max = Math.sqrt(Math.pow(this.distance_x, 2) + Math.pow(this.distance_y, 2));
		var theta = Math.acos(this.distance_x / distance_max);
		
		console.log("factor: " + factor);
		
		return new FreeGraphAbstract1DVector(theta, distance_max*factor, this.start_x, this.start_y);
	}
	
	this.generateTicks = function(axis) {
		var count = axis.getLabelCount() - 1; // The last tick is at the very end, subtract 1
		var transform = this.getLineTransformationFactors(count);
		var origin = axis.getIntersectPosition() * transform.distance_max;

		// Length on one side of the axis
		var tick_length = 3;

		// Get angle of axis
		var theta = transform.theta;

		// Rotate 90 degrees anti-clockwise
		theta -= Math.PI / 2;

		var tick_offset = 3;
		var tick_offset_x1 = tick_offset * Math.cos(theta); 
		var tick_offset_y1 = tick_offset * Math.sin(theta); 

		// Rotate 180 degrees anti-clockwise
		theta -= Math.PI;

		var tick_offset_x2 = tick_offset * Math.cos(theta); 
		var tick_offset_y2 = tick_offset * Math.sin(theta); 

		var ret = new Array();
		for (var i = 0.0; Math.round(i) <= Math.round(transform.distance_max); i += transform.interval) {
			// Don't create tick at axis intersection
			if (Math.floor(i) == Math.floor(origin)) {
				continue;
			}

			var distance_x = this.start_x + transform.factor_x * i;
			var distance_y = this.start_y + transform.factor_y * i;

			var x1 = distance_x + tick_offset_x1;
			var y1 = distance_y + tick_offset_y1;

			var x2 = distance_x + tick_offset_x2;
			var y2 = distance_y + tick_offset_y2;

			ret.push(new FreeGraphAbstractLine(x1, y1, x2, y2));
		}

		return ret;
	}

	this.generateLabels = function(axis) {
		var labels = axis.getLabels();

		var transform = this.getLineTransformationFactors(labels.length - 1);
		var origin = axis.getIntersectPosition() * transform.distance_max;

		var ret = new Array();
		var j = 0;
		for (var i = 0.0; Math.round(i) <= Math.round(transform.distance_max); i += transform.interval) {
			// Don't print label at axis intersection
			if (Math.floor(i) == Math.floor(origin)) {
				j++;
				continue;
			}

			//console.log("New label i: " + i + " max: " + transform.distance_max);

			var distance_x = this.start_x + transform.factor_x * i;
			var distance_y = this.start_y + transform.factor_y * i;

			ret.push(new FreeGraphAbstractLabel(distance_x, distance_y, labels[j++]));
		}

		return ret;
	}

//	alert ("Factor x" + factor_x + "Factor y" + factor_y);
//	alert ("Start x: " + start_x + " Start y: " + start_y + " Stop x: " + stop_x + " Stop y: " + stop_y + " offset x: " + offset_x + " offset y: " + offset_y);

}

function FreeGraphBase(parent, width, height, axes) {
	this.parent = parent;
	this.axes = new Array();

	for (var i = 0; i < axes.length; i++) {
		this.axes.push(axes[i]);
	}

	this.canvas = new FreeGraphCanvas(width, height);
	this.parent.appendChild(this.canvas.getElement());

	this.series = new Array();
	this.plane = new FreeGraphPlane(this.axes, this.canvas, 20, 20, 20, 20);

	this.newSeries = function (name) {
		var series = new FreeGraphSeries(name, this.axes);
		this.series.push(series);
		return series;
	}

	this.update = function() {
		this.canvas.clear();
		this.plane.draw(this.series);
	}
}

function newLineChart(canvas, width, height) {
	var obj = new FreeGraphBase(canvas, width, height, [new FreeGraphAxis("X", "horizontal"), new FreeGraphAxis("Y", "vertical")]);

	return obj;
}
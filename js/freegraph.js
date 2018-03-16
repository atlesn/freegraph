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

function FreeGraphAxis(name, direction) {
	this.name = name;
	this.ticks = 10;

	this.min_address = null;
	this.max_address = null;
	this.range = undefined;
	this.intersect = undefined;
	this.ticks_spacing = undefined;
	this.labels_count = undefined;
	
	if (direction == undefined) {
		throw "direction argument not given to FreeGraphAxis constructor";
	}
	else if (direction != "horizontal" && direction != "vertical") {
			throw "invalid direction argument '" + direction + "' given to FreeGraphAxis constructor"; 
	}

	this.direction = direction;
	
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
		this.intersect = (this.min_address.getInteger() < 0 ? -this.min_address.getInteger() : 0);

//		alert ("Min/max value for axis " + this.name + " is " + this.min_address.getInteger() + "/" + this.max_address.getInteger());
	}

	this.getLabelsCount = function() {
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
		
		this.labels_count = ret.length;
		
		return ret;
	}

	this.getIntersectPosition = function() {
		return this.intersect / this.range;
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
}

function FreeGraphSeries(name, axes) {
	this.name = name;
	this.points = new Array();
	this.axes = new Array();

	if (axes == undefined) {
		throw "axes not defined for newFreeGraphSeries()";
	}
	else if (Array.isArray(axes)) {
		for (var i = 0; i < axes.length; i++) {
			this.axes.push(axes[i]);
		}
	}
	else {
		this.axes.push(axes);
	}

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

/*
 * x1, y1 = position relative to top left corner of canvas
 * x2, y2 = position relative to bottom right corner of canvas
 */
function FreeGraphPlane(x1, y1, x2, y2) {
	this.x1 = x1;
	this.y1 = y1;
	this.x2 = x2;
	this.y2 = y2;
	
	this.setAttributeToElements = function(elements, attribute, value) {
		for (var i = 0; i < elements.length; i++) {
			elements[i].setAttribute(attribute, value);
		}
	}
	
	this.drawAxes = function (canvas, axes) {
		var horizontal_axis = null;
		var vertical_axis = null;

		for (var i = 0; i < axes.length; i++) {
			var axis = axes[i];
			if (axis.direction == "horizontal") {
				if (horizontal_axis != null) {
					throw "More than 1 horizontal axis defined for FreeGraphPlane.drawAxes()";
				}
				horizontal_axis = axes[i];
			}
			else if (axis.direction == "vertical") {
				if (vertical_axis != null) {
					throw "More than 1 vertical axis defined for FreeGraphPlane.drawAxes()";
				}
				vertical_axis = axes[i];
			}
			else {
				throw "Unknown axis direction '" + axis.direction + "' for FreeGraphPlane.drawAxes()";
			}
		}

		console.log("Get axes intersection positions");
		var vertical_intersect = vertical_axis.getIntersectPosition();
		var horizontal_intersect = horizontal_axis.getIntersectPosition();

		// Axes
		console.log("Generate abstract lines");
		var vertical_line = new FreeGraphAbstractProjectLine(this.x1, this.y2, 1, this.x1, this.y1, horizontal_intersect, 0, canvas.width, canvas.height);
		var horizontal_line = new FreeGraphAbstractProjectLine(this.x1, this.y2, 0, this.x2, this.y2, 0, vertical_intersect, canvas.width, canvas.height);

		canvas.drawProjectLine(vertical_line).setAttribute("class", "axis");
		canvas.drawProjectLine(horizontal_line).setAttribute("class", "axis");
		
		console.log("Draw labels");
		this.setAttributeToElements(canvas.drawLabels(vertical_line, vertical_axis), "class", "axis-legend axis-legend-vertical");
		this.setAttributeToElements(canvas.drawLabels(horizontal_line, horizontal_axis), "class", "axis-legend axis-legend-horizontal");

		console.log("Draw label ticks");
		this.setAttributeToElements(canvas.drawTicks(vertical_line, vertical_axis), "class", "axis-tick");
		this.setAttributeToElements(canvas.drawTicks(horizontal_line, horizontal_axis), "class", "axis-tick");
		
		
		//points = spreadPointsOnLine();
	}
}

function FreeGraphCanvas(parent, width, height) {
	// innerHTML-hack, problems with setting width and height at least in Chrome
	//var element_text = "<svg width='" + width + "' height='" + height + "' version='1.1'></svg>";
	//parent.innerHTML = element_text;
	this.element = document.createElementNS('http://www.w3.org/2000/svg', "svg:svg");
	this.element.setAttribute("width", width);
	this.element.setAttribute("height", height);
	this.element.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
	parent.appendChild(this.element);
	
	// TODO : check real size of SVG
	this.width = width;
	this.height = height;

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
	
	this.drawTicks = function(line, count) {
		var ret = new Array();

		var ticks = line.generateTicks(count);

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

	this.drawLabels = function(line, labels, with_ticks) {
		var labels_count = labels.length;
		var ret = new Array();

		var labels = line.generateLabels(labels);

		for (var i = 0; i < labels.length; i++) {
			ret.push(this.drawLabel(labels[i]));
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

function FreeGraphAbstractProjectLine(start_x, start_y, direction, margin_x, margin_y, factor_x, factor_y, canvas_width, canvas_height) {
	if (direction != 0 && direction != 1) {
		throw "direction to FreeGraphAbstractProjectLine must be 1 or 0, " + direction + " was given";
	}

	var max_x = canvas_width - margin_x;
	var max_y = canvas_height - margin_y;

	var offset_x = Math.floor((max_x - start_x) * factor_x);
	var offset_y = Math.floor((max_y - start_y) * factor_y);

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

		return ret;
	}

	this.generateTicks = function(axis) {
		var count = axis.getLabelsCount();
		var transform = this.getLineTransformationFactors(count);
		var origin = axis.getIntersectPosition() * transform.distance_max;
	
		// Length on one side of the axis
		var tick_length = 3;
		
		// Get angle of axis
		var theta = Math.acos(this.distance_x / transform.distance_max);
		console.log("Theta: " + theta);
		
		// Rotate 90 degrees anti-clockwise
		theta -= Math.PI / 2;
		
		var tick_offset = 3;
		var tick_offset_x1 = tick_offset * Math.cos(theta); 
		var tick_offset_y1 = tick_offset * Math.sin(theta); 
		
		// Rotate 180 degrees anti-clockwise
		theta -= Math.PI;

		var tick_offset_x2 = tick_offset * Math.cos(theta); 
		var tick_offset_y2 = tick_offset * Math.sin(theta); 

		console.log("Tick offsets " + tick_offset_x1 + "x" + tick_offset_y1 + " - " + tick_offset_x2 + "x" + tick_offset_y2);
		
		var ret = new Array();
		for (var i = 0.0; Math.round(i) < Math.round(transform.distance_max); i += transform.interval) {
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

		var transform = this.getLineTransformationFactors(labels.length);
		var origin = axis.getIntersectPosition() * transform.distance_max;
		
		var ret = new Array();
		var j = 0;
		for (var i = 0.0; Math.round(i) < Math.round(transform.distance_max); i += transform.interval) {
			// Don't print label at axis intersection
			if (Math.floor(i) == Math.floor(origin)) {
				j++;
				continue;
			}

			console.log("New label i: " + i + " max: " + transform.distance_max);
			
			var distance_x = this.start_x + transform.factor_x * i;
			var distance_y = this.start_y + transform.factor_y * i;

			ret.push(new FreeGraphAbstractLabel(distance_x, distance_y, labels[j++]));
		}

		return ret;
	}

//	alert ("Factor x" + factor_x + "Factor y" + factor_y);
//	alert ("Start x: " + start_x + " Start y: " + start_y + " Stop x: " + stop_x + " Stop y: " + stop_y + " offset x: " + offset_x + " offset y: " + offset_y);

}

function FreeGraphBase(parent, width, height) {
	this.parent = parent;
	this.axes = new Array();
	
	this.canvas = new FreeGraphCanvas(parent, width, height);
	this.parent.appendChild(this.canvas.getElement());

	this.series = new Array();
	this.plane = new FreeGraphPlane(20, 20, 20, 20);
	
	this.newSeries = function (name) {
		var series = new FreeGraphSeries(name, this.axes);
		this.series.push(series);
		return series;
	}

	this.update = function() {
		for (var i = 0; i < this.series.length; i++) {
			var series = this.series[i];
			series.fitAxes();
		}
		this.plane.drawAxes(this.canvas, this.axes);
	}
}

function newLineChart(canvas, width, height) {
	var obj = new FreeGraphBase(canvas, width, height);

	obj.axes.push(new FreeGraphAxis("X", "horizontal"));
	obj.axes.push(new FreeGraphAxis("Y", "vertical"));

	return obj;
}
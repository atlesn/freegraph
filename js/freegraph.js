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

function newFreeGraphAxis(name) {
	var obj = function(){};
	
	obj.name = name;
	
	obj.isAxis = function() {
		return true;
	}
	
	return obj;
}

function newFreeGraphPointAddress(value) {
	var obj = function(){};
	
	obj.value = value;
	
	return obj;
}

function newFreeGraphPoint(addresses) {
	var obj = function(){};

	obj.addresses = new Array();

	if (Array.isArray(addresses)) {
		obj.addresses = addresses;
	}
	else {
		obj.addresses.push(addresses);
	}

	return obj;
}

function newFreeGraphSeries(name, axes) {
	var obj = function(){};

	obj.name = name;
	obj.points = new Array();
	obj.axes = new Array();
	
	if (axes == undefined) {
		alert("axes not defined for newFreeGraphSeries()");
		return NULL;
	}
	else if (Array.isArray(axes)) {
		for (var i = 0; i < axes.length; i++) {
			var axis = axes[i];
			if (axis.isAxis == undefined) {
				alert("axes number " + i + " in argument of newFreeGraphSeries() was not an axis object");
				return NULL;
			}
			obj.axes.push(axis);
		}
	}
	else if (axes.isAxis == undefined) {
		alert("incorrect object type for axes argument to newFreeGraphSeries()");
		return NULL;
	}
	else {
		obj.axes.push(axes);
	}

	obj.newPoint = function(axis_addresses_ints) {
		if (axis_addresses_ints == undefined || axis_addresses_ints == null || !Array.isArray(axis_addresses_ints)) {
			alert("Invalid non-array axis addresses argument given to newFreeGraphSeries.newPoint(): " + axis_addresses_ints);
			return false;
		}
		if (axis_addresses_ints.length != obj.axes.length) {
			alert("Invalid number of axis adresses given to newFreeGraphSeries.addPoint(). " +
					axis_addresses_ints.length + " was given but " + obj.axes.length + " is required");
			return false;
		}

		var addresses = new Array();
		for (var i = 0; i < axis_addresses_ints.length; i++) {
			addresses.push(newFreeGraphPointAddress(axis_addresses_ints[i]));
		}

		obj.points.push(newFreeGraphPoint(addresses));

		return true;
	}

	return obj;
}

function newFreeGraphBase(parent) {
	var obj = function(){};
	
	obj.parent = parent;

	obj.canvas = document.createElement("canvas");
	obj.parent.appendChild(obj.canvas);

	obj.update = function() {
		alert("Canvas is " + obj.canvas);
	}

	return obj;
}

function newLineChart(canvas) {
	var obj = newFreeGraphBase(canvas);

	obj.x_axis = newFreeGraphAxis("X");
	obj.y_axis = newFreeGraphAxis("Y");
	obj.series = new Array();

	obj.newSeries = function (name) {
		var series = newFreeGraphSeries(name, [obj.x_axis, obj.y_axis]);
		obj.series.push(series);
		return series;
	}

	return obj;
}
# FreeGraph
## Description
Draw graphs and charts on a web page with a simple framework with the FreeGraph Javascript library

## Status
FreeGraph is currently under development, new functionality and ideas are welcome.

## Usage

Link to the FreeGraph javascript and stylesheet in the `<head>` section of the HTML-document:

    <script type="text/javascript" src="freegraph.js"></script>
    <link rel="stylesheet" type="text/css" href="default.css" />

Create a base element where you wish to draw the graph in the `<body>` section of the HTML-document.

    <div id="linechart-canvas"></div>

Place the control code somewhere below the base element in the `<body>` section.

    <script type="text/javascript">

    var grapher = newLineChart(document.getElementById("linechart-canvas"));

    var blue_series = grapher.newSeries("Blue Line");

    blue_series.newPoint([2,2]);
    blue_series.newPoint([4,3]);
    blue_series.newPoint([6,4]);
    blue_series.newPoint([8,5]);
    blue_series.newPoint([10,6]);

    grapher.update();

    </script>

## Contact
github.com/atlesn/freegraph

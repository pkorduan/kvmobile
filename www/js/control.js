/***																	***/
/*** General Functions ***/
/***																	***/
/*** Awesome Font imitation mouseover ***/
$("#showHaltestelle").mouseover(function() {
	$("#showHaltestelle_button").hide();
	$("#showHaltestelle_button_white").show();
});
$("#showHaltestelle").mouseleave(function() {
	$("#showHaltestelle_button").show();
	$("#showHaltestelle_button_white").hide();
});

$("#showLine").mouseover(function() {
	$("#showLine_button").hide();
	$("#showLine_button_white").show();
});
$("#showLine").mouseleave(function() {
	$("#showLine_button").show();
	$("#showLine_button_white").hide();
});

/* Clientside Filter according to http://stackoverflow.com/questions/12433835/client-side-searching-of-a-table-with-jquery */
/*** Search Haltestelle ***/
$("#searchHaltestelle").on("keyup paste", function() {
	var value = $(this).val().toUpperCase();
	var $rows = $("#haltestellen_table tr");
	if(value === ''){
		$rows.show(500);
		return false;
	}
	$rows.each(function(index) {
		$row = $(this);
		var column = $row.find("td a").html().toUpperCase();
		if (column.indexOf(value) > -1) {
			$row.show(500);
		}
		else {
			$row.hide(500);
		}
	});
});

/*** Search Linie ***/
$("#searchLinie").on("keyup paste", function() {
	var value = $(this).val().toUpperCase();
	var $rows = $("#linien_table tr");
	if(value === ''){
		$rows.show(500);
		return false;
	}
	$rows.each(function(index) {
		$row = $(this);
		var column = $row.find("td:first a").html().toUpperCase();
		if (column.indexOf(value) > -1) {
			$row.show(500);
		}
		else {
			$row.hide(500);
		}
});
});

$(".haltestelle").click(function() {
	showItem("formular");
	// Sets Name of Haltestelle
	$("#nameHaltestelle").val($(this).text());
});

/*** Menu Management ***/
function showItem(item) {
	switch (item) {
		case 'map':
			showDefaultMenu();
			$("#line, #haltestellen, #settings, #formular").hide();
			$("#map").show();
			break;
		case "line":
			showDefaultMenu();
			$("#map, #haltestellen, #settings, #formular").hide();
			$("#line").show();
			break;
		case "haltestelle":
			showDefaultMenu();
			$("#map, #line, #settings, #formular").hide();
			$("#haltestellen").show();
			break;
		case "settings":
			showDefaultMenu();
			$("#map, #line, #haltestellen, #formular").hide();
			$("#settings").show();
			break;
		case "formular":
			showFormMenu();
			$("#map, #line, #haltestellen, #settings").hide();
			$("#formular").show();
			break;
		default:
			showDefaultMenu();
			$("#line, #haltestellen, #settings, #formular").hide();
			$("#map").show();
	}
}

function showDefaultMenu() {
	$("#backArrow, #saveForm").hide();
	$("#showMap, #showLine, #showHaltestelle, #showSettings").show();
}

function showFormMenu() {
	$("#showMap, #showLine, #showHaltestelle, #showSettings").hide();
	$("#backArrow, #saveForm").show();
}

/***																			***/
/*** Open Layers specific ***/
/***																			***/
/*** Projection ***/
var myProjectionName = "EPSG:25832";
proj4.defs(myProjectionName, "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs");
var myProjection = ol.proj.get(myProjectionName);

/*** Set View **/
var view = new ol.View({
	projection: myProjection,
	center: ol.proj.transform([12.10,54.10], "EPSG:4326", "EPSG:25832"),
	extent: [655000.000000000, 5945000.000000000, 750000.000000000, 6030000.000000000],
	zoom: 12,
	minZoom: 11
});

/*** Set the Map***/
var map = new ol.Map({
	controls: [],
	layers: [],
	projection: "EPSG:25832",
	target: "map",
	view: view
});

var orkaMv= new ol.layer.Tile({
	source: new ol.source.TileWMS({
		url: "https://www.orka-mv.de/geodienste/orkamv/wms",
		params: {"LAYERS": "orkamv-gesamt",
										"VERSION": "1.3.0"}
	})
});
map.addLayer(orkaMv);
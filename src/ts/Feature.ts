import { Buffer } from "buffer";
import * as wkx from "wkx";
import * as L from "leaflet";
import { kvm } from "./app";
import { Layer } from "./Layer";
import { Klasse } from "./Klasse";
/*
 * Klasse zum Vorhalten der Datenobjekte zur Laufzeit der Anwendung
 * Ein Feature ist leer (außer die automatisch generierte uuid) wenn es neu angelegt werden soll
 * oder enthält die Daten eines Datensatzes des Layers.
 * Soll ein Feature editiert werden, wird dieses in das Formular geladen
 * Beim Speichern wird das Feature nicht über das Formular aktualisiert, sondern die Daten
 * aus dem Formular entnommen in die Datenbank geschrieben und dann sämtliche Daten neu geladen.
 * ToDo: Das ist sicher nicht sinnvoll, gerade wenn man viele Daten hat. Es sollte dann nur das Featureobjekt
 * neu gebildet werden und der Eintrag in der featureList und die Darstellung in der Karte.
 * Wir erfolgt die Änderung der Koordianten:
 *
 * Enthält folgende Transformations-Funktionen für Koordinaten
 * von einem Format zu, nächsten
 * wkb, wkx, latLng, aLatLng, latLngs, aLatLngs, coord, coords
 * latLngToWkx // z.B. latLng aus getCenter() übernehmen und für Feature speichern in wkx
 * aLatLngToWkx // z.B. um latitude und longitude von geolocation in Feature zu speichern
 * coordToWkx // z.B. um lng und lat aus Geolocation in Feature speichern
 * wkxToLatLngs // z.B. um aus Feature Marker oder Polylines in Karte zu zeichnen
 * wkxToLatLng // z.B. um von einem Punktfeature ein Marker zu erzeugen
 * wkbToWkx // um die PostGIS Geometrie in das Wkx Objekt zu übernehmen
 * wkxToEwkb // um die Geometrie von wkx Objekt in die PostGIS-Geometrie rauszuschreiben beim Speichern
 * aLatLngs und aCoords Funktionen sind identisch mit den ohne a, enthalten aber Arrays von LatLngs bzw. Coords
 * aLatLngs und aCoords können bei Polygon und Multi-Geometrien verschachtelt sein.
 * Wenn das Zentrale Format immer wkx ist, kann man mit fromXY und asXY alle Transformationen umsetzen
 */
export class Feature {
	data: any = {};
	options: any = {};
	id: string;
	layerId: number;
	globalLayerId: string;
	isEditable: boolean;
	isActive: boolean;
	editableLayer: any;
	newGeom: any;
	geom: any;

	constructor(
		data: any = {},
		options: any = {
			id_attribute: "uuid",
			geometry_type: "Point",
			geometry_attribute: "geom",
			globalLayerId: 0,
			new: true,
		}
	) {
		//console.log('Create Feature with data: %o and options: %o', data, options);
		this.data = typeof data == "string" ? JSON.parse(data) : data;
		this.options = options; // Optionen, die beim Erzeugen des Features mit übergeben wurden. Siehe Default-Argument in init-Klasse.
		this.id = this.data[options.id_attribute];
		this.layerId = null; // Leaflet Layer id des Layers (z.B. circleMarkers) in dem das Feature gezeichnet ist
		this.globalLayerId = options.globalLayerId; // Id des Layers zu dem das Feature gehört
		/*kvm
  console.log('Erzeuge eine editierbare Geometrie vom Feature');
  this.editableLayer = kvm.controller.mapper.createEditable(this); // In vorheriger Version wurde hier L.marker(kvm.map.getCenter()) verwendet. ToDo: muss das hier überhaupt gesetzt werden, wenn es denn dann doch beim setEditable erzeugt wird?
  */
		//console.log('Setze Feature auf im Moment nicht editierbar.');
		this.isEditable = false; // Feature ist gerade im Modus editierbar oder nicht
		this.isActive = false; // Feature is aktuell gerade ausgewählt, Style in Karte gändert und evtl. Popup offen oder nicht
		this.setGeomFromData();
	}
	get(key) {
		return typeof this.data[key] == "undefined" ? "null" : this.data[key];
	}

	setEditable(editable) {
		if (editable) {
			console.log("Setze feature: %s editierbar.", this.id);
			this.editableLayer = kvm.controller.mapper.createEditable(this);
			this.editableLayer.enableEdit();
			kvm.controller.mapper.bindEventHandler(this);
		} else {
			console.log("Entferne editierbare Geometrie von feature: %s.", this.id);
			this.editableLayer = kvm.controller.mapper.removeEditable(this);
		}
		this.isEditable = editable;
	}

	getWaypoint(end = "last") {
		var latlngs = this.editableLayer.getLatLngs();
		if (end == "last") {
			return latlngs[latlngs.length - 1];
		} else {
			return latlngs[0];
		}
	}

	getAsArray(key) {
		return this.data[key] ? this.data[key].slice(1, -1).split(",") : [];
	}

	getFeatureId() {
		return this.get(this.options.id_attribute);
	}

	findParentFeature() {
		let layer = kvm.layers[this.globalLayerId];
		let subFormFKAttribute = layer.attributes.find((attr) => attr.get('form_element_type') == 'SubFormFK');
		if (subFormFKAttribute === undefined) {
			return false;
		}
		else {
			let fkAttributeIndex = layer.attribute_index[subFormFKAttribute.getFKAttribute()];
			let parentFeatureId = layer.attributes[fkAttributeIndex].formField.getValue();
			let parentLayer = kvm.layers[subFormFKAttribute.getGlobalParentLayerId()];
			return parentLayer.features[parentFeatureId];
		}
	}

	set(key, value) {
		this.data[key] = value;
		return this.data[key];
	}

	getData() {
		return this.data;
	}

	setData(data) {
		//console.log('Feature.setData %o', data);
		this.data = typeof data == "string" ? JSON.parse(data) : data;
		this.setGeomFromData();
	}

	/*
	 * Setzt die Geometrie neu an Hand der übergebenen wkx Geometrie wenn sie sich gegenüber der vorherigen geändert hat.
	 * und lößt den Trigger aus, der angibt, dass sich die Geom des Features geändert hat.
	 */
	setGeom(wkx) {
		console.log("setGeom mit wkx: %o", wkx);
		console.log("Überschreibe oldGeom: %o mit newGeom: %o", this.oldGeom, this.newGeom);
		var oldGeom = this.newGeom;
		// console.log("Überschreibe newGeom mit wkx: %o", wkx);
		this.newGeom = wkx;
		// console.log("vergleiche oldGeom: %o mit newGeom: %o", oldGeom, this.newGeom);

		if (oldGeom != this.newGeom) {
			// console.log("Neuer Wert wurde gesetzt. Löse Trigger geomChanged mit exclude wkx aus.");
			$(document).trigger("geomChanged", [{ geom: this.newGeom, exclude: "wkx" }]);
		}
	}
	oldGeom(arg0: string, oldGeom: any, newGeom: any) {
		throw new Error("Method not implemented.");
	}

	/*
	 * Setzt die LatLngs des editableLayers auf die übergebene Geometrie
	 * falls das Feature schon einen editableLayer zugewiesen bekommen hat.
	 */
	setLatLngs(geom) {
		// console.log("setLatLngs in feature with geom: %o", geom);
		if (this.editableLayer) {
			var newLatLngs = this.wkxToLatLngs(geom),
				oldLatLngs = this.getLatLngs();

			// console.log("vergleiche alte mit neuer coord");
			if (oldLatLngs != newLatLngs) {
				// console.log("Ändere alte latlngs: %o auf neue: %o", oldLatLngs, newLatLngs);
				if (this.options.geometry_type == "Point") {
					this.editableLayer.setLatLng(newLatLngs);
				} else {
					this.editableLayer.setLatLngs(newLatLngs);
				}
				$(document).trigger("geomChanged", [{ geom: geom, exclude: "latlngs" }]);
			}
			// console.log("Neue latLngs für die Editable Geometry in der Karte: %o", newLatLngs);
		}
	}

	getLatLngs() {
		// console.log("Feature.getLatLngs()");
		if (this.options.geometry_type == "Point") {
			return this.editableLayer.getLatLng();
		} else {
			return this.editableLayer.getLatLngs();
		}
	}

	/*
	 * Gibt von einem WKX Geometry Objekt ein Array mit latlng Werten aus wie es für Leaflet Objekte gebraucht wird.
	 */
	wkxToLatLngs(geom = this.geom) {
		if (this.options.geometry_type == "Point") {
			// ToDo hier ggf. den Geometrietyp auch aus this.geometry_type auslesen und nicht aus der übergebenen geom
			// Problem dann, dass man die Funktion nur benutzen kann für den Geometrietype des activen Layer
			var coordsLevelDeep = kvm.controller.mapper.coordsLevelsDeep[geom.toWkt().split("(")[0].toUpperCase()];
			return coordsLevelDeep == 0
				? L.GeoJSON.coordsToLatLng(geom.toGeoJSON().coordinates)
				: L.GeoJSON.coordsToLatLngs(geom.toGeoJSON().coordinates, coordsLevelDeep);
		} else if (this.options.geometry_type == "Line") {
			if (geom.constructor.name === "LineString") {
				return geom.points.map(function (p) {
					return [p.y, p.x];
				});
			} else {
				return geom.lineStrings.map(function (lineString) {
					return lineString.map(function (point) {
						return [point.y, point.x];
					});
				});
			}
		} else if (this.options.geometry_type == "Polygon") {
			if (geom.constructor.name === "Polygon") {
				/* returns a latlngs array in the form
        [
          [[37, -109.05],[41, -109.03],[41, -102.05],[37, -102.04]], // outer ring
          [[37.29, -108.58],[40.71, -108.58],[40.71, -102.50],[37.29, -102.50]] // hole 1
          [[37.01, -108.58],[37.02, -108.58],[37.02, -102.50],[37.01, -102.50]] // hole 1
        ]
        */
				return [
					geom.exteriorRing.map(function (point) {
						return [point.y, point.x];
					}),
				].concat(
					geom.interiorRings.map(function (interiorRing) {
						return interiorRing.map(function (point) {
							return [point.y, point.x];
						});
					})
				);
			} else {
				/* return a latlngs array for MultiPolygon in the form
       [
          [ // first polygon
            [[37, -109.05],[41, -109.03],[41, -102.05],[37, -102.04]], // outer ring
            [[37.29, -108.58],[40.71, -108.58],[40.71, -102.50],[37.29, -102.50]] // hole
          ],
          [ // second polygon
            [[41, -111.03],[45, -111.04],[45, -104.05],[41, -104.05]]
          ]
        ]
        */
				return geom.polygons.map(function (polygon) {
					return [
						polygon.exteriorRing.map(function (point) {
							return [point.y, point.x];
						}),
					].concat(
						polygon.interiorRings.map(function (interiorRing) {
							return interiorRing.map(function (point) {
								return [point.y, point.x];
							});
						})
					);
				});
			}
			//      return [geom.exteriorRing.map(function(point) { return [point.y, point.x]; }).slice(0, -1)].concat(geom.interiorRings.map(function(interiorRing) { return interiorRing.map(function(point) { return [ point.x, point.y]; }).slice(0, -1); }));
		}
	}

	/*
	 * Erzeugt an Hand des übergebenen wkb Strings ein wkx-Geometry-Objekt mit eastnorth Werten
	 */
	wkbToWkx(wkb) {
		return wkx.Geometry.parse(<any>new Buffer(wkb, "hex"));
	}

	/*
	 * Konvertiert das Array von Lat,Lng Werten alatlngs in ein wkx.Geometry-Objekt
	 * Je nach dem ob das Feature ein Punkt, Linie oder Fläche ist wird daraus eine entsprechende WKX-Geometrie gemacht
	 * Die Funktion wandelt die Koordinatenachsenreihenfolge von latlng auf eastnorth!
	 * @return Liefert das erzeugte WKX-Geometrie-Objekt zurück.
	 * Umformungsvarianten für WKX-Geometrie sind:
	 * -> WKB für den Wert des geom_attribut: geom.toEwkb().toString('hex') => '0101000000000000000000f03f0000000000000040'
	 * -> LatLng für die Geometrie des circleMarkers oder/und editables: kvm.controller.mapper.toLatLngs(geom) => [[[54, 12], [54.1 12.1]],[[54 12], [...]],[...]]]
	 * -> WKT für die Anzeige im Formular: geom.toWkt() => 'MULTIPOLYGON(((54, 12 ....)))'
	 */
	aLatLngsToWkx(alatlngs) {
		var result;

		switch (this.options.geometry_type) {
			case "Point":
				{
					result = wkx.Geometry.parse("SRID=4326;POINT(" + alatlngs[0].lng + " " + alatlngs[0].lat + ")");
				}
				break;
			case "MultiPoint":
				result = wkx.Geometry.parse(
					"SRID=4326;MULTIPOINT(" +
						alatlngs
							.map(function (point) {
								return point.lng + " " + point.lat;
							})
							.join(", ") +
						")"
				);
				break;
			case "Line":
				result = wkx.Geometry.parse(
					"SRID=4326;LINESTRING(" +
						alatlngs
							.map(function (point) {
								return point.lng + " " + point.lat;
							})
							.join(", ") +
						")"
				);
				break;
			case "MultiLinestring":
				result = wkx.Geometry.parse(
					"SRID=4326;MULTILINESTRING(" +
						alatlngs
							.map(function (linestring) {
								return (
									"(" +
									linestring
										.map(function (point) {
											return point[1] + " " + point[0];
										})
										.join(", ") +
									")"
								);
							})
							.join(", ") +
						")"
				);
				break;
			case "Polygon":
				{
					result = wkx.Geometry.parse(
						"SRID=4326;POLYGON(" +
							alatlngs
								.map(function (polyline) {
									return (
										"(" +
										polyline
											.map(function (point) {
												return point.lng + " " + point.lat;
											})
											.join(", ") +
											`, ${polyline[0].lng} ${polyline[0].lat}` +
										")"
									);
								})
								.join(", ") +
							")"
					);
				}
				break;
			case "MultiPolygon":
				result = wkx.Geometry.parse(
					"SRID=4326;MULTIPOLYGON(" +
						alatlngs
							.map(function (polygon) {
								return (
									"(" +
									polygon
										.map(function (polyline) {
											return (
												"(" +
												polyline
													.map(function (point) {
														return point.lng + " " + point.lat;
													})
													.join(", ") +
													`, ${polyline[0].lng} ${polyline[0].lat}` +
												")"
											);
										})
										.join(", ") +
									")"
								);
							})
							.join(",") +
						")"
				);
				break;
			default:
				result = wkx.Geometry.parse("SRID=4326;POINT(" + alatlngs.join(" ") + ")");
		}
		return result;
	}

	wkxToEwkb(wkx) {
		//kvm.wkx.Geometry.parse('SRID=4326;POINT(' + alatlng.join(' ') + ')').toEwkb().inspect().replace(/<|Buffer| |>/g, '')
		return wkx.toEwkb().toString("hex");
	}

	reverseAxis(point) {
		return point[1] + " " + point[0];
	}

	/**
   * Diese Funktion wird ja wohl sicher nicht mehr verwendet, denn die Tabelle haltestellen dürfte es nicht immer geben.
  this.update = function () {
    const sql = "\
      SELECT\
        *\
      FROM\
        haltestellen\
      WHERE\
        uuid = '" + this.get(this.options.id_attribute) + "'\
    ";
    console.log("Frage feature " + this.options.id_attribute + ": " + this.get(this.options.id_attribute) + " mit sql: " + sql + " ab.");
    kvm.db.executeSql(
      sql,
      [],
      function (rs) {
        const kvmLayer = kvm.layers[this.globalLayerId];
        console.log("Objekt aktualisiert.");
        //console.log("Feature.update result: " + JSON.stringify(rs.rows.item(0)));
        var data = rs.rows.item(0);
        kvmLayer.activeFeature.data = typeof data == "string" ? JSON.parse(data) : data;

        if (typeof kvmLayer.features[data.uuid] == "undefined") {
          console.log("insert new feature name in feature list: " + kvmLayer.activeFeature.get("name"));
          $("#featurelistTable tr:first").before(kvmLayer.activeFeature.listElement);
        } else {
          console.log("replace old with new name in feature list: " + kvmLayer.activeFeature.get("name"));
          console.log("this in update of features %o", this);
          $("#" + kvmLayer.activeFeature.get(this.options.id_attribute)).html(kvmLayer.activeFeature.get("name"));
        }
      },
      function (error) {
        kvm.msg(
          "Fehler bei der Abfrage des Features mit " +
            this.options.id_attribute +
            ": " +
            this.get(this.options.id_attribute) +
            " aus lokaler Datenbank: " +
            error.message
        );
      }
    );
  };
  */

	zoomTo(zoom) {
		if (this.layerId) {
			let layer = this.isEditable ? this.editableLayer : (<any>kvm.map)._layers[this.layerId];
			if (this.options.geometry_type == "Point") {
				if (zoom) {
					kvm.map.setZoom(18);
				}
				console.log('panTo %s %o', (this.isEditable ? 'editableLayer: ' : 'feature latlng: '), layer.getLatLng());
				kvm.map.panTo(layer.getLatLng());
			} else {
				console.log('flyToBounds %s %o', (this.isEditable ? 'editableLayer: ' : 'feature bounds: '), layer.getBounds().getCenter());
				kvm.map.flyToBounds(layer.getBounds());
				// kvm.map.fitBounds(layer.getBounds());
			}
		}
	}

	/**
	 * Set this feature active.
	 * Activate the layer of the feature if it is not activated already and
	 * deactivate a feature if one is active already.
	 * Set feature list style as selected
	 * If the feature has a geometry
	 * 	- Set map style as selected
	 *  - Open the popup
	 *  - Zoom to the map if param zoom is true
	 * @param boolean zoom Wenn Feature eine Geometrie hat und zoom=true wird auch auf das Feature gezoomt. 
	 */
	activate(zoom) {
		let kvmLayer = kvm.layers[this.globalLayerId];
		if (!kvmLayer.isActive) {
			kvmLayer.activate();
		}
		if (kvmLayer.activeFeature) {
			kvmLayer.activeFeature.deactivate();
		}
		if (kvmLayer.get('geometry_attribute')) {
			let mapLayer = (<any>kvm.map)._layers[this.layerId];
			if (this.newGeom) {
				//console.log("Feature has newGeom");
				console.log("Markiere Feature %s in Layer %s", this.id, kvmLayer.get("title"));
				mapLayer.setStyle(kvmLayer.getSelectedStyle(this.getStyle()));
				mapLayer.bindPopup(kvmLayer.getPopup(this)).openPopup();
				if (zoom) {
					this.zoomTo(zoom);
				}
			} else {
				// console.log("Feature hat noch keine newGeom und ist noch nicht in Karte");
				// kvm.msg("Das Feature hat noch keine Geometrie und ist deshalb nicht in der Karte zu sehen!", "Hinweis");
			}
		}
		kvm.log("Select feature in list " + this.id, 4);
		$("#" + this.id).addClass("selected-feature-item");
		this.isActive = true;
		return this;
	}

	/**
	 * Deactivate the feature in map and featurelist
	 * Remove an editableLayer of that feature if exists before.
	 * Set the map and feature list style to the normal not selected.
	 * @returns null
	 */
	deactivate() {
    // Beende das Anlegen eines neuen Features
		if (this.editableLayer) {
	    kvm.map.removeLayer(this.editableLayer);
		}
		let mapLayer = (<any>kvm.map)._layers[this.layerId];
		if (mapLayer) {
			const kvmLayer = kvm.layers[this.globalLayerId];
			// console.log(
			// 	"Deselektiere Feature id: %s in Layer: %s, globalLayerId: %s in Leaflet layerId: %s",
			// 	this.id,
			// 	kvmLayer.get("title"),
			// 	this.globalLayerId,
			// 	this.layerId
			// );
			if (this.layerId) {
				mapLayer.setStyle(this.getStyle());
				//kvm.map.zoomIn();
				//kvm.map.zoomOut(); // To refresh layer style
			}
			mapLayer.closePopup();
		}
		$(".feature-item").removeClass("selected-feature-item");
		this.isActive = false;
		return null;
	}

	listElement() {
		//console.log('Erzeuge Listenelement für Feature', this.get(this.options.id_attribute));
		var markerStyles = JSON.parse(kvm.store.getItem("markerStyles")),
			numStyles = Object.keys(markerStyles).length,
			markerStyleIndex = this.get("status") && this.get("status") >= 0 && this.get("status") < numStyles ? this.get("status") : 0;

		return (
			'\
      <div class="feature-item" id="' +
			this.get(this.options.id_attribute) +
			'" style="background-color: ' +
			markerStyles[markerStyleIndex].fillColor +
			'">' +
			this.getLabelValue() +
			"</div>\
    "
		);
	}

	getLabelValue() {
		const kvmLayer: Layer = kvm.layers[this.globalLayerId];
		let label_value = "";
		const label_attribute = kvmLayer.get("name_attribute");
		let formField ;
		if (kvmLayer.hasEditPrivilege) {
			formField = kvmLayer.attributes[kvmLayer.attribute_index[label_attribute]].formField;
		}

		if (this.get(label_attribute)) {
			if (formField && formField.getFormattedValue) {
				label_value = formField.getFormattedValue(this.get(label_attribute));
			}
			else {
				label_value = this.get(label_attribute);
			}
		}
		if (label_value == "" || label_value == 'null') {
			label_value = "Datensatz " + this.get(this.options.id_attribute);
		}
		return label_value;
	}

	/**
	 * Add a single list element to the list of features in list view
	 */
	addListElement() {
		//kvm.log("Feature.addListElement", 4);
		//console.log('Add listelement: %o', this.listElement());

		$("#featurelistBody").prepend(this.listElement());
		//kvm.log(this.id + " zur Liste hinzugefügt.", 4);

		$("#" + this.id).on("click", kvm.featureItemClickEventFunction);
		//kvm.log("Click Event an Listenelement registriert", 4);
	}

	updateListElement() {
		kvm.log("Feature.updateListElement", 4);
		let markerStyles = JSON.parse(kvm.store.getItem("markerStyles"));
		let	numStyles = Object.keys(markerStyles).length;
		let markerStyleIndex = this.get('status') && this.get("status") >= 0 && this.get("status") < numStyles ? this.get("status") : 0;
		$("#" + this.get(this.options.id_attribute)).html(this.getLabelValue());
		$("#" + this.get(this.options.id_attribute)).css("background-color", markerStyles[markerStyleIndex].fillColor);
	}

	/**
	 * This function return a style for this feature
	 * If the classitem value matches a class its style will be returned.
	 * If not the defaultStyle of the layer will be returned.
	 * For all missing settings in class style, default values will be taken.
	 * @return leafletPathOptions
	 */
	getStyle() {
		let matchingClass: Klasse;
		let style: any = {};
		let kvmLayer: Layer = kvm.layers[this.globalLayerId];

		if (typeof (matchingClass = kvmLayer.getClass(this.get(kvmLayer.settings.classitem))) == "undefined") {
			style = kvmLayer.getDefaultPathOptions();
		} else {
			//console.log("%s: Use styles from matching class.", layer.title);
			style = matchingClass.getLeafletPathOptions();
		}
		return style;
	}

	getNormalStyle() {
		if (this.options.geometry_type == "Point") {
			return this.getNormalCircleMarkerStyle();
		} else if (this.options.geometry_type == "Line") {
			return this.getNormalPolylineStyle();
		} else if (this.options.geometry_type == "Polygon") {
			return this.getNormalPolygonStyle();
		}
	}

	getNormalPolylineStyle() {
		//console.log('getNormalPolylineStyle');
		var markerStyles = JSON.parse(kvm.store.getItem("markerStyles")),
			numStyles = Object.keys(markerStyles).length,
			markerStyleIndex = this.get("status") >= 0 && this.get("status") < numStyles ? this.get("status") : 0,
			style = markerStyles[markerStyleIndex];

		style.color = style.fillColor;
		style.stroke = true;
		style.fill = false;
		style.opacity = 0.8;

		return style;
	}

	getNormalPolygonStyle() {
		//console.log('getNormalPolygonStyle');
		var markerStyles = JSON.parse(kvm.store.getItem("markerStyles")),
			numStyles = Object.keys(markerStyles).length,
			markerStyleIndex = this.get("status") >= 0 && this.get("status") < numStyles ? this.get("status") : 0,
			style = markerStyles[markerStyleIndex];

		style.stroke = true;
		style.opacity = 0.8;

		return style;
	}

	getNormalCircleMarkerStyle() {
		//console.log('getNormalCircleMarkerStyle');
		//kvm.log('getNormalCircleMarkerStyle for status: ' + this.get('status'), 4);
		var markerStyles = JSON.parse(kvm.store.getItem("markerStyles")),
			numStyles = Object.keys(markerStyles).length,
			markerStyleIndex = this.get("status") >= 0 && this.get("status") < numStyles ? this.get("status") : 0;
		return markerStyles[markerStyleIndex];
	}

	getEditModeStyle() {
		//console.log('getEditModeStyle');
		if (this.options.geometry_type == "Point") {
			return this.getEditModeCircleMarkerStyle();
		} else if (this.options.geometry_type == "Line") {
			return this.getEditModePolylineStyle();
		}
	}

	getEditModeCircleMarkerStyle() {
		//console.log('getEditModeCircleMarkerStyle');
		return {
			color: "#666666",
			weight: 4,
			fill: true,
			fillOpacity: 0.8,
			fillColor: "#cccccc",
		};
	}

	getEditModePolylineStyle() {
		//console.log('getEditModePolylineStyle');
		var style = {
			stroke: true,
			fill: false,
			color: "#666666",
			weight: 5,
			opacity: 0.8,
		};
		console.log("style: %o", style);
		return style;
	}

	setGeomFromData() {
		//console.log('setGeomFromData');
		const geom_attribute = this.options.geometry_attribute;
		if (geom_attribute in this.data && this.get(geom_attribute) !== 'null') {
			//console.log('Setze geom des neuen Features mit data: %o', this.data);
			this.geom = this.wkbToWkx(this.get(this.options.geometry_attribute));
		}
		this.newGeom = this.geom; // Aktuelle WKX-Geometry beim Editieren. Entspricht this.geom wenn das Feature neu geladen wurde und Geometrie in Karte, durch GPS oder Formular noch nicht geändert wurde.
		//console.log('new feature newGeom: %o', this.newGeom);
		//console.log('new feature geom: %o', this.geom);
	}
}

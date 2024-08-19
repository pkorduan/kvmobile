import * as wkx from "wkx";
import { GeoJSON } from "leaflet";
import { kvm } from "./app";
import { Layer } from "./Layer";
import { Klasse } from "./Klasse";
import { createHtmlElement } from "./Util";

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
  data: { [id: string]: any } = {};
  // options: { [id: string]: any } = {};
  layer: Layer;
  id: string;
  // Achtung reine Id von leaflet
  layerId: number;
  globalLayerId: string;
  isEditable: boolean;
  private _isActive: boolean;
  editableLayer: any;
  newGeom: any;
  geom: any;
  startLatLng: number[];
  new: boolean;

  listElement: HTMLElement;

  constructor(data: any = {}, layer: Layer, isNew?: boolean) {
    // this.options = {
    //     id_attribute: layer.get('id_attribute') ?? "uuid",
    //     geometry_type: layer.get('geometry_type') ?? "Point",
    //     geometry_attribute: layer.settings.geometry_attribute ?? "geom",
    //     globalLayerId: layer.getGlobalId() ?? 0,
    //     new: isNew ?? true
    // }

    this.new = isNew ?? true;
    //console.log('Create Feature with data: %o and options: %o', data, options);
    this.data = typeof data == "string" ? JSON.parse(data) : data;
    this.layer = layer;
    this.id = this.getFeatureId();
    //this.data[this.layer.settings.id_attribute];
    // this.layerId = null; // Leaflet Layer id des Layers (z.B. circleMarkers) in dem das Feature gezeichnet ist
    this.globalLayerId = this.layer.getGlobalId(); // Id des Layers zu dem das Feature gehört
    /*kvm
  console.log('Erzeuge eine editierbare Geometrie vom Feature');
  this.editableLayer = kvm.controller.mapper.createEditable(this); // In vorheriger Version wurde hier L.marker(kvm.map.getCenter()) verwendet. ToDo: muss das hier überhaupt gesetzt werden, wenn es denn dann doch beim setEditable erzeugt wird?
  */
    //console.log('Setze Feature auf im Moment nicht editierbar.');
    this.isEditable = false; // Feature ist gerade im Modus editierbar oder nicht
    this._isActive = false; // Feature is aktuell gerade ausgewählt, Style in Karte gändert und evtl. Popup offen oder nicht
    this.setGeomFromData();
  }

  get isActive() {
    return this._isActive;
  }

  setActive(active: boolean) {
    console.error(`feature.setActiv(${active})`);
    this._isActive = active;
  }

  // getId() {
  //     return this.id;
  // }

  getDataValue(attributeName: string) {
    // ToDo: value auf null nicht auf 'null' setzen wenn er undefined ist
    return typeof this.data !== "undefined" && typeof this.data[attributeName] != "undefined" ? this.data[attributeName] : "null";
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

  setDefaultValuesForNonSaveables() {
    const layer = kvm.getLayer(this.globalLayerId);
    const nonSaveableAttributes = layer.attributes.filter((attribute) => {
      return attribute.settings.saveable == "0" && attribute.settings.default != "";
    });
    nonSaveableAttributes.forEach((attribute) => {
      let value = null;
      switch (true) {
        case attribute.settings.default.startsWith("gdi_conditional_val"):
          {
            const parentLayer = kvm.getLayer(layer.parentLayerId);
            const parentFeature = parentLayer.getFeature(layer.parentFeatureId);
            // Frage den Spaltennamen ab, von dem der Defaultwert des parentLayers abgefragt werden soll.
            //z.B: entwicklungsphase_id aus gdi_conditional_val('kob', 'baum', 'entwicklungsphase_id', 'uuid = ''$baum_uuid''')
            const column = attribute.settings.default
              .split(",")[2]
              .trim()
              .replace(/^["'](.+(?=["']$))["']$/, "$1");
            value = parentFeature.getDataValue(column);
            // value = kvm.layers[this.parentLayerId].features.get(this.parentFeatureId).get(column)
          }
          break;
        case attribute.settings.default.includes("gdi_current_date"):
          {
            const today = new Date();
            value = `${today.getFullYear()}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getDate()}`;
          }
          break;
        default: {
          value = attribute.settings.default;
        }
      }
      this.setDataValue(attribute.settings.name, value);
    });
  }

  getWaypoint(end = "last") {
    const latlngs = this.editableLayer.getLatLngs();
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
    return String(this.getDataValue(this.layer.settings.id_attribute));
  }

  findParentFeature() {
    const layer = kvm.getLayer(this.globalLayerId);
    const subFormFKAttribute = layer.attributes.find((attr) => attr.settings.form_element_type === "SubFormFK");
    if (subFormFKAttribute === undefined) {
      return false;
    } else {
      const fkAttributeIndex = layer.attribute_index[subFormFKAttribute.getFKAttribute()];
      const parentFeatureId = layer.attributes[fkAttributeIndex].formField.getValue();
      const parentLayer = kvm.getLayer(subFormFKAttribute.getGlobalParentLayerId());
      return parentLayer.getFeature(parentFeatureId);
    }
  }

  setDataValue(key: string, value: any) {
    this.data[key] = value;
    return this.data[key];
  }

  getData() {
    return this.data;
  }

  setData(data: string | { [id: string]: any }) {
    //console.log('Feature.setData %o', data);
    this.data = typeof data == "string" ? JSON.parse(data) : data;
    this.setGeomFromData();
  }

  /*
   * Setzt die Geometrie neu an Hand der übergebenen wkx Geometrie wenn sie sich gegenüber der vorherigen geändert hat.
   * und lößt den Trigger aus, der angibt, dass sich die Geom des Features geändert hat.
   */
  setGeom(wkx: wkx.Geometry) {
    console.log("setGeom mit wkx: %o", wkx);
    console.log("Überschreibe oldGeom: %o mit newGeom: %o", this.oldGeom, this.newGeom);
    const oldGeom = this.newGeom;
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
      const newLatLngs = this.wkxToLatLngs(geom),
        oldLatLngs = this.getLatLngs();

      // console.log("vergleiche alte mit neuer coord");
      if (oldLatLngs != newLatLngs) {
        // console.log("Ändere alte latlngs: %o auf neue: %o", oldLatLngs, newLatLngs);
        if (this.layer.settings.geometry_type == "Point") {
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
    if (this.layer.settings.geometry_type == "Point") {
      return this.editableLayer.getLatLng();
    } else {
      return this.editableLayer.getLatLngs();
    }
  }

  /*
   * Gibt von einem WKX Geometry Objekt ein Array mit latlng Werten aus wie es für Leaflet Objekte gebraucht wird.
   */
  wkxToLatLngs(geom = this.geom) {
    if (this.layer.settings.geometry_type == "Point") {
      // ToDo hier ggf. den Geometrietyp auch aus this.geometry_type auslesen und nicht aus der übergebenen geom
      // Problem dann, dass man die Funktion nur benutzen kann für den Geometrietype des activen Layer
      const coordsLevelDeep = kvm.controller.mapper.coordsLevelsDeep[geom.toWkt().split("(")[0].toUpperCase()];
      return coordsLevelDeep == 0 ? GeoJSON.coordsToLatLng(geom.toGeoJSON().coordinates) : GeoJSON.coordsToLatLngs(geom.toGeoJSON().coordinates, coordsLevelDeep);
    } else if (this.layer.settings.geometry_type == "Line") {
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
    } else if (this.layer.settings.geometry_type == "Polygon") {
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
    let result: wkx.Geometry;

    switch (this.layer.settings.geometry_type) {
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

  wkxToEwkb(wkx: wkx.Geometry) {
    //kvm.wkx.Geometry.parse('SRID=4326;POINT(' + alatlng.join(' ') + ')').toEwkb().inspect().replace(/<|Buffer| |>/g, '')
    return wkx.toEwkb().toString("hex");
  }

  reverseAxis(point) {
    return point[1] + " " + point[0];
  }

  /**
   */

  zoomTo(zoom: boolean, startLatLng?: L.LatLngExpression) {
    if (this.layerId) {
      let layer = this.isEditable ? this.editableLayer : (<any>kvm.map)._layers[this.layerId];
      if (this.layer.settings.geometry_type == "Point") {
        if (zoom) {
          kvm.map.setZoom(18);
        }
        console.log("panTo %s %o", this.isEditable ? "editableLayer: " : "feature latlng: ", layer.getLatLng());
        kvm.map.panTo(layer.getLatLng());
      } else {
        console.log("flyToBounds %s %o", this.isEditable ? "editableLayer: " : "feature bounds: ", layer.getBounds().getCenter());
        let isVisible = $("#map").is(":visible");
        if (!isVisible) {
          $("#map").show();
        }
        kvm.map.invalidateSize();
        //kvm.map.flyToBounds(layer.getBounds());
        kvm.map.fitBounds(layer.getBounds());
        if (!isVisible) {
          $("#map").hide();
        }
      }
    } else {
      kvm.map.setZoom(18);
      if (startLatLng) {
        kvm.map.panTo(startLatLng);
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
  activate(zoom: boolean) {
    console.error(`zzz feature.activate ${this.layer?.title}`, this);
    // if (!this.layer.isActive) {
    //   this.layer.activate();
    // }
    // this.layer.setActiveFeature(this);

    if (this.layer.hasGeometry) {
      let mapLayer = (<any>kvm.map)._layers[this.layerId];
      if (this.newGeom) {
        //console.log("Feature has newGeom");
        console.log("Markiere Feature %s in Layer %s", this.id, this.layer.title);
        mapLayer.setStyle(this.layer.getSelectedStyle(this.getStyle()));
        mapLayer.bindPopup(this.layer.getPopup(this)).openPopup();
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
    this.setActive(true);
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
    console.error(`zzz feature.deactivate ${this.layer?.title}`, this);
    if (this.editableLayer) {
      kvm.map.removeLayer(this.editableLayer);
    }
    let mapLayer = (<any>kvm.map)._layers[this.layerId];
    if (mapLayer) {
      const kvmLayer = kvm.getLayer(this.globalLayerId);
      // console.log(
      // 	"Deselektiere Feature id: %s in Layer: %s, globalLayerId: %s in Leaflet layerId: %s",
      // 	this.id,
      // 	kvmLayer.title,
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
    this.setActive(false);
    return null;
  }

  getListElement(): HTMLElement {
    if (!this.listElement) {
      //console.log('Erzeuge Listenelement für Feature', this.get(this.layer.settings.id_attribute));
      const markerStyles = kvm.getMarkerStyles();
      const numStyles = Object.keys(markerStyles).length;
      const markerStyleIndex = this.getDataValue("status") && this.getDataValue("status") >= 0 && this.getDataValue("status") < numStyles ? this.getDataValue("status") : 0;

      const div = (this.listElement = createHtmlElement("div", null, "feature-item"));
      div.style.backgroundColor = markerStyles[markerStyleIndex].fillColor;
      div.innerHTML = this.getLabelValue();
      div.dataset.id = this.id;
      return div;
    }
    return this.listElement;
    // return (
    //   '\
    //   <div class="feature-item" id="' +
    //   this.id +
    //   '" style="background-color: ' +
    //   markerStyles[markerStyleIndex].fillColor +
    //   '">' +
    //   this.getLabelValue() +
    //   "</div>\
    // "
    // );
  }

  getLabelValue() {
    const kvmLayer = kvm.getLayer(this.globalLayerId);
    let label_value = "";
    const label_attribute = kvmLayer.settings.name_attribute;
    let formField;
    if (kvmLayer.hasEditPrivilege) {
      formField = kvmLayer.attributes[kvmLayer.attribute_index[label_attribute]].formField;
    }

    if (this.getDataValue(label_attribute)) {
      if (formField && formField.getFormattedValue) {
        label_value = formField.getFormattedValue(this.getDataValue(label_attribute));
      } else {
        label_value = this.getDataValue(label_attribute);
      }
    }
    if (label_value == "" || label_value == "null") {
      label_value = "Datensatz " + this.getDataValue(this.layer.settings.id_attribute);
    }
    return label_value;
  }

  /**
   * Add a single list element to the list of features in list view
   */
  addListElement() {
    //kvm.log("Feature.addListElement", 4);
    //console.log('Add listelement: %o', this.listElement());
    const htmlEl = this.getListElement();
    htmlEl.addEventListener("click", kvm.featureItemClickEventFunction);
    document.getElementById("featurelistBody").append(htmlEl);

    // $("#" + this.id).on("click", kvm.featureItemClickEventFunction);
    //kvm.log("Click Event an Listenelement registriert", 4);
  }

  updateListElement() {
    kvm.log("Feature.updateListElement", 4);
    const markerStyles = JSON.parse(kvm.store.getItem("markerStyles"));
    const numStyles = Object.keys(markerStyles).length;
    const markerStyleIndex = this.getDataValue("status") && this.getDataValue("status") >= 0 && this.getDataValue("status") < numStyles ? this.getDataValue("status") : 0;
    const listElement = this.getListElement();
    listElement.innerHTML = this.getLabelValue();
    listElement.style.backgroundColor = markerStyles[markerStyleIndex].fillColor;
  }

  /**
   * This function return a style for this feature
   * If the classitem value matches a class its style will be returned.
   * If not the defaultStyle of the layer will be returned.
   * For all missing settings in class style, default values will be taken.
   * @return leafletPathOptions
   */
  getStyle() {
    // TODO
    let matchingClass: Klasse;
    let style: any;
    const kvmLayer: Layer = kvm.getLayer(this.globalLayerId);

    // if (typeof (matchingClass = kvmLayer.getClass(this.getDataValue(kvmLayer.settings.classitem))) == "undefined") {
    if (typeof (matchingClass = this.layer.getClass(this.getDataValue(this.layer.settings.classitem))) == "undefined") {
      style = kvmLayer.getDefaultPathOptions();
    } else {
      //console.log("%s: Use styles from matching class.", layer.title);
      style = matchingClass.getLeafletPathOptions();
    }
    return style;
  }

  getNormalStyle() {
    if (this.layer.settings.geometry_type == "Point") {
      return this.getNormalCircleMarkerStyle();
    } else if (this.layer.settings.geometry_type == "Line") {
      return this.getNormalPolylineStyle();
    } else if (this.layer.settings.geometry_type == "Polygon") {
      return this.getNormalPolygonStyle();
    }
  }

  getNormalPolylineStyle() {
    //console.log('getNormalPolylineStyle');
    const markerStyles = JSON.parse(kvm.store.getItem("markerStyles")),
      numStyles = Object.keys(markerStyles).length,
      markerStyleIndex = this.getDataValue("status") >= 0 && this.getDataValue("status") < numStyles ? this.getDataValue("status") : 0,
      style = markerStyles[markerStyleIndex];

    style.color = style.fillColor;
    style.stroke = true;
    style.fill = false;
    style.opacity = 0.8;

    return style;
  }

  getNormalPolygonStyle() {
    //console.log('getNormalPolygonStyle');
    const markerStyles = JSON.parse(kvm.store.getItem("markerStyles")),
      numStyles = Object.keys(markerStyles).length,
      markerStyleIndex = this.getDataValue("status") >= 0 && this.getDataValue("status") < numStyles ? this.getDataValue("status") : 0,
      style = markerStyles[markerStyleIndex];

    style.stroke = true;
    style.opacity = 0.8;

    return style;
  }

  getNormalCircleMarkerStyle() {
    //console.log('getNormalCircleMarkerStyle');
    //kvm.log('getNormalCircleMarkerStyle for status: ' + this.get('status'), 4);
    const markerStyles = JSON.parse(kvm.store.getItem("markerStyles")),
      numStyles = Object.keys(markerStyles).length,
      markerStyleIndex = this.getDataValue("status") >= 0 && this.getDataValue("status") < numStyles ? this.getDataValue("status") : 0;
    return markerStyles[markerStyleIndex];
  }

  getEditModeStyle() {
    //console.log('getEditModeStyle');
    if (this.layer.settings.geometry_type == "Point") {
      return this.getEditModeCircleMarkerStyle();
    } else if (this.layer.settings.geometry_type == "Line") {
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
    const style = {
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
    const dataGeom = this.getDataValue(this.layer.settings.geometry_attribute);
    if (dataGeom && dataGeom !== "null") {
      //console.log('Setze geom des neuen Features mit data: %o', this.data);
      this.geom = this.wkbToWkx(dataGeom);
    }
    this.newGeom = this.geom; // Aktuelle WKX-Geometry beim Editieren. Entspricht this.geom wenn das Feature neu geladen wurde und Geometrie in Karte, durch GPS oder Formular noch nicht geändert wurde.
    //console.log('new feature newGeom: %o', this.newGeom);
    //console.log('new feature geom: %o', this.geom);
  }
}

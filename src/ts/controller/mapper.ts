import { kvm } from "../app";
import * as wkx from "wkx";
import * as L from "leaflet";
import { Buffer } from "buffer";
import { Feature } from "../Feature";

// kvm.views.mapper = {};
/*
auch ne Variante wie man die Features in die Karte bekommt:
$.getJSON("script_dass_geojson_liefert.php?id=xy", function(data) {
  L.geoJson(data, {
      pointToLayer: function (feature, latlng) {
          return L.circleMarker(latlng, geojsonMarkerOptions);

      },
       onEachFeature: function (feature, layer) {
           popupOptions = {maxWidth: 200};
          layer.bindPopup(feature.properties.popupContent);
      },
      coordsToLatLng: function (coords) {
      return new L.heatLayer(coords);
      }

  }).addTo(map);
});
*/

/**
 * Es gibt 3 Zustände des GPS Trackings, die aber in dieser Anwendung so nicht umgesetzt sind.
 * Statt dessen wird das L.control.locate Control in app.js verwendet.
 * kvm-gps-off GPS-Position wird nicht angezeigt
 *   showGpsPositionButton Style Hintergrund weiß Icon grau
 *   Click auf showGpsPositionButton wechselt in Mode 2
 * kvm-gps-on GPS-Position wird angezeigt
 *   showGpsPositionButton Style Hintergrund weiß Icon Blau
 *   Click auf showGpsPositionButton wechselt in Mode 2
 * kvm-gps-track GPS-Position wird angezeigt und die Karte nachgeführt
 *   showGpsPositionButton Style Hinergrund blau Icon weiß
 *   Click auf showGpsPositionButton wechselt in Mode 0
 *   On mapMove oder mapZoom wechselt nach Mode 1
 */

// kvm.controller.mapper = {
export class Mapper {
  watchId: number;

  // ToDo Keys der anderen Typen als Point müssen den Geometrietypen entsprechen, die in geometry_type des Layers übergeben werden.
  static coordsLevelsDeep = {
    POINT: 0, // kvm.wkx.Geometry.parse('SRID=4326;POINT(10 20)')
    MULTIPOINT: 2, // kvm.wkx.Geometry.parse('SRID=4326;MULTIPOINT((10 20), (14 20), (12 21))')
    LINESTRING: 2, // L.GeoJSON.coordsToLatLngs(kvm.wkx.Geometry.parse('SRID=4326;LINESTRING(10 20, 14 20, 14 24, 10 24)').toGeoJSON().coordinates, 2)
    MULTILINESTRING: 1, // L.GeoJSON.coordsToLatLngs(kvm.wkx.Geometry.parse('SRID=4326;MULTILINESTRING((10 20, 14 20), (12 21, 13 21), (30 40, 35 45, 56 67))').toGeoJSON().coordinates, 1)
    POLYGON: 1, // L.GeoJSON.coordsToLatLngs(kvm.wkx.Geometry.parse('SRID=4326;POLYGON((10 20, 14 20, 14 24, 10 24, 10 20))').toGeoJSON().coordinates, 2)
    MULTIPOLYGON: 2, // L.GeoJSON.coordsToLatLngs(kvm.wkx.Geometry.parse('SRID=4326;MULTIPOLYGON(((10 20, 14 20, 14 24, 10 24, 10 20), (12 21, 13 21, 13 22, 12 22, 12 21)), ((30 40, 35 45, 56 67)))').toGeoJSON().coordinates, 2)
  };
  accuracy: number;
  signalLevel: number;
  lastLatlng: L.LatLng;
  editableLayer: L.Marker | L.Polyline | L.Polygon;

  constructor() {
    // this.watchGpsAccuracy();
  }

  createEditable(feature: Feature) {
    //ToDo auch implementieren für polyongs
    console.log("Erzeuge Editierbare Geometrie für %s: %o", feature.layer.settings.geometry_type, feature);
    // var editableLayer;

    // Erzeugt eine editierbare Geometrie der Featuregeometrie
    if (feature.layer.settings.geometry_type == "Point") {
      this.editableLayer = L.marker(feature.wkxToLatLngs(), {
        icon: this.getDraggableIcon(),
      }).addTo(kvm.map);
    } else if (feature.layer.settings.geometry_type == "Line") {
      this.editableLayer = L.polyline(feature.wkxToLatLngs(), {
        stroke: true,
        fill: false,
        color: "#ffff50",
        weight: 3,
        opacity: 0.7,
      }).addTo(kvm.map);
      // TODO Peter fragen
      $("#trackControl").parent().show();
    } else if (feature.layer.settings.geometry_type == "Polygon") {
      this.editableLayer = L.polygon(feature.wkxToLatLngs(), {
        stroke: true,
        color: "#ff3333",
        weight: 2,
        opacity: 0.8,
        fill: true,
        fillColor: "#e07676",
        fillOpacity: 0.7,
      }).addTo(kvm.map);
    }
    return this.editableLayer;
  }

  bindEventHandler(feature: Feature) {
    console.log("bindEventHandler für feature: %o", feature);

    // kein Popup am Draggable, ist nicht notwendig wegen der Button im Menü   kvm.map._layers[draggable._leaflet_id].bindPopup(this.getDraggablePopup(feature, draggable));
    if (feature.layer.settings.geometry_type == "Point") {
      // TODO 3x (<any>kvm.map)
      // (<any>kvm.map)._layers[feature.editableLayer._leaflet_id].on("dragend", () => {
      this.editableLayer.on("dragend", () => {
        console.log("draged");
        this.clearWatch();
        const latlng = feature.editableLayer.getLatLng();
        document.dispatchEvent(new CustomEvent("geomChanged", { detail: { geom: feature.aLatLngsToWkx([latlng]), exclude: "latlngs" } }));
      });
    } else if (feature.layer.settings.geometry_type == "Line") {
      // (<any>kvm.map)._layers[feature.editableLayer._leaflet_id].on("isChanged", () => {
      this.editableLayer.on("isChanged", () => {
        console.log("isChanged");
        const latlngs = feature.editableLayer.getLatLngs();
        document.dispatchEvent(new CustomEvent("geomChanged", { detail: { geom: feature.aLatLngsToWkx(latlngs), exclude: "latlngs" } }));
      });
    } else if (feature.layer.settings.geometry_type == "Polygon") {
      // console.log("Handler to act on Geometry is changed.");
      // (<any>kvm.map)._layers[feature.editableLayer._leaflet_id]
      this.editableLayer
        .on("editable:dragend", () => {
          // console.log("Polygon wurde verschoben");
          const latlngs = feature.editableLayer.getLatLngs();
          document.dispatchEvent(new CustomEvent("geomChanged", { detail: { geom: feature.aLatLngsToWkx(latlngs), exclude: "latlngs" } }));
          // $(document).trigger("geomChanged", [{ geom: feature.aLatLngsToWkx(latlngs), exclude: "latlngs" }]);
        })
        .on("editable:vertex:dragend", () => {
          // console.log("Stützpunkt von Polygon wurde verschoben");
          const latlngs = feature.editableLayer.getLatLngs();
          document.dispatchEvent(new CustomEvent("geomChanged", { detail: { geom: feature.aLatLngsToWkx(latlngs), exclude: "latlngs" } }));
          // $(document).trigger("geomChanged", [{ geom: feature.aLatLngsToWkx(latlngs), exclude: "latlngs" }]);
        })
        .on("editable:vertex:deleted", (ev) => {
          const latlngs = feature.editableLayer.getLatLngs();
          document.dispatchEvent(new CustomEvent("geomChanged", { detail: { geom: feature.aLatLngsToWkx(latlngs), exclude: "latlngs" } }));
        });
      // .on("editable:editing", (ev) => {
      //   console.error("editable:editing", ev);
      //   // document.dispatchEvent(new CustomEvent("geomChanged", { detail: { geom: feature.aLatLngsToWkx(latlngs), exclude: "latlngs" } }));
      // });
    }
  }

  removeEditable(feature: Feature) {
    if (feature.layer.settings.geometry_type == "Line") {
      if (document.getElementById("trackControl")?.parentElement) {
        document.getElementById("trackControl").parentElement.style.display = "none";
      }
      // $("#trackControl").parent().hide();
    }
    if (feature?.editableLayer) {
      kvm.map.removeLayer(feature.editableLayer);
    }
  }

  watchGpsAccuracy() {
    console.info("mapper controller: watchGpsAccuracy");
    this.watchId = navigator.geolocation.watchPosition(
      (geoLocation) => {
        //        kvm.log('Set new geo location accuracy', 4);
        console.info("geoLocation", geoLocation);

        this.accuracy = geoLocation.coords.accuracy;

        switch (true) {
          case this.accuracy > 50:
            this.signalLevel = 1;
            break;
          case this.accuracy > 25:
            this.signalLevel = 2;
            break;
          case this.accuracy > 15:
            this.signalLevel = 3;
            break;
          case this.accuracy > 11:
            this.signalLevel = 4;
            break;
          default:
            this.signalLevel = 5;
        }
        const gpsSignalIcon = document.getElementById("gps-signal-icon");
        if (gpsSignalIcon) {
          while (gpsSignalIcon.classList.length > 0) {
            gpsSignalIcon.classList.remove(gpsSignalIcon.classList[0]);
          }
          gpsSignalIcon.classList.add("gps-signal-level-" + this.signalLevel);
        }
      },
      (err) => {
        const gpsSignalIcon = document.getElementById("gps-signal-icon");
        if (gpsSignalIcon) {
          gpsSignalIcon.className = "";
        }
        this.signalLevel = 0;
      }
    );
  }

  startGpsTracking(f: Feature, startLatlng) {
    this.lastLatlng = startLatlng;
    this.watchId = navigator.geolocation.watchPosition((location) => {
      const latlng = L.latLng(location.coords.latitude, location.coords.longitude);
      //console.log("gps Location: %s", latlng.toString());
      if (this.lastLatlng.distanceTo(latlng) > (kvm.getConfigurationOption("minTrackDistance") ? kvm.getConfigurationOption("minTrackDistance") : 5)) {
        //console.log("Add Point to Line at Location: %s", latlng.toString());
        kvm.map.flyTo(latlng);
        f.editableLayer.setLatLng(latlng);
        this.lastLatlng = latlng;
      }
    });
  }

  startUpdateMarkerWithGps() {
    this.watchId = navigator.geolocation.watchPosition((location) => {
      var latlng = L.latLng(location.coords.latitude, location.coords.longitude);
      // document.dispatchEvent(new CustomEvent("geomChanged", { detail: { geom: feature.aLatLngsToWkx([latlng]), exclude: "latlngs" } }));
      // console.log("trigger geomChanged mit latlng: %o", latlng);
      // $(document).trigger("geomChanged", [{ geom: kvm.activeLayer.activeFeature.aLatLngsToWkx([latlng]) }]);
    });
  }

  getDraggableIcon() {
    return L.icon({
      iconUrl: "img/draggableIcon_bottom_right.svg",
      iconSize: [95, 95],
      iconAnchor: [15, 15],
      popupAnchor: [15, 15],
      // shadowUrl: "img/draggableIconShadow_bottom_right.svg",
      // shadowSize: [95, 95],
      // shadowAnchor: [10, 10],
    });
  }

  getSignalLevel() {
    return typeof this.signalLevel === "undefined" ? 0 : this.signalLevel;
  }

  getGPSAccuracy() {
    return typeof this.accuracy === "undefined" ? 0 : this.accuracy;
  }

  clearWatch() {
    navigator.geolocation.clearWatch(this.watchId);
  }

  gpsError(error) {
    $("#gps-signal-icon").attr("class", "gps-signal-level-0");
    navigator.notification.confirm(
      "Es kann keine GPS-Position bestimmt werden. Schalten Sie die GPS Funktion auf Ihrem Gerät ein, suchen Sie einen Ort unter freiem Himmel auf und versuchen Sie es dann noch einmal. Fehler: " + error.message,
      function (buttonIndex) {
        if (buttonIndex == 1) {
          console.log("Einschalten der GPS-Funktion");
        }
      },
      "GPS-Position",
      ["ok", "abbrechen"]
    );
  }

  isMapVisible() {
    return $("#showMapEdit").css("display") == "none";
  }

  // zoomToFeature(featureId: string) {
  //   const feature = kvm.getActiveLayer().getFeature(featureId);

  //   kvm.map.flyTo(feature.editableLayer.getLatLng(), 18);
  // }

  wkbToLatLngs(wkb) {
    // ToDo hier ggf. den Geometrietyp auch aus this.geometry_type auslesen und nicht aus der übergebenen geom
    // Problem dann, dass man die Funktion nur benutzen kann für den Geometrietype des activeLayer
    const geom = wkx.Geometry.parse(new Buffer(wkb, "hex"));
    const coordsLevelDeep = Mapper.coordsLevelsDeep[geom.toWkt().split("(")[0].toUpperCase()];
    const coords = geom.toGeoJSON()["coordinates"];
    return coordsLevelDeep == 0 ? L.GeoJSON.coordsToLatLng(coords) : L.GeoJSON.coordsToLatLngs(coords, coordsLevelDeep);
  }
}

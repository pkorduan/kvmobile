import { Buffer } from "buffer";
import { kvm } from "./app";
import * as wkx from "wkx";
/*
 * create a geometry form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="text" id="1" name="bezeichnung" value="Wert"/>
 *     </div>
 *   </div>
 */
export class GeometrieFormField {
  settings: any;
  element: JQuery<HTMLElement>;
  selector: string;
  constructor(formId, settings) {
    this.settings = settings;
    this.selector = "#" + formId + " input[id=" + this.get("index") + "]";
    this.element = $(
      '\
        <input\
        type="hidden"\
        id="' +
        this.get("index") +
        '"\
        name="' +
        this.get("name") +
        '"\
        value=""' +
        (this.get("privilege") == "0" ? " disabled" : "") +
        "\
        />"
    );
  }

  get(key) {
    return this.settings[key];
  }

  setValue(val) {
    kvm.log("GeometrieFormField.setValue with value:" + val);
    var geom = wkx.Geometry.parse(<any>new Buffer(val, "hex"));
    this.element.val(geom.toEwkb().toString("hex"));
    /*
    if (val == null || val == 'null') {
      val = '';
    }
    else {
      var geom = kvm.wkx.Geometry.parse(new kvm.Buffer(val, 'hex')),
          faktor = Math.pow(10, 6),
          val = Math.round(geom.x * faktor) / faktor + ' ' + Math.round(geom.y * faktor) / faktor;
    }
*/
  }

  getValue(action = "") {
    //console.log('GeometrieFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == "") {
      val = null;
    }
    /*
    else {
      val = kvm.wkx.Geometry.parse('SRID=4326;POINT(' + val + ')').toEwkb().inspect().replace(/<|Buffer| |>/g, '');
    }
*/
    return val;
  }

  bindEvents() {
    //console.log('SelectFormField.bindEvents');
    $("#featureFormular input[id=" + this.get("index") + "]").on("change", function () {
      if (!$("#saveFeatureButton").hasClass("active-button")) {
        $("#saveFeatureButton").toggleClass("active-button inactive-button");
      }
    });

    $("#goToGpsPositionButton").on("click", function () {
      console.log("Fly to feature position.");
      kvm.showItem("mapEdit");
      kvm.map.flyTo(kvm.activeLayer.activeFeature.editableLayer.getLatLng(), 18);
    });

    $("#saveGpsPositionButton").on("click", function () {
      //console.log('click on saveGpsPositionButton');
      navigator.geolocation.getCurrentPosition(
        function (geoLocation) {
          navigator.notification.confirm(
            "Neue Position:\n" + geoLocation.coords.longitude + " " + geoLocation.coords.latitude + "\nübernehmen?",
            function (buttonIndex) {
              if (buttonIndex == 1) {
                console.log("Set new Position " + geoLocation.coords.latitude + " " + geoLocation.coords.longitude);
                var feature = kvm.activeLayer.activeFeature,
                  newGeom = feature.aLatLngsToWkx([{ lat: geoLocation.coords.latitude, lng: geoLocation.coords.longitude }]);

                $("#geom_wkt").val(newGeom.toWkt());

                //console.log("Trigger geomChanged mit coords der Geolocation: %o", geoLocation.coords);
                $(document).trigger("geomChanged", [{ geom: newGeom, exclude: "wkt" }]);
              }
            },
            "GPS-Position",
            ["ja", "nein"]
          );
        },
        function (error) {
          navigator.notification.confirm(
            "Es kann keine GPS-Position bestimmt werden. Schalten Sie die GPS Funktion auf Ihrem Gerät ein, suchen Sie einen Ort unter freiem Himmel auf und versuchen Sie es dann noch einmal.",
            function (buttonIndex) {
              if (buttonIndex == 1) {
                kvm.log("Einschalten der GPS-Funktion.", 3);
              }
            },
            "GPS-Position",
            ["ok", "abbrechen"]
          );
        },
        {
          maximumAge: 2000, // duration to cache current position
          timeout: 5000, // timeout for try to call successFunction, else call errorFunction
          enableHighAccuracy: true, // take position from gps not network-based method
        }
      );
    });

    /*
     * Setzt die Geometrien auf gleiche Werte in
     * -> WKX Geometry Objekt im Feature
     * -> WKB für den Wert des geom_attribut: geom.toEwkb().toString('hex') => 0101000000000000000000f03f0000000000000040...
     * -> LatLng für die Geometrie des circleMarkers oder/und editables: feature.wkxToLatLngs(geom) => [[[54, 12], [54.1 12.1]],[[54 12], [...]],[...]]]
     * -> WKT für die Anzeige im Formular: geom.toWkt() => 'MULTIPOLYGON(((54, 12 ....)))'
     * @params event event object
     * @params options: Object mit den Attributen
     *   geom: Die Geometrie, die gesetzt werde soll im wkx Objekt-Format
     *   exclude: Die Variante zum setzen der Geometrie nicht verwenden
     */
    $(document).on("geomChanged", function (event, options) {
      let feature = kvm.activeLayer.activeFeature;
      let geom = options.geom;
      let exclude = options.exclude;

      //console.log("Trigger Funktion geomChanged: geom: %o und exclude: %s", geom, exclude);
      if (exclude != "wkx") {
        var oldGeom = feature.newGeom,
          newGeom = geom;
        if (newGeom != oldGeom) {
          feature.newGeom = newGeom;
          //console.log("Trigger Funktion geomChanged: Neue WKX Geometrie im Feature: %o", feature);
        }
      }

      // Das kann eigentlich auch gemacht werden beim Speichern.
      if (exclude != "wkb") {
        let oldGeom: any = $("#featureFormular input[name=" + kvm.activeLayer.get("geometry_attribute") + "]").val();

        let newGeom = geom.toEwkb().toString("hex");

        //console.log("Trigger Funktion geomChanged: newGeom: " + newGeom);
        //console.log("Trigger Funktion geomChanged: oldGeom: " + oldGeom);
        if (newGeom != oldGeom) {
          $("#featureFormular input[name=" + kvm.activeLayer.get("geometry_attribute") + "]")
            .val(newGeom)
            .change();
          //console.log("Trigger Funktion geomChanged: Neue WKB Geometrie im Hidden-Field von geom_attribut im Formular: %s", newGeom);
          //kvm.deb("Trigger Funktion geomChanged: Neue WKB Geometrie im Formular Attribut " + kvm.activeLayer.get("geometry_attribute") + ": " + newGeom);
        }
      }

      if (exclude != "wkt") {
        var oldGeom: any = $("#geom_wkt").val(),
          newGeom = geom.toWkt();

        // console.log("Trigger Funktion geomChanged: Vergleiche alt: %s mit neu: %s", oldGeom, newGeom);
        if (newGeom != oldGeom) {
          $("#geom_wkt").val(newGeom);
          // console.log("Trigger Funktion geomChanged: Neue WKT Geometrie für die Anzeige als Text im Formular: %s", newGeom);
        }
      }

      if (exclude != "latlngs") {
        feature.setLatLngs(geom);
      }
      //        kvm.activeLayer.features[feature.id] = feature;
      //        kvm.activeLayer.activeFeature = feature;
      // console.log("Trigger Funktion geomChanged: fertig");
    });
  }
}

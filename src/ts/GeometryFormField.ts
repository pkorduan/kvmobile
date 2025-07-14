import { Buffer } from "buffer";
import { kvm } from "./app";
import * as wkx from "wkx";
import { AbstractField, Field } from "./Field";
import { Attribute, AttributeSetting } from "./Attribute";
import { alertNative, confirm, createHtmlElement } from "./Util";
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
export class GeometrieFormField extends AbstractField implements Field {
  hiddenElement: HTMLInputElement;
  element: HTMLDivElement;
  geomWkt: HTMLTextAreaElement | HTMLInputElement;
  saveGpsPositionButton: HTMLElement;
  showGpsStatusButton: SVGSVGElement;
  goToGpsPositionButton: HTMLElement;

  constructor(formId: string, attr: Attribute) {
    super(formId, attr);
    // this.settings = settings;
    // this.selector = "#" + formId + " input[id=" + this.settings.index + "]";
    const div = (this.element = createHtmlElement("div"));
    div.style.display = "flex";
    div.style.flexDirection = "column";
    this.hiddenElement = createHtmlElement("input", div);
    this.hiddenElement.type = "hidden";
    this.hiddenElement.id = String(attr.settings.index);
    this.hiddenElement.name = attr.settings.name;
    this.hiddenElement.disabled = attr.settings.privilege == "0";

    if (attr.layer.settings.geometry_type == "Point") {
      const bttnDiv = createHtmlElement("div", div);
      bttnDiv.style.display = "flex";
      const saveGpsPositionButton = (this.saveGpsPositionButton = createHtmlElement("i", bttnDiv, "fa fa-map-marker fa-2x"));
      saveGpsPositionButton.id = "rtr_saveGpsPositionButton";
      saveGpsPositionButton.style.cssText = "margin-right: 20px; margin-left: 7px; color: rgb(38, 50, 134);";

      saveGpsPositionButton.addEventListener("click", () => {
        this.saveGpsPositionButtonClicked();
      });

      const svg = (this.showGpsStatusButton = document.createElementNS("http://www.w3.org/2000/svg", "svg"));
      svg.style.height = "28px";
      svg.innerHTML =
        '<g id="gps-signal-icon" class="gps-signal-level-0" transform="scale(1 -1) translate(0 -28)">\
              <rect class="bar-1" x="0" y="0" width="4" height="4" />\
              <rect class="bar-2" x="6" y="0" width="4" height="10" />\
              <rect class="bar-3" x="12" y="0" width="4" height="16" />\
              <rect class="bar-4" x="18" y="0" width="4" height="22" />\
              <rect class="bar-5" x="24" y="0" width="4" height="28" />\
            </g>';
      bttnDiv.append(svg);
      svg.addEventListener("click", () => {
        kvm.msg("Die GPS-Genauigkeit beträgt ca. " + Math.round(kvm.controller.mapper.getGPSAccuracy()) + " Meter.");
      });

      const goToGpsPositionButton = (this.goToGpsPositionButton = createHtmlElement("i", bttnDiv, "fa fa-pencil fa-2x"));
      goToGpsPositionButton.id = "rtr_goToGpsPositionButton";
      goToGpsPositionButton.style.cssText = "float: right; margin-right: 20px; margin-left: 7px; color: rgb(38, 50, 134);";
      goToGpsPositionButton.addEventListener("click", () => {
        console.log("Fly to feature position.");
        kvm.showView("mapEdit");
        kvm.map.flyTo(kvm.getActiveLayer().activeFeature.editableLayer.getLatLng(), 18);
      });
      //     valueDiv.innerHTML =
      //       '<i id="saveGpsPositionButton" class="fa fa-map-marker fa-2x" aria-hidden="true"
      // style="margin-right: 20px; margin-left: 7px; color: rgb(38, 50, 134);"></i>\
      //     <svg onclick="kvm.msg(\'Die GPS-Genauigkeit beträgt ca. \' + Math.round(kvm.controller.mapper.getGPSAccuracy()) + \' Meter.\')" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="28" height="28" version="1.1">\
      //       <g id="gps-signal-icon" class="gps-signal-level-0" transform="scale(1 -1) translate(0 -28)">\
      //         <rect class="bar-1" x="0" y="0" width="4" height="4" />\
      //         <rect class="bar-2" x="6" y="0" width="4" height="10" />\
      //         <rect class="bar-3" x="12" y="0" width="4" height="16" />\
      //         <rect class="bar-4" x="18" y="0" width="4" height="22" />\
      //         <rect class="bar-5" x="24" y="0" width="4" height="28" />\
      //       </g>\
      //     </svg>\
      //     <i id="goToGpsPositionButton" class="fa fa-pencil fa-2x" aria-hidden="true" style="float: right; margin-right: 20px; margin-left: 7px; color: rgb(38, 50, 134);"></i>\
      this.geomWkt = createHtmlElement("input", div);
      this.geomWkt.type = "text";
    } else {
      this.geomWkt = createHtmlElement("textarea", div);
      this.geomWkt.cols = 40;
      this.geomWkt.rows = 5;
    }
    this.geomWkt.id = "geom_wkt";

    // this.element = $(
    //   '\
    //     <input\
    //     type="hidden"\
    //     id="' +
    //     this.settings.index +
    //     '"\
    //     name="' +
    //     this.settings.name +
    //     '"\
    //     value=""' +
    //     (this.settings.privilege == "0" ? " disabled" : "") +
    //     "\
    //     />"
    // );
  }

  // get(key) {
  //     return this.settings[key];
  // }

  async setValue(val) {
    console.log(`GeometrieFormField(${val})`, val);
    this._value = val;
    this._oldValue = val;
    console.log("GeometrieFormField.setValue with value:" + val);
    if (val) {
      const geom = wkx.Geometry.parse(<any>new Buffer(val, "hex"));
      this.hiddenElement.value = geom.toEwkb().toString("hex");
      this.geomWkt.value = geom.toWkt();
    } else {
      this.hiddenElement.value = "";
    }
  }

  getValue() {
    // console.log("GeometrieFormField.getValue");
    // const val = this.element.value;

    // if (typeof val === "undefined" || val == "") {
    //   return null;
    // }
    return this.hiddenElement.value;
    /*
      else {
        val = kvm.wkx.Geometry.parse('SRID=4326;POINT(' + val + ')').toEwkb().inspect().replace(/<|Buffer| |>/g, '');
      }
  */
    // return val;
  }

  async saveGpsPositionButtonClicked() {
    console.log("saveGpsPositionButtonClicked");
    navigator.geolocation.getCurrentPosition(
      async (geoLocation) => {
        const confirmed = await confirm("Position:\n" + geoLocation.coords.longitude + " " + geoLocation.coords.latitude + "\nübernehmen?", "neue Position");
        if (confirmed) {
          console.log("Set new Position " + geoLocation.coords.latitude + " " + geoLocation.coords.longitude);
          const feature = kvm.getActiveLayer().activeFeature;
          const newGeom = feature.aLatLngsToWkx([{ lat: geoLocation.coords.latitude, lng: geoLocation.coords.longitude }]);

          this.geomWkt.value = newGeom.toWkt();
          document.dispatchEvent(new CustomEvent("geomChanged", { detail: { geom: newGeom, exclude: "wkt" } }));
        }
      },
      (error) => {
        alertNative("Es kann keine GPS-Position bestimmt werden. Schalten Sie die GPS Funktion auf Ihrem Gerät ein, suchen Sie einen Ort unter freiem Himmel auf und versuchen Sie es dann noch einmal.", "GPS-Position");
      },
      {
        maximumAge: 2000, // duration to cache current position
        timeout: 5000, // timeout for try to call successFunction, else call errorFunction
        enableHighAccuracy: true, // take position from gps not network-based method
      }
    );
  }

  bindEvents() {
    //console.log('SelectFormField.bindEvents');
    // $("#featureFormular input[id=" + this.settings.index + "]").on("change", function () {
    //   if (!$("#saveFeatureButton").hasClass("active-button")) {
    //     $("#saveFeatureButton").toggleClass("active-button inactive-button");
    //   }
    // });

    // $("#goToGpsPositionButton").on("click", function () {
    //   console.log("Fly to feature position.");
    //   kvm.showView("mapEdit");
    //   kvm.map.flyTo(kvm.getActiveLayer().activeFeature.editableLayer.getLatLng(), 18);
    // });

    // $("#saveGpsPositionButton").on("click", function () {
    //   //console.log('click on saveGpsPositionButton');
    //   navigator.geolocation.getCurrentPosition(
    //     function (geoLocation) {
    //       navigator.notification.confirm(
    //         "Neue Position:\n" + geoLocation.coords.longitude + " " + geoLocation.coords.latitude + "\nübernehmen?",
    //         function (buttonIndex) {
    //           if (buttonIndex == 1) {
    //             console.log("Set new Position " + geoLocation.coords.latitude + " " + geoLocation.coords.longitude);
    //             const feature = kvm.getActiveLayer().activeFeature;
    //             const newGeom = feature.aLatLngsToWkx([{ lat: geoLocation.coords.latitude, lng: geoLocation.coords.longitude }]);

    //             $("#geom_wkt").val(newGeom.toWkt());

    //             //console.log("Trigger geomChanged mit coords der Geolocation: %o", geoLocation.coords);
    //             document.dispatchEvent(new CustomEvent("geomChanged", { detail: { geom: newGeom, exclude: "wkt" } }));
    //             // $(document).trigger("geomChanged", [{ geom: newGeom, exclude: "wkt" }]);
    //           }
    //         },
    //         "GPS-Position",
    //         ["ja", "nein"]
    //       );
    //     },
    //     function (error) {
    //       navigator.notification.confirm(
    //         "Es kann keine GPS-Position bestimmt werden. Schalten Sie die GPS Funktion auf Ihrem Gerät ein, suchen Sie einen Ort unter freiem Himmel auf und versuchen Sie es dann noch einmal.",
    //         function (buttonIndex) {
    //           if (buttonIndex == 1) {
    //             kvm.log("Einschalten der GPS-Funktion.", 3);
    //           }
    //         },
    //         "GPS-Position",
    //         ["ok", "abbrechen"]
    //       );
    //     },
    //     {
    //       maximumAge: 2000, // duration to cache current position
    //       timeout: 5000, // timeout for try to call successFunction, else call errorFunction
    //       enableHighAccuracy: true, // take position from gps not network-based method
    //     }
    //   );
    // });

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
    // $(document).on("geomChanged", function (event, options) {
    document.addEventListener("geomChanged", (event: CustomEvent) => {
      console.log("GeometrieFormField.geomChanged", event, event.detail);
      const feature = kvm.getActiveLayer().activeFeature;
      const geom = event.detail.geom;
      const exclude = event.detail.exclude;

      //console.log("Trigger Funktion geomChanged: geom: %o und exclude: %s", geom, exclude);
      if (exclude != "wkx") {
        const oldGeom = feature.newGeom,
          newGeom = geom;
        if (newGeom != oldGeom) {
          feature.newGeom = newGeom;
          //console.log("Trigger Funktion geomChanged: Neue WKX Geometrie im Feature: %o", feature);
        }
      }

      // Das kann eigentlich auch gemacht werden beim Speichern.
      // TODO jquery
      if (exclude != "wkb") {
        const oldGeom: any = $("#featureFormular input[name=" + kvm.getActiveLayer().get("geometry_attribute") + "]").val();

        const newGeom = geom.toEwkb().toString("hex");

        //console.log("Trigger Funktion geomChanged: newGeom: " + newGeom);
        //console.log("Trigger Funktion geomChanged: oldGeom: " + oldGeom);
        if (newGeom != oldGeom) {
          $("#featureFormular input[name=" + kvm.getActiveLayer().get("geometry_attribute") + "]")
            .val(newGeom)
            .change();
          //console.log("Trigger Funktion geomChanged: Neue WKB Geometrie im Hidden-Field von geom_attribut im Formular: %s", newGeom);
          //kvm.deb("Trigger Funktion geomChanged: Neue WKB Geometrie im Formular Attribut " + kvm.activeLayer.get("geometry_attribute") + ": " + newGeom);
        }
      }

      if (exclude != "wkt") {
        const oldGeom: any = this.geomWkt.value,
          newGeom = geom.toWkt();

        // console.log("Trigger Funktion geomChanged: Vergleiche alt: %s mit neu: %s", oldGeom, newGeom);
        if (newGeom != oldGeom) {
          this.geomWkt.value = newGeom;
          // console.log("Trigger Funktion geomChanged: Neue WKT Geometrie für die Anzeige als Text im Formular: %s", newGeom);
        }
      }

      if (exclude != "latlngs") {
        feature.setLatLngs(geom);
      }
      //        kvm.activeLayer.features.get(feature.id) = feature;
      //        kvm.activeLayer.activeFeature = feature;
      // console.log("Trigger Funktion geomChanged: fertig");

      this.fireChanged();
    });
  }

  createInputElement(): HTMLElement {
    return this.element;
  }
}

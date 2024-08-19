import { LayerGroup, GeoJSON } from "leaflet";

import { kvm } from "./app";
import { Attribute } from "./Attribute";
import { Stelle } from "./Stelle";
import { sperrBildschirm } from "./SperrBildschirm";

export class OverlayX {
  //var overlay_ = this;
  stelle: Stelle;
  settings: any;
  globalId: String;
  attributes: Attribute[];
  features: any;
  layerGroup: any;
  attribute_index: { [key: string]: number };

  constructor(stelle: Stelle, settings = {}) {
    // const overlay_ = this;
    this.stelle = stelle;
    this.settings = typeof settings == "string" ? JSON.parse(settings) : settings;

    if (this.settings["name_attribute"] == "") {
      this.settings["name_attribute"] = this.settings["id_attribute"];
      console.log("Set id_attribute: %s as name_attribute", this.settings["id_attribute"]);
    }
    this.globalId = this.getGlobalId();
    kvm.log("Erzeuge Overlayobjekt für Overlay " + this.settings.title + " (globalId: " + this.globalId + ")", 3);
    this.attributes = [];
    this.layerGroup = new LayerGroup();
    this.features = [];

    if (this.settings.attributes) {
      // this.attributes = $.map(this.settings.attributes, function (attribute) {
      //     return new Attribute(overlay_, attribute);
      // });
      this.attributes = this.settings.attributes.map((attribute) => {
        return new Attribute(<any>this, attribute);
      });
      this.attribute_index = this.attributes.reduce((hash, elem: Attribute) => {
        let key: any = elem.settings.name;
        hash[key] = Object.keys(hash).length;
        return hash;
      }, <{ [key: string]: number }>{});
    }

    this.features = {};
  }

  get = function (key) {
    return this.settings[key];
  };

  set = function (key, value) {
    this.settings[key] = value;
    return this.settings[key];
  };

  getGlobalId() {
    return this.stelle.get("id") + "_" + this.get("id");
  }

  getDokumentAttributeNames = function () {
    return $.map(this.attributes, function (attr) {
      if (attr.get("form_element_type") == "Dokument") {
        return attr.get("name");
      }
    });
  };

  isEmpty = function () {
    console.log("isEmpty? syncVersion: ", this.get("syncVersion"));
    return typeof this.get("syncVersion") == "undefined" || this.get("syncVersion") == null || this.get("syncVersion") == "" || this.get("syncVersion") == 0 || (this.get("syncVersion") != "" && this.numFeatures == 0);
  };

  setEmpty = function () {
    this.set("syncVersion", 0);
    this.runningSyncVersion = 0;
  };

  saveSettingsToStore = function () {
    kvm.log("Speicher Settings für Overlay: " + this.settings.title, 3);
    kvm.store.setItem("overlaySettings_" + this.globalId, JSON.stringify(this.settings));
    const overlayIdsItem = "overlayIds_" + this.stelle.get("id");

    if (kvm.store.getItem(overlayIdsItem) === null) {
      kvm.store.setItem(overlayIdsItem, "[]");
    }
    let overlayIds = JSON.parse(<any>kvm.store.getItem(overlayIdsItem));
    if (!overlayIds.includes(this.globalId)) {
      overlayIds.push(this.globalId);
      kvm.store.setItem(overlayIdsItem, JSON.stringify(overlayIds));
    }
  };

  /*
   * Remove overlay layer from map, layer control and store
   * make features and kvm variable empty
   * Other than removeFromApp this function do not remove the overlay
   * from the list of overlays in settings view
   */
  removeFromApp = function () {
    console.log("  requestOverlays) fkt: removeFromApp");
    // remove layer from layer control
    kvm.controls.layers.removeLayer(this.layerGroup);
    // remove layer from map
    kvm.map.removeLayer(this.layerGroup);
    this.layerGroup.clearLayers();
    // empty the layerGroup
    this.layerGroup = new LayerGroup();
    // empty the features list
    this.features = [];
    // empty the overlsays variable of kvm
    delete kvm.overlays[this.globalId];
    console.log("Remove overlay %s from list", this.globalId);
    // remove the list element
    $("#overlay_" + this.globalId).remove();
    // update the overlayIds list in store
    kvm.store.setItem("overlayIds_" + this.stelle.get("id"), JSON.stringify(Object.keys(kvm.overlays)));
    // remove the overlay item in store
    kvm.store.removeItem("overlaySettings_" + this.globalId);
    // remove the overy features in store
    kvm.store.removeItem("overlayFeatures_" + this.globalId);
  };

  /**
   * function draw features on the map and add overlay to layer control
   */
  drawFeatures = function (features) {
    var title = this.getTitle();
    kvm.log("Zeichne Features of overlay " + title, 3);
    this.layerGroup = new GeoJSON(features, {
      style: this.getOverlayStyle.bind(this),
    });
    console.log("Add Overlay with title: %s to layers control.", title);
    kvm.controls.layers.addOverlay(this.layerGroup, title);
    //    this.layerGroup.bringToBack();
  };

  getOverlayStyle = function (geoJsonFeature) {
    //console.log('getOverlayStyle: %o', this);
    if (this.settings.geometry_type == "Point") {
      return this.getOverlayCircleMarkerStyle(geoJsonFeature);
    } else if (this.settings.geometry_type == "Line") {
      return this.getOverlayPolylineStyle(geoJsonFeature);
    } else if (this.settings.geometry_type == "Polygon") {
      return this.getOverlayPolygonStyle(geoJsonFeature);
    }
  };

  getOverlayCircleMarkerStyle = function (geoJsonFeature) {
    //console.log('this: %o', this.settings.classes[0].style);
    const s = this.settings.classes[0].style;
    const d = {
      color: "#284084",
      fill: true,
      fillOpacity: 0.5,
      fillColor: "#3a5dbf",
      weight: 4,
    };
    const r = {
      color: s.color ? kvm.rgbToHex(s.color) : d.color,
      weight: s.weight || d.weight,
      fill: d.fill,
      fillOpacity: s.opacity ? s.opacity / 100 : d.fillOpacity,
      fillColor: s.fillColor ? kvm.rgbToHex(s.fillColor) : d.fillColor,
    };
    //console.log('r: %o', r);
    return r;
  };

  getOverlayPolylineStyle = function (geoJsonFeature) {
    //console.log('this: %o', this.settings.classes[0].style);
    var s = this.settings.classes[0].style,
      d = {
        color: "#284084",
        fill: true,
        fillOpacity: 0.5,
        fillColor: "#3a5dbf",
        weight: 4,
      },
      r = {
        color: s.fillColor ? kvm.rgbToHex(s.fillColor) : d.color,
        weight: s.weight || d.weight,
        opacity: s.opacity ? s.opacity / 100 : d.fillOpacity,
      };
    //console.log('r: %o', r);
    return r;
  };

  getOverlayPolygonStyle = function (geoJsonFeature) {
    //console.log('getOverlayPolygonStyle this: %o', this.settings.classes[0].style);
    var s = this.settings.classes[0].style,
      d = {
        color: "#284084",
        fill: true,
        fillOpacity: 0.5,
        fillColor: "#3a5dbf",
        weight: 4,
      },
      r = {
        color: s.color ? kvm.rgbToHex(s.color) : d.color,
        weight: s.weight || d.weight,
        fill: d.fill,
        fillOpacity: s.opacity ? s.opacity / 100 : d.fillOpacity,
        fillColor: s.fillColor ? kvm.rgbToHex(s.fillColor) : d.fillColor,
      };
    //console.log('r: %o', r);
    return r;
  };

  /*
   * function read features from store and draw it on the map
   */
  loadData = function () {
    console.log("loadData Load Features from store to overlay %s", this.globalId);
    this.features = JSON.parse(<any>kvm.store.getItem("overlayFeatures_" + this.globalId));
    console.log("Add " + this.features.length + " Features to the overlay");
    this.drawFeatures(this.features);
    kvm.overlays[<string>this.globalId] = this;
  };

  /*
   * function read features from remote server, draw it on the map and add overlay to layer control
   */
  reloadData = function () {
    console.log("Frage Daten vom Server ab.<br>Das kann je nach Datenmenge und<br>Internetverbindung einige Minuten dauern.");
    var fileTransfer = new FileTransfer(),
      globalId = this.globalId,
      filename = "data_overlay_" + globalId + ".json",
      url = this.getUrl(),
      title = this.getTitle(),
      this_ = this;

    console.log("Lade Overlaydaten von URL: %s", url);
    kvm.log("Speicher die Daten von Overlay " + globalId + " in Datei: " + cordova.file.dataDirectory + filename, 3);

    fileTransfer.download(
      url,
      cordova.file.dataDirectory + filename,
      function (fileEntry) {
        fileEntry.file(
          function (file) {
            const reader = new FileReader();

            reader.onloadend = function (evt: ProgressEvent<FileReader>) {
              kvm.log("Download der Daten von Overlay " + this_.get("id") + " ist abgeschlossen.", 3, true);
              var items = [],
                collection: any = {},
                errMsg = "";

              //console.log('Download Ergebnis von Overlay ' + this_.get('id') + ' (Head 1000): %s', this.result.substring(0, 1000));
              //const result = (<string>evt.target.result).replace("\n", "\\\n");
              const result = <string>evt.target?.result;
              try {
                collection = JSON.parse(result);
              } catch (e) {
                errMsg = "Fehler beim Parsen der von " + this_.getUrl() + " heruntergeladenen Daten: " + result.substring(0, 1000);
                kvm.msg(errMsg, "Fehler");
                kvm.log(errMsg, 1);
              }
              kvm.log("Anzahl empfangene Datensätze: " + collection.features.length, 3);
              console.log("Add " + collection.features.length + " Features to the overlay");
              this_.features = collection.features;
              try {
                console.log("Call drawFeatures with _this: %o", this_);
                this_.drawFeatures(this_.features);
              } catch (e) {
                errMsg = "Fehler beim Zeichnen der Features des Overlays " + this_.globalId;
                kvm.msg(errMsg, "Fehler");
                kvm.log(errMsg, 1);
              }
              kvm.overlays[<string>globalId] = this_;
              kvm.store.setItem("overlayFeatures_" + this_.globalId, JSON.stringify(this_.features));
              if ($("#syncOverlayIcon_" + this_.globalId).hasClass("fa-spinner")) {
                $("#syncOverlayIcon_" + this_.globalId).toggleClass("fa-refresh fa-spinner fa-spin");
              }
            };
            reader.readAsText(file);
          },
          function (error) {
            alert("Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für die Synchronisation verwendet werden.");
            kvm.log("Fehler beim lesen der Datei: " + error.code, 1);
            sperrBildschirm.close();
          }
        );
      },
      this.downloadError,
      true
    );
  };

  /**
   * function append overlay in overlay list and bind events on function buttons
   */
  appendToApp = function () {
    console.log("Overlay.appendToApp: %s", this.get("title"));
    kvm.log("Füge Overlay " + this.get("title") + " zur Overlayliste hinzu.", 3);
    $("#overlay_list").append(this.getListItem());
    this.bindOverlayEvents();
  };

  bindOverlayEvents = function () {
    console.log("bind events for overlay: %s", this.globalId);

    $("#overlay-functions-button_" + this.globalId).on("click", function (evt) {
      var target = $(evt.target);
      console.log("click on overlay-functions-button von div %o", target.parent().attr("id"));
      target.parent().children().filter(".overlay-functions-div").toggle();
      target.toggleClass("fa-ellipsis-v fa-regular fa-rectangle-xmark");
    });

    $("#syncOverlayButton_" + this.globalId).on("click", function (evt) {
      console.log("click on target %o", evt.target);
      var target = $(evt.currentTarget),
        globalId = target.val(),
        overlay = kvm.overlays[<string>globalId];

      console.log("syncOverlayButton has id: %s", globalId);

      sperrBildschirm.clear();

      if (target.hasClass("inactive-button")) {
        kvm.msg("Keine Internetverbindung! Kann Overlay jetzt nicht synchronisieren.");
      } else {
        $("#syncOverlayIcon_" + globalId).toggleClass("fa-refresh fa-spinner fa-spin");
        navigator.notification.confirm(
          "Overlay vom Server holen und Daten in der App aktualisieren?",
          function (buttonIndex) {
            if (buttonIndex == 1) {
              // ja
              console.log("Entferne Features von Feature liste");
              overlay.features = [];
              console.log("Entferne features des Overlay aus der Karte");
              overlay.removeFromApp();
              overlay.reloadData();
            } else {
              $("#syncOverlayIcon_" + globalId).toggleClass("fa-refresh fa-spinner fa-spin");
            }
          },
          "Aktualisierung Overlay",
          ["ja", "nein"]
        );
      }
    });
  };

  getTitle = function () {
    return kvm.coalempty(this.get("alias"), this.get("title"), this.get("table_name"), this.globalId);
  };

  getUrl = function () {
    kvm.log("Layer.getUrl", 4);
    var url = this.stelle.get("url"),
      file = this.stelle.getUrlFile(url);

    url += file + "Stelle_ID=" + this.stelle.get("Stelle_ID") + "&" + "login_name=" + this.stelle.get("login_name") + "&" + "selected_layer_id=" + this.get("id") + "&" + "passwort=" + encodeURIComponent(this.stelle.get("passwort")) + "&go=Daten_Export_Exportieren&without_filter=1&export_format=GeoJSONPlus&all=1&epsg=4326";
    console.log("Url zum laden des Overlay " + this.get("title") + ": %s", url);
    return url;
  };

  downloadError = function (error) {
    kvm.log("download error source " + error.source);
    kvm.log("download error target " + error.target);
    kvm.log("download error code: " + error.code);
    kvm.log("download error http_status: " + error.http_status);
    alert("Fehler beim herunterladen der Datei von der Url: " + error.source + "! Error code: " + error.code + " http_status: " + error.http_status);
  };

  getListItem = function () {
    var html =
      '\
      <div id="overlay_' +
      this.globalId +
      '">\
        ' +
      (this.get("alias") ? this.get("alias") : this.get("title")) +
      '\
        <i id="overlay-functions-button_' +
      this.globalId +
      '" class="overlay-functions-button fa fa-ellipsis-v" aria-hidden="true"></i>\
        <div class="overlay-functions-div">\
          <button id="syncOverlayButton_' +
      this.globalId +
      '" value="' +
      this.globalId +
      '" class="settings-button sync-overlay-button active-button overlay-function-button">\
            <i id="syncOverlayIcon_' +
      this.globalId +
      '" class="fa fa-refresh" aria-hidden="true"></i>\
          </button> Daten aktualisieren\
        </div>\
      </div>\
      <div style="clear: both"></div>';
    return html;
  };
}

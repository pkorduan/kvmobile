import * as L from "leaflet";

import { kvm } from "./app";
import { Attribute } from "./Attribute";

export function Overlay(stelle, settings = {}): void {
    var overlay_ = this;
    this.stelle = stelle;
    this.settings = typeof settings == "string" ? $.parseJSON(settings) : settings;
    if (this.settings["name_attribute"] == "") {
        this.settings["name_attribute"] = this.settings["id_attribute"];
        console.log("Set id_attribute: %s as name_attribute", this.settings["id_attribute"]);
    }
    this.globalId = this.stelle.get("id") + "_" + this.settings.id;
    kvm.log("Erzeuge Overlayobjekt für Overlay " + this.settings.title + " (globalId: " + this.globalId + ")", 3);
    this.attributes = [];
    this.layerGroup = L.layerGroup();
    this.features = [];

    if (this.settings.attributes) {
        this.attributes = $.map(this.settings.attributes, function (attribute) {
            return new Attribute(overlay_, attribute);
        });
        this.attribute_index = this.attributes.reduce((hash, elem) => {
            hash[elem.settings.name] = Object.keys(hash).length;
            return hash;
        }, {});
    }

    this.features = {};

    this.get = function (key) {
        return this.settings[key];
    };

    this.set = function (key, value) {
        this.settings[key] = value;
        return this.settings[key];
    };

    this.getDokumentAttributeNames = function () {
        return $.map(this.attributes, function (attr) {
            if (attr.get("form_element_type") == "Dokument") {
                return attr.get("name");
            }
        });
    };

    this.isEmpty = function () {
        console.log("isEmpty? syncVersion: ", this.get("syncVersion"));
        return typeof this.get("syncVersion") == "undefined" || this.get("syncVersion") == null || this.get("syncVersion") == "" || this.get("syncVersion") == 0 || (this.get("syncVersion") != "" && this.numFeatures == 0);
    };

    this.setEmpty = function () {
        this.set("syncVersion", 0);
        this.runningSyncVersion = 0;
    };

    this.saveSettingsToStore = function () {
        kvm.log("Speicher Settings für Overlay: " + this.settings.title, 3);
        kvm.store.setItem("overlaySettings_" + this.globalId, JSON.stringify(this.settings));
        kvm.store.setItem(
            "overlayIds_" + this.stelle.get("id"),
            JSON.stringify(
                $.map(kvm.overlays, function (overlay) {
                    return overlay.get("id");
                })
            )
        );
    };

    /*
     * Remove overlay layer from map, layer control and store
     * make features and kvm variable empty
     * Other than removeFromApp this function do not remove the overlay
     * from the list of overlays in settings view
     */
    this.removeFromApp = function () {
        console.log("  requestOverlays) fkt: removeFromApp");
        kvm.controls.layers.removeLayer(this.layerGroup);
        kvm.map.removeLayer(this.layerGroup);
        this.layerGroup.clearLayers();
        this.layerGroup = L.layerGroup();
        this.features = [];
        delete kvm.overlays[this.globalId];
        $("#overlay_" + this.globalId).remove();
        kvm.store.setItem("overlayIds_" + this.stelle.get("id"), JSON.stringify(Object.keys(kvm.overlays)));
        kvm.store.removeItem("overlaySettings_" + this.globalId);
        kvm.store.removeItem("overlayFeatures_" + this.globalId);
    };

    this.drawFeatures = function (features) {
        var title = this.getTitle();
        kvm.log("Zeichne Features of overlay " + title, 3);
        this.layerGroup = L.geoJSON(features, {
            style: this.getOverlayStyle.bind(this),
        });
        console.log("Add Overlay with title: %s to layers control.", title);
        kvm.controls.layers.addOverlay(this.layerGroup, title);
    };

    this.getOverlayStyle = function (geoJsonFeature) {
        //console.log('getOverlayStyle: %o', this);
        if (this.settings.geometry_type == "Point") {
            return this.getOverlayCircleMarkerStyle(geoJsonFeature);
        } else if (this.settings.geometry_type == "Line") {
            return this.getOverlayPolylineStyle(geoJsonFeature);
        } else if (this.settings.geometry_type == "Polygon") {
            return this.getOverlayPolygonStyle(geoJsonFeature);
        }
    };

    this.getOverlayCircleMarkerStyle = function (geoJsonFeature) {
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
                color: s.color ? kvm.rgbToHex(s.color) : d.color,
                weight: s.weight || d.weight,
                fill: d.fill,
                fillOpacity: s.opacity ? s.opacity / 100 : d.fillOpacity,
                fillColor: s.fillColor ? kvm.rgbToHex(s.fillColor) : d.fillColor,
            };
        //console.log('r: %o', r);
        return r;
    };

    this.getOverlayPolylineStyle = function (geoJsonFeature) {
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

    this.getOverlayPolygonStyle = function (geoJsonFeature) {
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
    this.loadData = function () {
        console.log("loadData Load Features from store to overlay %s", this.globalId);
        this.features = $.parseJSON(kvm.store.getItem("overlayFeatures_" + this.globalId));
        console.log("Add " + this.features.length + " Features to the overlay");
        this.drawFeatures(this.features);
        kvm.overlays[this.globalId] = this;
    };

    this.reloadData = function () {
        kvm.log("Frage Daten vom Server ab.<br>Das kann je nach Datenmenge und<br>Internetverbindung einige Minuten dauern.", 3, true);
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
                        var reader = new FileReader();

                        reader.onloadend = function () {
                            kvm.log("Download der Daten von Overlay " + this_.get("id") + " ist abgeschlossen.", 3, true);
                            var items = [],
                                collection: any = {},
                                errMsg = "";

                            //console.log('Download Ergebnis von Overlay ' + this_.get('id') + ' (Head 1000): %s', this.result.substring(0, 1000));
                            // TODO Bug
                            // this.result = this.result.replace("\n", "\\\n");
                            (<any>this).result = (<any>this).result.replace("\n", "\\\n");
                            try {
                                collection = $.parseJSON((<any>this).result);
                            } catch (e) {
                                errMsg = "Fehler beim Parsen der von " + this_.getUrl() + " heruntergeladenen Daten: " + (<any>this).result.substring(0, 1000);
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
                            kvm.overlays[globalId] = this_;
                            kvm.store.setItem("overlayFeatures_" + this_.globalId, JSON.stringify(this_.features));
                            if ($("#syncOverlayIcon_" + this_.globalId).hasClass("fa-spinner")) {
                                $("#syncOverlayIcon_" + this_.globalId).toggleClass("fa-refresh fa-spinner fa-spin");
                            }
                            $("#sperr_div").hide();
                        };
                        reader.readAsText(file);
                    },
                    function (error) {
                        alert("Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für die Synchronisation verwendet werden.");
                        kvm.log("Fehler beim lesen der Datei: " + error.code, 1);
                        $("sperr_div").hide();
                    }
                );
            },
            this.downloadError,
            true
        );
    };

    this.appendToApp = function () {
        console.log("Overlay.appendToApp: %s", this.get("title"));
        kvm.log("Füge Overlay " + this.get("title") + " zur Overlayliste hinzu.", 3);
        $("#overlay_list").append(this.getListItem());
        this.bindOverlayEvents();
    };

    this.bindOverlayEvents = function () {
        console.log("bind events for overlay: %s", this.globalId);

        $("#overlay-functions-button_" + this.globalId).on("click", function (evt) {
            var target = $(evt.target);
            console.log("click on overlay-functions-button von div %o", target.parent().attr("id"));
            target.parent().children().filter(".overlay-functions-div").toggle();
            target.toggleClass("fa-ellipsis-v fa-window-close-o");
        });

        $("#syncOverlayButton_" + this.globalId).on("click", function (evt) {
            console.log("click on target %o", evt.target);
            var target = $(evt.currentTarget),
                globalId = target.val(),
                overlay = kvm.overlays[<string>globalId];

            console.log("syncOverlayButton has id: %s", globalId);

            $("#sperr_div_content").html("");

            if (target.hasClass("inactive-button")) {
                kvm.msg("Keine Internetverbindung! Kann Overlay jetzt nicht synchronisieren.");
            } else {
                $("#syncOverlayIcon_" + globalId).toggleClass("fa-refresh fa-spinner fa-spin");
                $("#sperr_div").show();
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
                            $("#sperr_div").hide();
                        }
                    },
                    "Aktualisierung Overlay",
                    ["ja", "nein"]
                );
            }
        });
    };

    this.getTitle = function () {
        return kvm.coalempty(this.get("alias"), this.get("title"), this.get("table_name"), this.globalId);
    };

    this.getUrl = function () {
        kvm.log("Layer.getUrl", 4);
        var url = this.stelle.get("url"),
            file = this.stelle.getUrlFile(url);

        url += file + "Stelle_ID=" + this.stelle.get("Stelle_ID") + "&" + "login_name=" + this.stelle.get("login_name") + "&" + "selected_layer_id=" + this.get("id") + "&" + "passwort=" + encodeURIComponent(this.stelle.get("passwort")) + "&" + "go=Daten_Export_Exportieren" + "&" + "export_format=GeoJSON" + "&" + "all=1" + "&" + "epsg=4326";
        console.log("Url zum laden des Overlay " + this.get("title") + ": " + url, 3);
        return url;
    };

    this.downloadError = function (error) {
        kvm.log("download error source " + error.source);
        kvm.log("download error target " + error.target);
        kvm.log("download error code: " + error.code);
        kvm.log("download error http_status: " + error.http_status);
        alert("Fehler beim herunterladen der Datei von der Url: " + error.source + "! Error code: " + error.code + " http_status: " + error.http_status);
    };

    this.getListItem = function () {
        var html = '\
      <div id="overlay_' + this.globalId + '">\
        ' + (this.get("alias") ? this.get("alias") : this.get("title")) + '\
        <i id="overlay-functions-button_' + this.globalId + '" class="overlay-functions-button fa fa-ellipsis-v" aria-hidden="true"></i>\
        <div class="overlay-functions-div">\
          <button id="syncOverlayButton_' + this.globalId + '" value="' + this.globalId + '" class="settings-button sync-overlay-button overlay-function-button">\
            <i id="syncOverlayIcon_' + this.globalId + '" class="fa fa-refresh" aria-hidden="true"></i>\
          </button> Daten aktualisieren\
        </div>\
      </div>\
      <div style="clear: both"></div>';
        return html;
    };

    return this;
}

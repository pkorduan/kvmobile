import { Layer } from "./Layer";
import { kvm } from "./app";
import { Overlay } from "./Overlay";

export class Stelle {
  settings: any;
  numLayers: any;
  numOverlays: any;
  constructor(settings = {}) {
    this.settings = typeof settings == "string" ? JSON.parse(settings) : settings;
  }
  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    return this.settings[key];
  }

  viewDefaultSettings() {
    $("#kvwmapServerIdField").val(kvm.config.kvwmapServerId);
    $("#kvwmapServerNameField").val(kvm.config.kvwmapServerName);
    $("#kvwmapServerUrlField").val(kvm.config.kvwmapServerUrl);
    $("#kvwmapServerLoginNameField").val(kvm.config.kvwmapServerLoginName);
    $("#kvwmapServerPasswortField").val(kvm.config.kvwmapServerPasswort);
  }

  viewSettings() {
    kvm.log("ServerSettings.viewSettings", 4);
    $("#kvwmapServerIdField").val(this.get("id"));
    $("#kvwmapServerNameField").val(this.get("name"));
    $("#kvwmapServerUrlField").val(this.get("url"));
    $("#kvwmapServerLoginNameField").val(this.get("login_name"));
    $("#kvwmapServerPasswortField").val(this.get("passwort"));

    $("#kvwmapServerStelleSelectField").find("option").remove();
    $.each(JSON.parse(this.get("stellen")), function (index, stelle) {
      $("#kvwmapServerStelleSelectField").append('<option value="' + stelle.ID + '">' + stelle.Bezeichnung + "</option>");
    });
    $("#kvwmapServerStelleSelectField").val(this.get("Stelle_ID"));
    $("#kvwmapServerStellenField").val(this.get("stellen"));
  }

  saveToStore() {
    kvm.log("Speicher Stelleneinstellungen in lokalen Speicher: " + JSON.stringify(this.settings));
    kvm.store.setItem("stelleSettings_" + this.get("id"), JSON.stringify(this.settings));
  }

  setActive() {
    kvm.log("Stelle.js setActive", 4);
    kvm.activeStelle = this;
    kvm.store.setItem("activeStelleId", this.get("id"));
  }

  /*
   * Request all stellen from active serversetting
   */
  requestStellen() {
    kvm.log('Stelle.requestStellen: "' + this.getStellenUrl() + '"');
    var fileTransfer = new FileTransfer(),
      filename = cordova.file.dataDirectory + "stellen.json",
      url = this.getStellenUrl();

    kvm.log("Download Stellen von Url: " + url);
    kvm.log("Speicher die Datei auf dem Gerät in Datei: " + filename);

    fileTransfer.download(
      url,
      filename,
      function (fileEntry) {
        fileEntry.file(
          function (file) {
            var reader = new FileReader();

            reader.onloadend = function () {
              kvm.log("Download Result: " + this.result, 4);
              var errMsg = "";

              if (typeof this.result === "string" && this.result.indexOf('form name="login"') == -1) {
                if (kvm.isValidJsonString(this.result)) {
                  const resultObj = JSON.parse(this.result);
                  if (resultObj.success) {
                    // TODO notused
                    const validResult = true;
                    kvm.log("Download der Stellendaten erfolgreich.", 3);
                    console.log("Download erfolgreich. Antwortobjekt: %o", resultObj);

                    $("#kvwmapServerStelleSelectField").find("option").remove();
                    kvm.store.setItem("userId", resultObj.user_id);
                    kvm.store.setItem("userName", resultObj.user_name);
                    $.each(resultObj.stellen, function (index, stelle) {
                      $("#kvwmapServerStelleSelectField").append('<option value="' + stelle.ID + '">' + stelle.Bezeichnung + "</option>");
                    });
                    $("#kvwmapServerStellenField").val(JSON.stringify(resultObj.stellen));
                    $("#requestStellenButton").hide();
                    if (resultObj.stellen.length == 1) {
                      $("#kvwmapServerStelleSelectField").val(resultObj.stellen[0].ID);
                      $("#saveServerSettingsButton").show();
                    } else {
                      $("#saveServerSettingsButton").hide();
                    }
                    $("#kvwmapServerStelleSelectField").show();
                  } else {
                    errMsg = "Fehler beim Abfragen der Stellendaten. " + (resultObj.err_msg ? resultObj.err_msg : "");
                  }
                } else {
                  errMsg =
                    "Fehler beim Abfragen der Stellendaten. Abfrage liefert keine korrekten Daten vom Server. Entweder sind keine auf dem Server vorhanden oder die URL der Anfrage ist nicht korrekt. Prüfen Sie die Parameter unter Einstellungen.";
                }
              } else {
                errMsg = "Zugang zum Server verweigert! Prüfen Sie Ihre Zugangsdaten unter Einstellungen.";
              }
              if (errMsg != "") {
                kvm.msg(errMsg);
                kvm.log(errMsg, 1);
              }
              $("#sperr_div").hide();
            };

            reader.readAsText(file);
          },
          function (error) {
            kvm.msg("Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für den Download verwendet werden.");
            kvm.log("Fehler beim lesen der Datei: " + error.code);
            $("#sperr_div").hide();
          }
        );
      },
      function (err) {
        var errMsg =
          "Fehler beim Download der Stellendaten code: " +
          err.code +
          " status: " +
          err.http_status +
          " Prüfen Sie ob der Nutzer vom dem Gerät aus mit seiner IP auf die Stelle zugreifen darf und die Domain in config.xml eingetragen ist.";
        console.error(err);
        kvm.msg(errMsg);
        $("#sperr_div").hide();
      },
      true
    );
  }

  getStellenUrl() {
    kvm.log("Stellen.getStellenUrl", 4);
    var url = this.get("url"),
      file = this.getUrlFile(url);

    url += file + "go=mobile_get_stellen" + "&login_name=" + this.get("login_name") + "&passwort=" + encodeURIComponent(this.get("passwort")) + "&format=json";
    return url;
  }

  /*
   * get missing parts to url when server.de, server.de/ oder server.de/index.php
   */
  getUrlFile(url) {
    var file = "";

    if (url.slice(-3) == ".de") file = "/index.php?";
    if (url.slice(-1) == "/") file = "index.php?";
    if (url.slice(-9) == "index.php") file = "?";
    if (file == "") file = "/index.php?";

    return file;
  }

  /*
   * For current activeLayer do:
   *   Delete all local data and deltas
   *   Delete table and delta table
   *   load layer definition with attributes new from server therewith
   *   save settings in store and set layer active
   *   create table and delta table new
   *   load data from server and store in local database
   *   load the data from local database and create features, map markers, form and featurelist
   */
  // ToDo: Diese Funktion ggf. Klasse Layer zuordnen wenn es möglich ist die Layersettings eines einzelnen Layers herunterzuladen. Dort dann keine layerId mehr übergeben sondern updateLayerSettings on LayerObjekt
  // also ToDo mobile_get_layers erweitern mit der Option das für eine bestimmte LayerID zu filtern.
  reloadLayer(layerId) {
    console.log("Layer.reloadLayer for stelle: %o", this);
    var fileTransfer = new FileTransfer(),
      filename = cordova.file.dataDirectory + "layers_stelle_" + this.get("id") + ".json",
      //filename = 'temp_file.json',
      url = this.getLayerUrl();

    kvm.log("Download Layerdaten von Url: " + url);
    kvm.log("Speicher die Datei auf dem Gerät in Datei: " + filename);

    fileTransfer.download(
      url,
      filename,
      function (fileEntry) {
        fileEntry.file(
          function (file) {
            var reader = new FileReader();

            reader.onloadend = function () {
              kvm.log("Reload der Layerdaten abgeschlossen.", 3);
              var items = [],
                validationResult = "";

              kvm.log("Download Result: " + this.result, 4);
              const resultObj = <any>kvm.parseLayerResult(this.result);

              if (resultObj.success) {
                kvm.log("layerResult is valid!", 4);
                kvm.log("Download erfolgreich.", 3);
                //console.log('resultObj: %o', resultObj);

                //kvm.activeStelle.numLayers = resultObj.layers.length; Anzahl bleibt die gleiche wenn nur ein Layer neu geladen wird.

                var layerSettings = resultObj.layers.filter(function (layer) {
                    return layer.id == layerId;
                  })[0],
                  layer;

                kvm.activeLayer.removeFromApp();
                console.log("Erzeuge neuen Layer");
                layer = new Layer(kvm.activeStelle, layerSettings);
                layer.saveToStore();
                layer.updateTable(); // function includes appendToApp() and setActive()
              } else {
                kvm.log("Fehlerausgabe von parseLayerResult!", 4);
                kvm.msg(resultObj.errMsg, "2");
              }
              $("#sperr_div").hide();
            };

            reader.readAsText(file);
          },
          function (error) {
            alert("Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für den Download verwendet werden.");
            kvm.log("Fehler beim lesen der Datei: " + error.code);
            $("#sperr_div").hide();
          }
        );
      },
      this.downloadError,
      true
    );
  }

  downloadError(error: FileTransferError) {
    //    url: any, filename: string, arg2: (fileEntry: FileEntry) => void, downloadError: any, arg4: boolean) {
    throw new Error("Method not implemented.");
  }

  /*
   * Request all layers from stelle,
   * write to store,
   * create tables in database and
   * append layer to list
   */
  requestLayers() {
    //console.log('Layer.requestLayers for stelle: %o', this);
    var fileTransfer = new FileTransfer(),
      filename = cordova.file.dataDirectory + "layers_stelle_" + this.get("id") + ".json",
      //filename = 'temp_file.json',
      url = this.getLayerUrl();

    kvm.log("requestLayers) Download Layerdaten von Url: " + url);

    fileTransfer.download(
      url,
      filename,
      function (fileEntry) {
        fileEntry.file(
          function (file) {
            var reader = new FileReader();

            reader.onloadend = function () {
              kvm.log("  requestLayers) Download der Layerdaten abgeschlossen.");
              var items = [],
                validationResult = "";
              //console.log("  requestLayers) Download Result: %o", this.result);
              const resultObj = <any>kvm.parseLayerResult(this.result);

              if (resultObj.success) {
                var layers = [],
                  overlay_layers = [];
                console.log("  requestLayers) Download der Layer der Stelle erfolgreich.");
                //console.log('resultObj: %o', resultObj);

                // remove existing layers
                console.log("  requestLayers) Entferne existierende Layer aus der Anwendung.");
                document.getElementById("layer_list").innerHTML = "";
                if ("layerIds_" + kvm.activeStelle.get("id") in kvm.store) {
                  JSON.parse(kvm.store["layerIds_" + kvm.activeStelle.get("id")]).map(function (id) {
                    let globalId = kvm.activeStelle.get("id") + "_" + id;
                    if (kvm.layers[globalId]) {
                      console.log("  requestLayers) Remove Layer " + globalId + " from app.");
                      kvm.layers[globalId].removeFromApp();
                    }
                  });
                }
                kvm.store.removeItem("activeLayerId");
                /*
                // remove existing overlays
                console.log("  requestLayers) Entferne existierende Overlays aus der Anwendung.");
                document.getElementById("overlay_list").innerHTML = "";
                if ("overlayIds_" + kvm.activeStelle.get("id") in kvm.store) {
                  JSON.parse(kvm.store["overlayIds_" + kvm.activeStelle.get("id")]).map(function (id) {
                    var globalId = kvm.activeStelle.get("id") + "_" + id;
                    if (kvm.overlays[globalId]) {
                      console.log("  requestLayers) Remove Overlay " + globalId + " from app.");
                      kvm.overlays[globalId].removeFromApp();
                    }
                  });
                }
*/
                $("#featurelistHeading").html("Noch keine Layer synchronisiert");
                $("#featurelistBody").html(
                  'Wählen Sie unter Einstellungen in der Gruppe "Layer" einen Layer aus. Öffnen Sie dann das Optionen Menü und wählen die Funktion "Daten synchronisieren"!'
                );
                $("#showSearch").hide();

                kvm.activeStelle.numLayers = resultObj.layers.filter(function (l) {
                  return l.sync == 1;
                }).length;
                // add requested layers
                console.log("  requestLayers) Füge neu runtergeladene Layer zur Anwendung hinzu.");
                $.each(resultObj.layers, function (index, layerSetting) {
                  let layer;
                  console.log("  requestLayers) Layer.requestLayers create layer with settings: %o", layerSetting);
                  layer = new Layer(kvm.activeStelle, layerSetting);
                  layer.createTable(this);
                  layer.appendToApp();
                  if (layerSetting.sync != 1) {
                    console.log("  requestLayer Overlay: %s", layerSetting.title);
                    // lade die Daten runter und speicher sie in lokaler Datenbank
                    //layer.requestData();
                  }
                });

                kvm.setConnectionStatus();
                //console.log('Store after save layer: %o', kvm.store);
                $("#requestLayersButton").hide();
                $("#sperr_div").hide();
              } else {
                kvm.log("Fehlerausgabe von parseLayerResult!", 4);
                kvm.msg(resultObj.errMsg, "Downloadfehler");
              }
              $("#sperr_div").hide();
            };
            reader.readAsText(file);
          },
          function (error) {
            alert("Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für den Download verwendet werden.");
            kvm.log("Fehler beim lesen der Datei: " + error.code);
            $("#sperr_div").hide();
          }
        );
      },
      this.downloadError,
      true
    );
  }

  /**
   * This function is depricated, overlays now are layers with sync = 0
   *
   * Request all layers from stelle,
   * remove existing overlays from app
   * write overlays to store,
   * append overlays to list
   * ToDo: extend getLayerUrl to get only overlays or
   * change to function getOverlayUrl() and Methode mobile_get_layers to mobile_get_overlays
   */
  requestOverlays() {
    //console.log('Layer.requestOverlays for stelle: %o', this);
    var fileTransfer = new FileTransfer(),
      filename = cordova.file.dataDirectory + "layers_stelle_" + this.get("id") + ".json",
      //filename = 'temp_file.json',
      url = this.getLayerUrl();

    kvm.log("requestOverlays) Download Layerdaten von Url: " + url);
    fileTransfer.download(
      url,
      filename,
      function (fileEntry) {
        fileEntry.file(
          function (file) {
            var reader = new FileReader();

            reader.onloadend = function () {
              kvm.log("  requestOverlays) - Download der Layerdaten abgeschlossen.");
              var items = [],
                validationResult = "";
              if (typeof this.result === "string") {
                kvm.log("  requestOverlays) - Download Result: " + this.result.substring(1, 1000), 4);
              }
              const resultObj = <any>kvm.parseLayerResult(this.result);

              if (resultObj.success) {
                var layers = [],
                  overlay_layers = [];
                kvm.alog("  requestOverlays) Download der Layer der Stelle erfolgreich.", "", 3);
                //console.log('resultObj: %o', resultObj);

                // remove existing overlays
                console.log("  requestOverlays) Entferne existierende Overlays aus der Anwendung.");
                // Entferne Overlays aus der App, dem Layer control und der Karte
                if ("overlayIds_" + kvm.activeStelle.get("id") in kvm.store) {
                  console.log("  requestOverlays) parse overlayIds setting from store");
                  JSON.parse(kvm.store["overlayIds_" + kvm.activeStelle.get("id")]).map(function (globalId) {
                    if (kvm.overlays[globalId]) {
                      console.log("  requestOverlays) overlay exists, remove From App");
                      kvm.overlays[globalId].removeFromApp();
                    }
                  });
                }

                kvm.activeStelle.numOverlays = resultObj.layers.filter(function (l) {
                  return l.sync == 1;
                }).length;
                console.log("  requestOverlays) Füge neu %s runtergeladene Overlays zur Anwendung hinzu.", kvm.activeStelle.numOverlays);
                $.each(resultObj.layers, function (index, layerSetting) {
                  let overlay;
                  if (layerSetting.sync != 1) {
                    console.log("  requestOverlays) Zeige Overlay %s an.", layerSetting.title);
                    overlay = new Overlay(kvm.activeStelle, layerSetting);
                    overlay.reloadData(); // read features from remote server, draw it on the map and add overlay to layer control
                    overlay.appendToApp(); // append overlay in overlay list and bind events
                    //overlay.saveSettingsToStore(); // do not save layersettings to local storage any more
                  }
                });
                kvm.setConnectionStatus();
                $("#sperr_div").hide();
              } else {
                console.log("err_msg in resultObj: %s", resultObj.err_msg);
                kvm.msg(resultObj.errMsg + (resultObj.err_msg ? resultObj.err_msg : ""), "Downloadfehler");
              }
              $("#sperr_div").hide();
            };
            reader.readAsText(file);
          },
          function (error) {
            alert("Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für den Download verwendet werden.");
            kvm.log("Fehler beim lesen der Datei: " + error.code);
            $("#sperr_div").hide();
          }
        );
      },
      this.downloadError,
      true
    );
  }

  removeLayers() {
    Object.keys(kvm.layers).map(function (layerId) {
      kvm.layers[layerId].removeFromApp();
    });
  }

  getLayerUrl(options = { hidePassword: false }) {
    kvm.log("Stelle.getLayerUrl", 4);
    var url = this.get("url"),
      file = this.getUrlFile(url);

    url +=
      file +
      "go=mobile_get_layers" +
      "&login_name=" +
      this.get("login_name") +
      "&passwort=" +
      (options.hidePassword ? "*****" : encodeURIComponent(this.get("passwort"))) +
      "&Stelle_ID=" +
      this.get("Stelle_ID") +
      "&format=json";
    return url;
  }

  allLayerLoaded() {
    const layerIds = JSON.parse(kvm.store.getItem("layerIds_" + this.get("id")));
    $.each(layerIds, function (key, layerId) {
      // TODO
      const layerSettings = JSON.parse(kvm.store.getItem("layerSettings_" + layerId));
      if (layerSettings.loaded === false) {
        return false;
      }
    });
    return true;
  }
}

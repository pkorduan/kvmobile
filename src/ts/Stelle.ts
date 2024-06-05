import { Layer } from "./Layer";
import { kvm } from "./app";
import { MapLibreLayer } from "./MapLibreLayer";

type StelleSetting = {
    ID: string;
    Bezeichnung: string;
    dbname: string;
    west: number;
    south: number;
    east: number;
    north: number;
    startCenterLat: number;
    startCenterLon: number;
    layer_params: any;
    id: string;
    name: string;
    bezeichnung: string;
    url: string;
    login_name: string;
    passwort: string;
    Stelle_ID: string;
};

/**
 * Es gibt zwei Varianten wie Layer geladen werden
 * requestLayers - Läd alle Layer neu.
 * 	Löscht dazu vorher alles und legt die Layer neu an
 * 	Ausführung sequenziell
 * reloadLayer - Läd nur den aktiven Layer neu.
 * 	Updated nur die Datentabelle sowie löscht und legt den Layer neu an.
 * 	Ausführung asynchron über callback
 * 	Führt updateTable asynchronaus und darin als Callback
 * 		DROP and CREATE TABLE (nur Datentabelle)
 * 		appendToApp
 * 		saveToStore
 * 		requestData
 */
export class Stelle {
    settings: StelleSetting;
    numOverlays: any;
    numLayersLoaded: number = 0;
    numLayersRead: number = 0;
    numLayers: number = 0;
    loadAllLayers: boolean = false;
    readAllLayers: boolean = false;
    tableNames: string[] = [];

    constructor(settings = {}) {
        this.settings = typeof settings == "string" ? JSON.parse(settings) : settings;
        this.tableNames = this.getTableNames();
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
        //kvm.log("ServerSettings.viewSettings", 4);
        $("#kvwmapServerIdField").val(this.get("id"));
        $("#kvwmapServerNameField").val(this.get("name"));
        $("#kvwmapServerUrlField").val(this.get("url"));
        $("#kvwmapServerLoginNameField").val(this.get("login_name"));
        $("#kvwmapServerPasswortField").val(this.get("passwort"));

        $("#kvwmapServerStelleSelectField").find("option").remove();
        // $.each(JSON.parse(this.get("stellen")), function (index, stelle) {
        // 	$("#kvwmapServerStelleSelectField").append('<option value="' + stelle.ID + '">' + stelle.Bezeichnung + "</option>");
        // });
        $("#kvwmapServerStelleSelectField").val(this.get("Stelle_ID"));
        $("#kvwmapServerStellenField").val(this.get("stellen"));
    }

    saveToStore() {
        //kvm.log("Speicher Stelleneinstellungen in lokalen Speicher: " + JSON.stringify(this.settings));
        kvm.store.setItem("stelleSettings_" + this.get("id"), JSON.stringify(this.settings));
    }

    activate() {
        // kvm.log("Stelle.js activate", 4);
        kvm.activeStelle = this;
        kvm.store.setItem("activeStelleId", this.get("id"));
        $("#activeStelleBezeichnungDiv").html(this.get("bezeichnung")).show();
        let layerParams = [];
        if (kvm.store.getItem(`layerParams`)) {
            layerParams = JSON.parse(kvm.store.getItem("layerParams"));
        }
        kvm.loadLayerParams(this.settings.layer_params, layerParams);
    }

    /*
     * Request all stellen from active serversetting
     */
    requestStellen() {
        //kvm.log('Stelle.requestStellen: "' + this.getStellenUrl() + '"');
        var fileTransfer = new FileTransfer(),
            filename = cordova.file.dataDirectory + "stellen.json",
            url = this.getStellenUrl();

        kvm.log("Download Stellen von Url: " + url);
        //kvm.log("Speicher die Datei auf dem Gerät in Datei: " + filename);

        fileTransfer.download(
            url,
            filename,
            function (fileEntry) {
                fileEntry.file(
                    function (file) {
                        var reader = new FileReader();

                        reader.onloadend = function () {
                            //kvm.log("Download Result: " + this.result, 4);
                            var errMsg = "";

                            if (typeof this.result === "string" && this.result.indexOf('form name="login"') == -1) {
                                if (kvm.isValidJsonString(this.result)) {
                                    const resultObj = JSON.parse(this.result);
                                    if (resultObj.success) {
                                        // TODO notused
                                        const validResult = true;
                                        //kvm.log("Download der Stellendaten erfolgreich.", 3);
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
                                    errMsg = "Fehler beim Abfragen der Stellendaten. Abfrage liefert keine korrekten Daten vom Server. Entweder sind keine auf dem Server vorhanden oder die URL der Anfrage ist nicht korrekt. Prüfen Sie die Parameter unter Einstellungen.";
                                }
                            } else {
                                errMsg = "Zugang zum Server verweigert! Prüfen Sie Ihre Zugangsdaten unter Einstellungen.";
                            }
                            if (errMsg != "") {
                                kvm.msg(errMsg);
                                kvm.log(errMsg, 1);
                            }
                            kvm.closeSperrDiv();
                        };

                        reader.readAsText(file);
                    },
                    function (error) {
                        kvm.msg("Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für den Download verwendet werden.");
                        kvm.log("Fehler beim lesen der Datei: " + error.code);
                        kvm.closeSperrDiv();
                    }
                );
            },
            function (err) {
                var errMsg = "Fehler beim Download der Stellendaten code: " + err.code + " status: " + err.http_status + " Prüfen Sie ob der Nutzer vom dem Gerät aus mit seiner IP auf die Stelle zugreifen darf und die Domain in config.xml eingetragen ist.";
                console.error(err);
                kvm.msg(errMsg);
                kvm.closeSperrDiv();
            },
            true
        );
    }

    getStellenUrl() {
        //kvm.log("Stellen.getStellenUrl", 4);
        var url = this.get("url"),
            file = this.getUrlFile(url);

        url += file + "go=mobile_get_stellen" + "&login_name=" + this.get("login_name") + "&passwort=" + encodeURIComponent(this.get("passwort")) + "&format=json";
        return url;
    }

    finishLayerLoading(layer) {
        console.log("finishLayerReading: readAllLayers= %s, numLayersLoaded=%s, numLayers=%s", this.readAllLayers, this.numLayersLoaded, this.numLayers);
        if (this.loadAllLayers) {
            if (this.numLayersLoaded < this.numLayers - 1) {
                this.numLayersLoaded += 1;
                kvm.tick(`${layer.title}:<br>&nbsp;&nbsp;${this.numLayersLoaded} Layer geladen. Noch ${this.numLayers - this.numLayersLoaded} Layer zu laden.`);
            } else {
                kvm.tick(`${layer.title}:<br>&nbsp;&nbsp;Laden beeendet.`);
                this.numLayersLoaded = 0;
                this.loadAllLayers = false;
                this.tableNames = this.getTableNames();
                // read all layers
                kvm.reloadFeatures();
            }
        } else {
            // read only this layer
            this.readAllLayers = false;
            layer.readData();
        }
    }

    finishLayerReading(layer) {
        console.log("finishLayerReading: readAllLayers= %s, numLayersRead=%s, numLayers=%s", this.readAllLayers, this.numLayersRead, this.numLayers);
        if (this.readAllLayers) {
            if (this.numLayersRead < this.numLayers - 1) {
                this.numLayersRead += 1;
                kvm.tick(`${layer.title}:<br>&nbsp;&nbsp;${this.numLayersRead} Layer geladen. Noch ${this.numLayers - this.numLayersRead} Layer zu laden.`);
            } else {
                kvm.tick(`${layer.title}:<br>&nbsp;&nbsp;Laden beeendet.`);
                this.numLayersRead = 0;
                this.readAllLayers = false;
                const globalLayerId = `${kvm.store.getItem("activeStelleId")}_${kvm.store.getItem("activeLayerId")}`;
                const activeLayer = kvm.getLayer(globalLayerId);
                if (activeLayer) {
                    activeLayer.activate(); // activate latest active
                } else {
                    layer.activate(); // activate latest loaded
                }
                this.tableNames = this.getTableNames();
                kvm.showActiveItem();
                // kvm.closeSperrDiv('Laden der Layer beendet. Schließe Sperr-Bildschirm.');
                kvm.closeSperrDiv("");
            }
        } else {
            kvm.tick(layer.title + ": Laden beeendet.");
            this.sortOverlays();
            layer.activate();
            this.tableNames = this.getTableNames();
            kvm.showActiveItem();
            kvm.closeSperrDiv("Fertig.");
        }
        console.log("activeLayer after finishLayerReading: ", kvm.activeLayer ? kvm.activeLayer.get("id") : "keiner aktiv");
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

    getTableNames() {
        let stelleId = this.get("id");
        if (typeof stelleId == "undefined") return [];

        let layerIdsText = kvm.store.getItem(`layerIds_${this.get("id")}`);
        if (layerIdsText == null) return [];

        let layerIds = JSON.parse(layerIdsText);
        if (!Array.isArray(layerIds)) return [];

        return layerIds
            .map((layerId) => {
                try {
                    let layerSettings = JSON.parse(kvm.store.getItem(`layerSettings_${stelleId}_${layerId}`));
                    return `${layerSettings.schema_name}.${layerSettings.table_name}`;
                } catch ({ name, message }) {
                    let msg = `Fehler beim Parsen der layerSettings ${stelleId}_${layerId}, Einstellungen des Layers können nicht aus dem Store geladen werden. TypeError: ${name}, Message: ${message}`;
                    console.error(msg);
                    kvm.msg(msg, "Fehler");
                }
            })
            .filter((tableName) => {
                return typeof tableName != "undefined";
            });
    }

    /**
     * Load layer definitions with attributes for stelle
     * Remove activeLayer from App and than call updateTable
     * updateTable calls these functions asynchronaus with callbacks
     * 	DROP and CREATE TABLE (nur Datentabelle)
     * 	appendToApp
     * 	saveToStore
     * 	requestData
     */
    // ToDo: Diese Funktion ggf. Klasse Layer zuordnen wenn es möglich ist die Layersettings eines einzelnen Layers herunterzuladen. Dort dann keine layerId mehr übergeben sondern updateLayerSettings on LayerObjekt
    // also ToDo mobile_get_layers erweitern mit der Option das für eine bestimmte LayerID zu filtern.
    reloadLayer(layerId) {
        console.log("Layer.reloadLayer for stelle: %o", this);
        var fileTransfer = new FileTransfer(),
            filename = cordova.file.dataDirectory + "layers_stelle_" + this.get("id") + ".json",
            //filename = 'temp_file.json',
            url = this.getLayerUrl();

        kvm.tick(`Download Layerdaten der Stelle.`);
        console.log("Download Layerdaten von Stelle mit url: %s", kvm.replacePassword(url));
        //kvm.log("Speicher die Datei auf dem Gerät in Datei: " + filename);

        fileTransfer.download(
            url,
            filename,
            function (fileEntry) {
                fileEntry.file(
                    function (file) {
                        var reader = new FileReader();

                        reader.onloadend = function () {
                            kvm.tick("Download abgeschlossen.");
                            let items = [];
                            let validationResult = "";

                            //console.log("Download Result: " + this.result, 4);
                            const resultObj = <any>kvm.parseLayerResult(this.result);

                            if (resultObj.success) {
                                kvm.tick(`${kvm.activeLayer.title}:<br>&nbsp;&nbsp;Download erfolgreich.`);
                                //console.log('resultObj: %o', resultObj);
                                let layerSettings = resultObj.layers.filter(function (layer) {
                                    return layer.id == layerId;
                                })[0];
                                let layer;
                                kvm.tick(`${kvm.activeLayer.title}:<br>&nbsp;&nbsp;Entferne Layer von App.`);
                                kvm.activeLayer.removeFromApp(); // includes removeFromStore()
                                //console.log("Erzeuge neuen Layer");
                                layer = new Layer(kvm.activeStelle, layerSettings);
                                kvm.tick(`${layer.title}:<br>&nbsp;&nbsp;Lege Layer an.`);
                                layer.updateTable(); // includes DROP TABLE IF EXISTS, appendToApp(), activate(), this.sortOverlays(), saveToStore(), readData()
                            } else {
                                kvm.log("Fehlerausgabe von parseLayerResult!", 4);
                                kvm.msg(resultObj.errMsg, "2");
                            }
                            // hier nicht schließen, sonden am Ende von updateTable kvm.closeSperrDiv();
                        };

                        reader.readAsText(file);
                    },
                    function (error) {
                        alert("Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für den Download verwendet werden.");
                        kvm.log("Fehler beim lesen der Datei: " + error.code);
                        kvm.closeSperrDiv();
                    }
                );
            },
            this.downloadError,
            true
        );
    }

    /**
     * Ermittelt den index des layers entsprechend seiner Zeichenreihenfolge.
     * Im Beispiel von Zeichenreihenfolgen [10, 100, 100, 200, 200, 300, 400]
     * würde die Funktion für der Layer mit drawingorder 200 den index 4 liefern.
     * Ein splice(index, 0, Wert) würde den Wert vor die 300 eintragen.
     * [10, 100, 100, 200, 200, 200, 300, 400]
     */
    getLayerDrawingIndex(layer: Layer | MapLibreLayer) {
        //console.log("Ermitteln des erforderlichen Index für die layerIds Liste entsprechend der drawingorder %o", layer);
        // const layers = kvm.getLayers();
        // const sortedLayers = layers.sort((a, b) => (parseInt(a.get("drawingorder")) > parseInt(b.get("drawingorder")) ? 1 : -1));
        const sortedLayers = kvm.getLayersSortedByDrawingOrder();
        // TODO CHECK !!
        let index = sortedLayers.findIndex((layer, index, layers) => parseInt(layer.get("drawingorder")) > parseInt(layer.get("drawingorder")));

        if (index == -1) {
            index = sortedLayers.length;
        }
        console.log("%s: Stelle.getLayerDrawingIndex return index: %s", layer.get("title"), index);
        return index;
    }

    getLayerDrawingGlobalId(index: number) {
        // TODO Check !!!!
        // ATTENTION
        const layers = kvm.getLayersSortedByDrawingOrder();
        // const layer = layers.sort((a, b) => (parseInt(a.get("drawingorder")) > parseInt(b.get("drawingorder")) ? 1 : -1)).map((k, v, i) => k)[index];
        for (let i = 0; i < layers.length; i++) {
            console.error(i + " " + layers[i].title + "\t" + layers[i].get("drawingorder"));
        }
        console.error("Stelle.getLayerDrawingGlobalId: %s", layers[index]);
        return layers[index].getGlobalId();
    }

    downloadError(error: FileTransferError) {
        //    url: any, filename: string, arg2: (fileEntry: FileEntry) => void, downloadError: any, arg4: boolean) {
        throw new Error("Method not implemented.");
    }

    /*
     * Remove existing layer of stelle with sequential function calls
     * 	dropDataTable
     * 	dropDeltasTable
     * 	removeFromApp
     * Request Layer from Stelle and create the layer new with sequential function calls
     * 	createTable
     * 	appendToApp
     * 	saveToStore
     * 	requestData
     */
    requestLayers() {
        //console.log('Layer.requestLayers for stelle: %o', this);
        const fileTransfer = new FileTransfer(),
            filename = cordova.file.dataDirectory + "layers_stelle_" + this.get("id") + ".json",
            //filename = 'temp_file.json',
            url = this.getLayerUrl();

        kvm.tick("Starte Download der Layerdaten der Stelle");
        console.log("Download Layerdaten der Stelle mit url: ", kvm.replacePassword(url));

        fileTransfer.download(
            url,
            filename,
            (fileEntry) => {
                fileEntry.file(
                    (file) => {
                        const reader = new FileReader();

                        reader.onloadend = (evt) => {
                            kvm.tick("Download der Layerdaten abgeschlossen.");
                            var items = [],
                                validationResult = "";
                            console.error("  requestLayers) Download Result: %o", <string>evt.target.result);
                            const resultObj = <any>kvm.parseLayerResult(<string>evt.target.result);

                            if (resultObj.success) {
                                kvm.tick("Downloadergebnis ist fehlerfrei.");
                                //console.log('resultObj: %o', resultObj);

                                // remove existing layers
                                // ToDo Hier prüfen was genau gelöscht werden soll, auch die Tabellen?
                                kvm.tick("Entferne existierende Layer aus der Anwendung.");

                                document.getElementById("layer_list").innerHTML = "";
                                if ("layerIds_" + kvm.activeStelle.get("id") in kvm.store) {
                                    const layerIds = JSON.parse(kvm.store["layerIds_" + kvm.activeStelle.get("id")]);
                                    kvm.tick("Lösche folgende Layer:");
                                    layerIds.map(function (id) {
                                        let globalId = kvm.activeStelle.get("id") + "_" + id;
                                        if (kvm.getLayer(globalId)) {
                                            kvm.tick(`&nbsp;&nbsp;-&nbsp;${kvm.getLayer(globalId).title}`);
                                        }
                                    });
                                    layerIds.map(function (id: string) {
                                        const globalId = kvm.activeStelle.get("id") + "_" + id;
                                        const layer = kvm.getLayer(globalId);
                                        if (layer) {
                                            if (layer.get("vector_tile_url") == "") {
                                                layer.dropDataTable();
                                                layer.dropDeltasTable();
                                            }
                                            layer.removeFromApp();
                                        }
                                    });
                                }
                                kvm.store.removeItem("activeLayerId");

                                $("#featurelistHeading").html("Noch kein Layer ausgewählt");
                                $("#featurelistBody").html('Wählen Sie unter Einstellungen in der Gruppe "Layer" einen Layer aus. Öffnen Sie dann das Optionen Menü und wählen die Funktion "Daten synchronisieren"!');
                                $("#showSearch").hide();
                                this.loadAllLayers = true;
                                this.numLayersLoaded = 0;
                                this.readAllLayers = true;
                                this.numLayersRead = 0;
                                this.numLayers = resultObj.layers.length;
                                if (this.numLayers > 0) {
                                    kvm.tick("Lege Layer neu an.");
                                    // Sortiere Layer settings nach drawing order
                                    resultObj.layers.sort((a, b) => (parseInt(a.drawingorder) > parseInt(b.drawingorder) ? 1 : -1));

                                    // add requested layers
                                    console.log("  requestLayers) Füge neu runtergeladene Layer zur Anwendung hinzu.");
                                    resultObj.layers.forEach((layerSetting) => {
                                        console.log("  requestLayers) Layer.requestLayers create layer with settings: %o", layerSetting);
                                        if (layerSetting.vector_tile_url) {
                                            console.log("Erzeuge einen VectorTile Layer-Objekt");
                                            const layer = new MapLibreLayer(layerSetting, true, this);
                                            layer.appendToApp();
                                            layer.saveToStore();
                                            this.finishLayerReading(layer);
                                        } else {
                                            console.log("Erzeuge einen normales Layer-Objekt");
                                            const layer = new Layer(this, layerSetting);
                                            layer.createTable();
                                            layer.appendToApp();
                                            layer.saveToStore();
                                            layer.requestData(); // Das ist neu: Daten werden gleich geladen nach dem Anlegen in der Stelle
                                        }
                                    });
                                }

                                kvm.setConnectionStatus();
                                //console.log('Store after save layer: %o', kvm.store);
                                $("#requestLayersButton").hide();
                                // hier nicht schließen, sonden am Ende von requestData kvm.closeSperrDiv();
                            } else {
                                kvm.log("Fehlerausgabe von parseLayerResult!", 4);
                                kvm.msg(resultObj.errMsg, "Downloadfehler");
                            }
                        };
                        reader.readAsText(file);
                    },
                    (error) => {
                        alert("Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für den Download verwendet werden.");
                        kvm.log("Fehler beim lesen der Datei: " + error.code);
                        kvm.closeSperrDiv();
                    }
                );
            },
            this.downloadError,
            true
        );
    }

    sortOverlays() {
        kvm.controls.layers._layers
            .filter((l) => l.overlay)
            .sort((a, b) => (parseInt(a.layer.getAttribution()) > parseInt(b.layer.getAttribution()) ? 1 : -1))
            .forEach((overlay) => {
                kvm.controls.layers.removeLayer(overlay.layer);
                kvm.controls.layers.addOverlay(overlay.layer, overlay.name);
            });
    }

    getLayerUrl(options = { hidePassword: false }) {
        //kvm.log("Stelle.getLayerUrl", 4);
        let url = this.get("url");
        let file = this.getUrlFile(url);

        url += `${file}go=mobile_get_layers&login_name=${this.get("login_name")}&passwort=${options.hidePassword ? "*****" : encodeURIComponent(this.get("passwort"))}&Stelle_ID=${this.get("Stelle_ID")}&kvmobile_version=${kvm.versionNumber}&format=json`;
        return url;
    }
}

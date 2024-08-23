import { Layer, LayerSetting } from "./Layer";
import { kvm } from "./app";
import { MapLibreLayer } from "./MapLibreLayer";
import { createHtmlElement, download, executeSQL, hideElement, readFileAsString, removeOptions, setValueOfElement, showElement } from "./Util";
import { sperrBildschirm } from "./SperrBildschirm";
import * as Util from "./Util";

type DeltaEntry = {
  version: string;
  sql: string;
  schema: string;
  table: string;
};

type Deltas = {
  rows: DeltaEntry[];
};

type LayerParams = {
  id: string;
  key: string;
  alias: string;
  default_value: string;
  current_value?: string;
  options_sql: string;
  options: { value: string; output: string }[];
};

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
  layer_params: { [key: string]: LayerParams };
  // id: string;
  name: string;
  bezeichnung: string;
  url: string;
  login_name: string;
  passwort: string;
  Stelle_ID: string;
  syncVersion: any;
  version: any;
};

export type RequestStellenResponse = {
  success: boolean;
  user_id: string;
  user_name: string;
  stellen: {
    ID: string;
    Bezeichnung: string;
    dbname: string;
    west: number;
    south: number;
    east: number;
    north: number;
    startCenterLat: number;
    startCenterLon: number;
    layer_params: [];
  }[];
};

type SendDeltasResponse = {
  success: boolean;
  syncData: {
    id: string;
    client_id: string;
    username: string;
    schema_name: string;
    table_name: string;
    client_time: string;
    pull_from_version: string;
    pull_to_version: string;
    push_from_version: string;
    push_to_version: string;
  }[];
  deltas: {
    version: string;
    sql: string;
    schema: string;
    table: string;
    created_at: string;
    username: string;
  }[];
  failedDeltas: {
    version: string;
    sql: string;
    created_at: string;
    username: string;
  }[];
  log: string;
  version: string;
  err_msg: string;
  msg: string;
};

type LayerRequestResponse = {
  success: boolean;
  layers?: LayerSetting[];
  errMsg?: string;
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
  _tableNames: string[];
  /**
   * die konkreten Werte der LayerParams
   */
  private _layerParams: { [key: string]: string };

  private _layerSettings: LayerSetting[];

  constructor(settings = {}) {
    this.settings = <StelleSetting>(typeof settings === "string" ? JSON.parse(settings) : settings);
    this.readSettings();
  }

  private readSettings() {
    let layerIds: string[];
    this._tableNames = [];
    if (this.settings.ID) {
      const slayerIds = kvm.store.getItem("layerIds_" + this.get("ID"));
      if (slayerIds) {
        try {
          layerIds = JSON.parse(slayerIds);
          console.info("layerIds", layerIds);
        } catch (ex) {
          console.info("error", ex);
        }
      }
      if (layerIds) {
        this._layerSettings = [];
        for (const layerId of layerIds) {
          const sLayerSetting = kvm.store.getItem("layerSettings_" + layerId);
          if (sLayerSetting) {
            const layerSetting = JSON.parse(sLayerSetting);
            this._layerSettings.push(layerSetting);
            if (layerSetting.table_name) {
              const schema = layerSetting.schema_name || "";
              this._tableNames.push(schema + "." + layerSetting.table_name);
            }
          }
        }
      }
      const sLayerParams = kvm.store.getItem("layerParams_" + this.get("ID"));
      if (sLayerParams) {
        this._layerParams = JSON.parse(sLayerParams);
      }
    }
  }

  getLayerSettings() {
    return this._layerSettings;
  }

  get<K extends keyof StelleSetting>(key: K) {
    return this.settings[key];
  }

  set<K extends keyof StelleSetting>(key: K, value: any) {
    this.settings[key] = value;
    return this.settings[key];
  }

  saveToStore() {
    //kvm.log("Speicher Stelleneinstellungen in lokalen Speicher: " + JSON.stringify(this.settings));
    kvm.store.setItem("stelleSettings_" + this.get("ID"), JSON.stringify(this.settings));
  }

  // activate() {
  //   console.error("Activate Stelle");
  //   kvm.setActiveStelle(this);
  //   kvm.store.setItem("activeStelleId", this.get("ID"));
  //   $("#activeStelleBezeichnungDiv").html(this.get("bezeichnung")).show();
  //   let layerParams = [];
  //   if (kvm.store.getItem(`layerParams_${this.get("ID")}`)) {
  //     layerParams = JSON.parse(kvm.store.getItem(`layerParams_${this.get("ID")}`));
  //     console.log("Get layerParams from store: ", layerParams);
  //   } else {
  //     layerParams = Object.keys(this.settings.layer_params).map((name) => {
  //       let layerParam: Map<string, string> = new Map();
  //       layerParam[name] = this.settings.layer_params[name].default_value;
  //       return layerParam;
  //     });
  //     console.log("Get layerParams from stelle settings: ", layerParams);
  //     console.log("Set layerParams to store.");
  //     kvm.store.setItem(`layerParams_${this.get("ID")}`, JSON.stringify(layerParams));
  //   }
  //   kvm.loadLayerParams(this.settings.layer_params, layerParams);
  // }

  getLayerParam(key: string): string {
    if (this._layerParams && this._layerParams.hasOwnProperty(key)) {
      return this._layerParams[key];
    }
    return this.settings.layer_params[key]?.default_value;
  }

  async setLayerParam(key: string, value: string) {
    console.error(`setLayerParams ${key}=$${value}`);
    this._layerParams[key] = value;
    kvm.store.setItem("layerParams_" + this.get("ID"), JSON.stringify(this._layerParams));
    for (const layer of kvm.getLayers()) {
      await layer.readData();
    }
  }

  /**
   * errsetzt die LayerParams in den SQL-Anweisungen
   * @param sql
   * @returns
   */
  replaceParams(sql: string) {
    if (typeof sql === "string") {
      const layerParams = this.settings.layer_params;
      Object.keys(layerParams).forEach((layerParam) => {
        const searchString = "$" + layerParam;
        // const replaceString = layerParams[layerParam].current_value || layerParams[layerParam].default_value;
        const replaceString = kvm.getActiveStelle().getLayerParam(layerParam);

        sql = sql.replaceAll(searchString, replaceString);

        // if (str.includes(`$${layerParam}`)) {
        //   const regExp = new RegExp(`\\$${layerParam}`, "g");
        //   str = str.replace(regExp, $(`#${layerParam}`).val().toString());
        //   // console.log(`LayerParameter $${layerParam} in Text ersetzt: "${str}"`);
        // }
      });
      // console.log(`Check if $USER_ID is in Text: "${str}"`);
      if (sql.includes("$USER_ID")) {
        const regExp = new RegExp(`\\$USER_ID`, "g");
        sql = sql.replace(regExp, kvm.userId);
        // console.log(`$USER_ID in Text ersetzt mit ${kvm.userId}: "${str}"`);
      }
    }
    return sql;
  }

  /*
   * Request all stellen from active serversetting
   */
  async requestStellen() {
    //kvm.log('Stelle.requestStellen: "' + this.getStellenUrl() + '"');
    // const fileTransfer = new FileTransfer();
    // const filename = cordova.file.dataDirectory + "stellen.json";
    const url = this.getStellenUrl();

    kvm.log("Download Stellen von Url: " + url);
    //kvm.log("Speicher die Datei auf dem Gerät in Datei: " + filename);

    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      const errMsg = "Fehler beim Download der Stellendaten code: " + err.code + " status: " + err.http_status + " Prüfen Sie ob der Nutzer vom dem Gerät aus mit seiner IP auf die Stelle zugreifen darf und die Domain in config.xml eingetragen ist.";
      console.error(err);
      kvm.msg(errMsg);
    }
    let errMsg: string;
    let resultObj: RequestStellenResponse;
    if (response) {
      const txt = await response.text();
      if (txt.indexOf('form name="login"') === -1) {
        try {
          resultObj = JSON.parse(txt);
        } catch (err) {
          errMsg = "Fehler beim Abfragen der Stellendaten. Abfrage liefert keine korrekten Daten vom Server. Entweder sind keine auf dem Server vorhanden oder die URL der Anfrage ist nicht korrekt. Prüfen Sie die Parameter unter Einstellungen.";
        }
      } else {
        errMsg = "Zugang zum Server verweigert! Prüfen Sie Ihre Zugangsdaten unter Einstellungen.";
      }
    }

    if (resultObj) {
      console.log("Download erfolgreich. Antwortobjekt: %o", resultObj);

      const selectField = <HTMLSelectElement>document.getElementById("kvwmapServerStelleSelectField");
      removeOptions(selectField);

      kvm.store.setItem("userId", resultObj.user_id);
      kvm.userId = String(resultObj.user_id);
      kvm.store.setItem("userName", resultObj.user_name);
      kvm.userName = String(resultObj.user_name);
      resultObj.stellen.forEach((stelle) => {
        selectField.append(createHtmlElement("option", selectField, null, { value: stelle.ID, innerText: stelle.Bezeichnung }));
      });
      setValueOfElement("kvwmapServerStellenField", JSON.stringify(resultObj.stellen));
      hideElement("requestStellenButton");
      if (resultObj.stellen.length == 1) {
        setValueOfElement("kvwmapServerStelleSelectField", resultObj.stellen[0].ID);
        showElement("saveServerSettingsButton");
      } else {
        hideElement("saveServerSettingsButton");
      }
      showElement("kvwmapServerStelleSelectField");
    }

    if (errMsg) {
      kvm.msg(errMsg);
      kvm.log(errMsg, 1);
    }
    sperrBildschirm.close();

    // fileTransfer.download(
    //   url,
    //   filename,
    //   function (fileEntry) {
    //     fileEntry.file(
    //       function (file) {
    //         var reader = new FileReader();

    //         reader.onloadend = function () {
    //           //kvm.log("Download Result: " + this.result, 4);
    //           var errMsg = "";

    //           if (typeof this.result === "string" && this.result.indexOf('form name="login"') == -1) {
    //             if (kvm.isValidJsonString(this.result)) {
    //               const resultObj = JSON.parse(this.result);
    //               if (resultObj.success) {
    //                 // TODO notused
    //                 const validResult = true;
    //                 //kvm.log("Download der Stellendaten erfolgreich.", 3);
    //                 console.log("Download erfolgreich. Antwortobjekt: %o", resultObj);

    //                 $("#kvwmapServerStelleSelectField").find("option").remove();
    //                 kvm.store.setItem("userId", resultObj.user_id);
    //                 kvm.userId = String(resultObj.user_id);
    //                 kvm.store.setItem("userName", resultObj.user_name);
    //                 kvm.userName = String(resultObj.user_name);
    //                 $.each(resultObj.stellen, function (index, stelle) {
    //                   $("#kvwmapServerStelleSelectField").append('<option value="' + stelle.ID + '">' + stelle.Bezeichnung + "</option>");
    //                 });
    //                 $("#kvwmapServerStellenField").val(JSON.stringify(resultObj.stellen));
    //                 $("#requestStellenButton").hide();
    //                 if (resultObj.stellen.length == 1) {
    //                   $("#kvwmapServerStelleSelectField").val(resultObj.stellen[0].ID);
    //                   $("#saveServerSettingsButton").show();
    //                 } else {
    //                   $("#saveServerSettingsButton").hide();
    //                 }
    //                 $("#kvwmapServerStelleSelectField").show();
    //               } else {
    //                 errMsg = "Fehler beim Abfragen der Stellendaten. " + (resultObj.err_msg ? resultObj.err_msg : "");
    //               }
    //             } else {
    //               errMsg = "Fehler beim Abfragen der Stellendaten. Abfrage liefert keine korrekten Daten vom Server. Entweder sind keine auf dem Server vorhanden oder die URL der Anfrage ist nicht korrekt. Prüfen Sie die Parameter unter Einstellungen.";
    //             }
    //           } else {
    //             errMsg = "Zugang zum Server verweigert! Prüfen Sie Ihre Zugangsdaten unter Einstellungen.";
    //           }
    //           if (errMsg != "") {
    //             kvm.msg(errMsg);
    //             kvm.log(errMsg, 1);
    //           }
    //           sperrBildschirm.close();
    //         };

    //         reader.readAsText(file);
    //       },
    //       function (error) {
    //         kvm.msg("Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für den Download verwendet werden.");
    //         kvm.log("Fehler beim lesen der Datei: " + error.code);
    //         sperrBildschirm.close();
    //       }
    //     );
    //   },
    //   function (err) {
    //     var errMsg = "Fehler beim Download der Stellendaten code: " + err.code + " status: " + err.http_status + " Prüfen Sie ob der Nutzer vom dem Gerät aus mit seiner IP auf die Stelle zugreifen darf und die Domain in config.xml eingetragen ist.";
    //     console.error(err);
    //     kvm.msg(errMsg);
    //     sperrBildschirm.close();
    //   },
    //   true
    // );
  }

  getStellenUrl() {
    //kvm.log("Stellen.getStellenUrl", 4);
    let url = this.get("url");
    const file = Stelle.getUrlFile(url);

    url += file + "go=mobile_get_stellen" + "&login_name=" + this.get("login_name") + "&passwort=" + encodeURIComponent(this.get("passwort")) + "&format=json";
    return url;
  }

  // finishLayerLoading(layer) {
  //   // console.log("finishLayerReading: readAllLayers= %s, numLayersLoaded=%s, numLayers=%s", this.readAllLayers, this.numLayersLoaded, this.numLayers);
  //   if (this.loadAllLayers) {
  //     if (this.numLayersLoaded < this.numLayers - 1) {
  //       this.numLayersLoaded += 1;
  //       sperrBildschirm.tick(`${layer.title}:<br>&nbsp;&nbsp;${this.numLayersLoaded} Layer geladen. Noch ${this.numLayers - this.numLayersLoaded} Layer zu laden.`);
  //     } else {
  //       sperrBildschirm.tick(`${layer.title}:<br>&nbsp;&nbsp;Laden beeendet.`);
  //       this.numLayersLoaded = 0;
  //       this.loadAllLayers = false;
  //       this.tableNames = this.getTableNames();
  //       // read all layers
  //       kvm.reloadFeatures();
  //     }
  //   } else {
  //     // read only this layer
  //     this.readAllLayers = false;
  //     layer.readData();
  //   }
  // }

  finishLayerReading(layer: Layer | MapLibreLayer) {
    // console.log("finishLayerReading: readAllLayers= %s, numLayersRead=%s, numLayers=%s", this.readAllLayers, this.numLayersRead, this.numLayers);
    // console.log(`finishLayerReading ${layer.title}`);

    if (this.readAllLayers) {
      if (this.numLayersRead < this.numLayers - 1) {
        this.numLayersRead += 1;
        sperrBildschirm.tick(`${layer.title}:<br>&nbsp;&nbsp;${this.numLayersRead} Layer geladen. Noch ${this.numLayers - this.numLayersRead} Layer zu laden.`);
      } else {
        sperrBildschirm.tick(`${layer.title}:<br>&nbsp;&nbsp;Laden beeendet.`);
        this.numLayersRead = 0;
        this.readAllLayers = false;
        // const globalLayerId = `${kvm.store.getItem("activeStelleId")}_${kvm.store.getItem("activeLayerId")}`;
        // const activeLayer = kvm.getLayer(globalLayerId);
        // if (activeLayer) {
        //   activeLayer.activate(); // activate latest active
        // } else {
        //   layer.activate(); // activate latest loaded
        // }
        // this.tableNames = this.getTableNames();
        // kvm.showActiveItem();
        // kvm.closeSperrDiv("Laden der Layer beendet. Schließe Sperr-Bildschirm.");
        sperrBildschirm.close("");
      }
    } else {
      sperrBildschirm.tick(layer.title + ": Laden beeendet.");
      this.sortOverlays();
      // layer.activate();
      // this.tableNames = this.getTableNames();
      // kvm.showActiveItem();
      // kvm.closeSperrDiv();
    }
    // console.log("activeLayer after finishLayerReading: ", kvm.activeLayer ? kvm.activeLayer.get("id") : "keiner aktiv");
    // console.log(`finishLayerReading ${layer.title} done`);
  }

  /*
   * get missing parts to url when server.de, server.de/ oder server.de/index.php
   */
  static getUrlFile(url: string) {
    let file = "";

    if (url.slice(-3) == ".de") file = "/index.php?";
    if (url.slice(-1) == "/") file = "index.php?";
    if (url.slice(-9) == "index.php") file = "?";
    if (file == "") file = "/index.php?";

    return file;
  }

  getTableNames() {
    return this._tableNames || [];
  }
  setTableNames(tableNames: string[]) {
    this._tableNames = tableNames;
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
  async reloadLayer(layerId: string) {
    console.log("Layer.reloadLayer for stelle: %o", this);
    try {
      // var fileTransfer = new FileTransfer(),
      const filename = cordova.file.dataDirectory + "layers_stelle_" + this.get("ID") + ".json";
      //filename = 'temp_file.json',
      const url = this.getLayerUrl();
      sperrBildschirm.tick(`Download Layerdaten der Stelle.`);
      console.log("Download Layerdaten von Stelle mit url: %s", kvm.replacePassword(url));
      //kvm.log("Speicher die Datei auf dem Gerät in Datei: " + filename);

      const fileEntry = await download(url, filename);
      sperrBildschirm.tick("Download der Layerdaten abgeschlossen.");
      const fileContent = await readFileAsString(fileEntry);

      const resultObj = <LayerRequestResponse>kvm.parseLayerResult(fileContent);

      if (resultObj.success) {
        sperrBildschirm.tick(`${kvm.getActiveLayer().title}:<br>&nbsp;&nbsp;Download erfolgreich.`);
        //console.log('resultObj: %o', resultObj);
        const layerSettings = resultObj.layers.find((layer) => {
          return layer["id"] == layerId;
        });
        sperrBildschirm.tick(`${kvm.getActiveLayer().title}:<br>&nbsp;&nbsp;Entferne Layer von App.`);
        // kvm.getActiveLayer().removeFromMap(); // includes removeFromStore()
        //console.log("Erzeuge neuen Layer");
        const layer = new Layer(kvm.getActiveStelle(), layerSettings);
        sperrBildschirm.tick(`${layer.title}:<br>&nbsp;&nbsp;Lege Layer an.`);
        layer.updateTable(); // includes DROP TABLE IF EXISTS, appendToApp(), activate(), this.sortOverlays(), saveToStore(), readData()
        // TODO
      } else {
        kvm.log("Fehlerausgabe von parseLayerResult!", 4);
        kvm.msg(resultObj.errMsg, "2");
      }
    } catch (ex) {
      console.error(`Fehler beim reloadLayer`, ex);
    }

    // fileTransfer.download(
    //     url,
    //     filename,
    //     function (fileEntry) {
    //         fileEntry.file(
    //             function (file) {
    //                 const reader = new FileReader();

    //                 reader.onloadend = function () {
    //                     sperrBildschirm.tick("Download abgeschlossen.");
    //                     // let items = [];
    //                     // let validationResult = "";

    //                     //console.log("Download Result: " + this.result, 4);
    //                     const resultObj = <LayerRequestResponse>kvm.parseLayerResult(<string>reader.result);

    //                     if (resultObj.success) {
    //                         sperrBildschirm.tick(`${kvm.activeLayer.title}:<br>&nbsp;&nbsp;Download erfolgreich.`);
    //                         //console.log('resultObj: %o', resultObj);
    //                         const layerSettings = resultObj.layers.filter((layer) => {
    //                             return layer["id"] == layerId;
    //                         })[0];
    //                         sperrBildschirm.tick(`${kvm.activeLayer.title}:<br>&nbsp;&nbsp;Entferne Layer von App.`);
    //                         kvm.activeLayer.removeFromApp(); // includes removeFromStore()
    //                         //console.log("Erzeuge neuen Layer");
    //                         const layer = new Layer(kvm.activeStelle, layerSettings);
    //                         sperrBildschirm.tick(`${layer.title}:<br>&nbsp;&nbsp;Lege Layer an.`);
    //                         layer.updateTable(); // includes DROP TABLE IF EXISTS, appendToApp(), activate(), this.sortOverlays(), saveToStore(), readData()
    //                     } else {
    //                         kvm.log("Fehlerausgabe von parseLayerResult!", 4);
    //                         kvm.msg(resultObj.errMsg, "2");
    //                     }
    //                     // hier nicht schließen, sonden am Ende von updateTable kvm.closeSperrDiv();
    //                 };

    //                 reader.readAsText(file);
    //             },
    //             function (error) {
    //                 alert("Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für den Download verwendet werden.");
    //                 kvm.log("Fehler beim lesen der Datei: " + error.code);
    //                 kvm.closeSperrDiv();
    //             }
    //         );
    //     },
    //     this.downloadError,
    //     true
    // );
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

    if (index === -1) {
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
      // console.log(i + " " + layers[i].title + "\t" + layers[i].get("drawingorder"));
    }
    // console.log("Stelle.getLayerDrawingGlobalId: %s", layers[index]);
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
  async requestLayers() {
    console.error("Layer.requestLayers for stelle: %o", this);
    sperrBildschirm.tick("Starte Download der Layerdaten der Stelle");

    const filename = cordova.file.dataDirectory + "layers_stelle_" + this.get("ID") + ".json";
    const url = this.getLayerUrl();
    console.log("Download Layerdaten der Stelle mit url: ", kvm.replacePassword(url));
    const fileEntry = await download(url, filename);

    sperrBildschirm.tick("Download der Layerdaten abgeschlossen.");
    const fileContent = await readFileAsString(fileEntry);
    const resultObj = <LayerRequestResponse>kvm.parseLayerResult(fileContent);

    if (resultObj.success) {
      sperrBildschirm.tick("Downloadergebnis ist fehlerfrei.");
      sperrBildschirm.tick("Entferne existierende Layer aus der Anwendung.");

      await this.clearLayers();

      this.loadAllLayers = true;
      this.numLayersLoaded = 0;
      this.readAllLayers = true;
      this.numLayersRead = 0;
      this.numLayers = resultObj.layers.length;

      if (this.numLayers > 0) {
        sperrBildschirm.tick("Lege Layer neu an.");

        // Wir sammeln alle verwendeten Tabellenname mit Schema.TabellenNamen
        this._tableNames = [];
        for (const layerSetting of resultObj.layers) {
          if (layerSetting.table_name) {
            const schema = layerSetting.schema_name || "";
            this._tableNames.push(schema + "." + layerSetting.table_name);
          }
        }

        const idsOfLayer: string[] = [];

        // Sortiere Layer settings nach drawing order
        resultObj.layers = resultObj.layers.sort((a, b) => (parseInt(a.drawingorder) > parseInt(b.drawingorder) ? 1 : -1));
        // add requested layers
        console.log("  requestLayers) Füge neu runtergeladene Layer zur Anwendung hinzu.");
        for (const layerSetting of resultObj.layers) {
          try {
            if (layerSetting.vector_tile_url) {
              console.log(`Erzeuge einen VectorTile Layer-Objekt für Layer ${layerSetting.title}`);
              const layer = new MapLibreLayer(layerSetting, true, this);
              layer.appendToApp();
              layer.saveToStore();
              this.finishLayerReading(layer);
            } else {
              console.log(`Erzeuge einen normales Layer-Objekt für Layer ${layerSetting.title}`);
              const layer = new Layer(this, layerSetting);
              await layer.createTable();
              await layer.requestData(); // Das ist neu: Daten werden gleich geladen nach dem Anlegen in der Stelle
              await layer.readData();
              kvm.addLayer(layer);
              layer.saveToStore();
            }
            idsOfLayer.push(this.get("ID") + "_" + layerSetting.id);
          } catch (ex) {
            console.error(`stelle.requestLayers Layer ${layerSetting?.title} schlug fehl.`, ex);
          }
        }
        kvm.store.setItem("layerIds_" + this.get("ID"), JSON.stringify(idsOfLayer));
      }
      // kvm.setConnectionStatus();
      //console.log('Store after save layer: %o', kvm.store);
      // todo rtr
      // $("#requestLayersButton").hide();
      // $("#featurelistHeading").html("Noch kein Layer ausgewählt");
      // $("#featurelistBody").html('Wählen Sie unter Einstellungen in der Gruppe "Layer" einen Layer aus. Öffnen Sie dann das Optionen Menü und wählen die Funktion "Daten synchronisieren"!');
      // $("#showSearch").hide();
      // hier nicht schließen, sonden am Ende von requestData kvm.closeSperrDiv();
    } else {
      kvm.log("Fehlerausgabe von parseLayerResult!", 4);
      kvm.msg(resultObj.errMsg, "Downloadfehler");
    }
  }

  async clearLayers() {
    console.error("stelle.clearLayers");
    this._tableNames = [];
    this._layerSettings = [];
    for (const layerSetting of this._layerSettings) {
      kvm.store.removeItem("layerSettings" + this.get("ID") + "_" + layerSetting.id);
    }
    kvm.store.removeItem("layerIds_" + this.get("ID"));
    await kvm.clearLayers();
  }

  /**
   * Write deltas to local file, request deltas from server, update local, readData and
   * activate if it`s active
   * @param deltas
   * function chain: writeFile  > upload > for each feature execServerDeltaSuccessFunc
   * > saveToStore, clearDeltas, readData
   */
  async sendDeltas(deltas: Deltas) {
    return new Promise<SendDeltasResponse>(async (resolve, reject) => {
      try {
        if (deltas.rows.length > 0) {
          sperrBildschirm.tick(`Sende Änderungen zum Server und frage Änderungen ab.`);
        } else {
          sperrBildschirm.tick(`Frage Änderungen vom Server ab.`);
        }

        const dataObj = new Blob([JSON.stringify(deltas)], {
          type: "application/json",
        });
        const dstDir = cordova.file.externalCacheDirectory;
        const dstFile = "deltas.json";

        const fileEntry = await Util.writeData(dstDir, dstFile, dataObj);
        // console.log(`Successful written deltas of layer "${this.title}" into File.`);
        const fileUploadResult = await this._upload(fileEntry);

        const response = <SendDeltasResponse>JSON.parse(fileUploadResult.response);
        resolve(response);
      } catch (ex) {
        console.error(`Fehler beim Erstellen oder Senden der Deltas.`, ex);
        reject({
          message: `Fehler beim Erstellen oder Senden der Deltas.`,
          cause: ex,
        });
      }
    });
  }

  async syncData() {
    console.error(`syncData`);
    return new Promise<void>(async (resolve, reject) => {
      try {
        sperrBildschirm.tick(`Starte Synchronisation der Daten mit dem Server.`);

        sperrBildschirm.tick(`Starte Synchronisation mit Server.`);

        const deltas: Deltas = {
          rows: [],
        };

        const sql =
          "\
          SELECT\
            * \
          FROM\
            deltas\
          WHERE\
            type = 'sql'\
        ";

        const rs = await executeSQL(kvm.db, sql);

        const numRows = rs.rows.length;

        for (let i = 0; i < numRows; i++) {
          deltas.rows.push({
            version: rs.rows.item(i).version,
            sql: rs.rows.item(i).delta,
            schema: rs.rows.item(i).schema,
            table: rs.rows.item(i).table,
          });
        }

        // Sende Anfrage auch mit leeren rows Array um Änderungen vom Server zu bekommen.
        const sendDeltasResponse = await this.sendDeltas(deltas);

        if (sendDeltasResponse.success) {
          await this.applyDeltas(sendDeltasResponse);
          resolve();
        } else {
          reject({
            message: `Negative Antwort auf Upload der Deltas - ServerErrorMessage:"${sendDeltasResponse.err_msg}"`,
            response: sendDeltasResponse,
          });
        }
      } catch (ex) {
        reject({
          message: ``,
          cause: ex,
        });
      }
    });
  }

  async _upload(fileEntry: FileEntry): Promise<FileUploadResult> {
    // const fileURL = fileEntry.toURL();
    const fileURL = fileEntry.nativeURL;
    console.log(`going to upload deltas fileURL: "${fileURL}"`);

    // const failFct = (error: FileTransferError) => {
    //     const msg = `Fehler beim Hochladen der Sync-Datei! Prüfe die Netzverbindung! Fehler Nr: ${error.code} body: ${error.body}`;
    //     console.error("Fehler: %o", error);
    //     if ($("#syncLayerIcon_" + this.getGlobalId()).hasClass("fa-spinner")) {
    //         $("#syncLayerIcon_" + this.getGlobalId()).toggleClass("fa-refresh fa-spinner fa-spin");
    //     }
    //     kvm.closeSperrDiv("Upload mit Fehler beendet. " + msg);
    // };

    // const layer = this,
    //   stelle = layer.stelle,
    const url = this.get("url");
    const file = Stelle.getUrlFile(url);
    const server = url + file;

    const params = {
      device_id: device.uuid,
      Stelle_ID: this.get("Stelle_ID"),
      login_name: this.get("login_name"),
      passwort: this.get("passwort"),
      // TODO DELTAS
      // selected_layer_id: layer.get("id"),
      // table_name: layer.get("table_name"),
      client_time: new Date().toISOString(),
      last_client_version: this.get("syncVersion"),
      version: this.get("version"),
      mime_type: "json",
      format: "json_result",
      go: "mobile_sync",
    };

    const options: FileUploadOptions = {
      params: params,
      fileKey: "client_deltas",
      fileName: fileURL.substring(fileURL.lastIndexOf("/") + 1),
      mimeType: "application/json",
    };
    // console.log(
    //   this.title + ": Upload to server: %s with options: %s",
    //   server,
    //   JSON.stringify(options).replace(params.passwort, "secret")
    // );
    return Util.upload(fileURL, encodeURI(server), options);
  }

  async applyDeltas(response: SendDeltasResponse) {
    console.error(`applyDeltas`);
    // const response = JSON.parse(fileUploadResult.response);

    if (response.success) {
      kvm.writeLog(`Deltas wurden empfangen.`);
      console.log(this.get("Bezeichnung") + ": Response: %o", response);

      if (response.version !== this.get("version")) {
        // TODO dataModelChange
      } else {
        let numExecutedDeltas = 0;
        const numReturnedDeltas = response.deltas.length;

        console.log("numReturendDeltas: %s", numReturnedDeltas);

        if (numReturnedDeltas > 0) {
          const msg = `${numReturnedDeltas} Änderungen von Daten auf dem Server gefunden. Die Datenbank wurde gesichert und die Änderungen in die lokale Datenbank eingespielt.`;
          kvm.writeLog(msg);
          kvm.msg(msg, "Datenänderung");
          // TODO backupDatabase auch nur ein mal machen wenn irgend ein Delta gekommen ist (Weiß man aber vorher nicht ob irgend ein layer ein Delta bekommen wird.)
          // Wenn ein mal ein backDatabase gemacht wurde bei den anderen layern in der gleichen syncLayers Runde nicht mehr ausführen.
          kvm.backupDatabase();

          // await this.readData($("#limit").val(), $("#offset").val());

          try {
            for (let delta of response.deltas) {
              if (kvm.coalesce(delta.sql, "") != "") {
                await Util.executeSQL(kvm.db, Util.pointToUnderlineName(delta.sql, delta.schema, delta.table));
              }
            }
          } catch (ex) {
            throw new Error(`Fehler beim Schreiben der Deltas in die DB:<br>&nbsp;&nbsp;${ex}`, { cause: ex });
          }

          const newVersion = parseInt(response.syncData[response.syncData.length - 1].push_to_version);
          this.set("syncVersion", newVersion);
          this.saveToStore();
          await this.clearDeltas("sql");
          console.log(this.get("Bezeichnung") + ": call readData after execDelta");
          kvm.writeLog(`Layer ${this.get("Bezeichnung")}: ${numExecutedDeltas} Deltas vom Server auf Client ausgeführt.`);
          await this.readData(Util.getValueOfElement("limit"), Util.getValueOfElement("offset"));
        }
        // } else {
        //   if (response.syncData.length > 0) {
        //     console.log("upload: Setze LayerSettings syncVersion auf Wert in push_to_version aus den Response");
        //     this.set("syncVersion", parseInt(response.syncData[response.syncData.length - 1].push_to_version));
        //     this.runningSyncVersion = this.get("syncVersion");
        //     this.saveToStore();
        //     if (this.hasEditPrivilege) {
        //       await this.clearDeltas("sql");
        //     }
        //   }
        await this.readData(Util.getValueOfElement("limit"), Util.getValueOfElement("offset"));
      }
    } else {
      throw Error(`Sync-Fehler :<br>&nbsp;&nbsp;${response.msg}`);
    }
  }

  async readData(limit: string | number, offset: string | number) {
    for (let layer of kvm.getLayersSortedByDrawingOrder()) {
      layer.readData(limit, offset);
    }
  }

  /**
   * Löscht Datensätze in Tabelle in der die lokalen Änderungen an Daten des Layers vorgenommen wurden.
   * @param type Mit dem Wert sql werden nur die Änderungen der Sachdaten gelöscht. Mit dem Wert img werden die
   * Änderungen über Bilder gelöscht. Mit dem Wert all werden alle Deltas des Layers gelöscht.
   * @param delta
   */
  async clearDeltas(type: "sql" | "all" | "img", delta?: string) {
    if (delta) {
      console.info(`clearDeltas(${type}, ${delta})`);
    } else {
      console.info(`clearDeltas(${type})`);
    }
    if (typeof delta === "undefined") delta = "";
    //kvm.log("Layer.clearDeltas", 4);
    let sql = `DELETE FROM deltas`;
    if (type != "all") {
      sql += " WHERE type = '" + type + "'";
      if (delta != "") {
        sql += " AND delta = '" + delta + "'";
      }
    }

    return new Promise<void>((resolve, reject) => {
      Util.executeSQL(kvm.db, sql)
        .then((rs: SQLitePlugin.Results) => {
          resolve();
        })
        .catch((error: Error) => {
          reject({ message: "Fehler beim Löschen der Deltas!", cause: error });
          console.error("TODO: ErrorMsg and update GUI");
        });
    });
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

  /**
   * This function returns the comparator function to sort a layer div array by the settings parameter orderBy.
   * @param {string} orderBy - The name of the layersettings parameter which will be used for comparision.
   * @returns {function} - The comparator function that can be used to sort a layer div array
   */
  orderComparatorFunction(orderBy) {
    return function (a, b) {
      if (parseInt(kvm._layers.get(a.firstChild.value).settings[orderBy]) < parseInt(kvm._layers.get(b.firstChild.value).settings[orderBy])) return -1;
      if (a.dataset.subject > b.dataset.subject) return 1;
      return 0;
    };
  }

  /**
   * This function sort the layer list div by layer setting order by.
   * @param orderBy
   */
  sortLayers(orderBy: string = "legendorder") {
    const layerDivs = document.querySelectorAll(".layer-list-div");
    const layerDivsArray = Array.from(layerDivs);
    const sorted = layerDivsArray.sort(this.orderComparatorFunction(orderBy));
    sorted.forEach((e) => document.querySelector("#layer_list").appendChild(e));
  }

  /**
   * Function returns the layer with the lowest value in settings element specified in param orderBy.
   * The comparision is based on integer values.
   * A layer with settings.legendorder = 100 is lower than settings.legendorder = 200.
   * @param {string} orderBy - Optional name of a numeric layersetting that will be used for comparition. eg. id, drawingorder. legendorder is default.
   * @returns {Layer} - The layer with the lowest order is the first and will be returned.
   */
  getFirstLayer(orderBy: string = "legendorder") {
    return kvm.getLayers().reduce((lowerLayer, currentLayer) => {
      if (lowerLayer && parseInt(lowerLayer.settings[orderBy]) < parseInt(currentLayer.settings[orderBy])) {
        return lowerLayer;
      } else {
        return currentLayer;
      }
    });
  }

  getLayerUrl(options = { hidePassword: false }) {
    //kvm.log("Stelle.getLayerUrl", 4);
    let url = this.get("url");
    const file = Stelle.getUrlFile(url);

    url += `${file}go=mobile_get_layers&login_name=${this.get("login_name")}&passwort=${options.hidePassword ? "*****" : encodeURIComponent(this.get("passwort"))}&Stelle_ID=${this.get("Stelle_ID")}&kvmobile_version=${kvm.versionNumber}&format=json`;
    return url;
  }
}

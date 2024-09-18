import { Layer, LayerSetting } from "./Layer";
import { kvm } from "./app";
import { MapLibreLayer } from "./MapLibreLayer";
import { download, executeSQL, readFileAsString } from "./Util";
import { sperrBildschirm } from "./SperrBildschirm";
import * as Util from "./Util";

/**
 * zum Upload
 */
export type DataDelta = {
  version: string;
  action: "update" | "insert" | "delete";
  sql: string;
  uuid: string;
  action_time: string;
  schema_name: string;
  table_name: string;
};

/**
 * wie in DB
 */
type DeltaRow = {
  version: string;
  action: "update" | "insert" | "delete";
  sql: string;
  uuid: string;
  action_time: string;
  schema_name: string;
  table_name: string;
};

type DeltaImageRow = {
  version: number;
  action: "insert" | "delete";
  file: string; // "insert";
  uuid: string;
  action_time: string;
  layer_id: string;
};

type Deltas = {
  rows: DataDelta[];
  // last_delta_version: number;
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
  // bezeichnung: string;
  url: string;
  login_name: string;
  passwort: string;
  Stelle_ID: string;
  last_delta_version?: number;
  version: any;
};

export type RequestStellenResponse = {
  success: boolean;
  user_id: string;
  user_name: string;
  last_delta_version: number;
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
  last_delta_version: number;
  // syncData: {
  //   id: string;
  //   client_id: string;
  //   username: string;
  //   schema_name: string;
  //   table_name: string;
  //   client_time: string;
  //   pull_from_version: string;
  //   pull_to_version: string;
  //   push_from_version: string;
  //   push_to_version: string;
  // }[];
  deltas: {
    version: string;
    sql: string;
    schema_name: string;
    table_name: string;
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
  last_delta_version: number;
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
  // numLayersLoaded: number = 0;
  // numLayersRead: number = 0;
  numLayers: number = 0;
  // loadAllLayers: boolean = false;
  // readAllLayers: boolean = false;
  _tableNames: string[];

  private _lastDeltaVersion: number;

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
      const sLastDeltaVersion = kvm.store.getItem("last_delta_version_" + this.get("ID"));
      if (sLastDeltaVersion) {
        this._lastDeltaVersion = JSON.parse(sLastDeltaVersion);
      }
    }
  }

  getLastDeltaVersion() {
    return this._lastDeltaVersion;
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

  // /*
  //  * Request all stellen from active serversetting
  //  */
  // async requestStellen() {
  //   //kvm.log('Stelle.requestStellen: "' + this.getStellenUrl() + '"');
  //   // const fileTransfer = new FileTransfer();
  //   // const filename = cordova.file.dataDirectory + "stellen.json";
  //   const url = this.getStellenUrl();

  //   kvm.log("Download Stellen von Url: " + url);
  //   //kvm.log("Speicher die Datei auf dem Gerät in Datei: " + filename);

  //   let response: Response;
  //   try {
  //     response = await fetch(url);
  //   } catch (err) {
  //     const errMsg = "Fehler beim Download der Stellendaten code: " + err.code + " status: " + err.http_status + " Prüfen Sie ob der Nutzer vom dem Gerät aus mit seiner IP auf die Stelle zugreifen darf und die Domain in config.xml eingetragen ist.";
  //     console.error(err);
  //     kvm.msg(errMsg);
  //   }
  //   let errMsg: string;
  //   let resultObj: RequestStellenResponse;
  //   if (response) {
  //     const txt = await response.text();
  //     if (txt.indexOf('form name="login"') === -1) {
  //       try {
  //         resultObj = JSON.parse(txt);
  //       } catch (err) {
  //         errMsg = "Fehler beim Abfragen der Stellendaten. Abfrage liefert keine korrekten Daten vom Server. Entweder sind keine auf dem Server vorhanden oder die URL der Anfrage ist nicht korrekt. Prüfen Sie die Parameter unter Einstellungen.";
  //       }
  //     } else {
  //       errMsg = "Zugang zum Server verweigert! Prüfen Sie Ihre Zugangsdaten unter Einstellungen.";
  //     }
  //   }

  //   if (resultObj) {
  //     console.log("Download erfolgreich. Antwortobjekt: %o", resultObj);

  //     const selectField = <HTMLSelectElement>document.getElementById("kvwmapServerStelleSelectField");
  //     removeOptions(selectField);

  //     kvm.store.setItem("userId", resultObj.user_id);
  //     kvm.userId = String(resultObj.user_id);
  //     kvm.store.setItem("userName", resultObj.user_name);
  //     kvm.userName = String(resultObj.user_name);
  //     resultObj.stellen.forEach((stelle) => {
  //       selectField.append(createHtmlElement("option", selectField, null, { value: stelle.ID, innerText: stelle.Bezeichnung }));
  //     });
  //     setValueOfElement("kvwmapServerStellenField", JSON.stringify(resultObj.stellen));
  //     hideElement("requestStellenButton");
  //     if (resultObj.stellen.length == 1) {
  //       setValueOfElement("kvwmapServerStelleSelectField", resultObj.stellen[0].ID);
  //       showElement("saveServerSettingsButton");
  //     } else {
  //       hideElement("saveServerSettingsButton");
  //     }
  //     showElement("kvwmapServerStelleSelectField");
  //   }

  //   if (errMsg) {
  //     kvm.msg(errMsg);
  //     kvm.log(errMsg, 1);
  //   }
  //   sperrBildschirm.close();

  // }

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

  // finishLayerReading(layer: Layer | MapLibreLayer) {
  //   // console.log("finishLayerReading: readAllLayers= %s, numLayersRead=%s, numLayers=%s", this.readAllLayers, this.numLayersRead, this.numLayers);
  //   // console.log(`finishLayerReading ${layer.title}`);

  //   if (this.readAllLayers) {
  //     if (this.numLayersRead < this.numLayers - 1) {
  //       this.numLayersRead += 1;
  //       sperrBildschirm.tick(`${layer.title}:<br>&nbsp;&nbsp;${this.numLayersRead} Layer geladen. Noch ${this.numLayers - this.numLayersRead} Layer zu laden.`);
  //     } else {
  //       sperrBildschirm.tick(`${layer.title}:<br>&nbsp;&nbsp;Laden beeendet.`);
  //       this.numLayersRead = 0;
  //       this.readAllLayers = false;
  //       // const globalLayerId = `${kvm.store.getItem("activeStelleId")}_${kvm.store.getItem("activeLayerId")}`;
  //       // const activeLayer = kvm.getLayer(globalLayerId);
  //       // if (activeLayer) {
  //       //   activeLayer.activate(); // activate latest active
  //       // } else {
  //       //   layer.activate(); // activate latest loaded
  //       // }
  //       // this.tableNames = this.getTableNames();
  //       // kvm.showActiveItem();
  //       // kvm.closeSperrDiv("Laden der Layer beendet. Schließe Sperr-Bildschirm.");
  //       sperrBildschirm.close("");
  //     }
  //   } else {
  //     sperrBildschirm.tick(layer.title + ": Laden beeendet.");
  //     this.sortOverlays();
  //     // layer.activate();
  //     // this.tableNames = this.getTableNames();
  //     // kvm.showActiveItem();
  //     // kvm.closeSperrDiv();
  //   }
  //   // console.log("activeLayer after finishLayerReading: ", kvm.activeLayer ? kvm.activeLayer.get("id") : "keiner aktiv");
  //   // console.log(`finishLayerReading ${layer.title} done`);
  // }

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

  createUrl(params: { [key: string]: string }) {
    let url = this.get("url");
    if (!url.includes("index.php")) {
      if (url.endsWith("/")) {
        url += "index.php";
      } else {
        url += "/index.php";
      }
    }
    const keys = Object.keys(params);
    for (let i = 0; i < keys.length; i++) {
      url += i === 0 ? "?" : "&";
      url += keys[i] + "=" + params[keys[i]];
    }
    return url;
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

      sperrBildschirm.tick(`Download Layerdaten der Stelle.`);

      const resultObj = await this.runGetLayersRequest();

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
        layer.updateTable(this.getLastDeltaVersion()); // includes DROP TABLE IF EXISTS, appendToApp(), activate(), this.sortOverlays(), saveToStore(), readData()
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

  // downloadError(error: FileTransferError) {
  //   //    url: any, filename: string, arg2: (fileEntry: FileEntry) => void, downloadError: any, arg4: boolean) {
  //   throw new Error("Method not implemented.");
  // }

  /**
   * Fragt die Layerstruktur beim Server ab. Für jedes Layersetting wird ein Checksum erstellt.
   *
   * @returns Promise<LayerRequestResponse> das Ergebnis der Abfrage
   */
  async runGetLayersRequest(): Promise<LayerRequestResponse> {
    const filename = cordova.file.dataDirectory + "layers_stelle_" + this.get("ID") + ".json";
    // const url = this.getLayerUrl();

    const url = this.createUrl({
      go: "mobile_get_layers",
      login_name: this.get("login_name"),
      passwort: encodeURIComponent(this.get("passwort")),
      Stelle_ID: this.get("Stelle_ID"),
      kvmobile_version: kvm.versionNumber,
      format: "json",
    });

    console.log("runGetLayersRequest mit url: ", kvm.replacePassword(url));
    const fileEntry = await download(url, filename);

    sperrBildschirm.tick("Download der Layerdaten abgeschlossen.");
    const fileContent = await readFileAsString(fileEntry);
    const layerRequestResponse = <LayerRequestResponse>kvm.parseLayerResult(fileContent);
    for (const layer of layerRequestResponse.layers) {
      const dataVersion = layer.dataVersion;
      layer.dataVersion = "0";
      layer.checksum = await Util.checksum(layer);
      layer.dataVersion = dataVersion;
    }
    return layerRequestResponse;
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
  async requestLayers(layerRequestResult?: LayerRequestResponse) {
    console.error(`Layer.requestLayers for stelle: ${this.get("Bezeichnung")} last_delta_version=${layerRequestResult?.last_delta_version}`, this, layerRequestResult);
    sperrBildschirm.tick("Starte Download der Layerdaten der Stelle");

    if (!layerRequestResult) {
      layerRequestResult = await this.runGetLayersRequest();
    }

    if (layerRequestResult.success) {
      await executeSQL(kvm.db, "delete from deltas");
      await executeSQL(kvm.db, "delete from image_deltas");

      sperrBildschirm.tick("Downloadergebnis ist fehlerfrei.");
      sperrBildschirm.tick("Entferne existierende Layer aus der Anwendung.");

      await this.clearLayers();
      this.numLayers = layerRequestResult.layers.length;

      if (this.numLayers > 0) {
        sperrBildschirm.tick("Lege Layer neu an.");

        // Wir sammeln alle verwendeten Tabellenname mit Schema.TabellenNamen
        this._tableNames = [];
        this._layerSettings = layerRequestResult.layers;
        this._lastDeltaVersion = layerRequestResult.last_delta_version;
        for (const layerSetting of layerRequestResult.layers) {
          if (layerSetting.table_name) {
            const schema = layerSetting.schema_name || "";
            this._tableNames.push(schema + "." + layerSetting.table_name);
          }
        }

        const idsOfLayer: string[] = [];

        // Sortiere Layer settings nach drawing order
        layerRequestResult.layers = layerRequestResult.layers.sort((a, b) => (parseInt(a.drawingorder) > parseInt(b.drawingorder) ? 1 : -1));
        // add requested layers
        console.log("  requestLayers) Füge neu runtergeladene Layer zur Anwendung hinzu.");
        for (const layerSetting of layerRequestResult.layers) {
          try {
            if (layerSetting.vector_tile_url) {
              console.log(`Erzeuge einen VectorTile Layer-Objekt für Layer ${layerSetting.title}`);
              const layer = new MapLibreLayer(layerSetting, true, this);
              layer.appendToApp();
              layer.saveToStore();
              // this.finishLayerReading(layer);
            } else {
              console.log(`Erzeuge einen normales Layer-Objekt für Layer ${layerSetting.title}`);
              const layer = new Layer(this, layerSetting);
              await layer.createTable();
              await layer.requestData(this._lastDeltaVersion); // Das ist neu: Daten werden gleich geladen nach dem Anlegen in der Stelle
              await layer.readData();
              // layer.appendToApp();
              kvm.addLayer(layer);
              layer.saveToStore();
            }
            idsOfLayer.push(this.get("ID") + "_" + layerSetting.id);
          } catch (ex) {
            console.error(`stelle.requestLayers Layer ${layerSetting?.title} schlug fehl.`, ex);
          }
        }
        this.sortOverlays();
        kvm.store.setItem("layerIds_" + this.get("ID"), JSON.stringify(idsOfLayer));
        kvm.store.setItem("last_delta_version_" + this.get("ID"), JSON.stringify(layerRequestResult.last_delta_version));
      }
      // kvm.setConnectionStatus();
      //console.log('Store after save layer: %o', kvm.store);
      // todo rtr
      // $("#requestLayersButton").hide();
      // $("#featurelistBody").html('Wählen Sie unter Einstellungen in der Gruppe "Layer" einen Layer aus. Öffnen Sie dann das Optionen Menü und wählen die Funktion "Daten synchronisieren"!');
      // $("#showSearch").hide();
      // hier nicht schließen, sonden am Ende von requestData kvm.closeSperrDiv();
    } else {
      kvm.log("Fehlerausgabe von parseLayerResult!", 4);
      kvm.msg(layerRequestResult.errMsg, "Downloadfehler");
    }
  }

  async clearLayers() {
    console.error("stelle.clearLayers");
    this._tableNames = [];
    if (this._layerSettings) {
      for (const layerSetting of this._layerSettings) {
        kvm.store.removeItem("layerSettings" + this.get("ID") + "_" + layerSetting.id);
      }
    }
    this._layerSettings = [];
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

  /*
   * Sync images
   * ToDos
   * -- Uploader, der in regelmäßigen Abständen schaut ob es neue Bilder hochzuladen und ob es welche zu löschen gibt.
   * -- Wenn es welche zum hochladen gibt, versucht er die Bilder der Reihe nach hochzuladen.
   *    - Wenn es geklappt hat, aus der Liste der hochzuladenen Bilder löschen
   * -- Wenn es welche zu löschen gibt, versucht er die Info an den Server zu schicken.
   *    - Wenn der Server gemeldet hat, dass er das Bild erfolgreich gelöscht hat, aus der Liste der zu löschenden Bilder entfernen.
   * -- Registrieren wenn alle Bilder synchronisiert wurden, dann sperr_div aus und Erfolgsmeldung.
   * Anforderung von Dirk
   * Metainfos zu einem Bild speichern. Da könnte auch die Info ran ob Bild schon geuploaded oder zu löschen ist. Wenn upload
   * geklappt hat, könnte Status von to_upload zu uploaded geändert werden und wenn löschen auf dem Server geklappt hat,
   * kann das Bild auch in der Liste der Bilder und somit auch deren Metadaten gelöscht werden.
   *
   */
  async syncImages() {
    console.log(`syncImages`);

    try {
      sperrBildschirm.tick(`Starte Synchronisation der Bilder mit dem Server.`);

      const sql = `SELECT * FROM image_deltas`;

      const rs = await Util.executeSQL(kvm.db, sql);
      const numRows = rs.rows.length;

      if (numRows > 0) {
        //kvm.log(numRows + " deltas gefunden.", 3);
        for (let i = 0; i < numRows; i++) {
          const deltaRow = <DeltaImageRow>rs.rows.item(i);
          if (deltaRow.action === "insert") {
            await this.sendNewImage(deltaRow);
          }
          if (deltaRow.action === "delete") {
            //kvm.log('Lösche Bild auf dem Server mit SQL: ' + rs.rows.item(i).delta, 3);
            await this.sendDropImage(deltaRow);
          }
        }
      }
    } catch (ex) {
      console.error("Fehler beim synchronisieren der Bilder", ex);
      throw new Error("Fehler beim synchronisieren der Bilder", { cause: ex });
    }
  }

  async sendNewImage(deltaRow: DeltaImageRow) {
    const img = deltaRow.file;
    //kvm.log("Layer.sendNewImage", 4);
    console.log(`sendNewImage ${img} `);
    kvm.log("Bild " + img + " wird hochgeladen.", 3);
    // const icon = $("#syncImagesIcon_" + this.getGlobalId());
    // const ft = new FileTransfer();
    const fileURL = "file://" + kvm.getConfigurationOption("localImgPath") + img.substring(img.lastIndexOf("/") + 1);
    const url = this.get("url");
    const file = Stelle.getUrlFile(url);
    const server = url + file;

    const options: FileUploadOptions = {};
    //var options = new FileUploadOptions();

    // console.log("toggle class fa-upload");
    // when the upload begin
    // if (icon.hasClass("fa-upload")) {
    //   icon.toggleClass("fa-upload fa-spinner fa-spin");
    // }

    console.log("set options");
    options.fileKey = "image";
    options.fileName = fileURL.substr(fileURL.lastIndexOf("/") + 1);
    options.mimeType = "image/jpeg";
    console.log("set params");
    options.params = {
      device_id: device.uuid,
      Stelle_ID: this.get("Stelle_ID"),
      login_name: this.get("login_name"),
      passwort: this.get("passwort"),
      selected_layer_id: deltaRow.layer_id,
      go: "mobile_upload_image",
    };
    options.chunkedMode = false;
    options.headers = {
      Connection: "close",
    };

    console.log("upload to url: " + server);
    console.log("Upload img to url: " + server + " with options: " + JSON.stringify(options).replace((<any>options.params).passwort, "secret"));
    try {
      const fileUploadResult = await Util.upload(fileURL, encodeURI(server), options);
      try {
        const response = JSON.parse(fileUploadResult.response);
        if (response.success) {
          kvm.log("Bild " + img + " wurde erfolgreich auf den Server geladen.");
          //kvm.log("Code = " + r.responseCode, 4);
          //kvm.log("Response = " + r.response, 4);
          //kvm.log("Sent = " + r.bytesSent, 4);
          // TODO !!!!!! Achtung
          await this.clearImageDelta(deltaRow);
        } else {
          const err_msg = "Fehler beim Hochladen des Bildes " + img + " Fehler: " + response.msg;
          sperrBildschirm.close(err_msg);
        }
      } catch (error) {
        const err_msg = "Fehler beim Hochladen der Bilddatei.";
        console.error("%s Fehler: %o Response: %o", err_msg, error, fileUploadResult);
        kvm.log(err_msg + " error: " + JSON.stringify(error));
        sperrBildschirm.close(err_msg + " Kann Antwort vom Server nicht parsen: " + JSON.stringify(fileUploadResult));
      }
    } catch (error) {
      console.error("err: %o", error);
      // if (icon.hasClass("fa-spinner")) {
      //   icon.toggleClass("fa-upload fa-spinner fa-spin");
      // }
      const msg = "Fehler beim Hochladen der Datei: " + error.code + " source: " + error.code;
      // sperrBildschirm.close(msg);
    }

    // when the upload has been finished
    // if (icon.hasClass("fa-spinner")) {
    //   icon.toggleClass("fa-upload fa-spinner fa-spin");
    // }
  }

  async sendDropImage(deltaRow: DeltaImageRow) {
    //kvm.log("Layer.sendDropImage", 4);
    const img = deltaRow.file;
    try {
      const url = this.createUrl({
        device_id: device.uuid,
        Stelle_ID: this.get("Stelle_ID"),
        login_name: this.get("login_name"),
        passwort: this.get("passwort"),
        selected_layer_id: deltaRow.layer_id,
        go: "mobile_delete_images",
        images: img,
      });
      const filename = cordova.file.dataDirectory + "temp.json";
      const fileEntry = await download(url, filename);

      sperrBildschirm.tick("Download der Layerdaten abgeschlossen.");
      const fileContent = await readFileAsString(fileEntry);
      const json = JSON.parse(fileContent);
      if (json.success) {
        kvm.log("Bild: " + img + " erfolgreich auf dem Server gelöscht.", 4);
        await this.clearImageDelta(deltaRow);
      } else {
        if (!img) {
          console.error("Bild: file war leer.", 4);
          await this.clearImageDelta(deltaRow);
        } else {
          throw new Error(`Beim Löschen des Bildes "${img}" meldet der Server nicht erfolreich. Antwort: ${JSON.stringify(json)}`);
        }
      }
    } catch (ex) {
      throw new Error(`Fehler bei der Verabeitung des Delta zum Löschen des Bildes ${img}`, { cause: ex });
    }
  }

  // async checkLayerVersions() {
  //   const getLayersRequestResponse = await this.runGetLayersRequest();
  //   const layerStatus = {
  //     added: [],
  //     removed: [],
  //     changed: [],
  //     hasChanges: () => {
  //       return layerStatus.added.length > 0 || layerStatus.removed.length > 0 || layerStatus.changed.length > 0;
  //     },
  //   };
  //   for (const sollLayerSetting of getLayersRequestResponse.layers) {
  //     const istLayertSetting = this._layerSettings.find((setting) => setting.id === sollLayerSetting.id);
  //     if (!istLayertSetting) {
  //       layerStatus.added.push(sollLayerSetting);
  //     } else {
  //       if (istLayertSetting.checksum !== sollLayerSetting.checksum) {
  //         layerStatus.changed.push(sollLayerSetting);
  //       }
  //     }
  //   }
  //   for (const istLayerSetting of this._layerSettings) {
  //     const sollLayertSetting = getLayersRequestResponse.layers.find((setting) => setting.id === istLayerSetting.id);
  //     if (!sollLayertSetting) {
  //       layerStatus.removed.push(istLayerSetting);
  //     }
  //   }
  //   return layerStatus;
  // }

  /**
   * prüft an Hand des Attributes dataVersion, ob sich die Daten der Layer, die nicht synchronisiert werden, geändert haben und gibt diese
   * zurück
   * @param layerRequestResult
   * @returns Layer, die nicht synchronisiert werden aber deren Daten sich geändert haben
   */
  checkForNoSyncLayerChange(layerRequestResult: LayerRequestResponse): LayerSetting[] {
    const layers = layerRequestResult.layers;

    const changedLayers: LayerSetting[] = [];
    for (const sollLayerSetting of layers) {
      if (!sollLayerSetting.sync) {
        const istLayerSetting = this._layerSettings.find((layerSetting) => {
          return layerSetting.id === sollLayerSetting.id;
        });
        if (!istLayerSetting || istLayerSetting.dataVersion !== sollLayerSetting.dataVersion) {
          changedLayers.push(sollLayerSetting);
        }
      }
    }
    return changedLayers;
  }

  /**
   * prüft, ob sich irendetwas an der Layerstruktur der Stelle geändert hat
   * @param layerRequestResult
   * @returns true bei Änderung der Layerstruktur, sonst false
   */
  checkForLayerChange(layerRequestResult: LayerRequestResponse): boolean {
    const layers = layerRequestResult.layers;
    if (this._layerSettings.length !== layers.length) {
      return true;
    }
    for (const sollLayerSetting of layers) {
      const istLayerSetting = this._layerSettings.find((layerSetting) => {
        return layerSetting.id === sollLayerSetting.id;
      });
      if (sollLayerSetting.checksum !== istLayerSetting.checksum) {
        return true;
      }
    }
    return false;
  }

  /**
   * Gleicht die lokalen Daten mit dem Server ab und übernimmt die Änderungen vom Server.
   * Hat sich die Layerstruktur geändert werden alle Layer neu geladen.
   * @returns Promise<void>
   */
  async syncData(): Promise<void> {
    console.log(`syncData`);
    return new Promise<void>(async (resolve, reject) => {
      try {
        sperrBildschirm.tick(`Starte Synchronisation der Daten mit dem Server.`);

        const deltas: Deltas = {
          rows: [],
        };

        const sql = "SELECT * FROM deltas";
        const rs = await executeSQL(kvm.db, sql);

        const numRows = rs.rows.length;

        for (let i = 0; i < numRows; i++) {
          const item = rs.rows.item(i) as DeltaRow;
          deltas.rows.push({
            version: item.version,
            action: item.action,
            sql: item.sql,
            uuid: item.uuid,
            action_time: item.action_time,
            schema_name: item.schema_name,
            table_name: item.table_name,
          });
        }

        const layerRequestResult = await this.runGetLayersRequest();

        if (!layerRequestResult.success) {
          throw new Error("Abfrage der Layer war nicht erfolgreich.", { cause: layerRequestResult.errMsg });
        }
        const hasLayerChanged = this.checkForLayerChange(layerRequestResult);

        // Sende Anfrage auch mit leeren rows Array um Änderungen vom Server zu bekommen.

        if (!hasLayerChanged || deltas.rows.length > 0) {
          const sendDeltasResponse = await this.sendDeltas(deltas);
          if (sendDeltasResponse.success) {
            if (hasLayerChanged) {
              await this.requestLayers(layerRequestResult);
            } else {
              await this.applyDeltas(sendDeltasResponse);
              const changedNoSyncLayers = this.checkForNoSyncLayerChange(layerRequestResult);
              if (changedNoSyncLayers) {
                for (const layerSetting of changedNoSyncLayers) {
                  const layer = kvm.getLayer(`${this.get("ID")}_${layerSetting.id}`);
                  layer.requestData(this._lastDeltaVersion);
                }
              }
            }
          } else {
            reject(new Error("Negative Antwort auf Upload der Deltas", { cause: { response: sendDeltasResponse } }));
          }
        } else {
          await this.requestLayers(layerRequestResult);
        }

        resolve();
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

    const url = this.get("url");
    const file = Stelle.getUrlFile(url);
    const server = url + file;

    const options: FileUploadOptions = {
      params: {
        Stelle_ID: this.get("Stelle_ID"),
        login_name: this.get("login_name"),
        passwort: this.get("passwort"),
        client_id: device.uuid,
        client_time: kvm.now(),
        last_delta_version: this.getLastDeltaVersion(),
        // version: this.get("version"),
        mime_type: "json",
        format: "json_result",
        go: "mobile_sync_all",
      },
      fileKey: "client_deltas",
      fileName: fileURL.substring(fileURL.lastIndexOf("/") + 1),
      mimeType: "application/json",
    };

    return Util.upload(fileURL, encodeURI(server), options);
  }

  async applyDeltas(response: SendDeltasResponse) {
    console.error(`applyDeltas`, response);
    // const response = JSON.parse(fileUploadResult.response);

    if (response.success) {
      kvm.writeLog(`Deltas wurden empfangen.`);
      console.log(`applyDeltas ${this.get("Bezeichnung")} last_delta_version: ${this.getLastDeltaVersion()} => ${response.last_delta_version}`, response);

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
        try {
          for (const delta of response.deltas) {
            if (kvm.coalesce(delta.sql, "") != "") {
              await Util.executeSQL(kvm.db, Util.pointToUnderlineName(delta.sql, delta.schema_name, delta.table_name));
              numExecutedDeltas++;
            }
          }
        } catch (ex) {
          throw new Error(`Fehler beim Schreiben der Deltas in die DB:<br>&nbsp;&nbsp;${ex}`, { cause: ex });
        }
        kvm.writeLog(`Layer ${this.get("Bezeichnung")}: ${numExecutedDeltas} Deltas vom Server auf Client ausgeführt.`);
      }
      this._lastDeltaVersion = response.last_delta_version;
      kvm.store.setItem("last_delta_version_" + this.get("ID"), JSON.stringify(this._lastDeltaVersion));
      this.saveToStore();
      await this.clearDeltas();
      await this.readData(Util.getValueOfElement("limit"), Util.getValueOfElement("offset"));
    } else {
      throw Error(`Sync-Fehler :<br>&nbsp;&nbsp;${response.msg}`);
    }
  }

  async readData(limit: string | number, offset: string | number) {
    for (const layer of kvm.getLayersSortedByDrawingOrder()) {
      layer.readData(limit, offset);
    }
  }

  async clearImageDelta(deltaRow: DeltaImageRow) {
    const sql = `DELETE FROM image_deltas where version = ${deltaRow.version}`;
    await Util.executeSQL(kvm.db, sql);
  }

  /**
   * Löscht Datensätze in Tabelle in der die lokalen Änderungen an Daten des Layers vorgenommen wurden.
   * @param type Mit dem Wert sql werden nur die Änderungen der Sachdaten gelöscht. Mit dem Wert img werden die
   * Änderungen über Bilder gelöscht. Mit dem Wert all werden alle Deltas des Layers gelöscht.
   * @param delta
   */
  async clearDeltas() {
    // if (delta) {
    //   console.info(`clearDeltas(${type}, ${delta})`);
    // } else {
    //   console.info(`clearDeltas(${type})`);
    // }
    // if (typeof delta === "undefined") delta = "";
    //kvm.log("Layer.clearDeltas", 4);
    const sql = `DELETE FROM deltas`;

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
    (<any>kvm.controls.layerCtrl)._layers
      .filter((l) => l.overlay)
      .sort((a, b) => (parseInt(a.layer.getAttribution()) > parseInt(b.layer.getAttribution()) ? 1 : -1))
      .forEach((overlay) => {
        kvm.controls.layerCtrl.removeLayer(overlay.layer);
        kvm.controls.layerCtrl.addOverlay(overlay.layer, overlay.name);
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

  // /**
  //  * Function returns the layer with the lowest value in settings element specified in param orderBy.
  //  * The comparision is based on integer values.
  //  * A layer with settings.legendorder = 100 is lower than settings.legendorder = 200.
  //  * @param {string} orderBy - Optional name of a numeric layersetting that will be used for comparition. eg. id, drawingorder. legendorder is default.
  //  * @returns {Layer} - The layer with the lowest order is the first and will be returned.
  //  */
  // getFirstLayer(orderBy: string = "legendorder") {
  //   return kvm.getLayers().reduce((lowerLayer, currentLayer) => {
  //     if (lowerLayer && parseInt(lowerLayer.settings[orderBy]) < parseInt(currentLayer.settings[orderBy])) {
  //       return lowerLayer;
  //     } else {
  //       return currentLayer;
  //     }
  //   });
  // }
}

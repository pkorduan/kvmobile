/// <reference types="cordova-plugin-device"/>
/// <reference types="cordova-plugin-dialogs"/>
/// <reference types="@types/cordova"/>
/// <reference types="cordova-plugin-inappbrowser"/>
/// <reference types="cordova-plugin-file"/>
/// <reference types="cordova-plugin-android-fingerprint-auth"/>
/// <reference types="@types/cordova-sqlite-storage"/>
/// <reference types="@types/leaflet.locatecontrol"/>
/// <reference types="@types/proj4leaflet"/>

// import "cordova-plugin-dialogs";
// import "cordova-plugin-device";

import * as idb from "idb";
import { Configuration, configurations } from "./configurations";
import { BackgroundGeolocation, BackgroundGeolocationConfig, BackgroundGeolocationEvents, BackgroundGeolocationResponse } from "@awesome-cordova-plugins/background-geolocation/ngx";
import { GpsStatus } from "./gpsStatus";
import { Stelle } from "./Stelle";
import { BackgroundLayerSetting, Layer, LayerSetting } from "./Layer";
import { BackgroundLayer, prepareBackgrounLayer } from "./BackgroundLayer";
import { NetworkStatus } from "./networkStatus";
import { FileUtils } from "./controller/files";
import { Mapper } from "./controller/mapper";
import maplibregl, { MapGeoJSONFeature } from "maplibre-gl";
import type { FingerprintAuth as FingerprintAuthT } from "cordova-plugin-android-fingerprint-auth";
import "process";
import { MapLibreLayer } from "./MapLibreLayer";
import { Control, DomUtil, ErrorEvent as LErrorEvent, Map as LMap, Point as LPoint, Renderer, SVG } from "leaflet";
import { sperrBildschirm } from "./SperrBildschirm";
import { Menu } from "./Menu";
import { PropertyChangeEvent, PropertyChangeSupport } from "./Observable";
import { View } from "./views/View";
import * as PanelEinstellungen from "./views/PanelEinstellungen";

import { ViewFeatureList } from "./views/ViewFeatureList";
import { ViewEinstellungen } from "./views/ViewEinstellungen";
import { ViewLoggings } from "./views/ViewLoggings";
import { ViewMap } from "./views/ViewMap";
import { ViewDataView } from "./views/ViewDataView";
import { ViewFormular } from "./views/ViewFormular";

require("leaflet");
require("leaflet.locatecontrol");
require("leaflet-betterscale");
require("leaflet-easybutton");
require("leaflet-editable");
require("leaflet-bing-layer");
import type from "leaflet-easybutton";
import { LatLng, LatLngExpression } from "leaflet";

import { createHtmlElement, executeSQL, getValueOfElement, tableExists } from "./Util";
import { Feature } from "./Feature";

require("proj4leaflet");

require("@maplibre/maplibre-gl-leaflet");

declare var FingerprintAuth: typeof FingerprintAuthT;

//export var config: any;

// type LayerEntry = {
//   [index: string]: Layer;
// };

export class Kvm extends PropertyChangeSupport {
  // Buffer: require("buffer").Buffer,
  // wkx: require("wkx"),
  static EVENTS = {
    ACTIVE_LAYER_CHANGED: "ACTIVE_LAYER_CHANGED",
    ACTIVE_FEATURE_CHANGED: "ACTIVE_FEATURE_CHANGED",
    ACTIVE_STELLE_CHANGED: "ACTIVE_STELE_CHANGED",
    ACTIVE_CONFIGURATION_CHANGED: "ACTIVE_CONFIGURATION_CHANGED",
    LAYER_ADDED: "LAYER_ADDED",
    LAYER_REMOVED: "LAYER_REMOVED",
  };

  controls: any = {};
  controller: {
    // files: typeof FileUtils;
    mapper: typeof Mapper;
  };
  // views: {
  //   mapper: any;
  // };

  views: View[] = [];

  layerDataLoaded: boolean = false;
  featureListLoaded: boolean = false;
  mapSettings: any;
  _layers: Map<string, Layer> = new Map();
  overlays = [];
  store: Storage;
  map: LMap;
  private _activeStelle: Stelle;
  private _activeLayer: Layer;
  private _activeFeature: Feature;
  myRenderer: Renderer;
  db: SQLitePlugin.Database;
  saveTile: (key: IDBValidKey, val: any) => Promise<IDBValidKey>;
  readTile: (key: IDBValidKey) => Promise<any>;
  orgTileUrl: any;
  debug: any;

  private _configName: string;
  private config: Configuration;
  backgroundLayers: BackgroundLayer[] = [];
  backgroundLayerSettings: BackgroundLayerSetting[];
  backgroundGeolocation: BackgroundGeolocation;
  isActive: boolean;
  // GpsIsOn: boolean = false;
  inputNextDataset: boolean = false;
  lastMapOrListView: string = "featureList";
  versionNumber: string;

  logFileEntry: FileEntry;
  userId: string;
  userName: string;

  menu: Menu;
  gpsStatus: { status: string; geolocationPosition: GeolocationPosition; ok: boolean };
  networkStatus = NetworkStatus;

  // dataModelChanges: { layer: Layer; new_version: string }[];

  // showItem: <(p:any)=>void>undefined,
  // log: <(p:any)=>void>undefined,

  constructor() {
    super();
    this.controller = { mapper: Mapper };
  }

  getLayer(layerId: string) {
    return this._layers.get(layerId);
  }

  getActiveLayer() {
    return this._activeLayer;
  }
  setActiveLayer(layer: Layer) {
    if (this._activeLayer === layer) {
      console.error(`zzz app.setActiveLayer ${layer?.title} again`);
      return;
    }
    console.error(`zzz app.setActiveLayer ${layer?.title}`);
    const oldLayer = this._activeLayer;
    this._activeLayer = layer;
    if (layer) {
      kvm.store.setItem("activeLayerId", layer.get("id"));
    } else {
      kvm.store.removeItem("activeLayerId");
    }
    this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.ACTIVE_LAYER_CHANGED, oldLayer, layer));
    // if (this.panelAnzeigeFilter) {
    //   this.panelAnzeigeFilter.setLayer(layer);
    //   this.panelSortierung.setLayer(layer);
    // }
  }

  setActiveFeature(feature: Feature) {
    console.error(`zzz app.setActiveFeature ${feature?.layer?.title}`, feature, this._activeFeature);
    if (this._activeFeature === feature) {
      return;
    }
    const oldFeature = this._activeFeature;
    if (oldFeature) {
      oldFeature.deactivate();
    }
    this._activeFeature = feature;
    if (feature) {
      this.setActiveLayer(feature.layer);
      feature.layer.setActiveFeature(feature);
      feature.setActive(true);
    }
    this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.ACTIVE_FEATURE_CHANGED, oldFeature, feature));
  }

  setActiveStelle(stelle: Stelle) {
    console.error(`setActiveStelle ${stelle?.get("ID")}`, stelle);
    const oldStelle = this._activeStelle;
    this._activeStelle = stelle;
    this.store.setItem("activeStelleId", stelle.get("ID"));
    this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.ACTIVE_STELLE_CHANGED, oldStelle, stelle));
  }
  getActiveStelle() {
    return this._activeStelle;
  }
  /**
   *
   ** @returns shallow copy of the Layers
   */
  getLayers() {
    return Array.from(this._layers.values());
  }

  getLayersSortedByDrawingOrder() {
    const layers = Array.from(this._layers.values());
    return layers.sort((a, b) => (parseInt(a.get("drawingorder")) > parseInt(b.get("drawingorder")) ? 1 : -1));
  }

  // ToDo Diese funktion soll wie getLayersSortedByUpdateOrder sortieren
  // nur mit einem Sort und einer rekursiven Funktion
  // getLayersSortedByHierachie() {
  //   const layers = this.getLayers();
  //   const sortedLayers = layers.sort((a, b) =>
  //  if (b.getPartenLayerId()) {
  //    if( a.getGlobalId() == b.getParentLayerId()) {
  //   return -1;
  // } else {
  // suche weiterere parent bis keine mehr gibt.
  //}
  //    } else {
  //  b hat keinen Parent return 1 oder 0 jedenfalls nicht -1
  // }

  //   );
  //   return sortedLayers;
  // }

  getLayersSortedByUpdateOrder() {
    const layers = Array.from(this._layers.values());
    const tree: { id: string; childs: string[]; parent: string[] }[] = [];
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const attributes = layer.attributes;
      // debugger;
      const subLayerIds = [];
      for (let attrNr = 0; attrNr < attributes.length; attrNr++) {
        const attr = attributes[attrNr];
        if (attr.settings.form_element_type === "SubFormEmbeddedPK") {
          console.info(layer.getGlobalId() + "=>" + attr.getGlobalSubLayerId());
          subLayerIds.push(attr.getGlobalSubLayerId());
        }
      }
      tree.push({ id: layer.getGlobalId(), childs: subLayerIds, parent: [] });
    }

    for (let i = 0; i < tree.length; i++) {
      if (tree[i].childs?.length > 0) {
        for (let chNr = 0; chNr < tree[i].childs.length; chNr++) {
          const chTreeEntry = tree.find((el) => tree[i].childs[chNr] === el.id);
          chTreeEntry.parent.push(tree[i].id);
        }
      }
    }

    for (let i = 0; i < tree.length; i++) {
      console.info(tree[i].id + " " + tree[i].parent);
    }

    const emptyFct = (array: any[]) => {
      return (
        array.filter((value) => {
          return value ? true : false;
        }).length === 0
      );
    };

    const sorted: string[] = [];
    while (!emptyFct(tree)) {
      for (let i = 0; i < tree.length; i++) {
        if (tree[i]) {
          if (tree[i]?.parent.length === 0) {
            sorted.push(tree[i].id);
            tree[i] = null;
          } else {
            let inList = true;
            for (let chNr = 0; chNr < tree[i].parent.length; chNr++) {
              if (!sorted.includes(tree[i].parent[chNr])) {
                inList = false;
              }
            }
            if (inList) {
              sorted.push(tree[i].id);
              tree[i] = null;
            }
          }
        }
      }
    }

    for (let i = 0; i < sorted.length; i++) {
      console.info(sorted[i]);
    }

    return sorted.map((id) => this.getLayer(id));
  }

  /*
   * fügt das Feature zum Layer hinzu, existiert ein Feature mit der gleichen Id wird es ersetzt
   *
   * @param feature
   * @returns
   */
  addLayer(layer: Layer) {
    console.error(`addLayer(${layer.title})`);
    this._layers.set(layer.getGlobalId(), layer);
    this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.LAYER_ADDED, null, layer));
  }
  removeLayer(layer: Layer | MapLibreLayer) {
    console.error(`removeLayer(${layer.title})`);
    this._layers.delete(layer.getGlobalId());
    this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.LAYER_REMOVED, layer, null));
  }

  /**
   * löscht alle Layer (Map, DB, Store)
   */
  async clearLayers() {
    console.error(`app.clearLayers activeLayer=${this.getActiveLayer()?.title || "-"} countOfLayers=${this.getLayers()?.length || "0"}`);
    this.setActiveLayer(null);

    const layers = Array.from(this._layers.values());

    for (const layer of layers) {
      if (layer instanceof Layer) {
        layer.removeFromMap();
        await layer.dropDataTable();
        await layer.dropDeltasTable();
        this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.LAYER_REMOVED, layer, null));
      }
    }
    this._layers.clear();
  }

  bttnSyncLayersClicked(evt: MouseEvent) {
    console.error(`bttnSyncLayersClicked`);
    // const layer = kvm._activeLayer;

    sperrBildschirm.clear();

    // Sichere Datenbank
    if ((<HTMLButtonElement>evt.currentTarget).classList.contains("inactive-button")) {
      this.msg("Keine Internetverbindung! Kann Layer jetzt nicht synchronisieren.");
    } else {
      sperrBildschirm.show();
      navigator.notification.confirm(
        "Jetzt lokale Änderungen Daten und Bilder, falls vorhanden, zum Server schicken, Änderungen vom Server holen und lokal einspielen? Wenn Änderungen vom Server kommen wird die lokale Datenbank vorher automatisch gesichert.",
        async (buttonIndex) => {
          if (buttonIndex == 1) {
            sperrBildschirm.show();
            await kvm.syncLayers();
            sperrBildschirm.close();
          }
          sperrBildschirm.close();
        },
        "Layer mit Server synchronisieren",
        ["ja", "nein"]
      );
    }
  }

  async syncLayers() {
    console.error(`syncLayers activeLayer="${this._activeLayer?.title}"`);

    const layers = kvm.getLayersSortedByUpdateOrder();
    const activeLayerId = this.getActiveLayer().getGlobalId();
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      try {
        console.log(`Starte Synchronisieren des Layers: "${layer.title}"`);
        await layer.syncImages();
        // console.error(`Bilder des Layers ${layer.title} wurden synchronisiert`);
        // await layer.syncData();
        // console.error(`Daten des Layers ${layer.title} wurden synchronisiert`);
      } catch (ex) {
        console.error(`Fehler beim Synchronisieren des Layers: "${layer.title}".`, ex);
        const fehler = ex.message || JSON.stringify(ex);
        navigator.notification.alert(`Fehler beim Synchronisieren des Layers: "${layer.title}". Ursache:  ${fehler}`, () => {}, "Synchronisierungsfehler");
      }
    }

    await this._activeStelle.syncData();

    const activeLayerEntry = Array.from(this._layers).find((entry) => entry[1].getGlobalId() === activeLayerId);
    if (activeLayerEntry) {
      const activeLayer = activeLayerEntry[1];
      console.error(`aktiviere Layer ${activeLayer.title} ${activeLayer.getGlobalId()}`);
      activeLayer.activate();
    }

    // TODO DataModelChnges
    // if (this.dataModelChanges) {
    //   let msg = "Datenmodell-Änderungen:\n";
    //   for (let i = 0; i < this.dataModelChanges.length; i++) {
    //     msg += `Neue Version ${this.dataModelChanges[i].new_version} für Layer ${this.dataModelChanges[i].layer.title} gefunden.\n`;
    //   }
    //   msg += `Alle Layer der Stelle werden komplett neu geladen. Beachten Sie dass sich dadurch die Formulare und Kartenstyles geändert haben können.`;
    //   console.log(msg);
    //   kvm.msg(msg, "Layeränderung");
    //   kvm.activeStelle
    //     .requestLayers()
    //     .catch((reason) => {
    //       console.error(`Fehler beim Laden der Layerdaten`, reason);
    //     })
    //     .finally(() => {
    //       kvm.activeStelle.getFirstLayer().activate();
    //       sperrBildschirm.close();
    //     });
    // }
    // TODO DataModelChnges
  }

  // loadHeadFile(filename, filetype) {
  //     //console.log('Lade filename %s, filetype: %s', filename, filetype);
  //     let fileref:HTMLElement;
  //     if (filetype == "js") {
  //         //if filename is a external JavaScript file
  //         fileref = document.createElement("script");
  //         fileref.setAttribute("type", "text/javascript");
  //         fileref.setAttribute("src", filename);
  //     } else if (filetype == "css") {
  //         //if filename is an external CSS file
  //         fileref = document.createElement("link");
  //         fileref.setAttribute("rel", "stylesheet");
  //         fileref.setAttribute("type", "text/css");
  //         fileref.setAttribute("href", filename);
  //     }
  //     if (fileref) {
  //         document.getElementsByTagName("head")[0].appendChild(fileref);
  //     }
  // }

  /**
   * function return all urls to fetch vector tiles in box with lower left corner p1
   * to upper right corner p2 for zoom level zoom
   * @param LatLngExpression p1
   * @param LatLngExpression p2
   * @param integer zoom
   */
  getTilesUrls(p1: LatLngExpression, p2: LatLngExpression, zoom: number, orgUrl: string) {
    const coordArray = this.getTilesCoord(p1, p2, zoom),
      urls = [];

    for (let i = 0; i < coordArray.length; i++) {
      let url = orgUrl.replace("{z}", coordArray[i].z);
      url = url.replace("{x}", coordArray[i].x);
      url = url.replace("{y}", coordArray[i].y);
      urls.push(url);
    }
    return urls;
  }

  /*
   * function return coords of vector tiles in box with lower left corner p1
   * to upper right corner p2 for zoom level zoom
   */
  getTilesCoord(p1: LatLngExpression, p2: LatLngExpression, zoom: number): any[] {
    const t1 = this.map.project(p1, zoom).divideBy(256).floor(),
      t2 = this.map.project(p2, zoom).divideBy(256).floor(),
      minX = t1.x < t2.x ? t1.x : t2.x,
      minY = t1.y < t2.y ? t1.y : t2.y,
      maxX = t1.x > t2.x ? t1.x : t2.x,
      maxY = t1.y > t2.y ? t1.y : t2.y;

    const coordArray = [];
    const mod = Math.pow(2, zoom);
    for (let i = minX; i <= maxX; i++) {
      for (let j = minY; j <= maxY; j++) {
        const x = ((i % mod) + mod) % mod,
          y = ((j % mod) + mod) % mod,
          coords = new LPoint(x, y);
        coords["z"] = zoom;
        coordArray.push(coords);
      }
    }
    return coordArray;
  }

  /**
   * function extract and return the coordinates from the vector tile url
   */
  getTileKey(url: string): string {
    const sA = url.split(/[\/.]/);
    return "_" + sA[sA.length - 4] + "_" + sA[sA.length - 3] + "_" + sA[sA.length - 2];
  }

  saveTileServerConfiguration(data) {
    this.store.setItem("tileServerConfig", JSON.stringify(data));
    return data;
  }

  getTileServerConfiguration() {
    return JSON.parse(this.store.getItem("tileServerConfig"));
  }

  /**
   *
   * params: {url:string, type:'json'|'arrayBuffer'|?}
   * callback(err: ?Error, data: ?Object)
   */
  customProtocolHandler(params: maplibregl.RequestParameters, callback: maplibregl.ResponseCallback<any>) {
    // console.info('start customProtocolHandler with params: ', params);
    const urlPattern = /.*\d+\/\d+\/\d+\..*/;
    // check if url is a tile url if not assume it is a tile description url
    // console.log("customProtocolHandler", params.url);
    if (params.url.match(urlPattern)) {
      // matched tile url
      const key = kvm.getTileKey(params.url);
      // console.info("Searching for tile %s", key);
      kvm
        .readTile(key)
        .then((d) => {
          if (d) {
            // console.info("Tile %s found in DB", key);
            callback(null, d, null, null);
          } else {
            const url = params.url.replace("custom", "https");
            // console.info("Tile %s not in DB. Fetching from url: %s", key, url);
            if (navigator.onLine) {
              fetch(url).then((t) => {
                t.arrayBuffer().then((arr) => {
                  kvm.saveTile(key, arr.slice(0));
                  console.info("Tile %s saved in DB", key);
                  callback(null, arr);
                });
              });
            } else {
              console.log("Kachel % nicht in DB gefunden und nicht online", url);
            }
          }
        })
        .catch((err) => {
          console.info("error=>fetching", err);
          fetch(params.url.replace("custom", "https")).then((t) => {
            t.arrayBuffer().then((arr) => {
              const xx = arr.slice(0);
              kvm.saveTile(key, xx);
              console.info("Tile %s saved in DB", key);
              callback(null, arr);
            });
          });
        });
    } else {
      // request the json describing the source
      // original will be fetched
      // in the response the protocol the tiles will be changed from http to custom
      const url = params.url.replace("custom", "https");
      // switch between on and offline
      if (navigator.onLine) {
        fetch(url)
          .then((t) => {
            t.json().then((data) => {
              //console.info(data);
              kvm.orgTileUrl = data.tiles[0];
              data.tiles[0] = data.tiles[0].replace("https", "custom");
              kvm.saveTileServerConfiguration(data);
              // callback(err: ?Error, tileJSON: ?Object)
              callback(null, data);
            });
          })
          .catch((e) => {
            callback(new Error(e));
          });
      } else {
        const data = kvm.getTileServerConfiguration();
        callback(null, data);
      }
    }
    return { cancel: () => {} };
  }

  init() {
    console.info(cordova);
    document.addEventListener("deviceready", () => this.onDeviceReady());
    /**
     * if maplibre sees an url like custum:// it will call customProtocolHandler
     *
     * customProtocolHandler: (requestParameters: RequestParameters, callback: ResponseCallback<any>) => Cancelable
     * requestParameters: {url:string, type:json?? }
     */
    maplibregl.addProtocol("custom", this.customProtocolHandler);
  }

  // fail(e) {
  //   console.log("FileSystem Error");
  //   console.dir(e);
  // }

  /**
   * Diese Funktion schreibt den Text aus variable log die Log-Datei.
   * Die Log-Datei ist in kvm.openLogFile() definiert worden.
   * @param str
   * @returns
   */
  async writeLog(log: any) {
    log = `[${kvm.now(" ", "", ":")}] ${log}` + "\n";
    const dataObj = new Blob([log], { type: "text/plain" });
    try {
      console.info("writeLog", kvm.logFileEntry);
      await FileUtils.writeFile(kvm.logFileEntry, dataObj, true);
    } catch (ex) {
      throw new Error(`Fehler beim Schreiben in das Logfile ${kvm.logFileEntry.nativeURL} `, ex);
    }
  }

  async _initDB(db: SQLitePlugin.Database) {
    try {
      const tblExists = await tableExists(db, "deltas");
      if (!tblExists) {
        const tableColumnDefinitions = ["version INTEGER PRIMARY KEY", "type text", "change text", "delta text", "created_at text"];
        const sqlCreateDeltaTbl = "CREATE TABLE IF NOT EXISTS deltas (" + tableColumnDefinitions.join(", ") + ")";
        await executeSQL(kvm.db, sqlCreateDeltaTbl);
      }
    } catch (ex) {
      throw new Error("Initialisierung der Datenbank ist fehlgeschlagen.", ex);
    }
  }

  async onDeviceReady() {
    try {
      window.open = <any>cordova.InAppBrowser.open; // oder casten mit window.open = cordova['InAppBrowser'].open;
    } catch ({ name, message }) {
      console.error(`TypeError: ${name} Message: ${message}`);
      alert(`Die App muss ein mal geschlossen und neu gestartet werden!`);
    }
    await prepareBackgrounLayer();
    kvm.store = window.localStorage;
    // console.log("onDeviceReady");
    const configName = (this._configName = kvm.store.getItem("configName") || "Standard");
    const foundConfiguration = configurations.find(function (c) {
      return c.name === configName;
    });
    kvm.config = foundConfiguration || configurations[0];
    for (const k in kvm.config) {
      const v = kvm.store.getItem(k);
      if (v) {
        try {
          kvm.config[k] = JSON.parse(v);
          console.error(`Config key="${k}" v="${v}"`);
        } catch (ex) {
          kvm.config[k] = v;
          kvm.store.setItem(k, JSON.stringify(v));
          console.error(`konnte Config not parsen key="${k}" v="${v}" ${JSON.stringify(v)}`, typeof v);
        }
      }
    }
    // let teststring = "test";
    // kvm.store.setItem("teststring", JSON.stringify(teststring));
    // console.info("teststring", teststring, JSON.parse(kvm.store.getItem("teststring")), typeof JSON.parse(kvm.store.getItem("teststring")), kvm.store.getItem("teststring"), typeof kvm.store.getItem("teststring"));

    // teststring = "24px";
    // kvm.store.setItem("teststring", JSON.stringify(teststring));
    // console.info("teststring", teststring, JSON.parse(kvm.store.getItem("teststring")), typeof JSON.parse(kvm.store.getItem("teststring")), kvm.store.getItem("teststring"), typeof kvm.store.getItem("teststring"));

    // const testboolean = true;
    // kvm.store.setItem("testboolean", JSON.stringify(testboolean));
    // console.info("testboolean", testboolean, typeof JSON.parse(kvm.store.getItem("testboolean")), kvm.store.getItem("testboolean"), typeof kvm.store.getItem("testboolean"));

    // const testnr = 1.2;
    // kvm.store.setItem("testnr", JSON.stringify(testnr));
    // console.info("testnr", testnr, typeof JSON.parse(kvm.store.getItem("testnr")), kvm.store.getItem("testnr"), typeof kvm.store.getItem("testnr"));

    console.info(`setting FontSize ${this.getConfigurationOption("fontSize")}`);
    document.body.style.fontSize = this.getConfigurationOption("fontSize");

    this.db = window.sqlitePlugin.openDatabase(
      {
        name: kvm.config.dbname + ".db",
        location: "default",
        androidDatabaseImplementation: 2,
      },
      (db) => {
        //kvm.log('Lokale Datenbank geöffnet.', 3);
        document.getElementById("dbnameText").innerHTML = kvm.config.dbname + ".db";
        // kvm.initSecuritySettings();

        this._initDB(db);

        if (kvm.store.getItem("fingerprintAuth") == "true") {
          FingerprintAuth.isAvailable(
            function (result: any) {
              console.log("FingerprintAuth available: " + JSON.stringify(result));
              // Check the docs to know more about the encryptConfig object
              const encryptConfig = {
                clientId: "myAppName",
                username: "currentUser",
                password: "currentUserPassword",
                maxAttempts: 5,
                locale: "de_DE",
                dialogTitle: "Authentifizierung mit Fingerabdruck",
                dialogMessage: "Lege Finger auf den Sensor",
                dialogHint: "Diese Methode ist nur Verfügbar mit Fingerabdrucksensor",
              }; // See config object for required parameters

              // Set config and success callback
              //https://www.npmjs.com/package/cordova-plugin-android-fingerprint-auth
              FingerprintAuth.encrypt(
                encryptConfig,
                function (_fingerResult) {
                  //console.log("successCallback(): " + JSON.stringify(_fingerResult));
                  if (_fingerResult.withFingerprint) {
                    //console.log("Successfully encrypted credentials.");
                    //console.log("Encrypted credentials: " + result.token);
                    kvm.startApplication();
                  } else if (_fingerResult.withBackup) {
                    //console.log("Authenticated with backup password");
                    kvm.startApplication();
                  }
                  // Error callback
                },
                function (err) {
                  if (err === "Cancelled") {
                    //console.log("FingerprintAuth Dialog Cancelled!");
                  } else {
                    kvm.msg("FingerprintAuth Error: " + err, "Fehler");
                  }
                }
              );
            },
            function () {
              //console.log("isAvailableError(): " + message);
              // TODO
              kvm.startApplication();
            }
          );
        } else {
          kvm.startApplication();
        }
      },
      function (error) {
        kvm.msg("Open database ERROR: " + error["message"], "Fehler");
      }
    );
  }

  /**
   * function do neccessary things when the application start
   * load several data, status and settings and update the GUI with up to date values
   * load last active stelle, associated layer, last active layer and overlays
   * reload overlays when online
   * Show featurelist by default
   * Inform user when he shall do something next or if some thing is wrong
   *
   * Laden von Layern (layer mit sync == 1)
   *  - Wenn layerIds für die activeStelle registriert sind im store
   *    - layer aus store abfragen und für jede layerId folgendes ausführen:
   *    - Auslesen der layersettings
   *    - Layer Objekt erzeugen
   *    - Layer zur Layerliste, kvm.layers und Karte hinzufügen
   *    - Daten des Layer aus Datenbank abfragen und zeichnen
   *    - Wenn es der aktive Layer ist, aktiv schalten
   * Laden von Overlays (layer mit sync != 1)
   *  - Wenn Netz ist
   *    - layer synchronisieren
   *  - Wenn kein Netz ist
   *    - Anzeigen, dass layer nicht synchronisiert werden können
   */
  async startApplication() {
    let activeView = ["settings", "map", "featurelist"].includes(kvm.store.getItem("activeView")) ? kvm.store.getItem("activeView") : "featurelist";

    this.views = [new ViewEinstellungen(this), new ViewLoggings(this), new ViewFeatureList(this), new ViewMap(this), new ViewDataView(this), new ViewFormular(this)];
    this.menu = new Menu(this);

    kvm.userId = kvm.store.getItem("userId");
    kvm.userName = kvm.store.getItem("userName");

    // const layerList = document.getElementById("layer_list");
    // if (layerList) {
    //   // console.log("addMutationObserver");
    //   const callback = (mutations: MutationRecord[], observer: MutationObserver) => {
    //     for (const mutation of mutations) {
    //       if (mutation.type === "childList" && mutation.addedNodes?.length > 0) {
    //         // console.log("xxx Node(s) added", mutation.addedNodes);
    //       } else if (mutation.type === "attributes") {
    //         // console.info(
    //         //   `The ${mutation.attributeName} attribute was modified.`,
    //         //   mutation
    //         // );
    //       }
    //     }
    //   };

    //   //     // Create an observer instance linked to the callback function
    //   //     const observer = new MutationObserver(callback);
    //   //     observer.observe(layerList, { attributes: true, childList: true, subtree: true });
    //   // }
    //   // Create an observer instance linked to the callback function
    //   const observer = new MutationObserver(callback);
    //   observer.observe(layerList, { attributes: true, childList: true, subtree: true });
    // }

    try {
      kvm.store.getItem("activeView") || "featurelist";
      // console.log("startApplication");

      const dbPromise = idb.openDB("keyval-store", 1, {
        upgrade(db) {
          db.createObjectStore("keyval");
        },
      });

      this.readTile = async function (key: IDBValidKey) {
        return (await dbPromise).get("keyval", key);
      };

      this.saveTile = async function (key: IDBValidKey, val: any) {
        return (await dbPromise).put("keyval", val, key);
      };
    } catch ({ name, message }) {
      kvm.msg("Fehler beim Lesen des activeView und Title! Fehlertyp: " + name + " Fehlermeldung: " + message);
    }

    try {
      this.loadLogLevel();
      this.openLogFile();

      // this.loadDeviceData();
      //    SyncStatus.load(this.store); ToDo: Wenn das nicht gebraucht wird auch in index.html löschen.
      this.networkStatus = NetworkStatus;
      this.gpsStatus = GpsStatus;
      // this.initConfigOptions();
      this.initMap();

      // this.initViewSettings();
      // this.initLoadOfflineMapsDiv();
      // this.initColorSelector();
      // this.initStatusFilter();
      // this.initLocalBackupPath();

      // this.initFontSize();
      // this.initColorSelector();
    } catch ({ name, message }) {
      kvm.msg("Fehler beim initieren der Anwendungskomponenten! Fehlertyp: " + name + " Fehlermeldung: " + message);
    }

    let stelle: Stelle = null;
    if (this.store.getItem("activeStelleId") && this.store.getItem("stelleSettings_" + this.store.getItem("activeStelleId"))) {
      let activeStelleId = this.store.getItem("activeStelleId");
      let activeStelleSettings = this.store.getItem("stelleSettings_" + activeStelleId);

      //console.log("Aktive Stelle " + activeStelleId + " gefunden.");

      try {
        stelle = new Stelle(activeStelleSettings);
        // stelle.activate();
        this.setActiveStelle(stelle);
      } catch ({ name, message }) {
        kvm.msg("Fehler beim setzen der aktiven Stelle id: " + activeStelleId + "! Fehlertyp: " + name + " Fehlermeldung: " + message);
      }

      const layerSettings = stelle.getLayerSettings();

      if (layerSettings?.length > 0) {
        stelle.readAllLayers = true;
        stelle.numLayersRead = 0;
        stelle.numLayers = layerSettings.length;
        sperrBildschirm.show("Lade Layerdaten.");

        for (const settings of layerSettings) {
          if (settings.vector_tile_url) {
            const layer = new MapLibreLayer(settings, true, stelle);
            layer.appendToApp();
            stelle.finishLayerReading(layer);
          } else {
            const layer = new Layer(stelle, settings);
            this.addLayer(layer);
            layer.appendToApp();

            if (navigator.onLine && layer.hasSyncPrivilege && layer.get("autoSync")) {
              if (layer.hasEditPrivilege) {
                try {
                  console.log("Layer " + layer.title + ": SyncData with local deltas if exists.");
                  // TODO Deltas
                  // layer.syncData();
                } catch ({ name, message }) {
                  kvm.msg("Fehler beim synchronisieren des Layers id: " + layer.getGlobalId() + "! Fehlertyp: " + name + " Fehlermeldung: " + message);
                }
                try {
                  console.log("Layer " + layer.title + ": SyncImages with local images if exists.");
                  layer.syncImages();
                } catch ({ name, message }) {
                  kvm.msg("Fehler beim synchronisieren der Bilder des Layers id: " + layer.getGlobalId() + "! Fehlertyp: " + name + " Fehlermeldung: " + message);
                }
              } else {
                console.log("Layer " + layer.title + ": Only get deltas from server.");
                try {
                  // TODO Deltas
                  // layer.sendDeltas({ rows: [] });
                } catch ({ name, message }) {
                  kvm.msg("Fehler beim senden der Deltas des Layers id: " + layer.getGlobalId() + "! Fehlertyp: " + name + " Fehlermeldung: " + message);
                }
              }
            } else {
              console.log("Layer " + layer.title + ": Only read data from local database.");
              await layer.readData(); // include drawFeatures
            }
            if (layer.get("id") == kvm.store.getItem("activeLayerId")) {
              layer.isActive = true;
              kvm.setActiveLayer(layer);
            }
          }
        }

        stelle.sortOverlays();
        stelle.sortLayers();
      } else {
        kvm.msg("Laden Sie die Stellen und Layer vom Server.");
        $("#newFeatureButton, #showDeltasButton").hide();
        activeView = "settings";
        PanelEinstellungen.show("server");
      }
    } else {
      kvm.msg("Wählen Sie eine Konfiguration aus und Stellen die Zugangsdaten zum Server ein.");
      stelle = new Stelle({
        id: kvm.config.kvwmapServerId,
        name: kvm.config.kvwmapServerName,
        url: kvm.config.kvwmapServerUrl,
        login_name: kvm.config.kvwmapServerLoginName,
        passwort: kvm.config.kvwmapServerPasswort,
      });
      this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.ACTIVE_LAYER_CHANGED, stelle, null));
      activeView = "settings";
      PanelEinstellungen.show("server");
    }

    if (kvm.store.hasOwnProperty("activeLayerId")) {
      const layer = this.getLayer(kvm.store.getItem("activeLayerId"));
      if (layer) {
        this.setActiveLayer(layer);
      }
    }

    this.bindEvents();

    //kvm.log("Liste der Datensätze angezeigt.", 4);
    this.showItem(activeView);
    sperrBildschirm.close();
  }

  reloadFeatures() {
    console.error("app.reloadFeatures");
    this._layers.forEach((layer) => {
      layer.readData();
    });
  }

  // initConfigOptionsOld() {
  //   $("#configFileDiv").append(
  //     $("<select>")
  //       .attr({
  //         id: "configName",
  //         name: "configName",
  //       })
  //       .on("change", (evt) => {
  //         navigator.notification.confirm(
  //           "Wollen Sie wirklich die Konfiguration ändern? Dabei gehen alle lokalen Änderungen verloren, die Layer und Einstellungen werden gelöscht und die Anwendung wird mit den Default-Werten der anderen Konfiguration neu gestartet!",
  //           function (buttonIndex) {
  //             if (buttonIndex == 2) {
  //               $("#configName").val(kvm.store.getItem("configName"));
  //             } else {
  //               const newVal = $(evt.target).val();
  //               kvm.setConfigOption(newVal);
  //             }
  //           },
  //           "Konfiguration",
  //           ["Ja", "Abbruch"]
  //         );
  //       })
  //   );

  //   configurations.map(function (c) {
  //     $("#configName").append(
  //       $("<option>")
  //         .attr({
  //           value: c.name,
  //         })
  //         .prop("selected", c.name == kvm.store.getItem("configName"))
  //         .html(c.name)
  //     );
  //   });
  // }

  /**
   * setzt und schreibt diese als JSON in den store
   * @param optionName
   * @param value
   */
  setConfigurationOption<K extends keyof Configuration>(optionName: K, value: any) {
    this.config[optionName] = value;
    this.store.setItem(optionName, JSON.stringify(value));
  }

  getConfigurationOption<K extends keyof Configuration>(optionName: K): any {
    let configValue: any = this.config[optionName];
    if (!configValue) {
      if (kvm.store.hasOwnProperty(optionName)) {
        configValue = JSON.parse(kvm.store.getItem(optionName));
        console.debug(`getConfigurationOption(${optionName})=>${configValue} type=${typeof configValue}`);
        this.config[optionName] = configValue;
      }
    }
    return configValue;
  }

  getDefaultConfigurationOption<K extends keyof Configuration>(optionName: K): any {
    const foundConfiguration = configurations.find((c) => {
      return c.name === this._configName;
    });
    const config = foundConfiguration || configurations[0];
    return config[optionName];
  }

  getConfigName() {
    if (this._configName) {
      return this._configName;
    }
  }

  /**
   * setzt die Konfiguration und startet die App
   * @param configName reset
   */
  setConfiguration(configName: string) {
    const oldconfigName = this._configName;
    this._configName = configName;
    this.store.clear();
    this.store.setItem("configName", configName);

    // const stelle = new Stelle();
    // if (configName) {
    //   const foundConfiguration = configurations.find(function (c) {
    //     return c.name === configName;
    //   });
    //   this.config = foundConfiguration;
    //   stelle.settings.ID = this.getConfigurationOption("kvwmapServerId");
    //   stelle.settings.name = this.getConfigurationOption("kvwmapServerName");
    //   stelle.settings.url = this.getConfigurationOption("kvwmapServerUrl");
    //   stelle.settings.login_name = this.getConfigurationOption("kvwmapServerLoginName");
    //   stelle.saveToStore();
    // }
    this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.ACTIVE_CONFIGURATION_CHANGED, oldconfigName, configName));
    PanelEinstellungen.show("server");
  }

  initMap() {
    //kvm.log("Karte initialisieren.", 3);
    kvm.log("initialisiere Mapsettings", 3);
    // this.initMapSettings();

    kvm.log("initialisiere backgroundLayers", 3);
    this.initBackgroundLayers();

    // rtr removed
    // const crs25833 = new L.Proj.CRS("EPSG:25833", "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs", {
    //     origin: [-464849.38, 6310160.14],
    //     resolutions: [16384, 8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1],
    // });
    //this.myRenderer = new L.Canvas({ padding: 0.5, tolerance: 5 });
    this.myRenderer = new SVG();

    const map = new LMap("map", <any>{
      // crs: crs25833,
      editable: true,
      center: JSON.parse(kvm.store.getItem("activeCenter")) || new LatLng(this.mapSettings.startCenterLat, this.mapSettings.startCenterLon),
      zoom: kvm.store.getItem("activeZoom") || this.mapSettings.startZoom,
      minZoom: this.mapSettings.minZoom,
      maxZoom: this.mapSettings.maxZoom,
      maxBounds: [
        [this.mapSettings.south, this.mapSettings.west],
        [this.mapSettings.north, this.mapSettings.east],
      ],
      layers: this.backgroundLayers[this.config.activeBackgroundLayerId ? this.config.activeBackgroundLayerId : 0].leafletLayer,
      renderer: this.myRenderer,
    });
    const baseMaps = {};
    map.on("popupopen", function (evt) {
      kvm.controls.layers.collapse();
    });
    map.on("zoomend", (evt) => kvm.store.setItem("activeZoom", evt.target.getZoom()));
    map.on("moveend", (evt) => {
      kvm.store.setItem("activeCenter", JSON.stringify(evt.target.getCenter()));
      if ($("#geolocation_div").is(":visible")) {
        $("#geolocation_div").html(`${evt.target.getCenter().lat} ${evt.target.getCenter().lng}`);
      }
    });

    // map.on("locationfound", kvm.onlocationfound);
    // map.on("locationerror", kvm.onlocationerror);

    map.on("locateactivate", (evt) => {
      $("#geolocation_div").html("Koordinaten");
      $("#geolocation_div").show();
      kvm.mapHint("GPS-Tracking eingeschaltet!");
    });

    map.on("locatedeactivate", (evt) => {
      $("#geolocation_div").hide();
      $("#geolocation_div").html("");
      kvm.mapHint("GPS-Tracking ausgeschaltet!");
    });

    /* ToDo Hier Klickevent einführen welches das gerade selectierte Feature deseletiert.
    map.on('click', function(evt) {
      console.log('Click in Map with evt: %o', evt);
    });
    */

    // TODO
    /*    (<any>map).setMaxBounds([
      [this.mapSettings.south, this.mapSettings.west],
      [this.mapSettings.north, this.mapSettings.east],
    ]);
*/
    for (let i = 0; i < this.backgroundLayers.length; i++) {
      baseMaps[`<span id="backgroundLayerSpan_${i}">${this.backgroundLayerSettings[i].label}</span>`] = this.backgroundLayers[i].leafletLayer;
    }

    if (this.store.getItem("activeStelleId") && this.store.getItem(`stelleSettings_${this.store.getItem("activeStelleId")}`) != null) {
      // console.log(
      //   this.config.name,
      //   this.store.getItem("activeStelleId"),
      //   JSON.parse(
      //     this.store.getItem(
      //       `stelleSettings_${this.store.getItem("activeStelleId")}`
      //     )
      //   ).Stelle_ID
      // );
    }

    // ToDo: Anpassen so dass die Infos aus der Config kommen und für alle gelten können.
    if (this.config.name == "LK-EE" && this.store.getItem("activeStelleId") && this.store.getItem(`stelleSettings_${this.store.getItem("activeStelleId")}`) && JSON.parse(this.store.getItem(`stelleSettings_${this.store.getItem("activeStelleId")}`)).Stelle_ID == "103") {
      baseMaps["PmVectorTile"] = new MapLibreLayer("https://geoportal.lkee.de/html/pmtiles/style-schlaege.json", true, kvm._activeStelle);
    }

    //    L.PM.initialize({ optIn: true });
    // ToDo sortFunction hinzufügen die nach drawingorder sortieren kann
    kvm.controls.layers = new Control.Layers(baseMaps, null, {
      autoZIndex: true,
      sortLayers: false,
      sortFunction: (layerA, layerB, nameA, nameB) => (parseInt(layerA.getAttribution()) > parseInt(layerB.getAttribution()) ? parseInt(layerA.getAttribution()) : parseInt(layerB.getAttribution())),
    }).addTo(map);

    kvm.controls.locate = new Control.Locate({
      position: "topright",
      setView: "untilPanOrZoom",
      keepCurrentZoomLevel: false,
      flyTo: true,
      clickBehavior: {
        inView: "stop",
        outOfView: "setView",
        inViewNotFollowing: "inView",
      },
      locateOptions: {
        enableHighAccuracy: true,
      },
      followMarkerStyle: {
        color: "#ffffff",
        weight: 4,
        fill: true,
        fillOpacity: 0.8,
        fillColor: "#fc8428",
      },
      cacheLocation: true,
      strings: {
        title: "Zeig mir wo ich bin.",
        metersUnit: "Meter",
        popup: "Sie befinden sich im Umkreis von {distance} {unit}.",
        outsideMapBoundsMsg: "Sie sind außerhalb des darstellbaren Bereiches der Karte.",
      },
    }).addTo(map);
    const ReloadLayers = Control.extend({
      onAdd: function (map: LMap) {
        // console.log("Add leaflet control reloadLayers %o to Map: %o", this, map);
        this._div = DomUtil.create("div", "leaflet-bar leaflet-control-reloadlayers"); // create a div with a class "reloadlayers-control-div"
        this._div.innerHTML = '<a class="leaflet-control-reloadlayers-icon"><span><i class="fa fa-refresh" onclick="kvm.reloadFeatures()"></i></span></a>';
        return this._div;
      },
      onClick: function (evt) {
        // console.log("Click on leaflet control reloadLayers with event: %o", evt);
      },
      onRemove: function (map) {
        // console.log("Remove leaflet control reloadLayers %o to Map: %o", this, map);
      },
    });
    // (<any>L).Control.reloadLayers = function (opts) {
    //     return new (<any>L).Control.ReloadLayers(opts);
    // };
    kvm.controls.reloadLayers = new ReloadLayers({
      position: "topleft",
    }).addTo(map);

    const ZoomLevelControl = Control.extend({
      options: {
        position: "topleft", // Position the control in the top left corner
      },

      onAdd: function (map: LMap) {
        const container = DomUtil.create("div", "leaflet-bar leaflet-control leaflet-control-zoomLevel"); // Create a container for the control
        const zoomLevel = DomUtil.create("div", "leaflet-bar-part", container); // Create a div for displaying zoom level
        zoomLevel.innerHTML = "Zoom: " + map.getZoom(); // Set initial zoom level

        // Update zoom level when zoom changes
        map.on("zoomend", function () {
          zoomLevel.innerHTML = "Zoom: " + map.getZoom();
        });

        return container;
      },
    });
    kvm.controls.zoomLevelControl = new ZoomLevelControl().addTo(map);

    kvm.controls.betterscale = (<any>L).control
      .betterscale({
        metric: true,
      })
      .addTo(map);
    kvm.controls.trackControl = new Control.EasyButton({
      id: "trackControl",
      position: "topright",
      leafletClasses: true,
      states: [
        {
          stateName: "track-aufzeichnen",
          icon: "fa-circle",
          title: "Track aufzeichnen",
          onClick: function (btn, map) {
            navigator.notification.confirm(
              "Wie möchten Sie fortfahren?",
              function (buttonIndex) {
                const lastLatlng = kvm.getActiveLayer().activeFeature.getWaypoint("last");
                if (buttonIndex == 1) {
                  console.log("Vorhandenen Track löschen und neu beginnen.");
                  // Editierbarkeit ausschalten
                  kvm.getActiveLayer().activeFeature.editableLayer.disableEdit();
                  // LatLngs zurücksetzen
                  kvm.getActiveLayer().activeFeature.editableLayer.setLatLngs([]);
                  // Tracking einschalten (latlngs hinzufügen auch im Hintergrund, wenn das Display aus ist.)
                  kvm.controller.mapper.startGpsTracking(lastLatlng);
                  btn.state("track-aufnahme");
                } else if (buttonIndex == 2) {
                  console.log("Vorhandenen Track weiterzeichnen.");
                  // Editierbarkeit ausschalten
                  kvm.getActiveLayer().activeFeature.editableLayer.disableEdit();
                  // Tracking einschalten (latlngs hinzufügen)
                  kvm.controller.mapper.startGpsTracking(lastLatlng);
                  btn.state("track-aufnahme");
                } else {
                  console.log("Abbruch");
                }
              },
              "GPS-Track aufzeichnen.",
              ["Löschen und neu beginnen", "An Linie anhängen", "Abbrechen"]
            );
          },
        },
        {
          stateName: "track-aufnahme",
          icon: "fa-pause",
          title: "Track unterbrechen",
          onClick: function (btn, map) {
            navigator.notification.confirm(
              "Wie möchten Sie fortfahren?",
              function (buttonIndex) {
                if (buttonIndex == 1) {
                  console.log("Aufnahme beenden.");
                  // Tracking ausschalten
                  navigator.geolocation.clearWatch(kvm.controller.mapper.watchId);
                  // Track als Geometrie vom Feature übernehmen
                  //Editierbarkeit einschalten.
                  kvm.getActiveLayer().activeFeature.editableLayer.enableEdit();
                  btn.state("track-aufzeichnen");
                } else if (buttonIndex == 2) {
                  console.log("Aufnahme unterbrechen.");
                  // Tracking ausschalten
                  navigator.geolocation.clearWatch(kvm.controller.mapper.watchId);
                  btn.state("track-pause");
                } else {
                  console.log("Abbruch");
                }
              },
              "GPS-Track aufzeichnen.",
              ["Aufnahme beenden", "Aufnahme unterbrechen", "Abbrechen"]
            );
          },
        },
        {
          stateName: "track-pause",
          icon: "fa-play",
          title: "Aufnahme fortsetzen",
          onClick: function (btn, map) {
            navigator.notification.confirm(
              "Wie möchten Sie fortfahren?",
              function (buttonIndex) {
                const lastLatlng = kvm.getActiveLayer().activeFeature.getWaypoint("last");
                if (buttonIndex == 1) {
                  console.log("Aufnahme beenden.");
                  // Tracking ausschalten
                  navigator.geolocation.clearWatch(kvm.controller.mapper.watchId);
                  // Track als Geometrie vom Feature übernehmen
                  //Editierbarkeit einschalten.
                  kvm._activeLayer.activeFeature.editableLayer.enableEdit();
                  btn.state("track-aufzeichnen");
                } else if (buttonIndex == 2) {
                  console.log("Aufnahme fortsetzen.");
                  // Tracking einschalten
                  kvm.controller.mapper.startGpsTracking(lastLatlng);
                  btn.state("track-aufnahme");
                } else {
                  console.log("Abbruch");
                }
              },
              "GPS-Track aufzeichnen.",
              ["Aufnahme beenden", "Aufnahme fortsetzen", "Abbrechen"]
            );
          },
        },
      ],
    }).addTo(map);
    $("#trackControl").parent().hide();

    this.map = map;
  }

  /**
   * Initialisiere die Optionen zum Download der Offlinekarten im loadOfflineMapsDiv
   */
  // initLoadOfflineMapsDiv() {
  //   console.log("initLoadOfflineMapsDiv");
  //   const offlineLayers = kvm.config.backgroundLayerSettings.filter((setting) => {
  //     return setting.online === false;
  //   });
  //   console.log("offlineLayers in initLoadOfflineMapsDiv: %o", offlineLayers);
  //   offlineLayers.forEach((offlineLayer) => {
  //     $("#loadOfflineMapsDiv").append(`
  // 			<div>
  // 				${offlineLayer.label}
  // 				<button id="downloadBackgroundLayerButton" class="settings-button" value="${offlineLayer.layer_id}">
  // 					<i class="fa fa-download" arial-hidden="true"></i>
  //           herunterladen
  // 				</button>
  // 			</div>
  // 		`);
  //   });
  // }

  // initColorSelector() {
  //   kvm.store.setItem("markerStyles", JSON.stringify(markerStyles));
  //   Object.values(markerStyles).forEach(this.addColorSelector);
  // }

  // initFontSize() {
  //   const sizePixel = parseFloat(kvm.store.getItem("fontSize") || kvm.config.fontSize || "24px");
  //   const sizeDefault = parseFloat(kvm.config.fontSize);
  //   const sizeProzent = Math.round((sizePixel / sizeDefault) * 100);
  //   const fontSize = `${sizePixel}px`;
  //   document.body.style.fontSize = fontSize;
  //   document.getElementById("fontSizeProzent").innerHTML = `${sizeProzent} %`;
  //   document.getElementById("fontSizeDefaultButton").style.display = sizeProzent == 100 ? "none" : "inline";
  //   kvm.store.setItem("fontSize", fontSize);
  // }

  // initColorSelector() {
  //   const markerStyles = JSON.parse(kvm.store.getItem("markerStyles")) || kvm.config.markerStyles;
  //   kvm.store.setItem("markerStyles", JSON.stringify(markerStyles));
  //   Object.values(markerStyles).forEach(this.addColorSelector);
  // }

  addColorSelector(style: any, i: number) {
    const colorSelectorDiv = $("#colorSelectorDiv");
    colorSelectorDiv.append(
      '\
      <label for="colorStatus' +
        i +
        '">Status ' +
        i +
        ':</label>\
      <input type="color" id="colorStatus' +
        i +
        '" name="colorStatus' +
        i +
        '" value="' +
        style.fillColor +
        '" onChange="kvm.updateMarkerStyle(this)"><br>\
    '
    );
  }

  // initStatusFilter() {
  //   const statusFilter = kvm.store.getItem("statusFilter");
  //   if (statusFilter) {
  //     $("#statusFilterSelect").val(statusFilter);
  //   }
  // }

  // initLocalBackupPath() {
  //   const localBackupPath = kvm.store.getItem("localBackupPath") || kvm.config.localBackupPath;
  //   kvm.store.setItem("localBackupPath", localBackupPath);
  //   $("#localBackupPath").val(localBackupPath);
  // }

  getMapSettings() {
    if (!this.mapSettings) {
      if (!(this.mapSettings = JSON.parse(kvm.store.getItem("mapSettings")))) {
        this.saveMapSettings(kvm.config.mapSettings);
      }
    }
    return this.mapSettings;
  }

  setMapSetting(settingName: string, value: string) {
    if (this.mapSettings) {
      this.mapSettings[settingName] = value;
      console.info(`mapSetting changed: ${settingName}=${value}`);
    }
  }

  // getViewAfterCreate() {
  //   kvm.config.viewAfterCreate = (kvm.store.hasOwnProperty("viewAfterCreate") ? kvm.store.getItem("viewAfterCreate") : kvm.config.viewAfterCreate) || "last";
  //   kvm.store.setItem("viewAfterCreate", kvm.config.viewAfterCreate);
  //   return kvm.config.viewAfterCreate;
  // }

  // getViewAfterUpdate() {
  //   kvm.config.viewAfterUpdate = (kvm.store.hasOwnProperty("viewAfterUpdate") ? kvm.store.getItem("viewAfterUpdate") : kvm.config.viewAfterUpdate) || "last";
  //   kvm.store.setItem("viewAfterUpdate", kvm.config.viewAfterUpdate);
  //   return kvm.config.viewAfterUpdate;
  // }

  // getConfirmSave() {
  //   kvm.config.confirmSave = (kvm.store.hasOwnProperty("confirmSave") ? kvm.store.getItem("confirmSave") == "true" : kvm.config.confirmSave) || false;
  //   kvm.store.setItem("confirmSave", kvm.config.confirmSave);
  //   return kvm.config.confirmSave;
  // }

  // setConfirmSave(confirmSave: boolean) {
  //   kvm.config.confirmSave = confirmSave;
  //   console.log("Set confirmSave to ", kvm.config.confirmSave);
  //   kvm.store.setItem("confirmSave", kvm.config.confirmSave.toString());
  // }

  // getFingerprintAuth() {
  //   kvm.config.fingerprintAuth = (kvm.store.hasOwnProperty("fingerprintAuth") ? kvm.store.getItem("fingerprintAuth") == "true" : kvm.config.fingerprintAuth) || false;
  //   kvm.store.setItem("fingerprintAuth", <string>(<any>kvm.config.fingerprintAuth));
  //   return kvm.config.fingerprintAuth;
  // }

  // setFingerprintAuth(fingerprintAuth: boolean) {
  //   kvm.config.fingerprintAuth = fingerprintAuth;
  //   console.log("Set fingerprintAuth to ", kvm.config.fingerprintAuth);
  //   kvm.store.setItem("fingerprintAuth", String(fingerprintAuth));
  // }

  // initViewSettings() {
  //   // console.log("initViewSettings");
  //   kvm.config.viewAfterCreate = (kvm.store.hasOwnProperty("viewAfterCreate") ? kvm.store.getItem("viewAfterCreate") : kvm.config.viewAfterCreate) || "last";
  //   kvm.store.setItem("viewAfterCreate", kvm.config.viewAfterCreate);
  //   $("#viewAfterCreate").val(kvm.config.viewAfterCreate);
  //   // console.log("viewAfterCreate = ", kvm.config.viewAfterCreate);

  //   kvm.config.viewAfterUpdate = (kvm.store.hasOwnProperty("viewAfterUpdate") ? kvm.store.getItem("viewAfterUpdate") : kvm.config.viewAfterUpdate) || "last";
  //   kvm.store.setItem("viewAfterUpdate", kvm.config.viewAfterUpdate);
  //   $("#viewAfterUpdate").val(kvm.config.viewAfterUpdate);
  //   // console.log("viewAfterUpdate = ", kvm.config.viewAfterUpdate);

  //   kvm.config.newAfterCreate = (kvm.store.hasOwnProperty("newAfterCreate") ? kvm.store.getItem("newAfterCreate") == "true" : kvm.config.newAfterCreate) || false;
  //   kvm.store.setItem("newAfterCreate", <string>(<any>kvm.config.newAfterCreate));
  //   $(".newAfterCreate").prop("checked", kvm.config.newAfterCreate);
  //   // console.log("newAfterCreate = ", kvm.config.newAfterCreate);
  // }

  // initSecuritySettings() {
  // console.log("initSecuritySettings");
  // kvm.config.fingerprintAuth = (kvm.store.hasOwnProperty("fingerprintAuth") ? kvm.store.getItem("fingerprintAuth") == "true" : kvm.config.fingerprintAuth) || false;
  // kvm.store.setItem("fingerprintAuth", <string>(<any>kvm.config.fingerprintAuth));
  // $("#fingerprintAuth").prop("checked", kvm.config.fingerprintAuth);
  // console.log("fingerprintAuth = ", kvm.config.fingerprintAuth);

  // kvm.config.confirmSave = (kvm.store.hasOwnProperty("confirmSave") ? kvm.store.getItem("confirmSave") == "true" : kvm.config.confirmSave) || false;
  // kvm.store.setItem("confirmSave", kvm.config.confirmSave);
  // $("#confirmSave").prop("checked", kvm.config.confirmSave);
  // console.log("confirmSave = ", kvm.config.confirmSave);
  // }

  saveMapSettings(mapSettings) {
    this.mapSettings = mapSettings;
    kvm.store.setItem("mapSettings", JSON.stringify(mapSettings));
  }

  // initBackgroundLayers() {
  //   // console.log('initBackgroundLayers');
  //   try {
  //     this.saveBackgroundLayerSettings(kvm.store.backgroundLayerSettings ? JSON.parse(kvm.store.getItem("backgroundLayerSettings")) : kvm.config.backgroundLayerSettings);
  //     //this.saveBackgroundLayerSettings(kvm.config.backgroundLayerSettings);
  //     kvm.backgroundLayerSettings.forEach((l, i) => {
  //       $("#backgroundLayerSettingsDiv").append('<div id="backgroundLayerDiv_' + i + '"><b>' + l.label + '</b><br>URL:<br><input id="backgroundLayerURL_' + i + '" type="text" value="' + l.url + '"></input></div>');
  //       if (l.params.layers) {
  //         $("#backgroundLayerDiv_" + i).append('<br>Layer:<br><input id="backgroundLayerLayer_' + i + '" type="text" value="' + l.params.layers + '" style="font-size: 20px;"></input>');
  //       }
  //     });
  //     //  $("#backgroundLayersTextarea").val(kvm.store.getItem("backgroundLayerSettings"));
  //     this.backgroundLayers = [];
  //     // for (var i = 0; i < 2; ++i) {
  //     for (let i = 0; i < this.backgroundLayerSettings.length; ++i) {
  //       // console.log(this.backgroundLayerSettings[i]);
  //       this.backgroundLayers.push(new BackgroundLayer(this.backgroundLayerSettings[i]));
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     kvm.msg("Fehler beim Einrichten der Hintergrundlayer: " + error);
  //     return false;
  //   }
  // }

  initBackgroundLayers() {
    // console.log('initBackgroundLayers');
    try {
      const backgroundLayerSettings = this.getBackgroundLayerSettings();
      for (let i = 0; i < backgroundLayerSettings.length; ++i) {
        this.backgroundLayers.push(new BackgroundLayer(this.backgroundLayerSettings[i]));
      }
    } catch (error) {
      console.error(error);
      kvm.msg("Fehler beim Einrichten der Hintergrundlayer: " + error);
      return false;
    }
  }

  getBackgroundLayerSettings(): BackgroundLayerSetting[] {
    if (!this.backgroundLayerSettings) {
      this.backgroundLayerSettings = kvm.store.backgroundLayerSettings ? JSON.parse(kvm.store.getItem("backgroundLayerSettings")) : kvm.config.backgroundLayerSettings;
    }
    return this.backgroundLayerSettings;
  }

  saveBackgroundLayerSettings(backgroundLayerSettings: any[]) {
    this.backgroundLayerSettings = backgroundLayerSettings;
    kvm.store.setItem("backgroundLayerSettings", JSON.stringify(backgroundLayerSettings));
  }

  // onlocationfound(evt: any) {
  //   //console.log("Found a new geolocation: %o", evt);
  //   $("#gpsStatusText").html("GPS vorhanden und funktioniert");
  //   const timestamp = new Date(evt.timestamp);
  //   const coords = evt.coords ? evt.coords : evt;

  //   $("#gpsCurrentPosition").html("Position: " + coords.latitude.toString() + " " + coords.longitude.toString() + "<br>Genauigkeit: " + coords.accuracy + "<br>Zeit: " + timestamp.toLocaleDateString() + " " + timestamp.toLocaleTimeString());
  //   $("#zoomToCurrentLocation").show();
  //   kvm.GpsIsOn = true;
  // }

  // onlocationerror(evt: LErrorEvent | GeolocationPositionError) {
  //   //console.log("geolocation error occured: %o", evt);
  //   kvm.msg("Der Standort kann nicht bestimmt werden!\nSchalten Sie in Ihrem Gerät unter Einstellungen die Option 'Standort verwenden' ein.\nFehler bei der Bestimmung der GPS-Position.\nDie Wartezeit für eine neue Position ist überschritten.\nMeldung des GPS-Gerätes: " + evt.message, "GPS Positionierung");
  //   $("#gpsStatusText").html("GPS Zeitüberschreitungsfehler");
  //   $("#zoomToCurrentLocation").hide();
  //   kvm.GpsIsOn = false;
  // }

  // addColorSelector(style: any, i: number) {
  //   const colorSelectorDiv = $("#colorSelectorDiv");
  //   colorSelectorDiv.append(
  //     '\
  //     <label for="colorStatus' +
  //       i +
  //       '">Status ' +
  //       i +
  //       ':</label>\
  //     <input type="color" id="colorStatus' +
  //       i +
  //       '" name="colorStatus' +
  //       i +
  //       '" value="' +
  //       style.fillColor +
  //       '" onChange="kvm.updateMarkerStyle(this)"><br>\
  //   '
  //   );
  // }

  getMarkerStyles() {
    const markerStyles = JSON.parse(kvm.store.getItem("markerStyles")) || kvm.config.markerStyles;
    return markerStyles;
  }

  updateMarkerStyle(idx: number, color: string) {
    //console.log('new Color: %o', elm);
    const markerStyles = JSON.parse(kvm.store.getItem("markerStyles"));
    markerStyles[idx].fillColor = color;
    kvm.store.setItem("markerStyles", JSON.stringify(markerStyles));
    if (kvm._activeLayer) kvm._activeLayer.readData(getValueOfElement("limit"), getValueOfElement("offset"));
  }

  setCameraOption(quality: number, saveInPhotoAlbum: boolean) {
    // TODO
    console.error(`setCameraOption(${quality}, ${saveInPhotoAlbum})`);
  }

  downloadBackgroundLayer(bl: BackgroundLayerSetting) {
    navigator.notification.confirm(
      "Alle Vektorkacheln vom Projektgebiet herunterladen? Vergewissern Sie sich, dass Sie in einem Netz mit guter Anbindung sind.",
      (buttonIndex) => {
        if (buttonIndex === 1) {
          if (navigator.onLine) {
            // ja
            //kvm.msg("Ich beginne mit dem Download der Kacheln.", "Kartenverwaltung");
            // document.getElementById("sperr_div").style.display = "block";
            sperrBildschirm.setContent('<b>Kartenverwaltung</b><br><br>Download der Kacheln:<br><br><div id="sperr_div_progress_div"></div>');
            let sperrDivProgressDiv = document.getElementById("sperr_div_progress_div");
            // hide the button and show a progress div
            // find p1, p2 and zoom levels to fetch data in layer configuration
            // get urls for vector tiles to download
            // download the files in background and update the progress div
            // confirm the finish
            // hide the progress div and show the delete and update button
            // const bl = kvm.backgroundLayerSettings.filter(function (l) {
            //   return l.layer_id == offlineLayerId;
            // })[0];
            const params = bl.params;
            let key = "";

            //console.log('Fetch vector tiles for p1: %s,%s p2: %s,%s', params.south, params.west, params.north, params.east);
            const tileLinks = [];

            for (let z = params.minZoom; z <= params.maxNativeZoom; z++) {
              //console.log('Zoom level: %s', z);
              kvm.getTilesUrls(new LatLng(params.south, params.west), new LatLng(params.north, params.east), z, bl.url).forEach((url) => tileLinks.push(url));
            }
            let i = 0;
            const iSoll = tileLinks.length;
            console.log("Anzahl der herunter zu ladenden Kacheln:" + iSoll);

            function download() {
              if (tileLinks.length > 0) {
                const url = tileLinks.pop();
                const key = kvm.getTileKey(url);
                fetch(url)
                  .then((t) => {
                    // console.info("result ", t);
                    t.arrayBuffer()
                      .then((arr) => {
                        kvm.saveTile(key, arr.slice(0));
                        i++;
                        sperrDivProgressDiv.innerHTML = `<span class="highlighted">${i} von ${iSoll} runtergeladen</span>`;
                        download();
                      })
                      .catch((reason) => {
                        console.info("Fehler by arraybuffer", reason);
                        download();
                      });
                  })
                  .catch((reason) => {
                    console.info("Fehler by fetch", reason);
                    download();
                  });
              } else {
                console.info("downloaded " + i + " von " + iSoll);
                sperrBildschirm.close();
                kvm.msg("Download abgeschlossen!", "Kartenverwaltung");
              }
            }
            download();
          } else {
            kvm.msg("Kein Internet! Stellen Sie eine Internetverbindung her.", "Kartenverwaltung");
          }
        }
        if (buttonIndex == 2) {
          // nein
          kvm.msg("OK, Abbruch.", "Kartenverwaltung");
        }
      },
      "Kartenverwaltung",
      ["ja", "nein"]
    );
  }

  bindEvents() {
    //ToDos pk:
    //ondblclick on sperrdiv hier registrieren zum hiden des sperrdiv on dblclick
    document.addEventListener(
      "backbutton",
      function () {
        navigator.notification.confirm(
          "Anwendung schließen?",
          function (buttonIndex) {
            if (buttonIndex == 1) {
              // ja
              (<any>navigator).app.exitApp();
            }
            if (buttonIndex == 2) {
              // nein
              // do nothing
              // evtl. mal so etwas wie navigator.app.backHistory();
            }
          },
          "",
          ["ja", "nein"]
        );
      },
      false
    );

    document.addEventListener(
      "dataLoaded",
      function () {
        console.error("xxxx dataLoaded");
        if (kvm.featureListLoaded && kvm.layerDataLoaded) {
          sperrBildschirm.close("Event dataLoaded ausgelößt.");
        }
      },
      false
    );

    // rtr events from index.html
    // $("#showFormEdit").on("showMap", function () {
    //     kvm.showItem("map");
    // });

    // $(".h2-div").on("click", function (evt) {
    //   const h2 = $(evt.target);
    //   const h2div = h2.parent();
    //   const collapsed = h2.hasClass("b-collapsed");

    //   kvm.collapseAllSettingsDiv();
    //   if (collapsed) {
    //     h2.toggleClass("b-collapsed b-expanded");
    //     h2div.next().toggle();
    //     if (h2.prop("id") == "h2_update") {
    //       $("#settings").scrollTop(h2.offset().top);
    //     }
    //   }
    // });

    // $("#requestStellenButton").on("click", function () {
    //   navigator.notification.confirm(
    //     "Vor dem neu Laden der Stellen müssen alle Änderungen mit dem Server synchronisiert worden sein, sonst können Daten verloren gehen! Ich habe alle Layer synchronisiert. Jetzt andere Stelle auswählen?",
    //     function (buttonIndex) {
    //       if (buttonIndex == 1) {
    //         // ja
    //         if (navigator.onLine) {
    //           if (getValueOfElement("kvwmapServerUrlField") && getValueOfElement("kvwmapServerLoginNameField") && getValueOfElement("kvwmapServerPasswortField")) {
    //             sperrBildschirm.show("Frage Stellen ab");
    //             $("#activeStelleBezeichnungDiv").hide();
    //             const stelle = new Stelle({
    //               url: getValueOfElement("kvwmapServerUrlField"),
    //               login_name: getValueOfElement("kvwmapServerLoginNameField"),
    //               passwort: getValueOfElement("kvwmapServerPasswortField"),
    //             });
    //             console.log("Stellenobjekt erzeugt um Stellen abfragen zu können: " + JSON.stringify(stelle));
    //             //kvm.log("Stellenobjekt erzeugt um Stellen abfragen zu können: " + JSON.stringify(stelle), 4);
    //             stelle.reloadLayer;
    //             stelle.requestStellen();
    //           } else {
    //             kvm.msg("Sie müssen erst die Server URL, Nutzername und Password angeben!");
    //           }
    //         } else {
    //           kvm.msg("Kein Internet. Stellen Sie sicher, dass sie eine Netzverbindung haben!");
    //         }
    //       }
    //       if (buttonIndex == 2) {
    //         // nein
    //         kvm.msg("Ok, nichts passiert!", "Stellen abfragen");
    //       }
    //     },
    //     "Stellen abfragen",
    //     ["ja", "nein"]
    //   );
    // });

    // $("#kvwmapServerStelleSelectField").on("change", () => {
    //   if ($("#saveServerSettingsButton").hasClass("settings-button")) {
    //     $("#saveServerSettingsButton").toggleClass("settings-button settings-button-active");
    //   }
    //   $("#saveServerSettingsButton").show();
    // });

    $("#requestLayersButton").on("click", () => {
      console.error("requestLayersButton.clicked !!!!!!!!!!!!!!!!!");
      if (navigator.onLine) {
        sperrBildschirm.show("Lade Layerdaten.");
        kvm._activeStelle
          .requestLayers()
          .catch((reason) => {
            console.error(`Fehler beim Laden der Layerdaten`, reason);
          })
          .finally(() => {
            kvm._activeStelle.sortLayers("legendorder");
            kvm._activeStelle.getFirstLayer().activate();
            sperrBildschirm.close();
          });
      } else {
        NetworkStatus.noNetMsg("Netzverbindung");
      }
    });

    // $("#saveServerSettingsButton").on("click", () => {
    //   const stellen = getValueOfElement("kvwmapServerStellenField");
    //   const selectedStelleId = getValueOfElement("kvwmapServerStelleSelectField");
    //   const stelleSettings = JSON.parse(stellen).find((stelle) => {
    //     return stelle.ID == selectedStelleId;
    //   });
    //   stelleSettings["id"] = getValueOfElement("kvwmapServerIdField");
    //   stelleSettings["name"] = getValueOfElement("kvwmapServerNameField");
    //   stelleSettings["bezeichnung"] = $("#kvwmapServerStelleSelectField option:selected").text();
    //   stelleSettings["url"] = $("#kvwmapServerUrlField").val();
    //   stelleSettings["login_name"] = (<HTMLInputElement>document.getElementById("kvwmapServerLoginNameField")).value.trim();
    //   stelleSettings["passwort"] = $("#kvwmapServerPasswortField").val();
    //   stelleSettings["Stelle_ID"] = $("#kvwmapServerStelleSelectField").val();
    //   // stelleSettings['stellen'] = $("#kvwmapServerStellenField").val(); Das brauchen wir hier nicht, denn für die eine Stelle wurde alles hinterlegt.
    //   // wenn andere Stellen ausgewählt werden sollen müssen die vorher noch mal vom Server geholt werden.
    //   // if (kvm._activeLayer) {
    //   //   kvm._activeLayer["stelle"] = stelle;
    //   // }
    //   const stelle = new Stelle(stelleSettings);
    //   if (kvm._activeLayer) {
    //     kvm._activeLayer.deactivate();
    //   }
    //   stelle.saveToStore();
    //   stelle.activate();
    //   if ($("#saveServerSettingsButton").hasClass("settings-button-active")) {
    //     $("#saveServerSettingsButton").toggleClass("settings-button settings-button-active");
    //   }
    //   $("#kvwmapServerStelleSelectField, #saveServerSettingsButton").hide();
    //   $("#requestStellenButton").show();
    //   if (navigator.onLine) {
    //     kvm.showSettingsDiv("layer");
    //     $("#requestLayersButton").show();
    //   } else {
    //     kvm.msg("Stellen Sie eine Netzverbindung her zum Laden der Layer und speichern Sie noch mal die Servereinstellungen.");
    //   }
    // });

    $(".leaflet-control-layers-selector").on("change", (evt) => {
      console.log("leaflet-control-layers-selector change evt");
      console.log("layer changed");
      let target = $(evt.target);
      if (target.is(":checked")) {
        let bgdLayerId = $(target.next().children()[0]).attr("id").split("_")[1];
        kvm.config.activeBackgroundLayerId = bgdLayerId;
        kvm.store.setItem("activeBackgroundLayerId", bgdLayerId);
        console.log("BackgroundLayer %s is checked", $(target.next().children()[0]).html());
      }
    });

    $(".mapSetting").on("change", function () {
      kvm.mapSettings[(<HTMLInputElement>this).name] = (<HTMLInputElement>this).value;
      kvm.saveMapSettings(kvm.mapSettings);
    });

    // $("#mapSettings_maxZoom").on("change", function () {
    //   // TODO Bug
    //   // kvm.map.setMaxZoom((<HTMLInputElement>this).value);
    //   kvm.msg("maximale Zoomstufe auf " + (<HTMLInputElement>this).value + " begrenzt!", "Karteneinstellung");
    // });

    // $("#mapSettings_minZoom").on("change", function () {
    //   // TODO Bug
    //   // kvm.map.setMinZoom(this.value);
    //   kvm.msg("minimale Zoomstufe auf " + (<HTMLInputElement>this).value + " begrenzt!", "Karteneinstellung");
    // });

    // $("#mapSettings_west, #mapSettings_south, #mapSettings_east, #mapSettings_north").on(
    //   "change",
    //   // TODO Bug

    //   function () {
    //     // console.log("Bug setting MinMax");
    //     //   kvm.map.setMaxBounds(
    //     //     L.bounds(
    //     //       L.latLng(
    //     //         $('#mapSettings_south').val(),
    //     //         $('#mapSettings_west').val()
    //     //       ),
    //     //       L.latLngpoint(
    //     //         $('#mapSettings_north').val(),
    //     //         $('#mapSettings_east').val()
    //     //       )
    //     //     )
    //     //   );

    //     kvm.msg("max Boundingbox geändert!", "Karteneinstellung");
    //   }
    // );

    // $("#fingerprintAuth").on("change", function () {
    //   kvm.config.fingerprintAuth = $("#fingerprintAuth").is(":checked");
    //   console.log("Set fingerprintAuth to ", kvm.config.fingerprintAuth);
    //   kvm.store.setItem("fingerprintAuth", kvm.config.fingerprintAuth.toString());
    // });

    // $("#newAfterCreate").on("change", function () {
    //   kvm.config.newAfterCreate = $("#newAfterCreate").is(":checked");
    //   console.log("Set newAfterCreate to ", kvm.config.newAfterCreate);
    //   kvm.store.setItem("newAfterCreate", kvm.config.newAfterCreate.toString());
    // });

    // $("#viewAfterCreate").on("change", function () {
    //   kvm.config.viewAfterCreate = <string>$("#viewAfterCreate").val();
    //   console.log("Set viewAfterCreate to ", kvm.config.viewAfterCreate);
    //   kvm.store.setItem("viewAfterCreate", kvm.config.viewAfterCreate.toString());
    // });

    // $("#viewAfterUpdate").on("change", function () {
    //   kvm.config.viewAfterUpdate = <string>$("#viewAfterUpdate").val();
    //   console.log("Set viewAfterUpdate to ", kvm.config.viewAfterUpdate);
    //   kvm.store.setItem("viewAfterUpdate", kvm.config.viewAfterUpdate.toString());
    // });

    $("#logLevel").on("change", function () {
      kvm.config.logLevel = <string>$("#logLevel").val();
      kvm.store.setItem("logLevel", kvm.config.logLevel);
      kvm.msg("Protokollierungsstufe geändert!", "Protokollierung");
    });

    // $("#backgroundLayerOnline_url, #backgroundLayerOnline_type, #backgroundLayerOnline_layers").on("change", function () {
    //   kvm.msg("Speichern noch nicht implementiert");
    //   //kvm.map.setBackgroundLayerOnline();
    // });

    // $("#resetBackgroundLayerSettingsButton").on("click", function () {
    //   kvm.config.backgroundLayerSettings.forEach((l, i) => {
    //     $("#backgroundLayerURL_" + i).val(l.url);
    //     if (l.params.layers) {
    //       $("#backgroundLayerLayer_" + i).val(l.params.layers);
    //     }
    //   });
    //   kvm.saveBackgroundLayerSettings(kvm.config.backgroundLayerSettings);
    //   kvm.msg("Einstellung zu Hintergrundlayern aus config Datei erfolgreich wiederhergestellt.");
    // });

    // $("#changeBackgroundLayerSettingsButton").on("click", function () {
    //   kvm.backgroundLayerSettings.forEach((l, i) => {
    //     l.url = <string>$("#backgroundLayerURL_" + i).val();
    //     if (l.params.layers) {
    //       l.params.layers = <string>$("#backgroundLayerLayer_" + i).val();
    //     }
    //   });
    //   console.log("Neue BackgroundLayerSettings: ", kvm.backgroundLayerSettings);
    //   kvm.saveBackgroundLayerSettings(kvm.backgroundLayerSettings);
    //   kvm.msg("Einstellung zu Hintergrundlayern übernommen. Diese werden erst nach einem Neustart der Anwendung wirksam!");
    // });

    // $("#loadBackgroundLayerButton").on("click", function (evt) {
    //   navigator.notification.confirm(
    //     "Wollen Sie die Daten des Hintergrundlayers für den aktuellen Kartenausschnitt runterladen und lokal speichern?",
    //     function (buttonIndex) {
    //       if (buttonIndex == 1) {
    //         console.log("download backgroundlayer on event", evt.target);
    //         // ja
    //         //						kvm.backgroundLayers[i].downloadData();
    //       } else {
    //         console.log("Background layer nicht runterladen.");
    //       }
    //     },
    //     "Kacheln für Hintergrundlayer runterladen",
    //     ["ja", "nein"]
    //   );
    // });

    // $("#localBackupPath").on("change", function () {
    //   // TODO Bug??
    //   // kvm.store.setItem("localBackupPath", this.val());
    //   kvm.store.setItem("localBackupPath", $(this).val().toString());
    // });

    // $("#saveDatabaseButton").on("click", function () {
    //   navigator.notification.prompt(
    //     "Geben Sie einen Namen für die Sicherungsdatei an. Die Datenbank wird im Internen Speicher im Verzeichnis " + (kvm.store.getItem("localBackupPath") || kvm.config.localBackupPath) + ' mit der Dateiendung .db gespeichert. Ohne Eingabe wird der Name "Sicherung_" + aktuellem Zeitstempel + ".db" vergeben.',
    //     function (results) {
    //       if (results.buttonIndex === 1) {
    //         kvm.backupDatabase(results.input1, "Datenbank erfolgreich gesichert.");
    //       }
    //     },
    //     "Datenbanksicherung",
    //     ["OK", "Abbrechen"]
    //   );
    // });

    // $("#saveImagesButton").on("click", function () {
    //   let destDir = <string>$("#localBackupPath").val() || kvm.store.getItem("localBackupPath") || kvm.config.localBackupPath;

    //   navigator.notification.confirm(
    //     `Sollen die Bilddaten nach ${destDir} gesichert werden? Gleichnamige Dateien im Zielverzeichnis werden überschrieben!`,
    //     (buttonIndex) => {
    //       if (buttonIndex == 1) {
    //         FileUtils.copyFiles(kvm.config.localImgPath, destDir);
    //       }
    //       if (buttonIndex == 2) {
    //         // nein
    //       }
    //     },
    //     "Bilddaten sichern?",
    //     ["ja", "nein"]
    //   );
    // });

    // $("#showDeltasButton").on("click", async () => {
    //   //kvm.log("Delta anzeigen.", 3);
    //   if (kvm.activeLayer.hasEditPrivilege) {
    //     let sql = `
    //       SELECT
    //         *
    //       FROM
    //         ${kvm.activeLayer.get("schema_name")}_${kvm.activeLayer.get("table_name")}_deltas
    //     `;

    //     $("#showDeltasButton").hide();
    //     $("#showDeltasWaiting").show();
    //     const rs = await executeSQL(kvm.db, sql);
    //     try {
    //       const numRows = rs.rows.length;
    //       if (numRows > 0) {
    //         $("#showDeltasDiv").html("<b>Deltas</b>");
    //         for (let i = 0; i < numRows; i++) {
    //           const item = rs.rows.item(i);
    //           $("#showDeltasDiv").append("<br>" + item.version + ": " + (item.type == "sql" ? item.delta : item.change + " " + item.delta));
    //         }
    //         $("#showDeltasDiv").show();
    //         $("#hideDeltasButton").show();
    //       } else {
    //         kvm.msg("Keine Änderungen vorhanden");
    //         $("#showDeltasButton").show();
    //       }
    //       $("#showDeltasWaiting").hide();
    //     } catch (error) {
    //       const msg = `Fehler in bei Abfrage der Deltas mit sql: ${sql} Fehler: ${error.message} code: ${(<any>error).code}`;
    //       console.error(msg);
    //       kvm.log(msg, 1);
    //       kvm.msg(msg, "Datenbank");
    //     }
    //   } else {
    //     kvm.msg(`Der Layer ${kvm.activeLayer.title} hat keine Änderungen weil auf dem Server keine Rechte zum Ändern von Datensätzen des Layers eingestellt wurden.`, "Datenbank");
    //   }
    // });

    // $("#hideDeltasButton").on("click", function () {
    //   $("#hideDeltasButton").hide();
    //   $("#showDeltasDiv").hide();
    //   $("#showDeltasButton").show();
    // });

    $("#showLoggingsButton").on("click", function () {
      kvm.showItem("loggings");
    });

    // $("#zoomToCurrentLocation").on("click", function () {
    //   console.log("zoomToCurrentLocation");
    //   kvm.showItem("map");
    //   kvm.map.locate({ setView: true, maxZoom: 16 });
    // });

    $("#clearLoggingsButton").on("click", function () {
      $("#logText").html("Log geleert: " + new Date().toUTCString());
      kvm.showItem("loggings");
    });

    // $("#showSperrDivButton").on("click", function () {
    //   $("#sperr_div").show();
    // });

    /*
     * Bricht Änderungen im Formular ab,
     * - läd das Feature neu in das Formular im Anzeigemodus
     * - Löscht die editable Geometrie in der Karte
     * - setzt saveFeatureButton wieder auf inactiv
     */
    // $("#cancelFeatureButton").on("click", { context: this }, function (evt) {
    //   console.log("cancelFeatureButton geklickt.");
    //   const this_ = evt.data.context;
    //   //console.log("Änderungen verwerfen.");
    //   const activeLayer = this_.getActiveLayer();
    //   const activeFeature = activeLayer.activeFeature;
    //   const featureId = activeFeature.id;

    //   const changes = activeLayer.collectChanges(activeFeature.new ? "insert" : "update");
    //   if (changes.length > 0) {
    //     navigator.notification.confirm(
    //       "Änderungen verwerfen?",
    //       (buttonIndex) => {
    //         //console.log("Änderungen verwerfen.");
    //         if (buttonIndex == 1) {
    //           kvm.cancelEditFeature();
    //         }
    //         if (buttonIndex == 2) {
    //           // nein
    //           // Do nothing
    //         }
    //       },
    //       "Eingabeformular schließen",
    //       ["ja", "nein"]
    //     );
    //   } else {
    //     kvm.cancelEditFeature();
    //   }
    // });

    // $("#statusFilterSelect").on("change", function (evt) {
    //   kvm.store.setItem("statusFilter", $("#statusFilterSelect").val().toString());
    //   kvm.activeLayer.readData(getValueOfElement("limit"), getValueOfElement("offset"));
    // });

    // rtr
    // $("#toggleFilterDivButton").on("click", function () {
    //   $("#filterDiv").toggle();
    //   $("#toggleFilterDivButton").val($("#toggleFilterDivButton").val() == "mehr" ? "weniger" : "mehr");
    // });

    // $("#runFilterButton").on("click", function () {
    //   kvm.store.setItem("layerFilter", JSON.stringify(kvm.composeLayerFilter()));
    //   kvm.activeLayer.readData(getValueOfElement("limit"), getValueOfElement("offset"));
    // });

    // $("#anzeigeSortSelect").on("change", function (evt) {
    //   kvm.store.setItem("sortAttribute", $("#anzeigeSortSelect").val().toString());
    //   kvm.activeStelle.readAllLayers = false;
    //   kvm.activeLayer.readData(getValueOfElement("limit"), getValueOfElement("offset"));
    // });

    $("#deleteFeatureButton").on("click", function (evt) {
      //kvm.log("Klick auf deleteFeatureButton.", 4);
      if (kvm._activeLayer && kvm._activeLayer.hasDeletePrivilege) {
        navigator.notification.confirm(
          "Datensatz wirklich Löschen?",
          function (buttonIndex) {
            if (buttonIndex == 1) {
              let id_attribute = kvm._activeLayer.get("id_attribute");
              // ja
              console.log("Lösche Feature " + id_attribute + ": " + kvm._activeLayer.activeFeature.getDataValue(id_attribute));
              kvm.controller.mapper.clearWatch();
              kvm._activeLayer.runDeleteStrategy();

              // TODO Bug?
              /*
                            kvm.activeLayer.createImgDeltas(
                                $.map(kvm.activeLayer.getDokumentAttributeNames(), function (name) {
                                    return {
                                        key: name,
                                        value: "",
                                    };
                                })
                            );
                            */
            }

            if (buttonIndex == 2) {
              // nein
              // do nothing
            }
          },
          "Datenbank",
          ["ja", "nein"]
        );
      } else {
        navigator.notification.confirm("Sie haben nicht das Recht zum Löschen von Datensätzen in diesem Layer!", function (buttonIndex) {}, "Datenbank", ["habe Verstanden"]);
      }
    });

    $("#saveFeatureButton").on("click", async (evt) => {
      let validationErrMsg: string = "";

      const notNullErrMsg: string = kvm._activeLayer.notNullValid();
      if (notNullErrMsg) {
        validationErrMsg += notNullErrMsg;
      }
      // Versuche FK-Attribute die fehlen mit setValue() automatisch zu setzen
      // in setValue() wird der übergeordnete Datensatz über ST_Within() gesucht
      for (let attribute of this._activeLayer.attributes) {
        if (attribute.settings.form_element_type === "SubFormFK" && !attribute.formField.getValue()) {
          await attribute.formField.setValue("");
        }
      }

      const notFKValidErrMsg: string = kvm._activeLayer.notFKValid();
      if (notFKValidErrMsg) {
        validationErrMsg += `\n\n${notFKValidErrMsg}`;
      }

      const notGeomValid: string = kvm._activeLayer.notGeomValid();
      if (notGeomValid) {
        validationErrMsg += `\n\nSie haben noch keine Koordinaten erfasst!`;
      }

      if (validationErrMsg) {
        kvm.msg(validationErrMsg, "Formular");
        return false;
      }

      let action = kvm._activeLayer.activeFeature.new ? "insert" : "update";
      if (kvm.config.confirmSave) {
        navigator.notification.confirm(
          "Datensatz Speichern?",
          (buttonIndex) => {
            console.log("Datensatz Speichern buttonIndex: ", buttonIndex);
            const activeFeature = kvm._activeLayer.activeFeature;
            const editableLayer = kvm._activeLayer.activeFeature.editableLayer;
            if (buttonIndex != 2) {
              if (activeFeature.layer.settings.geometry_type == "Line") {
                let speichern = true;
                if (activeFeature.layerId) {
                  speichern = (<any>kvm.map)._layers[activeFeature.layerId].getLatLngs() != editableLayer.getLatLngs();
                }
                if (speichern) {
                  editableLayer.fireEvent("isChanged", editableLayer.getLatLngs());
                }
              }
              if (action == "insert") {
                kvm._activeLayer.runInsertStrategy();
              } else {
                kvm._activeLayer.runUpdateStrategy();
              }
            }
          },
          kvm._activeLayer.title,
          ["Speichern", "Abbruch"]
        );
      } else {
        if (action == "insert") {
          kvm._activeLayer.runInsertStrategy();
        } else {
          kvm._activeLayer.runUpdateStrategy();
        }
      }
    });

    // $("#kvwmapServerDataForm > input").on("keyup", function () {
    //   if ($("#saveServerSettingsButton").hasClass("settings-button")) {
    //     $("#saveServerSettingsButton").toggleClass("settings-button settings-button-active");
    //   }
    // });

    // $("#showFeatureList").mouseover(function () {
    //   $("#showFeatureList_button").hide();
    //   $("#showFeatureList_button_white").show();
    // });

    // $("#showFeatureList").mouseleave(function () {
    //   $("#showFeatureList_button").show();
    //   $("#showFeatureList_button_white").hide();
    // });

    // $("#newFeatureButton").on("click", function () {
    //   const layer = kvm._activeLayer;
    //   layer.newFeature();
    //   // console.log('activeFeature after newFeature: %o', kvm.activeLayer.activeFeature);
    //   layer.editFeature(layer.activeFeature.id);
    //   //kvm.showGeomStatus();
    // });

    // $("#tplFeatureButton").on("click", function () {
    //   const layer = kvm._activeLayer;
    //   const tplId = layer.activeFeature.id;
    //   layer.newFeature();
    //   layer.editFeature(tplId);
    //   layer.loadTplFeatureToForm(tplId);
    //   //kvm.showGeomStatus();
    // });

    /*
     * Läd das Formular im Editiermodus
     */

    $("#restoreFeatureButton").on("click", () => {
      navigator.notification.confirm(
        "Wollen Sie den Datensatz wiederherstellen? Ein vorhandener mit der gleichen uuid wird dabei überschrieben!",
        (buttonIndex) => {
          if (buttonIndex == 1) {
            // ja
            sperrBildschirm.setContent("Wiederherstellung von Datensätzen ist noch nicht implementiert!");
            kvm._activeLayer.runRestoreStrategy();
            sperrBildschirm.show();
            setTimeout(function () {
              sperrBildschirm.close();
            }, 3000);
          } else {
            sperrBildschirm.close();
          }
        },
        "Datensatz wiederherstellen",
        ["ja", "nein"]
      );
    });

    /* Clientside Filter according to http://stackoverflow.com/questions/12433835/client-side-searching-of-a-table-with-jquery */
    /*** Search Feature ***/

    $("#geoLocationButton").on("click", kvm.getGeoLocation);

    // $("#cameraOptionsQualitySlider").on("input", function () {
    //   $("#cameraOptionsQuality").html((<any>this).value);
    // });

    // $("#minTrackDistanceSlider").on("input", function () {
    //   $("#minTrackDistance").html((<any>this).value);
    // });

    $("#resetSettingsButton").on("click", function () {
      navigator.notification.confirm(
        "Alle lokalen Daten, Änderungen und Einstellungen wirklich Löschen?",
        function (buttonIndex) {
          if (buttonIndex == 1) {
            kvm.deleteDatabase(kvm.db);
            kvm.db = window.sqlitePlugin.openDatabase(
              {
                name: kvm.config.dbname + ".db",
                location: "default",
                androidDatabaseImplementation: 2,
              },
              (db) => {
                kvm.msg(`Neue leere Datenbank anglegt!`);
              },
              (error) => {
                kvm.msg(`Fehler beim anlegen der neuen leeren Datenbank: ${error}`);
              }
            );

            if (kvm._layers.size === 0) {
              kvm.msg("Keine Layer zum löschen vorhanden.");
            } else {
              kvm._layers.forEach((layer) => {
                console.log("Entferne Layer: %s", layer.get("title"));
                // TODO
                // layer.removeFromApp();
              });
            }
            kvm._layers = new Map();
            $("#layer_list").html("");
            kvm.setActiveLayer(null);
            kvm.setActiveStelle(null);
            window.localStorage.clear();
            kvm.store = window.localStorage;
            // kvm.initLocalBackupPath();
            // kvm.initStatusFilter();
            //  TODO
            // kvm.initColorSelector();
            kvm.msg("Fertig!\nStarten Sie die Anwendung neu und fragen Sie die Stelle und Layer unter Einstellungen neu ab.", "Reset Datenbank und Einstellungen");
          }
          if (buttonIndex == 2) {
            // nein
            kvm.msg("Ok, nichts passiert!", "Reset Datenbank und Einstellungen");
          }
        },
        "Reset Datenbank und Einstellungen",
        ["ja", "nein"]
      );
    });

    // if (document.getElementById("downloadBackgroundLayerButton")) {
    //   document.getElementById("downloadBackgroundLayerButton").addEventListener("click", (evt) => {
    //     const offlineLayerId = (<HTMLElement>evt.currentTarget).getAttribute("value");
    //     navigator.notification.confirm(
    //       "Alle Vektorkacheln vom Projektgebiet herunterladen? Vergewissern Sie sich, dass Sie in einem Netz mit guter Anbindung sind.",
    //       function (buttonIndex) {
    //         if (buttonIndex === 1) {
    //           if (navigator.onLine) {
    //             // ja
    //             //kvm.msg("Ich beginne mit dem Download der Kacheln.", "Kartenverwaltung");
    //             // document.getElementById("sperr_div").style.display = "block";
    //             sperrBildschirm.setContent('<b>Kartenverwaltung</b><br><br>Download der Kacheln:<br><br><div id="sperr_div_progress_div"></div>');
    //             let sperrDivProgressDiv = document.getElementById("sperr_div_progress_div");
    //             // hide the button and show a progress div
    //             // find p1, p2 and zoom levels to fetch data in layer configuration
    //             // get urls for vector tiles to download
    //             // download the files in background and update the progress div
    //             // confirm the finish
    //             // hide the progress div and show the delete and update button
    //             const bl = kvm.backgroundLayerSettings.filter(function (l) {
    //               return l.layer_id == offlineLayerId;
    //             })[0];
    //             const params = bl.params;
    //             let key = "";

    //             //console.log('Fetch vector tiles for p1: %s,%s p2: %s,%s', params.south, params.west, params.north, params.east);
    //             const tileLinks = [];

    //             for (let z = params.minZoom; z <= params.maxNativeZoom; z++) {
    //               //console.log('Zoom level: %s', z);
    //               kvm.getTilesUrls(new LatLng(params.south, params.west), new LatLng(params.north, params.east), z, bl.url).forEach((url) => tileLinks.push(url));
    //             }
    //             let i = 0;
    //             const iSoll = tileLinks.length;
    //             console.log("Anzahl der herunter zu ladenden Kacheln:" + iSoll);

    //             function download() {
    //               if (tileLinks.length > 0) {
    //                 const url = tileLinks.pop();
    //                 const key = kvm.getTileKey(url);
    //                 fetch(url)
    //                   .then((t) => {
    //                     // console.info("result ", t);
    //                     t.arrayBuffer()
    //                       .then((arr) => {
    //                         kvm.saveTile(key, arr.slice(0));
    //                         i++;
    //                         sperrDivProgressDiv.innerHTML = `<span class="highlighted">${i} von ${iSoll} runtergeladen</span>`;
    //                         download();
    //                       })
    //                       .catch((reason) => {
    //                         console.info("Fehler by arraybuffer", reason);
    //                         download();
    //                       });
    //                   })
    //                   .catch((reason) => {
    //                     console.info("Fehler by fetch", reason);
    //                     download();
    //                   });
    //               } else {
    //                 console.info("downloaded " + i + " von " + iSoll);
    //                 sperrBildschirm.close();
    //                 kvm.msg("Download abgeschlossen!", "Kartenverwaltung");
    //               }
    //             }
    //             download();
    //           } else {
    //             kvm.msg("Kein Internet! Stellen Sie eine Internetverbindung her.", "Kartenverwaltung");
    //           }
    //         }
    //         if (buttonIndex == 2) {
    //           // nein
    //           kvm.msg("OK, Abbruch.", "Kartenverwaltung");
    //         }
    //       },
    //       "Kartenverwaltung",
    //       ["ja", "nein"]
    //     );
    //   });
    // }

    if (document.getElementById("downloadBackgroundLayerButton")) {
      document.getElementById("downloadBackgroundLayerButton").addEventListener("click", (evt) => {
        const offlineLayerId = (<HTMLElement>evt.currentTarget).getAttribute("value");
        navigator.notification.confirm(
          "Alle Vektorkacheln vom Projektgebiet herunterladen? Vergewissern Sie sich, dass Sie in einem Netz mit guter Anbindung sind.",
          function (buttonIndex) {
            if (buttonIndex === 1) {
              if (navigator.onLine) {
                // ja
                //kvm.msg("Ich beginne mit dem Download der Kacheln.", "Kartenverwaltung");
                document.getElementById("sperr_div").style.display = "block";
                let sperrDivContent = document.getElementById("sperr_div_content");
                sperrDivContent.innerHTML = '<b>Kartenverwaltung</b><br><br>Download der Kacheln:<br><br><div id="sperr_div_progress_div"></div>';
                let sperrDivProgressDiv = document.getElementById("sperr_div_progress_div");
                // hide the button and show a progress div
                // find p1, p2 and zoom levels to fetch data in layer configuration
                // get urls for vector tiles to download
                // download the files in background and update the progress div
                // confirm the finish
                // hide the progress div and show the delete and update button
                const bl = kvm.backgroundLayerSettings.filter(function (l) {
                  return String(l.layer_id) == offlineLayerId;
                })[0];
                const params = bl.params;
                let key = "";

                //console.log('Fetch vector tiles for p1: %s,%s p2: %s,%s', params.south, params.west, params.north, params.east);
                const tileLinks = [];

                for (let z = params.minZoom; z <= params.maxNativeZoom; z++) {
                  //console.log('Zoom level: %s', z);
                  kvm.getTilesUrls(new LatLng(params.south, params.west), new LatLng(params.north, params.east), z, bl.url).forEach((url) => tileLinks.push(url));
                }
                let i = 0;
                const iSoll = tileLinks.length;
                console.log("Anzahl der herunter zu ladenden Kacheln:" + iSoll);

                function download() {
                  if (tileLinks.length > 0) {
                    const url = tileLinks.pop();
                    const key = kvm.getTileKey(url);
                    fetch(url)
                      .then((t) => {
                        // console.info("result ", t);
                        t.arrayBuffer()
                          .then((arr) => {
                            kvm.saveTile(key, arr.slice(0));
                            i++;
                            sperrDivProgressDiv.innerHTML = `<span class="highlighted">${i} von ${iSoll} runtergeladen</span>`;
                            download();
                          })
                          .catch((reason) => {
                            console.info("Fehler by arraybuffer", reason);
                            download();
                          });
                      })
                      .catch((reason) => {
                        console.info("Fehler by fetch", reason);
                        download();
                      });
                  } else {
                    console.info("downloaded " + i + " von " + iSoll);
                    document.getElementById("sperr_div_content").innerHTML = "";
                    document.getElementById("sperr_div").style.display = "none";
                    kvm.msg("Download abgeschlossen!", "Kartenverwaltung");
                  }
                }
                download();
              } else {
                kvm.msg("Kein Internet! Stellen Sie eine Internetverbindung her.", "Kartenverwaltung");
              }
            }
            if (buttonIndex == 2) {
              // nein
              kvm.msg("OK, Abbruch.", "Kartenverwaltung");
            }
          },
          "Kartenverwaltung",
          ["ja", "nein"]
        );
      });
    }

    document.getElementById("syncLayerButton").addEventListener("click", (evt) => this.bttnSyncLayersClicked(evt));

    // $("#featurelistHeading").on("click", (evt) => {
    //   if (kvm._activeLayer.hasActiveFeature()) {
    //     kvm.map.closePopup();
    //   }
    // });
  }

  // bindFeatureItemClickEvents() {
  //   //kvm.log("bindFeatureItemClickEvents", 4);
  //   $(".feature-item").on("click", kvm.featureItemClickEventFunction);
  // }

  // changeFontSize(evt) {
  //   let sizePixel: number;
  //   let sizeProzent: number;
  //   const sizeDefault = parseFloat(kvm.config.fontSize);
  //   if (evt.target.id.toLowerCase().includes("default")) {
  //     sizePixel = sizeDefault;
  //     sizeProzent = 100;
  //     document.getElementById("fontSizeDefaultButton").style.display = "none";
  //   } else {
  //     const step5Prozent: number = (Math.round((sizeDefault / 100) * 5 * 10) / 10) * (evt.target.id.toLowerCase().includes("up") ? 1 : -1);
  //     sizePixel = parseFloat(document.body.style.fontSize) + step5Prozent;
  //     sizeProzent = Math.round((sizePixel / sizeDefault) * 100);
  //     if (sizeProzent < 30) {
  //       kvm.msg("Kleiner geht nicht!", "Einstellung Textgröße");
  //       return;
  //     }
  //     if (sizeProzent > 150) {
  //       kvm.msg("Größer geht nicht!", "Einstellung Textgröße");
  //       return;
  //     }
  //   }
  //   const fontSize: string = `${sizePixel}px`;
  //   document.body.style.fontSize = fontSize;
  //   document.getElementById("fontSizeProzent").innerHTML = `${sizeProzent} %`;
  //   document.getElementById("fontSizeDefaultButton").style.display = sizeProzent == 100 ? "none" : "inline";
  //   kvm.store.setItem("fontSize", fontSize);
  // }

  featureItemClickEventFunction(evt: MouseEvent) {
    console.error("zzz featureItemClickEventFunction");
    const id = (<HTMLElement>evt.currentTarget).dataset.id;
    console.log("featureItemClickEvent on feature id: %o", id);
    const feature = kvm._activeLayer.getFeature(id);
    kvm.showItem(kvm._activeLayer.hasGeometry && feature.getDataValue(kvm._activeLayer.get("geometry_attribute")) != "null" ? "map" : "dataView");
    kvm._activeLayer.activateFeature(feature, true);
  }

  backupDatabase(filename = "", msg = "") {
    console.log("Sichere Datenbank");
    let srcDir = cordova.file.applicationStorageDirectory + "databases/";
    let srcFile = "kvmobile.db";
    let dstDir = kvm.store.getItem("localBackupPath") || kvm.config.localBackupPath;
    let dstFile = filename || `Sicherung_${kvm.now("_", "", "-")}.db`;
    msg += msg !== "" ? ` Gespeichert in Datei: ${dstDir} ${dstFile}` : "";
    FileUtils.copyFile(srcDir, srcFile, dstDir, dstFile, msg);
  }

  deleteDatabase(db) {
    window.sqlitePlugin.deleteDatabase(
      {
        name: kvm.config.dbname + ".db",
        location: "default",
      },
      () => {
        $("#dbnameText").html("gelöscht");
        kvm.msg(`Datenbank: gelöscht!`);
      },
      (error) => {
        kvm.msg("Fehler beim Löschen der Datenbank: " + JSON.stringify(error), "Fehler");
      }
    );
  }

  /**
   * Beendet die Editierung des Features
   * Wenn das Feature eine Geometrie hat beende die Editierung der Geometrie
   * Wenn das Feature neu angelegt werden sollte und ein parent feature hat springe dort hin
   * Wenn die Editierung in der Karte abgebrochen wird wechsel zur Karte, sonst zur Feature Liste
   */
  cancelEditFeature() {
    const activeLayer = kvm._activeLayer;
    const activeFeature = activeLayer.activeFeature;

    if (activeLayer.hasGeometry) {
      //console.log("Feature ist neu? %s", activeFeature.new);
      if (activeFeature.new) {
        //console.log("Änderungen am neuen Feature verwerfen.");
        activeLayer.cancelEditGeometry();
        if (kvm.controller.mapper.isMapVisible()) {
          kvm.showItem("map");
        } else {
          kvm.showItem("featurelist");
        }
      } else {
        //console.log("Änderungen am vorhandenen Feature verwerfen.");
        activeLayer.cancelEditGeometry(activeFeature.id); // Editierung der Geometrie abbrechen
        activeLayer.loadFeatureToForm(activeFeature, { editable: false }); // Formular mit ursprünglichen Daten laden

        if (kvm.controller.mapper.isMapVisible()) {
          // ToDo editableLayer existier im Moment nur, wenn man den Änderungsmodus im Popup in der Karte ausgelößt hat.
          // auch noch für neue Features einbauen.
          kvm.showItem("map");
        } else {
          kvm.showItem("dataView");
        }
      }
    } else {
      // Wenn aktuelles Feature neu ist und zu einem übergeordneten Feature gehört dieses laden und darstellen.
      if (activeFeature.new) {
        let parentFeature = activeFeature.findParentFeature();
        if (parentFeature) {
          const parentLayer = kvm.getLayer(parentFeature.globalLayerId);
          parentLayer.activateFeature(parentFeature, true);
        }
      }
      kvm.showItem("dataView");
    }
    kvm.controller.mapper.clearWatch(); // GPS-Tracking ausschalten
  }

  /**
   * Function activate the feature with featureId in layer with layerId and show it in dataView.
   * @param layerId
   * @param featureId
   */
  activateFeature(layerId: string, featureId: string) {
    console.error(`kvm.activateFeature ${layerId} ${featureId}`);
    const layer = kvm.getLayer(layerId);
    const feature = layer.getFeature(featureId);
    if (feature) {
      layer.activateFeature(feature, false);
      kvm.showItem("dataView");
    } else {
      kvm.msg(`Objekt mit der ID: ${featureId} im Layer ${layer.title} nicht gefunden. Das Objekt ist möglicherweise durch einen Filter ausgeschaltet.`, "Sachdatenanzeige");
    }
  }

  /**
   * Function open form to create a new feature for a subLayer.
   * If activeFeature has open changes a confirm dialog comes up.
   * Input form only open if user confirm else nothing happens.
   */
  newSubFeature(options = { parentLayerId: "", subLayerId: "", fkAttribute: "" }) {
    if (this._activeLayer && this._activeLayer.activeFeature) {
      const changes = this._activeLayer.collectChanges("update");
      if (changes.length > 0) {
        navigator.notification.confirm(
          "Es sind noch offene Änderungen. Diese müssen erst gespeichert werden.",
          (buttonIndex) => {
            if (buttonIndex == 1) {
              // Abbrechen
            }
            if (buttonIndex == 2) {
              // Fortfahren ohne Speichern
              this._activeLayer.newSubDataSet(options);
            }
          },
          "Formular",
          ["Abbrechen", "Ohne Speichern Fortfahren"]
        );
      } else {
        this._activeLayer.newSubDataSet(options);
      }
    } else {
      this._activeLayer.newSubDataSet(options);
    }
  }

  /**
   * Function open form to edit feature with featureId in layer with layerId.
   * If activeFeature has open changes a confirm dialog comes up.
   * Edit form only open if user confirm else nothing happens.
   * @param layerId
   * @param featureId
   */
  editFeature(layerId, featureId) {
    // console.log('editFeature');
    const layer = kvm.getLayer(layerId);
    const feature = layer.getFeature(featureId);
    // ToDo:
    //parentLayerId und parentFeatureId müssen woanders hier kommen
    // denn editFeature kann ja auch von einem subform kommen in dem
    // der parent aufgerufen wird. Das hier geht nur wenn man von einem
    // parent ein child feature aufruft zum editieren.
    // z.B. mit feature.findParentFeature
    // Anpassungen erforderlich für die Abfrage der default Attribute
    // Am besten man fragt die Pseudoattribute gleich über sql mit ab.
    // dann gilt halt die Konvention dass nur Tables in der Query verwendet werden dürfen,
    // für die es auch layer in der Stelle gibt, um sicher zu gehen dass die Tabellen auch da sind.
    // Wenn man die Query nimmt kann man auch Joins machen und die in notsaveable-Attributes anzeigen.
    // Wie in kvwmap halt.
    if (kvm._activeLayer && kvm._activeLayer.activeFeature) {
      layer.parentLayerId = kvm._activeLayer.getGlobalId();
      layer.parentFeatureId = kvm._activeLayer.activeFeature.id;
      const changes = kvm._activeLayer.collectChanges(kvm._activeLayer.activeFeature.new ? "insert" : "update");
      if (changes.length > 0) {
        navigator.notification.confirm(
          "Es sind noch offene Änderungen. Diese müssen erst gespeichert werden.",
          (buttonIndex) => {
            if (buttonIndex == 1) {
              // Abbrechen
            }
            if (buttonIndex == 2) {
              // Fortfahren ohne Speichern
              layer.editFeature(featureId);
            }
          },
          "Formular",
          ["Abbrechen", "Ohne Speichern Fortfahren"]
        );
      } else {
        layer.editFeature(featureId);
      }
    } else {
      layer.editFeature(featureId);
    }
  }

  // setConnectionStatus() {
  //   //kvm.log("setConnectionStatus");
  //   NetworkStatus.load();
  // }

  // setGpsStatus() {
  //   //kvm.log("setGpsStatus");
  //   GpsStatus.load();
  // }

  loadLogLevel() {
    //kvm.log("Lade LogLevel", 4);
    let logLevel = kvm.store.getItem("logLevel");
    if (logLevel == null) {
      logLevel = kvm.config.logLevel;
      kvm.store.setItem("logLevel", logLevel);
    }
    $("#logLevel").val(logLevel);
  }

  async openLogFile() {
    console.info("openLogFile " + kvm.getConfigurationOption("localBackupPath"));
    console.info("openLogFile " + cordova.file.applicationStorageDirectory);

    window.resolveLocalFileSystemURL(kvm.getConfigurationOption("localBackupPath"), (dirEntry) => {
      // window.resolveLocalFileSystemURL(cordova.file.externalCacheDirectory, (dirEntry) => {
      // console.log(dirEntry);
      (<DirectoryEntry>dirEntry).getFile("kvmobile_logfile.txt", { create: true, exclusive: false }, (fileEntry) => {
        kvm.logFileEntry = fileEntry;
        console.info(dirEntry);
        console.info(fileEntry);
        kvm
          .writeLog("Logfile initialisert")
          .then(() => console.info(`LogFile ${fileEntry.nativeURL} initialisiert`, fileEntry))
          .catch(() => console.info(`LogFile ${fileEntry.nativeURL} konnte nicht initialisiert (geschrieben) werden`, fileEntry));
      });
    });
  }

  /**
   * Function load the given layer parameter to the settings field for layerparamer
   * Set the currently selected or default value and set it also in kvm.layerParams
   * @param layerParamSettings
   * @param layerParams
   */
  // loadLayerParams(layerParamSettings, layerParams = []) {
  //   let layerParamsDiv = $("#h2_layerparams").parent();
  //   if (layerParamSettings && Object.keys(layerParamSettings).length > 0) {
  //     let layerParamsList = $("#layer_prams_list");
  //     layerParamsList.html("");
  //     Object.keys(layerParamSettings).forEach((key) => {
  //       let paramSetting = layerParamSettings[key];
  //       let savedValue = key in layerParams ? layerParams[key] : null; // übernehme gespeicherten Wert wenn er existiert
  //       kvm.layerParams[key] = savedValue || paramSetting.default_value; // setze gespeicherten oder wenn leer dann den default Wert.

  //       let labelElement = $(`<div class="form-label><label for="${key}">${paramSetting.alias}</label></div>`);
  //       let valueElement = $(`
  //         <div class="form-value">
  //           <select id="${key}" name="${key}" onchange="kvm.saveLayerParams(this)">
  //             ${paramSetting.options
  //               .map((option) => {
  //                 return `<option value="${option.value}"${kvm.layerParams[key] == option.value ? " selected" : ""}>${option.output}</option>`;
  //               })
  //               .join("")}
  //           </select>
  //         </div>
  //       `);
  //       layerParamsList.append(labelElement).append(valueElement);
  //     });
  //     layerParamsDiv.show();
  //   } else {
  //     layerParamsDiv.hide();
  //   }
  // }

  // setLayerParam(key: string, value: string) {
  //   console.error(`setLayerParams ${key}=$${value}`);
  //   this.layerParams[key] = value;
  //   this.store.setItem(`layerParams_${kvm._activeStelle.get("ID")}`, JSON.stringify(this.layerParams));
  //   kvm._layers.forEach((layer) => {
  //     layer.readData();
  //   });
  // }

  // saveLayerParams(paramElement) {
  //   // console.log("saveLayerParams");
  //   // Set changed param to kvm Object
  //   kvm.layerParams[paramElement.name] = $(paramElement).val();
  //   // Save all params in store
  //   const selectFields = $("#layer_prams_list select");
  //   const layerParams = {};
  //   selectFields.each((index, selectField: any) => {
  //     layerParams[selectField.name] = $(selectField).val();
  //   });
  //   kvm.store.setItem(`layerParams_${kvm._activeStelle.get("ID")}`, JSON.stringify(layerParams));
  //   const limit = getValueOfElement("limit");
  //   const offset = getValueOfElement("offset");
  //   kvm._layers.forEach((layer) => {
  //     try {
  //       layer.readData(limit, offset);
  //     } catch (ex) {
  //       console.error(`Fehler reading layer ${layer?.title}`);
  //     }
  //   });
  //   // kvm._activeLayer.readData($("#limit").val(), $("#offset").val());
  // }

  // showActiveItem() {
  //   return this.showItem(["settings", "map", "featurelist"].includes(kvm.store.getItem("activeView")) ? kvm.store.getItem("activeView") : "featurelist");
  // }

  showNextItem(viewAfter: string, layer: Layer): void {
    // console.log(`showNextItem ${viewAfter}`);
    switch (viewAfter) {
      case "featurelist":
        {
          this.showItem("featurelist");
        }
        break;
      case "map":
        {
          this.showItem("map");
        }
        break;
      case "dataView":
        {
          this.showItem("dataView");
        }
        break;
      case "formular":
        {
          layer.editFeature(layer.activeFeature.id);
        }
        break;
      case "last":
        {
          this.showItem(this.lastMapOrListView); // map or featurelist
        }
        break;
      default: {
        this.showItem($("#formular").is(":visible") ? "dataView" : "map");
      }
    }
  }

  showItem(item: string): void {
    console.error(`showItem(${item})`);
    this.menu.activate(item);
    kvm.store.setItem("activeView", item);
  }

  // collapseAllSettingsDiv() {
  //   $(".h2-div > h2").removeClass("b-expanded").addClass("b-collapsed");
  //   $(".h2-div + div").hide();
  // }

  // expandAllSettingsDiv() {
  //   $(".h2-div > h2").removeClass("b-collapsed").addClass("b-expanded");
  //   $(".h2-div + div").show();
  // }

  // hideSettingsDiv(name) {
  //   const target = $(".h2_" + name);
  //   this.collapseAllSettingsDiv();
  //   target.removeClass("b-expanded").addClass("b-collapsed");
  //   target.parent().next().hide();
  // }

  // showSettingsDiv(name: string) {
  //   const target = $("#h2_" + name);
  //   // this.collapseAllSettingsDiv();
  //   target.removeClass("b-collapsed").addClass("b-expanded");
  //   target.parent().next().show();
  //   $("#settings").scrollTop(target.offset().top);
  //   if (name == "layer") {
  //     $("#switchable_settings_div").hide();
  //     $("#toggle_weniger").hide();
  //     $("#toggle_mehr").show();
  //     $(".layer-functions-button").removeClass("fa-ellipsis-vertical, fa-square-xmark");
  //     $(".layer-functions-button").addClass("fa-ellipsis-vertical");
  //     $(".layer-functions-div").hide();
  //   }
  // }

  getGeoLocation() {
    navigator.geolocation.getCurrentPosition(kvm.getGeoLocationOnSuccess, kvm.getGeoLocationOnError);
  }

  getGeoLocationOnSuccess(geoLocation) {
    $("#geoLocation").val(geoLocation.coords.latitude + " " + geoLocation.coords.longitude);
  }

  getGeoLocationOnError(error) {
    alert("Fehler: " + error.code + " " + error.message);
  }

  paginate(evt) {
    const limit = 25,
      target = $(evt),
      page = parseInt(target.attr("page")),
      prevPage = page - limit;
    const nextPage = page + limit;

    kvm._activeLayer.readData(limit, page);

    if (target.attr("class") == "page_next_link") {
      $(".page_first_link").show();
      $(".page_prev_link").show();
    }

    if (page < limit) {
      $(".page_first_link").hide();
      $(".page_prev_link").hide();
    }

    $(".page_prev_link").attr("page", prevPage);
    $(".page_next_link").attr("page", nextPage);
  }

  // TODO
  replacePassword(s: any) {
    if (kvm._activeStelle) {
      return s.replace(kvm._activeStelle.settings.passwort, "secretPwFromStelleSetting");
    } else {
      if ($("#kvwmapServerPasswortField").val()) {
        return s.replace($("#kvwmapServerPasswortField").val(), "secretPwFromForm");
      } else {
        return s;
      }
    }
  }

  // replaceParamsOrg(str: string) {
  //   if (typeof str !== "undefined") {
  //     let replacedString = str;
  //     let regExp: RegExp;
  //     Object.keys(kvm.layerParams).forEach((layerParam) => {
  //       // console.log(`Check if layerParam $${layerParam} is in Text: "${str}"`);
  //       if (str.includes(`$${layerParam}`)) {
  //         regExp = new RegExp(`\\$${layerParam}`, "g");
  //         str = str.replace(regExp, $(`#${layerParam}`).val().toString());
  //         // console.log(`LayerParameter $${layerParam} in Text ersetzt: "${str}"`);
  //       }
  //     });
  //     // console.log(`Check if $USER_ID is in Text: "${str}"`);
  //     if (str.includes("$USER_ID")) {
  //       regExp = new RegExp(`\\$USER_ID`, "g");
  //       str = str.replace(regExp, kvm.userId);
  //       // console.log(`$USER_ID in Text ersetzt mit ${kvm.userId}: "${str}"`);
  //     }
  //   }
  //   return str;
  // }

  uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0,
        v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // activateFirstLayer() {
  //   let firstLayerListDiv = document.getElementById("layer_list").firstChild;
  //   kvm._layers.get($("#layer_list").children[0].val()).activate();
  // }

  log(msg: any, level = 3, show_in_sperr_div: boolean = false, append: boolean = false) {
    if (level <= (typeof kvm.store == "undefined" ? kvm.config.logLevel : kvm.store.getItem("logLevel")) && (typeof msg === "string" || msg instanceof String)) {
      msg = this.replacePassword(msg);
      if (kvm.config.debug) {
        console.log("Log msg: " + msg);
      }
      setTimeout(function () {
        $("#logText").append(`<br>${kvm.now(" ", "", ":")}: ${msg}`);
        if (show_in_sperr_div) {
          sperrBildschirm.show();
          sperrBildschirm.setContent(msg, append);
        }
      });
    }
  }

  /**
   *
   */
  alog(msg, arg: any = "", level = 3, show_in_sperr_div = false) {
    //    console.log("alog: ", msg);
    if (level <= kvm.config.logLevel) {
      msg = this.replacePassword(msg);
      if (kvm.config.debug) {
        const e = new Error();
        if (!e.stack)
          try {
            // IE requires the Error to actually be thrown or else the
            // Error's 'stack' property is undefined.
            throw e;
          } catch (e) {
            if (!e.stack) {
              //return 0; // IE < 10, likely
            }
          }
        // var stack = e.stack.toString().split(/\r\n|\n/);
        if (msg === "") {
          msg = '""';
        }
        if (arg != "") {
          console.log("Log msg: " + msg, arg);
        } else {
          console.log("Log msg: " + msg);
        }
      }
      setTimeout(function () {
        $("#logText").append("<br>" + msg);
        if (show_in_sperr_div) {
          sperrBildschirm.setContent(msg);
        }
      });
    }
  }

  nextval(schema_name, table_name, column_name) {
    const sql = `
      SELECT
        max(${column_name}) + 1 AS next_val
      FROM
        ${schema_name}_${table_name}
    `;
    return sql;
  }

  gdi_conditional_next_val(schema_name, table_name, column_name, condition) {
    const sql = `
      SELECT
        max(${column_name}) + 1 AS next_val
      FROM
        ${schema_name}_${table_name}
      WHERE
        ${condition}
    `;
    return sql;
  }

  gdi_conditional_val(schema_name, table_name, column_name, condition) {
    const sql = `
      SELECT
        ${column_name} AS val
      FROM
        ${schema_name}_${table_name}
      WHERE
        ${condition}
    `;
    return sql;
  }

  msg(msg, title = "") {
    if (msg) {
      navigator.notification.confirm(msg, function (buttonIndex) {}, title, ["ok"]);
    }
  }

  mapHint(msg, delay = 3000, duration = 1000) {
    $("#map_hint_div").html(msg).show().delay(delay).fadeOut(duration);
  }

  // deb(msg) {
  //   $("#debText").append("<p>" + msg);
  //   //$(document).scrollBottom($('#debText').offset().bottom);
  //   if ($("#show_allways_debug_messages").is(":checked")) {
  //     $("#debugs").show();
  //   }
  // }

  coalesce(...t: any[]) {
    for (let i = 0; i < arguments.length; i++) {
      const arg = arguments[i];
      if (arg !== "null" && arg !== null && arg !== undefined && (typeof arg !== "number" || arg.toString() !== "NaN")) {
        return arg;
      }
    }
    return null;
  }

  coalempty(...t: any[]) {
    for (let i = 0; i < arguments.length; i++) {
      const arg = arguments[i];
      if (arg !== "" && arg !== "null" && arg !== null && arg !== undefined && (typeof arg !== "number" || arg.toString() !== "NaN")) {
        return arg;
      }
    }
    return null;
  }

  isValidJsonString(str) {
    try {
      JSON.parse(str.trim());
    } catch (e) {
      return false;
    }
    return true;
  }

  parseLayerResult(layerResult: string): { success: boolean; errMsg?: any; layer?: LayerSetting[] } {
    //kvm.log("Starte parseLayerResult", 4);

    if (layerResult.indexOf('form name="login"') > -1) {
      return { success: false, errMsg: "Zugang zum Server verweigert! Prüfen Sie Ihre Zugangsdaten unter Einstellungen." };
    }

    if (!kvm.isValidJsonString(layerResult)) {
      // kvm.log("Das Ergebnis der Layerdatenanfrage ist kein JSON!", 4);
      const errMsg = "Fehler beim Abfragen der Layerdaten. Abfrage liefert keine korrekten Daten vom Server. Entweder sind keine auf dem Server vorhanden, die URL der Anfrage ist nicht korrekt oder der es wird eine Fehlermeldung vom Server geliefert statt der Daten.\nURL der Anfrage:\n" + (<any>kvm._activeStelle).getLayerUrl({ hidePassword: true }) + "\nZurückgelieferte Result:\n" + layerResult;
      return { success: false, errMsg: errMsg };
    }

    const resultObj = JSON.parse(layerResult);

    if (!resultObj.success) {
      kvm.log("Result success ist false!", 4);
      const errMsg = "Fehler beim Abfragen der Layerdaten. Falsche Serverparameter, Authentifizierungsfehler oder Fehler auf dem Server.";
      return { success: false, errMsg: errMsg };
    }

    return resultObj;
  }

  /**
   * function return true if path is the path of the file
   * @params string file The complete path with filename of the file
   * @params string path The path to check if the file path match
   * @return boolean true if file has path
   */
  hasFilePath(file, path) {
    const fileDir = (file.match(/(.*)[\/\\]/)[1] || "/") + "/";
    return fileDir == path;
  }

  /*
   * Remove first and last curly brackets {} from string
   */
  removeBrackes(val): string {
    //console.log("kvm.removeBrackes from: %s", val);
    return val.substring(val.indexOf("{") + 1, val.lastIndexOf("}"));
  }

  /**
   * Remove leading and trainling single and double quotas from string
   */
  removeQuotas(val): string {
    //console.log("kvm.removeQuotas from: %s", val);
    // return val.replace(/^["'](.+(?=["']$))["']$/, "$1");
    val = val.trim();
    if (val.indexOf('"') === 0) {
      val = val.substring(1);
    }
    const lastPos = val.lastIndexOf('"');
    if (lastPos === val.length - 1) {
      val = val.substring(0, lastPos);
    }
    return val;
  }

  /*
   * Add braces around the value to make an array
   */
  addBraces(val: string): string {
    //console.log("kvm.addBraces to: %s", val);
    return "{" + val + "}";
  }

  /*
   * Remove the part with original name of image in val
   * Return the first part before & delimiter
   */
  removeOriginalName(val: string) {
    //kvm.log("kvm.removeOriginalName: " + val, 4);
    return val.split("&").shift();
  }

  /*
   * Replace server image path by local image path
   */
  serverToLocalPath(src) {
    const result = kvm.config.localImgPath + src.substring(src.lastIndexOf("/") + 1);
    //kvm.log("kvm.serverToLocalPath convert: " + src + " to: " + result, 4);
    return result;
  }

  /*
   * Replace local image path by servers image path
   */
  localToServerPath(src) {
    //kvm.log("kvm.localToServerPath src: " + src, 4);
    const result = kvm._activeLayer.get("document_path") + src.substring(src.lastIndexOf("/") + 1);
    //kvm.log("Result: " + result, 4);
    return result;
  }

  /**
   * Function return a quotation mark if the given database type has to be used as string and requires quotation marks
   * @params string type The database type of an attribute
   * @return string If it is a string returns a single quotation mark "'" if not or unknown returns an empty string ""
   */
  bracketForType(type) {
    return ["bpchar", "varchar", "text", "date", "timestamp", "geometry"].indexOf(type) > -1 ? "'" : "";
  }

  composeLayerFilter() {
    const filter = kvm._activeLayer.attributes
      .filter(function (a) {
        return $("#filter_value_" + a.settings.name).val();
      })
      .map(function (a) {
        return {
          key: a.settings.name,
          value: $("#filter_value_" + a.settings.name).val(),
          operator: $("#filter_operator_" + a.settings.name).val(),
        };
      })
      .reduce(
        (acc, cur) => ({
          ...acc,
          [cur.key]: {
            value: cur.value,
            operator: cur.operator,
          },
        }),
        {}
      );
    return filter;
  }

  now(datePrefix = "T", timePrefix = "Z", timeSeparator = ":") {
    const now = new Date();
    const jahr = now.getFullYear();
    const monat = String("0" + (now.getMonth() + 1).toString()).slice(-2);
    const tag = String("0" + now.getDate()).slice(-2);
    const stunde = String("0" + now.getHours()).slice(-2);
    const minute = String("0" + now.getMinutes()).slice(-2);
    const sekunde = String("0" + now.getSeconds()).slice(-2);
    return `${jahr}-${monat}-${tag}${datePrefix}${[stunde, minute, sekunde].join(timeSeparator)}${timePrefix}`;
  }

  today(): string {
    const now = new Date();
    return now.getFullYear() + "-" + String("0" + (now.getMonth() + 1).toString()).slice(-2) + "-" + String("0" + now.getDate()).slice(-2);
  }

  /*
   * Zeigt die verschiedenen Werte der Geometrie
   */
  showGeomStatus() {
    if (kvm._activeLayer && kvm._activeLayer.activeFeature) {
      // console.log("activeFeature.point %o", kvm._activeLayer.activeFeature.getDataValue("point"));
      // console.log("activeFeature.oldGeom %o", kvm._activeLayer.activeFeature.oldGeom);
      // console.log("activeFeature.geom %o", kvm._activeLayer.activeFeature.geom);
      // console.log("activeFeature.newGeom %o", kvm._activeLayer.activeFeature.newGeom);
      // console.log("form geom_wkt: %s", $("#geom_wkt").val());
      // TODO ???
      // console.log("form " + (<any>kvm._activeLayer).get("geometry_attribute") + ": %s", $('.form-field [name="' + kvm._activeLayer.get("geometry_attribute") + '"]').val());
    }
    if (kvm._activeLayer.activeFeature.editableLayer) {
      // console.log("editableLayer: %o", kvm._activeLayer.activeFeature.editableLayer.getLatLng());
    }
  }

  rgbToHex(rgb) {
    const parts = rgb.split(" "),
      componentToHex = function (c) {
        const hex = parseInt(c).toString(16);
        return hex.length == 1 ? "0" + hex : hex;
      };
    return "#" + componentToHex(parts[0]) + componentToHex(parts[1]) + componentToHex(parts[2]);
  }
}

// kvm.loadHeadFile("js/controller/mapper.js", "js");
// kvm.loadHeadFile("js/controller/files.js", "js");

export const kvm = new Kvm();
window["kvm"] = kvm;

// class Test {
//     static instance: Test;

//     imageDiv: HTMLDivElement;
//     image: HTMLImageElement;

//     _init() {
//         const main = document.getElementById("main");
//         const div01 = createHtmlElement("div", main);
//         div01.style.fontSize = "40px";
//         const bttnMkFoto = createHtmlElement("button", div01, null, { innerHTML: "Foto" });
//         bttnMkFoto.addEventListener("click", (ev) => {
//             this.getImage(Camera.PictureSourceType.CAMERA);
//         });
//         const bttnLoadFoto = createHtmlElement("button", div01, null, { innerHTML: "Bild laden" });
//         bttnLoadFoto.addEventListener("click", (ev) => {
//             this.getImage(Camera.PictureSourceType.PHOTOLIBRARY);
//         });

//         this.imageDiv = createHtmlElement("div", main, null);
//     }

//     showImage(imageUri: string) {
//         console.error(imageUri);
//         if (!this.image) {
//             this.image = createHtmlElement("img", this.imageDiv);
//             this.image.style.width = "100%";
//         }
//         if (!imageUri.startsWith("file")) {
//             imageUri = "file://" + imageUri;
//         }

//         window.resolveLocalFileSystemURL(
//             imageUri,
//             (fileEntry) => {
//                 const fileEntryURL = fileEntry.toURL();
//                 console.error(fileEntryURL);
//                 this.image.src = fileEntryURL;
//             },
//             (err) => {
//                 console.error("error", err);
//             }
//         );
//     }

//     getImage(sourceType: number) {
//         console.error(sourceType);
//         navigator.camera.getPicture(
//             (data) => {
//                 this.showImage(data);
//             },
//             (error) => {
//                 console.error(error);
//             },
//             {
//                 sourceType: sourceType,
//             }
//         );
//     }

//     static init() {
//         if (this.instance) {
//             return;
//         }
//         const test = (Test.instance = new Test());
//         test._init();
//     }
// }

if (document.readyState === "interactive" || document.readyState === "complete") {
  kvm.init();
}

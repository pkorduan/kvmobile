/// <reference types="cordova-plugin-device"/>
/// <reference types="cordova-plugin-dialogs"/>
/// <reference types="@types/cordova"/>
/// <reference types="cordova-plugin-inappbrowser"/>
/// <reference types="cordova-plugin-file"/>
/// <reference types="cordova-plugin-android-fingerprint-auth"/>
/// <reference types="@types/cordova-sqlite-storage"/>
// <reference types="@types/leaflet"/>
/// <reference types="@types/leaflet.locatecontrol"/>
/// <reference types="@types/proj4leaflet"/>
// try {
//     window.open = <any>cordova.InAppBrowser.open; // oder casten mit window.open = cordova['InAppBrowser'].open;
// } catch ({ name, message }) {
//     console.error(`TypeError: ${name} Message: ${message}`);
//     alert(`Die App muss ein mal geschlossen und neu gestartet werden!`);
// }

// import "cordova-plugin-dialogs";
// import "cordova-plugin-device";

import * as idb from "idb";
import { configurations } from "./configurations";
import {
  BackgroundGeolocation,
  BackgroundGeolocationConfig,
  BackgroundGeolocationEvents,
  BackgroundGeolocationResponse,
} from "@awesome-cordova-plugins/background-geolocation/ngx";
import { GpsStatus } from "./gpsStatus";
import { SyncStatus } from "./syncStatus";
import { Stelle } from "./Stelle";
import { BackgroundLayerSetting, Layer, LayerSetting } from "./Layer";
import { BackgroundLayer, prepareBackgrounLayer } from "./BackgroundLayer";
import { Feature } from "./Feature";
import { Klasse } from "./Klasse";
// import { Overlay } from "./Overlay";
// import { maplibreStyleObj } from "./mapLibreStyles";
import { NetworkStatus } from "./networkStatus";
import { FileUtils } from "./controller/files";
import { Mapper } from "./controller/mapper";
import maplibregl, { MapGeoJSONFeature } from "maplibre-gl";
import type { FingerprintAuth as FingerprintAuthT } from "cordova-plugin-android-fingerprint-auth";
import "process";
import { MapLibreLayer } from "./MapLibreLayer";
import {
  Control,
  DomUtil,
  ErrorEvent as LErrorEvent,
  Map as LMap,
  Point as LPoint,
  Renderer,
  SVG,
} from "leaflet";
require("leaflet");
require("leaflet.locatecontrol");
require("leaflet-betterscale");
require("leaflet-easybutton");
require("leaflet-editable");
require("leaflet-bing-layer");
import type from "leaflet-easybutton";
import { LatLng, LatLngExpression, LeafletMouseEvent, latLng } from "leaflet";
import { LocationEvent } from "leaflet";
import { executeSQL, listFiles } from "./Util";
require("proj4leaflet");

require("@maplibre/maplibre-gl-leaflet");

declare var FingerprintAuth: typeof FingerprintAuthT;

//export var config: any;
/**
 *
 * @param filePath deviceFilePath oder FileUrl
 * @returns
 */
export async function getWebviewUrl(filePath: string): Promise<string> {
  console.error("getFileUrl: ", filePath);

  //   listFiles(filePath.substring(0, filePath.lastIndexOf("/")));
  let path = filePath.startsWith("file") ? filePath : "file://" + filePath;
  //   listFiles(path.substring(0, path.lastIndexOf("/")));
  if (path.indexOf('"') > 0) {
    path = path.substring(0, path.lastIndexOf('"'));
  }

  return new Promise((resolve, reject) => {
    window.resolveLocalFileSystemURL(
      path,
      (fileEntry) => {
        const fileEntryURL = fileEntry.toURL();
        // console.log("getFileUrl(" + filePath + ")=>" + fileEntryURL);
        resolve(fileEntryURL);
      },
      (err) => {
        console.error("getFileUrl(" + filePath + ")=>error: " + err);
        reject(err);
      }
    );
  });
}

type LayerEntry = {
  [index: string]: Layer;
};

class Kvm {
  // Buffer: require("buffer").Buffer,
  // wkx: require("wkx"),
  controls: any = {};
  controller: {
    // files: typeof FileUtils;
    mapper: typeof Mapper;
  };
  views: {
    mapper: any;
  };
  layerDataLoaded: boolean = false;
  featureListLoaded: boolean = false;
  mapSettings: any;
  _layers: Map<string, Layer> = new Map();
  overlays = [];
  store: Storage;
  map: LMap;
  activeStelle: Stelle;
  activeLayer: Layer;
  myRenderer: Renderer;
  db: SQLitePlugin.Database;
  saveTile: (key: IDBValidKey, val: any) => Promise<IDBValidKey>;
  readTile: (key: IDBValidKey) => Promise<any>;
  orgTileUrl: any;
  debug: any;
  config: any;
  backgroundLayers: BackgroundLayer[] = [];
  backgroundLayerSettings: BackgroundLayerSetting[];
  backgroundGeolocation: BackgroundGeolocation;
  isActive: boolean;
  GpsIsOn: boolean = false;
  inputNextDataset: boolean = false;
  lastMapOrListView: String = "featureList";
  versionNumber: String;
  layerParams: any = {};
  logFileEntry: FileEntry;

  // showItem: <(p:any)=>void>undefined,
  // log: <(p:any)=>void>undefined,

  constructor() {
    this.controller = { mapper: Mapper };
  }

  getLayer(layerId: string) {
    return this._layers.get(layerId);
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
    return layers.sort((a, b) =>
      parseInt(a.get("drawingorder")) > parseInt(b.get("drawingorder")) ? 1 : -1
    );
  }

  /*
   * fügt das Feature zum Layer hinzu, existiert ein Feature mit der gleichen Id wird es ersetzt
   *
   * @param feature
   * @returns
   */
  addLayer(layer: Layer) {
    this._layers.set(layer.getGlobalId(), layer);
  }
  removeLayer(layer: Layer | MapLibreLayer) {
    this._layers.delete(layer.getGlobalId());
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
  getTilesUrls(
    p1: LatLngExpression,
    p2: LatLngExpression,
    zoom: number,
    orgUrl: string
  ) {
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
  getTilesCoord(
    p1: LatLngExpression,
    p2: LatLngExpression,
    zoom: number
  ): any[] {
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
    return (
      "_" +
      sA[sA.length - 4] +
      "_" +
      sA[sA.length - 3] +
      "_" +
      sA[sA.length - 2]
    );
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
  customProtocolHandler(
    params: maplibregl.RequestParameters,
    callback: maplibregl.ResponseCallback<any>
  ) {
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
              console.log(
                "Kachel % nicht in DB gefunden und nicht online",
                url
              );
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
    document.addEventListener(
      "deviceready",
      this.onDeviceReady.bind(this),
      false
    );
    /**
     * if maplibre sees an url like custum:// it will call customProtocolHandler
     *
     * customProtocolHandler: (requestParameters: RequestParameters, callback: ResponseCallback<any>) => Cancelable
     * requestParameters: {url:string, type:json?? }
     */
    maplibregl.addProtocol("custom", this.customProtocolHandler);
  }

  fail(e) {
    console.log("FileSystem Error");
    console.dir(e);
  }

  /**
   * Diese Funktion schreibt den Text aus variable log die Log-Datei.
   * Die Log-Datei ist in kvm.openLogFile() definiert worden.
   * @param str
   * @returns
   */
  writeLog(log) {
    log = `[${kvm.now(" ", "", ":")}] ${log}` + "\n";
    let dataObj = new Blob([log], { type: "text/plain" });
    FileUtils.writeFile(kvm.logFileEntry, dataObj, true);
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
    const foundConfiguration = configurations.filter(function (c) {
      return (
        c.name ==
        (kvm.store.getItem("configName")
          ? kvm.store.getItem("configName")
          : "Standard")
      );
    });
    if (foundConfiguration.length == 0) {
      kvm.config = configurations[0];
    } else {
      kvm.config = foundConfiguration[0];
    }

    this.db = window.sqlitePlugin.openDatabase(
      {
        name: kvm.config.dbname + ".db",
        location: "default",
        androidDatabaseImplementation: 2,
      },
      function (db) {
        //kvm.log('Lokale Datenbank geöffnet.', 3);
        $("#dbnameText").html(kvm.config.dbname + ".db");
        kvm.initSecuritySettings();
        if (kvm.store.getItem("fingerprintAuth") == "true") {
          FingerprintAuth.isAvailable(
            function (result: any) {
              console.log(
                "FingerprintAuth available: " + JSON.stringify(result)
              );
              // Check the docs to know more about the encryptConfig object
              const encryptConfig = {
                clientId: "myAppName",
                username: "currentUser",
                password: "currentUserPassword",
                maxAttempts: 5,
                locale: "de_DE",
                dialogTitle: "Authentifizierung mit Fingerabdruck",
                dialogMessage: "Lege Finger auf den Sensor",
                dialogHint:
                  "Diese Methode ist nur Verfügbar mit Fingerabdrucksensor",
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
  startApplication() {
    let activeView = ["settings", "map", "featurelist"].includes(
      kvm.store.getItem("activeView")
    )
      ? kvm.store.getItem("activeView")
      : "featurelist";

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
      kvm.msg(
        "Fehler beim Lesen des activeView und Title! Fehlertyp: " +
          name +
          " Fehlermeldung: " +
          message
      );
    }

    try {
      this.loadLogLevel();
      this.openLogFile();
      this.loadDeviceData();
      //    SyncStatus.load(this.store); ToDo: Wenn das nicht gebraucht wird auch in index.html löschen.
      this.setConnectionStatus();
      this.setGpsStatus();
      this.initConfigOptions();
      this.initMap();
      this.initViewSettings();
      this.initLoadOfflineMapsDiv();
      this.initColorSelector();
      this.initStatusFilter();
      this.initLocalBackupPath();
    } catch ({ name, message }) {
      kvm.msg(
        "Fehler beim initieren der Anwendungskomponenten! Fehlertyp: " +
          name +
          " Fehlermeldung: " +
          message
      );
    }

    let stelle: Stelle = undefined;
    if (
      this.store.getItem("activeStelleId") &&
      this.store.getItem(
        "stelleSettings_" + this.store.getItem("activeStelleId")
      )
    ) {
      let activeStelleId = this.store.getItem("activeStelleId");
      let activeStelleSettings = this.store.getItem(
        "stelleSettings_" + activeStelleId
      );

      //console.log("Aktive Stelle " + activeStelleId + " gefunden.");

      try {
        stelle = new Stelle(activeStelleSettings);
        stelle.viewSettings();
        stelle.activate();
      } catch ({ name, message }) {
        kvm.msg(
          "Fehler beim setzen der aktiven Stelle id: " +
            activeStelleId +
            "! Fehlertyp: " +
            name +
            " Fehlermeldung: " +
            message
        );
      }

      if (this.store.getItem("layerIds_" + activeStelleId)) {
        // Auslesen der layersettings
        const layerIds = JSON.parse(
          this.store.getItem("layerIds_" + activeStelleId)
        );
        stelle.readAllLayers = true;
        stelle.numLayersRead = 0;
        stelle.numLayers = layerIds.length;
        kvm.openSperrDiv("Lade Layerdaten.");
        for (let layerId of layerIds) {
          //console.log('Lade Layersettings for layerId: %s', layerId);
          const layerSettings = this.store.getItem(
            "layerSettings_" + activeStelleId + "_" + layerId
          );
          if (layerSettings != null) {
            const settings = JSON.parse(layerSettings);
            if (settings.vector_tile_url) {
              const layer = new MapLibreLayer(settings, true, stelle);
              layer.appendToApp();
              stelle.finishLayerReading(layer);
            } else {
              const layer = new Layer(stelle, settings);
              layer.appendToApp();
              if (layer.get("id") == kvm.store.getItem("activeLayerId")) {
                layer.isActive = true;
                kvm.addLayer(layer);
                kvm.activeLayer = layer;
              }
              if (
                navigator.onLine &&
                layer.hasSyncPrivilege &&
                layer.get("autoSync")
              ) {
                if (layer.hasEditPrivilege) {
                  try {
                    console.log(
                      "Layer " +
                        layer.title +
                        ": SyncData with local deltas if exists."
                    );
                    layer.syncData();
                  } catch ({ name, message }) {
                    kvm.msg(
                      "Fehler beim synchronisieren des Layers id: " +
                        layer.getGlobalId() +
                        "! Fehlertyp: " +
                        name +
                        " Fehlermeldung: " +
                        message
                    );
                  }
                  try {
                    console.log(
                      "Layer " +
                        layer.title +
                        ": SyncImages with local images if exists."
                    );
                    layer.syncImages();
                  } catch ({ name, message }) {
                    kvm.msg(
                      "Fehler beim synchronisieren der Bilder des Layers id: " +
                        layer.getGlobalId() +
                        "! Fehlertyp: " +
                        name +
                        " Fehlermeldung: " +
                        message
                    );
                  }
                } else {
                  console.log(
                    "Layer " + layer.title + ": Only get deltas from server."
                  );
                  try {
                    layer.sendDeltas({ rows: [] });
                  } catch ({ name, message }) {
                    kvm.msg(
                      "Fehler beim senden der Deltas des Layers id: " +
                        layer.getGlobalId() +
                        "! Fehlertyp: " +
                        name +
                        " Fehlermeldung: " +
                        message
                    );
                  }
                }
              } else {
                console.log(
                  "Layer " +
                    layer.title +
                    ": Only read data from local database."
                );
                layer.readData(); // include drawFeatures
              }
            }
          }
        }
        if (layerIds.length > 0) {
          stelle.sortOverlays();
        }
      } else {
        kvm.msg("Laden Sie die Stellen und Layer vom Server.");
        $("#newFeatureButton, #showDeltasButton").hide();
        activeView = "settings";
        this.showSettingsDiv("server");
      }
    } else {
      kvm.msg(
        "Wählen Sie eine Konfiguration aus und Stellen die Zugangsdaten zum Server ein."
      );
      stelle = new Stelle("{}");
      stelle.viewDefaultSettings();
      activeView = "settings";
      this.showSettingsDiv("server");
    }

    // ToDo
    //GpsStatus.load();
    //kvm.log('GPS Position geladen');

    //kvm.log("Ereignisüberwachung eingerichtet.", 4);
    this.bindEvents();

    //kvm.log("Liste der Datensätze angezeigt.", 4);
    this.showItem(activeView);
  }

  reloadFeatures() {
    /**
     * ToDo pk: Reload activeLayer last so that it is on top of all in map.
     */
    this.activeStelle.readAllLayers = true;
    this.activeStelle.numLayersRead = 0;
    // TODO
    this._layers.forEach((layer) => {
      layer.readData();
    });
  }

  initConfigOptions() {
    $("#configFileDiv").append(
      $("<select>")
        .attr({
          id: "configName",
          name: "configName",
        })
        .on("change", (evt) => {
          navigator.notification.confirm(
            "Wollen Sie wirklich die Konfiguration ändern? Dabei gehen alle lokalen Änderungen verloren, die Layer und Einstellungen werden gelöscht und die Anwendung wird mit den Default-Werten der anderen Konfiguration neu gestartet!",
            function (buttonIndex) {
              if (buttonIndex == 2) {
                $("#configName").val(kvm.store.getItem("configName"));
              } else {
                const newVal = $(evt.target).val();
                kvm.setConfigOption(newVal);
              }
            },
            "Konfiguration",
            ["Ja", "Abbruch"]
          );
        })
    );

    configurations.map(function (c) {
      $("#configName").append(
        $("<option>")
          .attr({
            value: c.name,
          })
          .prop("selected", c.name == kvm.store.getItem("configName"))
          .html(c.name)
      );
    });
  }

  setConfigOption(configName) {
    this.store.clear();
    this.store.setItem("configName", configName);

    // TODO
    // window.location.reload(true);
    window.location.reload();
  }

  initMap() {
    //kvm.log("Karte initialisieren.", 3);
    kvm.log("initialisiere Mapsettings", 3);
    this.initMapSettings();

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
      center:
        JSON.parse(kvm.store.getItem("activeCenter")) ||
        new LatLng(
          this.mapSettings.startCenterLat,
          this.mapSettings.startCenterLon
        ),
      zoom: kvm.store.getItem("activeZoom") || this.mapSettings.startZoom,
      minZoom: this.mapSettings.minZoom,
      maxZoom: this.mapSettings.maxZoom,
      maxBounds: [
        [this.mapSettings.south, this.mapSettings.west],
        [this.mapSettings.north, this.mapSettings.east],
      ],
      layers:
        this.backgroundLayers[
          this.config.activeBackgroundLayerId
            ? this.config.activeBackgroundLayerId
            : 0
        ].leafletLayer,
      renderer: this.myRenderer,
    });
    const baseMaps = {};
    map.on("popupopen", function (evt) {
      kvm.controls.layers.collapse();
    });
    map.on("zoomend", (evt) =>
      kvm.store.setItem("activeZoom", evt.target.getZoom())
    );
    map.on("moveend", (evt) => {
      kvm.store.setItem("activeCenter", JSON.stringify(evt.target.getCenter()));
      if ($("#geolocation_div").is(":visible")) {
        $("#geolocation_div").html(
          `${evt.target.getCenter().lat} ${evt.target.getCenter().lng}`
        );
      }
    });

    map.on("locationfound", kvm.onlocationfound);
    map.on("locationerror", kvm.onlocationerror);

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
      baseMaps[
        `<span id="backgroundLayerSpan_${i}">${this.backgroundLayerSettings[i].label}</span>`
      ] = this.backgroundLayers[i].leafletLayer;
    }

    if (
      this.store.getItem("activeStelleId") &&
      this.store.getItem(
        `stelleSettings_${this.store.getItem("activeStelleId")}`
      ) != null
    ) {
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
    if (
      this.config.name == "LK-EE" &&
      this.store.getItem("activeStelleId") &&
      this.store.getItem(
        `stelleSettings_${this.store.getItem("activeStelleId")}`
      ) &&
      JSON.parse(
        this.store.getItem(
          `stelleSettings_${this.store.getItem("activeStelleId")}`
        )
      ).Stelle_ID == "103"
    ) {
      baseMaps["PmVectorTile"] = new MapLibreLayer(
        "https://geoportal.lkee.de/html/pmtiles/style-schlaege.json",
        true,
        kvm.activeStelle
      );
    }

    //    L.PM.initialize({ optIn: true });
    // ToDo sortFunction hinzufügen die nach drawingorder sortieren kann
    kvm.controls.layers = new Control.Layers(baseMaps, null, {
      autoZIndex: true,
      sortLayers: false,
      sortFunction: (layerA, layerB, nameA, nameB) =>
        parseInt(layerA.getAttribution()) > parseInt(layerB.getAttribution())
          ? parseInt(layerA.getAttribution())
          : parseInt(layerB.getAttribution()),
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
        outsideMapBoundsMsg:
          "Sie sind außerhalb des darstellbaren Bereiches der Karte.",
      },
    }).addTo(map);
    const ReloadLayers = Control.extend({
      onAdd: function (map: LMap) {
        console.log(
          "Add leaflet control reloadLayers %o to Map: %o",
          this,
          map
        );
        this._div = DomUtil.create(
          "div",
          "leaflet-bar leaflet-control-reloadlayers"
        ); // create a div with a class "reloadlayers-control-div"
        this._div.innerHTML =
          '<a class="leaflet-control-reloadlayers-icon"><span><i class="fa fa-refresh" onclick="kvm.reloadFeatures()"></i></span></a>';
        return this._div;
      },
      onClick: function (evt) {
        console.log(
          "Click on leaflet control reloadLayers with event: %o",
          evt
        );
      },
      onRemove: function (map) {
        console.log(
          "Remove leaflet control reloadLayers %o to Map: %o",
          this,
          map
        );
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
        const container = DomUtil.create(
          "div",
          "leaflet-bar leaflet-control leaflet-control-zoomLevel"
        ); // Create a container for the control
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
                const lastLatlng =
                  kvm.activeLayer.activeFeature.getWaypoint("last");
                if (buttonIndex == 1) {
                  console.log("Vorhandenen Track löschen und neu beginnen.");
                  // Editierbarkeit ausschalten
                  kvm.activeLayer.activeFeature.editableLayer.disableEdit();
                  // LatLngs zurücksetzen
                  kvm.activeLayer.activeFeature.editableLayer.setLatLngs([]);
                  // Tracking einschalten (latlngs hinzufügen auch im Hintergrund, wenn das Display aus ist.)
                  kvm.controller.mapper.startGpsTracking(lastLatlng);
                  btn.state("track-aufnahme");
                } else if (buttonIndex == 2) {
                  console.log("Vorhandenen Track weiterzeichnen.");
                  // Editierbarkeit ausschalten
                  kvm.activeLayer.activeFeature.editableLayer.disableEdit();
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
                  navigator.geolocation.clearWatch(
                    kvm.controller.mapper.watchId
                  );
                  // Track als Geometrie vom Feature übernehmen
                  //Editierbarkeit einschalten.
                  kvm.activeLayer.activeFeature.editableLayer.enableEdit();
                  btn.state("track-aufzeichnen");
                } else if (buttonIndex == 2) {
                  console.log("Aufnahme unterbrechen.");
                  // Tracking ausschalten
                  navigator.geolocation.clearWatch(
                    kvm.controller.mapper.watchId
                  );
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
                const lastLatlng =
                  kvm.activeLayer.activeFeature.getWaypoint("last");
                if (buttonIndex == 1) {
                  console.log("Aufnahme beenden.");
                  // Tracking ausschalten
                  navigator.geolocation.clearWatch(
                    kvm.controller.mapper.watchId
                  );
                  // Track als Geometrie vom Feature übernehmen
                  //Editierbarkeit einschalten.
                  kvm.activeLayer.activeFeature.editableLayer.enableEdit();
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
  initLoadOfflineMapsDiv() {
    console.log("initLoadOfflineMapsDiv");
    const offlineLayers = kvm.config.backgroundLayerSettings.filter(
      (setting) => {
        return setting.online === false;
      }
    );
    console.log("offlineLayers in initLoadOfflineMapsDiv: %o", offlineLayers);
    offlineLayers.forEach((offlineLayer) => {
      $("#loadOfflineMapsDiv").append(`
				<div>
					${offlineLayer.label}
					<button id="downloadBackgroundLayerButton" class="settings-button" value="${offlineLayer.layer_id}">
						<i class="fa fa-download" arial-hidden="true"> herunterladen</i>
					</button>
				</div>
			`);
    });
  }

  initColorSelector() {
    const markerStyles =
      JSON.parse(kvm.store.getItem("markerStyles")) || kvm.config.markerStyles;
    kvm.store.setItem("markerStyles", JSON.stringify(markerStyles));
    Object.values(markerStyles).forEach(this.addColorSelector);
  }

  initStatusFilter() {
    const statusFilter = kvm.store.getItem("statusFilter");
    if (statusFilter) {
      $("#statusFilterSelect").val(statusFilter);
    }
  }

  initLocalBackupPath() {
    const localBackupPath =
      kvm.store.getItem("localBackupPath") || kvm.config.localBackupPath;
    kvm.store.setItem("localBackupPath", localBackupPath);
    $("#localBackupPath").val(localBackupPath);
  }

  initMapSettings() {
    if (!(this.mapSettings = JSON.parse(kvm.store.getItem("mapSettings")))) {
      this.saveMapSettings(kvm.config.mapSettings);
    }
    $("#newPosSelect").val(this.mapSettings.newPosSelect);
    $("#mapSettings_west").val(this.mapSettings.west);
    $("#mapSettings_south").val(this.mapSettings.south);
    $("#mapSettings_east").val(this.mapSettings.east);
    $("#mapSettings_north").val(this.mapSettings.north);
    $("#mapSettings_minZoom").val(this.mapSettings.minZoom);
    $("#mapSettings_maxZoom").val(this.mapSettings.maxZoom);
    $("#mapSettings_startZoom").val(this.mapSettings.startZoom);
    $("#mapSettings_startCenterLat").val(this.mapSettings.startCenterLat);
    $("#mapSettings_startCenterLon").val(this.mapSettings.startCenterLon);
  }

  initViewSettings() {
    console.log("initViewSettings");
    kvm.config.viewAfterCreate =
      (kvm.store.hasOwnProperty("viewAfterCreate")
        ? kvm.store.getItem("viewAfterCreate")
        : kvm.config.viewAfterCreate) || "last";
    kvm.store.setItem("viewAfterCreate", kvm.config.viewAfterCreate);
    $("#viewAfterCreate").val(kvm.config.viewAfterCreate);
    console.log("viewAfterCreate = ", kvm.config.viewAfterCreate);

    kvm.config.viewAfterUpdate =
      (kvm.store.hasOwnProperty("viewAfterUpdate")
        ? kvm.store.getItem("viewAfterUpdate")
        : kvm.config.viewAfterUpdate) || "last";
    kvm.store.setItem("viewAfterUpdate", kvm.config.viewAfterUpdate);
    $("#viewAfterUpdate").val(kvm.config.viewAfterUpdate);
    console.log("viewAfterUpdate = ", kvm.config.viewAfterUpdate);

    kvm.config.newAfterCreate =
      (kvm.store.hasOwnProperty("newAfterCreate")
        ? kvm.store.getItem("newAfterCreate") == "true"
        : kvm.config.newAfterCreate) || false;
    kvm.store.setItem("newAfterCreate", kvm.config.newAfterCreate);
    $(".newAfterCreate").prop("checked", kvm.config.newAfterCreate);
    console.log("newAfterCreate = ", kvm.config.newAfterCreate);
  }

  initSecuritySettings() {
    console.log("initSecuritySettings");
    kvm.config.fingerprintAuth =
      (kvm.store.hasOwnProperty("fingerprintAuth")
        ? kvm.store.getItem("fingerprintAuth") == "true"
        : kvm.config.fingerprintAuth) || false;
    kvm.store.setItem("fingerprintAuth", kvm.config.fingerprintAuth);
    $("#fingerprintAuth").prop("checked", kvm.config.fingerprintAuth);
    console.log("fingerprintAuth = ", kvm.config.fingerprintAuth);

    kvm.config.confirmSave =
      (kvm.store.hasOwnProperty("confirmSave")
        ? kvm.store.getItem("confirmSave") == "true"
        : kvm.config.confirmSave) || false;
    kvm.store.setItem("confirmSave", kvm.config.confirmSave);
    $("#confirmSave").prop("checked", kvm.config.confirmSave);
    console.log("confirmSave = ", kvm.config.confirmSave);
  }

  saveMapSettings(mapSettings) {
    this.mapSettings = mapSettings;
    kvm.store.setItem("mapSettings", JSON.stringify(mapSettings));
  }

  initBackgroundLayers() {
    // console.error('initBackgroundLayers');
    try {
      this.saveBackgroundLayerSettings(
        kvm.store.backgroundLayerSettings
          ? JSON.parse(kvm.store.getItem("backgroundLayerSettings"))
          : kvm.config.backgroundLayerSettings
      );
      //this.saveBackgroundLayerSettings(kvm.config.backgroundLayerSettings);
      kvm.backgroundLayerSettings.forEach((l, i) => {
        $("#backgroundLayerSettingsDiv").append(
          '<div id="backgroundLayerDiv_' +
            i +
            '"><b>' +
            l.label +
            '</b><br>URL:<br><input id="backgroundLayerURL_' +
            i +
            '" type="text" value="' +
            l.url +
            '"></input></div>'
        );
        if (l.params.layers) {
          $("#backgroundLayerDiv_" + i).append(
            '<br>Layer:<br><input id="backgroundLayerLayer_' +
              i +
              '" type="text" value="' +
              l.params.layers +
              '" style="font-size: 20px;"></input>'
          );
        }
      });
      $("#backgroundLayersTextarea").val(
        kvm.store.getItem("backgroundLayerSettings")
      );
      this.backgroundLayers = [];
      // for (var i = 0; i < 2; ++i) {
      for (let i = 0; i < this.backgroundLayerSettings.length; ++i) {
        console.log(this.backgroundLayerSettings[i]);
        this.backgroundLayers.push(
          new BackgroundLayer(this.backgroundLayerSettings[i])
        );
      }
    } catch (error) {
      console.error(error);
      kvm.msg("Fehler beim Einrichten der Hintergrundlayer: " + error);
      return false;
    }
  }

  saveBackgroundLayerSettings(backgroundLayerSettings: any[]) {
    this.backgroundLayerSettings = backgroundLayerSettings;
    kvm.store.setItem(
      "backgroundLayerSettings",
      JSON.stringify(backgroundLayerSettings)
    );
  }

  onlocationfound(evt: any) {
    //console.log("Found a new geolocation: %o", evt);
    $("#gpsStatusText").html("GPS vorhanden und funktioniert");
    const timestamp = new Date(evt.timestamp);
    const coords = evt.coords ? evt.coords : evt;

    $("#gpsCurrentPosition").html(
      "Position: " +
        coords.latitude.toString() +
        " " +
        coords.longitude.toString() +
        "<br>Genauigkeit: " +
        coords.accuracy +
        "<br>Zeit: " +
        timestamp.toLocaleDateString() +
        " " +
        timestamp.toLocaleTimeString()
    );
    $("#zoomToCurrentLocation").show();
    kvm.GpsIsOn = true;
  }

  onlocationerror(evt: LErrorEvent | GeolocationPositionError) {
    //console.log("geolocation error occured: %o", evt);
    kvm.msg(
      "Der Standort kann nicht bestimmt werden!\nSchalten Sie in Ihrem Gerät unter Einstellungen die Option 'Standort verwenden' ein.\nFehler bei der Bestimmung der GPS-Position.\nDie Wartezeit für eine neue Position ist überschritten.\nMeldung des GPS-Gerätes: " +
        evt.message,
      "GPS Positionierung"
    );
    $("#gpsStatusText").html("GPS Zeitüberschreitungsfehler");
    $("#zoomToCurrentLocation").hide();
    kvm.GpsIsOn = false;
  }

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

  updateMarkerStyle(elm: any) {
    //console.log('new Color: %o', elm);
    const markerStyles = JSON.parse(kvm.store.getItem("markerStyles")),
      index = elm.id.slice(-1);

    markerStyles[index].fillColor = elm.value;
    kvm.store.setItem("markerStyles", JSON.stringify(markerStyles));
    if (kvm.activeLayer)
      kvm.activeLayer.readData($("#limit").val(), $("#offset").val());
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

    document.addEventListener("offline", this.setConnectionStatus, false);

    document.addEventListener("online", this.setConnectionStatus, false);

    document.addEventListener(
      "dataLoaded",
      function () {
        if (kvm.featureListLoaded && kvm.layerDataLoaded) {
          kvm.closeSperrDiv("Event dataLoaded ausgelößt.");
        }
      },
      false
    );

    // rtr events from index.html
    // $("#showFormEdit").on("showMap", function () {
    //     kvm.showItem("map");
    // });

    $(".h2-div").on("click", function (evt) {
      const h2 = $(evt.target),
        h2div = h2.parent(),
        collapsed = h2.hasClass("b-collapsed");

      kvm.collapseAllSettingsDiv();
      if (collapsed) {
        h2.toggleClass("b-collapsed b-expanded");
        h2div.next().toggle();
        if (h2.prop("id") == "h2_update") {
          $("#settings").scrollTop(h2.offset().top);
        }
      }
    });

    $("#showFormEdit").on("click", function () {
      kvm.showItem("formular");
    });

    $("#showMapEdit").on("click", function () {
      kvm.showItem("mapEdit");
    });

    $("#showSettings").on("click", function () {
      kvm.showItem("settings");
    });

    $("#requestStellenButton").on("click", function () {
      navigator.notification.confirm(
        "Vor dem neu Laden der Stellen müssen alle Änderungen mit dem Server synchronisiert worden sein, sonst können Daten verloren gehen! Ich habe alle Layer synchronisiert. Jetzt andere Stelle auswählen?",
        function (buttonIndex) {
          if (buttonIndex == 1) {
            // ja
            if (navigator.onLine) {
              if (
                $("#kvwmapServerUrlField").val() != "" &&
                $("#kvwmapServerLoginNameField").val() != "" &&
                $("#kvwmapServerPasswortField").val() != ""
              ) {
                kvm.openSperrDiv("Frage Stellen ab");
                $("#activeStelleBezeichnungDiv").hide();
                const stelle = new Stelle({
                  url: $("#kvwmapServerUrlField").val(),
                  login_name: $("#kvwmapServerLoginNameField").val(),
                  passwort: $("#kvwmapServerPasswortField").val(),
                });
                console.log(
                  "Stellenobjekt erzeugt um Stellen abfragen zu können: " +
                    JSON.stringify(stelle)
                );
                //kvm.log("Stellenobjekt erzeugt um Stellen abfragen zu können: " + JSON.stringify(stelle), 4);
                stelle.requestStellen();
              } else {
                kvm.msg(
                  "Sie müssen erst die Server URL, Nutzername und Password angeben!"
                );
              }
            } else {
              kvm.msg(
                "Kein Internet. Stellen Sie sicher, dass sie eine Netzverbindung haben!"
              );
            }
          }
          if (buttonIndex == 2) {
            // nein
            kvm.msg("Ok, nichts passiert!", "Stellen abfragen");
          }
        },
        "Stellen abfragen",
        ["ja", "nein"]
      );
    });

    $("#kvwmapServerStelleSelectField").on("change", function () {
      if ($("#saveServerSettingsButton").hasClass("settings-button")) {
        $("#saveServerSettingsButton").toggleClass(
          "settings-button settings-button-active"
        );
      }
      $("#saveServerSettingsButton").show();
    });

    $("#requestLayersButton").on("click", function () {
      if (navigator.onLine) {
        kvm.openSperrDiv("Lade Layerdaten.");
        kvm.activeStelle.requestLayers();
      } else {
        NetworkStatus.noNetMsg("Netzverbindung");
      }
    });

    $("#saveServerSettingsButton").on("click", function () {
      const stellen = String($("#kvwmapServerStellenField").val());
      const selectedStelleId = $("#kvwmapServerStelleSelectField").val();
      const stelleSettings = JSON.parse(stellen).find((stelle) => {
        return stelle.ID == selectedStelleId;
      });
      stelleSettings["id"] = $("#kvwmapServerIdField").val();
      stelleSettings["name"] = $("#kvwmapServerNameField").val();
      stelleSettings["bezeichnung"] = $(
        "#kvwmapServerStelleSelectField option:selected"
      ).text();
      stelleSettings["url"] = $("#kvwmapServerUrlField").val();
      stelleSettings["login_name"] = $("#kvwmapServerLoginNameField").val();
      stelleSettings["passwort"] = $("#kvwmapServerPasswortField").val();
      stelleSettings["Stelle_ID"] = $("#kvwmapServerStelleSelectField").val();
      // stelleSettings['stellen'] = $("#kvwmapServerStellenField").val(); Das brauchen wir hier nicht, denn für die eine Stelle wurde alles hinterlegt.
      // wenn andere Stellen ausgewählt werden sollen müssen die vorher noch mal vom Server geholt werden.
      const stelle = new Stelle(stelleSettings);
      stelle.saveToStore();
      if (kvm.activeLayer) {
        kvm.activeLayer["stelle"] = stelle;
      }
      stelle.activate();
      if ($("#saveServerSettingsButton").hasClass("settings-button-active")) {
        $("#saveServerSettingsButton").toggleClass(
          "settings-button settings-button-active"
        );
      }
      $("#kvwmapServerStelleSelectField, #saveServerSettingsButton").hide();
      $("#requestStellenButton").show();
      if (navigator.onLine) {
        kvm.showSettingsDiv("layer");
        $("#requestLayersButton").show();
      } else {
        kvm.msg(
          "Stellen Sie eine Netzverbindung her zum Laden der Layer und speichern Sie noch mal die Servereinstellungen."
        );
      }
    });

    $(".leaflet-control-layers-selector").on("change", (evt) => {
      console.log("leaflet-control-layers-selector change evt");
      console.log("layer changed");
      let target = $(evt.target);
      if (target.is(":checked")) {
        let bgdLayerId = $(target.next().children()[0])
          .attr("id")
          .split("_")[1];
        kvm.config.activeBackgroundLayerId = bgdLayerId;
        kvm.store.setItem("activeBackgroundLayerId", bgdLayerId);
        console.log(
          "BackgroundLayer %s is checked",
          $(target.next().children()[0]).html()
        );
      }
    });

    $(".mapSetting").on("change", function () {
      kvm.mapSettings[(<HTMLInputElement>this).name] = (<HTMLInputElement>(
        this
      )).value;
      kvm.saveMapSettings(kvm.mapSettings);
    });

    $("#mapSettings_maxZoom").on("change", function () {
      // TODO Bug
      // kvm.map.setMaxZoom((<HTMLInputElement>this).value);
      kvm.msg(
        "maximale Zoomstufe auf " +
          (<HTMLInputElement>this).value +
          " begrenzt!",
        "Karteneinstellung"
      );
    });

    $("#mapSettings_minZoom").on("change", function () {
      // TODO Bug
      // kvm.map.setMinZoom(this.value);
      kvm.msg(
        "minimale Zoomstufe auf " +
          (<HTMLInputElement>this).value +
          " begrenzt!",
        "Karteneinstellung"
      );
    });

    $(
      "#mapSettings_west, #mapSettings_south, #mapSettings_east, #mapSettings_north"
    ).on(
      "change",
      // TODO Bug

      function () {
        // console.log("Bug setting MinMax");
        //   kvm.map.setMaxBounds(
        //     L.bounds(
        //       L.latLng(
        //         $('#mapSettings_south').val(),
        //         $('#mapSettings_west').val()
        //       ),
        //       L.latLngpoint(
        //         $('#mapSettings_north').val(),
        //         $('#mapSettings_east').val()
        //       )
        //     )
        //   );

        kvm.msg("max Boundingbox geändert!", "Karteneinstellung");
      }
    );

    $("#fingerprintAuth").on("change", function () {
      kvm.config.fingerprintAuth = $("#fingerprintAuth").is(":checked");
      console.log("Set fingerprintAuth to ", kvm.config.fingerprintAuth);
      kvm.store.setItem(
        "fingerprintAuth",
        kvm.config.fingerprintAuth.toString()
      );
    });

    $("#confirmSave").on("change", function () {
      kvm.config.confirmSave = $("#confirmSave").is(":checked");
      console.log("Set confirmSave to ", kvm.config.confirmSave);
      kvm.store.setItem("confirmSave", kvm.config.confirmSave.toString());
    });

    $("#newAfterCreate").on("change", function () {
      kvm.config.newAfterCreate = $("#newAfterCreate").is(":checked");
      console.log("Set newAfterCreate to ", kvm.config.newAfterCreate);
      kvm.store.setItem("newAfterCreate", kvm.config.newAfterCreate.toString());
    });

    $("#viewAfterCreate").on("change", function () {
      kvm.config.viewAfterCreate = $("#viewAfterCreate").val();
      console.log("Set viewAfterCreate to ", kvm.config.viewAfterCreate);
      kvm.store.setItem(
        "viewAfterCreate",
        kvm.config.viewAfterCreate.toString()
      );
    });

    $("#viewAfterUpdate").on("change", function () {
      kvm.config.viewAfterUpdate = $("#viewAfterUpdate").val();
      console.log("Set viewAfterUpdate to ", kvm.config.viewAfterUpdate);
      kvm.store.setItem(
        "viewAfterUpdate",
        kvm.config.viewAfterUpdate.toString()
      );
    });

    $("#logLevel").on("change", function () {
      kvm.config.logLevel = $("#logLevel").val();
      kvm.store.setItem("logLevel", kvm.config.logLevel);
      kvm.msg("Protokollierungsstufe geändert!", "Protokollierung");
    });

    $(
      "#backgroundLayerOnline_url, #backgroundLayerOnline_type, #backgroundLayerOnline_layers"
    ).on("change", function () {
      kvm.msg("Speichern noch nicht implementiert");
      //kvm.map.setBackgroundLayerOnline();
    });

    $("#resetBackgroundLayerSettingsButton").on("click", function () {
      kvm.config.backgroundLayerSettings.forEach((l, i) => {
        $("#backgroundLayerURL_" + i).val(l.url);
        if (l.params.layers) {
          $("#backgroundLayerLayer_" + i).val(l.params.layers);
        }
      });
      kvm.saveBackgroundLayerSettings(kvm.config.backgroundLayerSettings);
      kvm.msg(
        "Einstellung zu Hintergrundlayern aus config Datei erfolgreich wiederhergestellt."
      );
    });

    $("#changeBackgroundLayerSettingsButton").on("click", function () {
      kvm.backgroundLayerSettings.forEach((l, i) => {
        l.url = <string>$("#backgroundLayerURL_" + i).val();
        if (l.params.layers) {
          l.params.layers = <string>$("#backgroundLayerLayer_" + i).val();
        }
      });
      console.log(
        "Neue BackgroundLayerSettings: ",
        kvm.backgroundLayerSettings
      );
      kvm.saveBackgroundLayerSettings(kvm.backgroundLayerSettings);
      kvm.msg(
        "Einstellung zu Hintergrundlayern übernommen. Diese werden erst nach einem Neustart der Anwendung wirksam!"
      );
    });

    $("#loadBackgroundLayerButton").on("click", function (evt) {
      navigator.notification.confirm(
        "Wollen Sie die Daten des Hintergrundlayers für den aktuellen Kartenausschnitt runterladen und lokal speichern?",
        function (buttonIndex) {
          if (buttonIndex == 1) {
            console.log("download backgroundlayer on event", evt.target);
            // ja
            //						kvm.backgroundLayers[i].downloadData();
          } else {
            console.log("Background layer nicht runterladen.");
          }
        },
        "Kacheln für Hintergrundlayer runterladen",
        ["ja", "nein"]
      );
    });

    $("#localBackupPath").on("change", function () {
      // TODO Bug??
      // kvm.store.setItem("localBackupPath", this.val());
      kvm.store.setItem("localBackupPath", $(this).val().toString());
    });

    $("#saveDatabaseButton").on("click", function () {
      navigator.notification.prompt(
        "Geben Sie einen Namen für die Sicherungsdatei an. Die Datenbank wird im Internen Speicher im Verzeichnis " +
          (kvm.store.getItem("localBackupPath") || kvm.config.localBackupPath) +
          ' mit der Dateiendung .db gespeichert. Ohne Eingabe wird der Name "Sicherung_" + aktuellem Zeitstempel + ".db" vergeben.',
        function (results) {
          if (results.buttonIndex === 1) {
            kvm.backupDatabase(
              results.input1,
              "Datenbank erfolgreich gesichert."
            );
          }
        },
        "Datenbanksicherung",
        ["OK", "Abbrechen"]
      );
    });

    $("#saveImagesButton").on("click", function () {
      let destDir =
        $("#localBackupPath").val() ||
        kvm.store.getItem("localBackupPath") ||
        kvm.config.localBackupPath;

      navigator.notification.confirm(
        `Sollen die Bilddaten nach ${destDir} gesichert werden? Gleichnamige Dateien im Zielverzeichnis werden überschrieben!`,
        (buttonIndex) => {
          if (buttonIndex == 1) {
            FileUtils.copyFiles(kvm.config.localImgPath, destDir);
          }
          if (buttonIndex == 2) {
            // nein
          }
        },
        "Bilddaten sichern?",
        ["ja", "nein"]
      );
    });

    $("#showDeltasButton").on("click", () => {
      //kvm.log("Delta anzeigen.", 3);
      if (kvm.activeLayer.hasEditPrivilege) {
        let sql = `
          SELECT
            *
          FROM
            ${kvm.activeLayer.get("schema_name")}_${kvm.activeLayer.get(
          "table_name"
        )}_deltas
        `;

        $("#showDeltasButton").hide();
        $("#showDeltasWaiting").show();
        kvm.db.executeSql(
          sql,
          [],
          (rs) => {
            const numRows = rs.rows.length;
            if (numRows > 0) {
              $("#showDeltasDiv").html("<b>Deltas</b>");
              for (let i = 0; i < numRows; i++) {
                const item = rs.rows.item(i);
                $("#showDeltasDiv").append(
                  "<br>" +
                    item.version +
                    ": " +
                    (item.type == "sql"
                      ? item.delta
                      : item.change + " " + item.delta)
                );
              }
              $("#showDeltasDiv").show();
              $("#hideDeltasButton").show();
            } else {
              kvm.msg("Keine Änderungen vorhanden");
              $("#showDeltasButton").show();
            }
            $("#showDeltasWaiting").hide();
          },
          (error) => {
            const msg = `Fehler in bei Abfrage der Deltas mit sql: ${sql} Fehler: ${
              error.message
            } code: ${(<any>error).code}`;
            console.error(msg);
            kvm.log(msg, 1);
            kvm.msg(msg, "Datenbank");
          }
        );
      } else {
        kvm.msg(
          `Der Layer ${kvm.activeLayer.title} hat keine Änderungen weil auf dem Server keine Rechte zum Ändern von Datensätzen des Layers eingestellt wurden.`,
          "Datenbank"
        );
      }
    });

    $("#hideDeltasButton").on("click", function () {
      $("#hideDeltasButton").hide();
      $("#showDeltasDiv").hide();
      $("#showDeltasButton").show();
    });

    $("#showLoggingsButton").on("click", function () {
      kvm.showItem("loggings");
    });

    $("#zoomToCurrentLocation").on("click", function () {
      console.log("zoomToCurrentLocation");
      kvm.showItem("map");
      kvm.map.locate({ setView: true, maxZoom: 16 });
    });

    $("#clearLoggingsButton").on("click", function () {
      $("#logText").html("Log geleert: " + new Date().toUTCString());
      kvm.showItem("loggings");
    });

    $("#showSperrDivButton").on("click", function () {
      $("#sperr_div").show();
    });

    /*
     * Bricht Änderungen im Formular ab,
     * - läd das Feature neu in das Formular im Anzeigemodus
     * - Löscht die editable Geometrie in der Karte
     * - setzt saveFeatureButton wieder auf inactiv
     */
    $("#cancelFeatureButton").on("click", { context: this }, function (evt) {
      console.log("cancelFeatureButton geklickt.");
      const this_ = evt.data.context;
      //console.log("Änderungen verwerfen.");
      const activeLayer = this_.activeLayer;
      const activeFeature = activeLayer.activeFeature;
      const featureId = activeFeature.id;

      const changes = activeLayer.collectChanges(
        activeFeature.new ? "insert" : "update"
      );
      if (changes.length > 0) {
        navigator.notification.confirm(
          "Änderungen verwerfen?",
          (buttonIndex) => {
            //console.log("Änderungen verwerfen.");
            if (buttonIndex == 1) {
              kvm.cancelEditFeature();
            }
            if (buttonIndex == 2) {
              // nein
              // Do nothing
            }
          },
          "Eingabeformular schließen",
          ["ja", "nein"]
        );
      } else {
        kvm.cancelEditFeature();
      }
    });

    $("#statusFilterSelect").on("change", function (evt) {
      kvm.store.setItem(
        "statusFilter",
        $("#statusFilterSelect").val().toString()
      );
      kvm.activeLayer.readData($("#limit").val(), $("#offset").val());
    });

    $("#toggleFilterDivButton").on("click", function () {
      $("#filterDiv").toggle();
      $("#toggleFilterDivButton").val(
        $("#toggleFilterDivButton").val() == "mehr" ? "weniger" : "mehr"
      );
    });

    $("#runFilterButton").on("click", function () {
      kvm.store.setItem(
        "layerFilter",
        JSON.stringify(kvm.composeLayerFilter())
      );
      kvm.activeLayer.readData($("#limit").val(), $("#offset").val());
    });

    $("#anzeigeSortSelect").on("change", function (evt) {
      kvm.store.setItem(
        "sortAttribute",
        $("#anzeigeSortSelect").val().toString()
      );
      kvm.activeStelle.readAllLayers = false;
      kvm.activeLayer.readData($("#limit").val(), $("#offset").val());
    });

    $("#deleteFeatureButton").on("click", function (evt) {
      //kvm.log("Klick auf deleteFeatureButton.", 4);
      if (kvm.activeLayer && kvm.activeLayer.hasDeletePrivilege) {
        navigator.notification.confirm(
          "Datensatz wirklich Löschen?",
          function (buttonIndex) {
            if (buttonIndex == 1) {
              let id_attribute = kvm.activeLayer.get("id_attribute");
              // ja
              console.log(
                "Lösche Feature " +
                  id_attribute +
                  ": " +
                  kvm.activeLayer.activeFeature.getDataValue(id_attribute)
              );
              kvm.controller.mapper.clearWatch();
              kvm.activeLayer.runDeleteStrategy();

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
        navigator.notification.confirm(
          "Sie haben nicht das Recht zum Löschen von Datensätzen in diesem Layer!",
          function (buttonIndex) {},
          "Datenbank",
          ["habe Verstanden"]
        );
      }
    });

    $("#saveFeatureButton").on("click", function (evt) {
      let notNullErrMsg = kvm.activeLayer.notNullValid();

      if (notNullErrMsg != "") {
        kvm.msg(notNullErrMsg, "Formular");
        return false;
      }

      if (
        kvm.activeLayer.hasGeometry &&
        !$(
          "#featureFormular input[name=" +
            kvm.activeLayer.get("geometry_attribute") +
            "]"
        ).val()
      ) {
        kvm.msg("Sie haben noch keine Koordinaten erfasst!", "Formular");
        return false;
      }

      let action = kvm.activeLayer.activeFeature.new ? "insert" : "update";
      if (kvm.config.confirmSave) {
        navigator.notification.confirm(
          "Datensatz Speichern?",
          (buttonIndex) => {
            console.log("Datensatz Speichern buttonIndex: ", buttonIndex);
            const activeFeature = kvm.activeLayer.activeFeature;
            const editableLayer = kvm.activeLayer.activeFeature.editableLayer;
            if (buttonIndex != 2) {
              if (activeFeature.layer.settings.geometry_type == "Line") {
                let speichern = true;
                if (activeFeature.layerId) {
                  speichern =
                    (<any>kvm.map)._layers[
                      activeFeature.layerId
                    ].getLatLngs() != editableLayer.getLatLngs();
                }
                if (speichern) {
                  editableLayer.fireEvent(
                    "isChanged",
                    editableLayer.getLatLngs()
                  );
                }
              }
              if (action == "insert") {
                kvm.activeLayer.runInsertStrategy();
              } else {
                kvm.activeLayer.runUpdateStrategy();
              }
            }
          },
          kvm.activeLayer.title,
          ["Speichern", "Abbruch"]
        );
      } else {
        if (action == "insert") {
          kvm.activeLayer.runInsertStrategy();
        } else {
          kvm.activeLayer.runUpdateStrategy();
        }
      }
    });

    $("#kvwmapServerDataForm > input").on("keyup", function () {
      if ($("#saveServerSettingsButton").hasClass("settings-button")) {
        $("#saveServerSettingsButton").toggleClass(
          "settings-button settings-button-active"
        );
      }
    });

    $("#showFeatureList").click(function () {
      kvm.showItem("featurelist");
    });

    $("#showFeatureList").mouseover(function () {
      $("#showFeatureList_button").hide();
      $("#showFeatureList_button_white").show();
    });

    $("#showFeatureList").mouseleave(function () {
      $("#showFeatureList_button").show();
      $("#showFeatureList_button_white").hide();
    });

    $("#newFeatureButton").on("click", function () {
      const layer = kvm.activeLayer;
      layer.newFeature();
      // console.log('activeFeature after newFeature: %o', kvm.activeLayer.activeFeature);
      layer.editFeature(layer.activeFeature.id);
      //kvm.showGeomStatus();
    });

    $("#tplFeatureButton").on("click", function () {
      const layer = kvm.activeLayer;
      const tplId = layer.activeFeature.id;
      layer.newFeature();
      layer.editFeature(tplId);
      layer.loadTplFeatureToForm(tplId);
      //kvm.showGeomStatus();
    });

    /*
     * Läd das Formular im Editiermodus
     */
    $("#editFeatureButton").on("click", { context: this }, function (evt) {
      let this_ = evt.data.context;
      const layer = kvm.activeLayer;
      layer.editFeature(layer.activeFeature.id);
    });

    $("#restoreFeatureButton").on("click", function () {
      navigator.notification.confirm(
        "Wollen Sie den Datensatz wiederherstellen? Ein vorhandener mit der gleichen uuid wird dabei überschrieben!",
        function (buttonIndex) {
          if (buttonIndex == 1) {
            // ja
            $("#sperr_div_content").html(
              "Wiederherstellung von Datensätzen ist noch nicht implementiert!"
            );
            kvm.activeLayer.runRestoreStrategy();
            $("#sperr_div").show();
            setTimeout(function () {
              kvm.closeSperrDiv();
            }, 3000);
          } else {
            kvm.closeSperrDiv();
          }
        },
        "Datensatz wiederherstellen",
        ["ja", "nein"]
      );
    });

    /* Clientside Filter according to http://stackoverflow.com/questions/12433835/client-side-searching-of-a-table-with-jquery */
    /*** Search Feature ***/
    $("#searchFeatureField").on("keyup paste change search", function () {
      const needle = $(this).val().toString().toLowerCase(),
        haystack = $(".feature-item");

      haystack.each(function (index) {
        $(this).html().toLowerCase().indexOf(needle) > -1
          ? $(this).show()
          : $(this).hide();
      });
    });

    $("#showSearch").on("click", function () {
      $("#searchFeatureField").toggle();
    });

    $("#geoLocationButton").on("click", kvm.getGeoLocation);

    $("#cameraOptionsQualitySlider").on("input", function () {
      $("#cameraOptionsQuality").html((<any>this).value);
    });

    $("#minTrackDistanceSlider").on("input", function () {
      $("#minTrackDistance").html((<any>this).value);
    });

    $("#fillOpacitySlider").on("input", function () {
      const newOpacity = (<any>this).value / 10,
        markerStyles = JSON.parse(kvm.store.getItem("markerStyles"));

      //console.log('New fillOpacity: ', newOpacity);
      $("#fillOpacitySpan").html(newOpacity.toString());
      for (let index in markerStyles) {
        markerStyles[index].fillOpacity = newOpacity;
      }
      kvm.store.setItem("markerStyles", JSON.stringify(markerStyles));
    });

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
                kvm.msg(
                  `Fehler beim anlegen der neuen leeren Datenbank: ${error}`
                );
              }
            );

            if (kvm._layers.size === 0) {
              kvm.msg("Keine Layer zum löschen vorhanden.");
            } else {
              kvm._layers.forEach((layer) => {
                console.log("Entferne Layer: %s", layer.get("title"));
                layer.removeFromApp();
              });
            }
            kvm._layers = new Map();
            $("#layer_list").html("");
            kvm.activeLayer = kvm.activeStelle = undefined;
            window.localStorage.clear();
            kvm.store = window.localStorage;
            kvm.initLocalBackupPath();
            kvm.initStatusFilter();
            kvm.initColorSelector();
            kvm.msg(
              "Fertig!\nStarten Sie die Anwendung neu und fragen Sie die Stelle und Layer unter Einstellungen neu ab.",
              "Reset Datenbank und Einstellungen"
            );
          }
          if (buttonIndex == 2) {
            // nein
            kvm.msg(
              "Ok, nichts passiert!",
              "Reset Datenbank und Einstellungen"
            );
          }
        },
        "Reset Datenbank und Einstellungen",
        ["ja", "nein"]
      );
    });

    if (document.getElementById("downloadBackgroundLayerButton")) {
      document
        .getElementById("downloadBackgroundLayerButton")
        .addEventListener("click", (evt) => {
          const offlineLayerId = (<HTMLElement>evt.currentTarget).getAttribute(
            "value"
          );
          navigator.notification.confirm(
            "Alle Vektorkacheln vom Projektgebiet herunterladen? Vergewissern Sie sich, dass Sie in einem Netz mit guter Anbindung sind.",
            function (buttonIndex) {
              if (buttonIndex === 1) {
                if (navigator.onLine) {
                  // ja
                  //kvm.msg("Ich beginne mit dem Download der Kacheln.", "Kartenverwaltung");
                  document.getElementById("sperr_div").style.display = "block";
                  let sperrDivContent =
                    document.getElementById("sperr_div_content");
                  sperrDivContent.innerHTML =
                    '<b>Kartenverwaltung</b><br><br>Download der Kacheln:<br><br><div id="sperr_div_progress_div"></div>';
                  let sperrDivProgressDiv = document.getElementById(
                    "sperr_div_progress_div"
                  );
                  // hide the button and show a progress div
                  // find p1, p2 and zoom levels to fetch data in layer configuration
                  // get urls for vector tiles to download
                  // download the files in background and update the progress div
                  // confirm the finish
                  // hide the progress div and show the delete and update button
                  const bl = kvm.backgroundLayerSettings.filter(function (l) {
                    return l.layer_id == offlineLayerId;
                  })[0];
                  const params = bl.params;
                  let key = "";

                  //console.log('Fetch vector tiles for p1: %s,%s p2: %s,%s', params.south, params.west, params.north, params.east);
                  const tileLinks = [];

                  for (let z = params.minZoom; z <= params.maxNativeZoom; z++) {
                    //console.log('Zoom level: %s', z);
                    kvm
                      .getTilesUrls(
                        new LatLng(params.south, params.west),
                        new LatLng(params.north, params.east),
                        z,
                        bl.url
                      )
                      .forEach((url) => tileLinks.push(url));
                  }
                  let i = 0;
                  const iSoll = tileLinks.length;
                  console.log(
                    "Anzahl der herunter zu ladenden Kacheln:" + iSoll
                  );

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
                      document.getElementById("sperr_div_content").innerHTML =
                        "";
                      document.getElementById("sperr_div").style.display =
                        "none";
                      kvm.msg("Download abgeschlossen!", "Kartenverwaltung");
                    }
                  }
                  download();
                } else {
                  kvm.msg(
                    "Kein Internet! Stellen Sie eine Internetverbindung her.",
                    "Kartenverwaltung"
                  );
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

    $("#featurelistHeading").on("click", (evt) => {
      if (kvm.activeLayer.hasActiveFeature()) {
        kvm.map.closePopup();
      }
    });

    // siehe auch function closeSperrDiv()
    $("#sperr_div").on("dblclick", function (evt) {
      navigator.notification.confirm(
        "Sperrbildschirm aufheben?",
        function (buttonIndex) {
          if (buttonIndex == 1) {
            // ja
            $("#sperr_div").hide();
          }
          if (buttonIndex == 2) {
            // nein
            // Do nothing
            $("#sperr_dev").show();
          }
        },
        "",
        ["ja", "nein"]
      );
    });

    console.log("Register click event on .toggle-settings-div");
    $(".toggle-settings-div").on("click", () => {
      console.log("clicked on toggle-settings-div");
      kvm.toggleSwitchableSettings();
    });
  }

  bindFeatureItemClickEvents() {
    //kvm.log("bindFeatureItemClickEvents", 4);
    $(".feature-item").on("click", kvm.featureItemClickEventFunction);
  }

  featureItemClickEventFunction(evt) {
    console.log("featureItemClickEvent on feature id: %o", evt.target.id);
    const feature = kvm.activeLayer.getFeature(evt.target.id);
    kvm.showItem(
      kvm.activeLayer.hasGeometry &&
        feature.getDataValue(kvm.activeLayer.get("geometry_attribute")) !=
          "null"
        ? "map"
        : "dataView"
    );
    kvm.activeLayer.activateFeature(feature, true);
  }

  backupDatabase(filename = "", msg = "") {
    console.log("Sichere Datenbank");
    let srcDir = cordova.file.applicationStorageDirectory + "databases/";
    let srcFile = "kvmobile.db";
    let dstDir =
      kvm.store.getItem("localBackupPath") || kvm.config.localBackupPath;
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
        kvm.msg(
          "Fehler beim Löschen der Datenbank: " + JSON.stringify(error),
          "Fehler"
        );
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
    const activeLayer = kvm.activeLayer;
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
    const layer = kvm.getLayer(layerId);
    const feature = layer.getFeature(featureId);
    if (feature) {
      layer.activateFeature(feature, false);
      kvm.showItem("dataView");
    } else {
      kvm.msg(
        `Objekt mit der ID: ${featureId} im Layer ${layer.title} nicht gefunden. Das Objekt ist möglicherweise durch einen Filter ausgeschaltet.`,
        "Sachdatenanzeige"
      );
    }
  }

  /**
   * Function open form to create a new feature for a subLayer.
   * If activeFeature has open changes a confirm dialog comes up.
   * Input form only open if user confirm else nothing happens.
   */
  newSubFeature(
    options = { parentLayerId: "", subLayerId: "", fkAttribute: "" }
  ) {
    if (this.activeLayer && this.activeLayer.activeFeature) {
      const changes = this.activeLayer.collectChanges("update");
      if (changes.length > 0) {
        navigator.notification.confirm(
          "Es sind noch offene Änderungen. Diese müssen erst gespeichert werden.",
          (buttonIndex) => {
            if (buttonIndex == 1) {
              // Abbrechen
            }
            if (buttonIndex == 2) {
              // Fortfahren ohne Speichern
              this.activeLayer.newSubDataSet(options);
            }
          },
          "Formular",
          ["Abbrechen", "Ohne Speichern Fortfahren"]
        );
      } else {
        this.activeLayer.newSubDataSet(options);
      }
    } else {
      this.activeLayer.newSubDataSet(options);
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
    if (kvm.activeLayer && kvm.activeLayer.activeFeature) {
      layer.parentLayerId = kvm.activeLayer.getGlobalId();
      layer.parentFeatureId = kvm.activeLayer.activeFeature.id;
      const changes = kvm.activeLayer.collectChanges(
        kvm.activeLayer.activeFeature.new ? "insert" : "update"
      );
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

  setConnectionStatus() {
    //kvm.log("setConnectionStatus");
    NetworkStatus.load();
  }

  setGpsStatus() {
    //kvm.log("setGpsStatus");
    GpsStatus.load();
  }

  loadLogLevel() {
    //kvm.log("Lade LogLevel", 4);
    let logLevel = kvm.store.getItem("logLevel");
    if (logLevel == null) {
      logLevel = kvm.config.logLevel;
      kvm.store.setItem("logLevel", logLevel);
    }
    $("#logLevel").val(logLevel);
  }

  openLogFile() {
    window.resolveLocalFileSystemURL(
      kvm.store.getItem("localBackupPath") || kvm.config.localBackupPath,
      (dirEntry) => {
        console.log(dirEntry);
        (<DirectoryEntry>dirEntry).getFile(
          "kvmobile_logfile.txt",
          { create: true, exclusive: false },
          (fileEntry) => {
            console.log(fileEntry);
            kvm.logFileEntry = fileEntry;
          }
        );
      }
    );
  }

  /**
   * Function load the given layer parameter to the settings field for layerparamer
   * Set the currently selected or default value and set it also in kvm.layerParams
   * @param layerParamSettings
   * @param layerParams
   */
  loadLayerParams(layerParamSettings, layerParams = []) {
    let layerParamsDiv = $("#h2_layerparams").parent();
    if (layerParamSettings && Object.keys(layerParamSettings).length > 0) {
      let layerParamsList = $("#layer_prams_list");
      layerParamsList.html("");
      Object.keys(layerParamSettings).forEach((key) => {
        let paramSetting = layerParamSettings[key];
        let savedValue = key in layerParams ? layerParams[key] : null; // übernehme gespeicherten Wert wenn er existiert
        kvm.layerParams[key] = savedValue || paramSetting.default_value; // setze gespeicherten oder wenn leer dann den default Wert.

        let labelElement = $(
          `<div class="form-label><label for="${key}">${paramSetting.alias}</label></div>`
        );
        let valueElement = $(`
          <div class="form-value">
            <select id="${key}" name="${key}" onchange="kvm.saveLayerParams(this)">
              ${paramSetting.options
                .map((option) => {
                  return `<option value="${option.value}"${
                    kvm.layerParams[key] == option.value ? " selected" : ""
                  }>${option.output}</option>`;
                })
                .join("")}
            </select>
          </div>
        `);
        layerParamsList.append(labelElement).append(valueElement);
      });
      layerParamsDiv.show();
    } else {
      layerParamsDiv.hide();
    }
  }

  saveLayerParams(paramElement) {
    console.log("saveLayerParams");
    // Set changed param to kvm Object
    kvm.layerParams[paramElement.name] = $(paramElement).val();
    // Save all params in store
    const selectFields = $("#layer_prams_list select");
    const layerParams = {};
    selectFields.each((index, selectField: any) => {
      layerParams[selectField.name] = $(selectField).val();
    });
    kvm.store.setItem(
      `layerParams_${kvm.activeStelle.get("id")}`,
      JSON.stringify(layerParams)
    );
  }

  async loadDeviceData() {
    //kvm.log("loadDeviceData", 4);
    (<any>cordova).getAppVersion.getVersionNumber((versionNumber) => {
      $("#cordovaAppVersion").html(versionNumber);
      document.title = "kvmobile " + versionNumber;
      kvm.versionNumber = versionNumber;
    });
    $("#deviceCordova").html(device.cordova);
    $("#deviceModel").html(device.model);
    $("#devicePlatform").html(device.platform);
    $("#deviceUuid").html(device.uuid);
    $("#deviceVersion").html(device.version);
    $("#deviceManufacturer").html(device.manufacturer);
    $("#deviceSerial").html(device.serial);
    $("#applicationDirectory").html(cordova.file.applicationDirectory);
    $("#applicationStorageDirectory").html(
      cordova.file.applicationStorageDirectory
    );
    $("#dataDirectory").html(cordova.file.dataDirectory);
    $("#cacheDirectory").html(cordova.file.cacheDirectory);
    $("#externalApplicationStorageDirectory").html(
      cordova.file.externalApplicationStorageDirectory
    );
    $("#externalDataDirectory").html(cordova.file.externalDataDirectory);
    $("#externalCacheDirectory").html(cordova.file.externalCacheDirectory);
    $("#externalRootDirectory").html(cordova.file.externalRootDirectory);
    $("#tempDirectory").html(cordova.file.tempDirectory);
    $("#syncedDataDirectory").html(cordova.file.syncedDataDirectory);
    $("#documentsDirectory").html(cordova.file.documentsDirectory);
    $("#sharedDirectory").html(cordova.file.sharedDirectory);
    $("#sqlLiteVersion").html(await this.getSqliteVersion());
    $("#spatialLiteVersion").html(await this.getSpatialLiteVersion());
  }

  async getSpatialLiteVersion() {
    try {
      const rs = await executeSQL(
        this.db,
        "SELECT spatialite_version() as version"
      );
      return <string>rs.rows.item(0).version;
    } catch (err) {
      return "Kann nicht ermittelt werden. Fehler: " + err.message;
    }
  }
  async getSqliteVersion() {
    try {
      const rs = await executeSQL(
        this.db,
        "SELECT sqlite_version() as version"
      );
      return <string>rs.rows.item(0).version;
    } catch (err) {
      return "Kann nicht ermittelt werden. Fehler: " + err.message;
    }
  }

  showActiveItem() {
    return this.showItem(
      ["settings", "map", "featurelist"].includes(
        kvm.store.getItem("activeView")
      )
        ? kvm.store.getItem("activeView")
        : "featurelist"
    );
  }

  showNextItem(viewAfter, layer): void {
    console.log(`showNextItem ${viewAfter}`);
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

  showItem(item): void {
    console.log("showItem: %o", item);
    // erstmal alle panels ausblenden
    $(".panel").hide();
    if (["map", "mapEdit"].indexOf(item) === -1) {
      $("#geolocation_div").hide();
    }
    switch (item) {
      case "settings":
        kvm.showDefaultMenu();
        kvm.showSettingsDiv("layer");
        $("#settings").show();
        break;
      case "loggings":
        kvm.showDefaultMenu();
        $("#loggings").show();
        break;
      case "featurelist":
        kvm.showDefaultMenu();
        $("#featurelist").show();
        kvm.lastMapOrListView = "featurelist";
        break;
      case "map":
        kvm.showDefaultMenu();
        $("#map").show();
        // if (kvm.activeLayer && kvm.activeLayer.activeFeature) {
        // 	kvm.activeLayer.activeFeature.zoomTo(false);
        // }
        if (
          $("#geolocation_div").html() != "" &&
          $("#geolocation_div").is(":visible") === false
        ) {
          $("#geolocation_div").show();
        }
        kvm.map.invalidateSize();
        kvm.lastMapOrListView = "map";
        break;
      case "mapEdit":
        $(".menu-button").hide();
        $(
          "#showFormEdit, #saveFeatureButton, #saveFeatureButton, #cancelFeatureButton"
        ).show();
        if (
          kvm.activeLayer &&
          kvm.activeLayer.hasDeletePrivilege &&
          !kvm.activeLayer.activeFeature.new
        ) {
          $("#deleteFeatureButton").show();
        }
        $("#map").show();
        kvm.map.invalidateSize();
        // kvm.map.zoomOut();
        // kvm.map.zoomIn();
        break;
      case "dataView":
        $(".menu-button").hide();
        $("#showSettings, #showFeatureList, #showMap").show();
        if ($("#historyFilter").is(":checked")) {
          $("#restoreFeatureButton").show();
        } else {
          if (kvm.activeLayer.hasEditPrivilege) {
            // erstmal rausgenommen weil es zu Fehler führen kann.
            // klären was mit den die Kopiert wird passiert beim Speichern und Sync.
            // $("#editFeatureButton, #tplFeatureButton").show();
            $("#editFeatureButton").show();
          } else {
            $("#newFeatureButton").hide();
          }
        }
        $("#dataView").show().scrollTop(0);
        kvm.lastMapOrListView = "dataView";
        break;
      case "formular":
        $(".menu-button").hide();
        $("#saveFeatureButton, #cancelFeatureButton").show();
        if (kvm.activeLayer && kvm.activeLayer.hasGeometry) {
          $("#showMapEdit").show();
        } else {
          $("#showMapEdit").hide();
        }
        if (
          kvm.activeLayer &&
          kvm.activeLayer.hasDeletePrivilege &&
          !kvm.activeLayer.activeFeature.new
        ) {
          $("#deleteFeatureButton").show();
        }
        $("#formular").show().scrollTop(0);
        break;
      default:
        kvm.showDefaultMenu();
        $("#settings").show();
    }
    kvm.store.setItem("activeView", item);
  }

  collapseAllSettingsDiv() {
    $(".h2-div > h2").removeClass("b-expanded").addClass("b-collapsed");
    $(".h2-div + div").hide();
  }

  expandAllSettingsDiv() {
    $(".h2-div > h2").removeClass("b-collapsed").addClass("b-expanded");
    $(".h2-div + div").show();
  }

  hideSettingsDiv(name) {
    const target = $(".h2_" + name);
    this.collapseAllSettingsDiv();
    target.removeClass("b-expanded").addClass("b-collapsed");
    target.parent().next().hide();
  }

  showSettingsDiv(name) {
    const target = $("#h2_" + name);
    this.collapseAllSettingsDiv();
    target.removeClass("b-collapsed").addClass("b-expanded");
    target.parent().next().show();
    $("#settings").scrollTop(target.offset().top);
    if (name == "layer") {
      $("#switchable_settings_div").hide();
      $("#toggle_weniger").hide();
      $("#toggle_mehr").show();
      $(".layer-functions-button").removeClass(
        "fa-ellipsis-vertical, fa-square-xmark"
      );
      $(".layer-functions-button").addClass("fa-ellipsis-vertical");
      $(".layer-functions-div").hide();
    }
  }

  toggleSwitchableSettings() {
    $("#switchable_settings_div, .toggle-settings-div").toggle();
  }

  showDefaultMenu() {
    $(".menu-button").hide();
    //  $("#backArrow, #saveFeatureButton, #deleteFeatureButton, #backToFormButton").hide();
    $("#showSettings, #showFeatureList, #showMap").show();
    if (kvm.activeLayer && kvm.activeLayer.hasEditPrivilege) {
      $("#newFeatureButton").show();
    } else {
      $("#newFeatureButton").hide();
    }
  }

  showFormMenu() {
    $(".menu-button").hide();
    $("#showFeatureList, #showMap, #saveFeatureButton").show();
    if (kvm.activeLayer && kvm.activeLayer.hasDeletePrivilege) {
      $("#deleteFeatureButton").show();
    }
  }

  getGeoLocation() {
    navigator.geolocation.getCurrentPosition(
      kvm.getGeoLocationOnSuccess,
      kvm.getGeoLocationOnError
    );
  }

  getGeoLocationOnSuccess(geoLocation) {
    $("#geoLocation").val(
      geoLocation.coords.latitude + " " + geoLocation.coords.longitude
    );
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

    kvm.activeLayer.readData(limit, page);

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
    if (kvm.activeStelle) {
      return s.replace(
        kvm.activeStelle.settings.passwort,
        "secretPwFromStelleSetting"
      );
    } else {
      if ($("#kvwmapServerPasswortField").val()) {
        return s.replace(
          $("#kvwmapServerPasswortField").val(),
          "secretPwFromForm"
        );
      } else {
        return s;
      }
    }
  }

  uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  openSperrDiv(msg = "") {
    $("#sperr_div").show();
    if (msg) {
      this.tick(`<b>${msg}</b>`, false);
    }
  }

  tick(msg, append = true) {
    msg = this.replacePassword(msg);
    if (append) {
      $("#sperr_div_content").append("<br>" + msg);
    } else {
      $("#sperr_div_content").html(msg);
    }
  }

  closeSperrDiv(msg = "") {
    if (msg) {
      navigator.notification.confirm(
        msg,
        function (buttonIndex) {
          if (buttonIndex == 1) {
            $("#sperr_div").hide();
          }
        },
        "Laden",
        ["OK"]
      );
    } else {
      $("#sperr_div").hide();
    }
  }

  log(
    msg: any,
    level = 3,
    show_in_sperr_div: boolean = false,
    append: boolean = false
  ) {
    if (
      level <=
        (typeof kvm.store == "undefined"
          ? kvm.config.logLevel
          : kvm.store.getItem("logLevel")) &&
      (typeof msg === "string" || msg instanceof String)
    ) {
      msg = this.replacePassword(msg);
      if (kvm.config.debug) {
        console.log("Log msg: " + msg);
      }
      setTimeout(function () {
        $("#logText").append(`<br>${kvm.now(" ", "", ":")}: ${msg}`);
        if (show_in_sperr_div) {
          $("#sperr_div").show();
          if (append) {
            $("#sperr_div_content").append("<br>" + msg);
          } else {
            $("#sperr_div_content").html(msg);
          }
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
          $("#sperr_div_content").html(msg);
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
      navigator.notification.confirm(msg, function (buttonIndex) {}, title, [
        "ok",
      ]);
    }
  }

  mapHint(msg, delay = 3000, duration = 1000) {
    $("#map_hint_div").html(msg).show().delay(delay).fadeOut(duration);
  }

  deb(msg) {
    $("#debText").append("<p>" + msg);
    //$(document).scrollBottom($('#debText').offset().bottom);
    if ($("#show_allways_debug_messages").is(":checked")) {
      $("#debugs").show();
    }
  }

  coalesce(...t: any[]) {
    for (let i = 0; i < arguments.length; i++) {
      const arg = arguments[i];
      if (
        arg !== "null" &&
        arg !== null &&
        arg !== undefined &&
        (typeof arg !== "number" || arg.toString() !== "NaN")
      ) {
        return arg;
      }
    }
    return null;
  }

  coalempty(...t: any[]) {
    for (let i = 0; i < arguments.length; i++) {
      const arg = arguments[i];
      if (
        arg !== "" &&
        arg !== "null" &&
        arg !== null &&
        arg !== undefined &&
        (typeof arg !== "number" || arg.toString() !== "NaN")
      ) {
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

  parseLayerResult(layerResult) {
    //kvm.log("Starte parseLayerResult", 4);
    let resultObj = {
      success: false,
      errMsg: undefined,
    };

    if (layerResult.indexOf('form name="login"') > -1) {
      // kvm.log('form name="login" gefunden!', 4);
      resultObj.errMsg =
        "Zugang zum Server verweigert! Prüfen Sie Ihre Zugangsdaten unter Einstellungen.";
      return resultObj;
    }

    if (!kvm.isValidJsonString(layerResult)) {
      // kvm.log("Das Ergebnis der Layerdatenanfrage ist kein JSON!", 4);
      resultObj.errMsg =
        "Fehler beim Abfragen der Layerdaten. Abfrage liefert keine korrekten Daten vom Server. Entweder sind keine auf dem Server vorhanden, die URL der Anfrage ist nicht korrekt oder der es wird eine Fehlermeldung vom Server geliefert statt der Daten.\nURL der Anfrage:\n" +
        kvm.activeStelle.getLayerUrl({ hidePassword: true }) +
        "\nZurückgelieferte Result:\n" +
        layerResult;
      return resultObj;
    }

    resultObj = JSON.parse(layerResult);

    if (!resultObj.success) {
      kvm.log("Result success ist false!", 4);
      resultObj.errMsg =
        "Fehler beim Abfragen der Layerdaten. Falsche Serverparameter, Authentifizierungsfehler oder Fehler auf dem Server.";
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
    const result =
      kvm.config.localImgPath + src.substring(src.lastIndexOf("/") + 1);
    //kvm.log("kvm.serverToLocalPath convert: " + src + " to: " + result, 4);
    return result;
  }

  /*
   * Replace local image path by servers image path
   */
  localToServerPath(src) {
    //kvm.log("kvm.localToServerPath src: " + src, 4);
    const result =
      kvm.activeLayer.get("document_path") +
      src.substring(src.lastIndexOf("/") + 1);
    //kvm.log("Result: " + result, 4);
    return result;
  }

  /**
   * Function return a quotation mark if the given database type has to be used as string and requires quotation marks
   * @params string type The database type of an attribute
   * @return string If it is a string returns a single quotation mark "'" if not or unknown returns an empty string ""
   */
  bracketForType(type) {
    return [
      "bpchar",
      "varchar",
      "text",
      "date",
      "timestamp",
      "geometry",
    ].indexOf(type) > -1
      ? "'"
      : "";
  }

  composeLayerFilter() {
    const filter = kvm.activeLayer.attributes
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
    return `${jahr}-${monat}-${tag}${datePrefix}${[
      stunde,
      minute,
      sekunde,
    ].join(timeSeparator)}${timePrefix}`;
  }

  today(): string {
    const now = new Date();
    return (
      now.getFullYear() +
      "-" +
      String("0" + (now.getMonth() + 1).toString()).slice(-2) +
      "-" +
      String("0" + now.getDate()).slice(-2)
    );
  }

  /*
   * Zeigt die verschiedenen Werte der Geometrie
   */
  showGeomStatus() {
    if (kvm.activeLayer && kvm.activeLayer.activeFeature) {
      console.log(
        "activeFeature.point %o",
        kvm.activeLayer.activeFeature.getDataValue("point")
      );
      console.log(
        "activeFeature.oldGeom %o",
        kvm.activeLayer.activeFeature.oldGeom
      );
      console.log("activeFeature.geom %o", kvm.activeLayer.activeFeature.geom);
      console.log(
        "activeFeature.newGeom %o",
        kvm.activeLayer.activeFeature.newGeom
      );
      console.log("form geom_wkt: %s", $("#geom_wkt").val());
      // TODO ???
      console.log(
        "form " + (<any>kvm.activeLayer).get("geometry_attribute") + ": %s",
        $(
          '.form-field [name="' +
            kvm.activeLayer.get("geometry_attribute") +
            '"]'
        ).val()
      );
    }
    if (kvm.activeLayer.activeFeature.editableLayer) {
      console.log(
        "editableLayer: %o",
        kvm.activeLayer.activeFeature.editableLayer.getLatLng()
      );
    }
  }

  rgbToHex(rgb) {
    const parts = rgb.split(" "),
      componentToHex = function (c) {
        const hex = parseInt(c).toString(16);
        return hex.length == 1 ? "0" + hex : hex;
      };
    return (
      "#" +
      componentToHex(parts[0]) +
      componentToHex(parts[1]) +
      componentToHex(parts[2])
    );
  }
}

// kvm.loadHeadFile("js/controller/mapper.js", "js");
// kvm.loadHeadFile("js/controller/files.js", "js");

export const kvm = new Kvm();
window["kvm"] = kvm;

export function createHtmlElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  parent?: HTMLElement,
  className?: string,
  mixin?: any
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (parent) {
    parent.appendChild(el);
  }
  if (className) {
    el.className = className;
  }
  if (mixin) {
    for (const k in mixin) {
      el[k] = mixin[k];
    }
  }
  return el;
}

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

if (
  document.readyState === "interactive" ||
  document.readyState === "complete"
) {
  kvm.init();
}

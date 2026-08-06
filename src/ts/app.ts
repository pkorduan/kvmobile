/// <reference types="cordova-plugin-device"/>
/// <reference types="cordova-plugin-dialogs"/>
/// <reference types="@types/cordova"/>
/// <reference types="cordova-plugin-inappbrowser"/>
/// <reference types="cordova-plugin-file"/>
/// <reference types="cordova-plugin-android-fingerprint-auth"/>
/// <reference types="@types/cordova-sqlite-storage"/>
/// <reference types="@types/leaflet.locatecontrol"/>
/// <reference types="@types/proj4leaflet"/>
/// <reference types="cordova-plugin-app-version"/>

/// <reference types="./type"/>

import * as idb from "idb";
import { Configuration, configurations } from "./configurations";
import { BackgroundGeolocation } from "@awesome-cordova-plugins/background-geolocation/ngx";
import { GpsStatus } from "./gpsStatus";
import { Stelle } from "./Stelle";
import { BackgroundLayerSetting, Layer, LayerSetting } from "./Layer";
import { BackgroundLayer, prepareBackgrounLayer } from "./BackgroundLayer";
import { NetworkStatus } from "./networkStatus";
import { FileUtils } from "./controller/files";
import { Mapper } from "./controller/mapper";
import maplibregl from "maplibre-gl";
import "process";
import { MapLibreLayer } from "./MapLibreLayer";
import { Control, DomUtil, Events, LatLngBounds, LayersControlEvent, LeafletEvent, ErrorEvent as LErrorEvent, Map as LMap, Point as LPoint, Renderer, SVG } from "leaflet";
import { objectToString, sperrBildschirm } from "./SperrBildschirm";
import { Menu, ViewName } from "./Menu";
import { PropertyChangeEvent, PropertyChangeSupport } from "./Observable";
import { View } from "./views/View";
import * as PanelEinstellungen from "./views/PanelEinstellungen";

import { ViewFeatureList } from "./views/ViewFeatureList";
import { ViewEinstellungen } from "./views/ViewEinstellungen";
import { ViewLoggings } from "./views/ViewLoggings";
import { ViewMap } from "./views/ViewMap";
import { ViewDataView } from "./views/ViewDataView";
import { ViewFormular } from "./views/ViewFormular";
import { LayerCtrl } from "./LayerCtrl";
import { showInitScreen } from "./InitScreen";

import { AccessError, AgreementNotAcceptError, KVWMapServerConnection } from "./KVWMapServerConnection";
import { ImageLoader } from "./ImageLoader";
import * as Util from "./Util";

import ApkUpdater from "cordova-plugin-apkupdater";

import { Layer as LeafletLayer } from "leaflet";

require("leaflet");
require("leaflet.locatecontrol");
require("leaflet-betterscale");
require("leaflet-easybutton");
require("leaflet-editable");
require("leaflet-bing-layer");
import type from "leaflet-easybutton";
import { LatLng, LatLngExpression } from "leaflet";

import { executeSQL, getValueOfElement, tableExists } from "./Util";
import { Feature } from "./Feature";
import { StelleSettings } from "./views/PanelEinstellungen";

require("proj4leaflet");

require("@maplibre/maplibre-gl-leaflet");

export type MapSettings = {
  newPosSelect: any;
  minZoom: any;
  maxZoom: any;
  south: any;
  west: any;
  north: any;
  east: any;
  startCenterLat: any;
  startCenterLon: any;
  startZoom: any;
};

export class Kvm extends PropertyChangeSupport {
  static EVENTS = {
    ACTIVE_LAYER_CHANGED: "ACTIVE_LAYER_CHANGED",
    ACTIVE_FEATURE_CHANGED: "ACTIVE_FEATURE_CHANGED",
    ACTIVE_STELLE_CHANGED: "ACTIVE_STELE_CHANGED",
    ACTIVE_CONFIGURATION_CHANGED: "ACTIVE_CONFIGURATION_CHANGED",
    LAYER_ADDED: "LAYER_ADDED",
    LAYER_REMOVED: "LAYER_REMOVED",
  };

  controls: {
    layerCtrl?: LayerCtrl;
    locate?: Control.Locate;
    reloadLayers?: Control;
    zoomLevelControl?: Control;
    betterscale?: any;
    trackControl?: Control.EasyButton;
  } = {};
  controller = {
    mapper: new Mapper(),
  };

  views: View[] = [];

  layerDataLoaded: boolean = false;
  featureListLoaded: boolean = false;
  mapSettings: MapSettings;

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
  // _backgroundLayers: BackgroundLayer[] = [];
  _backgroundLayerSettings: BackgroundLayerSetting[];
  backgroundGeolocation: BackgroundGeolocation;
  isActive: boolean;
  // GpsIsOn: boolean = false;
  inputNextDataset: boolean = false;
  lastMapOrListView: ViewName = "featurelist";
  versionNumber: string;

  logFileEntry: FileEntry;
  userId: string;
  userName: string;
  appUrl: string = "https://gdi-service.de/public/kvmobile/";
  menu: Menu;
  gpsStatus: { status: string; geolocationPosition: GeolocationPosition; ok: boolean };
  networkStatus = NetworkStatus;
  viewEinstellungen: ViewEinstellungen;
  viewLoggings: ViewLoggings;
  viewMap: ViewMap;
  viewFeatureList: ViewFeatureList;
  viewDataView: ViewDataView;
  viewFormular: ViewFormular;
  isEditMode: boolean = false;

  serverConnection: KVWMapServerConnection;
  imageLoader: ImageLoader;

  debugLock = false;
  debugQueue: any[] = [];

  constructor() {
    super();
    this.serverConnection = new KVWMapServerConnection();
    this.imageLoader = new ImageLoader(this);
  }

  getLayer(globalLayerId: string) {
    return this._layers.get(globalLayerId);
  }

  getActiveLayer() {
    return this._activeLayer;
  }
  async setActiveLayer(layer: Layer): Promise<void>;
  async setActiveLayer(globalLayerId: string): Promise<void>;
  async setActiveLayer(layer: Layer | null | string): Promise<void> {
    if (typeof layer === "string") {
      layer = this.getLayer(layer);
    }
    if (this._activeLayer === layer) {
      console.log(`zzz app.setActiveLayer ${layer?.title} again`);
      return;
    }
    console.log(`zzz app.setActiveLayer ${layer?.title}`);
    const oldLayer = this._activeLayer;
    this._activeLayer = layer;
    if (layer) {
      layer.activate();
    }
    this.setActiveFeature(null);
    if (layer) {
      kvm.store.setItem("activeLayerId", layer.get("id"));
    } else {
      kvm.store.removeItem("activeLayerId");
    }
    await this.fire(new PropertyChangeEvent<Layer>(this, Kvm.EVENTS.ACTIVE_LAYER_CHANGED, oldLayer, layer));
  }

  getActiveFeature() {
    return this._activeFeature;
  }

  /**
   * gibt die Fremdschlüsselbeziehung zurück, wenn der Layer ein Parent hat.
   *
   * @param {(Layer | string)} layer
   * @returns {({ parentLayer: Layer; parentIdColumn: String; fkColumn: String; }|null)}
   */
  getParentFK(layer: Layer | string): { parentLayer: Layer; parentIdColumn: String; fkColumn: String } | null {
    if (typeof layer === "string") {
      layer = this.getLayer(layer);
    }
    if (layer) {
      return layer.getParentFK();
    }
    return null;
  }

  async activateFeature(layerId: string, featureId?: string): Promise<void> {
    return this.setActiveFeature(layerId, featureId);
  }

  async checkForUpdate() {
    try {
      const response = await fetch(kvm.appUrl);
      if (!response.ok) {
        throw new Error(`Die Seite ${kvm.appUrl} zur Ermittlung der letzten Programmversion konnte nicht abgefragt werden. Status-code: ${response.status} ${response.statusText}`);
      }
      const txt = await response.text();

      const regex = /href="k[^"]*"/g;
      const found = txt.match(regex);

      const sortFct = (a: string, b: string) => {
        const av = a.match(/\d+/g);
        const bv = b.match(/\d+/g);
        if (av[0] !== bv[0]) {
          return parseInt(av[0]) < parseInt(bv[0]) ? -1 : 1;
        }

        if (av[1] !== bv[1]) {
          return parseInt(av[1]) < parseInt(bv[1]) ? -1 : 1;
        }
        if (av[2] !== bv[2]) {
          return parseInt(av[2]) < parseInt(bv[2]) ? -1 : 1;
        }
      };

      found.sort(sortFct);
      const lastServerVersion = found[found.length - 1];
      const latestVersionNumber = lastServerVersion.match(/\d+\.\d+\.\d+/)[0];

      console.info("latestVersionNumber=" + latestVersionNumber + "   currentVersion=" + this.versionNumber + " " + (sortFct(latestVersionNumber, this.versionNumber) > 0));
      const version = await ApkUpdater.getInstalledVersion();
      console.info("version", version, lastServerVersion);

      let canRequestPackageInstalls = await ApkUpdater.canRequestPackageInstalls();
      console.info("canRequestPackageInstalls: " + canRequestPackageInstalls);
      if (!canRequestPackageInstalls) {
        const vv = await ApkUpdater.openInstallSetting();
        console.info("vv: " + vv);
        canRequestPackageInstalls = await ApkUpdater.canRequestPackageInstalls();
        console.info("canRequestPackageInstalls2: " + canRequestPackageInstalls);
      }

      if (Util.isHigherVersion(this.versionNumber, latestVersionNumber)) {
        try {
          const link = kvm.appUrl + lastServerVersion.split('"')[1];
          console.info(`try download ${link}.`);
          const downlodResult = await ApkUpdater.download(link);
          console.info(`downloaded`, downlodResult);

          const runLater = await Util.confirm(`Es ist eine neue App-Version ${latestVersionNumber} vorhanden.`, "Update-Info", "Später", "Installieren");
          if (!runLater) {
            // window.open(kvm.appUrl, "_system");
            const installResult = await ApkUpdater.install();
            console.info("installResult", installResult);
          }
        } catch (e) {
          console.error(e.message + "\n" + e.stack);
        }
      }
    } catch (ex) {
      Util.writeLog("ERR in checkForUpdate", ex);
      console.error("ERR in checkForUpdate", ex);
    }
  }

  /**
   * activates the feature.
   * @param layerId
   * @param featureId
   */
  async setActiveFeature(feature: Feature): Promise<void>;
  /**
   * activates the feature with featureId in layer with layerId.
   * @param layerId
   * @param featureId
   */
  async setActiveFeature(layerId: string, featureId: string): Promise<void>;
  async setActiveFeature(layerId: string | Feature, featureId?: string): Promise<void> {
    let feature: Feature;
    if (typeof layerId === "string") {
      const layer = kvm.getLayer(layerId);
      feature = featureId ? layer.getFeature(featureId) : null;
    } else {
      feature = layerId;
    }

    if (this._activeFeature === feature) {
      return;
    }
    const oldFeature = this._activeFeature;
    if (oldFeature) {
      oldFeature.deactivate();
    }
    if (feature) {
      this.setActiveLayer(feature.layer);
      this._activeFeature = feature;
      feature.activate(true);
    } else {
      this._activeFeature = null;
    }
    await this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.ACTIVE_FEATURE_CHANGED, oldFeature, feature));
  }

  async updateStelle(stelleSettings: PanelEinstellungen.StelleSettings) {
    console.info("updateStelle", stelleSettings);
    const stelle = new Stelle(stelleSettings);
    const oldLayer = this._activeLayer;
    if (this._activeStelle) {
      await this.clearStelle();
      this._activeFeature = null;
      this._activeLayer = null;
      this._activeStelle = null;
      await this.fire(new PropertyChangeEvent<Layer>(this, Kvm.EVENTS.ACTIVE_LAYER_CHANGED, oldLayer, null));
    }
    stelle.saveToStore();
    await this.setActiveStelle(stelle);
    await stelle.requestLayers();
  }

  async setActiveStelle(stelle: Stelle) {
    console.info(`setActiveStelle ${stelle?.get("ID")}`, stelle);
    const oldStelle = this._activeStelle;
    this._activeStelle = stelle;
    if (oldStelle) {
      this.store.removeItem("activeStelleId");
    }
    if (stelle) {
      this.store.setItem("activeStelleId", stelle.get("ID"));
      this.serverConnection.credential.stelleId = stelle.get("ID");
    } else {
      this.store.removeItem("activeStelleId");
    }
    await this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.ACTIVE_STELLE_CHANGED, oldStelle, stelle));
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

  getLayersSortedByUpdateOrder() {
    const layers = Array.from(this._layers.values());
    const tree: { id: string; childs: string[]; parent: string[] }[] = [];
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const attributes = layer.attributes;
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

  async addLayer(layer: Layer | MapLibreLayer) {
    console.info(`addLayer(${layer.title})`);
    if (layer instanceof Layer) {
      this._layers.set(layer.getGlobalId(), layer);
      if (layer.hasGeometry) {
        kvm.controls.layerCtrl.addOverlay(layer.layerGroup, '<span id="layerCtrLayerDiv_' + layer.getGlobalId() + '">' + layer.title + "</span>");
      }
      await this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.LAYER_ADDED, null, layer));
    }
  }
  async removeLayer(layer: Layer | MapLibreLayer) {
    console.info(`removeLayer(${layer.title})`);
    this._layers.delete(layer.getGlobalId());
    await this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.LAYER_REMOVED, layer, null));
  }

  /**
   * löscht alle Layer (Map, DB, Store)
   */
  private async clearStelle() {
    console.info(`app.clearLayers activeLayer=${this.getActiveLayer()?.title || "-"} countOfLayers=${this.getLayers()?.length || "0"}`);
    const layers = Array.from(this._layers.values());

    for (const layer of layers) {
      if (layer instanceof Layer) {
        layer.removeFromMap();
        await layer.dropDataTable();
        this.store.removeItem("layerSettings_" + layer.getGlobalId());
        await this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.LAYER_REMOVED, layer, null));
      }
    }
    this.store.removeItem("layerIds_" + this._activeStelle.get("ID"));
    console.info(`removedFromStore ${"layerIds_" + this._activeStelle.get("ID")} ${this.store.removeItem("layerIds_" + this._activeStelle.get("ID"))}`);
    this.store.removeItem("last_delta_version_" + this._activeStelle.get("ID"));
    console.info(`removedFromStore ${"last_delta_version_" + this._activeStelle.get("ID")} ${this.store.removeItem("last_delta_version_" + this._activeStelle.get("ID"))}`);
    this.store.removeItem("stelleSettings_" + this._activeStelle.get("ID"));
    console.info(`removedFromStore ${"stelleSettings_" + this._activeStelle.get("ID")} ${this.store.removeItem("stelleSettings_" + this._activeStelle.get("ID"))}`);

    this._layers.clear();
  }

  /**
   * löscht alle Layer (Map, DB, Store)
   */
  async clearLayers() {
    console.info(`app.clearLayers activeLayer=${this.getActiveLayer()?.title || "-"} countOfLayers=${this.getLayers()?.length || "0"}`);
    await this.setActiveLayer(null);

    const layers = Array.from(this._layers.values());

    for (const layer of layers) {
      if (layer instanceof Layer) {
        layer.removeFromMap();
        await layer.dropDataTable();
        kvm.store.removeItem("layerSettings_" + layer.getGlobalId());
        // await layer.dropDeltasTable();
        await this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.LAYER_REMOVED, layer, null));
      }
    }
    if (this._activeStelle) {
      kvm.store.removeItem("layerIds_" + this._activeStelle.get("ID"));
      kvm.store.removeItem("last_delta_version_" + this._activeStelle.get("ID"));
    }
    this._layers.clear();
  }

  async updateDeltaDisplay() {
    console.log("updateDeltaDisplay");
    try {
      const sql = "SELECT count(*) as count FROM deltas";
      const rs = await executeSQL(kvm.db, sql);
      const divDeltaAnzeige = document.getElementById("delta-count-anzeige");
      const divDeltaCount = document.getElementById("delta-count");
      const count = rs.rows.item(0).count;
      if (count === 0) {
        divDeltaAnzeige.style.display = "none";
        divDeltaCount.style.display = "none";
      } else {
        divDeltaAnzeige.innerText = count;
        divDeltaAnzeige.style.display = "";
        divDeltaCount.innerHTML = count + '<i class="fa fa-exclamation-circle"></i>';
        divDeltaCount.style.display = "";
      }
    } catch (ex) {
      Util.writeLog("Fehler in kvm.updateDeltaDisplay", ex);
      console.error(ex);
    }
  }

  async initDeltaAnzeige() {
    // const divDeltaAnzeige = createHtmlElement("div", document.body, "delta-anzeige");
    // divDeltaAnzeige.id = "div-delta-anzeige";

    const sql = "SELECT count(*) as count FROM deltas";
    // const rs = await executeSQL(kvm.db, sql);
    // divDeltaAnzeige.innerText = rs.rows.item(0).count;
    const clickFct = async () => {
      sperrBildschirm.show();
      let showDeltas;
      try {
        const rs = await executeSQL(kvm.db, sql);
        const count = rs.rows.item(0).count;
        if (count === 0) {
          await Util.alertOverlay("Es sind alle Änderungen zum Server übertragen worden", "Info");
        } else {
          showDeltas = await Util.confirm("" + count + " Änderungen wurden noch nicht zum Server übertragen", "Info", "Änderungen anzeigen");
        }
      } finally {
        sperrBildschirm.close();
      }
      if (showDeltas) {
        this.showDeltas();
      }
    };
    document.getElementById("delta-count").addEventListener("click", () => {
      clickFct();
    });
    this.updateDeltaDisplay();
  }

  showDeltas() {
    this.showView("settings");
    const view = this.menu.activeView;
    if (view instanceof ViewEinstellungen) {
      PanelEinstellungen.showMehr();
      view.panelDatabase.expand();
      view.panelDatabase.showDeltas();
    }
  }

  showSetting(panel: PanelEinstellungen.KeysMatching<ViewEinstellungen, PanelEinstellungen.PanelEinstellungen>) {
    this.showView("settings");
    const view = this.menu.activeView;
    if (view instanceof ViewEinstellungen) {
      view[panel].show();
      view[panel].expand(true);
    }
  }

  async syncLayers() {
    console.group("syncLayers");
    let syncResultImages;
    let syncResultData;
    try {
      syncResultImages = await this._activeStelle.syncImages();
      syncResultData = await this._activeStelle.syncData();
    } catch (ex) {
      if (ex instanceof AccessError) {
        throw ex;
      }

      if (ex instanceof AgreementNotAcceptError) {
        throw ex;
      }
      const autoSync = kvm.getConfigurationOption("autoSync");
      if (autoSync) {
        kvm.setConfigurationOption("autoSync", false);
        throw new Error("Bei dem Datenabgleich mit dem Server tratt eine Fehler auf. Die automatische Synchronierung wird abgestellt.", { cause: ex });
      }
      throw new Error("Bei dem Datenabgleich mit dem Server tratt eine Fehler auf.", { cause: ex });
    }
    this.updateDeltaDisplay();
    console.groupEnd();
    return {
      deletedImages: syncResultImages.deletedImages,
      addedImages: syncResultImages.addedImages,
      notSucceedAddedImages: syncResultImages.notSucceedAddedImages,
      numExecutedDeltas: syncResultData?.applyDeltaResult?.numExecutedDeltas || 0,
      numReturnedDeltas: syncResultData?.applyDeltaResult?.numReturnedDeltas || 0,
      countOfNoSyncLayersChanged: syncResultData?.countOfNoSyncLayersChanged,
      hasLayerStrucureChanged: syncResultData?.hasLayerStrucureChanged,
      sendDataDeltas: syncResultData?.sendDataDeltas,
    };
  }

  /**
   * function return all urls to fetch vector tiles in box with lower left corner p1
   * to upper right corner p2 for zoom level zoom
   * @param p1 LatLngExpression
   * @param p2 LatLngExpression
   * @param zoom integer zoom
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

  // init() {
  //   document.addEventListener("deviceready", () => this.onDeviceReady());
  //   /**
  //    * if maplibre sees an url like custum:// it will call customProtocolHandler
  //    *
  //    * customProtocolHandler: (requestParameters: RequestParameters, callback: ResponseCallback<any>) => Cancelable
  //    * requestParameters: {url:string, type:json?? }
  //    */
  //   maplibregl.addProtocol("custom", this.customProtocolHandler);
  // }

  /**
   * Diese Funktion schreibt den Text aus variable log die Log-Datei.
   * Die Log-Datei ist in kvm.openLogFile() definiert worden.
   * @param log
   * @returns
   */
  async writeLog(log: any): Promise<boolean> {
    log = `[${Util.now(" ", "", ":")}] ${log}` + "\n";
    const dataObj = new Blob([log], { type: "text/plain" });
    try {
      if (!this.debugLock) {
        this.debugLock = true;
        await FileUtils.writeFile(kvm.logFileEntry, dataObj, true);
        while (this.debugQueue.length > 0) {
          await FileUtils.writeFile(kvm.logFileEntry, this.debugQueue.shift(), true);
        }
        this.debugLock = false;
      } else {
        this.debugQueue.push(dataObj);
      }
      return true;
    } catch (ex) {
      console.error(`Fehler beim Schreiben in das Logfile ${kvm.logFileEntry.nativeURL} `, ex);
      return false;
    }
  }

  async _initDB(db: SQLitePlugin.Database) {
    try {
      const tblExists = await tableExists(db, "deltas");
      if (!tblExists) {
        const tableColumnDefinitions = ["version INTEGER PRIMARY KEY", "action text", "sql text", "uuid text", "action_time text", "schema_name text", "table_name text"];
        const sqlCreateTbl = "CREATE TABLE IF NOT EXISTS deltas (" + tableColumnDefinitions.join(", ") + ")";
        await executeSQL(kvm.db, sqlCreateTbl);
        // } else {
        //   const rs = await Util.executeSQL(kvm.db, "PRAGMA table_info('deltas')");
        //   Util.printResultSet("delta", rs);
      }

      const tblImageDeltasExists = await tableExists(db, "image_deltas");
      if (!tblImageDeltasExists) {
        const tableColumnDefinitions = ["version INTEGER PRIMARY KEY", "action text", "file text", "uuid text", "action_time text", "layer_id text"];
        const sqlCreateTbl = "CREATE TABLE IF NOT EXISTS image_deltas (" + tableColumnDefinitions.join(", ") + ")";
        await executeSQL(kvm.db, sqlCreateTbl);
        // } else {
        //   const rs = await Util.executeSQL(kvm.db, "PRAGMA table_info('image_deltas')");
        //   Util.printResultSet("image_deltas", rs);
      }
    } catch (ex) {
      console.error("Initialisierung der Datenbank ist fehlgeschlagen.", ex);
      throw new Error("Initialisierung der Datenbank ist fehlgeschlagen.", { cause: ex });
    }
  }

  /**
   * Führt eine FingerPrintAuth durch, wenn konfiguriert
   * @returns boolean
   */
  async authenticate() {
    let authenticated = false;
    try {
      if (window.localStorage.getItem("fingerprintAuth") == "true") {
        const isFingerprintAuthAvailable = await Util.isFingerprintAuthAvailable();
        console.debug("isFingerprintAuthAvailable=" + isFingerprintAuthAvailable);
        authenticated = await Util.encryptFingerPrint(<any>{
          clientId: "myAppName",
          username: "currentUser",
          password: "currentUserPassword",
          maxAttempts: 5,
          locale: "de_DE",
          dialogTitle: "Authentifizierung mit Fingerabdruck",
          dialogMessage: "Lege Finger auf den Sensor",
          dialogHint: "Diese Methode ist nur Verfügbar mit Fingerabdrucksensor",
        });
        console.debug("encryptFingerPrint=" + authenticated);
      } else {
        authenticated = true;
      }
    } catch (ex) {
      throw Error("Fehler bei der Authentifizierung", { cause: ex });
    }
    return authenticated;
  }

  async init() {
    /**
     * if maplibre sees an url like custum:// it will call customProtocolHandler
     *
     * customProtocolHandler: (requestParameters: RequestParameters, callback: ResponseCallback<any>) => Cancelable
     * requestParameters: {url:string, type:json?? }
     */
    maplibregl.addProtocol("custom", this.customProtocolHandler);

    try {
      window.open = <any>cordova.InAppBrowser.open; // oder casten mit window.open = cordova['InAppBrowser'].open;
    } catch ({ name, message }) {
      console.error(`TypeError: ${name} Message: ${message}`);
      alert(`Die App muss ein mal geschlossen und neu gestartet werden!`);
    }

    try {
      const authenticated = await this.authenticate();
      if (authenticated) {
        // TODO temp disabled
        // await this.checkAppVersion();
        await this.startApplication();
      }
    } catch (ex) {
      console.error("Fehler bei der Initialisierung." + ex, ex);
      Util.writeLog("Fehler bei der Initialisierung." + ex, ex);
      Util.showError("Fehler bei der Initialisierung." + ex, ex);
    }
  }

  /**
   * Function to compare semantic versions
   */
  compareVersions(a, b) {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if (pa[i] > pb[i]) return 1;
      if (pa[i] < pb[i]) return -1;
    }
    return 0;
  }

  clearStore() {
    console.error("not implemented");
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
    console.info("startApplication");

    const kvwKonfig = await Util.getCordovaCustomConfigParameters("kvw-konfig");
    console.debug("kvwKonfig lt. config.xml: '" + kvwKonfig + "'");
    this.versionNumber = await cordova.getAppVersion.getVersionNumber();

    document.title = "kvmobile " + this.versionNumber;
    await prepareBackgrounLayer();
    this.store = window.localStorage;
    if (this.store.getItem("version") !== this.versionNumber) {
      this.clearStore();
      this.store.setItem("version", this.versionNumber);
    }

    console.info(`Konfiguration lt.store: ${kvm.store.getItem("configName")}`);

    let configName = (this._configName = kvm.store.getItem("configName"));
    if (configName && kvwKonfig !== configName) {
      const change = await Util.confirm(`Die App ist für die Konfiguration ${kvwKonfig}. Die aktuelle Konfiguration ist ${configName}.\Welche Konfiguration möchten Sie verwenden?`, "", kvwKonfig, configName);
      if (change) {
        configName = kvwKonfig;
      }
    }
    configName = configName || kvwKonfig;

    const foundConfiguration = configurations.find(function (c) {
      return c.name === configName;
    });
    kvm.config = foundConfiguration || configurations[0];

    const logFileOpened = await this.openLogFile();
    console.info(`startApplication LogFile initialisiert ${logFileOpened}`);

    // let kvwmobileLoginName = kvm.store.getItem("kvwmapServerLoginName");
    // let kvwmobilePassword = kvm.store.getItem("kvwmapServerPasswort");
    this.userId = kvm.store.getItem("userId");
    // this.userName = kvm.store.getItem("userName");

    let stelle: Stelle = null;
    const activeStelleId = this.store.getItem("activeStelleId");

    let activeStelleSettings = null;
    if (activeStelleId) {
      activeStelleSettings = this.store.getItem("stelleSettings_" + activeStelleId);
      if (activeStelleSettings) {
        stelle = new Stelle(activeStelleSettings);
      }
    }

    // Übernehmen lokal gespeicherter Configurationseinstellungen
    for (const k in kvm.config) {
      const v = kvm.store.getItem(k);
      if (v) {
        try {
          kvm.config[k] = JSON.parse(v);
        } catch (ex) {
          kvm.config[k] = v;
          kvm.store.setItem(k, JSON.stringify(v));
          console.error(`konnte Config not parsen key="${k}" v="${v}" ${JSON.stringify(v)}`, typeof v);
        }
      }
    }

    let kvwmobileLoginName = kvm.getConfigurationOption("kvwmapServerLoginName");
    let kvwmobilePassword = kvm.getConfigurationOption("kvwmapServerPasswort");

    if (stelle) {
      if (!kvwmobileLoginName || !kvwmobilePassword) {
        kvwmobileLoginName = stelle.get("login_name");
        kvwmobilePassword = stelle.get("passwort");
        kvm.store.setItem("kvwmapServerLoginName", JSON.stringify(kvwmobileLoginName));
        kvm.store.setItem("kvwmapServerPasswort", JSON.stringify(kvwmobilePassword));
      }
    }
    let stelleSetting: StelleSettings = null;
    if (kvwmobileLoginName && kvwmobilePassword && stelle) {
      this.serverConnection.setServerParameter({
        url: this.config?.kvwmapServerUrl || "",
        login: kvwmobileLoginName,
        password: kvwmobilePassword,
        stelleId: stelle?.get("ID"),
      });
    } else {
      stelleSetting = await showInitScreen(this);
      this.serverConnection.credential.stelleId = stelleSetting.ID;
      stelle = new Stelle(stelleSetting);
      stelle.saveToStore();
    }

    const db = (this.db = await Util.openDatabase(kvm.config.dbname));
    await this._initDB(db);

    await this.setActiveStelle(stelle);

    console.info(`setting FontSize ${this.getConfigurationOption("fontSize")}`);
    document.body.style.fontSize = this.getConfigurationOption("fontSize");

    let activeView = ["settings", "map", "featurelist"].includes(kvm.store.getItem("activeView")) ? kvm.store.getItem("activeView") : "featurelist";

    this.views = [(this.viewEinstellungen = new ViewEinstellungen(this)), (this.viewLoggings = new ViewLoggings(this)), (this.viewFeatureList = new ViewFeatureList(this)), (this.viewMap = new ViewMap(this)), (this.viewDataView = new ViewDataView(this)), (this.viewFormular = new ViewFormular(this))];
    this.menu = new Menu(this);

    try {
      const dbPromise = idb.openDB("keyval-store", 1, {
        upgrade(db) {
          db.createObjectStore("keyval");
        },
      });

      this.readTile = async function (key: IDBValidKey) {
        console.info("readT");
        return (await dbPromise).get("keyval", key);
      };

      this.saveTile = async function (key: IDBValidKey, val: any) {
        console.info("saveT");
        return (await dbPromise).put("keyval", val, key);
      };
    } catch ({ name, message }) {
      kvm.msg("Fehler beim Lesen des activeView und Title! Fehlertyp: " + name + " Fehlermeldung: " + message);
    }

    try {
      this.loadLogLevel();
      await this.openLogFile();

      this.networkStatus = NetworkStatus;
      this.gpsStatus = GpsStatus;
      // this.initConfigOptions();
      this.initMap();
    } catch (ex) {
      console.error(ex);
      await Util.showError("Fehler bei der Initialisierung", ex);
      await Util.writeLog("Fehler bei der Initialisierung", ex);
      // kvm.msg("Fehler beim initieren der Anwendungskomponenten! Fehlertyp: " + name + " Fehlermeldung: " + message);
    }

    if (stelle) {
      let layerSettings = stelle.getLayerSettings();
      if (!layerSettings) {
        sperrBildschirm.show();
        await stelle.requestLayers();
        layerSettings = stelle.getLayerSettings();
        sperrBildschirm.close();
      } else {
        if (layerSettings?.length > 0) {
          // stelle.readAllLayers = true;
          // stelle.numLayersRead = 0;
          stelle.numLayers = layerSettings.length;
          sperrBildschirm.show("Lade Layerdaten.");
          let layerError = 0;
          for (const settings of layerSettings) {
            console.groupCollapsed("Init Layer " + settings.title);
            if (settings.vector_tile_url) {
              const layer = new MapLibreLayer(settings, true, stelle);
              layer.appendToApp();
            } else {
              const layer = new Layer(stelle, settings);
              this.addLayer(layer);
              // layer.appendToApp();
              try {
                console.log("Layer " + layer.title + ": reading data from local database.");
                await layer.readData(); // include drawFeatures
              } catch (error) {
                layerError++;
                console.error(error);
                if (layerError <= 3) {
                  const msg = `Fehler beim lesen der Daten des Layers "${layer.get("title")}" ${error.message}`;
                  kvm.msg(msg, "App-Start");
                }
              }
              if (layerError > 3) {
                kvm.msg("Weitere Fehler", "App-Start");
              }

              if (layer.get("id") == kvm.store.getItem("activeLayerId")) {
                layer.isActive = true;
                kvm.setActiveLayer(layer);
              }
            }
            console.groupEnd();
          }

          stelle.sortOverlays();
          // stelle.sortLayers();
          // ToDo pk: Synchronisieren
          if (kvm.getConfigurationOption("autoSync")) {
            try {
              console.groupCollapsed(`autoSync is ${kvm.getConfigurationOption("autoSync")}. Synchronisiere mit Server.`);
              try {
                const result = await this.syncLayers();
                console.info("Synchronisation wurde durchgeführt", result);
              } catch (ex) {
                if (ex instanceof AccessError) {
                  await kvm.msg("Die Zugangsdaten sind fehlerhaft. Bitte ändern Sie diese unter Einstellungen|Zugangsdaten");
                  kvm.showSetting("panelZugangsdaten");
                  activeView = null;
                }
                if (ex instanceof AgreementNotAcceptError) {
                  console.error("AgreementNotAcceptError");
                } else {
                  kvm.setConfigurationOption("autoSync", false);
                  throw ex;
                }
              }
              console.groupEnd();
            } catch (ex) {
              const msg = "Beim Synchronisieren trat ein Fehler auf.";
              await Util.showError(msg, ex);
              await Util.writeLog(msg, ex);
              console.error(msg, ex);
            }
          }
        } else {
          kvm.msg("Noch keine Layer vorhanden. Bitte wählen Sie die Konfiguration aus, setzen Nutzername und Passwort und fragen Stelle und Layer vom Server ab.");
          PanelEinstellungen.show("layer");
        }
        // } else {
        //   kvm.msg("Noch keine Layer vorhanden. Bitte wählen Sie die Konfiguration aus, setzen Nutzername und Passwort und fragen Stelle und Layer vom Server ab.");
        //   PanelEinstellungen.show("layer");
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
      // this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.ACTIVE_LAYER_CHANGED, stelle, null));
      activeView = "settings";
      PanelEinstellungen.show("server");
    }

    if (kvm.store.hasOwnProperty("activeLayerId")) {
      const layer = this.getLayer(kvm.store.getItem("activeLayerId"));
      if (layer) {
        this.setActiveLayer(layer);
      }
    } else {
      activeView = "settings";
    }

    this.bindEvents();

    //kvm.log("Liste der Datensätze angezeigt.", 4);
    if (activeView) {
      this.showView(<ViewName>activeView);
    }
    sperrBildschirm.close();

    await this.serverConnection.runLogin();

    this.initDeltaAnzeige();

    await this.checkForUpdate();
  }

  /**
   * setzt und schreibt diese als JSON in den store
   * @param optionName
   * @param value
   */
  setConfigurationOption<K extends keyof Configuration>(optionName: K, value: any) {
    this.config[optionName] = value;
    if (value === null || value === undefined || value === "") {
      this.store.removeItem(optionName);
    } else {
      this.store.setItem(optionName, JSON.stringify(value));
    }
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
  async setConfiguration(configName: string) {
    console.info(`config changed ${this._configName} ${configName}`);
    const oldconfigName = this._configName;
    this._configName = configName;
    this.store.clear();
    this.store.setItem("configName", configName);
    this.mapSettings = null;
    this._backgroundLayerSettings = null;

    const foundConfiguration = configurations.find(function (c) {
      return c.name === configName;
    });
    this.config = foundConfiguration || configurations[0];
    console.info(`config changed ${this._configName} ${configName}`, this.config);
    await this.fire(new PropertyChangeEvent(this, Kvm.EVENTS.ACTIVE_CONFIGURATION_CHANGED, oldconfigName, configName));

    this.controls.layerCtrl?.remove();
    this.controls.layerCtrl = null;
    if (this.map) {
      this.map.eachLayer((l) => {
        l.remove();
      });
      this.map.remove();
    }
    this.map = null;
    this.initMap();

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

    PanelEinstellungen.show("server");
  }

  initMap() {
    console.log("initialisiere backgroundLayers");

    const backgroundLayers = this.initBackgroundLayers();

    this.myRenderer = new SVG();

    let activeBackgroundIdIndex = this.getConfigurationOption("activeBackgroundLayerId") || 0;
    if (activeBackgroundIdIndex > backgroundLayers.length - 1) {
      activeBackgroundIdIndex = 0;
    }

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
      layers: backgroundLayers[activeBackgroundIdIndex].leafletLayer,
      renderer: this.myRenderer,
    });

    map.addEventListener("baselayerchange", (ev) => {
      const idx = backgroundLayers.findIndex((el) => el.leafletLayer === ev.layer);
      if (idx >= 0) {
        kvm.setConfigurationOption("activeBackgroundLayerId", idx);
      } else {
        kvm.setConfigurationOption("activeBackgroundLayerId", 0);
      }
    });

    const fct = (evt: LayersControlEvent) => {
      console.debug(evt);
      const layer = this.getLayers().find((layer, idx) => layer.layerGroup === evt.layer);
      if (layer) {
        if (evt.type === "overlayadd") {
          layer.settings.visible = true;
        } else {
          layer.settings.visible = false;
        }
        kvm.store.setItem("layerSettings_" + layer.getGlobalId(), JSON.stringify(layer.settings));
      }
    };
    map.on("overlayremove", fct);
    map.on("overlayadd", fct);

    const baseMaps = {};
    map.on("popupopen", function (evt) {
      kvm.controls.layerCtrl.collapse();
    });
    map.on("zoomend", (evt) => kvm.store.setItem("activeZoom", evt.target.getZoom()));
    map.on("moveend", (evt) => {
      kvm.store.setItem("activeCenter", JSON.stringify(evt.target.getCenter()));
      const geolocation_div = document.getElementById("geolocation_div");
      if (geolocation_div) {
        geolocation_div.innerHTML = `${evt.target.getCenter().lat} ${evt.target.getCenter().lng}`;
      } else {
        console.error("geolocation_div not found");
      }
    });

    map.on("locateactivate", (evt) => {
      const geolocation_div = document.getElementById("geolocation_div");
      if (geolocation_div) {
        geolocation_div.innerHTML = "Koordinaten";
        geolocation_div.style.display = "";
      } else {
        console.error("geolocation_div not found");
      }
      kvm.mapHint("GPS-Tracking eingeschaltet!");
    });

    map.on("locatedeactivate", (evt) => {
      const geolocation_div = document.getElementById("geolocation_div");
      if (geolocation_div) {
        geolocation_div.innerHTML = "";
        geolocation_div.style.display = "none";
      } else {
        console.error("geolocation_div not found");
      }
      kvm.mapHint("GPS-Tracking ausgeschaltet!");
    });

    for (let i = 0; i < backgroundLayers.length; i++) {
      // todo
      // baseMaps[`<span id="backgroundLayerSpan_${i}">${this.backgroundLayerSettings[i].label}</span>`] = this.backgroundLayers[i].leafletLayer;
      baseMaps[this._backgroundLayerSettings[i].label] = backgroundLayers[i].leafletLayer;
    }

    // if (this.store.getItem("activeStelleId") && this.store.getItem(`stelleSettings_${this.store.getItem("activeStelleId")}`) != null) {
    //   // console.log(
    //   //   this.config.name,
    //   //   this.store.getItem("activeStelleId"),
    //   //   JSON.parse(
    //   //     this.store.getItem(
    //   //       `stelleSettings_${this.store.getItem("activeStelleId")}`
    //   //     )
    //   //   ).Stelle_ID
    //   // );
    // }

    // ToDo: Anpassen so dass die Infos aus der Config kommen und für alle gelten können.
    if (this.config.name == "LK-EE" && this.store.getItem("activeStelleId") && this.store.getItem(`stelleSettings_${this.store.getItem("activeStelleId")}`) && JSON.parse(this.store.getItem(`stelleSettings_${this.store.getItem("activeStelleId")}`)).Stelle_ID == "103") {
      baseMaps["PmVectorTile"] = new MapLibreLayer("https://geoportal.lkee.de/html/pmtiles/style-schlaege.json", true, kvm._activeStelle);
    }

    //    L.PM.initialize({ optIn: true });
    // ToDo sortFunction hinzufügen die nach drawingorder sortieren kann
    // kvm.controls.layers = new Control.Layers(baseMaps, null, {
    //   autoZIndex: true,
    //   sortLayers: false,
    //   sortFunction: (layerA, layerB, nameA, nameB) => (parseInt(layerA.getAttribution()) > parseInt(layerB.getAttribution()) ? parseInt(layerA.getAttribution()) : parseInt(layerB.getAttribution())),
    // }).addTo(map);
    kvm.controls.betterscale = (<any>L).control
      .betterscale({
        metric: true,
        imperial: false,
        position: "bottomright",
      })
      .addTo(map);

    this.controls.layerCtrl = new LayerCtrl(this, baseMaps, null, {
      autoZIndex: true,
      sortLayers: true,
      sortFunction: (layerA, layerB, nameA, nameB) => {
        // {layer: , name: '<span id="layerCtrLayerDiv_12_277">Baum</span>', overlay: true}
        // {layer: leafletLayer, name: 'Luftbilder WMS', overlay: false}
        if (layerA["legendorder"] && layerB["legendorder"]) {
          return layerA["legendorder"] < layerB["legendorder"] ? -1 : 1;
        }
        if (!layerA["legendorder"] && !layerB["legendorder"]) {
          return nameA < nameB ? -1 : 1;
        }
        return layerA["legendorder"] ? 1 : -1;
      },
    }).addTo(map);

    kvm.controls.locate = new Control.Locate({
      position: "topright",
      setView: "untilPanOrZoom",
      keepCurrentZoomLevel: false,
      showPopup: true,
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
    // const ReloadLayers = Control.extend({
    //   onAdd: function (map: LMap) {
    //     // console.log("Add leaflet control reloadLayers %o to Map: %o", this, map);
    //     this._div = DomUtil.create("div", "leaflet-bar leaflet-control-reloadlayers"); // create a div with a class "reloadlayers-control-div"
    //     this._div.innerHTML = '<a class="leaflet-control-reloadlayers-icon"><span><i class="fa fa-refresh" onclick="kvm.reloadFeatures()"></i></span></a>';
    //     return this._div;
    //   },
    //   onClick: function (evt) {
    //     // console.log("Click on leaflet control reloadLayers with event: %o", evt);
    //   },
    //   onRemove: function (map) {
    //     // console.log("Remove leaflet control reloadLayers %o to Map: %o", this, map);
    //   },
    // });
    // // (<any>L).Control.reloadLayers = function (opts) {
    // //     return new (<any>L).Control.ReloadLayers(opts);
    // // };
    // kvm.controls.reloadLayers = new ReloadLayers({
    //   position: "topleft",
    // }).addTo(map);

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
                const lastLatlng = kvm._activeFeature.getWaypoint("last");
                if (buttonIndex == 1) {
                  console.log("Vorhandenen Track löschen und neu beginnen.");
                  // Editierbarkeit ausschalten
                  kvm._activeFeature.editableLayer.disableEdit();
                  // LatLngs zurücksetzen
                  kvm._activeFeature.editableLayer.setLatLngs([]);
                  // Tracking einschalten (latlngs hinzufügen auch im Hintergrund, wenn das Display aus ist.)
                  kvm.controller.mapper.startGpsTracking(kvm._activeFeature, lastLatlng);
                  btn.state("track-aufnahme");
                } else if (buttonIndex == 2) {
                  console.log("Vorhandenen Track weiterzeichnen.");
                  // Editierbarkeit ausschalten
                  kvm._activeFeature.editableLayer.disableEdit();
                  // Tracking einschalten (latlngs hinzufügen)
                  kvm.controller.mapper.startGpsTracking(kvm._activeFeature, lastLatlng);
                  btn.state("track-aufnahme");
                } else {
                  console.log("Abbruch");
                }
              },
              "GPS-Track aufzeichnen.",
              ["Löschen und neu beginnen", "An Linie anhängen", "Abbrechen"],
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
                  kvm._activeFeature.editableLayer.enableEdit();
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
              ["Aufnahme beenden", "Aufnahme unterbrechen", "Abbrechen"],
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
                const lastLatlng = kvm._activeFeature.getWaypoint("last");
                if (buttonIndex == 1) {
                  console.log("Aufnahme beenden.");
                  // Tracking ausschalten
                  navigator.geolocation.clearWatch(kvm.controller.mapper.watchId);
                  // Track als Geometrie vom Feature übernehmen
                  //Editierbarkeit einschalten.
                  kvm._activeFeature.editableLayer.enableEdit();
                  btn.state("track-aufzeichnen");
                } else if (buttonIndex == 2) {
                  console.log("Aufnahme fortsetzen.");
                  // Tracking einschalten
                  kvm.controller.mapper.startGpsTracking(kvm._activeFeature, lastLatlng);
                  btn.state("track-aufnahme");
                } else {
                  console.log("Abbruch");
                }
              },
              "GPS-Track aufzeichnen.",
              ["Aufnahme beenden", "Aufnahme fortsetzen", "Abbrechen"],
            );
          },
        },
      ],
    }).addTo(map);
    // TODO jquery
    $("#trackControl").parent().hide();

    this.map = map;
  }

  getMapSettings() {
    if (!this.mapSettings) {
      if (!(this.mapSettings = JSON.parse(kvm.store.getItem("mapSettings")))) {
        this.saveMapSettings(kvm.config.mapSettings);
      }
    }
    return this.mapSettings;
  }

  // setConfigurationOption<K extends keyof Configuration>(optionName: K, value: any) {
  setMapSetting(settingName: keyof MapSettings, value: string) {
    if (this.mapSettings) {
      this.mapSettings[settingName] = value;
      this.map.setMaxBounds(new LatLngBounds(new LatLng(this.mapSettings["south"], this.mapSettings["west"]), new LatLng(this.mapSettings["north"], this.mapSettings["east"])));
      console.info(`mapSetting changed: ${settingName}=${value}`);
      this.saveMapSettings(this.mapSettings);
    }
  }

  saveMapSettings(mapSettings) {
    this.mapSettings = mapSettings;
    kvm.store.setItem("mapSettings", JSON.stringify(mapSettings));
  }

  initBackgroundLayers(): BackgroundLayer[] {
    // console.log('initBackgroundLayers');
    const backgroundLayers: BackgroundLayer[] = [];
    try {
      const backgroundLayerSettings = this.getBackgroundLayerSettings();
      for (let i = 0; i < backgroundLayerSettings.length; ++i) {
        try {
          backgroundLayers.push(new BackgroundLayer(backgroundLayerSettings[i]));
        } catch (error) {
          console.error(error);
          Util.writeLog("Fehler beim Einrichten des Hintergrundlayers: " + backgroundLayerSettings[i].label, error);
          kvm.msg("Fehler beim Einrichten des Hintergrundlayers: " + backgroundLayerSettings[i].label, error);
        }
      }
      return backgroundLayers;
    } catch (error) {
      console.error(error);
      kvm.msg("Fehler beim Einrichten der Hintergrundlayer: " + error);
      return backgroundLayers;
    }
  }

  getBackgroundLayerSettings(): BackgroundLayerSetting[] {
    if (!this._backgroundLayerSettings) {
      this._backgroundLayerSettings = kvm.store.backgroundLayerSettings ? JSON.parse(kvm.store.getItem("backgroundLayerSettings")) : kvm.config.backgroundLayerSettings;
    }
    return this._backgroundLayerSettings;
  }

  saveBackgroundLayerSettings(backgroundLayerSettings: any[]) {
    this._backgroundLayerSettings = backgroundLayerSettings;
    kvm.store.setItem("backgroundLayerSettings", JSON.stringify(backgroundLayerSettings));
  }

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
      ["ja", "nein"],
    );
  }

  async newFeatureButtonClicked() {
    sperrBildschirm.show();
    try {
      sperrBildschirm.show("neues Objekt wird erzeugt");
      const layer = this._activeLayer;
      const newFeature = await layer.createNewFeature();
      await this.editFeature(newFeature);
      newFeature.zoomTo(true);
      sperrBildschirm.close();
    } catch (error) {
      console.error(error);
      Util.writeLog("Fehler beim Anlegen eines neuen Features", error);
      sperrBildschirm.close("Fehler beim Anlegen eines neuen Features", error);
    }
  }

  async deleteFeatureButtonClicked() {
    if (this._activeLayer?.hasDeletePrivilege) {
      sperrBildschirm.show();
      const fkAtts = this._activeLayer.attributes.filter((att) => att.settings.form_element_type === "SubFormEmbeddedPK");
      const fkLayers: Layer[] = [];
      for (let i = 0; i < fkAtts.length; i++) {
        const layerId = fkAtts[i].options?.ref_layer_id;
        if (layerId) {
          const l = this.getLayer(this._activeStelle.get("ID") + "_" + layerId);
          if (l) {
            fkLayers.push(l);
          }
        }
      }

      const fkLayersNames = fkLayers.length > 0 ? fkLayers.map((l) => l.title) : null;
      let msg = "Datensatz wirklich Löschen?";
      if (fkLayersNames) {
        msg += `\n\nBitte beachten Sie:\nEs werden alle Objekte gelöscht, die an diesem ${this._activeLayer.title} hängen. Dazu gehören die Einträge in folgenden Layern: ${fkLayersNames.join(", ")} und die Einträge der darunter liegenden Layer.`;
      }
      const deleteConfirmed = await Util.confirm(msg, "", "ja", "nein");
      if (deleteConfirmed) {
        const id_attribute = this._activeLayer.get("id_attribute");
        console.group("Lösche Feature " + id_attribute + ": " + kvm._activeFeature.getDataValue(id_attribute));
        Util.writeLog("Lösche Feature " + id_attribute + ": " + kvm._activeFeature.getDataValue(id_attribute));

        try {
          const feature = this._activeFeature;
          await this._activeLayer.runDeleteStrategy(feature);
          this._activeLayer.removeFeature(feature);
          this.setActiveFeature(null);
          if (this.getConfigurationOption("autoSync") && this.networkStatus.online) {
            const activeLayerId = this._activeLayer.getGlobalId();
            const syncResults = await this.syncLayers();
            console.info("Synchronisation erfolgreich", syncResults);
            this.setActiveLayer(activeLayerId);
          } else {
            for (let fkLayer of fkLayers) {
              fkLayer.readData(this.getConfigurationOption("limit"), this.getConfigurationOption("offset"));
            }
          }

          this.afterDeleteDataset(feature);
        } catch (ex) {
          Util.writeLog("Fehler beim Löschen", ex);
          console.error("Fehler beim Löschen", ex);
        }
        console.groupEnd();
      }
      sperrBildschirm.close();
    } else {
      navigator.notification.confirm("Sie haben nicht das Recht zum Löschen von Datensätzen in diesem Layer!", function (buttonIndex) {}, "Datenbank", ["habe Verstanden"]);
    }
  }

  async saveFeatureButtonClicked(newAfterSave: boolean) {
    sperrBildschirm.show();
    let feature = this._activeFeature;
    let layer = this._activeFeature.layer;
    const id_attribute = layer.get("id_attribute");
    console.group("saveFeature " + id_attribute + ":" + feature.getDataValue(id_attribute) + " neu:" + (feature.new ? "ja" : "nein"));

    try {
      const action = feature.new ? "insert" : "update";
      const changes = layer.getAllChanges(feature, action);
      // printing all Changes fro debug reasons
      // console.table(kvm._activeLayer.getAllChanges("insert"));
      console.table(changes);
      let validationErrMsg: string = "";

      const notNullErrMsg: string = layer.notNullValid();
      if (notNullErrMsg) {
        validationErrMsg += notNullErrMsg;
      }
      // Versuche FK-Attribute die fehlen mit setValue() automatisch zu setzen
      // in setValue() wird der übergeordnete Datensatz über ST_Within() gesucht
      // TODO ???????
      // for (const attribute of this._activeLayer.attributes) {
      //   if (attribute.settings.form_element_type === "SubFormFK" && !attribute.formField.getValue()) {
      //     console.info(`saveFeatureButton ${attribute.settings.name} setting value to ""`);
      //     await attribute.formField.setValue("");
      //   }
      // }

      const notFKValidErrMsg: string = layer.notFKValid();
      if (notFKValidErrMsg) {
        validationErrMsg += `\n\n${notFKValidErrMsg}`;
      }

      const notGeomValid: string = layer.notGeomValid();
      if (notGeomValid) {
        validationErrMsg += `\n\nDie erfassten Koordinaten sind nicht gültig!`;
      }

      if (validationErrMsg) {
        this.msg(validationErrMsg, "Formular");
      } else {
        let saveConfirmed = true;
        if (this.config.confirmSave) {
          saveConfirmed = await Util.confirm("Datensatz Speichern?", layer.title, "Speichern", "Abbruch");
        }
        if (saveConfirmed) {
          feature.setEditable(false);
          this.isEditMode = false;
          if (changes?.length > 0) {
            if (action == "insert") {
              await layer.runInsertStrategy(feature, changes);
            } else {
              await layer.runUpdateStrategy(feature, changes);
              layer.fire(new PropertyChangeEvent(this._activeLayer, Layer.EVENTS.FEATURE_CHANGED, null, null));
            }
            if (this.getConfigurationOption("autoSync") && this.networkStatus.online) {
              const activeLayerId = layer.getGlobalId();
              const activeFeatureId = feature.id;
              const syncResults = await this.syncLayers();
              console.info("Synchronisation erfolgreich", syncResults);
              this.setActiveFeature(activeLayerId, activeFeatureId);
              layer = this._activeLayer;
              feature = this._activeFeature;
            }
            if (action === "insert") {
              console.log("option newAfterCreate is on");
              if (newAfterSave) {
                const newFeature = await this._activeLayer.createNewFeature(feature.data);
                await this.editFeature(newFeature);
              } else {
                await layer.afterCreateDataset(feature);
              }
            } else {
              await layer.afterUpdateDataset(feature);
            }
          } else {
            sperrBildschirm.close("Keine Änderungen! Zum Abbrechen verwenden Sie den Button mit dem Pfeil nach links, neben Speichern-Button.");
          }
        }
      }
      sperrBildschirm.close();
    } catch (ex) {
      const msg = "Beim Speichern trat ein Fehler auf!\n";
      sperrBildschirm.close(msg, ex);
      // this.writeLog(msg + objectToString(ex));
      // Util.alertNative("Beim Speicher tratt ein Fehler auf." + JSON.stringify(ex))
      // kvm.msg("Beim Speicher tratt ein Fehler auf. " + JSON.stringify(ex));
      Util.writeLog(msg, ex);
      console.error(msg, ex);
    }
    console.groupEnd();
  }

  /**
   * Things that shall be done after deleting a dataset
   */
  afterDeleteDataset(f: Feature) {
    const parentFeature = f.findParentFeature();
    if (parentFeature) {
      if (this.isActiveView("mapEdit")) {
        this.showView("map");
        if (f.layer.hasGeometry) {
          this.setActiveFeature(null);
        } else {
          if (parentFeature.layer.hasGeometry) {
            this.setActiveFeature(parentFeature);
          } else {
            this.setActiveFeature(null);
          }
        }
      } else {
        this.showView("dataView");
        this.setActiveFeature(parentFeature);
      }
    } else {
      this.showView(this.isActiveView("mapEdit") ? "map" : "featurelist");
      //console.log('Scroll die FeatureListe nach ganz oben');
      // this.showNextItem(this.getConfigurationOption("viewAfterDelete"), f.layer);
    }
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
          ["ja", "nein"],
        );
      },
      false,
    );

    document.addEventListener(
      "dataLoaded",
      function () {
        console.info("dataLoaded");
        if (kvm.featureListLoaded && kvm.layerDataLoaded) {
          sperrBildschirm.close("Event dataLoaded ausgelößt.");
        }
      },
      false,
    );

    // TODO rtr

    // this.map.addEventListener("baselayerchange", (ev) => {
    //   const idx = backgroundLayers.findIndex((el) => el.leafletLayer === ev.layer);
    //   if (idx >= 0) {
    //     kvm.setConfigurationOption("activeBackgroundLayerId", idx);
    //   } else {
    //     kvm.setConfigurationOption("activeBackgroundLayerId", 0);
    //   }
    // });

    document.getElementById("deleteFeatureButton").addEventListener("click", () => {
      this.deleteFeatureButtonClicked();
    });

    document.getElementById("saveFeatureButton").addEventListener("click", (evt) => {
      this.saveFeatureButtonClicked(false);
    });
    document.getElementById("saveFeatureButton2").addEventListener("click", (evt) => {
      this.saveFeatureButtonClicked(true);
    });

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

    // $("#restoreFeatureButton").on("click", () => {
    //   navigator.notification.confirm(
    //     "Wollen Sie den Datensatz wiederherstellen? Ein vorhandener mit der gleichen uuid wird dabei überschrieben!",
    //     (buttonIndex) => {
    //       if (buttonIndex == 1) {
    //         // ja
    //         sperrBildschirm.setContent("Wiederherstellung von Datensätzen ist noch nicht implementiert!");
    //         kvm._activeLayer.runRestoreStrategy();
    //         sperrBildschirm.show();
    //         setTimeout(function () {
    //           sperrBildschirm.close();
    //         }, 3000);
    //       } else {
    //         sperrBildschirm.close();
    //       }
    //     },
    //     "Datensatz wiederherstellen",
    //     ["ja", "nein"]
    //   );
    // });

    /* Clientside Filter according to http://stackoverflow.com/questions/12433835/client-side-searching-of-a-table-with-jquery */
    /*** Search Feature ***/

    // ToDo
    // $("#geoLocationButton").on("click", kvm.getGeoLocation);

    // TODO
    if (document.getElementById("downloadBackgroundLayerButton")) {
      console.info("downloadBackgroundLayerButton.addEventListener");
      document.getElementById("downloadBackgroundLayerButton").addEventListener("click", (evt) => {
        console.info("downloadBackgroundLayerButton.clicked");
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
                const bl = this.getBackgroundLayerSettings().filter(function (l) {
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
          ["ja", "nein"],
        );
      });
    }
  }

  // featureItemClickEventFunction(evt: MouseEvent) {
  //   console.info("zzz featureItemClickEventFunction");
  //   const id = (<HTMLElement>evt.currentTarget).dataset.id;
  //   console.log("featureItemClickEvent on feature id: %o", id);
  //   const feature = kvm._activeLayer.getFeature(id);
  //   kvm.showView(kvm._activeLayer.hasGeometry && feature.getDataValue(kvm._activeLayer.get("geometry_attribute")) != "null" ? "map" : "dataView");
  //   kvm._activeLayer.activateFeature(feature, true);
  // }

  backupDatabase(filename = "", msg = "") {
    console.log("Sichere Datenbank");
    let srcDir = cordova.file.applicationStorageDirectory + "databases/";
    let srcFile = "kvmobile.db";
    let dstDir = kvm.store.getItem("localBackupPath") || kvm.config.localBackupPath;
    let dstFile = filename || `Sicherung_${Util.now("_", "", "-")}.db`;
    msg += msg !== "" ? ` Gespeichert in Datei: ${dstDir} ${dstFile}` : "";
    FileUtils.copyFile(srcDir, srcFile, dstDir, dstFile, msg);
  }

  async resetEverything() {
    await this.clearLayers();
    console.info("alle Layer entfernt");
    const dbName = this.getConfigurationOption("dbname");
    await Util.deleteDatabase(dbName);
    console.info("db deleted");
    this.db = await Util.openDatabase(dbName);
    console.info("db created");
    // if (this._layers.size === 0) {
    //   kvm.msg("Keine Layer zum löschen vorhanden.");
    // } else {
    //   this._layers.forEach((layer) => {
    //     console.log("Entferne Layer: %s", layer.get("title"));
    //   });
    // }
    // this._layers = new Map();

    this.setActiveLayer(null);
    await this.setActiveStelle(null);
    window.localStorage.clear();
    this.store = window.localStorage;
  }

  /**
   * Beendet die Editierung des Features
   * Wenn das Feature eine Geometrie hat beende die Editierung der Geometrie
   * Wenn das Feature neu angelegt werden sollte und ein parent feature hat springe dort hin
   * Wenn die Editierung in der Karte abgebrochen wird wechsel zur Karte, sonst zur Feature Liste
   */
  cancelEditFeature() {
    const activeLayer = this._activeLayer;
    const activeFeature = this._activeFeature;
    console.info(`app.cancelEditFeature ${activeLayer?.title} ${activeFeature?.id} ${activeFeature.new} app=${this.isEditMode}`);

    if (activeLayer.hasGeometry) {
      //console.log("Feature ist neu? %s", activeFeature.new);
      if (activeFeature.new) {
        //console.log("Änderungen am neuen Feature verwerfen.");
        activeLayer.cancelEditGeometry(activeFeature);
        this.setActiveFeature(null);
        if (kvm.controller.mapper.isMapVisible()) {
          kvm.showView("map");
        } else {
          kvm.showView("featurelist");
        }
      } else {
        //console.log("Änderungen am vorhandenen Feature verwerfen.");
        activeLayer.cancelEditGeometry(activeFeature); // Editierung der Geometrie abbrechen
        // rtr activeLayer.loadFeatureToForm(activeFeature, { editable: false }); // Formular mit ursprünglichen Daten laden
        this.viewFormular.loadFeatureToForm(activeFeature);
        if (kvm.controller.mapper.isMapVisible()) {
          // ToDo editableLayer existier im Moment nur, wenn man den Änderungsmodus im Popup in der Karte ausgelößt hat.
          // auch noch für neue Features einbauen.
          kvm.showView("map");
        } else {
          kvm.showView("dataView");
        }
      }
    } else {
      // Wenn aktuelles Feature neu ist und zu einem übergeordneten Feature gehört dieses laden und darstellen.
      if (activeFeature.new) {
        let parentFeature = activeFeature.findParentFeature();
        if (parentFeature) {
          // const parentLayer = parentFeature.layer;
          this.setActiveFeature(parentFeature);
        }
      }
      kvm.showView("dataView");
    }
    this.isEditMode = false;

    kvm.controller.mapper.clearWatch(); // GPS-Tracking ausschalten
  }

  /**
   * Function open form to create a new feature for a subLayer.
   * If activeFeature has open changes a confirm dialog comes up.
   * Input form only open if user confirm else nothing happens.
   */
  async newSubFeature(options: { parentLayerId: string; subLayerId: string; fkAttribute: string; parentFeatureId: any }) {
    console.info(`app.newSubFeature vom Typ ${this.getLayer(options.subLayerId)?.title} am feature ${this._activeFeature.layer.title} ${this._activeFeature.getDataValue(this._activeLayer.get("id_attribute"))}`);
    if (this._activeLayer && this._activeFeature) {
      const changes = this._activeLayer.collectChanges(this._activeFeature, "update");
      if (changes.length > 0) {
        // console.error(`app.newSubFeature changes: ${this._activeFeature.layer.title} ${this._activeFeature.getDataValue(this._activeLayer.get("id_attribute"))}`);
        const proceed = await Util.confirm("Es sind noch offene Änderungen. Diese müssen erst gespeichert werden.", "Bitte Bestätigen", "Ohne Speichern Fortfahren", "Abbrechen");
        if (!proceed) {
          return;
        }
      }
      if (this._activeLayer.hasGeometry) {
        this._activeLayer.cancelEditGeometry(this._activeFeature);
      }
      await this._activeLayer.newSubDataSet(options);
    }
  }

  /**
   * Function open form to edit feature with featureId in layer with layerId.
   * If activeFeature has open changes a confirm dialog comes up.
   * Edit form only open if user confirm else nothing happens.
   * @param feature
   */
  async editFeature(feature: Feature): Promise<void>;
  async editFeature(layerId: string, featureId: string): Promise<void>;
  async editFeature(layerId: string | Feature, featureId?: string) {
    let layer: Layer;
    let feature: Feature;
    if (typeof layerId === "string") {
      layer = this.getLayer(layerId);
      feature = layer.getFeature(featureId);
    } else {
      feature = layerId;
      layer = feature.layer;
    }
    console.info(`editFeature(${layer.title}, ${feature.getDataValue(layer.get("id_attribute"))} editMode=${this.isEditMode}`, this._activeFeature);
    if (this.isEditMode && this._activeFeature && this._activeFeature !== feature) {
      const changes = this._activeLayer.collectChanges(this._activeFeature, this._activeFeature.new ? "insert" : "update");
      if (changes.length > 0) {
        const proceed = await Util.confirm("Es sind noch offene Änderungen. Diese müssen erst gespeichert werden.", "Bitte Bestätigen", "Ohne Speichern Fortfahren", "Abbrechen");
        if (!proceed) {
          return;
        }
      }
    }
    this.isEditMode = true;
    this.setActiveFeature(feature);
    await layer.editFeature(feature);
    // $("#deleteFeatureButton").hide();
    if (layer.hasGeometry && !this.isActiveView("dataView") && !this.isActiveView("formular")) {
      this.showView("mapEdit");
    } else {
      this.showView("formular");
    }
  }

  loadLogLevel() {
    // TODO jquery
    console.info("Lade LogLevel", 4);
    let logLevel = kvm.store.getItem("logLevel");
    if (logLevel == null) {
      logLevel = kvm.config.logLevel;
      kvm.store.setItem("logLevel", logLevel);
    }
    $("#logLevel").val(logLevel);
  }

  featureClicked = (evt: LeafletEvent) => {
    const leafletLayer = <LeafletLayer>evt.target;
    const feature = <Feature>evt.target["feature"];
    console.group(`featureClicked isEditMode=${this.isEditMode} clickedFeature: ${feature.layer.title} ${feature.getDataValue(feature.layer.get("id_attribute"))}`);
    if (feature.isActive) {
      this.setActiveFeature(null);
      feature.deactivate();
      leafletLayer.unbindPopup();
    } else {
      if (this.isEditMode) {
        this.editFeature(feature);
      } else {
        this.setActiveFeature(feature);
        feature.activate(false);
      }
    }
    console.groupEnd();
  };

  async openLogFile(): Promise<boolean> {
    const localBackupPath = `${cordova.file.externalRootDirectory}Documents/`;
    console.info("openLogFile " + localBackupPath);
    /// console.info("openLogFile " + cordova.file.applicationStorageDirectory);
    return new Promise<boolean>((resolve, reject) => {
      window.resolveLocalFileSystemURL(
        localBackupPath,
        (dirEntry) => {
          (<DirectoryEntry>dirEntry).getFile(
            `kvmobile_${this.config.name.toLowerCase()}_logfile.txt`,
            { create: true, exclusive: false },
            (fileEntry) => {
              kvm.logFileEntry = fileEntry;
              console.info(dirEntry);
              console.info(fileEntry);
              // kvm
              //   .writeLog("Logfile initialisert")
              //   .then(() => console.info(`LogFile ${fileEntry.nativeURL} initialisiert`, fileEntry))
              //   .catch(() => console.info(`LogFile ${fileEntry.nativeURL} konnte nicht initialisiert (geschrieben) werden`, fileEntry));
              resolve(true);
            },
            (error) => {
              console.error("Error opening LogFile", error);
              resolve(false);
            },
          );
        },
        (error) => {
          console.error("Error opening LogFile", error);
          resolve(false);
        },
      );
    });
  }

  showNextItem(viewAfter: string, layer: Layer): void {
    // console.log(`showNextItem ${viewAfter}`);
    switch (viewAfter) {
      case "featurelist":
        {
          this.showView("featurelist");
        }
        break;
      case "map":
        {
          this.showView("map");
        }
        break;
      case "dataView":
        {
          this.showView("dataView");
        }
        break;
      case "formular":
        {
          this.editFeature(this.getActiveFeature());
        }
        break;
      case "last":
        {
          this.showView(this.lastMapOrListView); // map or featurelist
        }
        break;
      default: {
        this.showView(this.menu.isActiveView("formular") ? "dataView" : "map");
      }
    }
  }

  showView(item: ViewName): void {
    this.menu.activate(item);
    kvm.store.setItem("activeView", item);
  }
  isActiveView(item: ViewName): boolean {
    return this.menu.isActiveView(item);
  }

  // TODO
  replacePassword(s: any) {
    if (kvm.serverConnection?.credential?.password) {
      return s.replace(kvm.serverConnection.credential.password, "????").replace(encodeURI(kvm.serverConnection.credential.password), "****");
    } else {
      if ($("#kvwmapServerPasswortField").val()) {
        return s.replace($("#kvwmapServerPasswortField").val(), "secretPwFromForm");
      } else {
        return s;
      }
    }
  }

  uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0,
        v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
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
        // TODO jquery
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

  gdi_conditional_nextval(schema_name, table_name, column_name, condition) {
    const sql = `
      SELECT
        COALESCE(max(${column_name}), 0) + 1 AS next_val
      FROM
        ${schema_name}_${table_name}
      WHERE
        ${condition}
    `;
    return sql;
  }

  async gdi_conditional_val(schema_name: string, table_name: string, column_name: string, condition: string) {
    const sql = `
      SELECT
        ${column_name} AS val
      FROM
        ${schema_name}_${table_name}
      WHERE
        ${condition}
    `;

    const rs = await executeSQL(kvm.db, sql);
    return rs.rows.length === 0 ? null : rs.rows.item(0).val;
  }

  get_args(input, data) {
    let match = input.match(/\(([\s\S]*)\)/); // [\s\S]* matches everything including newlines
    let arr: string[] = [];
    if (match) {
      const parts = match[1]
        .replace(/''/g, "'")
        .replace(/\$(\w+)/g, (_, key) => data[key] ?? `$${key}`)
        .split(",");
      arr.push(parts[0].trim().replace(/^'(.*)'$/, "$1"));
      arr.push(parts[1].trim().replace(/^'(.*)'$/, "$1"));
      arr.push(parts[2].trim().replace(/^'(.*)'$/, "$1"));
      arr.push(parts[3].trim().replace(/^'(.*)'$/, "$1"));
      return arr;
    }
  }

  msg(msg: string, title: string = "") {
    return new Promise<void>((resolve, reject) => {
      if (msg) {
        navigator.notification.confirm(
          msg,
          function (buttonIndex) {
            resolve();
          },
          title,
          ["ok"],
        );
      }
    });
  }

  mapHint(msg: string, showTime = 2500, fadeTime = 1000) {
    //
    const hintDiv = document.getElementById("map_hint_div");
    hintDiv.innerHTML = msg;
    Util.showShort(hintDiv, showTime, fadeTime);

    // $("#map_hint_div").html(msg).show().delay(delay).fadeOut(duration);
  }

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
      const errMsg = "Fehler beim Abfragen der Layerdaten. Abfrage liefert keine korrekten Daten vom Server. Entweder sind keine auf dem Server vorhanden, die URL der Anfrage ist nicht korrekt oder der es wird eine Fehlermeldung vom Server geliefert statt der Daten.\nURL der Anfrage:\n" + this._activeStelle.get("url") + "\nZurückgelieferte Result:\n" + layerResult;
      return { success: false, errMsg: errMsg };
    }

    const resultObj = JSON.parse(layerResult);

    if (!resultObj.success) {
      console.error("Result success ist false!", resultObj);
      const errMsg = "Fehler beim Abfragen der Layerdaten. Falsche Serverparameter, Authentifizierungsfehler oder Fehler auf dem Server.";
      return { success: false, errMsg: errMsg };
    }

    return resultObj;
  }

  /**
   * function return true if path is the path of the file
   * @param file The complete path with filename of the file
   * @param path The path to check if the file path match
   * @return boolean true if file has path
   */
  hasFilePath(file: string, path: string): boolean {
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
   * @param type - The database type of an attribute
   * @return string If it is a string returns a single quotation mark "'" if not or unknown returns an empty string ""
   */
  bracketForType(type: string): string {
    return ["bpchar", "varchar", "text", "date", "timestamp", "geometry"].indexOf(type) > -1 ? "'" : "";
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

export const kvm = new Kvm();
window["kvm"] = kvm;

if (document.readyState === "interactive" || document.readyState === "complete") {
  document.addEventListener("deviceready", () => {
    kvm.init();
  });
}

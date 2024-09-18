import { kvm } from "./app";
import { LeafletMouseEvent, Map as LMap, MapOptions, Layer as LLayer, TileLayer } from "leaflet";
import * as pmtiles from "pmtiles";
import { Map as maplibreMap, PointLike, LayerSpecification, MapGeoJSONFeature } from "maplibre-gl";
import { Stelle } from "./Stelle";

import { MapLibreGL } from "maplibre-gl";
import { sperrBildschirm } from "./SperrBildschirm";

// import {addProtocol as cc} from "maplibre-gl";

const L = require("leaflet");
// const maplibregl = require("maplibre-gl");
require("@maplibre/maplibre-gl-leaflet");

export class MapLibreLayer extends LLayer {
  url: string;
  isPMTiles: boolean;
  static pmTilesProtocol: pmtiles.Protocol;
  static maplibreGLMap: maplibreMap;
  pane: HTMLElement;
  style: any;
  popup: HTMLElement;
  stelle: Stelle;
  settings: any;
  title: string;
  isActive: boolean = false;

  constructor(settings: {}, isPMTiles: boolean, stelle: Stelle) {
    super();
    this.settings = typeof settings == "string" ? JSON.parse(settings) : settings;
    this.stelle = stelle;
    this.title = kvm.coalempty(this.get("alias"), this.get("title"), this.get("table_name"), "overlay" + this.getGlobalId());
    this.url = this.get("vector_tile_url") + "&login_name=" + this.stelle.get("login_name") + "&passwort=" + encodeURIComponent(this.stelle.get("passwort"));
    this.isPMTiles = isPMTiles;
    if (!MapLibreLayer.pmTilesProtocol) {
      MapLibreLayer._init();
    }
  }

  get(key: string) {
    return this.settings[key];
  }

  set(key: string, value: any) {
    this.settings[key] = value;
    return this.settings[key];
  }

  static _init() {
    MapLibreLayer.pmTilesProtocol = new pmtiles.Protocol();
    MapLibreGL.addProtocol("pmtiles", MapLibreLayer.pmTilesProtocol.tile);
  }

  static queryRenderedFeatures(evt: LeafletMouseEvent): MapGeoJSONFeature[] {
    if (MapLibreLayer.maplibreGLMap) {
      const p = MapLibreLayer.maplibreGLMap.project(evt.latlng);
      return MapLibreLayer.maplibreGLMap.queryRenderedFeatures(p);
    } else {
      return [];
    }
  }

  async addPMTiles(map: LMap) {
    console.info(`addPMTiles ${this.url}`, MapLibreLayer.maplibreGLMap);

    const style = (this.style = await (await fetch(this.url)).json());

    for (const k in style.sources) {
      style.sources[k].url += `&login_name=${this.stelle.get("login_name")}&passwort=${encodeURIComponent(this.stelle.get("passwort"))}`;
      const source = style.sources[k];
      console.log(`pmTileSource: ${source.url}`);
      const pmTilesUrl = source.url.substr("pmtiles://".length);
      console.log(`Frage pmTiles mit URL: ${pmTilesUrl}`);
      const p = new pmtiles.PMTiles(pmTilesUrl);
      const header = await p.getHeader();
      const metadata = await p.getMetadata();
      console.info("header", header);
      console.info("metadata", metadata);
      MapLibreLayer.pmTilesProtocol.add(p);
      //await fetch(pmTilesUrl);
    }

    if (!MapLibreLayer.maplibreGLMap) {
      const pane = (this.pane = map.createPane("pmtiles"));
      pane.style.zIndex = "300";
      console.log("style: %o", style);
      const gl = L.maplibreGL({ style: style, pane: "pmtiles", interactive: true });
      gl.addTo(map);
      const glMap: maplibreMap = (MapLibreLayer.maplibreGLMap = gl.getMaplibreMap());
      // console.info("addPMTiles2 " + this.url, MapLibreLayer.maplibreGLMap);
      // glMap.on("load", (o: any) => {
      //   console.error("MAPLIBRE map loaded", o);
      // });
      glMap.on("click", (evt) => {
        //console.log("Klick auf map ", evt);
        const features = glMap.queryRenderedFeatures(evt.point);
        for (let i = 0; i < features.length && i < 1; i++) {
          this.showPopup(features[i]);
        }
      });

      //console.info(glMap);
    } else {
      for (const k in style.sources) {
        console.dir(style.sources[k]);
        MapLibreLayer.maplibreGLMap.addSource(k, style.sources[k]);
      }
      console.info("styleend");
      for (let i = 0; i < style.layers.length; i++) {
        MapLibreLayer.maplibreGLMap.addLayer(style.layers[i]);
      }
    }
  }

  removeFromApp() {
    console.log("remove layer %s (%s)", this.get("title"), this.get("id"));
    //console.log('Entferne layer div aus layer options list.');
    $("#layer_" + this.getGlobalId()).remove();
    kvm.controls.layerCtrl.removeLayer(this);
    //console.log('Entferne layer von map');
    kvm.map.removeLayer(this);
    //console.log('Lösche activeLayer von kvm layers array');
    kvm.removeLayer(this);
    //console.log('Lösche layer und seine id aus dem store');
    this.removeFromStore();
  }

  removeFromStore() {
    //console.log("removeFromStore");
    console.log("layerIds in Store vor dem Löschen: %s", kvm.store.getItem("layerIds_" + this.stelle.get("ID")));
    const layerIds = <string[]>JSON.parse(kvm.store.getItem("layerIds_" + this.stelle.get("ID"))) || [];
    console.log("Entferne LayerID %s aus layerIds Liste im Store.", this.get("id"));
    layerIds.splice(layerIds.indexOf(this.get("id")), 1);
    kvm.store.setItem("layerIds_" + this.stelle.get("ID"), JSON.stringify(layerIds));
    console.log("layerIds in Store nach dem Löschen: %s", kvm.store.getItem("layerIds_" + this.stelle.get("ID")));
    kvm.store.removeItem("layerSettings_" + this.getGlobalId());
  }

  showPopup(feature: MapGeoJSONFeature) {
    if (this.popup) {
      this.popup.remove();
      this.popup = undefined;
    }

    const div = document.createElement("div");
    div.style.cssText = `
      position: absolute;
      background: white;
      z-index: 1000;
      top: 63px;
      left: 12px;
      width: 89%;
      max-height: 80%;
      overflow: auto;
      padding: 5px;
      border-radius: 5px;
    `;
    div.innerHTML = '<a class="leaflet-popup-close-button" role="button" aria-label="Close popup" onclick="this.parentElement.remove()" href="#close"><span aria-hidden="true" style="float: right; margin-right: 5px; color: black">×</span></a>';
    const table = document.createElement("table");
    div.appendChild(table);
    for (const k in feature.properties) {
      // console.info(k + "\t" + feature.properties[k]);
      const tr = document.createElement("tr");
      table.appendChild(tr);
      const td01 = document.createElement("td");
      tr.appendChild(td01);
      const td02 = document.createElement("td");
      tr.appendChild(td02);
      td01.innerText = k + ": ";
      td02.innerText = feature.properties[k];
    }
    document.body.appendChild(div);
    this.popup = div;
    /*
    div.addEventListener("click", () => {
      if (this.popup) {
        this.popup.remove();
      }
      this.popup = undefined;
    });
    */
  }
  async addMBTiles(map: LMap) {
    console.info("addMBTiles " + this.url, MapLibreLayer.maplibreGLMap);
    if (!MapLibreLayer.maplibreGLMap) {
      const pane = (this.pane = map.createPane("pmtiles"));
      pane.style.zIndex = "300";
      const gl = L.maplibreGL({ style: this.url, pane: "pmtiles", interactive: true });
      gl.addTo(map);
      const glMap: maplibreMap = (MapLibreLayer.maplibreGLMap = gl.getMaplibreMap());
      console.info("addMBTiles2 " + this.url, MapLibreLayer.maplibreGLMap);
      glMap.on("load", (o: any) => {
        console.error("MAPLIBRE map loaded", o);
      });
    } else {
      fetch(this.url).then((data) =>
        data.json().then((style) => {
          this.style = style;
          for (const k in style.sources) {
            MapLibreLayer.maplibreGLMap.addSource(k, style.sources[k]);
          }
          const layer = MapLibreLayer.maplibreGLMap.getStyle().layers[0];
          console.info("layer ", layer);
          for (let i = 0; i < style.layers.length; i++) {
            MapLibreLayer.maplibreGLMap.addLayer(style.layers[i], layer.id);
          }
        })
      );
    }
  }

  onAdd(map: LMap): this {
    if (this.style) {
      for (let i = 0; i < this.style.layers.length; i++) {
        MapLibreLayer.maplibreGLMap.addLayer(this.style.layers[i]);
      }
    } else {
      if (this.isPMTiles) {
        this.addPMTiles(map);
      } else {
        this.addMBTiles(map);
      }
    }
    return this;
  }

  onRemove(map: LMap): this {
    for (let i = 0; i < this.style.layers.length; i++) {
      MapLibreLayer.maplibreGLMap.removeLayer(this.style.layers[i].id);
    }
    return this;
  }

  saveToStore() {
    //console.log('layerIds vor dem Speichern: %o', kvm.store.getItem('layerIds_' + this.stelle.get('id')));
    this.settings.loaded = false;
    let layerIds = <string[]>JSON.parse(kvm.store.getItem("layerIds_" + this.stelle.get("ID"))) || [];
    const settings = JSON.stringify(this.settings);

    kvm.store.setItem("layerSettings_" + this.getGlobalId(), settings);
    //console.log("%s: layerSettings_%s eingetragen.", this.title, this.getGlobalId());

    if ($.inArray(this.get("id"), layerIds) < 0) {
      console.log("%s->saveToStore: Insert layerId %s in layerIds List at index %s", this.title, this.get("id"), this.stelle.getLayerDrawingIndex(this));
      layerIds.splice(this.stelle.getLayerDrawingIndex(this), 0, this.get("id"));
      kvm.store.setItem("layerIds_" + this.stelle.get("ID"), JSON.stringify(layerIds));
    }
  }

  /**
   * function create the listElement with functions buttons for layer settings page,
   * bind the events on functions buttons
   * add layer in layer control of the map
   * save layer object in kvm.layers array and
   * Do not read data for listing and mapping
   */
  appendToApp() {
    sperrBildschirm.tick(`${this.title}:<br>&nbsp;&nbsp;Füge Layer zur App hinzu.`);
    console.error("MapLibreLayer.appendToApp");
    const index = kvm.getActiveStelle().getLayerDrawingIndex(this);
    if (index == 0) {
      $("#layer_list").prepend(this.getListItem());
    } else {
      //ToDo hier die Funktion einbauen, die an Hand des index die richtige Layer id findet.
      $(this.getListItem()).insertAfter("#layer_" + kvm.getActiveStelle().getLayerDrawingGlobalId(index - 1));
    }
    this.bindLayerEvents(this.getGlobalId());
    //    kvm.map.addLayer(this.layerGroup);
    kvm.controls.layerCtrl.addOverlay(this, `<span id="layerCtrLayerDiv_${this.getGlobalId()}">${this.title}</span>`);
    kvm.addLayer(<any>this);
  }

  getGlobalId() {
    return this.stelle.get("ID") + "_" + this.get("id");
  }

  getListItem() {
    console.log("getListItem for layerId: ", this.getGlobalId());
    const customStyleClass = this.get("useCustomStyle") ? "visible" : "hidden";
    const html = `
      <div id="layer_${this.getGlobalId()}" class="layer-list-div">
        <input type="radio" name="activeLayerId" value="${this.getGlobalId()}"/> ${this.get("alias") ? this.get("alias") : this.get("title")}
        <i id="layer-functions-button_${this.getGlobalId()}" class="layer-functions-button fa-regular fa-ellipsis-vertical" aria-hidden="true"></i>
        <div class="layer-functions-div">
          <button id="reloadLayerButton_${this.getGlobalId()}" value="${this.getGlobalId()}" class="settings-button reload-layer-button active-button layer-function-button">
            <i id="reloadLayerIcon_${this.getGlobalId()}" class="fa fa-download" aria-hidden="true"></i>
          </button> Layer neu laden
        </div>
      </div>`;
    return html;
  }

  activate() {
    console.error("wwww activate");

    (<any>$("input[value=" + this.getGlobalId() + "]")[0]).checked = true;
    $(".layer-functions-button, .layer-functions-div").hide();
    $("#layer_" + this.getGlobalId() + " > .layer-functions-button").show();
    $("#layer_" + this.getGlobalId() + " > .layer-functions-button").removeClass("fa-ellipsis-vertical fa-square-xmark");
    $("#layer_" + this.getGlobalId() + " > .layer-functions-button").addClass("fa-ellipsis-vertical");
    $("#newFeatureButton").hide();
  }

  /*
   * Erzeugt die Events für die Auswahl, Synchronisierung und das Zurücksetzen von Layern
   */
  bindLayerEvents(layerGlobalId) {
    console.error("wwww activate");
    return;
    console.log("bindLayerEvents for layerGlobalId: %s", layerGlobalId);
    // Schaltet alle layer function button events zunächst aus.
    $(".layer-function-button").off();
    //
    // Schaltet einen anderen Layer und deren Sync-Funktionen aktiv
    // Die Einstellungen des Layers werden aus dem Store geladen
    // Die Featureliste und Kartenelemente werden falls vorhanden aus der Datenbank geladen.
    //
    $("input[name=activeLayerId]" + (layerGlobalId ? "[value='" + layerGlobalId + "']" : "")).on("change", function (evt) {
      const globalId = (<any>evt.target).value;
      const layer = kvm.getLayer(globalId);

      // unselect activeLayer
      // unselect activeFeature
      kvm.map.closePopup();
      if (kvm.getActiveLayer()) {
        kvm.getActiveLayer().deactivate();
      }
      sperrBildschirm.tick(`${layer.title}:<br>&nbsp;&nbsp;Setze Layer aktiv.`);
      layer.activate(); // include loading filter, sort, data view, form and readData
    });

    $("#layer-functions-button_" + layerGlobalId).on("click", function (evt) {
      var target = $(evt.target);
      console.log("click on layer-functions-button von div %o", target.parent().attr("id"));
      target.parent().children().filter(".layer-functions-div").toggle();
      target.toggleClass("fa-ellipsis-vertical fa-square-xmark");
    });

    $(".reload-layer-button" + (layerGlobalId > 0 ? "[id='reloadLayerButton_" + layerGlobalId + "']" : "")).on("click", function (evt) {
      var id = (<any>evt.target).value;
      // const layer = kvm.activeLayer;
      let target = $(evt.target);

      if (target.hasClass("fa")) {
        target = target.parent();
      }

      navigator.notification.confirm(
        "Den Layer mit aktuellen Daten neu laden.",
        function (buttonIndex) {
          if (buttonIndex == 1) {
            // ja
            // var layer = kvm.activeLayer;
            kvm.msg("Die Funktion ist noch nicht implementiert.");
          }
          if (buttonIndex == 2) {
            // nein
            // Do nothing
          }
        },
        "",
        ["ja", "nein"]
      );
    });
  }
}

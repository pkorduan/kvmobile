import { LeafletMouseEvent, Map as LMap, MapOptions, Layer as LLayer, TileLayer } from "leaflet";
import * as pmtiles from "pmtiles";
import { Map as maplibreMap, PointLike, LayerSpecification, MapGeoJSONFeature } from "maplibre-gl";
// import {addProtocol as cc} from "maplibre-gl";
const L = require("leaflet");
const maplibregl = require("maplibre-gl");
require("@maplibre/maplibre-gl-leaflet");

export class MapLibreLayer extends LLayer {
  url: string;
  isPMTiles: boolean;
  static pmTilesProtocol: pmtiles.Protocol;
  static maplibreGLMap: maplibreMap;
  pane: HTMLElement;
  style: any;
  popup: HTMLElement;

  constructor(url: any, isPMTiles: boolean) {
    super();
    this.url = url;
    this.isPMTiles = isPMTiles;
    if (!MapLibreLayer.pmTilesProtocol) {
      MapLibreLayer._init();
    }
  }

  static _init() {
    MapLibreLayer.pmTilesProtocol = new pmtiles.Protocol();
    maplibregl.addProtocol("pmtiles", MapLibreLayer.pmTilesProtocol.tile);
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
    console.info("addPMTiles " + this.url, MapLibreLayer.maplibreGLMap);

    const style = (this.style = await (await fetch(this.url)).json());

    for (const k in style.sources) {
      const source = style.sources[k];
      const pmTilesUrl = source.url.substr("pmtiles://".length);
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
      const gl = L.maplibreGL({ style: style, pane: "pmtiles", interactive: true });
      gl.addTo(map);
      const glMap: maplibreMap = (MapLibreLayer.maplibreGLMap = gl.getMaplibreMap());
      console.info("addPMTiles2 " + this.url, MapLibreLayer.maplibreGLMap);
      glMap.on("load", (o: any) => {
        console.error("MAPLIBRE map loaded", o);
      });
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
        //console.dir(style.sources[k]);
        MapLibreLayer.maplibreGLMap.addSource(k, style.sources[k]);
      }
      //console.info("styleend");
      for (let i = 0; i < style.layers.length; i++) {
        MapLibreLayer.maplibreGLMap.addLayer(style.layers[i]);
      }
    }
  }

  showPopup(feature: MapGeoJSONFeature) {
    if (this.popup) {
      this.popup.remove();
      this.popup = undefined;
    }

    const div = document.createElement("div");
    div.style.cssText = "position: absolute;background: white;z-index: 1000;top: 60px;left: 12px;width: 92%; max-height: 80%; overflow: auto; padding: 5px";
    div.innerHTML =
      '<a class="leaflet-popup-close-button" role="button" aria-label="Close popup" onclick="this.parentElement.remove()" href="#close"><span aria-hidden="true" style="float: right; margin-right: 5px; color: black">×</span></a>';
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
}

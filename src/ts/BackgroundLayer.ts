//import * as L from "leaflet";
const L = require("leaflet");
import { maplibreStyleObj } from "./mapLibreStyles";
import { kvm } from "./app";
import { getWebviewUrl } from "./Util";
import { Stelle } from "./Stelle";

export async function prepareBackgrounLayer() {
  const maplibreStyle = maplibreStyleObj[1];
  const glypsUrl = maplibreStyle.glyphs;
  // console.log("BackgroundLayer", maplibreStyle, glypsUrl);
  // "file:///android_asset/www/openmaptiles-fonts/{fontstack}/{range}.pbf"
  const idx = glypsUrl.indexOf("{");
  const dir = glypsUrl.substring(0, idx);
  const webViewUrl = await getWebviewUrl(dir);
  maplibreStyle.glyphs = webViewUrl + glypsUrl.substring(idx);
  // console.log("maplibreStyle.glyphs=" + maplibreStyle.glyphs);
  return true;
}

export class BackgroundLayer {
  stelle: Stelle;
  settings: any;
  title: string;
  index: number = 0;
  isActive: boolean = false;
  leafletLayer: any;

  constructor(settings = {}) {
    //constructor(stelle, settings = {}) {
    //this.stelle = stelle;
    this.settings = typeof settings == "string" ? JSON.parse(settings) : settings;
    this.title = kvm.coalempty(this.get("alias"), this.get("title"), this.get("table_name"), "overlay" + this.index);
    console.log("create BackgroundLayer " + this.get("type"));

    if (this.get("type") == "tile") {
      this.leafletLayer = L.tileLayer(this.get("url"), this.get("params"));
    } else if (this.get("type") == "vectortile") {
      // console.error('create vectortile');
      //return L.vectorGrid.protobuf(backgroundLayerSetting.url, backgroundLayerSetting.params);

      this.leafletLayer = (<any>L).maplibreGL({
        style: maplibreStyleObj[1],
        // maplibreStyleObj.find((style) => {
        // 	return style.id == kvm.config.backgroundLayerSettings[2].style;
        // }) ||
        // maplibreStyleObj.find((style) => {
        // 	return style.id == "default";
        // }),
        interactive: this.get("interactiv"),
      });
    } else if (this.get("type") == "wms") {
      this.leafletLayer = L.tileLayer.wms(this.get("url"), this.get("params"));
    } else if (this.get("type") == "bing") {
      this.leafletLayer = L.tileLayer.bing(this.settings.params.BING_KEY);
    } else {
      this.leafletLayer = L.tileLayer.wms(this.get("url"), this.get("params"));
    }
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    return this.settings[key];
  }
}

import * as L from "leaflet";
import { maplibreStyleObj } from "./mapLibreStyles";
import { kvm } from "./app";
//import { Attribute } from "./Attribute";
//import { Feature } from "./Feature";
import { Stelle } from "./Stelle";
//import { Klasse } from "./Klasse";

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
		console.log("create BackgroundLayer " + this.get('type'));

		if (this.get('type') == "tile") {
			this.leafletLayer = L.tileLayer(this.get('url'), this.get('params'));
		}
		else if (this.get('type') == "vectortile") {
			//return L.vectorGrid.protobuf(backgroundLayerSetting.url, backgroundLayerSetting.params);
			this.leafletLayer = (<any>L).maplibreGL({
				style:
					maplibreStyleObj.find((style) => {
						return style.id == kvm.config.style;
					}) ||
					maplibreStyleObj.find((style) => {
						return style.id == "default";
					}),
				interactive: this.get('interactiv'),
			});
		}
		else if (this.get('type') == 'wms') {
			this.leafletLayer = L.tileLayer.wms(this.get('url'), this.get('params'));
		}
		else {
			this.leafletLayer = L.tileLayer.wms(this.get('url'), this.get('params'));
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
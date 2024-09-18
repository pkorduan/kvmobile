import { Layer } from "./Layer";

type KlasseSettings = {
  expression: string;
  id: string;
  name: string;
  style: any;
};

export class Klasse {
  settings: KlasseSettings;

  constructor(settings: string | KlasseSettings) {
    if (settings) {
      this.settings = typeof settings === "string" ? JSON.parse(settings) : settings;
    }
  }

  static getCircleMarkerLegendKeyImg(style) {
    return `\
      <svg height="20" width="20">\
        <circle cx="10" cy="10" r="8" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokewidth}" fill-opacity="${style.fillOpacity}"></circle>\
      </svg>\
    `;
  }

  static getPolylineLegendKeyImg(style) {
    return `\
      <svg height="20" width="40">\
        <polyline points="2,18 12,2 28,18 38,2" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokewidth}" fill-opacity="${style.fillOpacity}"></polyline>\
      </svg>\
    `;
  }

  static getPolygonLegendKeyImg(style) {
    return `\
      <svg height="20" width="40">\
        <polygon points="0,0 0,20 40,20 40,0" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokewidth}" fill-opacity="${style.fillOpacity}"></polygon>\
      </svg>\
    `;
  }
}

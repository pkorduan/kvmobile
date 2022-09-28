import { kvm } from "./app";

export class Klasse {
  settings: any;
  constructor(settings = {}) {
    this.settings = typeof settings == "string" ? JSON.parse(settings) : settings;
  }
  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    return this.settings[key];
  }

  getLegendItem(geometry_type) {
    return `${this.getLegendKeyImg(geometry_type)} ${this.get("name")}
    <i class="fa fa-pencil" aria-hidden="true" style="float: right; margin-right: 10px"></i>`;
  }

  getLegendKeyImg(geometry_type) {
    let legendKeyImg: String;
    let sizeFactor = 1;
    if (geometry_type == "Point") {
      legendKeyImg = this.getCircleMarkerLegendKeyImg(sizeFactor);
    } else if (geometry_type == "Line") {
      legendKeyImg = this.getPolylineLegendKeyImg(sizeFactor);
    } else if (geometry_type == "Polygon") {
      legendKeyImg = this.getPolygonLegendKeyImg(sizeFactor);
    }
    console.log("getLegendKeyImg: %s", legendKeyImg);
    return legendKeyImg;
  }

  getCircleMarkerLegendKeyImg(sizeFactor) {
    return `\
      <svg height="20" width="20">\
        <circle cx="10" cy="10" r="8" stroke="rgb(${this.get("style").color})" stroke-width="${this.get("style").weight || 2}" fill="rgb(${
      this.get("style").fillColor
    })"></circle>\
      </svg>\
    `;
  }

  getPolylineLegendKeyImg(sizeFactor) {
    return `\
      <svg height="20" width="40">\
        <polyline points="2,18 12,2 28,18 38,2" style="fill:none;stroke:rgb(${this.get("style").fillColor});stroke-width:${
      this.get("style").weight || 2
    }"></polyline>\
      </svg>\
    `;
  }

  getPolygonLegendKeyImg(sizeFactor) {
    return `\
      <svg height="20" width="40">\
        <polygon points="0,0 0,20 40,20 40,0" style="fill:rgb(${this.get("style").fillColor});stroke:rgb(${this.get("style").color});stroke-width:${
      this.get("style").weight || 2
    }"></polygon>\
      </svg>\
    `;
  }
}

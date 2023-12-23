import { kvm } from "./app";
import { Layer } from "./Layer";

export class Klasse {
  settings: any;
  layer: Layer;
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

  /**
   * This function translate mapserver class style options into
   * leaflet path options
   * @returns {}
   */
  getLeafletPathOptions() {
    let defaultPathOptions = this.layer.getDefaultPathOptions();
    let pathOptions: { [k: string]: any } = {
      color: `rgb(${(this.layer.get("geometry_type") == "Line" ? this.get("style").fillColor : this.get("style").color) || defaultPathOptions.color})`,
      opacity: (this.get("style").opacity / 100) || defaultPathOptions.opacity,
      fill: this.layer.get("geometry_type") == "Line" ? false : this.get("style").fill === "" ? defaultPathOptions.fill : this.get("style").fill,
      stroke: this.get("style").stroke === "" ? defaultPathOptions.stroke : this.get("style").stroke,
      fillColor: `rgb(${(this.layer.get("geometry_type") == "Line" ? this.get("style").color : this.get("style").fillColor) || defaultPathOptions.fillColor})`,
      fillOpacity: this.get("style").opacity / 100 || defaultPathOptions.fillOpacity,
      weight: parseInt(this.get("style").weight) || defaultPathOptions.weight,
    };
    if (this.layer.get("geometry_type") == "Point") {
      pathOptions.size = this.get("style").size || defaultPathOptions.size;
    }
    return pathOptions;
  }

  getSVGStyleOptions(leafletPathOptions) {
    let svgStyleOptions: any = leafletPathOptions;
    svgStyleOptions.fill = leafletPathOptions.fill === false ? "none" : leafletPathOptions.fillColor;
    svgStyleOptions.stroke = leafletPathOptions.stroke === false ? "none" : leafletPathOptions.color;
    return svgStyleOptions;
  }

  getLegendItem(geometry_type) {
    return `${this.getLegendKeyImg(geometry_type)} ${this.get("name")}
    <i class="fa fa-pencil" aria-hidden="true" style="float: right; margin-right: 10px"></i>`;
  }

  getLegendKeyImg(geometry_type) {
    let legendKeyImg: String;
    let svgStyleOptions: any = this.getSVGStyleOptions(this.getLeafletPathOptions());
    if (geometry_type == "Point") {
      legendKeyImg = this.getCircleMarkerLegendKeyImg(svgStyleOptions);
    } else if (geometry_type == "Line") {
      legendKeyImg = this.getPolylineLegendKeyImg(svgStyleOptions);
    } else if (geometry_type == "Polygon") {
      legendKeyImg = this.getPolygonLegendKeyImg(svgStyleOptions);
    }
    console.log("getLegendKeyImg: %s", legendKeyImg);
    return legendKeyImg;
  }

  getCircleMarkerLegendKeyImg(style) {
    return `\
      <svg height="20" width="20">\
        <circle cx="10" cy="10" r="8" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokewidth}" fill-opacity="${style.fillOpacity}"></circle>\
      </svg>\
    `;
  }

  getPolylineLegendKeyImg(style) {
    return `\
      <svg height="20" width="40">\
        <polyline points="2,18 12,2 28,18 38,2" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokewidth}" fill-opacity="${style.fillOpacity}"></polyline>\
      </svg>\
    `;
  }

  getPolygonLegendKeyImg(style) {
    return `\
      <svg height="20" width="40">\
        <polygon points="0,0 0,20 40,20 40,0" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokewidth}" fill-opacity="${style.fillOpacity}"></polygon>\
      </svg>\
    `;
  }
}

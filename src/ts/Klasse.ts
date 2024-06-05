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
        const defaultPathOptions = this.layer.getDefaultPathOptions();
        const pathOptions: { [k: string]: any } = {
            color: `rgb(${(this.layer.get("geometry_type") == "Line" ? this.get("style").fillColor : this.get("style").color) || defaultPathOptions.color})`,
            opacity: this.get("style").opacity / 100 || defaultPathOptions.opacity,
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
        const svgStyleOptions: any = leafletPathOptions;
        svgStyleOptions.fill = leafletPathOptions.fill === false ? "none" : leafletPathOptions.fillColor;
        svgStyleOptions.stroke = leafletPathOptions.stroke === false ? "none" : leafletPathOptions.color;
        return svgStyleOptions;
    }

    getLegendItem(geometry_type: "Point" | "Line" | "Polygon") {
        return `${this.getLegendKeyImg(geometry_type)} ${this.get("name")}
    <i class="fa fa-pencil" aria-hidden="true" style="float: right; margin-right: 10px"></i>`;
    }

    getLegendKeyImg(geometry_type: "Point" | "Line" | "Polygon") {
        let legendKeyImg: String;
        const svgStyleOptions: any = this.getSVGStyleOptions(this.getLeafletPathOptions());
        if (geometry_type == "Point") {
            legendKeyImg = Klasse.getCircleMarkerLegendKeyImg(svgStyleOptions);
        } else if (geometry_type == "Line") {
            legendKeyImg = Klasse.getPolylineLegendKeyImg(svgStyleOptions);
        } else if (geometry_type == "Polygon") {
            legendKeyImg = Klasse.getPolygonLegendKeyImg(svgStyleOptions);
        }
        // console.log("getLegendKeyImg: %s", legendKeyImg);
        return legendKeyImg;
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

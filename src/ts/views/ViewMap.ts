import { Kvm } from "../app";
import { View } from "./View";

export class ViewMap extends View {
  constructor(app: Kvm) {
    super(app, "mapView");
  }

  show() {
    super.show();
    this.dom.style.zIndex = "100";
    console.info(`show ViewMap`, this);
    this.app.map.invalidateSize();
    // TODO
    const geolocation_div = document.getElementById("geolocation_div");
    if (geolocation_div.innerHTML != "") {
      geolocation_div.style.display = "";
    }
  }
  hide() {
    // super.hide();
    this.dom.style.zIndex = "0";
    console.info(`hide ViewMap`, this);

    const geolocation_div = document.getElementById("geolocation_div");
    geolocation_div.style.display = "none";
  }
}

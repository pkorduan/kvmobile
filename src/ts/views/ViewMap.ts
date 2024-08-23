import { Kvm } from "../app";
import { View } from "./View";

export class ViewMap extends View {
  constructor(app: Kvm) {
    super(app, "map");
  }

  show() {
    super.show();
    console.info(`show ViewMap`, this);
    this.app.map.invalidateSize();
    // TODO
    const geolocation_div = document.getElementById("geolocation_div");
    if (geolocation_div.innerHTML != "") {
      geolocation_div.style.display = "";
    }
  }
  hide() {
    super.hide();
    console.info(`hide ViewMap`, this);

    const geolocation_div = document.getElementById("geolocation_div");
    geolocation_div.style.display = "none";
  }
}

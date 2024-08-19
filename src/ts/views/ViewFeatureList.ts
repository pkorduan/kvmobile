import { Kvm, kvm } from "../app";
import { Layer } from "../Layer";
import { toggle } from "../Util";
import { View } from "./View";

export class ViewFeatureList extends View {
  activeLayer: Layer;
  dom: HTMLElement;
  featurelistHeading: HTMLElement;
  featurelistBody: HTMLElement;
  showSearch: HTMLElement;

  private fctUpdate: () => void;

  constructor(app: Kvm) {
    super(app, "featurelist");
    this.dom = <HTMLElement>document.getElementById("featurelist");
    this.featurelistHeading = <HTMLElement>document.getElementById("featurelistHeading");
    this.featurelistBody = <HTMLElement>document.getElementById("featurelistBody");
    this.showSearch = <HTMLElement>document.getElementById("showSearch");
    const searchFeatureField = <HTMLInputElement>document.getElementById("searchFeatureField");

    this.fctUpdate = () => this.update();

    for (const evt of ["keyup", "paste", "change", "search"]) {
      searchFeatureField.addEventListener(evt, () => {
        const needle = searchFeatureField.value.toLowerCase();
        const haystack = this.featurelistBody.querySelectorAll(".feature-item");
        haystack.forEach((el) => {
          const show = el.innerHTML.toLowerCase().indexOf(needle) > -1;
          (<HTMLElement>el).style.display = show ? "" : "none";
        });
      });
    }

    this.showSearch.addEventListener("click", () => {
      toggle(searchFeatureField);
    });

    app.addEventListener(Kvm.EVENTS.ACTIVE_LAYER_CHANGED, (evt) => {
      this.setActiveLayer(evt.newValue);
    });
    this.setActiveLayer(app.getActiveLayer());
  }

  setActiveLayer(layer: Layer) {
    console.error(`ViewFeatureList ${layer?.title}`);
    if (layer === this.activeLayer) {
      return;
    }
    if (this.activeLayer) {
      this.activeLayer.removeEventListener(this.fctUpdate);
    }
    this.activeLayer = layer;

    if (layer) {
      layer.addEventListener(this.fctUpdate);
      this.featurelistHeading.innerHTML = layer.get("alias") || layer.get("title");
      this.addFeatures(layer);
    } else {
      this.featurelistHeading.innerHTML = "Noch kein Layer ausgewählt";
      this.featurelistBody.innerHTML = 'Wählen Sie unter Einstellungen in der Gruppe "Layer" einen Layer aus. Öffnen Sie dann das Optionen Menü und wählen die Funktion "Daten synchronisieren"!';
      this.showSearch.style.display = "none";
    }
  }

  private update() {
    console.error(`ViewFeatureList.update ${this.activeLayer?.title}`);
    this.addFeatures(this.activeLayer);
  }

  /**
   * create the list of features in list view at once
   */
  private addFeatures(layer: Layer) {
    console.error("createFeatureList");
    this.featurelistBody.innerHTML = "";
    const doc = document.createDocumentFragment();

    const features = layer.getFeatures();

    features.forEach((feature) => {
      const element = feature.getListElement();
      doc.appendChild(element);
      element.addEventListener("click", () => {
        kvm.setActiveFeature(feature);
        if (layer.hasGeometry && feature.getDataValue(layer.get("geometry_attribute"))) {
          kvm.showItem("map");
          feature.activate(true);
        } else {
          kvm.showItem("dataView");
        }
        // layer.activateFeature(feature, true);
        // feature.activate(true);
      });
      this.featurelistBody.append(doc);
    });
  }

  show() {
    super.show();
    console.info(`show FeatureList`, this);
  }
  hide() {
    super.hide();
    console.info(`hide FeatureList`, this);
  }
}

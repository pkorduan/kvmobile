import { Kvm, kvm } from "../app";
import { Layer } from "../Layer";
import { PropertyChangeEvent } from "../Observable";
import { toggle } from "../Util";
import { show as showEinstellung } from "./PanelEinstellungen";
import { View } from "./View";

export class ViewFeatureList extends View {
  activeLayer: Layer = null;

  // featurelistHeading: HTMLElement;
  featurelistHeadingTxt: HTMLElement;

  featurelistBody: HTMLElement;
  showSearch: HTMLElement;

  private fctUpdate: (evt: PropertyChangeEvent) => void;

  constructor(app: Kvm) {
    super(app, "featurelist");
    this.dom = <HTMLElement>document.getElementById("featurelist");
    const featurelistHeading = <HTMLElement>document.getElementById("featurelistHeading");
    this.featurelistHeadingTxt = <HTMLElement>featurelistHeading.querySelector("h1");
    this.featurelistBody = <HTMLElement>document.getElementById("featurelistBody");
    this.showSearch = <HTMLElement>document.getElementById("showSearch");
    const searchFeatureField = <HTMLInputElement>document.getElementById("searchFeatureField");

    this.fctUpdate = (evt: PropertyChangeEvent) => this.update(evt);

    for (const evt of ["keyup", "paste", "change", "search"]) {
      searchFeatureField.addEventListener(evt, () => {
        console.info("searchFeatureField", evt);
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

    document.getElementById("no_active_layer_bttn").addEventListener("click", () => {
      showEinstellung("layer");
      kvm.showView("settings");
    });

    app.addEventListener(Kvm.EVENTS.ACTIVE_LAYER_CHANGED, (evt) => {
      this.setActiveLayer(evt.newValue);
    });
    this.setActiveLayer(app.getActiveLayer());

    app.addEventListener(Kvm.EVENTS.ACTIVE_FEATURE_CHANGED, (evt) => {
      console.info(`ViewFeatureList.activeFeatureChanged`, evt);
      if (evt.oldValue) {
        const el = <HTMLElement>this.featurelistBody.querySelector('[data-id="' + evt.oldValue.getFeatureId() + '"]');
        if (el) {
          el.classList.remove("selected-feature-item");
        }
      }
      if (evt.newValue) {
        const el = <HTMLElement>this.featurelistBody.querySelector('[data-id="' + evt.newValue.getFeatureId() + '"]');
        if (el) {
          el.classList.add("selected-feature-item");
        }
      }
    });
    this.setActiveLayer(app.getActiveLayer());
  }

  setActiveLayer(layer: Layer) {
    console.error(`ViewFeatureList.setActiveLayer ${layer?.title}`);
    if (layer === this.activeLayer) {
      return;
    }
    if (this.activeLayer) {
      this.activeLayer.removeEventListener(this.fctUpdate);
    }
    this.activeLayer = layer;

    if (layer) {
      layer.addEventListener(this.fctUpdate);
      this.featurelistHeadingTxt.innerHTML = layer.get("alias") || layer.get("title");
      this.addFeatures(layer);
      this.showSearch.style.display = "";
      document.getElementById("featurelistHeading").style.display = "";
      document.getElementById("featurelistHeadingNoLayer").style.display = "none";
    } else {
      document.getElementById("featurelistHeading").style.display = "none";
      document.getElementById("featurelistHeadingNoLayer").style.display = "";
      // this.featurelistHeading.innerHTML = "Noch kein Layer ausgewählt";
      // this.featurelistBody.innerHTML = 'Wählen Sie unter Einstellungen in der Gruppe "Layer" einen Layer aus. Öffnen Sie dann das Optionen Menü und wählen die Funktion "Daten synchronisieren"!';
      // this.showSearch.style.display = "none";
    }
  }

  private update(evt: PropertyChangeEvent) {
    // console.error(`ViewFeatureList.update ${this.activeLayer?.title}`, evt);
    this.addFeatures(this.activeLayer);
  }

  /**
   * create the list of features in list view at once
   */
  private addFeatures(layer: Layer) {
    // console.error("createFeatureList");
    this.featurelistBody.innerHTML = "";
    const doc = document.createDocumentFragment();

    const features = layer.getFeatures();

    features.forEach((feature) => {
      const element = feature.getListElement();
      element.dataset.id = feature.getFeatureId();
      doc.appendChild(element);
      element.addEventListener("click", () => {
        kvm.setActiveFeature(feature);
        if (layer.hasGeometry && feature.getDataValue(layer.get("geometry_attribute"))) {
          kvm.showView("map");
          feature.activate(true);
        } else {
          kvm.showView("dataView");
        }
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

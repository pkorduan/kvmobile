import { Layer } from "../Layer";
import { Kvm } from "../app";
import { Feature } from "../Feature";
import { View } from "./View";
import { sperrBildschirm } from "../SperrBildschirm";
import { createHtmlElement } from "../Util";

export class ViewDataView extends View {
  header: HTMLHeadingElement;
  dataViewDiv: HTMLDivElement;
  feature: Feature;

  constructor(app: Kvm) {
    super(app, "dataView");

    this.dom = <HTMLElement>document.getElementById("dataView");
    this.header = createHtmlElement("h1", this.dom);
    this.header.style.cssText = "margin-left: 5px;";
    this.dataViewDiv = createHtmlElement("div", this.dom);

    app.addEventListener(Kvm.EVENTS.ACTIVE_FEATURE_CHANGED, (evt) => {
      this.update(<Feature>evt.newValue);
    });
  }

  update(f: Feature) {
    console.error(`Feature ${f?.layer.title}`, f);
    this.feature = f;
    // this._update(f.layer);
    this._updateFeature(f);
  }

  show() {
    super.show();
    console.info(`show ViewDataView`, this);
  }
  hide() {
    super.hide();
    console.info(`hide ViewDataView`, this);
  }

  // private _update(layer: Layer) {
  //   console.log(`ViewDataView._update ${layer?.title}`);
  //   sperrBildschirm.tick(`${layer.title}:<br>&nbsp;&nbsp;Erzeuge Sachdatenanzeige neu.`);
  //   this.dataViewDiv.innerHTML = "";
  //   this.header.innerHTML = layer?.title || "";
  //   layer.attributeGroups.forEach((attributeGroup) => {
  //     if (attributeGroup.attributeIds.length > 0) {
  //       attributeGroup.div = createHtmlElement("div", this.dataViewDiv, "attribute-group");
  //       if (attributeGroup.collapsed) {
  //         attributeGroup.div.classList.add("collapsed");
  //       }
  //       // if (attributeGroup.name) {
  //       const attrGrpHead = createHtmlElement("div", attributeGroup.div, "attribute-group-header");
  //       attrGrpHead.innerHTML = attributeGroup.name;
  //       attrGrpHead.addEventListener("click", () => {
  //         attributeGroup.div.classList.toggle("collapsed");
  //       });
  //       // }
  //       const attrGrpBody = createHtmlElement("div", attributeGroup.div, "attribute-group-body");
  //       attributeGroup.attributeIds.forEach((attributeId) => {
  //         let attr = layer.attributes[attributeId];
  //         if (attr.get("type") != "geometry") {
  //           // if (attr.get("arrangement") == "0") {
  //           //   attrGrpBody.append('<div style="clear: both">');
  //           // }
  //           attrGrpBody.append(attr.viewField.getWithLabel());
  //           attr.viewField.bindEvents();
  //         }
  //       });
  //     }
  //   });
  // }

  private _updateFeature(f: Feature) {
    console.error(`_updateFeature ${f?.layer?.title} ${f?.id}`);
    if (f) {
      f.layer.createDataView();
      f.layer.loadFeatureToView(f, { editable: false });
    } else {
      this.dom.innerHTML = "";
    }
  }
}

import { Kvm } from "../app";
import { Feature } from "../Feature";
import { View } from "./View";
import { createHtmlElement } from "../Util";
import * as Util from "../Util";
import { Layer } from "../Layer";

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
    console.info(`ViewDataView.update ${f?.layer?.title} ${f?.id}`);
    this.feature = f;
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

  _createDataView(layer: Layer) {
    console.group("Layer.createDataView for Layer " + layer.title);
    // sperrBildschirm.tick(`${layer.title}:<br>&nbsp;&nbsp;Erzeuge Sachdatenanzeige neu.`);
    const dataView = document.getElementById("dataView");
    dataView.innerHTML = "";
    const h1 = createHtmlElement("h1", dataView);
    h1.innerText = layer.title; // + " (DataView)";
    const dataViewContent = createHtmlElement("div", dataView);
    // $("#dataView").append(`<h1 style="margin-left: 5px;">${this.title}</h1>`).append('<div id="dataViewDiv">');
    layer.attributeGroups.forEach((attributeGroup, idx) => {
      if (attributeGroup.attributeIds.length > 0) {
        const attrGroupDiv = (attributeGroup.div = createHtmlElement("div", dataViewContent, "attribute-group" + (attributeGroup.collapsed ? " collapsed" : "")));

        const attrGrpHead = createHtmlElement("div", attrGroupDiv, "attribute-group-header");
        attrGrpHead.addEventListener("click", () => {
          attrGroupDiv.classList.toggle("collapsed");
        });
        const attrGrpBody = createHtmlElement("div", attrGroupDiv, "attribute-group-body");
        attrGrpBody.id = "dataview-attribute-group-body-" + idx;
        attrGrpHead.append(attributeGroup.name); // befülle group header
        attributeGroup.attributeIds.forEach((attributeId) => {
          const attr = layer.attributes[attributeId];
          if (attr.get("type") != "geometry") {
            // befülle group body
            //console.log(`viewAttr: ${attr.get('name')} arrangement: ${attr.get('arrangement')}`);
            if (attr.get("arrangement") == "0") {
              // ToDo
              // attrGrpBody.append('<div style="clear: both">');
            }
            if (attr.get("privilege")) {
              const dom = attr.viewField.getDom();
              attrGrpBody.append(dom);
              if (attr.get("name") === "bilder") {
                console.info("adding ViewField for '" + attr.get("name") + "' display=" + dom.style?.display, dom);
                // traceElementChange(dom);
              }
            }
            attr.viewField.bindEvents();
          }
        });
        // attributeGroup.div.append(attrGrpHead).append(attrGrpBody);
        // $("#dataViewDiv").append(attributeGroup.div);
      }
    });
    console.groupEnd();
    // $(".attribute-group-header").on("click", (evt) => {
    //   console.log("attribute-group-header");
    //   $(evt.target).toggleClass("b-expanded b-collapsed");
    //   $(evt.target).next().toggle();
    // });
  }

  private async _updateFeature(f: Feature) {
    if (f) {
      try {
        this._createDataView(f.layer);
        await f.layer.loadFeatureToView(f, { editable: false });
      } catch (ex) {
        await Util.showError("Fehler beim Aktivieren des Features im Formular", ex);
      }
    }
  }
}

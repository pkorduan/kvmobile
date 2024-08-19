import { Layer } from "../Layer";
import { Kvm } from "../app";
import { Feature } from "../Feature";
import { sperrBildschirm } from "../SperrBildschirm";
import { createHtmlElement } from "../Util";
import { View } from "./View";

export class ViewFormular extends View {
  header: HTMLHeadingElement;
  featureFormular: HTMLFormElement;
  feature: Feature;

  constructor(app: Kvm) {
    super(app, "formular");
    this.header = createHtmlElement("h1", this.dom);
    this.header.style.cssText = "margin-left: 5px;";
    this.header = createHtmlElement("h1", this.dom);

    this.featureFormular = createHtmlElement("form", this.dom);

    app.addEventListener(Kvm.EVENTS.ACTIVE_FEATURE_CHANGED, (evt) => {
      this.update(<Feature>evt.newValue);
    });
  }

  update(f: Feature) {
    console.error(`ViewFormular.update Feature ${f?.layer.title}`, f);
    this.feature = f;
    // this._update(f.layer);
    this._updateFeature(f);
  }

  show() {
    super.show();
    console.info(`show ViewFormular`, this);
  }
  hide() {
    super.hide();
    console.info(`hide ViewFormular`, this);
  }

  // private _update(layer: Layer) {
  //   console.log(`ViewFormular._update ${layer?.title}`);
  //   sperrBildschirm.tick(`${layer.title}:<br>&nbsp;&nbsp;Erzeuge Featureformular neu.`);

  //   layer.attributeGroups.forEach((attributeGroup) => {
  //     if (attributeGroup.attributeIds.length > 0) {
  //       attributeGroup.div = createHtmlElement("div", this.featureFormular, "attribute-group");
  //       const attrGrpHead = createHtmlElement("div", attributeGroup.div, `attribute-group-header ${attributeGroup.collapsed ? "b-collapsed" : "b-expanded"}`);
  //       const attrGrpBody = createHtmlElement("div", attributeGroup.div, `attribute-group-body`);
  //       attrGrpBody.style.display = attributeGroup.collapsed ? ': none"' : "";
  //       attrGrpHead.append(attributeGroup.name);

  //       attributeGroup.attributeIds.forEach((attributeId) => {
  //         const attr = layer.attributes[attributeId];
  //         // console.log(`viewAttr: ${attr.get('name')} arrangement: ${attr.get('arrangement')}`);
  //         // if (attr.get("arrangement") == "0") {
  //         //   attrGrpBody.append('<div style="clear: both">');
  //         // }
  //         const formFieldElement = (<any>attr.formField).element;
  //         if (formFieldElement instanceof HTMLElement) {
  //           attrGrpBody.append(formFieldElement);
  //         } else if (formFieldElement.get) {
  //           const els = formFieldElement.get();
  //           attrGrpBody.append(...els);
  //         }
  //       });
  //       attributeGroup.div.append(attrGrpHead);
  //       attributeGroup.div.append(attrGrpBody);
  //       // $("#featureFormular").append(attributeGroup.div);
  //     }
  //   });
  //   $("#formular").append(`
  // 		<div id="newAfterCreateDiv" style="margin: 20px; display: none">
  // 			<input
  // 				id = "newAfterCreate"
  // 				type="checkbox"
  // 				name="newAfterCreate"
  // 				${this.app.config.newAfterCreate ? " checked" : ""}
  // 				onchange="
  // 					kvm.config.newAfterCreate = this.checked;
  // 					console.log('Set newAfterCreate to ', kvm.config.newAfterCreate);
  // 					kvm.store.setItem('newAfterCreate', kvm.config.newAfterCreate.toString());
  // 				"
  // 			> und neuen Datensatz erfassen
  // 		</div>
  // 	`);
  //   for (let i = 0; i < layer.attributes.length; i++) {
  //     const attr = layer.attributes[i];
  //     attr.formField.bindEvents();
  //     // add change event handler here to avoid redundancy in different bindEvents methods of formField classes
  //     if (attr.isEditable() && attr.hasVisibilityDependency()) {
  //       console.log(`Set vcheck event handler for attribute ${attr.get("name")}`);
  //       $(`${attr.formField.selector}`).on("change", (evt) => {
  //         const attributeId = $(evt.target).attr("id");
  //         const attribute = this.app.getActiveLayer().attributes[attributeId];
  //         console.log("Attribute: %s changed to value: %s", attribute.get("name"), attribute.formField.getValue());
  //         this.app.getActiveLayer().vcheckAttributes(attribute.get("name"), attribute.formField.getValue());
  //       });
  //     }
  //   }
  // }

  private _updateFeature(f: Feature) {
    f.layer.createFeatureForm();
    f.layer.loadFeatureToForm(f, { editable: false });
  }
}

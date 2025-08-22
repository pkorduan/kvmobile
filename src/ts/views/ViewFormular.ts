import { Layer } from "../Layer";
import { Kvm } from "../app";
import { Feature } from "../Feature";
import { sperrBildschirm } from "../SperrBildschirm";
import { createHtmlElement } from "../Util";
import { View } from "./View";
import * as Util from "../Util";
import { Menu } from "../Menu";
import { Attribute } from "../Attribute";
import { GeometrieFormField } from "../GeometryFormField";

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

    app.addEventListener(Kvm.EVENTS.ACTIVE_FEATURE_CHANGED, async (evt) => {
      console.log("ViewFormular.update", evt.newValue);
      this.update(<Feature>evt.newValue);
    });

    document.addEventListener("geomChanged", (event: CustomEvent) => {
      try {
        console.error(`GeometrieFormField.geom changed ${this.feature?.layer.title} ${this.feature?.id}`);
        sperrBildschirm.show();
        if (this.feature) {
          const layer = this.feature?.layer;
          const attr = layer.getAttribute(layer.settings.geometry_attribute);
          if (attr.formField instanceof GeometrieFormField) {
            attr.formField.geomChanged(event);
          }
        }
      } catch (ex) {
        console.error("Fehler", ex);
      }
      sperrBildschirm.close();
    });
  }

  update(f: Feature) {
    console.info(`ViewFormular.update ${f?.layer?.title} ${f?.id}`, f);
    this.feature = f;
    this._updateFeature(f);
  }

  _createForm(layer: Layer) {
    console.group("ViewFormular create Form for Layer " + layer.title);
    this.dom.innerHTML = "";
    const h1 = Util.createHtmlElement("h1", this.dom);
    h1.innerText = layer.title;
    h1.innerText = layer.title; // + " (FeatureForm)";
    h1.style.cssText = "margin-left: 5px;";
    this.app.menu.enableSaveFeatureButton(false);
    const formDiv = Util.createHtmlElement("div", this.dom);
    // formDiv.id = "formDiv";
    const form = Util.createHtmlElement("form", formDiv); // id = featureFormular
    form.id = "featureFormular";
    layer.attributeGroups.forEach((attributeGroup, idx) => {
      if (attributeGroup.attributeIds.length > 0) {
        const attrGroupDiv = (attributeGroup.div = Util.createHtmlElement("div", form, "attribute-group" + (attributeGroup.collapsed ? " collapsed" : "")));

        const attrGrpHead = Util.createHtmlElement("div", attrGroupDiv, "attribute-group-header");
        attrGrpHead.addEventListener("click", () => {
          attrGroupDiv.classList.toggle("collapsed");
        });
        const attrGrpBody = Util.createHtmlElement("div", attrGroupDiv, "attribute-group-body");
        attrGrpBody.id = "attribute-group-body-" + idx;
        attrGrpHead.append(attributeGroup.name);
        attributeGroup.attributeIds.forEach((attributeId) => {
          const attr = layer.attributes[attributeId];
          // console.log(`viewAttr: ${attr.get("name")} arrangement: ${attr.get("arrangement")}`);

          if (attr.get("arrangement") == "0") {
            Util.createHtmlElement("div", form, null, { styleText: "clear: both" });
          }
          if (attr.get("privilege")) {
            attrGrpBody.append(attr.formField.getDom());
          }
          attr.formField.bindEvents?.();
          // add change event handler here to avoid redundancy in different bindEvents methods of formField classes

          // if (attr.isEditable() && attr.hasVisibilityDependency()) {
          if (attr.isEditable()) {
            console.log(`Set vcheck event handler for attribute ${attr.get("name")} - ${attr.formField.selector}`, attr.formField);
            // const el = document.querySelector(attr.formField.selector);

            if (attr.formField) {
              attr.formField.addChangeListener((formField) => {
                // const attributeId = $(evt.target).attr("id");
                // const attribute = kvm.getActiveLayer().attributes[attributeId];
                // console.error("check for changes");
                const hasChanged = this.hasChanged();
                // console.log("Attribute: %s changed to value: %s hasChanged=%s", attr.get("name"), attr.formField.getValue(), hasChanged);
                this.app.menu.enableSaveFeatureButton(hasChanged);
                if (attr.hasVisibilityDependency()) {
                  layer.vcheckAttributes(attr.get("name"), attr.formField.getValue(), attr.formField, "form");
                }
                this.hideEmptyGroups(this.feature);
              });
            }
          }
        });
      }
    });
    console.log("ViewFormular Form createdLayer=" + layer.title);
    console.groupEnd();
  }

  hideEmptyGroups(f: Feature) {
    const layer = f.layer;
    for (let attrGroupId = 0; attrGroupId < layer.attributeGroups.length; attrGroupId++) {
      const attrGrp = layer.attributeGroups[attrGroupId];
      const attrGroupBody = document.getElementById("attribute-group-body-" + attrGroupId);
      function hasVisibleItems() {
        for (let attrIdx = 0; attrIdx < attrGrp.attributeIds.length; attrIdx++) {
          const attr = layer.attributes[attrGrp.attributeIds[attrIdx]];
          const isVisible = attr.formField.isVisible();
          if (isVisible) {
            return true;
          }
        }
        return false;
      }
      if (!hasVisibleItems()) {
        attrGroupBody.parentElement.style.display = "none";
      } else {
        if (attrGroupBody?.parentElement) {
          attrGroupBody.parentElement.style.display = "";
        } else {
          console.error("attrGroupBody?.parentElement is undefined");
        }
      }
    }
  }

  private hasChanged(): boolean {
    const layer = this.feature.layer;
    for (const attr of layer.attributes) {
      if (attr.settings.form_element_type !== "SubFormEmbeddedPK") {
        const changed = attr.formField.getValue() != this.feature.getDataValue(attr.settings.name);
        if (changed) {
          // console.info(`hasChanged: "${attr.settings.name}" ${this.feature.getDataValue(attr.settings.name)} => ${attr.formField.getValue()}`);
          return true;
        }
      }
    }
    return false;
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

  /**
   * - Befüllt das Formular des Layers mit den Attributwerten des übergebenen Features
   * - Setzt das Feature als activeFeature im Layer
   * - Startet das GPS-Tracking
   */
  async loadFeatureToForm(feature: Feature, options = { editable: false }) {
    const layer = feature.layer;
    console.group(`ViewFormular.loadFeatureToForm layer=´${layer.title}`, feature.getDataValue(layer.settings.id_attribute));

    for (const attr of layer.attributes) {
      const attrName = attr.get("name");
      const val = feature.getDataValue(attrName) == "null" ? null : feature.getDataValue(attrName);

      await attr.formField.setValue(feature, val);

      // TODO
      if (val === null && !attr.isEditable()) {
        // attr.formField.getDom().style.display = "none";
        // Blende Attribute aus, die keinen Wert haben und nur lesbar sind.
        // $(`#formFieldDiv_${attr.get("index")}`).hide();
      }

      if (attr.get("visible") === "0") {
        attr.formField.hide();
      }

      if (this.app.coalesce(attr.get("required_by"), "") != "") {
        // TODO rtr
        const required_by_idx = layer.attribute_index[attr.get("required_by")];
        // console.info("FormField=" + layer.attributes[required_by_idx].formField, this === kvm.getActiveLayer());
        (<any>layer.attributes[required_by_idx].formField).filter_by_required(attr.get("name"), val);
      }

      if (attr.hasVisibilityDependency()) {
        layer.vcheckAttributes(attr.get("name"), val, attr.formField, "form");
      }
    }
    this.hideEmptyGroups(feature);
    console.groupEnd();
  }

  private async _updateFeature(f: Feature) {
    console.log("ViewFormular._updateFeature", f);
    try {
      this.app.menu.enableSaveFeatureButton(false);
      if (f) {
        this._createForm(f.layer);
        console.log("ViewFormular._updateFeature=>loadFeatureToForm");
        await this.loadFeatureToForm(f, { editable: false });
      }
    } catch (ex) {
      await Util.showError("Fehler beim Aktivieren des Features im Formular", ex);
    }
  }
}

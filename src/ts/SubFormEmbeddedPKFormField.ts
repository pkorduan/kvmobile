import { kvm } from "./app";
import { Attribute, AttributeSetting } from "./Attribute";
import { Field } from "./Field";
import { createHtmlElement } from "./Util";

/*
 * create a SubFormEmbeddedPK form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <ul>
 *         <li>Vorschauattribut 1</li>
 *         <li>Vorschauattribut 2</li>
 *         <li>Vorschauattribut i</li>
 *         <li>Vorschauattribut n</li>
 *       </ul>
 *       <input type="button" value="Neu" onclick="newFeature(this.feature.id, subformLayerId)"/>
 *     </div>
 *   </div>
 */
export class SubFormEmbeddedPKFormField implements Field {
  // TODO
  settings: AttributeSetting;
  selector: string;
  element: HTMLElement;
  attr: Attribute;

  lsts: { (src: Field, hasChanged: boolean): void }[] = [];
  bttNewSubItem: HTMLButtonElement;
  subItemList: HTMLDivElement;
  spanMsgNewFeature: HTMLSpanElement;

  constructor(formId: string, attribute: Attribute) {
    console.info(`new SubFormEmbeddedPKFormField(${formId}, ${attribute.settings.name})`);
    this.attr = attribute;
    this.settings = attribute.settings;

    this.bttNewSubItem = createHtmlElement("button");
    this.bttNewSubItem.innerText = "neu";
    this.bttNewSubItem.style.padding = "0.1em 1em";
    this.bttNewSubItem.addEventListener("click", (evt) => {
      // console.info(`new SubLayerItem globalLayerId=${attribute.getGlobalLayerId()} globalSubLayerId=${attribute.getGlobalSubLayerId()} FKAttribute=${attribute.getFKAttribute()}`);
      // await kvm.newSubFeature({
      //   parentLayerId: attribute.getGlobalLayerId(),
      //   subLayerId: attribute.getGlobalSubLayerId(),
      //   fkAttribute: attribute.getFKAttribute(),
      //   parentFeatureId: kvm.getActiveFeature().id,
      // });
      evt.preventDefault();
      this.bttNewSubItemClicked();
    });

    this.subItemList = createHtmlElement("div", null, "form-value");
  }

  async bttNewSubItemClicked() {
    const attribute = this.attr;
    console.info(`new SubLayerItem globalLayerId=${attribute.getGlobalLayerId()} globalSubLayerId=${attribute.getGlobalSubLayerId()} FKAttribute=${attribute.getFKAttribute()}`);
    await kvm.newSubFeature({
      parentLayerId: attribute.getGlobalLayerId(),
      subLayerId: attribute.getGlobalSubLayerId(),
      fkAttribute: attribute.getFKAttribute(),
      parentFeatureId: kvm.getActiveFeature().id,
    });
  }

  /**
   *
   * @param val Der Wert ist leer weil in einem SubFormEmbedded die Werte erst abgefragt
   * werden über die ID des Datensatzes der in id_attribut steht
   */
  async setValue(val) {
    const feature = this.attr.layer.activeFeature;
    console.log("setValue of SubFormEmbeddedPK FormField " + typeof val);

    if (feature.new) {
      this.bttNewSubItem.style.display = "none";
      if (!this.spanMsgNewFeature) {
        this.spanMsgNewFeature = createHtmlElement("span");
        this.spanMsgNewFeature.innerText = "Können erst angelegt werden wenn der neue Datensatz gespeichert ist.";
        this.element.append(this.spanMsgNewFeature);
      }
    } else {
      this.bttNewSubItem.style.display = "";
      this.spanMsgNewFeature?.remove();
      this.attr.layer.readVorschauAttributes(this.attr, feature.getDataValue(this.attr.getPKAttribute()), this.subItemList, "editFeature");
    }
  }

  getValue(action = "") {}

  getDom(): HTMLElement {
    if (!this.element) {
      const div = (this.element = createHtmlElement("div", null, "form-field-rows"));
      div.id = `formFieldDiv_${this.attr.layer.get("id")}_${this.attr.get("index")}`;
      div.style.cssText = this.attr.getArrangementStyle();
      const fL = createHtmlElement("div", div, "form-label");

      const settings = this.attr.settings;
      const labelDiv = createHtmlElement("label", fL);
      labelDiv.htmlFor = settings.name;
      labelDiv.innerText = (settings.alias ? settings.alias : settings.name) + (settings.nullable == 0 ? "*" : "");
      fL.appendChild(this.bttNewSubItem);
      fL.style.cssText = "display: flex;justify-content: space-between;";

      if (settings.tooltip) {
        const infoBttn = createHtmlElement("i", labelDiv, "fa fa-exclamation-circle");
        infoBttn.style.color = "#f57802";
        infoBttn.style.paddingLeft = "0.2rem";
        infoBttn.addEventListener("click", () => kvm.msg(settings.tooltip));
      }
      div.append(this.subItemList);
    }
    return this.element;
  }

  hasChanged() {
    return false;
  }

  addChangeListener(lst: (src: Field, hasChanged: boolean) => void) {
    this.lsts.push(lst);
  }

  fireChanged() {
    for (let i = 0; i < this.lsts.length; i++) {
      this.lsts[i](this, this.hasChanged());
    }
  }

  hide() {
    if (this.element) {
      this.element.style.display = "none";
    }
  }
  show() {
    if (this.element) {
      this.element.style.display = "";
    }
  }
}

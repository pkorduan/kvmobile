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
  attribute: Attribute;

  lsts: { (src: Field, hasChanged: boolean): void }[] = [];

  constructor(formId: string, attribute: Attribute) {
    console.info(`new SubFormEmbeddedPKFormField(${formId}, ${attribute.settings.name})`);
    this.attribute = attribute;
    this.settings = attribute.settings;
    this.selector = "#" + formId + " input[id=" + attribute.settings.index + "]";
    this.element = createHtmlElement("div");
    this.element.id = "xxxxxxxxxxxxxxx";
  }

  // get(key) {
  //     return this.attribute.settings[key];
  // }

  /**
   *
   * @param val Der Wert ist leer weil in einem SubFormEmbedded die Werte erst abgefragt
   * werden über die ID des Datensatzes der in id_attribut steht
   */
  async setValue(val) {
    const feature = this.attribute.layer.activeFeature;
    console.log("setValue of SubFormEmbeddedPK FormField");
    this.element.innerHTML = "";
    if (feature.new) {
      $("#new_sub_data_set").hide();
      const span = createHtmlElement("span", this.element);
      span.innerText = "Können erst angelegt werden wenn der neue Datensatz gespeichert ist.";
    } else {
      $("#new_sub_data_set").show();
      this.attribute.layer.readVorschauAttributes(this.attribute, feature.getDataValue(this.attribute.getPKAttribute()), this.element, "editFeature");
    }
  }

  getValue(action = "") {}

  getDom(): HTMLElement {
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
    if (this.element?.parentElement) {
      this.element.parentElement.style.display = "none";
    }
  }
  show() {
    if (this.element?.parentElement) {
      this.element.parentElement.style.display = "";
    }
  }
}

import { Attribute, AttributeSetting } from "./Attribute";
import { AbstractField } from "./Field";
import { kvm } from "./app";
import { createHtmlElement } from "./Util";

/*
 * create a UserID form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="text" id="1" name="bezeichnung" value="Wert" disabled/>
 *     </div>
 *   </div>
 */
export class UserIDFormField extends AbstractField {
  element: HTMLInputElement;
  constructor(formId: string, attr: Attribute) {
    super(formId, attr);
    //console.log('Erzeuge UserIDFormField with settings %o', settings);
    // this.selector = "#" + formId + " input[id=" + this.settings.index + "]";
    this.element = createHtmlElement("input");
    this.element.type = "text";
    this.element.id = String(attr.settings.index);
    this.element.name = attr.settings.name;
    this.element.disabled = true;
  }

  // get(key) {
  //     return this.settings[key];
  // }

  async setValue(val) {
    if (kvm.coalesce(val, "") == "" && this.attr.settings.default) {
      val = this.attr.settings.default;
    }
    this.element.value = val == null || val == "null" ? "" : val;
  }

  getValue(action = "") {
    kvm.log("UserIDFormField.getValue", 4);
    let val = this.element.value;
    if (typeof val === "undefined" || val == "") {
      val = null;
    }
    return val;
  }

  getAutoValue() {
    kvm.log("UserIDFormField.getAutoValue");
    return kvm.store.getItem("userId");
  }

  createInputElement(): HTMLElement {
    return this.element;
  }
}

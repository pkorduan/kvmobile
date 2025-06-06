import { AttributeSetting } from "./Attribute";
import { AbstractField, Field } from "./Field";
import { createHtmlElement } from "./Util";
import { kvm } from "./app";

/*
 * create a StelleID form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="text" id="1" name="bezeichnung" value="Wert" disabled/>
 *     </div>
 *   </div>
 */
export class StelleIDFormField extends AbstractField {
  element: HTMLInputElement;
  constructor(formId: string, settings: AttributeSetting) {
    super(formId, settings);
    this.element = createHtmlElement("input");
    this.element.type = "text";
    this.element.id = String(this.settings.index);
    this.element.name = this.settings.name;
    this.element.disabled = true;
  }

  async setValue(val) {
    if (kvm.coalesce(val, "") == "" && this.settings.default) {
      val = this.settings.default;
    }
    this.element.value = val == null || val == "null" ? "" : val;
  }

  getValue(action = "") {
    kvm.log("StelleIDFormField.getValue", 4);
    let val = this.element.value;
    if (typeof val === "undefined" || val == "") {
      return null;
    }
    return val;
  }

  getAutoValue() {
    kvm.log("StelleIDFormField.getAutoValue");
    return kvm.getActiveStelle().get("ID");
  }

  bindEvents() {}

  getDom(): HTMLElement {
    return this.element;
  }
}

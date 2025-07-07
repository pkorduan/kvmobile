import { Attribute, AttributeSetting } from "./Attribute";
import { AbstractField, Field } from "./Field";
import { createHtmlElement } from "./Util";
import { kvm } from "./app";

/*
 * create a ClientID form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="text" id="1" name="bezeichnung" value="Wert" disabled/>
 *     </div>
 *   </div>
 */
export class ClientIDFormField extends AbstractField {
  element: HTMLInputElement;
  constructor(formId: string, attr: Attribute) {
    //console.log('Erzeuge ClientIDFormField with settings %o', settings);
    super(formId, attr);

    this.element = createHtmlElement("input");
    this.element.type = "text";
    this.element.id = String(attr.settings.index);
    this.element.name = attr.settings.name;
    this.element.disabled = true;
  }

  async setValue(val) {
    if (kvm.coalesce(val, "") == "" && this.attr.settings.default) {
      val = this.attr.settings.default;
    }
    this.element.value = val == null || val == "null" ? "" : val;
  }

  getValue(action = "") {
    console.log("ClientIDFormField.getValue");
    let val = this.element.value;
    if (typeof val === "undefined" || val == "") {
      return null;
    }
    return val;
  }

  getAutoValue() {
    console.log("ClientIDFormField.getAutoValue");
    return device.uuid;
  }

  createInputElement(): HTMLElement {
    return this.element;
  }
}

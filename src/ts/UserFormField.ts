import { Attribute, AttributeSetting } from "./Attribute";
import { AbstractField, Field } from "./Field";
import { kvm } from "./app";
import { createHtmlElement } from "./Util";

/*
 * create a User form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="text" id="1" name="bezeichnung" value="Wert"/>
 *     </div>
 *   </div>
 */
export class UserFormField extends AbstractField {
  element: HTMLInputElement;

  constructor(formId: string, attr: Attribute) {
    //console.log('Erzeuge UserFormField with settings %o', settings);
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
    // console.log("UserFormField.getValue");
    var val = this.element.value;
    if (typeof val === "undefined" || val == "") {
      val = null;
    }
    return val;
  }

  getAutoValue() {
    console.log("UserFormField.getAutoValue");
    return kvm.store.getItem("userName");
  }

  createInputElement(): HTMLElement {
    return this.element;
  }
}

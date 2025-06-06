import { AttributeSetting } from "./Attribute";
import { AbstractField, Field } from "./Field";
import { createHtmlElement } from "./Util";
import { kvm } from "./app";
/*
 * create a text form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="text" id="1" name="bezeichnung" value="Wert"/>
 *     </div>
 *   </div>
 */
export class TextFormField extends AbstractField implements Field {
  element: HTMLInputElement;

  constructor(formId: string, settings: AttributeSetting) {
    super(formId, settings);

    this.element = createHtmlElement("input");
    this.element.type = "text";
    this.element.id = String(this.settings.index);
    this.element.name = this.settings.name;
    const disabled = (this.element.disabled = this.settings.privilege == "0");
    if (!disabled) {
      this.element.addEventListener("input", () => {
        this._value = this.element.value || null;
        this.fireChanged();
      });
    }
  }

  async setValue(val: string) {
    console.log("TextFormField " + this.settings.name + " setValue with value: %o", val);
    this._oldValue = val;
    if (kvm.coalesce(val, "") == "" && this.settings.default) {
      val = this.settings.default;
    }
    this._value = val;
    this.element.value = val == null || val == "null" ? "" : val;
  }

  /*
   * get the value from form field expect
   * form_element_type UserID, here get the value from store
   * when no action is given in options specified or
   * action == option
   */
  getValue(action = "") {
    //console.log('TextFormField.getValue');
    let val = this.element.value;

    if (typeof val === "undefined" || val == "") {
      val = null;
    }

    if (this.settings.form_element_type == "UserID" && (action == "" || this.settings.options == "" || action.toLowerCase() == this.settings.options.toLowerCase())) {
      val = kvm.store.getItem("userId");
    }

    return val;
  }

  getDom(): HTMLElement {
    return this.element;
  }
}

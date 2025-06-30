import { Attribute, AttributeSetting } from "./Attribute";
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

  constructor(formId: string, attr: Attribute) {
    super(formId, attr);

    this.element = createHtmlElement("input");
    this.element.type = "text";
    this.element.id = String(this.attr.settings.index);
    this.element.name = this.attr.settings.name;
    const disabled = (this.element.disabled = this.attr.settings.privilege == "0");
    if (!disabled) {
      this.element.addEventListener("input", () => {
        this._value = this.element.value || null;
        this.fireChanged();
      });
    }
  }

  async setValue(val: string) {
    console.log("TextFormField " + this.attr.settings.name + " setValue with value: %o", val);
    this._oldValue = val;
    if (kvm.coalesce(val, "") == "" && this.attr.settings.default) {
      val = this.attr.settings.default;
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

    if (this.attr.settings.form_element_type == "UserID" && (action == "" || this.attr.settings.options == "" || action.toLowerCase() == this.attr.settings.options.toLowerCase())) {
      val = kvm.store.getItem("userId");
    }

    return val;
  }

  createInputElement(): HTMLElement {
    return this.element;
  }
}

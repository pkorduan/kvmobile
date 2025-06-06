import { AttributeSetting } from "./Attribute";
import { AbstractField } from "./Field";
import { kvm } from "./app";
import { createHtmlElement } from "./Util";
/*
 * create a textarea form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="text" id="1" name="bezeichnung" value="Wert"/>
 *     </div>
 *   </div>
 */
export class TextfeldFormField extends AbstractField {
  element: HTMLTextAreaElement;

  constructor(formId: string, settings: AttributeSetting) {
    super(formId, settings);
    console.log("TextfeldFormField", settings);
    this.element = createHtmlElement("textarea");
    this.element.id = String(this.settings.index);
    this.element.name = this.settings.name;
    const disabled = (this.element.disabled = this.settings.privilege == "0");
    if (!disabled) {
      this.element.addEventListener("keyup", () => {
        this._value = this.element.value || null;
        this.fireChanged();
      });
    }
  }

  async setValue(val: string) {
    console.log("TextFormField.setValue with value: " + val);
    this._oldValue = val;
    if (kvm.coalesce(val, "") == "" && this.settings.default) {
      val = this.settings.default;
    }
    this._oldValue = val;
    this.element.value = val == null || val == "null" ? "" : val;
  }

  getValue(action = "") {
    return this._value;
  }

  getDom(): HTMLElement {
    return this.element;
  }
}

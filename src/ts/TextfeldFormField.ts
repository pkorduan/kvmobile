import { Attribute, AttributeSetting } from "./Attribute";
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

  constructor(formId: string, attr: Attribute) {
    super(formId, attr);
    this.element = createHtmlElement("textarea");
    this.element.id = attr.layer.get("id") + "-" + String(attr.settings.index);
    this.element.name = attr.settings.name;
    const disabled = (this.element.disabled = attr.settings.privilege == "0");
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
    if (kvm.coalesce(val, "") == "" && this.attr.settings.default) {
      val = this.attr.settings.default;
    }
    this._oldValue = val;
    this.element.value = val == null || val == "null" ? "" : val;
  }

  getValue(action = "") {
    return this.element.value || null;
  }

  createInputElement(): HTMLElement {
    return this.element;
  }
}

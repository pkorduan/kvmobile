import { AttributeSetting } from "./Attribute";
import { AbstractField, Field } from "./Field";
import { createHtmlElement } from "./Util";

export class CheckboxFormField extends AbstractField implements Field {
  element: HTMLInputElement;

  constructor(formId: string, settings: AttributeSetting) {
    super(formId, settings);

    this.element = createHtmlElement("input");
    this.element.type = "checkbox";
    this.element.id = String(this.settings.index);
    this.element.name = this.settings.name;
    this.element.disabled = this.settings.privilege == "0";

    this.element.addEventListener("click", () => {
      this._value = this.element.checked ? "t" : "f";
      this.fireChanged();
    });
  }

  async setValue(val: string) {
    this._oldValue = val;

    if (!val && this.settings.default) {
      val = this.settings.default;
    }
    this.element.checked = val == "t";
    this._value = val;
  }

  getDom(): HTMLElement {
    return this.element;
  }
}

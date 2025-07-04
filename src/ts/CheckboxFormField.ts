import { Attribute, AttributeSetting } from "./Attribute";
import { AbstractField, Field } from "./Field";
import { createHtmlElement } from "./Util";

export class CheckboxFormField extends AbstractField implements Field {
  element: HTMLInputElement;

  constructor(formId: string, attr: Attribute) {
    super(formId, attr);

    this.element = createHtmlElement("input");
    this.element.type = "checkbox";
    this.element.id = String(attr.settings.index);
    this.element.name = attr.settings.name;
    this.element.disabled = attr.settings.privilege == "0";

    this.element.addEventListener("click", () => {
      this._value = this.element.checked ? "t" : "f";
      this.fireChanged();
    });
  }

  async setValue(val: string) {
    this._oldValue = val;

    if (!val && this.attr.settings.default) {
      val = this.attr.settings.default;
    }
    this.element.checked = val == "t";
    this._value = val;
  }

  createInputElement(): HTMLElement {
    return this.element;
  }
}

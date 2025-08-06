import { kvm } from "./app";
import { Attribute, AttributeSetting } from "./Attribute";
import { Feature } from "./Feature";
import { AbstractField, Field } from "./Field";
import { executeSQL } from "./Util";
import { createHtmlElement } from "./Util";

/**
 * SubFormFK Attribute sind keine Autoattribute
 * Der Wert wird zwar wenn er leer ist setValue über within gesucht,
 * kann aber ggf. später auch mal über eine Auswahlliste im Formular gesetzt werden
 * und das ist dann kein Autoattribute
 */
export class SubFormFKFormField extends AbstractField {
  // settings: AttributeSetting;
  // private element: HTMLInputElement;
  linkElement: HTMLElement;
  span: HTMLSpanElement;
  // attribute: Attribute;
  // selector: string;
  // value: string;
  // counter = 0;
  parentFeatureId: string;

  constructor(formId: string, attr: Attribute) {
    super(formId, attr);

    this.linkElement = createHtmlElement("div", null, "link-element pointer");
    createHtmlElement("i", this.linkElement, "fa fa-arrow-left");
    this.span = createHtmlElement("span", this.linkElement);

    this.linkElement.addEventListener("click", () => {
      if (this.parentFeatureId) {
        kvm.editFeature(attr.getGlobalParentLayerId(), this.parentFeatureId);
      }
    });
  }

  async setValue(f: Feature, val) {
    console.error("Attribute: %s, SubFormFKFormField.setValue options: %o, value: %s", this.attr?.settings.name, this.attr?.settings.options, val);
    // ToDo: Prüfen warum hier noch mal default gesetzt wird. Das wird auch schon in getNewData gemacht.
    if (val) {
      this.parentFeatureId = val;
      this.span.innerText = this.attr.getVorschauOption();
    }
  }

  getValue(action = "") {
    console.log(`SubFormFKFormField ${this.attr.layer.title}.${this.attr.settings.name}.getValue => ${this.parentFeatureId}`);
    return this.parentFeatureId;
  }

  getAutoValue(f: Feature) {
    const attributeName = this.attr.name;
    return f.getDataValue(attributeName);
  }

  /**
   * @return string: ID of sublayer
   */
  getParentLayerId() {
    return this.attr.settings.options.split(";")[0].split(",")[0];
  }

  hasChanged(): boolean {
    return false;
  }

  createInputElement(): HTMLElement {
    return this.linkElement;
  }

  // getDom(): HTMLElement {
  //   return this.element;
  // }

  // hide() {
  //   if (this.element?.parentElement) {
  //     this.element.parentElement.style.display = "none";
  //   }
  // }
  // show() {
  //   if (this.element?.parentElement) {
  //     this.element.parentElement.style.display = "";
  //   }
  // }
}

import { kvm } from "./app";
import { Attribute, AttributeSetting } from "./Attribute";
import { Feature } from "./Feature";
import { createHtmlElement } from "./Util";

export interface FieldChangeEvent {
  src: Field;
}

export interface Field {
  settings?: AttributeSetting;
  selector?: string;

  setValue: (f: Feature, val: string) => Promise<void>;
  getValue?: (action?: string) => any;

  getAutoValue?: (f: Feature) => any;

  addChangeListener?: (lst: (src: Field, hasChanged: boolean) => void) => void;
  bindEvents?(): void;

  hasChanged(): boolean;

  getDom(): HTMLElement;

  hide(): void;
  show(): void;
}

export abstract class AbstractField implements Field {
  // settings?: AttributeSetting;
  attr?: Attribute;
  // selector?: string;

  dom: HTMLElement;

  protected _value: any;
  protected _oldValue: any;
  protected _feature: Feature;

  constructor(formId: string, attr: Attribute) {
    // this.settings = settings;
    this.attr = attr;
    // this.selector = "#" + formId + " input[id=" + this.settings.index + "]";
  }

  /**
   *
   * must create dom without Label
   *
   * @abstract
   * @returns {HTMLElement}
   */
  abstract createInputElement(): HTMLElement;

  /**
   *
   * creates dom without Label and using createFieldDom to add the InputElement
   *
   * @abstract
   * @returns {HTMLElement}
   */
  createDom(): HTMLElement {
    const labelDiv = createHtmlElement("label");
    const settings = this.attr.settings;

    labelDiv.htmlFor = settings.name;
    labelDiv.innerText = (settings.alias ? settings.alias : settings.name) + (settings.nullable == 0 ? "*" : "");

    if (settings.tooltip) {
      const infoBttn = createHtmlElement("i", labelDiv, "fa fa-exclamation-circle");
      infoBttn.style.color = "#f57802";
      infoBttn.style.paddingLeft = "0.2rem";
      infoBttn.addEventListener("click", () => kvm.msg(settings.tooltip));
    }

    const valueDiv = createHtmlElement("div", null, "form-value");

    const formField = this.createInputElement();
    const div = createHtmlElement("div", null, "form-field-rows");
    // if (this.get("index") === 4) {
    //   traceElementChange(div);
    // }
    div.id = `formFieldDiv_${this.attr.layer.get("id")}_${this.attr.get("index")}`;

    div.style.cssText = this.attr.getArrangementStyle();
    // TODO rtr
    if (this.attr.get("form_element_type") !== "SubFormFK") {
      const fL = createHtmlElement("div", div, "form-label");
      fL.append(labelDiv);
    }

    div.append(valueDiv);
    valueDiv.append(formField);

    return div;
  }

  getDom(): HTMLElement {
    if (!this.dom) {
      this.dom = this.createDom();
    }
    return this.dom;
  }

  lsts: { (src: Field, hasChanged: boolean): void | Promise<any> }[] = [];

  getValue(action?: string) {
    return this._value;
  }

  async setValue(f: Feature, val: string) {
    this._value = val;
    this._oldValue = val;
    this._feature = f;
    return;
  }

  hasChanged() {
    return this._oldValue !== this._value;
  }

  addChangeListener(lst: (src: Field, hasChanged: boolean) => void) {
    this.lsts.push(lst);
  }

  async fireChanged() {
    for (let i = 0; i < this.lsts.length; i++) {
      await this.lsts[i](this, this.hasChanged());
    }
  }

  hide() {
    if (this.dom) {
      this.dom.style.display = "none";
    }
    // const dom = this.getDom();
    // if (dom?.parentElement) {
    //   console.info("MMM hide " + dom.parentElement.id, this);
    //   // RTRRRRRRR  dom.parentElement.style.display = "none";
    // }
  }
  show() {
    if (this.dom) {
      this.dom.style.display = "";
    }
    // const dom = this.getDom();
    // if (dom?.parentElement) {
    //   dom.parentElement.style.display = "";
    // }
  }
}

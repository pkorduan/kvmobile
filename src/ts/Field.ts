import { AttributeSetting } from "./Attribute";

export interface FieldChangeEvent {
  src: Field;
}

export interface Field {
  settings?: AttributeSetting;
  selector?: string;

  setValue: (val: string) => Promise<void>;
  getValue?: (action?: string) => any;

  addChangeListener?: (lst: (src: Field, hasChanged: boolean) => void) => void;
  bindEvents?(): void;

  hasChanged(): boolean;

  getDom(): HTMLElement;
}

export abstract class AbstractField implements Field {
  settings?: AttributeSetting;
  selector?: string;

  protected _value: any;
  protected _oldValue: any;

  constructor(formId: string, settings: AttributeSetting) {
    this.settings = settings;
    this.selector = "#" + formId + " input[id=" + this.settings.index + "]";
  }

  getDom(): HTMLElement {
    throw new Error("Method not implemented.");
  }

  lsts: { (src: Field, hasChanged: boolean): void }[] = [];

  getValue(action?: string) {
    return this._value;
  }

  async setValue(val: string) {
    this._value = val;
    this._oldValue = val;
    return;
  }

  hasChanged() {
    return this._oldValue !== this._value;
  }

  addChangeListener(lst: (src: Field, hasChanged: boolean) => void) {
    this.lsts.push(lst);
  }

  fireChanged() {
    for (let i = 0; i < this.lsts.length; i++) {
      this.lsts[i](this, this.hasChanged());
    }
  }
}

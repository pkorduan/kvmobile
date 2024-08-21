import { AttributeSetting } from "./Attribute";
import { Field } from "./Field";
import { kvm } from "./app";
import { createHtmlElement } from "./Util";

/*
 * create a UserID form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="text" id="1" name="bezeichnung" value="Wert" disabled/>
 *     </div>
 *   </div>
 */
export class UserIDFormField implements Field {
  settings: AttributeSetting;
  selector: string;
  element: JQuery<HTMLElement>;
  constructor(formId: string, settings: AttributeSetting) {
    //console.log('Erzeuge UserIDFormField with settings %o', settings);
    this.settings = settings;
    this.selector = "#" + formId + " input[id=" + this.settings.index + "]";
    this.element = $(
      '\
        <input\
        type="text"\
        id="' +
        this.settings.index +
        '"\
        name="' +
        this.settings.name +
        '"\
        value="" disabled\
        />'
    );
  }

  // get(key) {
  //     return this.settings[key];
  // }

  setValue(val) {
    if (kvm.coalesce(val, "") == "" && this.settings.default) {
      val = this.settings.default;
    }
    this.element.val(val == null || val == "null" ? "" : val);
  }

  getValue(action = "") {
    kvm.log("UserIDFormField.getValue", 4);
    let val = this.element.val();
    if (typeof val === "undefined" || val == "") {
      val = null;
    }
    return val;
  }

  getAutoValue() {
    kvm.log("UserIDFormField.getAutoValue");
    return kvm.store.getItem("userId");
  }

  bindEvents() {}
}

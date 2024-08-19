import { AttributeSetting } from "./Attribute";
import { Field } from "./Field";
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
export class TextfeldFormField implements Field {
  settings: AttributeSetting;
  selector: string;
  element: JQuery<HTMLElement>;

  constructor(formId: string, settings: AttributeSetting) {
    this.settings = settings;
    this.selector = "#" + formId + " textarea[id=" + this.settings.index + "]";
    this.element = $(
      '\
        <textarea\
          id="' +
        this.settings.index +
        '"\
          name="' +
        this.settings.name +
        '"\
          rows="3"' +
        (this.settings.privilege == "0" ? " disabled" : "") +
        "\
        >\
        </textarea>"
    );
  }
  // get(key) {
  //     return this.settings[key];
  // }

  setValue(val) {
    //console.log('TextFormField.setValue with value: ' + val);
    if (kvm.coalesce(val, "") == "" && this.settings.default) {
      val = this.settings.default;
    }

    this.element.val(val == null || val == "null" ? "" : val);
  }

  getValue(action = "") {
    var val = this.element.val();

    if (typeof val === "undefined" || val == "") {
      val = null;
    }

    return val;
  }

  bindEvents() {
    //console.log('TextfeldFormField.bindEvents');
    $("#featureFormular textarea[id=" + this.settings.index + "]").on("keyup", function () {
      if (!$("#saveFeatureButton").hasClass("active-button")) {
        $("#saveFeatureButton").toggleClass("active-button inactive-button");
      }
    });
  }
}

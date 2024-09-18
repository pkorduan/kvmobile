import { AttributeSetting } from "./Attribute";
import { Field } from "./Field";
import { createHtmlElement } from "./Util";

export class CheckboxFormField implements Field {
  settings: AttributeSetting;
  selector: string;
  element: JQuery<HTMLElement>;

  constructor(formId: string, settings: AttributeSetting) {
    this.settings = settings;
    this.selector = "#" + formId + " input[id=" + this.settings.index + "]";
    this.element = $(
      '\
        <input\
          type="checkbox"\
          id="' +
        this.settings.index +
        '"\
          name="' +
        this.settings.name +
        '"' +
        (this.settings.privilege == "0" ? " disabled" : "") +
        "\
        />"
    );
  }

  // get(key) {
  //     return this.settings[key];
  // }

  async setValue(val) {
    //console.log('CheckboxFormField.setValue with value: ' + val);
    if (!val && this.settings.default) {
      val = this.settings.default;
    }

    this.element.val(val);
    this.element.prop("checked", false);
    if (val == "t") {
      this.element.prop("checked", true);
    }
  }

  getValue(action = "") {
    // console.log('CheckboxFormField.getValue');
    return this.element.prop("checked") ? "t" : this.element.val() == "" ? null : "f";
  }

  bindEvents() {
    //console.log('CheckboxFormField.bindEvents');
    $("#featureFormular input[id=" + this.settings.index + "]").on("change", function () {
      if (!$("#saveFeatureButton").hasClass("active-button")) {
        $("#saveFeatureButton").toggleClass("active-button inactive-button");
      }
    });
  }
}

import { Attribute, AttributeSetting } from "./Attribute";
import { AbstractField, Field } from "./Field";
import { kvm } from "./app";
import { createHtmlElement } from "./Util";

/**
 * create a dateTime form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="text" id="1" name="bezeichnung" value="Wert"/>
 *     </div>
 *   </div>
 */
export class DateTimeFormField extends AbstractField implements Field {
  element: HTMLInputElement;

  constructor(formId: string, attr: Attribute) {
    super(formId, attr);

    this.element = createHtmlElement("input");
    this.element.type = "datetime-local";
    this.element.id = String(this.attr.settings.index);
    this.element.name = this.attr.settings.name;
    this.element.disabled = this.attr.settings.privilege == "0";

    this.element.addEventListener("click", () => {
      this._value = this.element.checked ? "t" : "f";
      this.fireChanged();
    });
  }

  async setValue(val) {
    console.log("DateTimeFormField setVal val: -%s-", val);
    this._value = val;
    this._oldValue = val;

    var val = kvm.coalesce(val, "");
    if (val != "") {
      val = this.toISO(val);
    }
    this.element.value = val;
  }

  // getValue(action = "") {
  //   // kvm.log("DateTimeFormField.getValue", 4);
  //   return this.value;
  //   let val = this.element.value;
  //   if (typeof val === "undefined" || val == "") {
  //     val = null;
  //   } else {
  //     val += (<String>val).split(":").length < 3 ? ":00" : "";
  //   }
  //   return val;
  // }

  getFormattedValue(val) {
    const datetime = new Date(val);
    return datetime.toLocaleDateString() + " " + datetime.toLocaleTimeString();
  }

  getAutoValue() {
    console.log("DateTimeFormField.getAutoValue");
    return kvm.now("T", "");
  }

  // bindEvents() {
  //   //console.log('DateTimeFormField.bindEvents');
  //   // $("#featureFormular input[id=" + this.settings.index + "]").on("change", function () {
  //   //   if (!$("#saveFeatureButton").hasClass("active-button")) {
  //   //     $("#saveFeatureButton").toggleClass("active-button inactive-button");
  //   //   }
  //   // });
  // }

  toISO(datetime) {
    return datetime.replace(/\//g, "-").replace(" ", "T");
  }

  fromISO(datetime) {
    // kvm.log("konvert " + this.get("name") + " datetime: " + datetime, 4);
    return typeof datetime == "string" ? datetime.replace(/-/g, "/").replace("T", " ").replace("Z", "") : null;
  }

  createInputElement(): HTMLElement {
    return this.element;
  }
}

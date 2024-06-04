import { AttributeSetting } from "./Attribute";
import { Field } from "./Field";
import { kvm } from "./app";

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
export class DateTimeFormField implements Field {
    settings: AttributeSetting;
    element: JQuery<HTMLElement>;
    selector: string;

    constructor(formId: string, settings: AttributeSetting) {
        //console.log('Erzeuge DateTimeFormField with settings %o', settings);
        this.settings = settings;
        this.selector = "#" + formId + " input[id=" + this.settings.index + "]";
        this.element = $(`<input
      type="datetime-local"
      id="${this.settings.index}"
      name="${this.settings.name}"
      value=""
      ${this.settings.privilege == "0" ? " disabled" : ""}
    />`);
    }

    // get(key) {
    //     return this.settings[key];
    // }

    setValue(val) {
        // console.log('DateTimeFormField setVal val: -%s-', val);
        var val = kvm.coalesce(val, "");
        if (val != "") {
            val = this.toISO(val);
        }
        // kvm.log("DateTimeFormField " + this.get("name") + " setValue with value: " + JSON.stringify(val), 4);
        this.element.val(val);
    }

    getValue(action = "") {
        // kvm.log("DateTimeFormField.getValue", 4);
        let val = this.element.val();
        if (typeof val === "undefined" || val == "") {
            val = null;
        }
        return val;
    }

    getFormattedValue(val) {
        var datetime = new Date(val);
        return datetime.toLocaleDateString() + " " + datetime.toLocaleTimeString();
    }

    getAutoValue() {
        // kvm.log("DateTimeFormField.getAutoValue", 4);
        return kvm.now();
    }

    bindEvents() {
        //console.log('DateTimeFormField.bindEvents');
        $("#featureFormular input[id=" + this.settings.index + "]").on("change", function () {
            if (!$("#saveFeatureButton").hasClass("active-button")) {
                $("#saveFeatureButton").toggleClass("active-button inactive-button");
            }
        });
    }

    toISO(datetime) {
        return datetime.replace(/\//g, "-").replace(" ", "T");
    }

    fromISO(datetime) {
        // kvm.log("konvert " + this.get("name") + " datetime: " + datetime, 4);
        return typeof datetime == "string" ? datetime.replace(/-/g, "/").replace("T", " ").replace("Z", "") : null;
    }
}

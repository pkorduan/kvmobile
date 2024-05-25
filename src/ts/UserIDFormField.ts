import { Field } from "./Field";
import { kvm } from "./app";

/*
 * create a UserID form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="text" id="1" name="bezeichnung" value="Wert"/>
 *     </div>
 *   </div>
 */
export class UserIDFormField implements Field {
    settings: any;
    selector: string;
    element: JQuery<HTMLElement>;
    constructor(formId, settings) {
        //console.log('Erzeuge UserIDFormField with settings %o', settings);
        this.settings = settings;
        this.selector = "#" + formId + " input[id=" + this.get("index") + "]";
        this.element = $(
            '\
        <input\
        type="text"\
        id="' +
                this.get("index") +
                '"\
        name="' +
                this.get("name") +
                '"\
        value="" disabled\
        />'
        );
    }

    get(key) {
        return this.settings[key];
    }

    setValue(val) {
        if (kvm.coalesce(val, "") == "" && this.get("default")) {
            val = this.get("default");
        }
        this.element.val(val == null || val == "null" ? "" : val);
    }

    getValue(action = "") {
        kvm.log("UserIDFormField.getValue", 4);
        var val = this.element.val();
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

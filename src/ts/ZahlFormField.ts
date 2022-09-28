import { kvm } from "./app";

/*
 * create a numeric form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="text" id="1" name="bezeichnung" value="Wert"/>
 *     </div>
 *   </div>
 */
export class ZahlFormField {
    settings: any;
    selector: string;
    element: JQuery<HTMLElement>;
    constructor(formId, settings) {
        //console.log('Erzeuge ZahlFormField with settings %o', settings);
        this.settings = settings;
        this.selector = "#" + formId + " input[id=" + this.get("index") + "]";
        this.element = $('\
        <input\
        type="number"\
        id="' + this.get("index") + '"\
        name="' + this.get("name") + '"\
        value=""' + (this.get("privilege") == "0" ? " disabled" : "") + "\
        />");
    }
    get(key) {
        return this.settings[key];
    }

    setValue(val) {
        //console.log('ZahlFormField.setValue with value: ' + val);
        if (kvm.coalesce(val, "") == "" && this.get("default")) {
            val = this.get("default");
        }

        this.element.val(val == null || val == "null" ? "" : val);
    }

    getValue(action = "") {
        //console.log('ZahlFormField.getValue');
        var val = this.element.val();

        if (typeof val === "undefined" || val == "") {
            val = null;
        }
        return val;
    }

    bindEvents() {
        // console.log('ZahlFormField.bindEvents');
        $("#featureFormular input[id=" + this.get("index") + "]").on("keyup", function () {
            if (!$("#saveFeatureButton").hasClass("active-button")) {
                $("#saveFeatureButton").toggleClass("active-button inactive-button");
            }
        });
    }
}

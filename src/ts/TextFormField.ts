import { AttributeSetting } from "./Attribute";
import { Field } from "./Field";
import { kvm } from "./app";
/*
 * create a text form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="text" id="1" name="bezeichnung" value="Wert"/>
 *     </div>
 *   </div>
 */
export class TextFormField implements Field {
    settings: AttributeSetting;
    selector: string;
    element: JQuery<HTMLElement>;

    constructor(formId: string, settings: AttributeSetting) {
        //console.log('Erzeuge TextformField with settings %o', settings);
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
            value=""' +
                (this.settings.privilege == "0" ? " disabled" : "") +
                "\
            />"
        );
    }

    // get(key) {
    //     return this.settings[key];
    // }

    setValue(val) {
        //console.log("TextFormField " + this.get("name") + " setValue with value: %o", val);
        if (kvm.coalesce(val, "") == "" && this.settings.default) {
            val = this.settings.default;
        }
        this.element.val(val == null || val == "null" ? "" : val);
    }

    /*
     * get the value from form field expect
     * form_element_type UserID, here get the value from store
     * when no action is given in options specified or
     * action == option
     */
    getValue = function (action = "") {
        //console.log('TextFormField.getValue');
        var val = this.element.val();

        if (typeof val === "undefined" || val == "") {
            val = null;
        }

        if (this.get("form_element_type") == "UserID" && (action == "" || this.get("options") == "" || action.toLowerCase() == this.get("options").toLowerCase())) {
            val = kvm.store.getItem("userId");
        }

        return val;
    };

    bindEvents() {
        //console.log('TextFormField.bindEvents');
        $("#featureFormular input[id=" + this.settings.index + "]").on("keyup", function () {
            if (!$("#saveFeatureButton").hasClass("active-button")) {
                $("#saveFeatureButton").toggleClass("active-button inactive-button");
            }
        });
    }
}

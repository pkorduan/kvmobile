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
export class TextFormField {
    settings: any;
    selector: string;
    element: JQuery<HTMLElement>;

    constructor(formId, settings) {
        //console.log('Erzeuge TextformField with settings %o', settings);
        this.settings = settings;
        this.selector = "#" + formId + " input[id=" + this.get("index") + "]";
        this.element = $('\
            <input\
            type="text"\
            id="' + this.get("index") + '"\
            name="' + this.get("name") + '"\
            value=""' + (this.get("privilege") == "0" ? " disabled" : "") + "\
            />");
    }

    get(key) {
      return this.settings[key];
    }

    setValue(val) {
			//console.log("TextFormField " + this.get("name") + " setValue with value: %o", val);
			if (kvm.coalesce(val, "") == "" && this.get("default")) {
					val = this.get("default");
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
        $("#featureFormular input[id=" + this.get("index") + "]").on("keyup", function () {
            if (!$("#saveFeatureButton").hasClass("active-button")) {
                $("#saveFeatureButton").toggleClass("active-button inactive-button");
            }
        });
    }
}

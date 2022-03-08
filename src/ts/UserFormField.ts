import { kvm } from "./app";

/*
 * create a User form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="text" id="1" name="bezeichnung" value="Wert"/>
 *     </div>
 *   </div>
 */
export function UserFormField(formId, settings): void {
    //console.log('Erzeuge UserFormField with settings %o', settings);
    (this.settings = settings),
        (this.get = function (key) {
            return this.settings[key];
        });

    (this.selector = "#" + formId + " input[id=" + this.get("index") + "]"), (this.element = $('\
    <input\
      type="text"\
      id="' + this.get("index") + '"\
      name="' + this.get("name") + '"\
      value="" disabled\
    />'));

    this.setValue = function (val) {
        if (kvm.coalesce(val, "") == "" && this.get("default")) {
            val = this.get("default");
        }

        this.element.val(val == null || val == "null" ? "" : val);
    };

    this.getValue = function (action = "") {
        kvm.log("UserFormField.getValue", 4);
        var val = this.element.val();
        if (typeof val === "undefined" || val == "") {
            val = null;
        }
        return val;
    };

    this.getAutoValue = function () {
        kvm.log("UserFormField.getAutoValue");
        return kvm.store.getItem("userName");
    };

    this.bindEvents = function () {
        // bind no event on this form element
    };

    return this;
}

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
function TextfeldFormField(formId, settings): void {
    (this.settings = settings),
        (this.get = function (key) {
            return this.settings[key];
        });

    (this.selector = "#" + formId + " input[id=" + this.get("index") + "]"), (this.element = $('\
    <textarea\
      id="' + this.get("index") + '"\
      name="' + this.get("name") + '"\
      rows="3"' + (this.get("privilege") == "0" ? " disabled" : "") + "\
    >\
    </textarea>"));

    this.setValue = function (val) {
        //console.log('TextFormField.setValue with value: ' + val);
        if (kvm.coalesce(val, "") == "" && this.get("default")) {
            val = this.get("default");
        }

        this.element.val(val == null || val == "null" ? "" : val);
    };

    this.getValue = function (action = "") {
        var val = this.element.val();

        if (typeof val === "undefined" || val == "") {
            val = null;
        }

        return val;
    };

    this.bindEvents = function () {
        //console.log('TextfeldFormField.bindEvents');
        $("#featureFormular textarea[id=" + this.get("index") + "]").on("keyup", function () {
            if (!$("#saveFeatureButton").hasClass("active-button")) {
                $("#saveFeatureButton").toggleClass("active-button inactive-button");
            }
        });
    };

    return this;
}

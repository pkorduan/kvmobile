/*
 * create a select form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="text" id="1" name="bezeichnung" value="Wert"/>
 *     </div>
 *   </div>
 */
function SelectFormField(formId, settings): void {
    (this.settings = settings),
        (this.get = function (key) {
            return this.settings[key];
        });

    (this.selector = "#" + formId + " input[id=" + this.get("index") + "]"),
        (this.element = $(
            '\
    <select\
      id="' +
                this.get("index") +
                '"\
      name="' +
                this.get("name") +
                '"' +
                (this.get("privilege") == "0" ? " disabled" : "") +
                (kvm.coalesce(this.get("req_by"), "") != "" ? ' req_by="' + this.get("req_by") + '"' : "") +
                (kvm.coalesce(this.get("requires"), "") != "" ? ' requires="' + this.get("requires") + '"' : "") +
                '>\
      <option value="">Bitte wählen</option>' +
                $.map(this.get("options"), function (option) {
                    //          option = option.replace(/(^')|('$)/g, '')
                    return '\
            <option\
              value="' + option.value + '"' + (kvm.coalesce(option.requires, "") != "" ? ' requires="' + option.requires + '"' : "") + ">" + option.output + "\
            </option>";
                }).join("\n") +
                "\
    </select>"
        ));

    this.setValue = function (val) {
        //console.log('SelectFormField.setValue with value: ' + val);
        if (kvm.coalesce(val, "") == "" && this.get("default")) {
            val = this.get("default");
        }
        this.element.val(val == "null" ? "" : val);
    };

    this.getValue = function (action = "") {
        //console.log('SelectFormField.getValue');
        var val = this.element.val();

        if (typeof val === "undefined" || val == "") {
            val = null;
        }
        return val;
    };

    this.filter_by_required = function (attribute, value) {
        console.log('filter_by_requiered attribute %s with %s="%s"', this.get("name"), attribute, value);
        this.element.children().each(function (i, option) {
            if (option.value != "") {
                console.log("Vergleiche requires %s mit Wert %s", option.getAttribute("requires"), value);
                if (option.getAttribute("requires") == value) {
                    $(option).show();
                } else {
                    if (option.selected) {
                        option.selected = false;
                    }
                    $(option).hide();
                }
            }
        });
    };

    this.bindEvents = function () {
        //console.log('SelectFormField.bindEvents');
        $("#featureFormular select[id=" + this.get("index") + "]").on("change", function (evt) {
            if (!$("#saveFeatureButton").hasClass("active-button")) {
                $("#saveFeatureButton").toggleClass("active-button inactive-button");
            }
            if (this.hasAttribute("req_by")) {
                var req_by_idx = kvm.activeLayer.attribute_index[this.getAttribute("req_by")];
                console.log("Select Feld %s hat abhängiges Auswahlfeld %s", (<HTMLInputElement>this).name, this.getAttribute("req_by"));
                kvm.activeLayer.attributes[req_by_idx].formField.filter_by_required(this.getAttribute("name"), (<HTMLInputElement>this).value);
                // find attribute with the name in req_by
                // apply the filter on the options, call filter_by_required
            }
        });
    };

    return this;
}

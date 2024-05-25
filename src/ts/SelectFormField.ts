import { Field } from "./Field";
import { kvm } from "./app";

/*
 * create a select form field in the structure
 * <div class="form-label">
 * 	<label for="baumart_id">Obstart</label>
 * </div>
 * <div class="form-value">
 * 	<select id="4" name="baumart_id" required_by="sorte_id">
 *		<option value="">Bitte wählen</option>
 *		<option value="0">00 fehlende Obstart</option>
 *	</select>
 * </div>
 */
export class SelectFormField implements Field {
    settings: any;
    selector: string;
    element: JQuery<HTMLElement>;

    constructor(formId, settings) {
        this.settings = settings;
        this.selector = "#" + formId + " select[id=" + this.get("index") + "]";
        this.element = $(`
			<select
				id="${this.get("index")}"
				name="${this.get("name")}"
        ${this.isArrayType() ? "multiple" : ""}
				${this.get("privilege") == "0" ? " disabled" : ""}
				${kvm.coalesce(this.get("required_by"), "") != "" ? ' required_by="' + this.get("required_by") + '"' : ""}
				${kvm.coalesce(this.get("requires"), "") != "" ? ' requires="' + this.get("requires") + '"' : ""}
			>
        ${this.isArrayType() ? "" : '<option value="">Bitte wählen</option>'}
				${$.map(this.get("enums"), function (option) {
                    //          option = option.replace(/(^')|('$)/g, '')
                    return `
        <option
          value="${option.value}"
          ${kvm.coalesce(option.requires_value, "") != "" ? 'requires="' + option.requires_value + '"' : ""}
        >${option.output}</option>
      `;
                }).join("\n")}
			</select>
    `);
    }

    get(key) {
        return this.settings[key];
    }

    setValue(val) {
        //console.log('SelectFormField.setValue with value: ' + val);
        if (kvm.coalesce(val, "") == "" && this.get("default")) {
            val = this.get("default");
        }

        val = val == "null" ? "" : val;

        if (val && this.isArrayType()) {
            val = val.replace(/[{}]+/g, "").split(",");
        }

        this.element.val(val);
    }

    getValue(action = "") {
        //console.log('SelectFormField.getValue');
        var val = this.element.val();

        if (typeof val === "undefined" || val == "") {
            val = null;
        }

        if (val && this.isArrayType()) {
            val = `{${val.toString()}}`;
        }

        return val;
    }

    isArrayType() {
        return this.get("type").substring(0, 1) == "_";
    }

    filter_by_required(attribute, value) {
        //console.log('filter_by_requiered attribute %s with %s="%s"', this.get("name"), attribute, value);
        this.element.children().each(function (i, option) {
            let o = $(option);
            if (o.val() != "") {
                //console.log("Vergleiche requires %s mit Wert %s", o.attr("requires"), value);
                if (o.attr("requires") == value) {
                    o.show();
                } else {
                    if (o.is(":selected")) {
                        o.prop("selected", false);
                    }
                    o.hide();
                }
            }
        });
    }

    bindEvents() {
        console.log("SelectFormField.bindEvents");
        $("#featureFormular select[id=" + this.get("index") + "]").on("change", function (evt) {
            if (!$("#saveFeatureButton").hasClass("active-button")) {
                $("#saveFeatureButton").toggleClass("active-button inactive-button");
            }
            let elm = evt.target;
            if (elm.hasAttribute("required_by")) {
                var required_by_idx = kvm.activeLayer.attribute_index[this.getAttribute("required_by")];
                console.log("Select Feld %s hat abhängiges Auswahlfeld %s", (<HTMLInputElement>this).name, this.getAttribute("required_by"));
                kvm.activeLayer.attributes[required_by_idx].formField.filter_by_required(elm.getAttribute("name"), $(elm).val());
                // find attribute with the name in required_by
                // apply the filter on the options, call filter_by_required
            }
        });
    }
}

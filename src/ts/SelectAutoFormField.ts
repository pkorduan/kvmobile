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
export class SelectAutoFormField implements Field {
    settings: any;
    selector: string;
    element: JQuery<HTMLElement>;

    constructor(formId, settings) {
        this.settings = settings;
        this.selector = "#" + formId + " select[id=" + this.get("index") + "]";
        this.element = $(`
			<input
				id="${this.get("index")}"
				name="${this.get("name")}"
				${this.get("privilege") == "0" ? " disabled" : ""}
			/>
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
        this.element.val(val == "null" ? "" : val);
    }

    getValue(action = "") {
        //console.log('SelectFormField.getValue');
        const val = this.element.val();
        if (typeof val === "undefined" || val == "") {
            return null;
        }
        return val;
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
        console.log("SelectAutoFormField.bindEvents");
        $("#featureFormular input[id=" + this.get("index") + "]").on("change", function (evt) {
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
        $("#featureFormular input[id=" + this.get("index") + "]").on("keyup", function (evt) {
            let elm = $(evt.target);
            let val: string = String(elm.val());
            let selectField = $(`#featureFormular select[id="${elm.attr("id")}]`);
            if (val.length > 2) {
                selectField.show();
                console.log("Key up event on select auto field value: %s", elm.val());
            }
        });
        /**
 * Beispiel unter https://stackoverflow.com/questions/1447728/how-to-dynamic-filter-options-of-select-with-jquery
 jQuery.fn.filterByText = function(textbox) {
  return this.each(function() {
    var select = this;
    var options = [];
    $(select).find('option').each(function() {
      options.push({
        value: $(this).val(),
        text: $(this).text()
      });
    });
    $(select).data('options', options);

    $(textbox).on('change keyup', function(evt) {
      var options = $(select).empty().data('options');
      var search = $.trim($(this).val());
      var regex = new RegExp(search, "gi");

      $.each(options, function(i) {
        var option = options[i];
        if (option.text.match(regex) !== null) {
          $(select).append(
            $('<option>').text(option.text).val(option.value)
          );
        }
      });
    });
  });
};

$(function() {
  $('select').filterByText($('input'));
});

<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
<select>
  <option value="hello">hello</option>
  <option value="world">world</option>
  <option value="lorem">lorem</option>
  <option value="ipsum">ipsum</option>
  <option value="lorem ipsum">lorem ipsum</option>
</select>
<input type="text">
*/
    }
}

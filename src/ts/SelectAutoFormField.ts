import { AttributeSetting } from "./Attribute";
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
    settings: AttributeSetting;
    selector: string;
    element: JQuery<HTMLElement>;

    constructor(formId: string, settings: AttributeSetting) {
        this.settings = settings;
        this.selector = "#" + formId + " select[id=" + this.settings.index + "]";
        this.element = $(`
			<input
				id="${this.settings.index}"
				name="${this.settings.name}"
				${(this.settings.privilege === "0" ? ' disabled' : '')}
			/>
      <div
        id="${this.settings.index}_autoSelect"
      >
        ${$.map(this.settings.enums, (option: any) => {
          return `
            <div
              value="${option.value}"
              class="${this.settings.index}_autoSelect"
              style="display: none"
            >${option.value}</div>
          `;
        }).join("")}
      </div>
    `);
    }

    // get(key) {
    //  return this.settings[key];
    // }

    setValue(val) {
        //console.log('SelectFormField.setValue with value: ' + val);
        if (kvm.coalesce(val, "") == "" && this.settings.default) {
            val = this.settings.default;
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

    bindEvents() {
        console.log("SelectAutoFormField.bindEvents");
		$("#featureFormular input[id=" + this.settings.index + "]").on('input', (evt) => {
          console.log('KeyDown: evt: %o', evt);
          console.log('target: %o', evt.target);
          console.log('val: %o', $(evt.target).val());
          const val = $(evt.target).val();
          $(`.${this.settings.index}_autoSelect`).hide();
          if (val != '') {
            $(`div[value*='${val}']`).show();
          }
        });
        $("#featureFormular input[id=" + this.settings.index + "]").on("change", function (evt) {
          if (!$("#saveFeatureButton").hasClass("active-button")) {
            $("#saveFeatureButton").toggleClass("active-button inactive-button");
          }
          let elm = evt.target;
          if (elm.hasAttribute("required_by")) {
            var required_by_idx = kvm.activeLayer.attribute_index[this.getAttribute("required_by")];
            console.log("Select Feld %s hat abhängiges Auswahlfeld %s", (<HTMLInputElement>this).name, this.getAttribute("required_by"));
            (<any>kvm.activeLayer.attributes[required_by_idx].formField).filter_by_required(elm.getAttribute("name"), $(elm).val());
            // find attribute with the name in required_by
            // apply the filter on the options, call filter_by_required
          }
        });
        $("#featureFormular input[id=" + this.settings.index + "]").on("keyup", function (evt) {
          let elm = $(evt.target);
          let val: string = String(elm.val());
          let selectField = $(`#featureFormular select[id="${elm.attr('id')}]`);
          if ((val.length  > 2)) {
    
            selectField.show();
            console.log('Key up event on select auto field value: %s', elm.val());
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
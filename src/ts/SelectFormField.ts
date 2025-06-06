import { Attribute, AttributeSetting } from "./Attribute";
import { AbstractField } from "./Field";
import { kvm } from "./app";
import { createHtmlElement } from "./Util";

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
export class SelectFormField extends AbstractField {
  element: HTMLSelectElement;

  constructor(formId: string, settings: AttributeSetting) {
    super(formId, settings);
    this.settings = settings;
    this.selector = "#" + formId + " select[id=" + this.settings.index + "]";

    this.element = createHtmlElement("select");
    this.element.id = String(this.settings.index);
    this.element.name = this.settings.name;
    this.element.multiple = this.isArrayType();
    this.element.disabled = this.settings.privilege == "0";
    if (this.settings.required_by) {
      this.element["required_by"] = this.settings.required_by;
    }
    if (this.settings.requires) {
      this.element["requires"] = this.settings.requires;
    }
    if (!this.isArrayType()) {
      const option = createHtmlElement("option", this.element);
      option.innerText = "Bitte wählen";
    }
    for (let i = 0; i < this.settings.enums.length; i++) {
      const optionAttr = this.settings.enums[i];
      const option = createHtmlElement("option", this.element);
      option.value = optionAttr.value;
      option.innerHTML = optionAttr.output;
    }

    if (this.settings.required_by) {
      this.element.addEventListener("change", () => {
        const required_by_idx = kvm.getActiveLayer().attribute_index[this.settings.required_by];
        console.log("Select Feld %s hat abhängiges Auswahlfeld %s", this.settings.name, this.settings.required_by);
        (<any>kvm.getActiveLayer().attributes[required_by_idx].formField).filter_by_required(this.settings.name, this.element.value);
      });
      // find attribute with the name in required_by
      // apply the filter on the options, call filter_by_required
    }

    // this.element = $(`
    // 	<select
    // 		id="${this.settings.index}"
    // 		name="${this.settings.name}"
    //     ${this.isArrayType() ? "multiple" : ""}
    // 		${this.settings.privilege == "0" ? " disabled" : ""}
    // 		${kvm.coalesce(this.settings.required_by, "") != "" ? ' required_by="' + this.settings.required_by + '"' : ""}
    // 		${kvm.coalesce(this.settings.requires, "") != "" ? ' requires="' + this.settings.requires + '"' : ""}
    // 	>
    //     ${this.isArrayType() ? "" : '<option value="">Bitte wählen</option>'}
    // 		${$.map(this.settings.enums, function (option: any) {
    //       //          option = option.replace(/(^')|('$)/g, '')
    //       return `
    //     <option
    //       value="${option.value}"
    //       ${kvm.coalesce(option.requires_value, "") != "" ? 'requires="' + option.requires_value + '"' : ""}
    //     >${option.output}</option>
    //   `;
    //     }).join("\n")}
    // 	</select>
    // `);
  }

  // get(key:string) {
  //     return this.settings[key];
  // }

  async setValue(val) {
    //console.log('SelectFormField.setValue with value: ' + val);
    if (kvm.coalesce(val, "") === "" && this.settings.default) {
      val = this.settings.default;
    }

    val = val == "null" ? "" : val;

    if (val && this.isArrayType()) {
      val = val.replace(/[{}]+/g, "").split(",");
    }

    this.element.value = val;
  }

  getValue(action = "") {
    //console.log('SelectFormField.getValue');
    let val = this.element.value;

    if (typeof val === "undefined" || val == "") {
      val = null;
    }

    if (val && this.isArrayType()) {
      val = `{${val.toString()}}`;
    }

    return val;
  }

  isArrayType() {
    return this.settings.type.substring(0, 1) == "_";
  }

  filter_by_required(attribute: Attribute, value: any) {
    //console.log('filter_by_requiered attribute %s with %s="%s"', this.get("name"), attribute, value);
    for (let i = 0; i < this.element.options.length; i++) {
      const option = this.element.options.item(i);
      if (option.value) {
        if (option["requires"] == value) {
          option.style.display = "";
        } else {
          if (option.selected) {
            option.selected = false;
          }
          option.style.display = "none";
        }
      }
    }

    // this.element.children().each(function (i, option) {
    //   const o = $(option);
    //   if (o.val() != "") {
    //     //console.log("Vergleiche requires %s mit Wert %s", o.attr("requires"), value);
    //     if (o.attr("requires") == value) {
    //       o.show();
    //     } else {
    //       if (o.is(":selected")) {
    //         o.prop("selected", false);
    //       }
    //       o.hide();
    //     }
    //   }
    // });
  }

  bindEvents() {
    // console.log("SelectFormField.bindEvents");
    // $("#featureFormular select[id=" + this.settings.index + "]").on("change", function (evt) {
    //   if (!$("#saveFeatureButton").hasClass("active-button")) {
    //     $("#saveFeatureButton").toggleClass("active-button inactive-button");
    //   }
    //   const elm = evt.target;
    //   if (elm.hasAttribute("required_by")) {
    //     const required_by_idx = kvm.getActiveLayer().attribute_index[this.getAttribute("required_by")];
    //     console.log("Select Feld %s hat abhängiges Auswahlfeld %s", (<HTMLInputElement>this).name, this.getAttribute("required_by"));
    //     (<any>kvm.getActiveLayer().attributes[required_by_idx].formField).filter_by_required(elm.getAttribute("name"), $(elm).val());
    //     // find attribute with the name in required_by
    //     // apply the filter on the options, call filter_by_required
    //   }
    // });
  }

  getDom(): HTMLElement {
    return this.element;
  }
}

import { AttributeSetting, OptionsAttributtes } from "./Attribute";
import { Field } from "./Field";
import { kvm } from "./app";
import { createHtmlElement } from "./Util";

/*
 * create a select form field in the structure
 * <div class="form-label">
 *   <label for="baumart_id">Obstart</label>
 * </div>
 * <div class="form-value">
 *   <select id="4" name="baumart_id" required_by="sorte_id">
 *    <option value="">Bitte wählen</option>
 *    <option value="0">00 fehlende Obstart</option>
 *  </select>
 * </div>
 */

export class SelectAutoFormField implements Field {
  settings: AttributeSetting;
  element: HTMLElement;
  // {value: 287, output: 'Lange grüne Herbstbirne', requires_value: '2'}
  options: OptionsAttributtes[];

  inputField: HTMLElement;
  autoSelectField: HTMLElement;
  optionsPane: HTMLDivElement;
  filteredOptions: OptionsAttributtes[];

  val: any;
  txtField: HTMLInputElement;

  constructor(formId: string, settings: AttributeSetting) {
    this.settings = settings;
    // this.selector = "#" + formId + " select[id=" + this.settings.index + "]";
    this.options = <OptionsAttributtes[]>this.settings.enums;
    this.filteredOptions = this.options;

    const div = (this.element = createHtmlElement("div"));
    div.id = `${this.settings.index}`;

    if (this.options.length < 50) {
      this.inputField = this.createSelectField(this.options);
    } else {
      this.inputField = this.createAutoSelectField();
    }
    div.appendChild(this.inputField);
  }

  /**
   * Function check the value, prepare it to fit for the form element type and
   * set value or values in html element related to the type of value and type of element.
   * @param any val
   */
  async setValue(val: any) {
    // console.log("SelectFormField.setValue with value: " + val);
    if (kvm.coalesce(val, "") == "" && this.settings.default) {
      val = this.settings.default;
    }

    if (typeof val === "string" && this.isArrayType()) {
      val = val.replace(/[{}]+/g, "").split(",");
    }

    // this.element.val(val == "null" ? "" : val);
    const matchingOptions = this.filteredOptions.filter((e) => {
      if (Array.isArray(val)) {
        return val.find((element) => element == e.value);
      } else {
        return e.value == val;
      }
    });

    if (matchingOptions.length > 1 || this.isArrayType()) {
      const selectedOptionIds = matchingOptions.map((elm) => {
        return elm.value;
      });
      if (this.inputField instanceof HTMLSelectElement) {
        for (let i = 0, iLen = this.inputField.options.length; i < iLen; i++) {
          this.inputField.options.item(i).selected = selectedOptionIds.map((elm) => String(elm)).includes(this.inputField.options.item(i).value);
        }
      } else {
        this.inputField.querySelector("input").value =
          matchingOptions.length === 0
            ? ""
            : matchingOptions
                .map((option) => {
                  return option.output;
                })
                .join(", ");
      }
      this.val = selectedOptionIds;
    } else if (matchingOptions.length === 1) {
      if (this.inputField instanceof HTMLSelectElement) {
        this.inputField.value = matchingOptions[0].value;
      } else {
        this.inputField.querySelector("input").value = matchingOptions[0].output;
      }
      this.val = matchingOptions[0].value;
    } else {
      if (this.inputField instanceof HTMLSelectElement) {
        this.inputField.value = "";
      } else {
        this.inputField.querySelector("input").value = "";
      }
      this.val = null;
    }

    this.updateRequiredBy();
  }

  getValue(action = "") {
    //console.log('SelectFormField.getValue');
    let val = this.val;

    if (typeof val === "undefined" || val === "") {
      return null;
    }

    if (val && this.isArrayType()) {
      return `{${val.toString()}}`;
    }

    return this.val;
  }

  filter_by_required(requiresAttName: string, requiresValue: any) {
    //console.log('filter_by_requiered attribute %s with %s="%s"', this.get("name"), attribute, value);
    // required SelectAutoFormField options werden im mit bindEvents gebundenen input event gefiltert
    // ToDo:
    // Wenn sich der Wert in einem übergeordneten Feld geändert hat, muss der Wert hier gelöscht werden
    // wenn er nicht in der Liste mit dem entsprechenden value in required vorkommt.
    // const fieldIdx = this.settings.index;
    // $(`${fieldIdx}, #${fieldIdx}_autoSelectOutput`).val("");
    // $(`#${fieldIdx}_autoSelect`).hide();

    this.filteredOptions = this.options.filter((value) => {
      return value.requires_value == requiresValue;
    });

    if (this.filteredOptions.length < 50) {
      const inputField = this.createSelectField(this.filteredOptions);
      this.setInputField(inputField);
    } else {
      if (this.inputField !== this.autoSelectField) {
        if (!this.autoSelectField) {
          this.autoSelectField = this.createAutoSelectField();
        }
        this.setInputField(this.autoSelectField);
      }
    }

    // console.log(
    //   `filter_by_required ${requiresAttName}=${requiresValue} => Anzahl=${this.filteredOptions.length}`
    // );
    this.setValue(this.val);
  }

  setInputField(inputField: HTMLElement) {
    this.inputField.replaceWith(inputField);
    this.inputField = inputField;
  }

  createSelectField(options: OptionsAttributtes[]) {
    const selectField = document.createElement("select");
    selectField.multiple = this.isArrayType();
    selectField.disabled = this.settings.privilege == "0";

    for (let i = 0; i < options.length; i++) {
      const opt = document.createElement("option");
      opt.value = options[i].value;
      opt.text = options[i].output;
      selectField.add(opt);
    }
    selectField.addEventListener("change", (ev) => {
      const result: string[] = [];
      for (let i = 0, iLen = selectField.options.length; i < iLen; i++) {
        if (selectField.options.item(i).selected) {
          result.push(selectField.options.item(i).value);
        }
      }
      let value: string | string[] = result;
      if (result.length === 0) {
        value = "";
      } else if (result.length === 1) {
        value = result[0];
      }
      this.internalSet(value);
    });
    return selectField;
  }

  isArrayType() {
    return this.settings.type.substring(0, 1) == "_";
  }

  createAutoSelectField() {
    // const inputField = (this.txtInputField = createHtmlElement("input", div));
    const wrapper = document.createElement("div");
    const inputField = (this.txtField = createHtmlElement("input", wrapper));
    inputField.id = `${this.settings.index}_autoSelectOutput`;
    inputField.name = `${this.settings.name}`;
    inputField.type = "text";
    inputField.disabled = this.settings.privilege === "0";
    inputField.style.float = "left";

    const optionsPane = (this.optionsPane = createHtmlElement("div", null, "auto-complete-div"));
    // optionsPane.id = "${this.settings.index}_autoSelect";

    const closeBttn = createHtmlElement("i", wrapper, "fa fa-times-circle");
    closeBttn.style.marginLeft = "-26px";
    closeBttn.ariaHidden = "true";
    closeBttn.style.marginTop = "10px";
    closeBttn.style.color = "gray";
    closeBttn.style.float = "left";
    closeBttn.addEventListener("click", () => {
      // hiddenInput.value = "";
      inputField.value = "";
      this.removeOptionPane();
    });

    inputField.addEventListener("click", (evt) => {
      this.showOptionPane();
      inputField.value = "";
    });
    inputField.addEventListener("keyup", (evt) => {
      this.filterOptionPane(inputField.value);
    });

    return wrapper;
    // this.inputField = inputField;
  }

  /**
   * Setzt den Wert des originalen HTML-Elements bei internen Änderungen
   * Die Method ruft auch das change event auf.
   * Zum programatischen Ändern des Wertes setValue verwenden.
   * @param value
   */
  private internalSet(value: string | string[]) {
    // console.log("_set", value);
    this.setValue(value);
    if (!$("#saveFeatureButton").hasClass("active-button")) {
      $("#saveFeatureButton").toggleClass("active-button inactive-button");
    }
  }

  removeOptionPane() {
    if (this.optionsPane?.parentElement) {
      this.optionsPane.remove();
    }
  }

  showOptionPane() {
    this.optionsPane.innerHTML = "";
    const f = (evt: Event) => {
      console.error("showOptionPane clicked", evt);
      if (evt.target !== this.txtField) {
        document.removeEventListener("click", f);
        this.removeOptionPane();
      }
    };
    for (let i = 0; i < this.filteredOptions.length; i++) {
      const option = this.filteredOptions[i];
      const optionHtmlEle = createHtmlElement("div", this.optionsPane, "auto-complete-option-div");
      optionHtmlEle.innerHTML = option.output;
      optionHtmlEle.addEventListener("click", (evt) => {
        this.internalSet(option.value);
        this.optionsPane.remove();
        document.removeEventListener("click", f);
      });
    }
    this.element.appendChild(this.optionsPane);
    document.addEventListener("click", f);
  }

  filterOptionPane(txt: string) {
    this.optionsPane.querySelectorAll("div").forEach((el) => {
      el.style.display = el.innerHTML.indexOf(txt) >= 0 ? "" : "none";
    });
  }

  updateRequiredBy() {
    if (this.settings.required_by) {
      const required_by_idx = kvm.getActiveLayer().attribute_index[this.settings.required_by];
      console.log("Select Feld %s hat abhängiges Auswahlfeld %s", this.settings.name, this.settings.required_by);
      (<any>kvm.getActiveLayer().attributes[required_by_idx].formField).filter_by_required(this.settings.name, this.getValue());
    }
  }

  bindEvents() {
    console.log("SelectAutoFormField.bindEvents");
  }
}

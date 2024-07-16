import { AttributeSetting, OptionsAttributtes } from "./Attribute";
import { Field } from "./Field";
import { createHtmlElement, kvm } from "./app";

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

// class HTMLAutoSelectElement {
//     wrapper: HTMLDivElement;
//     inputField: HTMLInputElement;
//     optionsPane: HTMLDivElement;

//     constructor(settings: AttributeSetting) {
//         this.wrapper = document.createElement("div");
//         const inputField = (this.inputField = createHtmlElement("input", this.wrapper));
//         inputField.id = `${settings.index}_autoSelectOutput`;
//         inputField.name = `${settings.name}`;
//         inputField.type = "text";
//         inputField.disabled = settings.privilege === "0";
//         inputField.style.float = "left";

//         const optionsPane = (this.optionsPane = createHtmlElement("div", null, "auto-complete-div"));
//         optionsPane.id = "${this.settings.index}_autoSelect";

//         const closeBttn = createHtmlElement("i", wrapper, "fa fa-times-circle");
//         closeBttn.style.marginLeft = "-26px";
//         closeBttn.ariaHidden = "true";
//         closeBttn.style.marginTop = "10px";
//         closeBttn.style.color = "gray";
//         closeBttn.style.float = "left";
//         closeBttn.addEventListener("click", () => {
//             // hiddenInput.value = "";
//             inputField.value = "";
//             optionsPane.style.display = "none";
//         });

//         inputField.addEventListener("click", (evt) => {
//             this.showOptionPane();
//             inputField.value = "";
//         });
//         inputField.addEventListener("keyup", (evt) => {
//             this.filterOptionPane(inputField.value);
//         });
//     }

//     filterOptionPane(txt: string) {
//         this.optionsPane.querySelectorAll("div").forEach((el) => {
//             el.style.display = el.innerHTML.indexOf(txt) >= 0 ? "" : "none";
//         });
//     }

//     showOptionPane() {
//         this.optionsPane.innerHTML = "";
//         for (let i = 0; i < this.filteredOptions.length; i++) {
//             const option = this.filteredOptions[i];
//             const optionHtmlEle = createHtmlElement("div", this.optionsPane, "auto-complete-option-div");
//             optionHtmlEle.innerHTML = option.output;
//             optionHtmlEle.addEventListener("click", () => {
//                 this._set(option);
//                 this.optionsPane.remove();
//             });
//         }
//         this.element.appendChild(this.optionsPane);
//     }
// }

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

  setValue(val: any) {
    console.error("SelectFormField.setValue with value: " + val);
    if (kvm.coalesce(val, "") == "" && this.settings.default) {
      val = this.settings.default;
    }
    // this.element.val(val == "null" ? "" : val);
    const matchingOptions = this.filteredOptions.filter((e) => {
      return e.value == val;
    });

    if (matchingOptions.length === 1) {
      if (this.inputField instanceof HTMLSelectElement) {
        this.inputField.value = matchingOptions[0].value;
      } else {
        this.inputField.querySelector("input").value =
          matchingOptions[0].output;
      }
      this.val = matchingOptions[0].value;
    } else {
      if (this.inputField instanceof HTMLSelectElement) {
        this.inputField.value = "";
      } else {
        this.inputField.querySelector("input").value = "";
      }
      this.val = "";
    }
  }

  getValue(action = "") {
    //console.log('SelectFormField.getValue');
    const val = this.val;
    if (typeof val === "undefined" || val == "") {
      return null;
    }
    return val;
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

    console.error(
      `filter_by_required ${requiresAttName}=${requiresValue} => Anzahl=${this.filteredOptions.length}`
    );
    this.setValue(this.val);
  }

  setInputField(inputField: HTMLElement) {
    this.inputField.replaceWith(inputField);
    this.inputField = inputField;
  }

  createSelectField(options: OptionsAttributtes[]) {
    const selectField = document.createElement("select");

    for (let i = 0; i < options.length; i++) {
      const opt = document.createElement("option");
      opt.value = options[i].value;
      opt.text = options[i].output;
      selectField.add(opt);
    }
    selectField.addEventListener("change", (ev) => {
      this.internalSet(selectField.value);
    });
    return selectField;
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

    const optionsPane = (this.optionsPane = createHtmlElement(
      "div",
      null,
      "auto-complete-div"
    ));
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
  private internalSet(value: string) {
    console.error("_set", value);
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
      const optionHtmlEle = createHtmlElement(
        "div",
        this.optionsPane,
        "auto-complete-option-div"
      );
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

  bindEvents() {
    console.log("SelectAutoFormField.bindEvents");

    // this.txtInputField.addEventListener("click", (evt) => {
    //     this.showOptionPane();
    //     this.txtInputField.value = "";
    // });
    // this.txtInputField.addEventListener("keyup", (evt) => {
    //     this.filterOptionPane(this.txtInputField.value);
    // });

    // this.inputField.addEventListener("input", (evt) => {
    //     const val = $(evt.target).val();
    //     $(`.${fieldIdx}_autoSelect`).hide();
    //     if (val != "") {
    //         let selector = `div[data-output*="${val}"]`;
    //         const element = this.element[0];
    //         if (element.hasAttribute("requires")) {
    //             const requiresIdx = kvm.activeLayer.attribute_index[element.getAttribute("requires")];
    //             const requiresAttr = <any>kvm.activeLayer.attributes[requiresIdx];
    //             const requiresValue = requiresAttr.formField.getValue();
    //             selector += `[requires="${requiresValue}"]`;
    //         }
    //         const matchingOptions = $(selector);
    //         if (matchingOptions.length == 0) {
    //             $(`#${fieldIdx}_autoSelect`).hide();
    //         } else {
    //             $(`#${fieldIdx}_autoSelect`).show();
    //             matchingOptions.show();
    //         }
    //     }
    // });

    // this.hiddenInput.addEventListener("change", function (evt) {
    //     if (!$("#saveFeatureButton").hasClass("active-button")) {
    //         $("#saveFeatureButton").toggleClass("active-button inactive-button");
    //     }
    // });

    // $("#featureFormular input[id=" + this.settings.index + "]").on("change", function (evt) {
    //     if (!$("#saveFeatureButton").hasClass("active-button")) {
    //         $("#saveFeatureButton").toggleClass("active-button inactive-button");
    //     }
    // });
  }
}

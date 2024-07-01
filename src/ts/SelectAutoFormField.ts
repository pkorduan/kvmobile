import { Attribute, AttributeSetting } from "./Attribute";
import { Field } from "./Field";
import { kvm } from "./app";

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
  selector: string;
  element: JQuery<HTMLElement>;

  constructor(formId: string, settings: AttributeSetting) {
    this.settings = settings;
    this.selector = "#" + formId + " select[id=" + this.settings.index + "]";
    this.element = $(`
      <input
        id="${this.settings.index}"
        name="${this.settings.name}"
        type="hidden"
        ${
          kvm.coalesce(this.settings.required_by, "") != ""
            ? 'required_by="' + this.settings.required_by + '"'
            : ""
        }
				${
          kvm.coalesce(this.settings.requires, "") != ""
            ? 'requires="' + this.settings.requires + '"'
            : ""
        }
        />
      <input
        id="${this.settings.index}_autoSelectOutput"
        name="${this.settings.name}"
        type="text"
        ${this.settings.privilege === "0" ? " disabled" : ""}
        style="float: left"
      />
      <i class="fa fa-times-circle"
        aria-hidden="true"
        style="
          margin-left: -26px;
          margin-top: 10px;
          color: gray;
          float: left;
        "
        onclick="
          document.getElementById('${this.settings.index}').value = '';
          document.getElementById('${
            this.settings.index
          }_autoSelectOutput').value = '';
          document.getElementById('${
            this.settings.index
          }_autoSelect').style.display = 'none';
        "
      ></i>
      <div
        id="${this.settings.index}_autoSelect"
        class="auto-complete-div"
      >
        ${$.map(this.settings.enums, (option: any) => {
          return `
            <div
              data-output="${option.output}"
              class="auto-complete-option-div ${this.settings.index}_autoSelect"
              ${
                kvm.coalesce(option.requires_value, "") != ""
                  ? 'requires="' + option.requires_value + '"'
                  : ""
              }
              style="display: none"
              onclick="
                document.getElementById('${this.settings.index}').value = '${
            option.value
          }';
                document.getElementById('${
                  this.settings.index
                }_autoSelectOutput').value = '${option.output}';
                document.getElementById('${
                  this.settings.index
                }_autoSelect').style.display = 'none';
              "
            >${option.output}</div>
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
    const matchingOptions = (<any>this.settings.enums).filter((e) => {
      return e.value == val;
    });
    $(`#${this.settings.index}_autoSelectOutput`).val(
      matchingOptions.length > 0 ? matchingOptions[0].output : ""
    );
  }

  getValue(action = "") {
    //console.log('SelectFormField.getValue');
    const val = this.element.val();
    if (typeof val === "undefined" || val == "") {
      return null;
    }
    return val;
  }

  filter_by_required(attribute: Attribute, value: any) {
    //console.log('filter_by_requiered attribute %s with %s="%s"', this.get("name"), attribute, value);
    // required SelectAutoFormField options werden im mit bindEvents gebundenen input event gefiltert
    // ToDo:
    // Wenn sich der Wert in einem übergeordneten Feld geändert hat, muss der Wert hier gelöscht werden
    // wenn er nicht in der Liste mit dem entsprechenden value in required vorkommt.
    const fieldIdx = this.settings.index;
    $(`${fieldIdx}, #${fieldIdx}_autoSelectOutput`).val("");
    $(`#${fieldIdx}_autoSelect`).hide();
  }

  bindEvents() {
    console.log("SelectAutoFormField.bindEvents");
    const fieldIdx = this.settings.index;
    $(`#featureFormular input[id=${fieldIdx}_autoSelectOutput]`).on(
      "input",
      (evt) => {
        const val = $(evt.target).val();
        $(`.${fieldIdx}_autoSelect`).hide();
        if (val != "") {
          let selector = `div[data-output*="${val}"]`;
          const element = this.element[0];
          if (element.hasAttribute("requires")) {
            const requiresIdx =
              kvm.activeLayer.attribute_index[element.getAttribute("requires")];
            const requiresAttr = <any>kvm.activeLayer.attributes[requiresIdx];
            const requiresValue = requiresAttr.formField.getValue();
            selector += `[requires="${requiresValue}"]`;
          }
          const matchingOptions = $(selector);
          if (matchingOptions.length == 0) {
            $(`#${fieldIdx}_autoSelect`).hide();
          } else {
            $(`#${fieldIdx}_autoSelect`).show();
            matchingOptions.show();
          }
        }
      }
    );

    $("#featureFormular input[id=" + this.settings.index + "]").on(
      "change",
      function (evt) {
        if (!$("#saveFeatureButton").hasClass("active-button")) {
          $("#saveFeatureButton").toggleClass("active-button inactive-button");
        }
        // let elm = evt.target;
        // if (elm.hasAttribute("required_by")) {
        //   const requiredByIdx =
        //     kvm.activeLayer.attribute_index[this.getAttribute("required_by")];
        //   const requiredByAttr = (<any>(
        //     kvm.activeLayer.attributes[requiredByIdx].formField
        //   )).filter_by_required(elm.getAttribute("name"), $(elm).val());
        //   console.log(
        //     "AutoSelectField %s hat abhängiges Feld %s",
        //     (<HTMLInputElement>this).name,
        //     this.getAttribute("required_by")
        //   );
        // }
      }
    );
    // $(
    //   "#featureFormular input[id=" + this.settings.index + "_autoSelectOutput]"
    // ).on("keyup", function (evt) {
    //   let elm = $(evt.target);
    //   let val: string = String(elm.val());
    //   let selectField = $(`#featureFormular select[id="${elm.attr("id")}]`);
    //   if (val.length > 2) {
    //     selectField.show();
    //     console.log("Key up event on select auto field value: %s", elm.val());
    //   }
    // });
  }
}

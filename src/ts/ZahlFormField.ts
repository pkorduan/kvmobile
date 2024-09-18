import { AttributeSetting } from "./Attribute";
import { Field } from "./Field";
import { kvm } from "./app";
import { createHtmlElement } from "./Util";

/*
 * create a numeric form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="text" id="1" name="bezeichnung" value="Wert"/>
 *     </div>
 *   </div>
 */
export class ZahlFormField implements Field {
  settings: AttributeSetting;
  selector: string;
  element: JQuery<HTMLElement>;
  constructor(formId: string, settings: AttributeSetting) {
    //console.log('Erzeuge ZahlFormField with settings %o', settings);
    this.settings = settings;
    this.selector = "#" + formId + " input[id=" + this.settings.index + "]";
    this.element = $(
      '\
        <input\
        type="number"\
        id="' +
        this.settings.index +
        '"\
        name="' +
        this.settings.name +
        '"\
        value=""' +
        (this.settings.privilege == "0" ? " disabled" : "") +
        "\
        />"
    );
  }
  // get(key) {
  //     return this.settings[key];
  // }

  async setValue(val) {
    // console.log(`Attribute: ${this.get('name')} ZahlFormField.setValue with value: ${val}`);
    const _attribute = this;
    const layer = kvm.getLayer(`${this.settings.stelleId}_${this.settings.layerId}`);
    let sql = "";

    if (layer.activeFeature.new) {
      if (this.settings.default) {
        // console.log('TextFormField default: %s', this.get('default'));
        if (this.settings.default.startsWith("nextval")) {
          // console.log('TextFormField %s Default Wert beginnt mit nextval. Frage max_id ab.', this.get('name'));
          // nextval Attribute werden immer gesetzt
          sql = kvm.nextval(layer.get("schema_name"), layer.get("table_name"), this.settings.name);
        }
        if (this.settings.default.startsWith("gdi_conditional_nextval")) {
          // function call looks like this: gdi_conditional_next_val('kob', 'baum', 'id_nr', 'user_id = $user_id')
          sql = kvm.gdi_conditional_next_val(
            this.settings.default.match(/'(.*?)'/)[1], // schema: 1. Argument in quotas
            this.settings.default
              .split(",")[1]
              .trim()
              .replace(/^["'](.+(?=["']$))["']$/, "$1"), // table: 2. kommasepariertes Argument
            this.settings.default
              .split(",")[2]
              .trim()
              .replace(/^["'](.+(?=["']$))["']$/, "$1"), // column: 3. kommasepariertes Argument
            this.settings.default
              .split(",")[3]
              .replace(")", "")
              .trim()
              .replace(/^["'](.+(?=["']$))["']$/, "$1")
              .replace("$user_id", kvm.store.getItem("userId")) // condition: 4. Argument mit user_id
          );

          sql = kvm.getActiveStelle().replaceParams(sql);
        }
        if (sql) {
          kvm.db.executeSql(
            sql,
            [],
            (rs) => {
              let next_val = 1;
              if (rs.rows.length == 1) {
                next_val = rs.rows.item(0).next_val;
                console.log("ZahlFormField " + _attribute.settings.name + " setValue to nextValue: %s", next_val);
                _attribute.element.val(next_val);
              }
            },
            (err) => {
              console.log("Fehler bei Ermittlung des max Value von Attribute: %s. Fehler: %o", _attribute.settings.name, err);
              _attribute.element.val(1);
            }
          );
        }
      } else if (this.settings.nullable == 0 && this.settings.form_element_type != "Time") {
        // sonstige Pflichtattribute außer Zeit, diese werden erst beim Speichern gesetzt.
        if (kvm.coalesce(val, "") == "") {
          val = this.settings.default;
        }
      }
    }
    // console.log("ZahlFormField " + this.get("name") + " set value = %s", val == null || val == "null" ? "" : val);
    this.element.val(val == null || val == "null" ? "" : val);
  }

  getValue(action = "") {
    //console.log('ZahlFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == "") {
      val = null;
    }
    return val;
  }

  bindEvents() {
    // console.log('ZahlFormField.bindEvents');
    $("#featureFormular input[id=" + this.settings.index + "]").on("keyup", function () {
      if (!$("#saveFeatureButton").hasClass("active-button")) {
        $("#saveFeatureButton").toggleClass("active-button inactive-button");
      }
    });
  }
}

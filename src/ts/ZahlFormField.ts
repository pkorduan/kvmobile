import { Attribute, AttributeSetting } from "./Attribute";
import { AbstractField, Field } from "./Field";
import { kvm } from "./app";
import { createHtmlElement } from "./Util";
import { Feature } from "./Feature";

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
export class ZahlFormField extends AbstractField implements Field {
  element: HTMLInputElement;

  constructor(formId: string, attr: Attribute) {
    super(formId, attr);

    this.element = createHtmlElement("input");
    this.element.type = "number";
    this.element.id = String(attr.settings.index);
    this.element.name = attr.settings.name;
    const disabled = (this.element.disabled = attr.settings.privilege == "0");
    if (!disabled) {
      this.element.addEventListener("input", () => {
        this._value = this.element.value;
        this.fireChanged();
      });
    }
  }

  async setValue(f: Feature, val) {
    console.log(`Attribute: ${this.attr.settings.name} ZahlFormField.setValue with value: ${val}`);

    const settings = this.attr.settings;
    this._oldValue = val;

    const _attribute = this;
    const layer = kvm.getLayer(`${settings.stelleId}_${settings.layerId}`);
    let sql = "";

    if (f.new) {
      if (settings.default) {
        // console.log('TextFormField default: %s', this.get('default'));
        if (settings.default.startsWith("nextval")) {
          // console.log('TextFormField %s Default Wert beginnt mit nextval. Frage max_id ab.', this.get('name'));
          // nextval Attribute werden immer gesetzt
          sql = kvm.nextval(layer.get("schema_name"), layer.get("table_name"), settings.name);
        }
        if (settings.default.startsWith("gdi_conditional_nextval")) {
          sql = kvm.gdi_conditional_nextval(
            settings.default.match(/'(.*?)'/)[1], // schema: 1. Argument in quotas
            settings.default
              .split(",")[1]
              .trim()
              .replace(/^["'](.+(?=["']$))["']$/, "$1"), // table: 2. kommasepariertes Argument
            settings.default
              .split(",")[2]
              .trim()
              .replace(/^["'](.+(?=["']$))["']$/, "$1"), // column: 3. kommasepariertes Argument
            settings.default
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
                console.log("ZahlFormField " + settings.name + " setValue to nextValue: %s", next_val);
                _attribute.element.value = String(next_val);
              }
            },
            (err) => {
              console.log("Fehler bei Ermittlung des max Value von Attribute: %s. Fehler: %o", _attribute.attr.settings.name, err);
              _attribute.element.value = "1";
            }
          );
        }
      } else if (settings.nullable == 0 && settings.form_element_type != "Time") {
        // sonstige Pflichtattribute außer Zeit, diese werden erst beim Speichern gesetzt.
        if (kvm.coalesce(val, "") == "" && settings.default) {
          val = settings.default;
        }
      }
    }
    this._value = val;
    // console.log("ZahlFormField " + this.get("name") + " set value = %s", val == null || val == "null" ? "" : val);
    this.element.value = val == null || val == "null" ? "" : val;
  }

  getValue(action = "") {
    //console.log('ZahlFormField.getValue');
    var val = this.element.value;

    if (typeof val === "undefined" || val == "") {
      val = null;
    }
    return val;
  }

  createInputElement(): HTMLElement {
    return this.element;
  }
}

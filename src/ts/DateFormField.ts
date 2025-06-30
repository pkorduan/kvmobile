import { Attribute, AttributeSetting } from "./Attribute";
import { AbstractField } from "./Field";
import { kvm } from "./app";
import { createHtmlElement } from "./Util";

/*
 * create a date form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="date" id="1" name="bezeichnung" value="Wert"/>
 *     </div>
 *   </div>
 */
export class DateFormField extends AbstractField {
  element: HTMLInputElement;

  constructor(formId: string, attr: Attribute) {
    super(formId, attr);

    this.element = createHtmlElement("input");
    this.element.type = "date";
    this.element.id = String(attr.settings.index);
    this.element.name = attr.settings.name;
    const disabled = (this.element.disabled = attr.settings.privilege == "0");
    if (!disabled) {
      this.element.addEventListener("change", () => {
        this._value = this.element.value || null;
        this.fireChanged();
      });
    }
  }
  // get(key: string) {
  //     return this.settings[key];
  // }
  async setValue(val) {
    this._oldValue = val;
    console.debug("val: " + val, 4);
    val = kvm.coalesce(val, "");
    if (this.isValidDate(val)) {
      val = this.toISO(val);
    }
    console.info("DateFormField " + this.attr.settings.name + " setValue with value: " + JSON.stringify(val));
    this._value = val || null;
    this.element.value = val;
  }

  getValue(action = "") {
    return this._value;
  }

  getAutoValue() {
    return kvm.today();
  }

  toISO(date) {
    return typeof date == "string" ? date.replace(/\//g, "-") : "";
  }

  fromISO(date) {
    console.info("konvert " + this.attr.settings.name + " date: " + date, 4);
    return typeof date == "string" ? date.replace(/-/g, "/").replace("T", " ").replace("Z", "") : null;
  }

  /*
   * Validate date format
   * changed from: https://www.c-sharpcorner.com/article/date-validation-as-text-format-in-javascript/
   */
  isValidDate(dateString) {
    if (!(typeof dateString === "string" || dateString instanceof String)) {
      console.log(dateString + " ist kein String.");
      return false;
    }
    let dateformat = /^\d{4}[-](0?[1-9]|1[0-2])[-](0?[1-9]|[1-2][0-9]|3[01])$/;
    if (dateString.match(dateformat)) {
      //console.log('Datumsformat passt zur Form YYYY-MM-DD');
      let operator = dateString.split("-");
      let datepart = [];
      if (operator.length > 1) {
        //console.log('Es sind mehr als 1 - vorhanden');
        datepart = dateString.split("-");
      } else {
        //console.log('Es fehlen - Zeichen');
      }
      let year = parseInt(datepart[0]);
      let month = parseInt(datepart[1]);
      let day = parseInt(datepart[2]);
      let ListofDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (year < 1970) {
        console.log("Es werden nur Datumsangaben ab 1970 zugelassen.");
        return false;
      }
      //console.log('Prüfe Jahr: ' + year + ' Monat: ' + month + ' Tag: ' + day);
      if (month == 1 || month > 2) {
        //console.log('Kein Februar');
        if (day > ListofDays[month - 1]) {
          //console.log('Tag ist größer als ', ListofDays[month - 1]);
          return false;
        }
      } else if (month == 2) {
        //console.log('Prüfe Tag im Februar');
        let leapYear = false;
        if ((!(year % 4) && year % 100) || !(year % 400)) {
          //console.log('Es ist Schaltjahr!');
          leapYear = true;
        }
        if (leapYear == false && day >= 29) {
          console.log("Tag ist größer als 28. Und wir haben kein Schaltjahr.");
          return false;
        } else if (leapYear == true && day > 29) {
          console.log("Wir haben Schaltjahr aber der Tag ist größer als 29.");
          return false;
        }
      }
    } else {
      console.log("Unültiges Datumsformat");
      return false;
    }
    return true;
  }

  createInputElement(): HTMLElement {
    return this.element;
  }
}

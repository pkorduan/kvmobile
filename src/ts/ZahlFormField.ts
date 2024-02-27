import { kvm } from "./app";

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
export class ZahlFormField {
	settings: any;
	selector: string;
	element: JQuery<HTMLElement>;
	constructor(formId, settings) {
		//console.log('Erzeuge ZahlFormField with settings %o', settings);
		this.settings = settings;
		this.selector = "#" + formId + " input[id=" + this.get("index") + "]";
		this.element = $('\
        <input\
        type="number"\
        id="' + this.get("index") + '"\
        name="' + this.get("name") + '"\
        value=""' + (this.get("privilege") == "0" ? " disabled" : "") + "\
        />");
	}
	get(key) {
		return this.settings[key];
	}

	setValue(val) {
		// console.log(`Attribute: ${this.get('name')} ZahlFormField.setValue with value: ${val}`);
		const _attribute = this;
		const layer = kvm.layers[`${this.get('stelleId')}_${this.get('layerId')}`];
		let sql = '';

		if (layer.activeFeature.options.new) {
			if (this.get('default')) {
				// console.log('TextFormField default: %s', this.get('default'));
				if (this.get('default').startsWith('nextval')) {
					// console.log('TextFormField %s Default Wert beginnt mit nextval. Frage max_id ab.', this.get('name'));
					// nextval Attribute werden immer gesetzt
					sql = kvm.nextval(layer.get('schema_name'), layer.get('table_name'), this.get('name'));
				}
				if (this.get('default').startsWith('gdi_conditional_nextval')) {
					// function call looks like this: gdi_conditional_next_val('kob', 'baum', 'id_nr', 'user_id = $user_id')
					sql = kvm.gdi_conditional_next_val(
						this.get('default').match(/'(.*?)'/)[1], // schema: 1. Argument in quotas
						this.get('default').split(',')[1].trim().replace(/^["'](.+(?=["']$))["']$/, '$1'), // table: 2. kommasepariertes Argument
						this.get('default').split(',')[2].trim().replace(/^["'](.+(?=["']$))["']$/, '$1'), // column: 3. kommasepariertes Argument
						this.get('default').split(',')[3].replace(')', '').trim().replace(/^["'](.+(?=["']$))["']$/, '$1').replace('$user_id', kvm.store.getItem('userId')) // condition: 4. Argument mit user_id
					);
				}
				if (sql) {
					kvm.db.executeSql(
						sql,
						[],
						(rs) => {
							let next_val = 1;
							if (rs.rows.length == 1) {
								next_val = rs.rows.item(0).next_val;
								console.log("ZahlFormField " + _attribute.get("name") + " setValue to nextValue: %s", next_val);
								_attribute.element.val(next_val);
							}
						},
						(err) => {
							console.log('Fehler bei Ermittlung des max Value von Attribute: %s. Fehler: %o', _attribute.get('name'), err);
							_attribute.element.val(1);
						}
					);
				}
			}
			else if (this.get('nullable') == 0 && this.get('form_element_type') != 'Time') {
				// sonstige Pflichtattribute außer Zeit, diese werden erst beim Speichern gesetzt.
				if (kvm.coalesce(val, "") == "") {
					val = this.get("default");
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
		$("#featureFormular input[id=" + this.get("index") + "]").on("keyup", function () {
			if (!$("#saveFeatureButton").hasClass("active-button")) {
				$("#saveFeatureButton").toggleClass("active-button inactive-button");
			}
		});
	}
}

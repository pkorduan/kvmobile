import { kvm } from "./app";
import { Attribute } from "./Attribute";

export class SubFormFKFormField {
  settings: any;
  selector: string;
  element: JQuery<HTMLElement>;
	attribute: Attribute;

	/**
	* create a SubFormFK form field in the structure
	*   <div class="form-field">
	*     <div class="form-label">
	*       <label for="name"/>
	*     </div>
	*     <div class="form-value">
	*       <ul>
	*         <li>Vorschauattribut 1</li>
	*         <li>Vorschauattribut 2</li>
	*         <li>Vorschauattribut i</li>
	*         <li>Vorschauattribut n</li>
	*       </ul>
	*       <input type="button" value="Neu" onclick="newFeature(this.feature.id, subformLayerId)"/>
	*     </div>
	*   </div>
	*/
  constructor(formId, attribute) {
    this.attribute = attribute;
		this.selector = "#" + formId + " input[id=" + this.get("index") + "]";
		this.element =  $(`
			<input
				type="text"
				id="${this.get("index")}"
				name="${this.get("name")}"
				value=""
				disabled
			/>`);
  }

	get(key) {
    return this.attribute.settings[key];
  }

  setValue(val) {
		console.log("SubFormFKFormField " + this.get("name") + " setValue with value: %o", val);
		if (kvm.coalesce(val, "") == "" && this.get("default")) {
			val = this.get("default");
		}
		this.element.val(val == null || val == "null" ? "" : val);
  }

  getValue(action = "") {
		console.log('SubFormFKFormField.getValue');
		var val = this.element.val();

		if (typeof val === "undefined" || val == "") {
			val = null;
		}

		return val;
  }

	getAutoValue() {
		const attributeName = this.attribute.get('name');
		return this.attribute.layer.activeFeature.get(attributeName);
	}

  /**
   * @return string: ID of sublayer
   */
  getParentLayerId() {
    return this.attribute.settings.options.split(';')[0].split(',')[0];
  }

  bindEvents() {
      //console.log('TextfeldFormField.bindEvents');
/*        $("#featureFormular textarea[id=" + this.get("index") + "]").on("keyup", function () {
          if (!$("#saveFeatureButton").hasClass("active-button")) {
              $("#saveFeatureButton").toggleClass("active-button inactive-button");
          }
      });*/
  }
}

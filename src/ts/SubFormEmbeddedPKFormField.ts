import { kvm } from "./app";
import { Attribute } from "./Attribute";
import { Field } from "./Field";

/*
 * create a SubFormEmbeddedPK form field in the structure
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
export class SubFormEmbeddedPKFormField implements Field {
    // settings: any;
    selector: string;
    element: JQuery<HTMLElement>;
    attribute: Attribute;

    constructor(formId: string, attribute: Attribute) {
        this.attribute = attribute;
        this.selector = "#" + formId + " input[id=" + this.attribute.settings.index + "]";
        this.element = $("<div></div>");
    }

    // get(key) {
    //     return this.attribute.settings[key];
    // }

    /**
     *
     * @param val Der Wert ist leer weil in einem SubFormEmbedded die Werte erst abgefragt
     * werden über die ID des Datensatzes der in id_attribut steht
     */
    setValue(val) {
        const feature = this.attribute.layer.activeFeature;
        console.log("setValue of SubFormEmbeddedPK FormField");
        this.element.empty();
        if (feature.options.new) {
            $("#new_sub_data_set").hide();
            this.element.append("<span>Können erst angelegt werden wenn der neue Datensatz gespeichert ist.</span>");
        } else {
            $("#new_sub_data_set").show();
            this.attribute.layer.readVorschauAttributes(this.attribute, feature.get(this.attribute.getPKAttribute()), this.element, "editFeature");
        }
    }

    getValue(action = "") {}

    bindEvents() {
        //console.log('TextfeldFormField.bindEvents');
        /*        $("#featureFormular textarea[id=" + this.get("index") + "]").on("keyup", function () {
          if (!$("#saveFeatureButton").hasClass("active-button")) {
              $("#saveFeatureButton").toggleClass("active-button inactive-button");
          }
      });*/
    }
}

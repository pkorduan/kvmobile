import { kvm } from "./app";
import { Attribute, AttributeSetting } from "./Attribute";
import { Field } from "./Field";

/**
 * SubFormFK Attribute sind keine Autoattribute
 * Der Wert wird zwar wenn er leer ist setValue über within gesucht,
 * kann aber ggf. später auch mal über eine Auswahlliste im Formular gesetzt werden
 * und das ist dann kein Autoattribute
 */
export class SubFormFKFormField implements Field {
    settings: AttributeSetting;
    element: JQuery<HTMLElement>;
    linkElement: JQuery<HTMLElement>;
    attribute: Attribute;
    selector: string;

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
    constructor(formId: string, attribute: Attribute) {
        this.attribute = attribute;
        this.settings = attribute.settings;
        this.selector = "#" + formId + " input[id=" + this.get("index") + "]";
        let globalParentLayerId = this.attribute.getGlobalParentLayerId();
        let vorschauOption = this.attribute.getVorschauOption();
        this.element = $(`
      <input
				type="text"
				id="${this.attribute.settings.index}"
				name="${this.attribute.settings.name}"
				value=""
				disabled
        style="width:80%"
			/>`);

        this.linkElement = $(`
      <div onclick="kvm.editFeature('${globalParentLayerId}', document.getElementById('${this.attribute.settings.index}').value)" class="link-element">
        <i class="fa fa-arrow-left" aria-hidden="true" style="margin-right: 10px"></i> ${vorschauOption}
      </div>
    `);
        // $(`
        //   <div onclick="kvm.editFeature('${globalParentLayerId}', document.getElementById('${this.get("index")}').value)" class="link-element">
        //     <i class="fa fa-arrow-left" aria-hidden="true" style="margin-right: 10px"></i> ${vorschauOption}
        //   </div>
        // `);
    }

    get(key) {
        return this.attribute.settings[key];
    }

    setValue(val) {
        console.log("Attribute: %s, SubFormFKFormField.setValue options: %o, value: %s", this.get("name"), this.get("options"), val);
        // ToDo: Prüfen warum hier noch mal default gesetzt wird. Das wird auch schon in getNewData gemacht.
        if (kvm.coalesce(val, "") == "" && this.get("default")) {
            val = this.get("default");
        }

        // ToDo: Das darf nur gemacht werden wenn der Layer Geometrie hat und der übergeordnete auch.
        if (kvm.activeLayer.hasGeometry && kvm.activeLayer.activeFeature.new) {
            // Abfragen des übergeordneten Layers
            const pkLayer = kvm.getLayer(`${this.get("stelleId")}_${this.get("options").split(",")[0]}`);
            if (pkLayer.hasGeometry) {
                console.log("Übergeordneter Layer %s", pkLayer.title);
                // Abfragen der uuid des Features in das das aktive Feature fällt
                // aktuelle mit Within umgesetzt. Bei Polygonen könnte auch ein Intersects notwendig werden.
                const sql = `
					SELECT
						${pkLayer.get("id_attribute")} AS id,
						geom
					FROM
						${pkLayer.getSqliteTableName()}
					WHERE
						ST_Within(
							ST_GeomFromText('${this.attribute.layer.activeFeature.geom.toWkt()}', 4326),
							GeomFromEWKB(${pkLayer.get("geometry_attribute")})
						)
				`;
                console.log("Frage parent id mit sql ab: ", sql);
                kvm.db.executeSql(
                    sql,
                    [],
                    (rs) => {
                        let id = "";
                        for (let i = 0; i < rs.rows.length; i++) {
                            if (typeof rs.rows.item(i).geom != "undefined" && rs.rows.item(i).geom != "") {
                                id = rs.rows.item(i).id;
                                kvm.mapHint(`Übergeordnetes Objekt ${pkLayer.getFeature(id).getDataValue(pkLayer.get("name_attribute"))} aus Layer ${pkLayer.title} über Markerposition ermittelt.`, 5000);
                                this.element.val(id);
                                break;
                            }
                        }
                        if (id == "") {
                            kvm.mapHint(`Der Marker liegt nicht im räumlichen Bereich eines Objektes vom Layers ${pkLayer.title}.`, 5000);
                            this.element.val(this.get("default"));
                        }
                    },
                    (err) => {
                        kvm.msg(`Fehler bei der räumlichen Suche eines Objektes in Layer ${pkLayer.title} zu dem dieses Objekt räumlich gehören könnte. Fehler: ${err}`, "Editiervorgabe");
                    }
                );
            }
        } else {
            this.element.val(val == null || val == "null" ? "" : val);
        }
    }

    getValue(action = "") {
        console.log("SubFormFKFormField.getValue");
        var val = this.element.val();

        if (typeof val === "undefined" || val == "") {
            val = null;
        }

        return val;
    }

    getAutoValue() {
        return this.element.val();
        // const attributeName = this.attribute.get('name');
        // return this.attribute.layer.activeFeature.getDataValue(attributeName);
    }

    /**
     * @return string: ID of sublayer
     */
    getParentLayerId() {
        return this.attribute.settings.options.split(";")[0].split(",")[0];
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

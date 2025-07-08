import { kvm } from "./app";
import { Attribute, AttributeSetting } from "./Attribute";
import { Field } from "./Field";
import { executeSQL } from "./Util";
import { createHtmlElement } from "./Util";

/**
 * SubFormFK Attribute sind keine Autoattribute
 * Der Wert wird zwar wenn er leer ist setValue über within gesucht,
 * kann aber ggf. später auch mal über eine Auswahlliste im Formular gesetzt werden
 * und das ist dann kein Autoattribute
 */
export class SubFormFKFormField implements Field {
  settings: AttributeSetting;
  private element: HTMLInputElement;
  linkElement: HTMLElement;
  attribute: Attribute;
  selector: string;
  value: string;
  counter = 0;

  constructor(formId: string, attribute: Attribute) {
    this.attribute = attribute;
    this.settings = attribute.settings;
    this.selector = "#" + formId + " input[id=" + this.get("index") + "]";
    let globalParentLayerId = this.attribute.getGlobalParentLayerId();
    let vorschauOption = this.attribute.getVorschauOption();
    this.element = createHtmlElement("input", null);
    this.element.type = "text";
    this.element.id = this.attribute.settings.name + "_" + this.attribute.settings.index;
    this.element.dataset.testdate = "jhjghdjahd";
    this.element.name = this.attribute.settings.name;
    this.element.value = "";
    this.element.disabled = true;
    // this.element.style.display = "none";

    this.linkElement = createHtmlElement("div", this.element);
    createHtmlElement("i", this.linkElement, "fa fa-arrow-left");
    // this.linkElement.appendChild
    //   <div onclick="kvm.editFeature('${globalParentLayerId}', document.getElementById('${this.attribute.settings.index}').value)" class="link-element">
    //     <i class="fa fa-arrow-left" aria-hidden="true" style="margin-right: 10px"></i> ${vorschauOption}
    //   </div>
    // `);
    // $(`
    //   <div onclick="kvm.editFeature('${globalParentLayerId}', document.getElementById('${this.get("index")}').value)" class="link-element">
    //     <i class="fa fa-arrow-left" aria-hidden="true" style="margin-right: 10px"></i> ${vorschauOption}
    //   </div>
    // `);
  }

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
  constructorXX(formId: string, attribute: Attribute) {
    console.info(`new SubFormFKFormField(${formId}, ${attribute.settings.name})`);
    this.attribute = attribute;
    this.settings = attribute.settings;
    this.selector = "#" + formId + " input[id=" + this.get("index") + "]";
    let globalParentLayerId = this.attribute.getGlobalParentLayerId();
    let vorschauOption = this.attribute.getVorschauOption();
    // ToDo prüfen ob display none korrekt ist.
    // this.element = createHtmlElement("input");
    // this.element.type = "text";
    // this.element.id = String(this.attribute.settings.index);
    // this.element.name = this.attribute.settings.name;
    // this.element.disabled = true;
    // this.element.style.display = "none";

    // $(`
    //   <input
    // 		type="text"
    // 		id="${this.attribute.settings.index}"
    // 		name="${this.attribute.settings.name}"
    // 		value=""
    // 		disabled
    //     style="display: none"
    // 	/>`);

    this.linkElement = createHtmlElement("div", null, "link-element");
    this.linkElement.addEventListener("click", () => {
      const layer = kvm.getLayer(globalParentLayerId);
      console.info(`SubFormFKFormField.clicked ${layer?.title} ${this.value}`);
      kvm.editFeature(globalParentLayerId, this.value);
    });
    const bttn = createHtmlElement("i", this.linkElement, "fa fa-arrow-left");
    bttn.ariaHidden = "true";
    bttn.style.cssText = "margin-right: 10px";
    this.linkElement.append(vorschauOption);
    // $(`
    //   <div onclick="kvm.editFeature('${globalParentLayerId}', document.getElementById('${this.attribute.settings.index}').value)"
    //   class="link-element">
    //     <i class="fa fa-arrow-left" aria-hidden="true" style="margin-right: 10px"></i> ${vorschauOption}
    //   </div>
    // `);
    // $(`
    //   <div onclick="kvm.editFeature('${globalParentLayerId}', document.getElementById('${this.get("index")}').value)" class="link-element">
    //     <i class="fa fa-arrow-left" aria-hidden="true" style="margin-right: 10px"></i> ${vorschauOption}
    //   </div>
    // `);
  }

  get(key) {
    return this.attribute.settings[key];
  }

  async setValue(val) {
    this.counter++;
    console.log("%s Attribute: %s, SubFormFKFormField.setValue options: %o, value: %s", this.counter, this.get("name"), this.get("options"), val);
    // ToDo: Prüfen warum hier noch mal default gesetzt wird. Das wird auch schon in getNewData gemacht.
    if (kvm.coalesce(val, "") == "" && this.get("default")) {
      val = this.get("default");
    }

    // ToDo: Das darf nur gemacht werden wenn der Layer Geometrie hat und der übergeordnete auch.
    // rtr
    if (kvm.getActiveLayer().hasGeometry && kvm.getActiveLayer().activeFeature.new && kvm.getActiveLayer().activeFeature.newGeom) {
      // Abfragen des übergeordneten Layers
      const pkLayer = kvm.getLayer(`${this.get("stelleId")}_${this.get("options").split(",")[0]}`);
      if (pkLayer.hasGeometry) {
        console.log("Übergeordneter Layer %s", pkLayer.title);

        let query = kvm.getActiveStelle().replaceParams(pkLayer.settings.query);
        let filter: string = kvm.getActiveStelle().replaceParams(pkLayer.settings.filter);
        let where: string[] = [
          `
          ST_Within(
              ST_GeomFromText('${this.attribute.layer.activeFeature.newGeom.toWkt()}', 4326),
              GeomFromEWKB(${pkLayer.get("geometry_attribute")})
            )
        `,
        ];
        let sql = pkLayer.extentSql(query, where, "", "", "", filter);

        // eventuell ist diese Geometrie richtiger als die von ST_GeomFromText '${this.attribute.layer.activeFeature.wkxToEwkb(this.attribute.layer.activeFeature.geom)}'
        // Prüfen gegen welche Geometrie ST_Within testet, vielleicht liegt es auch an einer falschen geom in standorte
        console.log("Frage parent id mit sql ab: ", sql);
        try {
          console.log("%s Attribute: %s, SubFormFKFormField.setValue search parentFeature", this.counter, this.get("name"));
          const rs = await executeSQL(kvm.db, sql);
          console.log("Resultset von räumlicher Abfrage", rs);
          let featureId: string = "";

          for (let i = 0; i < rs.rows.length; i++) {
            if (typeof rs.rows.item(i).geom != "undefined" && rs.rows.item(i).geom != "") {
              featureId = rs.rows.item(i)[pkLayer.get("id_attribute")];
              kvm.mapHint(`Übergeordnetes Objekt ${pkLayer.getFeature(featureId).getDataValue(pkLayer.get("name_attribute"))} aus Layer ${pkLayer.title} über Markerposition ermittelt.`, 5000);
              this.value = featureId;
              break;
            }
          }
          console.log("%s Attribute: %s, SubFormFKFormField.setValue search parentFeature => %s value=%s", this.counter, this.get("name"), featureId, this.value);
          if (featureId == "") {
            kvm.mapHint(`Der Marker liegt nicht im räumlichen Bereich eines Objektes vom Layers ${pkLayer.title}.`, 5000);
            this.value = this.get("default");
          }
        } catch (err) {
          console.error(`Fehler bei der räumlichen Suche eines Objektes im Layer ${pkLayer.title}`, err);
          kvm.msg(`Fehler bei der räumlichen Suche eines Objektes in Layer ${pkLayer.title} zu dem dieses Objekt räumlich gehören könnte. Fehler: ${err["message"]}`, "Editiervorgabe");
        }
      }
    } else {
      this.value = val == null || val == "null" ? "" : val;
    }
    this.element.value = this.value;
    console.log("%s Attribute: %s, SubFormFKFormField.setValue done value: %s", this.counter, this.get("name"), this.value);
  }

  getValue(action = "") {
    console.log(`SubFormFKFormField ${this.attribute.layer.title}.${this.attribute.settings.name}.getValue => ${this.value}`);
    return this.value;
  }

  getAutoValue() {
    const attributeName = this.attribute.get("name");
    return this.attribute.layer.activeFeature.getDataValue(attributeName);
  }

  /**
   * @return string: ID of sublayer
   */
  getParentLayerId() {
    return this.attribute.settings.options.split(";")[0].split(",")[0];
  }

  hasChanged(): boolean {
    return false;
  }

  getDom(): HTMLElement {
    return this.element;
  }

  hide() {
    if (this.element?.parentElement) {
      this.element.parentElement.style.display = "none";
    }
  }
  show() {
    if (this.element?.parentElement) {
      this.element.parentElement.style.display = "";
    }
  }
}

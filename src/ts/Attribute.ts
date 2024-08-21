import * as wkx from "wkx";
import { BilderFormField } from "./BilderFormField";
import { CheckboxFormField } from "./CheckboxFormField";
import { DataViewField } from "./DataViewField";
import { DateFormField } from "./DateFormField";
import { DateTimeFormField } from "./DateTimeFormField";
import { GeometrieFormField } from "./GeometryFormField";
import { SelectFormField } from "./SelectFormField";
import { SelectAutoFormField } from "./SelectAutoFormField";
import { TextfeldFormField } from "./TextfeldFormField";
import { TextFormField } from "./TextFormField";
import { UserFormField } from "./UserFormField";
import { UserIDFormField } from "./UserIDFormField";
import { StelleIDFormField } from "./StelleIDFormField";
import { ClientIDFormField } from "./ClientIDFormField";
import { ZahlFormField } from "./ZahlFormField";
import { SubFormEmbeddedPKFormField } from "./SubFormEmbeddedPKFormField";
import { SubFormFKFormField } from "./SubFormFKFormField";
import { Field } from "./Field";
import { Layer } from "./Layer";

export type OptionsAttributtes = {
  value: any;
  output: string;
  requires_value?: any;
};

export type AttributeSetting = {
  index?: number;
  name?: string;
  real_name?: string;
  table_name: string;
  schema_name: string;
  alias?: string;
  group?: string;
  tooltip?: string;
  type?: string;
  nullable?: any;
  saveable?: string;
  form_element_type?: string;
  arrangement?: string;
  labeling?: string;
  privilege?: string;
  default?: string;
  visible?: string;
  vcheck_attribute?: string;
  vcheck_operator?: string;
  vcheck_value?: string;
  options?: string;
  enums?: OptionsAttributtes[] | string;
  required_by?: any;
  requires?: any;
  stelleId?: string;
  layerId?: string;
};

export class Attribute {
  settings: AttributeSetting;
  layer: any;
  formField: Field;
  viewField: DataViewField;

  constructor(layer: Layer, settings: AttributeSetting) {
    //console.log('Erzeuge Attributeobjekt with settings %o', settings);
    this.layer = layer;
    this.settings = settings;
    this.settings.stelleId = layer.stelle.get("id");
    this.settings.layerId = layer.get("id");
    this.formField = this.getFormField();
    this.viewField = this.getViewField();
    return this;
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    return this.settings[key];
  }

  /**
   * Function returns the attribute with the index after this attribute
   * derived from attribute index or null if attribute is the last
   * @returns Attribute or null
   */
  getSuccessor() {
    const index = this.layer.attribute_index[this.get("name")];
    return index < Object.keys(this.layer.attribute_index).length ? this.layer.attributes[index + 1] : null;
  }

  /**
   * Function return style with float: left if the attribute or its successor attribute
   * has setting arrangement = 1
   * @returns string The float left style or empty string
   */
  getArrangementStyle() {
    const succesor = this.getSuccessor();
    if ((succesor && succesor.get("arrangement") == "1") || this.get("arrangement") == "1") {
      return 'style="float: left"';
    } else {
      return "";
    }
  }

  /**
   * Returns the id of sub layer from SubFormEmbeddedPK attribute option
   * It extracts 832 from this attribute options string:
   * 832,uuid:baumuuid,datum bearbeiter K kontrolluuid;no_new_window
   * @return string: ID of sublayer
   */
  getGlobalSubLayerId() {
    return `${this.settings.stelleId}_${this.settings.options.split(";")[0].split(",")[0]}`;
  }

  /**
   * Returns the id of parent layer from SubFormFK attribute option
   * Its only an alias from getGlobalSubLayerID, because its the same as to get
   * subLayerId from SubFormEmbeddedPK attribute option. Simply the first from
   * comma separated string before ;
   * @returns String Id of parent layer
   */
  getGlobalParentLayerId() {
    return this.getGlobalSubLayerId();
  }

  getGlobalLayerId() {
    return this.settings.stelleId + "_" + this.settings.layerId;
  }

  /**
   * Return the name of the attribute in sub-layer that is the foreign key to the table of the layer of this form element.
   * It extracts uuid from this attribute options string.
   * 832,uuid:baumuuid,datum bearbeiter K kontrolluuid;no_new_window
   * @return string
   */
  getPKAttribute() {
    const key_names = this.settings.options.split(";")[0].split(",")[1].split(":");
    if (this.get("form_element_type") == "SubFormFK") {
      return key_names.length == 1 ? key_names[0] : key_names[1];
    } else {
      return key_names[0];
    }
  }

  /**
   * Return the primary key name of layers table
   * Return baumuuid from this sample attribute options string
   * 832,uuid:baumuuid,datum bearbeiter K kontrolluuid;no_new_window or
   * 832,baumuuid,datum bearbeiter K kontrolluuid;no_new_window
   * @return string
   */
  getFKAttribute() {
    const key_names = this.settings.options.split(";")[0].split(",")[1].split(":");
    if (this.get("form_element_type") == "SubFormFK") {
      return key_names[0];
    } else {
      return key_names.length === 1 ? key_names[0] : key_names[1];
    }
  }

  /**
   * Return the option for Vorschau
   * Return "datum bearbeiter K kontrolluuid" from this sample attribute options string
   * 832,baumuuid,datum bearbeiter K kontrolluuid;no_new_window
   * @returns string
   */
  getVorschauOption() {
    return this.settings.options.split(";")[0].split(",")[2];
  }

  getViewField() {
    return new DataViewField("dataViewDiv", this);
  }

  getFormField(): Field {
    // console.log("Attribute.getFormField attr: " + this.get("name") + " type: " + this.get("type") + " form_element_type: " + this.get("form_element_type"));
    let field: Field;

    switch (this.get("form_element_type")) {
      case "Auswahlfeld":
        if (this.settings.enums.length > 100) {
          field = new SelectAutoFormField("featureFormular", this.settings);
        } else {
          field = new SelectAutoFormField("featureFormular", this.settings);
        }
        break;
      case "Autovervollständigungsfeld":
        field = new SelectAutoFormField("featureFormular", this.settings);
        break;
      case "Text":
        if (this.get("type") == "timestamp") {
          field = new DateTimeFormField("featureFormular", this.settings);
        } else if (this.get("type") == "date") {
          field = new DateFormField("featureFormular", this.settings);
        } else if (this.get("type").substr(0, 3) == "int" || this.get("type") == "numeric") {
          field = new ZahlFormField("featureFormular", this.settings);
        } else {
          field = new TextFormField("featureFormular", this.settings);
        }
        break;
      case "Textfeld":
        field = new TextfeldFormField("featureFormular", this.settings);
        break;
      case "Time":
        field = new DateTimeFormField("featureFormular", this.settings);
        break;
      case "Checkbox":
        field = new CheckboxFormField("featureFormular", this.settings);
        break;
      case "Zahl":
        field = new ZahlFormField("featureFormular", this.settings);
        break;
      case "Geometrie":
        field = new GeometrieFormField("featureFormular", this.settings);
        break;
      case "Dokument":
        field = new BilderFormField("featureFormular", this.settings);
        break;
      case "User":
        field = new UserFormField("featureFormular", this.settings);
        break;
      case "UserID":
        field = new UserIDFormField("featureFormular", this.settings);
        break;
      case "StelleID":
        field = new StelleIDFormField("featureFormular", this.settings);
        break;
      case "ClientID":
        field = new ClientIDFormField("featureFormular", this.settings);
        break;
      case "SubFormEmbeddedPK":
        field = new SubFormEmbeddedPKFormField("featureFormular", this);
        break;
      case "SubFormFK":
        field = new SubFormFKFormField("featureFormular", this);
        break;
      default:
        field = new TextFormField("featureFormular", this.settings);
    }

    return field;
  }

  getSqliteType() {
    const pgType = this.get("type");
    let slType = "";

    switch (true) {
      case $.inArray(pgType, ["character varying", "text", "character", "bool"]) > -1:
        slType = "TEXT";
        break;
      case $.inArray(pgType, ["int4", "int2", "int8", "int16", "bigint", "integer"]) > -1:
        slType = "INTEGER";
        break;
      case $.inArray(pgType, ["double precision"]) > -1:
        slType = "REAL";
      case pgType == "date":
        slType = "DATE";
        break;
      default:
        slType = "TEXT";
    }
    //console.log("getSqliteType returns: ", slType);
    return slType;
  }

  hasEnumValue(value) {
    return (
      this.get("enums").find((enum_element) => {
        return enum_element.value == value;
      }) !== undefined
    );
  }

  /**
   * Find if the attribute attribute_name has a visibility dependency with
   * an other attributes of the layer.
   * @return boolean
   */
  hasVisibilityDependency() {
    return this.layer.attributes.some((attr) => {
      return attr.get("vcheck_attribute") == this.get("name");
    });
  }

  /*
   * Return true if the Postgres attribute type is an array
   * Postgres Array Types starting with underline
   * Return false elsewise
   */
  isArrayType(): boolean {
    return this.get("type").indexOf("_") === 0;
  }

  /**
   * Function return true if the Attribute shall get a value automatically per Definition
   * Check
   *      Wenn es ein SubFormFK ist oder (
   *        Wenn es ein Auto attribut ist und
   *        nicht updated_at_server heißt und
   *        keine options angegeben wurde oder die option zur action passt
   *      )
   * @param array changes The array of changes made in formular
   * @param string action insert or update used to determine if auto value shall be created pending on option of the attribute
   * @return boolean true if auto else false
   */
  isAutoAttribute(action) {
    //    kvm.log('Attribute.isAutoAttribute for action ' + action, 4);
    /*
    kvm.log('name ' + this.get('name') + ' ist user_name, updated_at_client oder created_at? ' + (['user_name', 'updated_at_client', 'created_at'].includes(this.get('name'))), 4);
    kvm.log('form_element_type ' + this.get('form_element_type') + ' ist User, UserID, StelleID, ClientID oder Time? ' + (['User', 'UserID', 'Time'].includes(this.get('form_element_type'))), 4);
    kvm.log('name ' + this.get('name') + ' ist nicht updated_at_server? ' + (this.get('name') != 'updated_at_server'), 4);
    kvm.log('options ist leer? ' + (this.get('options') == ''), 4);
    kvm.log('action == options? ' + (action == this.get('options').toLowerCase()), 4);
    */
    const answer = ["SubFormFK"].includes(this.get("form_element_type")) || ((["user_name", "updated_at_client", "created_at"].includes(this.get("name")) || ["User", "UserID", "StelleID", "Time", "ClientID"].includes(this.get("form_element_type"))) && this.get("name") != "updated_at_server" && (action == "" || this.get("options") == "" || action == this.get("options").toLowerCase()));
    //kvm.log("Attribute " + this.get("name") + " is Autoattribute" + (action ? " for action " + action : "") + "? " + answer, 4);
    return answer;
  }

  isEditable() {
    return parseInt(this.get("privilege")) > 0;
  }

  /**
   * Function return true if the Attribute is a pseudoAttribute
   * having no column in Database
   * @returns Boolean
   */
  isPseudoAttribute() {
    return ["SubFormEmbeddedPK"].includes(this.get("form_element_type"));
  }

  toSqliteValue(pgType, pgValue) {
    //console.log("Layer " + this.layer.get("title") + ", Attribute " + this.settings.name + ": toSqliteValue pgType: " + pgType + " pgValue: %o", pgValue);
    const slType = this.getSqliteType();
    const maxByte = 10485760; // 10 MB

    let slValue: string;
    switch (true) {
      case pgValue == null:
        slValue = "null";
        break;
      case pgType == "bool" && pgValue == "1":
        slValue = "'t'";
        break;
      case pgType == "bool" && pgValue == "0":
        slValue = "'f'";
        break;
      case pgType == "geometry":
        if (this.layer.get("geometry_type") == "Point") {
          slValue =
            "'" +
            wkx.Geometry.parse("SRID=4326;POINT(" + pgValue.coordinates.toString().replace(",", " ") + ")")
              .toEwkb()
              .toString("hex", 0, maxByte)
              .match(/.{2}/g)
              .join("") +
            "'";
        }
        if (pgValue.type == "LineString") {
          slValue =
            "'" +
            wkx.Geometry.parse(
              "SRID=4326;LINESTRING(" +
                pgValue.coordinates
                  .map(function (p) {
                    return p.join(" ");
                  })
                  .join(", ") +
                ")"
            )
              .toEwkb()
              .toString("hex", 0, maxByte)
              .match(/.{2}/g)
              .join("") +
            "'";
        }
        if (pgValue.type == "MultiLineString") {
          slValue =
            "'" +
            wkx.Geometry.parse(
              "SRID=4326;LINESTRING(" +
                pgValue.coordinates[0]
                  .map(function (p) {
                    return p.join(" ");
                  })
                  .join(", ") +
                ")"
            )
              .toEwkb()
              .toString("hex", 0, maxByte)
              .match(/.{2}/g)
              .join("") +
            "'";
        }
        if (pgValue.type == "Polygon") {
          let wkxText =
            "SRID=4326;POLYGON((" +
            pgValue.coordinates[0]
              .map(function (p) {
                return p.join(" ");
              })
              .join(", ") +
            "))";
          slValue = "'" + wkx.Geometry.parse(wkxText).toEwkb().toString("hex", 0, maxByte).match(/.{2}/g).join("") + "'";
        }
        if (pgValue.type == "MultiPolygon") {
          let wkxText =
            "SRID=4326;MULTIPOLYGON(" +
            pgValue.coordinates
              .map(function (t) {
                return (
                  "(" +
                  t
                    .map(function (r) {
                      return (
                        "(" +
                        r
                          .map(function (p) {
                            return p.join(" ");
                          })
                          .join(", ") +
                        ")"
                      );
                    })
                    .join("), (") +
                  ")"
                );
              })
              .join(", ") +
            ")";
          slValue = "'" + wkx.Geometry.parse(wkxText).toEwkb().toString("hex", 0, maxByte).match(/.{2}/g).join("") + "'";
        }
        break;
      case this.isArrayType():
        //console.log('value of arraytype: %o', pgValue);
        slValue = "'{" + pgValue + "}'";
        break;
      case slType == "INTEGER":
        slValue = pgValue;
        break;
      case this.formField instanceof DateTimeFormField:
        slValue = "'" + this.formField.toISO(pgValue) + "'";
        break;
      case this.formField instanceof DateFormField:
        slValue = "'" + this.formField.toISO(pgValue) + "'";
        break;
      default:
        slValue = "'" + pgValue + "'";
    }
    //kvm.alog("slValue: " + slValue, 5);
    return slValue;
  }

  withLabel() {
    let labelDiv = $('<label for="' + this.formField.settings.name + '">')
      .append(this.formField.settings.alias ? this.formField.settings.alias : this.formField.settings.name)
      .append(this.settings.nullable == 0 ? "*" : "");
    let valueDiv = $('<div class="form-value">');

    if (this.get("form_element_type") == "Geometrie") {
      if (this.layer.settings.geometry_type == "Point") {
        valueDiv.append(
          '<i id="saveGpsPositionButton" class="fa fa-map-marker fa-2x" aria-hidden="true" style="margin-right: 20px; margin-left: 7px; color: rgb(38, 50, 134);"></i>\
        <svg onclick="kvm.msg(\'Die GPS-Genauigkeit beträgt ca. \' + Math.round(kvm.controller.mapper.getGPSAccuracy()) + \' Meter.\')" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="28" height="28" version="1.1">\
          <g id="gps-signal-icon" class="gps-signal-level-0" transform="scale(1 -1) translate(0 -28)">\
            <rect class="bar-1" x="0" y="0" width="4" height="4" />\
            <rect class="bar-2" x="6" y="0" width="4" height="10" />\
            <rect class="bar-3" x="12" y="0" width="4" height="16" />\
            <rect class="bar-4" x="18" y="0" width="4" height="22" />\
            <rect class="bar-5" x="24" y="0" width="4" height="28" />\
          </g>\
        </svg>\
        <i id="goToGpsPositionButton" class="fa fa-pencil fa-2x" aria-hidden="true" style="float: right; margin-right: 20px; margin-left: 7px; color: rgb(38, 50, 134);"></i>\
        <!--input type="text" id="geom_wkt" value=""//-->'
        );
      }
      valueDiv.append('<textarea cols="40" rows="5" id="geom_wkt"></textarea>');
    }

    if (this.get("form_element_type") == "Dokument") {
      if (this.get("privilege") === "1") {
        valueDiv.append(`
          <i
            id="takePictureButton_${this.get("index")}"
            class="fa fa-camera fa-2x"
            style="color: rgb(38, 50, 134); margin: 5px 10px 15px 0px"
          ></i>
          <i
            id="loadPictureFromPhotolibrary_${this.get("index")}"
            class="fa fa-image fa-2x"
            style="color: rgb(38, 50, 134); margin: 0px 0px 14px 9px"
          ></i>
          <i
            id="dropAllPictureButton_${this.get("index")}"
            class="fa fa-trash fa-2x"
            style="color: rgb(238, 50, 50); float: right; display: none;"
          ></i>
        `);
      }
      valueDiv.append(`
          <div
            id="${(<any>this.formField).images_div_id}"
            class="images-div"
          ></div>
      `);
    }

    if (this.formField.settings.tooltip) {
      labelDiv.append('&nbsp;<i class="fa fa-exclamation-circle" style="color: #f57802" onclick="kvm.msg(\'' + this.formField.settings.tooltip + "');\"></i>");
    }

    const formField = <any>this.formField;
    if (this.get("form_element_type") == "SubFormEmbeddedPK" && this.get("privilege") > "0") {
      return $(`<div id="formFieldDiv_${this.get("index")}" class="form-field-rows">`)
        .append(
          $('<div class="form-label">').append(labelDiv).append(`
						<input
							id="new_sub_data_set"
							type="button"
							value="Neu"
							onclick="kvm.newSubFeature({ parentLayerId: '${this.getGlobalLayerId()}', subLayerId: '${this.getGlobalSubLayerId()}', fkAttribute: '${this.getFKAttribute()}'})"
							style="float: right; padding: 2px; margin-right: 5px"
						/>
					`)
        )
        .append(valueDiv.append(formField.element));
    } else {
      return $(`<div id="formFieldDiv_${this.get("index")}" class="form-field-rows" ${this.getArrangementStyle()}>`)
        .append("linkElement" in formField ? formField.linkElement : "")
        .append($('<div class="form-label">').append(labelDiv))
        .append(valueDiv.append(formField.element));
    }
  }

  isEmpty(value): boolean {
    return typeof value == "undefined" || value == null || value == "" || value == 0;
  }
}

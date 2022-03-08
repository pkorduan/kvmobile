import { kvm } from "./app";
import * as wkx from "wkx";
import { BilderFormField } from "./BilderFormField";
import { CheckboxFormField } from "./CheckboxFormField";
import { DataViewField } from "./DataViewField";
import { DateFormField } from "./DateFormField";
import { DateTimeFormField } from "./DateTimeFormField";
import { GeometrieFormField } from "./GeometryFormField";
import { SelectFormField } from "./SelectFormField";
import { TextfeldFormField } from "./TextfeldFormField";
import { TextFormField } from "./TextFormField";
import { UserFormField } from "./UserFormField";
import { UserIDFormField } from "./UserIDFormField";
import { ZahlFormField } from "./ZahlFormField";
export function Attribute(layer, settings = {}): void {
    //console.log('Erzeuge Attributeobjekt with settings %o', settings);
    this.layer = layer;
    this.settings = settings;

    this.get = function (key) {
        return this.settings[key];
    };

    this.set = function (key, value) {
        this.settings[key] = value;
        return this.settings[key];
    };

    this.getViewField = function () {
        return new DataViewField("dataViewDiv", this.settings);
    };

    this.getFormField = function () {
        //console.log('Attribute.getFormField attr: ' + this.get('name') + ' type: ' + this.get('type') + ' form_element_type: ' + this.get('form_element_type'));
        var field = "";

        switch (this.get("form_element_type")) {
            case "Auswahlfeld":
                field = new SelectFormField("featureFormular", this.settings);
                break;
            case "Text":
                if (this.get("type") == "timestamp") {
                    field = new DateTimeFormField("featureFormular", this.settings);
                } else if (this.get("type") == "date") {
                    field = new DateFormField("featureFormular", this.settings);
                } else if (this.get("type").substr(0, 3) == "int") {
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
            default:
                field = new TextFormField("featureFormular", this.settings);
        }

        return field;
    };

    this.getSqliteType = function () {
        var pgType = this.get("type"),
            slType = "";

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
        return slType;
    };

    /*
     * Return true if the Postgres attribute type is an array
     * Postgres Array Types starting with underline
     * Return false elsewise
     */
    this.isArrayType = function () {
        return this.get("type").indexOf("_") == 0;
    };

    /**
     * Function return true if the Attribute shall get a value automatically per Definition
     * Check
     *      // Wenn es ein Auto attribut ist und
     *      // nicht updated_at_server heißt und
     *      // keine options angegeben wurde oder die option zur action passt
     * @param array changes The array of changes made in formular
     * @param string action insert or update used to determine if auto value shall be created pending on option of the attribute
     * @return boolean true if auto else false
     */
    this.isAutoAttribute = function (action) {
        //    kvm.log('Attribute.isAutoAttribute for action ' + action, 4);
        /*
    kvm.log('name ' + this.get('name') + ' ist user_name, updated_at_client oder created_at? ' + (['user_name', 'updated_at_client', 'created_at'].includes(this.get('name'))), 4);
    kvm.log('form_element_type ' + this.get('form_element_type') + ' ist User, UserID oder Time? ' + (['User', 'UserID', 'Time'].includes(this.get('form_element_type'))), 4);
    kvm.log('name ' + this.get('name') + ' ist nicht updated_at_server? ' + (this.get('name') != 'updated_at_server'), 4);
    kvm.log('options ist leer? ' + (this.get('options') == ''), 4);
    kvm.log('action == options? ' + (action == this.get('options').toLowerCase()), 4);
    */
        var answer = (["user_name", "updated_at_client", "created_at"].includes(this.get("name")) || ["User", "UserID", "Time"].includes(this.get("form_element_type"))) && this.get("name") != "updated_at_server" && (action == "" || this.get("options") == "" || action == this.get("options").toLowerCase());
        kvm.log("Attribute " + this.get("name") + " is Autoattribute" + (action ? " for action " + action : "") + "? " + answer, 4);
        return answer;
    };

    this.toSqliteValue = function (pgType, pgValue) {
        kvm.alog("Attribute.toSqliteValue pgType: " + pgType + " pgValue: %o", pgValue, 5);
        var slType = this.getSqliteType(),
            maxByte = 10485760; // 10 MB

        let slValue;
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
                if (this.layer.get("geometry_type") == "Polygon") {
                    slValue =
                        "'" +
                        wkx.Geometry.parse(
                            "SRID=4326;POLYGON((" +
                                pgValue.coordinates[0]
                                    .map(function (p) {
                                        return p.join(" ");
                                    })
                                    .join(", ") +
                                "))"
                        )
                            .toEwkb()
                            .toString("hex", 0, maxByte)
                            .match(/.{2}/g)
                            .join("") +
                        "'";
                }
                break;
            case this.isArrayType():
                //console.log('value of arraytype: %o', pgValue);
                slValue = "'{" + pgValue + "}'";
                break;
            case slType == "INTEGER":
                slValue = pgValue;
                break;
            case pgType == "timestamp":
                slValue = "'" + this.formField.toISO(pgValue) + "'";
                break;
            case pgType == "date":
                slValue = "'" + this.formField.toDate(pgValue) + "'";
            default:
                slValue = "'" + pgValue + "'";
        }
        kvm.alog("slValue: %o", slValue, 5);
        return slValue;
    };

    this.withLabel = function () {
        var label = $('<div class="form-label">')
                .append('<label for="' + this.formField.get("name") + '"/>')
                .append(this.formField.get("alias") ? this.formField.get("alias") : this.formField.get("name")),
            value = $('<div class="form-value">');

        if (this.get("form_element_type") == "Geometrie") {
            if (this.layer.settings.geometry_type == "Point") {
                value.append(
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
            value.append('<textarea cols="40" rows="5" id="geom_wkt"></textarea>');
        }

        if (this.get("form_element_type") == "Dokument") {
            value.append('\
          <i id="takePictureButton_' + this.get("index") + '" class="fa fa-camera fa-2x" style="color: rgb(38, 50, 134)"></i>\
          <i id="dropAllPictureButton_' + this.get("index") + '" class="fa fa-trash fa-2x" style="color: rgb(238, 50, 50); float: right; display: none;"/></i>\
          <div id="' + this.formField.images_div_id + '"></div>\
      ');
        }

        if (this.formField.get("tooltip")) {
            label.append('&nbsp;<i class="fa fa-exclamation-circle" style="color: #f57802" onclick="kvm.msg(\'' + this.formField.get("tooltip") + "');\"></i>");
        }

        return $('<div class="form-field">').append(label).append(value.append(this.formField.element));
    };

    this.formField = this.getFormField();
    this.viewField = this.getViewField();

    return this;
}

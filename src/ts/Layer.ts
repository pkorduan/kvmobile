/// <reference types="cordova-plugin-file-transfer" />
/// <reference types="cordova-plugin-device" />

import {
  Polygon,
  CircleMarker,
  LatLngExpression,
  LatLngTuple,
  LayerGroup,
  Polyline,
} from "leaflet";
import { kvm } from "./app";
import { Attribute } from "./Attribute";
import { Feature } from "./Feature";
import { Stelle } from "./Stelle";
import { Klasse } from "./Klasse";
import { AttributeGroup } from "./AttributeGroup";
import { Icon } from "leaflet";
import * as LayerDBJobs from "./LayerDBJobs";

export type AttributteDelta = {
  key: string;
  oldVal: any;
  newVal: any;
  type: string;
};

export interface LayerSetting {
  name_attribute?: string;
  id_attribute?: string;
  table_alias?: string;
  geometry_attribute?: any;
  attributes?: any;
  classes?: [];
  query?: string;
  drawingorder?: number;
  geometry_type?: any;
  useCustomStyle?: boolean;
  loaded?: boolean;
  classitem?: any;
}

export interface BackgroundLayerSetting {
  layer_id: string;
  label: string;
  online: boolean;
  type: string;
  url: string;
  params: {
    layers: string; // "de_basemapde_web_raster_farbe"
    format: string; // "image/png"
    attribution: string; // "Basemap DE dl-de/by-2-0"}
    minZoom: number;
    maxNativeZoom: number;
    south: number;
    north: number;
    west: number;
    east: number;
  };
}

// export interface Feature {
//     data?: any;
//     editableLayer?: Layer;
//     geom?: any; // Point {srid: 4326, hasZ: false, hasM: false, x: 9.308695298532259, y: 48.84202286797464, …}
//     newGeom: any; //Point {srid: 4326, hasZ: false, hasM: false, x: 9.308695298532259, y: 48.84202286797464, …}
//     globalLayerId?: string; // "1_277"
//     id: string; // "bb3826b3-ecc2-4317-98e5-490fe725870b"
//     isActive: boolean;
//     isEditable: boolean;
//     layerId: number;
//     options: any;
// }

export class Layer {
  stelle: Stelle;
  settings: LayerSetting;
  runningSyncVersion: number = 0;
  attributes: Attribute[] = [];
  attributeGroups: AttributeGroup[] = [];
  layerGroup: LayerGroup<any>;
  attribute_index: { [key: string]: number };
  classes: Klasse[];
  _features: Map<string, Feature>;
  activeFeature: Feature;
  numFeatures: number;
  next: any;
  context: any;
  succMsg: any;
  delta: any;
  changes: any;
  other: string;
  msg: any;
  title: string;
  numReturnedDeltas: number;
  response: any;
  hasSyncPrivilege: boolean;
  hasEditPrivilege: boolean;
  hasDeletePrivilege: boolean;
  hasGeometry: boolean;
  hasDocumentAttribute: boolean = false;
  numExecutedDeltas: number;
  isLoaded: boolean = false;
  isActive: boolean = false;
  specifiedValues: { [key: string]: any } = {};
  parentLayerId: string;
  parentFeatureId: string;

  constructor(stelle: Stelle, settings: LayerSetting | string = {}) {
    // const layer_ = this;
    this.stelle = stelle;
    this.settings =
      typeof settings === "string" ? JSON.parse(settings) : settings;
    this.title = kvm.coalempty(
      this.get("alias"),
      this.get("title"),
      this.get("table_name"),
      "overlay" + this.getGlobalId()
    );
    // console.log("layer", stelle, this.settings);
    // console.log(
    //   "%s: Erzeuge Layerobjekt (id: %s) mit drawingorder: %s in Stelle: %s",
    //   this.title,
    //   this.settings.id,
    //   this.settings.drawingorder,
    //   stelle.get("id")
    // );
    if (!this.settings.name_attribute) {
      this.settings.name_attribute = this.settings.id_attribute;
      //console.log("Set id_attribute: %s as name_attribute", this.settings["id_attribute"]);
    }
    if (!("table_alias" in this.settings)) {
      this.settings.table_alias = "ht";
    }
    if (!("autoSync" in this.settings)) {
      this.settings["autoSync"] = false;
    }

    /*
    // diese 3 Settings werden hier statisch gesetzt für den Fall dass der Server die Attribute noch nicht per mobile_get_layer liefert.
    this.settings['id_attribute'] = 'uuid';
    this.settings['geometry_attribute'] = 'geom';
    this.settings['geometry_type'] = 'Point';
  */
    //-----------------------------------------------

    this.hasSyncPrivilege = this.getSyncPrivilege();
    this.hasEditPrivilege = this.getEditPrivilege();
    this.hasDeletePrivilege = this.getDeletePrivilege();
    this.hasGeometry = this.settings.geometry_attribute ? true : false;
    if (typeof this.get("syncVersion") === "undefined") {
      console.log(
        "Setze syncVersion der LayerSettings auf aktuelle runningSyncVersion des Layers: ",
        this.runningSyncVersion
      );
      this.set("syncVersion", this.runningSyncVersion);
    } else {
      console.log(
        `Setze runningSyncVersion von Layer ${
          this.title
        } auf syncVersion des Layers: ${this.get("syncVersion")}`
      );
      this.runningSyncVersion = this.get("syncVersion");
    }
    this.layerGroup = new LayerGroup([], {
      attribution: this.get("drawingorder"),
    });

    if (this.settings.attributes) {
      this.attributes = $.map(this.settings.attributes, (attribute) => {
        const groupName = attribute.group ? attribute.group.split(";")[0] : "";
        const groupCollapsed = attribute.group
          ? attribute.group.split(";")[1] === "collapsed"
          : false;
        const attributeGroupIndex = this.attributeGroups.findIndex(
          (attributeGroup) => {
            return attributeGroup.name == groupName;
          }
        );

        let attributeGroup: AttributeGroup;
        if (attributeGroupIndex == -1) {
          attributeGroup = new AttributeGroup(groupName, groupCollapsed);
          this.attributeGroups.push(attributeGroup);
          // attributeGroupIndex++;
        } else {
          attributeGroup = this.attributeGroups[attributeGroupIndex];
        }
        const attr = new Attribute(this, attribute);
        attributeGroup.attributeIds.push(attr.get("index"));
        return attr;
      });
      this.attribute_index = this.attributes.reduce((hash, elem) => {
        hash[elem.settings.name] = Object.keys(hash).length;
        return hash;
      }, <{ [key: string]: number }>{});

      this.hasDocumentAttribute = this.attributes.some(
        (a) => a.get("form_element_type") === "Dokument"
      );
      // this.hasDocumentAttribute =
      //     this.attributes.filter((a) => {
      //         return a.get("form_element_type") == "Dokument";
      //     }).length > 0;
    }

    if (this.settings.classes) {
      this.classes = this.settings.classes.map((classSettings) => {
        let klasse = new Klasse(classSettings);
        klasse.layer = this;
        return klasse;
      });
    }

    this._features = new Map();
  }

  get(key: string) {
    return this.settings[key];
  }

  set(key: string, value: any) {
    this.settings[key] = value;
    return this.settings[key];
  }

  getFeature(featureId: string) {
    return this._features.get(featureId);
  }

  /*
   * fügt das Feature zum Layer hinzu, existiert ein Feature mit der gleichen Id wird es ersetzt
   *
   * @param feature
   * @returns
   */
  addFeature(feature: Feature) {
    return this._features.set(feature.getFeatureId(), feature);
  }
  removeFeature(feature: Feature) {
    return this._features.delete(feature.getFeatureId());
  }

  getDokumentAttributeNames() {
    return $.map(this.attributes, function (attr) {
      if (attr.settings.form_element_type === "Dokument") {
        return attr.settings.name;
      }
    });
  }

  isEmpty(): boolean {
    return (
      typeof this.get("syncVersion") == "undefined" ||
      this.get("syncVersion") == null ||
      this.get("syncVersion") == "" ||
      this.get("syncVersion") == 0 ||
      (this.get("syncVersion") != "" && this.numFeatures == 0)
    );
  }

  setEmpty(): void {
    this.set("syncVersion", 0);
    $("#syncVersionSpan_" + this.getGlobalId()).html("0");
    console.log("Function setEmpty: Setze runningSyncVersion auf 0.");
    this.runningSyncVersion = 0;
  }

  autoSyncActive() {
    return $(`#auto_sync_${this.getGlobalId()}`).is(":checked");
  }

  /**
   * Function read VorschauAttributes from feature with featureId
   * create and asign the html elements in vorschauElement
   * The links in Vorschau elements points to kvm.activateFeature (default) or kvm.editFeature of that element
   * @param attribute
   * @param featureId
   * @param vorschauElement
   * @param clickFunction
   */
  readVorschauAttributes(
    attribute: Attribute,
    featureId: string,
    vorschauElement: JQuery<HTMLElement>,
    clickFunction = "activateFeature"
  ) {
    const subLayerId = attribute.getGlobalSubLayerId();
    const fkAttribute: String = attribute.getFKAttribute();
    const vorschauOption: String = attribute.getVorschauOption();
    const subLayer: Layer = kvm.getLayer(subLayerId);
    const filter = [
      `${subLayer.settings.table_alias}.${fkAttribute} = '${featureId}'`,
    ];

    if ($("#historyFilter").is(":checked")) {
      filter.push(`${subLayer.settings.table_alias}.endet IS NOT NULL`);
    } else {
      filter.push(`${subLayer.settings.table_alias}.endet IS NULL`);
    }

    // let sql = `
    // 	SELECT
    // 		*
    // 	FROM
    // 		${subLayer.getSqliteTableName()}
    // 	WHERE
    // 	  ${filter.join(' AND ')}
    // `;

    const sql = this.extentSql(subLayer.settings.query, filter);

    // Das folgende geht noch nicht weil die Tabellen nicht so benannt sind  wie in sqlite
    //let sql = `${this.settings.query} AND ${filter.join(' AND ')}`;
    vorschauElement.empty();
    kvm.db.executeSql(
      sql,
      [],
      (rs) => {
        // console.log("Layer.readVorschauAttributes");
        const numRows = rs.rows.length;

        console.log(numRows + " Vorschaudatensätze gelesen.");
        if (numRows == 0) {
          vorschauElement.html("keine");
        } else {
          // console.log('vorschauOption: ', vorschauOption);
          const keys = Object.keys(rs.rows.item(0));
          const vorschauOptions = vorschauOption.split(" ");
          // let vorschauElements = [];
          let vorschauList = "";
          for (let i = 0; i < numRows; i++) {
            const item = rs.rows.item(i);
            const vorschauElements = vorschauOptions.map((elm) => {
              const value = elm in item ? item[elm] : elm;
              const subLayerAttribute =
                subLayer.attributes[subLayer.attribute_index[elm]];
              if (subLayerAttribute.get("form_element_type") == "Auswahlfeld") {
                const enum_option = subLayerAttribute
                  .get("enums")
                  .find((e) => e.value == value);
                return enum_option ? enum_option.output : "";
              }
              return value;
            });
            // vorschauList = vorschauList + `<li onclick="kvm.${clickFunction}('${subLayerId}', '${item[subLayer.get("id_attribute")]}')" class="pointer">${vorschauElements.join(' ')}<i class="fa fa-arrow-right" aria-hidden="true" style="margin-left: 10px"></i></li>`;
            vorschauList = `${vorschauList} <li onclick="kvm.${clickFunction}('${subLayerId}', '${
              item[subLayer.get("id_attribute")]
            }')" class="pointer">${vorschauElements.join(
              " "
            )}<i class="fa fa-arrow-right" aria-hidden="true" style="margin-left: 10px"></i></li>`;
          }
          vorschauElement.html(
            '<ul class="subFormEmbeddedPKFormField-list">' +
              vorschauList +
              "</ul>"
          );
        }
      },
      (error) => {
        kvm.log(
          `Fehler bei der Abfrage der Vorschauattribute mit sql: ${sql} Fehler: ${error.message}`
        );
      }
    );
  }

  /**
   * - Load data from local db from offset to offset + limit and
   * - create features for layer
   * - clearLayers
   * - drawFeatures
   * - activate if layer is active
   * Will be called when
   * - function writeData success
   * - nach der Synchronisierung in function update, wenn kein Delta vom Server gekommen ist, wenn die sql in den deltas alle leer sind oder in execServerDeltaSuccessFunc wenn Deltas ausgeführt wurden.
   * - nach Änderungen von Einstellungen im Style
   * [
   *  a) !(onLine && syncPrivilege) |
   *  b) [
   * 		onLine && syncPrivilege && editPrivilege > syncData > sendDeltas |
   * 		onLine && syncPrivilege && !editPrivilege > sendDeltas
   * 	] > writeFile > [
   * 										upload |
   * 										upload > execServerDeltaSuccessFunc
   * 									] |
   * 	c) [
   * 		sync-layer-button.onClick |
   * 		updateTable
   * 	] > requestData > writeData
   * ] > readData
   */
  readData(limit: any = 50000, offset: any = 0, order: any = "") {
    kvm.tick(`${this.title}:<br>&nbsp;&nbsp;Lese Daten aus Datenbank.`);
    //  order = (this.get('name_attribute') != '' ? this.get('name_attribute') : this.get('id_attribute'));

    // var filter = [],
    //     order = $('#anzeigeSortSelect').val(),
    //     sql = '';

    let filter = [];
    // let sql: string;

    this.activeFeature = null;

    if (this.isActive) {
      order = $("#anzeigeSortSelect").val();

      filter = $(".filter-view-field")
        .filter(function (i, field) {
          const value = $(field).find(".filter-view-value-field").val();
          return value !== undefined && value != "";
        })
        .map((i, field) => {
          const bracket = kvm.bracketForType($(field).attr("database_type"));
          return (
            `${this.settings.table_alias}.${$(field).attr("name")}` +
            " " +
            $(field).find(".filter-view-operator select").val() +
            " " +
            bracket +
            $(field).find(".filter-view-value-field").val() +
            bracket
          );
        })
        .get();
    }
    /*
    if ($("#statusFilterSelect").val() != "") {
      filter.push($("#statusFilterSelect").val());
    }
*/
    if ($("#historyFilter").is(":checked")) {
      filter.push(`${this.settings.table_alias}.endet IS NOT NULL`);
    } else {
      filter.push(`${this.settings.table_alias}.endet IS NULL`);
    }

    // sql = `
    //   SELECT
    //     ${this.getSelectExpressions().join(", ")}
    //   FROM
    //     ${this.getSqliteTableName()}
    //   ${(filter.length > 0 ? "WHERE " + filter.join(" AND ") : "")}
    //   ${(order != "" ? "ORDER BY " + order + "" : "")}
    //   ${(limit == 0 && offset == 0 ? "" : "LIMIT " + limit + " OFFSET " + offset)}
    // `;
    this.stelle.tableNames.forEach((table) => {
      this.settings.query = this.settings.query.replace(
        table,
        table.replace(".", "_")
      );
    });

    const sql = this.extentSql(
      this.settings.query,
      filter,
      order,
      limit,
      offset
    );

    // console.log(`Lese Daten mit ${sql} aus der Datenbank`);
    kvm.db.executeSql(
      sql,
      [],
      (rs) => {
        //console.log("Layer.readData result: " + JSON.stringify(rs));
        const numRows = rs.rows.length;

        //console.log("  readData) " + numRows + " Datensätze gelesen, erzeuge Featureliste neu...");
        this.numFeatures = numRows;

        this._features = new Map();
        //console.log("id_attribute: %o", this.get("id_attribute"));
        if (numRows == 0) {
          if (filter.length > 0) {
            console.log("filter %o", filter);
            kvm.msg(
              "Keine Daten gefunden. Filter anpassen um Daten anzuzeigen.",
              "Datenfilter"
            );
          } else {
            kvm.msg(
              "Tabelle ist leer. Unter Einstellungen des Layers können Daten synchronisiert werden.",
              "Datenbank"
            );
          }
        }

        console.log(
          "Layer %s: Create %s features for layer",
          this.title,
          numRows
        );
        for (let i = 0; i < numRows; i++) {
          const item = rs.rows.item(i);
          try {
            // console.log("Item " + i + ": %o", item);
            // console.log("Erzeuge Feature %s: ", i);
            // console.log("Erzeuge Feature von item %o", item);

            // TODO !!!!
            this.addFeature(new Feature(item, this, false));
            //console.log('Feature ' + i + ': %o', this.features.get(item[this.get('id_attribute')]));
          } catch (e) {
            console.error(e);
            kvm.msg(
              "Fehler beim Erzeugen des Feature mit id: " +
                item[this.get("id_attribute")] +
                "! Fehlertyp: " +
                e.name +
                " Fehlermeldung: " +
                e.message
            );
          }
        }
        kvm.tick(
          `${this.title}:<br>&nbsp;&nbsp;${this._features.size} Features erzeugt.`
        );

        //console.log("Check if syncLayerIcon exists");
        if (
          $("#syncLayerIcon_" + this.getGlobalId()) &&
          $("#syncLayerIcon_" + this.getGlobalId()).hasClass("fa-spinner")
        ) {
          $("#syncLayerIcon_" + this.getGlobalId()).toggleClass(
            "fa-refresh fa-spinner fa-spin"
          );
        }
        //console.log("Set connectionstatus in Layer: " + this.getGlobalId());
        kvm.setConnectionStatus();

        if (this.hasGeometry) {
          // draw the features in map
          if (this.layerGroup) {
            try {
              console.log("clearLayers of layerGroup");
              this.layerGroup.clearLayers();
            } catch ({ name, message }) {
              kvm.msg(
                "Fehler beim Leeren der Layergruppe im Layer id: " +
                  this.getGlobalId() +
                  "! Fehlertyp: " +
                  name +
                  " Fehlermeldung: " +
                  message
              );
            }
          }
          console.log("%s: readData) > drawFeatures", this.title);
          this.drawFeatures();
          console.log("drawFeature beendet in Layer id: " + this.getGlobalId());
        }

        try {
          console.log("finishLayerReading of Layer id: " + this.getGlobalId());
          kvm.activeStelle.finishLayerReading(this);
        } catch ({ name, message }) {
          kvm.msg(
            "Fehler beim Beenden des Ladens des Layers id: " +
              this.getGlobalId() +
              "! Fehlertyp: " +
              name +
              " Fehlermeldung: " +
              message
          );
        }
      },
      (error) => {
        const msg = `Fehler bei der Abfrage der Daten aus lokaler Datenbank mit sql: ${sql} Fehler: ${error.message}`;
        kvm.log(msg);
        kvm.closeSperrDiv(msg);
      }
    );
  }

  /**
   * create the list of features in list view at once
   */
  createFeatureList() {
    kvm.tick(`${this.title}:<br>&nbsp;&nbsp;Erzeuge Featureliste.`);
    //console.log("createFeatureList for layer %s", this.get("title"));
    //kvm.log("Erzeuge die Liste der Datensätze neu.");
    $("#featurelistHeading").html(
      this.get("alias") ? this.get("alias") : this.get("title")
    );
    $("#featurelistBody").html("");
    let html = "";

    this._features.forEach((feature) => {
      //console.log("append feature: %o to list", feature);
      const needle = $("#searchFeatureField").val().toString().toLowerCase();
      const element = $(feature.listElement());
      const haystack = element.html().toLowerCase();

      html = html + feature.listElement();
      //console.log("Feature " + feature.layer.settings.id_attribute + ": " + feature.id + " zur Liste hinzugefügt.");
      //console.log(html);
    });
    $("#featurelistBody").append(html);
    kvm.bindFeatureItemClickEvents();
    if (this._features.size > 0) {
      //      kvm.showItem("featurelist");
      $("#numDatasetsText_" + this.getGlobalId()).html(
        `${this._features.size}`
      );
    }
    //console.log("createFeatureList abgeschlossen. in Layer id: " + this.getGlobalId());
  }

  /**
   * Function write layer data to the database
   * saveToStore > readData
   * Will be called in requestData
   * @param items
   */
  writeData(items) {
    console.log(
      "Layer %s: Schreibe %s Datensätze in die lokale Datebank.",
      this.title,
      items.length
    );
    kvm.tick("Schreibe Layerdaten in Datenbank.");
    const keys = this.getTableColumns().join(", ");
    const values =
      "(" +
      $.map(items, (item) => {
        //console.log('item.geometry %', item.geometry);
        //					if (item.geometry) {
        return $.map(
          this.attributes.filter((attr) => {
            return (
              (attr.layer.hasEditPrivilege && attr.get("saveable") == "1") ||
              !attr.layer.hasEditPrivilege
            );
          }),
          (attr) => {
            const type = attr.get("type");
            const value =
              type == "geometry"
                ? item.geometry
                : item.properties[attr.get("name")];
            //console.log('type: %s value: %s', type, value);
            const v = attr.toSqliteValue(type, value);
            return v;
          }
        ).join(", ");
        //					}
      }).join("), (") +
      ")";

    const sql = `
      INSERT INTO ${this.getSqliteTableName()} (${keys})
      VALUES ${values}
		`;

    //console.log("Schreibe Daten mit Sql: " + sql.substring(0, 1000));
    kvm.db.executeSql(
      sql,
      [],
      (rs) => {
        kvm.tick(
          `${this.title}:<br>&nbsp;&nbsp;Daten erfolgreich in Datenbank geschrieben.`
        );
        this.isLoaded = true; // Layer successfully loaded. All other requestData calls will only sync
        if (parseInt(this.get("sync"))) {
          console.log(
            "Setze layerSettings syncVersion auf Layer.runningSyncVersion: ",
            this.runningSyncVersion
          );
          this.set("syncVersion", this.runningSyncVersion);
          $("#syncVersionSpan_" + this.getGlobalId()).html(
            this.runningSyncVersion.toString()
          );
          this.set("syncLastLocalTimestamp", Date());
        }
        this.saveToStore();
        console.log("Layer %s: readData in folge von writeData.", this.title);
        if (this.stelle.loadAllLayers) {
          // finishLayerLoading read data only after last layer is loaded.
          this.stelle.finishLayerLoading(this);
        } else {
          this.readData();
        }
      },
      (error) => {
        this.set("syncVersion", 0);
        $("#syncVersionSpan_" + this.getGlobalId()).html("0");
        kvm.log("Fehler beim Zugriff auf die Datenbank: " + error.message, 1);
        alert("Fehler beim Zugriff auf die Datenbank: " + error.message);
      }
    );
  }

  createTables() {
    //kvm.log("Layer.createTables", 3);
    const layerIds = JSON.parse(
      kvm.store.getItem("layerIds_" + this.stelle.get("id"))
    );

    for (let i = 0; i < layerIds.length; i++) {
      this.set("id", layerIds[i]);
      this.settings = JSON.parse(
        kvm.store.getItem("layerSettings_" + this.getGlobalId())
      );
      this.attributes = $.map(this.settings.attributes, (attribute) => {
        return new Attribute(this, attribute);
      });
      this.createTable();
    }
  }

  /**
   * Create the table for layer data and the deltas
   */
  createTable() {
    const sql = this.getCreateTableSql();
    const layer = this;
    try {
      // let j: SQLitePlugin.TransactionStatementErrorCallback;
      kvm.db.transaction(
        (tx) => {
          kvm.log("Erzeuge Tabelle mit sql: " + sql, 3);
          //create table
          tx.executeSql(
            sql,
            [],
            (tx, res) => {
              kvm.log(
                "Tabelle " +
                  layer.getSqliteTableName() +
                  " erfolgreich angelegt.",
                3
              );
              if (layer.hasEditPrivilege) {
                const tableName = layer.getSqliteTableName() + "_deltas",
                  tableColumnDefinitions = [
                    "version INTEGER PRIMARY KEY",
                    "type text",
                    "change text",
                    "delta text",
                    "created_at text",
                  ],
                  sql =
                    "CREATE TABLE IF NOT EXISTS " +
                    tableName +
                    " (" +
                    tableColumnDefinitions.join(", ") +
                    ")";
                //kvm.log("Erzeuge Delta-Tabelle mit sql: " + sql, 3);

                tx.executeSql(
                  sql,
                  [],
                  (tx, res) => {
                    kvm.log(
                      `Deltas Tabelle für Layer ${layer.title} erfolgreich angelegt.`,
                      3
                    );
                  },
                  (tx, error) => {
                    const tableName = layer.getSqliteTableName();
                    console.log("Exception in createTable: %o", error);
                    kvm.msg(
                      "Fehler beim Anlegen der Tabelle: " +
                        tableName +
                        " " +
                        error.message
                    );
                  }
                );
              }
            },
            (tx, error) => {
              const tableName = layer.getSqliteTableName();
              kvm.msg(
                "Fehler beim Anlegen der Tabelle: " +
                  tableName +
                  " " +
                  error.message
              );
            }
          );
        },
        (error) => {
          kvm.log(
            "Fehler beim Anlegen der Tabellen für den Layer: " +
              layer.get("title") +
              " " +
              error.message,
            1
          );
          kvm.msg(
            "Fehler beim Anlegen der Tabellen für den Layer: " +
              layer.get("title") +
              " " +
              error.message
          );
        }
      );
    } catch ({ name, message }) {
      console.error(
        `Fehler in Funktion createTable: ${name} Message: ${message}`
      );
      kvm.msg(
        `Fehler beim Anlegen der Tabelle mit sql: ${sql} Fehler: ${name} Message: ${message}`,
        "Datenbank"
      );
    }
  }

  /**
   * Drop the table of layer data and the table for its deltas
   */
  dropDataTable() {
    const tableName = this.getSqliteTableName();
    const sql = "DROP TABLE IF EXISTS " + tableName;

    kvm.log("Lösche Tabelle mit sql: " + sql, 3);
    kvm.db.executeSql(
      sql,
      [],
      (rs) => {
        kvm.log("Tabelle " + tableName + " gelöscht.", 3);
      },
      function (error) {
        kvm.msg(
          "Fehler beim Löschen der Tabelle: " + tableName + " " + error.message
        );
      }
    );
  }

  /**
   * Drop the layers delta table
   */
  dropDeltasTable() {
    const tableName = this.getSqliteTableName() + "_deltas";
    const sql = "DROP TABLE IF EXISTS " + tableName;

    kvm.log("Lösche Deltas Tabelle mit sql: " + sql, 3);
    kvm.db.executeSql(
      sql,
      [],
      (rs) => {
        kvm.log("Deltatabelle " + tableName + " gelöscht.", 3);
      },
      function (error) {
        kvm.msg(
          "Fehler beim Löschen der Deltatabelle: " +
            tableName +
            " " +
            error.message
        );
      }
    );
  }

  updateTable() {
    //console.log('updateTable');
    kvm.db.transaction(
      (tx) => {
        const tableName = this.getSqliteTableName();
        const sql = "DROP TABLE IF EXISTS " + tableName;

        kvm.tick("Lösche Tabelle " + tableName);
        //console.log("Lösche Tabelle " + tableName);
        tx.executeSql(
          sql,
          [],
          (tx, res) => {
            kvm.tick(
              "Tabelle " + this.getSqliteTableName() + " erfolgreich gelöscht."
            );
            const sql = this.getCreateTableSql();
            kvm.log("Erzeuge neue Tabelle mit sql: " + sql, 3);
            kvm.tick("Erzeuge neue Tabelle " + this.getSqliteTableName());
            tx.executeSql(
              sql,
              [],
              (tx, res) => {
                kvm.tick("Tabelle erfolgreich angelegt.");
                // update layer name in layerlist for this layer
                this.appendToApp();
                //this.activate();
                kvm.activeStelle.sortOverlays();
                this.saveToStore();
                kvm.setConnectionStatus();
                this.requestData();
              },
              (tx, error) => {
                const tableName = this.getSqliteTableName();
                kvm.msg(
                  "Fehler beim Anlegen der Tabelle: " +
                    tableName +
                    " " +
                    error.message
                );
              }
            );
          },
          (tx, error) => {
            const tableName = this.getSqliteTableName();
            kvm.msg(
              "Fehler beim Löschen der Tabelle: " +
                tableName +
                " " +
                error.message
            );
          }
        );
      },
      (error) => {
        kvm.log(
          "Fehler beim Update der Tabellen für den Layer: " +
            this.get("title") +
            " " +
            error.message,
          1
        );
        kvm.msg(
          "Fehler beim Update der Tabellen für den Layer: " +
            this.get("title") +
            " " +
            error.message
        );
      }
    );
  }

  /**
   * Function returns an array with column expressions
   * for create table statement but only for saveable attributes
   */
  getTableColumnDefinitions() {
    const tableColumnDefinitions = $.map(
      this.attributes.filter(function (attr) {
        return (
          (attr.layer.hasEditPrivilege && attr.get("saveable") == "1") ||
          !attr.layer.hasEditPrivilege
        );
      }),
      function (attr) {
        const excludeDefaultWords = [
          "gdi_conditional_val",
          "gdi_conditional_nextval",
          "gdi_current_date",
          "nextval",
        ];
        const excludeWordExists = excludeDefaultWords.some((word) =>
          attr.get("default").includes(word)
        );
        return (
          attr.get("name") +
          " " +
          attr.getSqliteType() +
          (attr.get("nullable") === "0" ? " NOT NULL" : "") +
          (attr.get("default") && !excludeWordExists
            ? " DEFAULT " +
              JSON.stringify(attr.get("default")).replace(/"/g, "'")
            : "")
        );
      }
    );
    return tableColumnDefinitions;
  }

  getTableColumns() {
    //kvm.log("getTableColumns", 4);
    // console.log("getTableC");
    // const tableColumns = $.map(
    //     this.attributes.filter(function (attr) {
    //         return (attr.layer.hasEditPrivilege && attr.get("saveable") == "1") || !attr.layer.hasEditPrivilege;
    //     }),
    //     function (attr) {
    //         return attr.settings.name;
    //     }
    // );

    const tableColumns = this.attributes
      .filter((attr) => {
        return (
          (attr.layer.hasEditPrivilege && attr.get("saveable") == "1") ||
          !attr.layer.hasEditPrivilege
        );
      })
      .map((attr) => attr.settings.name);

    //console.log('Return tableColumns: %o', tableColumns);
    return tableColumns;
  }

  getColumnValues() {
    kvm.alog("getColumnValues", "", 4);
    const values = $.map(
      this.attributes.filter(function (attr) {
        return attr.get("saveable") == "1";
      }),
      function (attr) {
        const type = attr.get("type"),
          // TODO BugXX
          value = (<any>this).activeFeature.getDataValue(attr.get("name"));

        const v = attr.toSqliteValue(type, value);
        return v;
      }
    );
    kvm.alog("values: %o", values, 4);
    return values;
  }

  /**
   * Erzeugt und liefert das SQL zum Anlegen der Datentabelle
   */
  getCreateTableSql() {
    //kvm.log("getCreateTableSql", 4);
    const tableName = this.getSqliteTableName();
    const tableColumnDefinitions = this.getTableColumnDefinitions();
    const sql =
      "CREATE TABLE IF NOT EXISTS " +
      tableName +
      " (" +
      tableColumnDefinitions.join(", ") +
      ", endet TEXT)";

    return sql;
  }

  /**
   * Function returns an array with column expressions for select statement
   * use attribute name, if difference from real_name use it in stead
   */
  getSelectExpressions() {
    const selectExpressions = $.map(this.attributes, function (attr) {
      return attr.get("name") != attr.get("real_name")
        ? attr.get("real_name") + " AS " + attr.get("name")
        : attr.get("name");
    });
    return selectExpressions;
  }

  /**
   * Function request layer data from server
   * writeData >
   * Will be called when
   * - updateTable has success
   * - layer sync has been started registered in bindLayerEvents for .sync-layer-button
   */
  requestData() {
    console.log("Layer %s: requestData", this.title);
    // ToDo Ab hier in einem Fenster den Fortschritt des Ladevorganges anzeigen.
    //kvm.log("Frage Daten vom Server ab.<br>Das kann je nach Datenmenge und<br>Internetverbindung einige Minuten dauern.");
    const fileTransfer = new FileTransfer();
    const filename = "data_layer_" + this.getGlobalId() + ".json";

    const url = this.isLoaded ? this.getSyncUrl() : this.getDataUrl();

    kvm.tick(
      `${this.title}:<br>&nbsp;&nbsp;Frage Layerdaten ab mit URL: ${url}`
    );
    //    this.activate();
    fileTransfer.download(
      url,
      cordova.file.dataDirectory + filename,
      (fileEntry) => {
        fileEntry.file(
          (file) => {
            const reader = new FileReader();

            reader.onloadend = (evt) => {
              console.log(
                "Layer %s: Download der Daten ist abgeschlossen.",
                this.title
              );
              kvm.tick(
                `${this.title}:<br>&nbsp;&nbsp;Layerdaten erfolgreich runtergeladen.`
              );
              let collection: any;

              console.log(
                "Download Ergebnis (Head 1000): %s",
                evt.target.result.toString().substring(0, 1000)
              );
              try {
                collection = JSON.parse(<string>evt.target.result);
              } catch (error) {
                const err_msg = "Fehler beim Runterladen der Layerdaten.";
                console.error(
                  "%s Fehler: %o Response: %o",
                  error,
                  err_msg,
                  evt.target.result
                );
                kvm.log(err_msg + " error: " + JSON.stringify(error));
                kvm.msg(
                  err_msg +
                    "Kann Antwort vom Server nicht parsen: " +
                    JSON.stringify(evt.target.result) +
                    " Wenden Sie sich an den Admin des Servers."
                );
                return false;
              }
              if (
                ("success" in collection && !collection.success) ||
                ("type" in collection && collection.type != "FeatureCollection")
              ) {
                kvm.msg(
                  collection.msg,
                  `Fehler beim Laden des Layers ${this.title} vom Server.`
                );
                return 0;
              }
              console.log(
                "Layer %s: Anzahl empfangene Datensätze: %s",
                this.title,
                collection.features.length
              );
              console.log(
                "Layer " +
                  this.get("title") +
                  ": Version in Response: " +
                  collection.lastDeltaVersion
              );
              kvm.tick(
                `${this.title}:<br>&nbsp;&nbsp;Empfangene Datensätze ${collection.features.length}`
              );
              if ("lastDeltaVersion" in collection) {
                console.log(
                  "Setze runningSyncVersion auf collection.lastDeltaVersion: ",
                  collection.lastDeltaVersion
                );
                this.runningSyncVersion = collection.lastDeltaVersion;
              }
              console.log(
                "Layer " +
                  this.get("title") +
                  ": Version der Daten (runningSyncVersion): " +
                  this.runningSyncVersion
              );
              if (collection.features.length > 0) {
                this.writeData(collection.features);
              } else {
                kvm.msg(
                  "Für Layer '" +
                    this.title +
                    "' sind keine Daten zum Download vorhanden. Änderungen können später synchronisiert werden.",
                  "Hinweis"
                );
                console.log(
                  "requestData: Setze LayerSettings syncVersion auf Layer.runningSyncVerison: ",
                  this.runningSyncVersion
                );
                this.set("syncVersion", this.runningSyncVersion);
                $("#syncVersionSpan_" + this.getGlobalId()).html(
                  this.runningSyncVersion.toString()
                );
                this.set("syncLastLocalTimestamp", Date());
                if (
                  $("#syncLayerIcon_" + this.getGlobalId()).hasClass(
                    "fa-spinner"
                  )
                ) {
                  $("#syncLayerIcon_" + this.getGlobalId()).toggleClass(
                    "fa-refresh fa-spinner fa-spin"
                  );
                }
                this.refresh();
                // TODO: Prüfen ob hier SperrDiv geschlossen werden muss
                //kvm.closeSperrDiv(this.title + ': Abfrage der Daten beendet.');
              }
            };

            reader.readAsText(file);
          },
          function (error) {
            alert(
              "Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für die Synchronisation verwendet werden."
            );
            const msg = "Fehler beim lesen der Datei: " + error.code;
            kvm.log(msg, 1);
            kvm.closeSperrDiv(msg);
          }
        );
      },
      this.downloadError,
      true
    );
  }

  /**
   * Write deltas to local file, request deltas from server, update local, readData and
   * activate if it`s active
   * @param deltas
   * function chain: writeFile  > upload > for each feature execServerDeltaSuccessFunc
   * > saveToStore, clearDeltas, readData
   */
  sendDeltas(deltas: { rows: { version: string; sql: string }[] }) {
    if (deltas.rows.length > 0) {
      kvm.tick(`${this.title}:<br>&nbsp;&nbsp;Sende Änderungen zum Server.`);
    } else {
      kvm.tick(`${this.title}:<br>&nbsp;&nbsp;Frage Änderungen vom Server ab.`);
    }

    const deltas_ = deltas;

    window.requestFileSystem(
      window.TEMPORARY,
      5 * 1024 * 1024,
      (fs) => {
        console.log(this.title + ": file system open: " + fs.name);
        const fileName = "delta_layer_" + this.getGlobalId() + ".json";
        const dirEntry = fs.root;

        console.log(`fileName: ${fileName}`);
        console.log(`DirEntry: ${JSON.stringify(dirEntry)}`);

        dirEntry.getFile(
          fileName,
          { create: true, exclusive: false },
          (fileEntry) => {
            // Write something to the file before uploading it.
            console.log(
              `fileEntry for writing deltas: ${JSON.stringify(fileEntry)}`
            );
            this.writeFile(<any>fileEntry, deltas_);
          },
          (err) => {
            const msg =
              "Fehler beim Erzeugen der Delta-Datei, die geschickt werden soll.";
            kvm.msg(msg, "Upload Änderungen");
            if (
              $("#syncLayerIcon_" + this.getGlobalId()).hasClass("fa-spinner")
            ) {
              $("#syncLayerIcon_" + this.getGlobalId()).toggleClass(
                "fa-refresh fa-spinner fa-spin"
              );
              kvm.closeSperrDiv(msg);
            }
          }
        );
      },
      (err) => {
        kvm.log("Fehler beim öffnen des Filesystems", 1);
      }
    );
  }

  writeFile(
    fileEntry: FileEntry,
    deltas: { rows: { version: string; sql: string }[] }
  ) {
    console.log(
      `${this.title}: writeFile with deltas: ${JSON.stringify(deltas)}`
    );
    if (deltas.rows.length > 0) {
      kvm.writeLog(
        `Syncronisiere Layer ${
          this.title
        } mit folgendem Delta: ${JSON.stringify(deltas)}`
      );
    }
    // Create a FileWriter object for our FileEntry (log.txt).
    fileEntry.createWriter((fileWriter) => {
      fileWriter.onwriteend = () => {
        //console.log(this.title + ": Datei erfolgreich geschrieben.");
        this.upload(fileEntry);
      };

      fileWriter.onerror = (e) => {
        const msg = `${
          this.title
        } Fehler beim Schreiben der Datei: ${JSON.stringify(e)}`;
        kvm.msg(msg, "Synchronisation");
        console.log(msg);
        kvm.writeLog(msg);
        kvm.closeSperrDiv(msg);
      };
      let dataObj;
      if (!deltas) {
        dataObj = new Blob(["kein deltas Array vorhanden"], {
          type: "text/plain",
        });
      } else {
        dataObj = new Blob([JSON.stringify(deltas)], {
          type: "application/json",
        });
      }
      (<any>fileWriter).localURL = fileEntry.nativeURL;
      fileWriter.write(dataObj);
    });
  }

  upload(fileEntry: FileEntry) {
    console.log(this.title + ": upload deltas file");
    const fileURL = fileEntry.toURL();
    console.log(`upload fileURL: ${fileURL}`);
    const successFct = (r: FileUploadResult) => {
      console.log(
        this.title + ": Erfolgreich hochgeladen ResponseCode: %o Response: %o",
        r.responseCode,
        r.response
      );
      const response = JSON.parse(r.response);

      if (response.success) {
        kvm.writeLog(
          `Synchronisierung des Layer ${this.get("title")} erfolgreich.`
        );
        console.log(this.get("title") + ": Response: %o", response);
        this.numExecutedDeltas = 0;
        this.numReturnedDeltas = response.deltas.length;

        console.log(
          this.get("title") + ": numReturendDeltas: %s",
          this.numReturnedDeltas
        );

        if (this.numReturnedDeltas > 0) {
          kvm.writeLog(
            `${this.numReturnedDeltas} Änderungen auf dem Server gefunden.`
          );
          kvm.backupDatabase();
          if (
            response.deltas.every((value) => {
              return kvm.coalesce(value.sql, "") == "";
            })
          ) {
            this.readData($("#limit").val(), $("#offset").val());
          } else {
            response.deltas.forEach((value) => {
              if (kvm.coalesce(value.sql, "") != "") {
                this.execSql(
                  this.pointToUnderlineName(
                    value.sql,
                    this.get("schema_name"),
                    this.get("table_name")
                  ),
                  this.execServerDeltaSuccessFunc.bind({
                    context: this,
                    response: response,
                    numReturnedDeltas: this.numReturnedDeltas,
                  })
                );
              }
            });
          }
        } else {
          if (response.syncData.length > 0) {
            console.log(
              "upload: Setze LayerSettings syncVersion auf Wert in push_to_version aus den Response"
            );
            this.set(
              "syncVersion",
              parseInt(
                response.syncData[response.syncData.length - 1].push_to_version
              )
            );
            this.runningSyncVersion = this.get("syncVersion");
            this.saveToStore();
            //kvm.msg("Keine Änderungen vom Server bekommen! Die aktuelle Version ist: " + this.get("syncVersion"), this.get('title'));
            this.clearDeltas("sql");
          }
          this.readData($("#limit").val(), $("#offset").val());
        }
      } else {
        if ($("#syncLayerIcon_" + this.getGlobalId()).hasClass("fa-spinner")) {
          $("#syncLayerIcon_" + this.getGlobalId()).toggleClass(
            "fa-refresh fa-spinner fa-spin"
          );
        }
        kvm.closeSperrDiv(
          `Sync-Fehler Layer ${this.title}:<br>&nbsp;&nbsp;${response.err_msg}`
        );
      }
    };

    const failFct = (error: FileTransferError) => {
      const msg =
        "Fehler beim Hochladen der Sync-Datei! Prüfe die Netzverbindung! Fehler Nr: " +
        error.code;
      console.error("Fehler: %o", error);
      if ($("#syncLayerIcon_" + this.getGlobalId()).hasClass("fa-spinner")) {
        $("#syncLayerIcon_" + this.getGlobalId()).toggleClass(
          "fa-refresh fa-spinner fa-spin"
        );
      }
      kvm.closeSperrDiv("Upload mit Fehler beendet. " + msg);
    };

    const layer = this,
      stelle = layer.stelle,
      url = stelle.get("url"),
      file = stelle.getUrlFile(url),
      server = url + file;

    const params = {
      device_id: device.uuid,
      Stelle_ID: stelle.get("Stelle_ID"),
      login_name: stelle.get("login_name"),
      passwort: stelle.get("passwort"),
      selected_layer_id: layer.get("id"),
      table_name: layer.get("table_name"),
      client_time: new Date().toISOString(),
      last_client_version: layer.get("syncVersion"),
      go: "mobile_sync",
    };

    const options: FileUploadOptions = {
      params: params,
      fileKey: "client_deltas",
      fileName: fileURL.substr(fileURL.lastIndexOf("/") + 1),
      mimeType: "application/json",
    };
    const ft = new FileTransfer();
    console.log(
      this.title + ": Upload to server: %s with options: %s",
      server,
      JSON.stringify(options).replace(params.passwort, "secret")
    );
    ft.upload(fileURL, encodeURI(server), successFct, failFct, options);
  }

  /*
   * Sync images
   * ToDos
   * -- Uploader, der in regelmäßigen Abständen schaut ob es neue Bilder hochzuladen und ob es welche zu löschen gibt.
   * -- Wenn es welche zum hochladen gibt, versucht er die Bilder der Reihe nach hochzuladen.
   *    - Wenn es geklappt hat, aus der Liste der hochzuladenen Bilder löschen
   * -- Wenn es welche zu löschen gibt, versucht er die Info an den Server zu schicken.
   *    - Wenn der Server gemeldet hat, dass er das Bild erfolgreich gelöscht hat, aus der Liste der zu löschenden Bilder entfernen.
   * -- Registrieren wenn alle Bilder synchronisiert wurden, dann sperr_div aus und Erfolgsmeldung.
   * Anforderung von Dirk
   * Metainfos zu einem Bild speichern. Da könnte auch die Info ran ob Bild schon geuploaded oder zu löschen ist. Wenn upload
   * geklappt hat, könnte Status von to_upload zu uploaded geändert werden und wenn löschen auf dem Server geklappt hat,
   * kann das Bild auch in der Liste der Bilder und somit auch deren Metadaten gelöscht werden.
   *
   */
  syncImages() {
    //kvm.log("Layer.syncImages", 4);
    kvm.tick(
      `${this.title}:<br>&nbsp;&nbsp; Starte Synchronisation der Bilder mit dem Server.`
    );
    const sql = `
      SELECT
        *
      FROM
      	${this.getSqliteTableName()}_deltas
      WHERE
        type = 'img'
    `;
    //kvm.log("Frage Deltas ab mit sql: " + sql, 3);
    kvm.db.executeSql(
      sql,
      [],
      (rs) => {
        //kvm.log("Abfrage erfolgreich. Result:" + JSON.stringify(rs), 4);
        const numRows = rs.rows.length;

        if (numRows > 0) {
          //kvm.log(numRows + " deltas gefunden.", 3);
          for (let i = 0; i < numRows; i++) {
            if (rs.rows.item(i).change == "insert") {
              //kvm.log('Sende Bild zum Server mit SQL: ' + rs.rows.item(i).delta, 3);
              this.sendNewImage(rs.rows.item(i).delta);
            }
            if (rs.rows.item(i).change == "delete") {
              //kvm.log('Lösche Bild auf dem Server mit SQL: ' + rs.rows.item(i).delta, 3);
              this.sendDropImage(rs.rows.item(i).delta);
            }
          }
        } else {
          // kvm.msg("Keine neuen Bilder zum Hochladen vorhanden.");
          const icon = $("#syncImagesIcon_" + this.getGlobalId());
          if (icon.hasClass("fa-spinner")) {
            icon.toggleClass("fa-upload fa-spinner fa-spin");
          }
          kvm.closeSperrDiv(
            "Keine neuen Bilder auf dem Gerät zur Synchronisation vorhanden."
          );
        }
      },
      (error) => {
        kvm.log(
          "Layer.syncData query deltas Fehler: " + JSON.stringify(error),
          1
        );
        kvm.msg("Fehler beim Zugriff auf die Datenbank");
        const icon = $("#syncImagesIcon_" + this.getGlobalId());
        if (icon.hasClass("fa-spinner")) {
          icon.toggleClass("fa-upload fa-spinner fa-spin");
        }
        kvm.closeSperrDiv("Synchronisation der Bilder mit Fehler beendet.");
      }
    );
  }

  sendNewImage(img) {
    //kvm.log("Layer.sendNewImage", 4);
    kvm.log("Bild " + img + " wird hochgeladen.", 3);
    const icon = $("#syncImagesIcon_" + this.getGlobalId());
    const ft = new FileTransfer();
    const fileURL =
      "file://" +
      kvm.config.localImgPath +
      img.substring(img.lastIndexOf("/") + 1);
    const url = this.stelle.get("url");
    const file = this.stelle.getUrlFile(url);
    const server = url + file;
    const win = function (r: FileUploadResult) {
      try {
        const response = JSON.parse(r.response);
        if (response.success) {
          kvm.log(
            "Bild " + this.img + " wurde erfolgreich auf den Server geladen."
          );
          //kvm.log("Code = " + r.responseCode, 4);
          //kvm.log("Response = " + r.response, 4);
          //kvm.log("Sent = " + r.bytesSent, 4);
          this.layer.clearDeltas("img", this.img);
        } else {
          const err_msg =
            "Fehler beim Hochladen des Bildes " +
            this.img +
            " Fehler: " +
            response.msg;
          kvm.closeSperrDiv(err_msg);
        }
      } catch (error) {
        const err_msg = "Fehler beim Hochladen der Bilddatei.";
        console.error("%s Fehler: %o Response: %o", err_msg, error, r);
        kvm.log(err_msg + " error: " + JSON.stringify(error));
        kvm.closeSperrDiv(
          err_msg +
            " Kann Antwort vom Server nicht parsen: " +
            JSON.stringify(r)
        );
      }
    }.bind({
      layer: this,
      img: img,
    });
    const fail = function (error: FileTransferError) {
      console.error("err: %o", error);
      if (this.hasClass("fa-spinner")) {
        this.toggleClass("fa-upload fa-spinner fa-spin");
      }
      const msg =
        "Fehler beim Hochladen der Datei: " +
        error.code +
        " source: " +
        error.code;
      kvm.closeSperrDiv(msg);
    }.bind(icon);

    const options: any = {};
    //var options = new FileUploadOptions();

    console.log("toggle class fa-upload");
    // when the upload begin
    if (icon.hasClass("fa-upload")) {
      icon.toggleClass("fa-upload fa-spinner fa-spin");
    }

    console.log("set options");
    options.fileKey = "image";
    options.fileName = fileURL.substr(fileURL.lastIndexOf("/") + 1);
    options.mimeType = "image/jpeg";
    console.log("set params");
    options.params = {
      device_id: device.uuid,
      Stelle_ID: this.stelle.get("Stelle_ID"),
      login_name: this.stelle.get("login_name"),
      passwort: this.stelle.get("passwort"),
      selected_layer_id: this.get("id"),
      go: "mobile_upload_image",
    };
    options.chunkedMode = false;
    options.headers = {
      Connection: "close",
    };

    console.log("upload to url: " + server);
    console.log(
      "Upload img to url: " +
        server +
        " with options: " +
        JSON.stringify(options).replace(options.params.passwort, "secret")
    );
    ft.upload(fileURL, encodeURI(server), win, fail, options);

    // when the upload has been finished
    if (icon.hasClass("fa-spinner")) {
      icon.toggleClass("fa-upload fa-spinner fa-spin");
    }
  }

  sendDropImage(img) {
    //kvm.log("Layer.sendDropImage", 4);
    const url = this.stelle.get("url");
    const file = this.stelle.getUrlFile(url);
    const data = {
      device_id: device.uuid,
      Stelle_ID: this.stelle.get("Stelle_ID"),
      login_name: this.stelle.get("login_name"),
      passwort: this.stelle.get("passwort"),
      selected_layer_id: this.get("id"),
      go: "mobile_delete_images",
      images: img,
    };
    //kvm.log("Send " + url + file + $.param(data) + " to drop image", 2);

    //    $.support.cors = true;

    $.ajax({
      url: url + file,
      data: data,
      context: {
        layer: this,
        img: img,
      },
      success: function (r) {
        //console.log('Response: %o', r);
        const data = JSON.parse(r);
        if (data.success) {
          //kvm.log(data.msg);
          kvm.log(
            "Bild: " + this.img + " erfolgreich auf dem Server gelöscht.",
            4
          );
          this.layer.clearDeltas("img", this.img);
        }
      },
      error: function (e) {
        kvm.msg("An error has occurred: Code = " + e.statusText);
      },
    });
  }

  /**
   * - Frage Deltas ab und schreibe sie in eine Datei
   * - Schicke die Datei an den Server
   *   - Bei Erfolg:
   *     - Führe die Deltas vom Server aus
   *     - Lösche die Deltas, die weggeschickt wurden
   *     - Setze die neue syncVersion des Layers
   *   - Bei Fehler:
   *     - Zeige Fehlermeldung an
   */
  syncData() {
    kvm.tick(
      `${this.title}:<br>&nbsp;&nbsp; Starte Synchronisation der Daten mit dem Server.`
    );
    //kvm.log("Layer.syncData", 3);
    const tableName = this.getSqliteTableName();

    kvm.tick(
      `${this.title}:<br>&nbsp;&nbsp;Starte Synchronisation mit Server.`
    );

    const sql =
      "\
      SELECT\
        * \
      FROM\
        " +
      tableName +
      "_deltas\
      WHERE\
        type = 'sql'\
    ";
    // kvm.log("Layer.syncData: query deltas with sql: " + sql, 3);
    kvm.db.executeSql(
      sql,
      [],
      (rs) => {
        //kvm.log("Layer.syncData query deltas success result:" + JSON.stringify(rs), 3);
        const numRows = rs.rows.length;
        const deltas: { rows: { version: string; sql: string }[] } = {
          rows: [],
        };
        for (let i = 0; i < numRows; i++) {
          // kvm.log("Push item " + i + " to deltas. sql: " + rs.rows.item(i).delta, 4);
          deltas.rows.push({
            version: rs.rows.item(i).version,
            sql: rs.rows.item(i).delta,
          });
        }
        // Sende Anfrage auch mit leeren rows Array um Änderungen vom Server zu bekommen.
        this.sendDeltas(deltas);
      },
      function (error) {
        //kvm.log("Layer.syncData query deltas Fehler: " + JSON.stringify(error), 1);
        kvm.msg("Fehler beim Zugriff auf die Datenbank");
        if ($("#syncLayerIcon_" + this.getGlobalId()).hasClass("fa-spinner")) {
          $("#syncLayerIcon_" + this.getGlobalId()).toggleClass(
            "fa-refresh fa-spinner fa-spin"
          );
          kvm.closeSperrDiv("Senden der Sync-Daten mit Fehler beendet.");
        }
      }
    );
  }

  underlineToPointName(sql: string, schema, table) {
    return sql.replace(this.getSqliteTableName(), this.getPostgresTableName());
  }

  pointToUnderlineName(sql: string, schema, table) {
    return sql.replace(this.getPostgresTableName(), this.getSqliteTableName());
  }

  /*
   * Delete all features from layer, store, feature list, map and its data in the database table and deltas
   * and also lastVersionNr of the layer to make the way free for a new initial download
   */
  clearData() {
    //kvm.log("Layer.clearData", 4);
    const sql = `DELETE FROM ${this.getSqliteTableName()}`;

    kvm.db.executeSql(
      sql,
      [],
      (rs) => {
        kvm.store.removeItem("layerFilter");
        //console.log('removeItem %o', 'layerSettings_' + this.getGlobalId());
        //kvm.store.removeItem('layerSettings_' + this.getGlobalId());
        $("#numDatasetsText_" + this.getGlobalId()).html("keine");
        /*
        navigator.notification.confirm(
          'Alle Daten der Tabelle ' + this.getSqliteTableName() + ' in lokaler Datenbank gelöscht.',
          function(buttonIndex) {},
          'Datenbank',
          ['OK']
        );
*/
      },
      (error) => {
        navigator.notification.confirm(
          "Fehler bei Löschen der Layerdaten!\nFehlercode: " +
            (<any>error).code +
            "\nMeldung: " +
            error.message,
          function (buttonIndex) {
            // ToDo handling choices after error
          },
          "Datenbank",
          ["Abbruch"]
        );
      }
    );

    this.clearDeltas("all");
    this._features = new Map();
    $("#featurelistBody").html("");
    if (this.layerGroup) {
      this.layerGroup.clearLayers();
    }
    this.setEmpty();
  }

  /**
   * Löscht Datensätze in Tabelle in der die lokalen Änderungen an Daten des Layers vorgenommen wurden.
   * @param type Mit dem Wert sql werden nur die Änderungen der Sachdaten gelöscht. Mit dem Wert img werden die
   * Änderungen über Bilder gelöscht. Mit dem Wert all werden alle Deltas des Layers gelöscht.
   * @param delta
   */
  clearDeltas(type: string, delta?: string) {
    if (typeof delta === "undefined") delta = "";
    //kvm.log("Layer.clearDeltas", 4);
    let sql = `DELETE FROM ${this.getSqliteTableName()}_deltas`;
    if (type != "all") {
      sql += " WHERE type = '" + type + "'";
      if (delta != "") {
        sql += " AND delta = '" + delta + "'";
      }
    }
    //kvm.log("Lösche Deltas mit Sql: " + sql, 3);
    kvm.db.executeSql(
      sql,
      [],
      (rs: SQLitePlugin.Results) => {
        // kvm.log("Deltas von Layer " + this.layer.get("title") + " erfolgreich gelöscht.", 3);
        let icon = $("#clearLayerIcon_" + this.getGlobalId());
        if (icon.hasClass("fa-spinner")) {
          icon.toggleClass("fa-ban fa-spinner fa-spin");
          kvm.closeSperrDiv("Syncronisation des Layers beendet.");
        }
        icon = $("#syncImagesIcon_" + this.getGlobalId());
        if (icon.hasClass("fa-spinner")) {
          icon.toggleClass("fa-upload fa-spinner fa-spin");
          kvm.closeSperrDiv("Syncronisation der Bilder beendet.");
        }
        // TODO: Prüfen ob hier SperrDiv geschlossen werden muss
        //kvm.closeSperrDiv(`${this.title} Löschen der Änderungen erfolgreich beendet.`);
        /*
        navigator.notification.confirm(
          'Synchronisierung der Änderungen abgeschlossen.',
          function(buttonIndex) {
          },
          'Datenbank',
          ['OK']
        );
*/
        // }.bind({
        //     layer: this,
        //     delta: delta,
      },
      (error: Error) => {
        kvm.log("Fehler beim Löschen der Deltas!", 1);
        const icon = $("#clearLayerIcon_" + this.getGlobalId());
        if (icon.hasClass("fa-spinner")) {
          icon.toggleClass("fa-ban fa-spinner fa-spin");
        }
        navigator.notification.confirm(
          "Fehler bei Löschen der Änderungsdaten des Layers! \nMeldung: " +
            error.message,
          function (buttonIndex) {
            // ToDo handling choices after error
          },
          "Datenbank",
          ["OK"]
        );
      }
    );
  }

  downloadImage(localFile: string, remoteFile: string) {
    console.info(
      "downloadImage(localFile=" +
        localFile +
        ", remoteFile=" +
        remoteFile +
        ")"
    );
    const fileTransfer = new FileTransfer();
    const downloadURL = this.getImgDownloadUrl(remoteFile);

    //kvm.log("Download Datei von URL: " + downloadURL, 3);
    //kvm.log("Speicher die Datei auf dem Gerät in Datei: " + localFile, 3);

    fileTransfer.download(
      downloadURL,
      localFile,
      (fileEntry: FileEntry) => {
        console.log(
          "Download des Bildes abgeschlossen: %s",
          fileEntry.fullPath
        );
        console.log(
          "Set div[name$]=%s and src and background-image=%s",
          remoteFile,
          localFile
        );
        const imageDiv = $('div[name$="' + remoteFile + '"]');
        imageDiv.attr("src", localFile);
        imageDiv.css("background-image", "url('" + localFile + "')");
      },
      (error) => {
        kvm.log("Fehler beim Download der Bilddatei: " + error.code, 1);
      },
      true
    );
  }

  // _createFeatureForm() {
  //   kvm.tick(`${this.title}:<br>&nbsp;&nbsp;Erzeuge Featureformular neu.`);
  //   $("#formular")
  //     .append(
  //       '<h1 id="featureFormHeader" style="margin-left: 5px;">' +
  //         this.title +
  //         "</h1>"
  //     )
  //     .append($('<div id="formDiv">').append('<form id="featureFormular">'));
  //   const formAttr = this.attributes;
  //   for (let i = 0; i < formAttr.length; i++) {
  //     const attr = formAttr[i];
  //     console.log(
  //       `viewAttr: ${attr.get("name")} arrangement: ${attr.get("arrangement")}`
  //     );
  //     if (attr.get("arrangement") == "0") {
  //       $("#featureFormular").append('<div style="clear: both">');
  //     }
  //     $("#featureFormular").append(attr.withLabel());
  //     attr.formField.bindEvents();
  //     // add change event handler here to avoid redundancy in different bindEvents methods of formField classes
  //     if (attr.isEditable() && attr.hasVisibilityDependency()) {
  //       console.log(
  //         `Set vcheck event handler for attribute ${attr.get("name")}`
  //       );
  //       $(`${attr.formField.selector}`).on("change", (evt) => {
  //         const attributeId = $(evt.target).attr("id");
  //         const attribute = kvm.activeLayer.attributes[attributeId];
  //         console.log(
  //           "Attribute: %s changed to value: %s",
  //           attribute.get("name"),
  //           attribute.formField.getValue()
  //         );
  //         kvm.activeLayer.vcheckAttributes(
  //           attribute.get("name"),
  //           attribute.formField.getValue()
  //         );
  //       });
  //     }
  //   }
  // }

  createFeatureForm() {
    kvm.tick(`${this.title}:<br>&nbsp;&nbsp;Erzeuge Featureformular neu.`);
    $("#formular").empty();
    $("#formular")
      .append(
        '<h1 id="featureFormHeader" style="margin-left: 5px;">' +
          this.title +
          "</h1>"
      )
      .append(
        $('<div id="formularDiv">').append('<form id="featureFormular">')
      );
    this.attributeGroups.forEach((attributeGroup) => {
      if (attributeGroup.attributeIds.length > 0) {
        attributeGroup.div = $('<div class="attribute-group">');
        let attrGrpHead = $(
          `<div class="attribute-group-header ${
            attributeGroup.collapsed ? "b-collapsed" : "b-expanded"
          }">`
        );
        let attrGrpBody = $(
          `<div class="attribute-group-body"${
            attributeGroup.collapsed ? 'style="display: none"' : ""
          }>`
        );
        attrGrpHead.append(attributeGroup.name); // befülle group header
        attributeGroup.attributeIds.forEach((attributeId) => {
          const attr = this.attributes[attributeId];
          // console.log(`viewAttr: ${attr.get('name')} arrangement: ${attr.get('arrangement')}`);
          if (attr.get("arrangement") == "0") {
            attrGrpBody.append('<div style="clear: both">');
          }
          attrGrpBody.append(attr.withLabel());
        });
        attributeGroup.div.append(attrGrpHead).append(attrGrpBody);
        $("#featureFormular").append(attributeGroup.div);
      }
    });
    $("#formular").append(`
			<div id="newAfterCreateDiv" style="margin: 20px; display: none">
				<input
					id = "newAfterCreate"
					type="checkbox"
					name="newAfterCreate"
					${kvm.config.newAfterCreate ? " checked" : ""}
					onchange="
						kvm.config.newAfterCreate = this.checked;
						console.log('Set newAfterCreate to ', kvm.config.newAfterCreate);
						kvm.store.setItem('newAfterCreate', kvm.config.newAfterCreate.toString());
					"
				> und neuen Datensatz erfassen
			</div>
		`);
    for (let i = 0; i < this.attributes.length; i++) {
      const attr = this.attributes[i];
      attr.formField.bindEvents();
      // add change event handler here to avoid redundancy in different bindEvents methods of formField classes
      if (attr.isEditable() && attr.hasVisibilityDependency()) {
        console.log(
          `Set vcheck event handler for attribute ${attr.get("name")}`
        );
        $(`${attr.formField.selector}`).on("change", (evt) => {
          const attributeId = $(evt.target).attr("id");
          const attribute = kvm.activeLayer.attributes[attributeId];
          console.log(
            "Attribute: %s changed to value: %s",
            attribute.get("name"),
            attribute.formField.getValue()
          );
          kvm.activeLayer.vcheckAttributes(
            attribute.get("name"),
            attribute.formField.getValue()
          );
        });
      }
    }
  }

  createDataView() {
    console.log("Layer.createDataView");
    kvm.tick(`${this.title}:<br>&nbsp;&nbsp;Erzeuge Sachdatenanzeige neu.`);
    $("#dataView").empty();
    $("#dataView")
      .append(`<h1 style="margin-left: 5px;">${this.title}</h1>`)
      .append('<div id="dataViewDiv">');
    this.attributeGroups.forEach((attributeGroup) => {
      if (attributeGroup.attributeIds.length > 0) {
        attributeGroup.div = $('<div class="attribute-group">');
        const attrGrpHead = $(
          `<div class="attribute-group-header ${
            attributeGroup.collapsed ? "b-collapsed" : "b-expanded"
          }">`
        );
        const attrGrpBody = $(
          `<div class="attribute-group-body"${
            attributeGroup.collapsed ? 'style="display: none"' : ""
          }>`
        );
        attrGrpHead.append(attributeGroup.name); // befülle group header
        attributeGroup.attributeIds.forEach((attributeId) => {
          let attr = this.attributes[attributeId];
          if (attr.get("type") != "geometry") {
            // befülle group body
            //console.log(`viewAttr: ${attr.get('name')} arrangement: ${attr.get('arrangement')}`);
            if (attr.get("arrangement") == "0") {
              attrGrpBody.append('<div style="clear: both">');
            }
            attrGrpBody.append(attr.viewField.withLabel());
            attr.viewField.bindEvents();
          }
        });
        attributeGroup.div.append(attrGrpHead).append(attrGrpBody);
        $("#dataViewDiv").append(attributeGroup.div);
      }
    });
    $(".attribute-group-header").on("click", (evt) => {
      console.log("attribute-group-header");
      $(evt.target).toggleClass("b-expanded b-collapsed");
      $(evt.target).next().toggle();
    });
  }

  /**
   * This function check if the attributes that are visibility dependend
   * from attriubte attribute_name must be visible or not with the given attribute_value
   * and change the visibility in dataView and form if neccesary.
   */
  vcheckAttributes(attribute_name, attribute_value) {
    this.attributes.map((attr) => {
      let visible = true;
      if (attr.get("vcheck_attribute") == attribute_name) {
        switch (attr.get("vcheck_operator")) {
          case "=":
            visible = attribute_value == attr.get("vcheck_value");
            break;
          case "!=":
            visible = attribute_value != attr.get("vcheck_value");
            break;
          case "<":
            visible = attribute_value < attr.get("vcheck_value");
            break;
          case ">":
            visible = attribute_value > attr.get("vcheck_value");
            break;
          case "IN":
            visible =
              attr.get("vcheck_value").split("|").indexOf(attribute_value) !=
              -1;
            break;
        }
        if (visible) {
          $(
            `#dataViewFieldDiv_${attr.get("index")}, #formFieldDiv_${attr.get(
              "index"
            )}`
          ).show();
        } else {
          $(
            `#dataViewFieldDiv_${attr.get("index")}, #formFieldDiv_${attr.get(
              "index"
            )}`
          ).hide();
        }
        //console.log(`Attribute: ${attr.get('name')} is ${(visible ? 'visible' : 'hidden')} because (${attr.get('vcheck_attribute')}: ${attribute_value}) ${attr.get('vcheck_operator')} ${attr.get('vcheck_value')}`);
      }
    });
    this.attributeGroups.forEach((attrGrp) => {
      if (
        attrGrp.attributeIds.every((attributeId) => {
          return (
            $(`#dataViewFieldDiv_${attributeId}`).css("display") === "none"
          );
        })
      ) {
        attrGrp.div.hide();
      } else {
        attrGrp.div.show();
      }
    });
  }

  getIcon() {
    // TODO Bug
    return new Icon({
      //        iconUrl: 'img/hst24.png',
      //        shadowUrl: 'leaf-shadow.png',

      iconSize: [24, 24], // size of the icon
      //        shadowSize:   [50, 64], // size of the shadow
      iconAnchor: [12, 12], // point of the icon which will correspond to marker's location
      shadowAnchor: [16, 8], // the same for the shadow
      popupAnchor: [0, -12], // point from which the popup should open relative to the iconAnchor
    });
  }

  /**
   * Setzt die Werte des Features im dataView
   */
  loadFeatureToView(feature: Feature, options = {}) {
    console.log(this.get("title") + ": Lade Feature in View.");
    //$('#featureFormHeader').append('/' + feature.id);
    this.attributes
      .filter(function (attribute) {
        return attribute.get("type") != "geometry";
      })
      .map((attr) => {
        const key = attr.get("name");
        const val =
          feature.getDataValue(key) == "null"
            ? null
            : feature.getDataValue(key);
        if (attr.hasVisibilityDependency()) {
          kvm.activeLayer.vcheckAttributes(key, val);
        }
        attr.viewField.setValue(val);
      });

    //this.selectFeature(feature, true);
    if (feature.new) {
      $("#newAfterCreateDiv").show();
    } else {
      $("#newAfterCreateDiv").hide();
    }
  }

  /**
   * - Befüllt das Formular des Layers mit den Attributwerten des übergebenen Features
   * - Setzt das Feature als activeFeature im Layer
   * - Startet das GPS-Tracking
   */
  loadFeatureToForm(feature: Feature, options = { editable: false }) {
    // console.log("Layer.loadFeature %o ToForm with options: %o", feature, options);
    this.activeFeature = feature;

    $.map(this.attributes, function (attr) {
      const attrName = attr.get("name");
      const val =
        feature.getDataValue(attrName) == "null"
          ? null
          : feature.getDataValue(attrName);

      //console.log("Set %s %s: %s", attr.get("form_element_type"), key, val);
      //console.log('Set Value of feature: %s in formField: %s for key: %s with value: %s', JSON.stringify(this), attr.formField.constructor.name, key, val);
      attr.formField.setValue(val);
      if (kvm.coalesce(attr.get("required_by"), "") != "") {
        const required_by_idx =
          kvm.activeLayer.attribute_index[attr.get("required_by")];
        (<any>(
          kvm.activeLayer.attributes[required_by_idx].formField
        )).filter_by_required(attr.get("name"), val);
      }
      if (attr.hasVisibilityDependency()) {
        kvm.activeLayer.vcheckAttributes(attr.get("name"), val);
      }
    });
    if (feature.geom) {
      $("#geom_wkt").val(feature.geom.toWkt());
      $("#goToGpsPositionButton").show();
      if (options.editable) {
        kvm.controller.mapper.watchGpsAccuracy();
      }
    }
  }

  loadTplFeatureToForm(tplId: string) {
    //console.log("Layer.loadTplFeatureToForm.");
    const feature = this.getFeature(tplId);
    $.map(
      this.attributes,
      (attr) => {
        const attrName = attr.get("name");
        const val = feature.getDataValue(attrName); // this is here the tplFeature

        if (
          !["uuid", "version", this.settings.geometry_attribute].includes(
            attrName
          )
        ) {
          //console.log('Set %s %s: %s', attr.get('form_element_type'), key, val);
          attr.formField.setValue(val);
        }
      } // .bind(this.features.get(tplId))
    );
  }

  /**
   * Zeichnet die Features in die Karte
   */
  drawFeatures() {
    kvm.tick(
      `${this.title}:<br>&nbsp;&nbsp;Zeichne ${this._features.size} Features neu.`
    );
    const layerRenderer = undefined; //new L.SVG();

    this._features.forEach((feature) => {
      try {
        let vectorLayer;
        // const layer: Layer = this;

        if (feature.newGeom) {
          //console.log("Zeichne Feature: %o in Layer: ", feature, this.get("title"));
          if (this.settings.geometry_type == "Point") {
            vectorLayer = new CircleMarker(
              feature.wkxToLatLngs(feature.newGeom),
              <any>{
                featureId: feature.id,
                globalLayerId: this.getGlobalId(),
              }
            );
          } else if (this.settings.geometry_type == "Line") {
            vectorLayer = new Polyline(feature.wkxToLatLngs(feature.newGeom), <
              any
            >{
              featureId: feature.id,
              globalLayerId: this.getGlobalId(),
            });
          } else if (this.settings.geometry_type == "Polygon") {
            vectorLayer = new Polygon(feature.wkxToLatLngs(feature.newGeom), <
              any
            >{
              featureId: feature.id,
              globalLayerId: this.getGlobalId(),
            });
          }
          // const popupFunc = () => {
          //   //console.log("%s: Call getPopup", layer.title);
          //   return layer.getPopup(feature);
          // };
          // vectorLayer.bindPopup(popupFunc);

          // Das angeklickte Feature selektieren wenn der Layer selektiert ist zu dem das Feature gehört
          // und gerade kein anderes feature editiert wird.
          vectorLayer.on("click", this.popupOpen);
          // poupuclose event must not be considered because if the feature behind the popup
          // witch has to be closed will be unselected only if another feature is selected
          // popup close shall realy only close the popup not more.
          //
          //vectorLayer.on("popupclose", this.popupClose);

          // Setze Style für Kartenobjekt
          const style = this.hasClasses()
            ? feature.getStyle()
            : this.getDefaultPathOptions();

          //console.log("Draw feature %o with style %o", feature, style);
          vectorLayer.setStyle(style);
          if (this.get("geometry_type") == "Point") {
            vectorLayer.setRadius(style.size);
          }

          // feature.getNormalStyle());
          //this.settings.useCustomStyle) ? this.getCustomStyle() : this.getClassStyle());

          // Kartenobjekt als Layer zur Layergruppe hinzufügen
          this.layerGroup.addLayer(vectorLayer);

          // layer_id abfragen und in Feature als layerId speichern
          feature.layerId = this.layerGroup.getLayerId(vectorLayer);
        }
      } catch (ex) {
        kvm.msg(
          "Fehler beim Zeichnen des Feature id: " +
            feature.id +
            " in layer id: " +
            feature.globalLayerId +
            "! Fehlertyp: " +
            ex.name +
            " Fehlermeldung: " +
            ex.message
        );
        console.error("Fehler", ex);
      }
    });
    try {
      this.layerGroup.setZIndex(this.settings.drawingorder);
      this.layerGroup.addTo(kvm.map);
    } catch ({ name, message }) {
      kvm.msg(
        "Fehler beim Hinzufügen der Layergruppe in Layer id: " +
          this.getGlobalId() +
          "! Fehlertyp: " +
          name +
          " Fehlermeldung: " +
          message
      );
    }
    // console.log("activeLayer after drawFeatures of Layer Id: ", this.getGlobalId());
  }

  /**
   * This Function returns the first class of the layer
   * where value matches with the expression.
   * If no expression match it returns undefined
   */
  getClass(value) {
    return this.classes.find((element) => {
      return (
        element.get("expression").trim() == "" ||
        element.get("expression") == value
      );
    });
  }

  /*
  getCustomStyle() {
    console.log("%s: Use styles from first class.", this.title);
    const classStyle = this.settings.classes[0].style;
    style.color = classStyle.color || "#7777FF";
    style.opacity = (classStyle.opacity || 100) / 100;
    style.fillColor = classStyle.fillcolor || "#0000FF";
    style.fillOpacity = (classStyle.fillOpacity || 100) / 100;
    style.width = classStyle.width || 1;
  }
*/
  hasClasses() {
    return this.settings.classes.length > 0;
  }

  getDefaultPathOptions(): { [k: string]: any } {
    const style: { [k: string]: any } = {
      color: "#000000",
      opacity: 1.0,
      fillColor: "#333333",
      fillOpacity: 0.8,
      weight: 2,
      stroke: true,
      fill: this.settings.geometry_type != "Line",
      size: 6,
    };
    // if (this.settings.geometry_type == "Point") {
    //     style.size = 6;
    // }
    return style;
  }

  getSelectedStyle(style: { [k: string]: any }) {
    style.color = "#FF0000";
    style.weight = 4;
    return style;
  }

  /**
   * Wählt den kvm.activeLayer in LayerControl aus.
   */
  selectActiveLayerInControl() {
    //console.log("selectActiveLayerInControl layer: ", this.title);
    kvm.tick(`${this.title}:<br>&nbsp;&nbsp;Schalte Layer in Karte ein.`);
    if (kvm.activeLayer) {
      $(".leaflet-control-layers-overlays span").removeClass("active-layer");
      $("#layerCtrLayerDiv_" + kvm.activeLayer.getGlobalId()).addClass(
        "active-layer"
      );
    }
  }

  getPopup(feature) {
    //console.log("getPopup with feature %o, isActive: %", feature, isActive);
    const html = `<div style="min-width: 150px">
        <b>${this.get("title")}</b><br>
        ${feature.getLabelValue()}<br>
        <div id="popupFunctions_${this.getGlobalId()}">
          ${
            this.hasEditPrivilege
              ? `<a
                class="edit-feature"
                href="#"
                title="Geometrie ändern"
                onclick="kvm.getLayer('${feature.globalLayerId}').editFeature('${feature.id}')"
              ><span class="fa-stack fa-lg">
                  <i class="fa fa-square fa-stack-2x"></i>
                  <i class="fa fa-pencil fa-stack-1x fa-inverse"></i>
                </span></i></a>`
              : ""
          }
          <a
            class="popup-link"
            href="#"
            title="Sachdaten anzeigen"
            onclick="kvm.getLayer('${feature.globalLayerId}').showDataView('${
      feature.id
    }')"
          ><span class="fa-stack fa-lg">
              <i class="fa fa-square fa-stack-2x"></i>
              <i class="fa fa-bars fa-stack-1x fa-inverse"></i>
            </span></i></a>
        </div>
      </div>
    `;
    //console.log("getPopup returns html: %s", html);
    return html;
  }

  /**
   * This function returns the maximum value of attribute in layer table
   * If no data exists in table returning 0;
   * @param {String} attribute The name of the attribute from which the maximum value will be determined.
   * @return {Integer} The maximum value.
   */
  // getNextVal(attribute) {
  //     // let nextValue = 0;
  //     const featureArray = Array.from(this._features.values());
  //     return featureArray.reduce(
  //         (maxValue, currentFeature) => {
  //             const currentValue = currentFeature.getDataValue(attribute);

  //             if (typeof currentValue !== "undefined" && currentValue > maxValue) {
  //                 return currentValue;
  //             } else {
  //                 return maxValue;
  //             }
  //         },
  //         featureArray[0].getDataValue(attribute) // Initialize with the attribute value of the first object
  //     );
  //     // const sql = `
  //     // 	SELECT
  //     // 		max(${attribute}) AS max_id
  //     // 	FROM
  //     // 		${this.getSqliteTableName()}
  //     // `;
  //     // kvm.db.executeSql(
  //     // 	sql,
  //     // 	[],
  //     // 	(rs) => {
  //     // 		let max_id = 0;
  //     // 		if (rs.rows.item.length == 1) {
  //     // 			max_id = rs.rows.item(0).max_id;
  //     // 		}
  //     // 	}
  //     // );
  // }

  // async getResultset(sql, params)  {
  // 	let p = new Promise(async (resolve, reject) => {
  // 			const verarbeite_resultset = function (resultset) {
  // 					console.log('verarbeite_resultset: ', resultset);
  // 					resolve(resultset);
  // 			}
  // 			const err_fkt = function (err) {
  // 				console.log('err: ', err);
  // 				reject(err);
  // 			}
  // 			kvm.db.executeSql(sql, params, verarbeite_resultset, err_fkt);
  // 	});
  // 	return p;
  // }

  // async getNextVal(attribute) {
  // 	const sql = `
  // 		SELECT
  // 			max(${attribute}) AS max_id
  // 		FROM
  // 			${this.getSqliteTableName()}
  // 	`;
  // 	const max_id =  await this.getResultset(sql, []);
  // 	console.log('max_id in start: ', max_id);
  // 	return max_id;
  // }

  /**
   * This function creates an object with default values
   * e.g. sequence attributes, version and the uuid attribute
   * @returns
   */
  getNewData() {
    // loop through the attributes and generate key value pairs for autoAttributes
    const newData = {};

    $.each(this.attributes, (key, attribute) => {
      const attribute_name = attribute.get("name");
      const options = attribute.get("options");
      let value;

      switch (true) {
        case attribute_name == this.get("id_attribute"):
          {
            value = kvm.uuidv4();
          }
          break;
        case attribute_name == "version":
          {
            value =
              (this.get("syncVersion") == "null"
                ? 0
                : this.get("syncVersion")) + 1;
          }
          break;
        case attribute.get("form_element_type") == "UserID" &&
          (options == "" || options.toLowerCase() == "insert"):
          {
            value = kvm.store.getItem("userId");
          }
          break;
        case attribute.get("form_element_type") == "User" &&
          (options == "" || options.toLowerCase() == "insert"):
          {
            value = kvm.store.getItem("userName");
          }
          break;
        case attribute.get("form_element_type") == "SubFormFK":
          {
            value = this.specifiedValues[attribute.getFKAttribute()];
          }
          break;
        case attribute.get("default") &&
          // attribute.get('nullable') == 0 &&
          attribute.get("form_element_type") != "Time":
          {
            switch (true) {
              case attribute.get("default").startsWith("gdi_conditional_val"):
                {
                  const parentLayer = kvm.getLayer(this.parentLayerId);
                  const parentFeature = parentLayer.getFeature(
                    this.parentFeatureId
                  );
                  // Frage den Spaltennamen ab, von dem der Defaultwert des parentLayers abgefragt werden soll.
                  //z.B: entwicklungsphase_id aus gdi_conditional_val('kob', 'baum', 'entwicklungsphase_id', 'uuid = ''$baum_uuid''')
                  const column = attribute
                    .get("default")
                    .split(",")[2]
                    .trim()
                    .replace(/^["'](.+(?=["']$))["']$/, "$1");
                  value = parentFeature.getDataValue(column);
                  // value = kvm.layers[this.parentLayerId].features.get(this.parentFeatureId).get(column)
                }
                break;
              case attribute.get("default").includes("gdi_current_date"):
                {
                  const today = new Date();
                  value = `${today.getFullYear()}/${(today.getMonth() + 1)
                    .toString()
                    .padStart(2, "0")}/${today.getDate()}`;
                }
                break;
              case attribute.get("default").indexOf("$") === 0:
                {
                  // replace default String with layerParams if exists
                  let paramName = attribute.get("default").slice(1);
                  if (
                    paramName in kvm.layerParams &&
                    attribute.hasEnumValue(kvm.layerParams[paramName])
                  ) {
                    value = kvm.layerParams[paramName];
                  }
                }
                break;
              default: {
                value = attribute.get("default");
              }
            }
          }
          break;
      }

      newData[attribute_name] = value;
    });
    return newData;
  }

  /**
   * Deselectiert das aktive Feature falls vorhanden
   * Legt ein neues Feature Objekt ohne Geometry an und
   * ordnet diese activeFeature zu
   */
  newFeature() {
    console.log("Layer.newFeature");

    this.deactivateFeature();
    const feature = new Feature(this.getNewData(), this, true);
    this.activateFeature(feature, true);
    kvm.log(`Neues Feature mit id: ${this.activeFeature.id} erzeugt.`);
  }

  /**
   * Show feature with featureId in edit form if featureId is not yet in layers feature list take the activeFeature.
   * Its the case when a new feature has been created but is not saved allready.
   * Activate Layer before if not already active.
   * Activate Feature before if exists and not already active.
   * @param featureId
   */
  editFeature(featureId) {
    // console.log("Layer.editFeature featureId: ", featureId);
    const feature = this.getFeature(featureId) || this.activeFeature;

    if (!this.isActive) {
      this.activate();
    }

    if (!feature.isActive) {
      // Only existing features can be set active
      this.activateFeature(feature, true);
    }

    feature.setDefaultValuesForNonSaveables();

    if (this.hasGeometry) {
      if (feature.geom) {
        this.startEditing();
      } else {
        if ($("#newPosSelect").val() == 1) {
          navigator.geolocation.getCurrentPosition(
            function (geoLocation) {
              console.log("Starte Editierung an GPS-Coordinate");
              const startLatLng: LatLngTuple = [
                geoLocation.coords.latitude,
                geoLocation.coords.longitude,
              ];
              kvm.activeLayer.startEditing(
                kvm.activeLayer.getStartGeomAtLatLng(startLatLng),
                startLatLng
              );
              if (kvm.activeLayer.get("geometry_type") == "Point") {
                $("#gpsCurrentPosition").html(
                  geoLocation.coords.latitude.toString() +
                    " " +
                    geoLocation.coords.longitude.toString()
                );
                console.log(
                  "Starte laufende Übernahme der aktuellen GPS-Position."
                );
                kvm.controller.mapper.startUpdateMarkerWithGps();
              }
            },
            function (error) {
              console.log("Starte Editierung in Bildschirmmitte");
              const center = kvm.map.getCenter();
              const startLatLng: LatLngTuple = [center.lat, center.lng];
              kvm.activeLayer.startEditing(
                kvm.activeLayer.getStartGeomAtLatLng(startLatLng),
                startLatLng
              );
              navigator.notification.confirm(
                "Da keine GPS-Position ermittelt werden kann, wird die neue Geometrie in der Mitte der Karte gezeichnet. Schalten Sie die GPS Funktion auf Ihrem Gerät ein und suchen Sie einen Ort unter freiem Himmel auf um GPS benutzen zu können.",
                function (buttonIndex) {
                  if (buttonIndex == 1) {
                    //kvm.log("Einschalten der GPS-Funktion.", 3);
                  }
                },
                "GPS-Position",
                ["ok", "ohne GPS weitermachen"]
              );
            },
            {
              maximumAge: 2000, // duration to cache current position
              timeout: 5000, // timeout for try to call successFunction, else call errorFunction
              enableHighAccuracy: true, // take position from gps not network-based method
            }
          );
        } else {
          const center = kvm.map.getCenter();
          console.log("Starte Editierung in Bildschirmmitte");
          const startLatLng: LatLngTuple = [center.lat, center.lng];
          this.startEditing(
            this.getStartGeomAtLatLng(startLatLng),
            startLatLng
          );
        }
      }
    } else {
      this.loadFeatureToForm(feature, { editable: true });
      kvm.showItem("formular");
    }
  }

  getStartGeomAtLatLng(latlng: LatLngExpression) {
    const startGeomSize = 0.0002;
    let startGeom;

    if (this.get("geometry_type") == "Point") {
      startGeom = [{ lat: latlng[0], lng: latlng[1] }];
    } else if (this.get("geometry_type") == "Line") {
      startGeom = [
        { lat: latlng[0], lng: latlng[1] },
        { lat: latlng[0] + startGeomSize, lng: latlng[1] + startGeomSize },
      ];
    } else if (this.get("geometry_type") == "MultiLine") {
      startGeom = [
        [
          {
            lat: latlng[0] - startGeomSize / 2,
            lng: latlng[1] - startGeomSize,
          },
          {
            lat: latlng[0] + startGeomSize / 2,
            lng: latlng[1] - startGeomSize / 2,
          },
          {
            lat: latlng[0] - startGeomSize / 2,
            lng: latlng[1] + startGeomSize / 2,
          },
          {
            lat: latlng[0] + startGeomSize / 2,
            lng: latlng[1] + startGeomSize,
          },
        ],
      ];
    } else if (this.get("geometry_type") == "Polygon") {
      startGeom = [
        [
          { lat: latlng[0] + startGeomSize, lng: latlng[1] + startGeomSize },
          { lat: latlng[0] + startGeomSize, lng: latlng[1] - startGeomSize },
          { lat: latlng[0] - startGeomSize, lng: latlng[1] - startGeomSize },
          { lat: latlng[0] - startGeomSize, lng: latlng[1] + startGeomSize },
          { lat: latlng[0] + startGeomSize, lng: latlng[1] + startGeomSize },
        ],
      ];
    }
    //console.log('Verwende Startgeometrie: %o', startGeom);
    return startGeom;
  }

  /**
   * Load feature to data view and show it.
   * Activate the layer before if not already.
   * @param featureId
   */
  showDataView(featureId: string) {
    if (!this.isActive) {
      this.activate();
    }
    const feature = this.getFeature(featureId);
    if (!feature.isActive) {
      this.activateFeature(feature, true);
    }
    kvm.showItem("dataView");
  }

  /**
   * Wenn alatlng übergeben wurde beginne die Editierung an dieser Stelle statt an der Stelle der Koordinaten des activeFeatures
   * Wird verwendet wenn ein neues Feature angelegt wird, oder das Feature noch keine Geometrie hatte.
   */
  startEditing(alatlng: number[] = [], startLatLng?: LatLngExpression) {
    // console.log("Layer.startEditing");
    const feature = this.activeFeature;
    let vectorLayer;

    if (alatlng.length > 0) {
      // console.log("Setzte Geometry für Feature %o", alatlng, 4);
      feature.setGeom(feature.aLatLngsToWkx(alatlng));
      feature.geom = feature.newGeom;
      feature.setDataValue(
        this.settings.geometry_attribute,
        feature.wkxToEwkb(feature.geom)
      );
    }
    this.loadFeatureToForm(feature, { editable: true });
    kvm.map.closePopup();
    if (feature.layerId) {
      vectorLayer = this.layerGroup.getLayer(feature.layerId);
      //console.log('Edit VectorLayer: %o in Layer Id: %s von Feature Id: %s.', vectorLayer, feature.layerId, feature.id);
      vectorLayer.unbindPopup();
      vectorLayer.setStyle(feature.getEditModeStyle());
    }
    feature.setEditable(true);

    feature.zoomTo(true, startLatLng);

    $("#deleteFeatureButton").hide();
    if (
      this.hasGeometry &&
      !$("#dataView").is(":visible") &&
      !$("#formular").is(":visible")
    ) {
      //console.log('Map is Visible, keep panel map open.');
      kvm.showItem("mapEdit");
    } else {
      //console.log('Map Is not Visible, open in formular');
      kvm.showItem("formular");
    }
  }

  /**
   * Löscht die editierbare Geometrie
   * zoomt zur ursprünglichen Geometrie
   * Setzt den Style des circle Markers auf den alten zurück
   * Binded das Popup an den dazugehörigen Layers
   * Selectiert das Feature in Karte und Liste
   */
  cancelEditGeometry(featureId?) {
    //kvm.log("cancelEditGeometry");
    const feature = this.activeFeature;

    if (featureId && feature.layerId) {
      // Ermittelt die layer_id des circleMarkers des Features
      let vectorLayer = (<any>kvm.map)._layers[feature.layerId];

      // Zoom zur ursprünglichen Geometrie
      feature.zoomTo(false);

      //Setzt den Style des circle Markers auf den alten zurück
      //layer.setStyle(feature.getNormalStyle()); Wird nicht mehr verwendet

      const style = this.hasClasses()
        ? feature.getStyle()
        : this.getDefaultPathOptions();
      // console.log("Set style after cancleEditGeometry: %o", style);
      vectorLayer.setStyle(style);
      if (this.get("geometry_type") == "Point") {
        vectorLayer.setRadius(style.size);
      }

      // Binded das Popup an den dazugehörigen Layer
      // Popup zum Kartenobjekt hinzufügen
      // ToDo warum wird hier die popupFct noch mal hinzugefügt?
      // const popupFct = (vectorLayer) => {
      //   console.log("popupFct wurde hinzugefügt in calcelEditGeometry");
      //   return this.getPopup(feature);
      // };
      // vectorLayer.bindPopup(popupFct);

      this.activateFeature(feature, false);
    } else {
      // Beende das Anlegen eines neuen Features
      kvm.map.removeLayer(kvm.activeLayer.activeFeature.editableLayer);
      // Löscht die editierbare Geometrie
      feature.deactivate();
      kvm.showItem("map");
    }
    feature.setEditable(false);
    // sorge dafür dass die buttons wieder in den Popups angezeigt werden. Kann aber wahrscheinlich hier wieder raus,
    // weil das in der Popup-Funktion geregelt wird was angezeigt wird.
    // $(".popup-functions").show();
  }

  /**
   * ToDo: Prüfen ob der Algorithmus so ist wie hier beschrieben und Doku anpassen
   * Sperrdiv Content Meldung setzen
   * Sperrdiv einblenden
   * Wartesymbol an Stelle des Speicherbutton anzeigen
   * Änderungsdatensatz anlegen
   * Ursprüngliche durch neue Geometrie ersetzen
   *  - im Layerobjekt (z.B. circleMarker)
   *  - im Featureobjekt
   *  - im Formular falls vorhanden
   * Style der ursprünglichen Geometrie auf default setzen
   * editierbare Geometrie aus der Karte löschen und damit Popup der editierbaren Geometrie schließen
   * Binded das default Popup an den dazugehörigen Layer
   * Sperrdiv entfernen
   *
   * Überarbeiten für neue Features evtl.
   */
  saveGeometry(feature) {
    //console.log("saveGeometry mit feature: %o", feature);
    let vectorLayer;
    if (feature.layerId) {
      //console.log('feature.layerId: %s', feature.layerId);
      vectorLayer = (<any>kvm.map)._layers[feature.layerId];
      //console.log('layer extrahiert: %o', layer);
    }
    // $("#sperr_div_content").html("Aktualisiere die Geometrie");
    // $("#sperr_div").show();

    // Ist schon passiert durch readDataset
    //    console.log('setze neue geometry for feature: %o', feature.newGeom);
    //    //  - Die Änderung im Featureobjekt vorgenommen
    //    feature.geom = feature.newGeom;

    if (vectorLayer) {
      this.layerGroup.removeLayer(feature.layerId);
    }

    if (feature.layer.settings.geometry_type == "Point") {
      //console.log('Lege neuen CircleMarker an.');
      // circleMarker erzeugen mit Popup Eventlistener
      vectorLayer = new CircleMarker(feature.wkxToLatLngs(feature.newGeom), <
        any
      >{
        renderer: kvm.myRenderer,
        featureId: feature.id,
        globalLayerId: kvm.activeLayer.getGlobalId(),
      });
    } else if (feature.layer.settings.geometry_type == "Line") {
      vectorLayer = new Polyline(feature.wkxToLatLngs(feature.newGeom), <any>{
        featureId: feature.id,
        globalLayerId: kvm.activeLayer.getGlobalId(),
      });
    } else if (feature.layer.settings.geometry_type == "Polygon") {
      vectorLayer = new Polygon(
        feature.wkxToLatLngs(feature.newGeom).map(function (ring) {
          if (ring[0] != ring[ring.length - 1]) {
            ring.push(ring[0]);
          }
          return ring;
        }),
        <any>{
          featureId: feature.id,
          globalLayerId: kvm.activeLayer.getGlobalId(),
        }
      );
    }

    // const popupFct = () => {
    //   console.log("popupFct for activelayer: %o in saveGeometry", kvm.activeLayer);
    //   return this.getPopup(feature);
    // };
    // vectorLayer.bindPopup(popupFct);

    //console.log('Style der neuen Geometrie auf default setzen');
    //vectorLayer.setStyle(feature.getNormalStyle()); veraltet wird nicht mehr verwendet

    const style = this.hasClasses()
      ? feature.getStyle()
      : this.getDefaultPathOptions();
    // console.log("SetStyle after saveGeometry: %o", style);
    vectorLayer.setStyle(style);
    if (this.get("geometry_type") == "Point") {
      vectorLayer.setRadius(style.size);
    }

    //console.log('Setze click event for vectorLayer');
    // vectorLayer.on("click", (evt) => {
    //   evt.target.openPopup();
    // });
    // vectorLayer.on("popupopen", this.popupOpen);
    vectorLayer.on("click", this.popupOpen);
    //vectorLayer.on("popupclose", this.popupClose);

    //console.log('Füge vectorLayer zur layerGroup hinzu.');
    // vectorLayer als Layer zur Layergruppe hinzufügen
    this.layerGroup.addLayer(vectorLayer);

    //console.log('Frage layerId ab und ordne feature zu.');
    // layer_id abfragen und in Feature als layerId speichern
    feature.layerId = this.layerGroup.getLayerId(vectorLayer);
    if ((<any>kvm.map)._layers[feature.layerId] === undefined) {
      this.layerGroup.addTo(kvm.map);
    }

    //console.log('Setze feature auf nicht mehr editierbar.');
    // editierbare Geometrie aus der Karte löschen und damit Popup der editierbaren Geometrie schließen
    feature.setEditable(false);

    //console.log('Zoome zum Feature');
    // this.activateFeature(feature, false);
  }

  /**
   * Callback function of popupOpen event of map features
   * activate the feature only if
   * the layer is active and
   * no active feature exists or
   * (active feature is a different feature than the selected and its currently not editable)
   * the feature is not already selcted and
   * no other feature is currently active and editable
   * @param evt
   */
  popupOpen = (evt) => {
    const featureId = evt.target.options.featureId;
    const globalLayerId = evt.target.options.globalLayerId;
    const kvmLayer = kvm.getLayer(globalLayerId);
    const activeFeature = kvm.activeLayer.activeFeature;
    const feature = kvmLayer.getFeature(featureId);
    const layer = (<any>kvm.map)._layers[feature.layerId];
    console.log(
      "Event Open Popup of feature: %s in layer: %s globalLayerId: %s",
      featureId,
      kvmLayer.title,
      globalLayerId
    );
    layer.bindPopup(kvmLayer.getPopup(feature)).openPopup();
    if (
      kvmLayer.isActive &&
      (!activeFeature ||
        (activeFeature.id != featureId && !activeFeature.isEditable))
    ) {
      kvmLayer.activateFeature(kvmLayer.getFeature(featureId), false);
    }
  };

  hasActiveFeature() {
    return this.activeFeature ? true : false;
  }

  isActiveFeature(feature: Feature) {
    return this.hasActiveFeature() && this.activeFeature.id === feature.id;
  }

  collectChanges(action: string): AttributteDelta[] {
    //kvm.log("Layer.collectChanges " + (action ? " with action: " + action : ""), 4);
    const activeFeature = this.activeFeature;
    // changes = [];

    const geometry_attribute = this.get("geometry_attribute");
    const id_attribute = this.get("id_attribute");
    // loop over all elements of the form or over all attributes of the layer respectively
    // compare form element content with old values and if changes exists assign
    const changes = this.attributes
      .map(function (attr: Attribute): AttributteDelta {
        console.log("attr name: %s", attr.get("name"));
        //console.log('attr.privilege: %s', attr.get('privilege'));
        if (
          attr.get("name") != id_attribute &&
          !attr.isAutoAttribute(action) &&
          !attr.isPseudoAttribute() &&
          attr.settings.privilege != "0"
        ) {
          const attrName = attr.settings.name;
          let oldVal =
            activeFeature.getDataValue(attrName) == "null"
              ? null
              : activeFeature.getDataValue(attrName);
          let newVal = attr.formField.getValue(action);

          if (typeof oldVal == "string") oldVal = oldVal.trim();
          if (typeof newVal == "string") newVal = newVal.trim();
          if (oldVal == "null" && newVal == null) {
            newVal = "null"; // null String und null Object sollen gleich sein beim Vergleich
          }

          if (action == "insert") {
            // Setze oldVal auf leer zurück, damit die geometry und die in getNewData erzeugten
            // und in das Formular geladenen Default-Werte übernommen werden.
            oldVal = "";
          }

          kvm.log(
            "Vergleiche " +
              attr.get("form_element_type") +
              " Attribut: " +
              attrName +
              " " +
              oldVal +
              " (" +
              typeof oldVal +
              ") vs. " +
              newVal +
              "(" +
              typeof newVal +
              "))"
          );

          if (oldVal != newVal) {
            kvm.log("Änderung in Attribut " + attrName + " gefunden.", 3);
            //kvm.deb("Änderung in Attribut " + key + " gefunden.");
            //            activeFeature.set(key, newVal); Wird jetzt in afterUpdateDataset ausgeführt mit feature.updateChanges

            return {
              key: attrName,
              oldVal: oldVal,
              newVal: newVal,
              type: attr.getSqliteType(),
            };
          }
        }
        // }.bind({ geometry_attribute: this.get("geometry_attribute"), id_attribute: this.get("id_attribute") })
      })
      .filter((change) => change);

    return changes;
  }

  /**
   * This function runs the startFunc with the bound strategy as context
   */
  runStrategy(startFunc) {
    //console.log('runStrategy with context: %o', this);
    startFunc();
  }

  /**
   * Function create a dataset in the local database and
   * create the appropriated delta dataset in the deltas table
   * @param array changes Data from the activeFeature for the new dataset
   * @param function The callback function for success
   */
  runInsertStrategy() {
    //console.log('runInsertStrategy');
    // const strategy = {
    //     context: this,
    //     succFunc: "backupDataset",
    //     next: {
    //         succFunc: "createDataset",
    //         next: {
    //             succFunc: "writeDelta",
    //             next: {
    //                 succFunc: "readDataset",
    //                 next: {
    //                     succFunc: "afterCreateDataset",
    //                     succMsg: "Datensatz erfolgreich angelegt",
    //                 },
    //             },
    //         },
    //     },
    // };
    // //    console.log('runInsertStrategy uebergebe strategy: %s', JSON.stringify(strategy));

    // this.runStrategy(this[strategy.succFunc].bind(strategy));
    // return true;

    const changes = this.getAllChanges("insert");
    if (changes?.length > 0) {
      const delta = this.getInsertDelta(changes);
      LayerDBJobs.runInsert(this, delta)
        .then((rs) => {
          // console.log("resolved runInsertStrategy");
          this.afterCreateDataset(rs);
        })
        .catch((reason) => {
          kvm.msg("Etwas ist schief gegangen: " + JSON.stringify(reason));
        });
    }
  }

  /**
   * Function copy a dataset with endet = current date as a backup of activeFeature
   * if not allready exists
   * @param object strategy Object with context and information about following processes
   */
  backupDataset() {
    // console.log("backupDataset");
    const layer = <Layer>this.context,
      table = layer.getSqliteTableName(),
      tableColumns = layer.getTableColumns(),
      id_attribute = layer.get("id_attribute"),
      id = layer.activeFeature.getFeatureId(),
      sql =
        "\
          INSERT INTO " +
        table +
        "(" +
        tableColumns.join(", ") +
        ",\
            endet\
          )\
          SELECT " +
        tableColumns.join(", ") +
        ", '" +
        kvm.now() +
        "'\
          FROM " +
        table +
        "\
          WHERE\
            " +
        id_attribute +
        " = '" +
        id +
        "' AND\
            (\
              SELECT " +
        id_attribute +
        "\
              FROM " +
        table +
        "\
              WHERE\
                " +
        id_attribute +
        " = '" +
        id +
        "' AND\
                endet IS NOT NULL\
            ) IS NULL\
        ";

    //console.log('Backup vorhandenen Datensatz mit sql: %o', sql);
    this.next.context = layer;
    kvm.db.executeSql(
      sql,
      [],
      layer[this.next.succFunc].bind(this.next),
      function (err) {
        // console.log("Fehler", err);
        kvm.msg(
          "Fehler beim Ausführen von " +
            sql +
            " in backupDataset! Fehler: " +
            (<any>err).code +
            "\nMeldung: " +
            err.message,
          "Fehler"
        );
      }
    );
  }

  createDataset(rs) {
    //console.log('insertDataset rs: %o', rs);
    const layer = <Layer>this.context;
    let changes = layer.collectChanges("insert");
    let imgChanges = changes.filter(function (change) {
        return $.inArray(change.key, layer.getDokumentAttributeNames()) > -1;
      }),
      delta: any = {},
      sql = "";

    if (imgChanges.length == 0) {
      //console.log('no imgChanges');
    } else {
      layer.createImgDeltas(imgChanges);
    }

    changes = layer.addAutoChanges(changes, "insert");
    delta = layer.getInsertDelta(changes);
    sql = delta.delta;

    this.next.context = layer;
    this.next.delta = delta;
    this.next.changes = changes;
    //console.log('createDataset with sql: %s', sql);
    // console.log("Funktion nach crateDataset: %s", this.next.succFunc);
    kvm.db.executeSql(
      sql,
      [],
      layer[this.next.succFunc].bind(this.next),
      (err) => {
        let msg = `Fehler beim Anlegen des Datensatzes mit ${sql}! Fehler: ${
          (<any>err).code
        } Meldung: ${err.message}`;
        // console.log(msg);
        kvm.msg(msg, "Fehler");
      }
    );
  }

  /**
   * Function, die nach dem erfolgreichen Eintragen eines INSERT - Deltas Entrages ausgeführt werden soll
   */
  afterCreateDataset(rs) {
    console.log("afterCreateDataset");

    //console.log("set data for activeFeature: %o", rs.rows.item(0));
    //console.log("with geom: %o", rs.rows.item(0).geom);
    this.activeFeature.setData(rs.rows.item(0));
    this.activeFeature.new = false;
    this.addActiveFeature();
    kvm.msg(this.succMsg, "Hinweis");

    if (this.hasGeometry) {
      this.saveGeometry(this.activeFeature);
    }
    if (kvm.config.newAfterCreate) {
      console.log("option newAfterCreate is on");
      this.newFeature();
    } else {
      this.loadFeatureToView(this.activeFeature);
      kvm.showNextItem(kvm.config.viewAfterCreate, this);
    }
    // kvm.closeSperrDiv(`${this.title}: Datensatz gespeichert.`);
    kvm.closeSperrDiv();

    // kvm.showItem($("#formular").is(":visible") ? "dataView" : "map");
    // $(".popup-aendern-link").show();
    // $("#saveFeatureButton").toggleClass("active-button inactive-button");
    // kvm.controller.mapper.clearWatch();
  }

  /**
   * Function make an backup of the dataset if not exists allready,
   * update it in the local database and
   * create the appropriated delta dataset in the deltas table
   * @param array changes Data from the activeFeature for the update
   * @param function The callback function for success
   */
  runUpdateStrategy() {
    //console.log('runUpdateStrategy');
    // const strategy = {
    //     context: this,
    //     succFunc: "backupDataset",
    //     next: {
    //         succFunc: "updateDataset",
    //         next: {
    //             succFunc: "writeDelta",
    //             next: {
    //                 succFunc: "readDataset",
    //                 next: {
    //                     succFunc: "afterUpdateDataset",
    //                     succMsg: "Datensatz erfolgreich aktualisiert",
    //                 },
    //             },
    //         },
    //     },
    // };
    // //    console.log('runUpdateStrategy uebergebe strategy: %s', JSON.stringify(strategy));

    // this.runStrategy(this[strategy.succFunc].bind(strategy));
    // return true;

    const changes = this.getAllChanges("insert");
    if (changes?.length > 0) {
      const delta = this.getUpdateDelta(changes);
      LayerDBJobs.runUpdate(this, delta)
        .then((rs) => {
          // console.log("resolved runUpdateStrategy");
          this.afterUpdateDataset(rs);
        })
        .catch((reason) => {
          kvm.msg("Etwas ist schief gegangen: " + JSON.stringify(reason));
        });
    }
  }

  getAllChanges(type: "update" | "insert") {
    let changes = this.collectChanges(type);

    if (changes.length == 0) {
      const msg =
        "Keine Änderungen! Zum Abbrechen verwenden Sie den Button neben Speichen.";
      kvm.closeSperrDiv(msg);
      //kvm.msg(msg);
    } else {
      kvm.alog("Changes gefunden: ", changes, 4);
      const dokumentAttributeNames = this.getDokumentAttributeNames();
      const imgChanges = changes.filter((change) => {
        return $.inArray(change.key, dokumentAttributeNames) > -1;
      });

      if (imgChanges.length == 0) {
        //console.log('no imgChanges');
      } else {
        this.createImgDeltas(imgChanges);
      }
      changes = this.addAutoChanges(changes, type);

      return changes;
    }
  }

  updateDataset(rs: SQLitePlugin.Results) {
    // console.log("updateDataset rs: %o", rs);
    try {
      const layer: Layer = <Layer>this.context;
      let changes = layer.collectChanges("update");
      const delta: any = {},
        sql = "";

      if (changes.length == 0) {
        const msg =
          "Keine Änderungen! Zum Abbrechen verwenden Sie den Button neben Speichen.";
        kvm.closeSperrDiv(msg);
        //kvm.msg(msg);
      } else {
        kvm.alog("Changes gefunden: ", changes, 4);
        const imgChanges = changes.filter(function (change) {
          return $.inArray(change.key, layer.getDokumentAttributeNames()) > -1;
        });

        if (imgChanges.length == 0) {
          //console.log('no imgChanges');
        } else {
          layer.createImgDeltas(imgChanges);
        }

        //kvm.log("Layer.updateDataset addAutoChanges", 4);
        changes = layer.addAutoChanges(changes, "update");

        const delta = layer.getUpdateDelta(changes);
        const sql = delta.delta + " AND endet IS NULL";

        this.next.context = layer;
        this.next.delta = delta;
        this.next.changes = changes;
        kvm.db.executeSql(
          sql,
          [],
          layer[this.next.succFunc].bind(this.next),
          function (err) {
            kvm.msg(
              "Fehler beim Aktualisieren des Datensatzes! Fehler: " +
                (<any>err).code +
                "\nMeldung: " +
                err.message,
              "Fehler"
            );
          }
        );
      }
    } catch (ex) {
      console.error("Error in updateDataset", ex);
    }
  }

  /**
   * Function add auto values for attributes of formular_element_type User, UserID and Time and attributes
   * with name user_name, updated_at_client and created_at pending on action and option insert or update
   * @param array changes The array of changes made in formular
   * @param string action insert or update used to determine if auto value shall be created pending on option of the attribute
   * @return array The array of changes including the auto values
   */
  addAutoChanges(
    changes: AttributteDelta[],
    action: string
  ): AttributteDelta[] {
    kvm.log("Layer.addAutoChanges mit action " + action, 4);
    const changesKeys = $.map(changes, function (change) {
      return change.key;
    });
    const results = changes.slice();
    for (let i = 0; i < this.attributes.length; i++) {
      const attr = this.attributes[i];
      if (
        attr.isAutoAttribute(action) &&
        !changesKeys.includes(attr.get("name"))
      ) {
        console.log(
          "getAutoValue from attribute: %s formfield: %s",
          attr.get("name"),
          attr.formField.constructor.name
        );
        try {
          const autoValue = (<any>attr.formField).getAutoValue();
          kvm.log("Ergänze Autowert: " + attr.get("name") + " = " + autoValue);
          results.push({
            key: attr.get("name"),
            oldVal: kvm.activeLayer.activeFeature.getDataValue(
              attr.get("name")
            ),
            newVal: autoValue,
            type: attr.getSqliteType(),
          });
        } catch ({ name, message }) {
          kvm.msg(
            "Fehler beim Erzeugen des Autowertes für Attribut " +
              attr.get("name") +
              " im Formularfeld vom Typ: " +
              attr.formField.constructor.name +
              "! Fehlertyp: " +
              name +
              " Fehlermeldung: " +
              message
          );
        }
      }
    }

    // kvm.alog("Add autoChanges: ", autoChanges, 4);
    // const result = changes.concat(autoChanges);
    kvm.alog("Return:", results, 4);
    return results;
  }

  /*
   * Function, die nach dem erfolgreichen Eintragen eines UPDATE ausgeführt werden soll
   * @param result set rs Resultset from a readDataset query
   */
  afterUpdateDataset(rs: SQLitePlugin.Results) {
    // console.log("afterUpdateDataset rs", rs);
    try {
      this.activeFeature.setData(rs.rows.item(0));
      this.activeFeature.updateListElement();
      if (this.hasGeometry) {
        this.saveGeometry(this.activeFeature);
      }
      this.loadFeatureToView(this.activeFeature, { editable: false });
      kvm.showNextItem(kvm.config.viewAfterUpdate, this);

      $(".popup-aendern-link").show();
      $("#saveFeatureButton").toggleClass("active-button inactive-button");
      kvm.controller.mapper.clearWatch();
      $("#numDatasetsText_" + this.getGlobalId()).html(
        `${this._features.size}`
      );
      //kvm.closeSperrDiv(`${layer.title}: Update des Datensatzes erfolgreich beendet.`);
      kvm.closeSperrDiv();
    } catch (ex) {
      console.error("Error in afterUpdateDataset", ex);
    }
  }

  /**
   * Function make an backup of the dataset if not exists allready,
   * delete it in the local database and
   * create and remove the appropriated delta datasets in the deltas table
   * @param function The callback function for success
   */
  runDeleteStrategy() {
    //console.log('runDeleteStrategy');
    const strategy = {
      context: this,
      succFunc: "backupDataset",
      next: {
        succFunc: "deleteDataset",
        next: {
          succFunc: "writeDelta",
          next: {
            succFunc: "deleteDeltas",
            other: "insert",
            next: {
              succFunc: "afterDeleteDataset",
              succMsg:
                "Datensatz erfolgreich gelöscht! Er kann wieder hergestellt werden.",
            },
          },
        },
      },
    };
    //    console.log('runDeleteStrategy uebergebe strategy: %s', JSON.stringify(strategy));

    this.runStrategy(this[strategy.succFunc].bind(strategy));
    return true;
  }

  deleteDataset(rs) {
    //console.log('deleteDataset');
    let layer = this.context;

    // ToDo pk: Delete all sub featues
    const globalSubLayerId = layer.getGlobalSubLayerId();
    if (globalSubLayerId) {
      console.log("Delete subfeatures of Dataset");
    }

    let delta = layer.getDeleteDelta();
    let sql = delta.delta + " AND endet IS NULL";

    // ToDo: Vor dem Löschen prüfen ob noch andere Features davon abhängig sind
    // und wenn ja, warnen, dass diese auch gelöscht werden wenn der Datensatz
    // gelöscht wird und wenn Bestätigung das auch cascadiert bis zum letzten
    // abhängigen tun.
    // ToDo: Fragen ob auch die anhängigen Bilder gelöscht werden sollen?
    // Wenn ja, auch die imgDeltas anpassen.

    this.next.context = layer;
    this.next.delta = delta;
    //console.log('SQL zum Löschen des Datensatzes: %s', sql);
    //console.log('Nächste Funktion nach Datenbankabfrage: %s', this.next.succFunc);
    kvm.db.executeSql(
      sql,
      [],
      layer[this.next.succFunc].bind(this.next),
      function (err) {
        kvm.msg(
          "Fehler beim Löschen des Datensatzes!\nFehlercode: " +
            (<any>err).code +
            "\nMeldung: " +
            err.message,
          "Fehler"
        );
      }
    );
  }

  /**
   * function called after writing a delete Statement into Client sqlite DB
   * Do every thing to delete the feature, geometry, Layer and listelement
   *
   */
  afterDeleteDataset(rs) {
    //console.log('afterDeleteDataset');
    let layer = <Layer>this.context;
    let layerId = layer.activeFeature.layerId;
    let parentLayerId = layer.parentLayerId;
    let parentFeatureId = layer.parentFeatureId;

    if (layer.hasGeometry) {
      //console.log('Remove Editable Geometrie');
      kvm.controller.mapper.removeEditable(layer.activeFeature);

      //console.log('Löscht Layer mit layerId: %s aus Layergroup', layer.activeFeature.layerId);
      layer.layerGroup.removeLayer(layerId);
    }

    //console.log('Löscht Feature aus FeatureList : %o', layer.activeFeature);
    $("#" + layer.activeFeature.id).remove();

    //console.log('Lösche Feature aus features Array des activeLayer');
    layer.removeFeature(layer.activeFeature);

    //console.log('Lösche activeFeature')
    delete layer.activeFeature;

    if (parentLayerId && parentFeatureId) {
      kvm.editFeature(parentLayerId, parentFeatureId);
    } else {
      //console.log('Wechsel die Ansicht zur Featurelist.');
      kvm.showItem(!$("#map").is(":visible") ? "featurelist" : "map");
      //console.log('Scroll die FeatureListe nach ganz oben');
      kvm.showNextItem(kvm.config.viewAfterDelete, layer);
    }

    //console.log('Blende Sperrdiv aus');
    // Sperrdiv entfernen
    kvm.closeSperrDiv(`${layer.title}: Datensatz erfolgreich gelöscht.`);
    //kvm.msg(this.succMsg, "Hinweis");
  }

  /**
   * write delta dataset to database expect:
   * for delete delta if insert delta exists or
   * for insert delta if delte delta exists
   */
  writeDelta(rs: SQLitePlugin.Results) {
    try {
      //console.log('writeDelta');
      //console.log('layer: %o', this.context);
      // console.log("writeDelta: %o", this.delta);
      //console.log('changes: %o', this.changes);
      const layer = <Layer>this.context;
      const delta = this.delta;
      const changes = this.changes;
      const sql = `
      INSERT INTO ${layer.getSqliteTableName()}_deltas (
        type,
        change,
        delta,
        created_at
      )
      SELECT
        '${delta.type}' AS type,
        '${delta.change}' AS change,
        '${layer
          .underlineToPointName(
            delta.delta,
            layer.get("schema_name"),
            layer.get("table_name")
          )
          .replace(/\'/g, "''")}' AS delta,
        '${kvm.now()}' AS created_at
      WHERE
        (
          SELECT
            count(*)
          FROM
            ${layer.getSqliteTableName()}_deltas
          WHERE
            INSTR(delta, '${layer.activeFeature.getFeatureId()}') > 0 AND
            type = 'sql' AND
            (
              (change = 'insert' AND '${delta.change} ' = 'delete') OR
              (change = 'delete' AND '${delta.change}' = 'insert')
            )
        ) = 0
    `;

      this.next.context = layer;
      //console.log("SQL zum Schreiben des Deltas: %s", sql);
      console.log("Funktion nach schreiben des Deltas: %s", this.next.succFunc);
      kvm.db.executeSql(
        sql,
        [],
        layer[this.next.succFunc].bind(this.next),
        function (err) {
          console.log(
            `Fehler beim Schreiben der Deltas ${sql} Fehler: ${JSON.stringify(
              err
            )}`
          );
          kvm.msg(
            `Fehler beim Schreiben der Deltas ${sql} Fehler: ${JSON.stringify(
              err
            )}`,
            "Änderung Speichern"
          );
        }
      );
    } catch (ex) {
      console.error("Error in writeDelta", ex);
    }
  }

  runRestoreStrategy() {
    //console.log('runRestoreStrategy');
    var strategy = {
      context: this,
      succFunc: "deleteDataset",
      next: {
        succFunc: "restoreDataset",
        next: {
          succFunc: "writeDelta",
          next: {
            succFunc: "deleteDeltas",
            next: {
              succFunc: "afterDeleteDataset",
              succMsg:
                "Datensatz erfolgreich wiederhergestellt! Wechseln Sie den Filter um ihn zu sehen.",
            },
          },
        },
      },
    };

    this.runStrategy(this[strategy.succFunc].bind(strategy));
    return true;
  }

  restoreDataset(rs) {
    //console.log('restoreDataset');
    //console.log('context %o', this.context);
    //console.log('attr gefiltert: %o', );
    const layer = this.context;
    const id_attribute = layer.get("id_attribute");
    const id = layer.activeFeature.id;
    const sql = `
			UPDATE ${layer.getSqliteTableName()}
			SET endet = NULL
			WHERE
				${id_attribute} = '${id}' AND
				endet IS NOT NULL
		`;
    const changes = $.map(
      layer.attributes.filter(function (attr) {
        return attr.get("saveable") == "1";
      }),
      function (attr) {
        const key = attr.get("name");
        return {
          key: key,
          oldVal: null,
          newVal: layer.activeFeature.getDataValue(key),
          type: attr.getSqliteType(),
        };
      }
    );

    const delta = layer.getInsertDelta(changes);

    this.next.context = layer;
    this.next.delta = delta;
    //console.log('SQL zum Wiederherstellen des Datensatzes: %s', sql);
    //console.log('Nächste Funktion nach Datenbankabfrage: %s', this.next.succFunc);
    kvm.db.executeSql(
      sql,
      [],
      layer[this.next.succFunc].bind(this.next),
      function (err) {
        kvm.msg(
          "Fehler beim Wiederherstellen des Datensatzes! Fehler: " +
            (<any>err).code +
            "\nMeldung: " +
            err.message,
          "Fehler"
        );
      }
    );
  }

  /**
   * read feature data from database and call function this.next.succFunc
   * @param resultset rs Result set from former function is here not used
   */
  readDataset(rs = null) {
    try {
      console.log("readDataset");
      //console.log('layer: %o', this.context);
      const layer = <Layer>this.context;
      const id_attribute = layer.get("id_attribute");
      const featureId = layer.activeFeature.getFeatureId();
      const sql = layer.extentSql(layer.settings.query, [
        `${id_attribute} = '${featureId}'`,
        `${layer.settings.table_alias}.endet IS NULL`,
      ]);
      console.log("SQL zum lesen des Datensatzes: ", sql);

      // let sql = `
      //       SELECT
      //         ${layer.getSelectExpressions().join(", ")}
      //       FROM
      //         ${layer.getSqliteTableName()}
      //       WHERE
      // 				${id_attribute} = '${id}'
      // 	`;

      this.next.context = layer;
      //console.log("Funktion nach readDataset: %s", this.next.succFunc);
      kvm.db.executeSql(
        sql,
        [],
        layer[this.next.succFunc].bind(this.next),
        function (err) {
          kvm.msg(
            "Fehler beim Lesen des Datensatzes aus der Datenbank! Fehler: " +
              (<any>err).code +
              "\nMeldung: " +
              err.message,
            "Fehler"
          );
        }
      );
    } catch (ex) {
      console.error("Fehler in readDataset", ex);
    }
  }

  /**
   * function return insert delta based on changes of a dataset
   * @param array changes
   * @return object The insert delta object.
   */
  getInsertDelta(changes) {
    //kvm.log("Erzeuge INSERT Delta", 3);
    // var delta = {
    // 	type: "sql",
    // 	change: "insert",
    // 	delta: `
    // 		INSERT INTO ${this.getSqliteTableName()} (
    // 			${$.map(changes, function (change) { return change.key; }).join(", ")},
    // 			${this.get("id_attribute")}
    // 		)
    // 		VALUES (
    // 			${$.map(changes, function (change) {
    // 				if (change.newVal == null) {
    // 					return "null";
    // 				}
    // 				if (["TEXT", "DATE"].includes(change.type)) {
    // 					return "'" + change.newVal + "'";
    // 				} else {
    // 					return change.newVal;
    // 				}
    // 			}).join(", ")}, '${this.activeFeature.id}'
    // 		)
    // 	`
    // };
    const delta = {
      type: "sql",
      change: "insert",
      delta: `
        INSERT INTO ${this.get("schema_name")}_${this.get("table_name")} (
          ${$.map(changes, function (change) {
            return change.key;
          }).join(", ")},
          ${this.get("id_attribute")}
        )
        VALUES (
          ${$.map(changes, function (change) {
            if (change.newVal == null) {
              return "null";
            }
            if (["TEXT", "DATE"].includes(change.type)) {
              return "'" + change.newVal + "'";
            } else {
              return change.newVal;
            }
          }).join(", ")},
          '${this.activeFeature.getFeatureId()}'
        )
      `,
    };

    kvm.log("INSERT Delta: " + JSON.stringify(delta), 3);
    return delta;
  }

  /**
   * Create update delta
   */
  getUpdateDelta(changes: AttributteDelta[]) {
    //kvm.log("Erzeuge SQL für UPDATE Delta", 3);
    const delta = {
      type: "sql",
      change: "update",
      delta: `
        UPDATE ${this.getSqliteTableName()}
        SET
 	      	${$.map(changes, function (change) {
            if (change.newVal == null) {
              return change.key + " = null";
            }
            if (["TEXT", "DATE"].includes(change.type)) {
              return change.key + " = '" + change.newVal + "'";
            } else {
              return change.key + " = " + change.newVal;
            }
          }).join(", ")}
        WHERE
        	${this.get("id_attribute")} = '${this.activeFeature.getFeatureId()}'
      `,
    };
    kvm.log("UPDATE Delta sql: " + JSON.stringify(delta), 3);
    return delta;
  }

  /**
   * Create delete delta
   */
  getDeleteDelta() {
    //kvm.log("Erzeuge SQL für DELETE Delta", 3);
    const delta = {
      type: "sql",
      change: "delete",
      delta: `
        DELETE FROM ${this.getSqliteTableName()}
        WHERE
          ${this.get("id_attribute")} = '${this.activeFeature.getFeatureId()}'
      `,
    };
    kvm.log("DELETE Delta sql: " + JSON.stringify(delta), 3);
    return delta;
  }

  /**
   * Delete all sql update deltas from activeFeature and other (insert or delete) deltas
   * @param string this.other Delete also this other deltas
   */
  deleteDeltas(rs) {
    console.log("deleteDeltas");
    const layer = this.context;
    let sql = "";

    this.next.context = layer;
    sql = `
      DELETE FROM ${layer.getSqliteTableName()}_deltas
      WHERE
        type = 'sql' AND
        (change = 'update' OR change = '${this.other}') AND
        INSTR(delta, '${layer.activeFeature.getId()}') > 0
    `;
    console.log("Lösche Deltas mit sql: %s", sql);
    kvm.db.executeSql(
      sql,
      [],
      layer[this.next.succFunc].bind(this.next),
      function (err) {
        kvm.msg(
          "Fehler beim Löschen der Deltas!\nFehlercode: " +
            (<any>err).code +
            "\nMeldung: " +
            err.message,
          "Fehler"
        );
      }
    );
  }

  createImgDeltas(changes: AttributteDelta[]) {
    //kvm.log("Layer.createImgDeltas with changes: " + JSON.stringify(changes), 4);
    $.each(changes, (index, change) => {
      const img_old: string[] =
        change.oldVal && change.oldVal != "null"
          ? change.oldVal.slice(1, -1).split(",")
          : [];
      const img_new: string[] = change.newVal
        ? change.newVal.slice(1, -1).split(",")
        : [];
      console.log("img_old %o", img_old);
      console.log("img_new: %o", img_new);

      $.map(img_new, (img) => {
        //console.log(img + ' in ' + img_old.join(', ') + '?');
        if (img_old.indexOf(img) < 0) {
          //console.log('neues Image');
          const context = {
            context: this,
            delta: {
              type: "img",
              change: "insert",
              delta: img,
            },
            next: {
              succFunc: "showMessage",
              // msg: img + " als neues Bild eingetragen.",
              msg: "",
              title: "Datenbank",
            },
          };
          //console.log('context: %o', context);
          this.writeDelta.bind(context)();
        }
      });

      $.map(
        img_old,
        function (img) {
          //console.log(img + ' in ' + img_new.join(', ') + '?');
          if (img_new.indexOf(img) < 0) {
            // Remove insert delta of the image if exists, otherwise insert a delete delta for the img
            let sql = `
                SELECT
                  *
                FROM
                  ${this.getSqliteTableName()}_deltas
                WHERE
                  change = 'insert' AND
                  INSTR(delta, '${img}') > 0
              `;
            //kvm.log("Layer.createImgDeltas Abfrage ob insert für Bild in deltas table existiert mit sql: " + sql, 3);
            kvm.db.executeSql(
              sql,
              [],
              function (rs) {
                //kvm.log("Layer.createImgDeltas Abfrage ob insert für Bild existiert erfolgreich, rs: " + JSON.stringify(rs), 4);
                var numRows = rs.rows.length;

                //kvm.log("numRows: " + numRows, 4);
                if (numRows > 0) {
                  // lösche diesen Eintrag
                  sql = `
                      DELETE FROM ${this.getSqliteTableName()}_deltas
                      WHERE
                        change = 'insert' AND
                        INSTR(delta, '${img}') > 0
                    `;
                  //kvm.log("Layer.createImgDeltas: insert delta vorhanden, Lösche diesen mit sql: " + sql, 4);
                  kvm.db.executeSql(
                    sql,
                    [],
                    function (rs) {
                      //kvm.log("Löschen des insert deltas erfolgreich", 3);
                    },
                    function (error) {
                      // TODO
                      // navigator.notification.alert("Fehler beim Löschen der Bildänderung!\nFehlercode: " + error.code + "\nMeldung: " + error.message);
                      navigator.notification.alert(
                        "Fehler beim Löschen der Bildänderung!\nFehlercode: " +
                          (<any>error).code +
                          "\nMeldung: " +
                          error.message,
                        undefined
                      );
                    }
                  );
                } else {
                  //kvm.log("Layer.createImgDeltas: kein insert delta vorhanden. Trage delete delta ein.", 3);
                  // Add delete of image to deltas table
                  this.writeDelta.bind({
                    context: this,
                    delta: {
                      type: "img",
                      change: "delete",
                      delta: img,
                    },
                    next: {
                      succFunc: "showMessage",
                      msg: "",
                      // msg: "Löschung von Bild " + img + " eingetragen.",
                      title: "Datenbank",
                    },
                  })();
                }
              }.bind(this),
              function (error) {
                // TODO
                // navigator.notification.alert("Fehler bei der Speicherung der Änderungsdaten für das Bild in der delta-Tabelle!\nFehlercode: " + error.code + "\nMeldung: " + error.message);
                navigator.notification.alert(
                  "Fehler bei der Speicherung der Änderungsdaten für das Bild in der delta-Tabelle!\nFehlercode: " +
                    (<any>error).code +
                    "\nMeldung: " +
                    error.message,
                  undefined
                );
              }
            );
          }
        }.bind(this)
      );
    });
  }

  showMessage() {
    kvm.msg(this.msg, this.title);
  }

  /*
   * exec sql in layer table and read Data again
   *
   * ToDo: Hier nicht alle Daten neu laden, sondern nur den gänderten Datensatz in Liste, Form und Karte aktualisieren
   * bzw. auf den Stand bringen als wäre er neu geladen. Wird weiter oben schon in callback von click on saveFeatureButton gemacht.
   *
   */
  execSql(sql, successFunc) {
    console.log(
      this.get("title") +
        ": Führe Änderungen vom Server auf dem Client aus: %s",
      sql
    );
    kvm.db.executeSql(
      sql,
      [],
      successFunc.bind(this),
      function (error) {
        navigator.notification.confirm(
          "Fehler bei der Speicherung der Änderungen aus dem Formular!\nFehlercode: " +
            error.code +
            "\nMeldung: " +
            error.message,
          function (buttonIndex) {
            // ToDo handling choices after error
          },
          "Datenbank",
          ["Abbruch"]
        );
      }.bind(this)
    );
  }

  execServerDeltaSuccessFunc(rs) {
    console.log(this.context.get("title") + ": execServerDeltaSuccessFunc");
    this.context.numExecutedDeltas++;
    if (this.context.numExecutedDeltas == this.context.numReturnedDeltas) {
      var newVersion = parseInt(
        this.response.syncData[this.response.syncData.length - 1]
          .push_to_version
      );
      this.context.set("syncVersion", newVersion);
      this.context.saveToStore();
      this.context.clearDeltas("sql");
      console.log(
        this.context.get("title") +
          ": call readData at the end of execServerDeltaSuccessFunc"
      );
      kvm.writeLog(
        `Layer ${this.context.get("title")}: ${
          this.context.numExecutedDeltas
        } Deltas vom Server auf Client ausgeführt.`
      );
      kvm.msg(
        `Synchronisierung des Layers ${this.context.get(
          "title"
        )} erfolgreich abgeschlossen! Die aktuelle Version ist: ${newVersion}`
      );
      this.context.readData($("#limit").val(), $("#offset").val());
    } else {
      //console.log(this.context.numExecutedDeltas + '. Delta ausgeführt! Weiter ...');
    }
  }

  // ToDo getInsertDelta schreiben und ggf. auch in createDelta verwenden.
  // Prüfen ob values auch so wie in collectChanges erzeugt werden können oder dort wieder verwendet werden kann.
  // was wenn ein changes Array erzeugt wird und damit writeDelta aufgerufen wird bei einem restore Dataset. Muss da nicht
  // immer ein neuer Datensatz her? Also statt endet auf null setzen immer einen neuen erzeugen und dafür den mit endet = Datum immer löschen.
  // prüfen wie sich die ganze Geschichte auf img auswirkt.
  // prüfen wie das mit dem user_name ist, der darf nach einem Rückgängig machen nicht mit drin sein, wenn vorher keiner drin stand.

  /**
   * function create the listElement with functions buttons for layer settings page,
   * bind the events on functions buttons
   * add layer in layer control of the map
   * save layer object in kvm.layers array and
   * Do not read data for listing and mapping
   */
  appendToApp() {
    kvm.tick(`${this.title}:<br>&nbsp;&nbsp;Füge Layer zur App hinzu.`);
    try {
      const index = kvm.activeStelle.getLayerDrawingIndex(this);
      if (index == 0) {
        $("#layer_list").prepend(this.getListItem());
      } else {
        //ToDo hier die Funktion einbauen, die an Hand des index die richtige Layer id findet.
        $(this.getListItem()).insertAfter(
          "#layer_" + kvm.activeStelle.getLayerDrawingGlobalId(index - 1)
        );
      }
      this.bindLayerEvents(this.getGlobalId());
      if (this.hasGeometry) {
        //    kvm.map.addLayer(this.layerGroup);
        kvm.controls.layers.addOverlay(
          this.layerGroup,
          '<span id="layerCtrLayerDiv_' +
            this.getGlobalId() +
            '">' +
            this.title +
            "</span>"
        );
      }
      kvm.addLayer(this);
    } catch ({ name, message }) {
      kvm.msg(
        `Fehler beim Hinzufügen des Layers ${this.title} zur Anwendung! Fehlertyp: ${name} Fehlermeldung: ${message}`
      );
    }
  }

  /*
   * Erzeugt die Events für die Auswahl, Synchronisierung und das Zurücksetzen von Layern
   */
  // TODO
  bindLayerEvents(layerGlobalId) {
    // console.log("bindLayerEvents for layerGlobalId: %s", layerGlobalId);
    // Schaltet alle layer function button events zunächst aus.
    $(".layer-function-button").off();
    //
    // Schaltet einen anderen Layer und deren Sync-Funktionen aktiv
    // Die Einstellungen des Layers werden aus dem Store geladen
    // Die Featureliste und Kartenelemente werden falls vorhanden aus der Datenbank geladen.
    //
    $(
      "input[name=activeLayerId]" +
        (layerGlobalId ? "[value='" + layerGlobalId + "']" : "")
    ).on("change", function (evt) {
      const globalId = (<any>evt.target).value;
      const layer = kvm.getLayer(globalId);

      // unselect activeLayer
      // unselect activeFeature
      kvm.map.closePopup();
      kvm.store.setItem("layerFilter", "");
      kvm.store.setItem("sortAttribute", "");
      kvm.tick(`${layer.title}:<br>&nbsp;&nbsp;Setze Layer aktiv.`);
      layer.activate(); // include loading filter, sort, data view, form and readData
      // kvm.showItem('featurelist');
    });

    $("#layer-functions-button_" + layerGlobalId).on("click", function (evt) {
      var target = $(evt.target);
      console.log(
        "click on layer-functions-button von div %o",
        target.parent().attr("id")
      );
      target.parent().children().filter(".layer-functions-div").toggle();
      target.toggleClass("fa-ellipsis-vertical fa-square-xmark");
    });

    $("#auto_sync_" + layerGlobalId).on("change", function (evt) {
      var target = $(evt.target);
      console.log("change on checkbox %o", target.attr("id"));
      const layer = kvm.activeLayer;
      layer.set("autoSync", target.is(":checked"));
      layer.saveToStore();
    });

    $(
      ".sync-layer-button" +
        (layerGlobalId > 0
          ? "[id='syncLayerButton_" + layerGlobalId + "']"
          : "")
    ).on("click", function (evt) {
      const layer = kvm.activeLayer;
      let target = $(evt.target);

      if (target.hasClass("fa")) {
        target = target.parent();
      }

      $("#sperr_div_content").html("");

      // Sichere Datenbank
      if (target.hasClass("inactive-button")) {
        kvm.msg(
          "Keine Internetverbindung! Kann Layer jetzt nicht synchronisieren."
        );
      } else {
        $("#syncLayerIcon_" + layer.getGlobalId()).toggleClass(
          "fa-refresh fa-spinner fa-spin"
        );
        $("#sperr_div").show();

        if (layer.runningSyncVersion == 0) {
          navigator.notification.confirm(
            "Daten vom Server holen. Danach können eigene Änderungen synchronisiert werden.",
            function (buttonIndex) {
              if (buttonIndex == 1) {
                // ja
                layer.requestData();
              } else {
                $("#syncLayerIcon_" + layer.getGlobalId()).toggleClass(
                  "fa-refresh fa-spinner fa-spin"
                );
                kvm.closeSperrDiv();
              }
            },
            "Layer mit Server synchronisieren",
            ["ja", "nein"]
          );
        } else {
          navigator.notification.confirm(
            "Jetzt lokale Datenbank sichern sowie Änderungen, falls vorhanden, zum Server schicken, Änderungen vom Server holen und lokal einspielen?",
            function (buttonIndex) {
              if (buttonIndex == 1) {
                // ja
                kvm.backupDatabase();
                layer.syncData();
                $("#syncImageIcon_" + layer.getGlobalId()).toggleClass(
                  "fa-upload fa-spinner fa-spin"
                );
                $("#sperr_div").show();
                layer.syncImages();
              } else {
                $("#syncLayerIcon_" + layer.getGlobalId()).toggleClass(
                  "fa-refresh fa-spinner fa-spin"
                );
                kvm.closeSperrDiv();
              }
            },
            "Layer mit Server synchronisieren",
            ["ja", "nein"]
          );
        }
      }
    });

    $(
      ".sync-images-button" +
        (layerGlobalId > 0
          ? "[id='syncImagesButton_" + layerGlobalId + "']"
          : "")
    ).on("click", function (evt) {
      const layer = kvm.activeLayer;
      let target = $(evt.target);

      if (target.hasClass("fa")) {
        target = target.parent();
      }

      if (target.hasClass("inactive-button")) {
        kvm.msg(
          "Keine Internetverbindung! Kann Bilder jetzt nicht synchronisieren."
        );
      } else {
        navigator.notification.confirm(
          "Bilder mit Server Synchronisieren?",
          function (buttonIndex) {
            if (buttonIndex == 1) {
              // ja
              $("#syncImageIcon_" + layer.getGlobalId()).toggleClass(
                "fa-upload fa-spinner fa-spin"
              );
              $("#sperr_div").show();
              layer.syncImages();
            }
            if (buttonIndex == 2) {
              // nein
              // Do nothing
            }
          },
          "",
          ["ja", "nein"]
        );
      }
    });

    $(
      ".clear-layer-button" +
        (layerGlobalId > 0
          ? "[id='clearLayerButton_" + layerGlobalId + "']"
          : "")
    ).on("click", function (evt) {
      var id = (<any>evt.target).value;
      const layer = kvm.activeLayer;

      if (layer.isEmpty()) {
        navigator.notification.confirm(
          "Layer ist schon geleert!",
          function (buttonIndex) {},
          "Datenbank",
          ["OK"]
        );
      } else {
        navigator.notification.confirm(
          "Alle lokale Daten und nicht hochgeladene Änderungen wirklich Löschen?",
          function (buttonIndex) {
            if (buttonIndex == 1) {
              // ja
              $("#clearLayerIcon_" + layer.getGlobalId()).toggleClass(
                "fa-ban fa-spinner fa-spin"
              );
              layer.clearData();
            }
            if (buttonIndex == 2) {
              // nein
              // Do nothing
            }
          },
          "",
          ["ja", "nein"]
        );
      }
    });

    $(
      ".reload-layer-button" +
        (layerGlobalId > 0
          ? "[id='reloadLayerButton_" + layerGlobalId + "']"
          : "")
    ).on("click", function (evt) {
      var id = (<any>evt.target).value;
      const layer = kvm.activeLayer;
      let target = $(evt.target);

      if (target.hasClass("fa")) {
        target = target.parent();
      }

      if (target.hasClass("inactive-button")) {
        kvm.msg("Keine Internetverbindung! Kann Layer jetzt nicht neu laden.");
      } else {
        navigator.notification.confirm(
          "Die Einstellungen des Layers neu laden und die Tabelle neu anlegen.",
          function (buttonIndex) {
            if (buttonIndex == 1) {
              // ja
              var layer = kvm.activeLayer;
              $("#reloadLayerIcon_" + layer.getGlobalId()).toggleClass(
                "fa-rotate fa-spinner fa-spin"
              );
              console.log("reload layer id: %s", layer.get("id"));
              kvm.activeStelle.reloadLayer(layer.get("id"));
            }
            if (buttonIndex == 2) {
              // nein
              // Do nothing
            }
          },
          "",
          ["ja", "nein"]
        );
      }
    });
    console.log(
      "Register event for styleLayerButton with layerId: ",
      layerGlobalId
    );
    /*
    $("#styleLayerButton_" + layerGlobalId).on("click", function (evt) {
      console.log("test");
    });
    */
    if (this.hasGeometry) {
      $(
        ".style-layer-button" +
          (layerGlobalId > 0
            ? "[id='styleLayerButton_" + layerGlobalId + "']"
            : "")
      ).on("click", function (evt) {
        const layerGlobalId =
          evt.target.getAttribute("value") ||
          evt.target.parentElement.getAttribute("value");
        console.log("click on style-layer-button id: ", layerGlobalId);
        $("#styleLayerDiv_" + layerGlobalId).toggle();
      });

      $(
        "#styleLayerDiv_" +
          layerGlobalId +
          " input, #styleLayerDiv_" +
          layerGlobalId +
          " select"
      ).on("change", function (evt) {
        const globalLayerId =
          evt.target.parentElement.parentElement.parentElement.getAttribute(
            "value"
          );
        console.log(
          "Input Feld %s in style-layer-div %s changed",
          evt.target.getAttribute("name"),
          "styleLayerDiv_" + globalLayerId
        );
        $("#styleLayerOkButton_" + globalLayerId).show();
      });

      $("#useCustomStyle_" + layerGlobalId).on("change", function (evt) {
        const globalLayerId =
          evt.target.parentElement.parentElement.parentElement.getAttribute(
            "value"
          );
        console.log("#useCustomStyle_" + layerGlobalId + " Checkbox changed");
        $(".style-layer-setting-div").toggleClass("visible hidden");
      });

      $("#styleLayerOkButton_" + layerGlobalId).on("click", function (evt) {
        const globalLayerId = evt.currentTarget.getAttribute("value");
        console.log("click on style-layer-ok-button id: ", globalLayerId);
        ["color", "fillcolor", "width", "opacity", "fillOpacity"].forEach(
          function (formvar) {
            kvm.activeLayer.settings[formvar] = $(
              "#styleLayerDiv_" +
                globalLayerId +
                " input[name='" +
                formvar +
                "'], #styleLayerDiv_" +
                globalLayerId +
                " select[name='" +
                formvar +
                "']"
            ).val();
          }
        );
        kvm.activeLayer.settings.useCustomStyle = $(
          "#useCustomStyle_" + globalLayerId
        ).is(":checked");
        kvm.activeLayer.saveToStore();
        kvm.activeLayer.readData();
        $(evt.currentTarget).hide();
      });
    }

    $(
      ".info-layer-button" +
        (layerGlobalId > 0
          ? "[id='infoLayerButton_" + layerGlobalId + "']"
          : "")
    ).on("click", function (evt) {
      const layerGlobalId =
        evt.target.getAttribute("value") ||
        evt.target.parentElement.getAttribute("value");
      console.log("click on info-layer-button id: ", layerGlobalId);
      $("#infoLayerDiv_" + layerGlobalId).toggle();
    });
  }

  /**
   * Function remove layer from store, layer options list, remove from layer control, clear featurelist, map and kvm.layers array
   * Do not remove featurelist, because this will be updated wenn the new layer has been loaded
   * and wenn all layer has been removed a text will appear instead of the featurelist.
   * The layer that replace an active layer will also be set active
   * Called from Stelle.reloadLayer for activeLayer and requestLayers to load all layers of stelle
   */
  removeFromApp() {
    console.log("remove layer %s (%s)", this.get("title"), this.get("id"));
    //console.log('Entferne layer div aus layer options list.');
    $("#layer_" + this.getGlobalId()).remove();
    //		this.clearData(); Wenn die Tabelle gelöscht wurde, braucht man die Daten nicht mehr löschen.
    this.isLoaded = false;
    this.runningSyncVersion = 0;
    //console.log('Entferne layer aus layer control');
    kvm.controls.layers.removeLayer(this.layerGroup);
    //console.log('Entferne layer von map');
    kvm.map.removeLayer(this.layerGroup);
    //console.log('Lösche activeLayer von kvm layers array');
    kvm.removeLayer(this);
    //console.log('Lösche layer und seine id aus dem store');
    this.removeFromStore();
  }

  addActiveFeature() {
    this.addFeature(this.activeFeature);
    this.activeFeature.addListElement();
    $("#numDatasetsText_" + this.getGlobalId()).html(`${this._features.size}`);
  }

  getGlobalId() {
    return `${this.stelle.get("id")}_${this.get("id")}`;
  }

  getSqliteTableName() {
    return `${this.get("schema_name")}_${this.get("table_name")}`;
  }

  getPostgresTableName() {
    return `${this.get("schema_name")}.${this.get("table_name")}`;
  }

  getListItem() {
    console.log("getListItem for layerId: ", this.getGlobalId());
    const customStyleClass = this.get("useCustomStyle") ? "visible" : "hidden";
    const html = `
      <div id="layer_${this.getGlobalId()}" class="layer-list-div">
        <input type="radio" name="activeLayerId" value="${this.getGlobalId()}"/> <span class="layer-list-element">${
      this.get("alias") ? this.get("alias") : this.get("title")
    }</span>
        <i id="layer-functions-button_${this.getGlobalId()}" class="layer-functions-button fa-regular fa-ellipsis-vertical" aria-hidden="true"></i>
        <div class="layer-functions-div">
          <button id="syncLayerButton_${this.getGlobalId()}" value="${this.getGlobalId()}" class="settings-button sync-layer-button active-button layer-function-button">
            <i id="syncLayerIcon_${this.getGlobalId()}" class="fa fa-refresh" aria-hidden="true"></i>
          </button> Daten Synchronisieren
          <div class="auto-sync-div"><input id="auto_sync_${this.getGlobalId()}" type="checkbox"${
      this.get("autoSync") ? " checked" : ""
    }>&nbsp;Autosync</div>
        </div>
        ${
          this.hasDocumentAttribute
            ? `
          <div class="layer-functions-div">
            <button id="syncImagesButton_${this.getGlobalId()}" value="${this.getGlobalId()}" class="settings-button sync-images-button active-button layer-function-button">
              <i id="syncImagesIcon_${this.getGlobalId()}" class="fa fa-upload" aria-hidden="true"></i>
            </button> Bilder synchronisieren
          </div>`
            : ""
        }
        <div class="layer-functions-div">
          <button id="clearLayerButton_${this.getGlobalId()}" value="${this.getGlobalId()}" class="settings-button clear-layer-button active-button layer-function-button">
            <i id="clearLayerIcon_${this.getGlobalId()}" class="fa fa-ban" aria-hidden="true"></i>
          </button> Lokale Daten löschen
        </div>
        <div class="layer-functions-div">
          <button id="reloadLayerButton_${this.getGlobalId()}" value="${this.getGlobalId()}" class="settings-button reload-layer-button active-button layer-function-button">
            <i id="reloadLayerIcon_${this.getGlobalId()}" class="fa fa-window-restore" aria-hidden="true"></i>
          </button> Layer neu laden
        </div>
				${
          this.hasGeometry
            ? `
					<div class="layer-functions-div">
						<button id="styleLayerButton_${this.getGlobalId()}" value="${this.getGlobalId()}" class="settings-button style-layer-button active-button layer-function-button">
							<i id="styleLayerIcon_${this.getGlobalId()}" class="fa fa-paint-brush" aria-hidden="true"></i>
						</button> Layer Style
						<button id="styleLayerOkButton_${this.getGlobalId()}" value="${this.getGlobalId()}" class="settings-button style-layer-ok-button">
							<i id="styleLayerOkIcon_${this.getGlobalId()}" class="fa fa-check" style="font-size: 24px; color: #00a800" aria-hidden="true"></i>
						</button>
						<div id="styleLayerDiv_${this.getGlobalId()}" class="style-layer-div" value="${this.getGlobalId()}" style="display: none">
							<div id="classesDiv_${this.getGlobalId()}" class="classes-div">
								${this.getClassStyleItems()}
							</div>
						</div>
					</div>`
            : ""
        }
        <div class="layer-functions-div">\
          <button id="infoLayerButton_${this.getGlobalId()}" value="${this.getGlobalId()}" class="settings-button info-layer-button active-button layer-function-button">\
            <i id="infoLayerIcon_${this.getGlobalId()}" class="fa fa-info" aria-hidden="true"></i>\
          </button> Layerinfo\
          <div id="infoLayerDiv_${this.getGlobalId()}" class="layer-functions-div info-layer-div" value="${this.getGlobalId()}" style="display: none">\
            ${this.getLayerinfoItems().join("<br>")}\
          </div>
        </div>\
      </div>`;
    return html;
  }

  getLayerinfoItems() {
    let layerinfoItems: String[] = [];
    layerinfoItems.push(`Layer-ID: ${this.get("id")}`);
    layerinfoItems.push(`Geometrietyp: ${this.get("geometry_type")}`);
    layerinfoItems.push(
      `Synchronisierbar: ${this.hasEditPrivilege ? "Ja" : "Nein"}`
    );
    layerinfoItems.push(
      `Hinzufügen und Editieren von Datensätzen erlaubt: ${
        this.hasEditPrivilege ? "Ja" : "Nein"
      }`
    );
    layerinfoItems.push(
      `Löschen von Datensätzen erlaubt: ${
        this.hasEditPrivilege ? "Ja" : "Nein"
      }`
    );
    layerinfoItems.push(`Tabellenname: ${this.get("table_name")}`);
    layerinfoItems.push(`Feld für ID: ${this.get("id_attribute")}`);
    layerinfoItems.push(
      `Feld für Geometrie: ${this.get("geometry_attribute")}`
    );
    layerinfoItems.push(
      `Feld für Datensatzbezeichnung: ${this.get("name_attribute")}`
    );
    layerinfoItems.push(`Feld für Klassifizierung: ${this.get("classitem")}`);
    layerinfoItems.push(
      `Anzahl Datensätze: <span id="numDatasetsText_${this.getGlobalId()}">keine</span>`
    );

    if (this.hasEditPrivilege) {
      layerinfoItems.push(
        `Sync-Version: <span id="syncVersionSpan_${this.getGlobalId()}">${this.get(
          "syncVersion"
        )}</span>`
      );
    }
    return layerinfoItems;
  }

  getClassStyleItems() {
    return this.classes
      .map((klasse) => {
        return `<div class="class-div">${klasse.getLegendItem(
          this.get("geometry_type")
        )}</div>`;
      })
      .join("");
  }

  getSyncUrl() {
    console.log(this.get("title") + ": Layer.getSyncUrl");
    var url = this.stelle.get("url"),
      file = this.stelle.getUrlFile(url);

    url +=
      file +
      "Stelle_ID=" +
      this.stelle.get("Stelle_ID") +
      "&" +
      "login_name=" +
      this.stelle.get("login_name") +
      "&" +
      "selected_layer_id=" +
      this.get("id") +
      "&" +
      "passwort=" +
      encodeURIComponent(this.stelle.get("passwort"));

    if (this.runningSyncVersion == 0) {
      // get all data as new base for deltas
      url +=
        "&go=Daten_Export_Exportieren&export_format=GeoJSONPlus&all=1&epsg=4326";
      console.log(
        this.get("title") + ": Hole initial alle Daten mit Url: %s",
        url
      );
    } else {
      // sync deltas
      url += "&" + "go=mobile_sync" + "&" + "pullVersionFrom=1";
      console.log(this.get("title") + ": Hole Deltas mit Url: %s", url);
    }

    return url;
  }

  getDataUrl() {
    console.log(this.get("title") + ": Layer.getDataUrl");
    var url = this.stelle.get("url"),
      file = this.stelle.getUrlFile(url);

    url +=
      file +
      "Stelle_ID=" +
      this.stelle.get("Stelle_ID") +
      "&" +
      "login_name=" +
      this.stelle.get("login_name") +
      "&" +
      "selected_layer_id=" +
      this.get("id") +
      "&" +
      "passwort=" +
      encodeURIComponent(this.stelle.get("passwort"));

    // get all data as new base for deltas
    url +=
      "&go=Daten_Export_Exportieren&export_format=GeoJSONPlus&all=1&epsg=4326";
    console.log(
      this.get("title") + ": Hole initial alle Daten mit Url: %s",
      url
    );
    return url;
  }

  getImgDownloadUrl(image: string) {
    console.log("Layer.getImgDownloadUrl for image: %s", image);
    let url = this.stelle.get("url");
    const file = this.stelle.getUrlFile(url);

    url +=
      file +
      "Stelle_ID=" +
      this.stelle.get("Stelle_ID") +
      "&" +
      "login_name=" +
      this.stelle.get("login_name") +
      "&" +
      "passwort=" +
      encodeURIComponent(this.stelle.get("passwort")) +
      "&" +
      "go=mobile_download_image" +
      "&" +
      "image=" +
      image;
    return url;
  }

  downloadError(error) {
    kvm.log("download error source " + error.source);
    kvm.log("download error target " + error.target);
    kvm.log("download error code: " + error.code);
    kvm.log("download error http_status: " + error.http_status);
    alert(
      "Fehler beim herunterladen der Datei von der Url: " +
        kvm.replacePassword(error.source) +
        "! Error code: " +
        error.code +
        " http_status: " +
        error.http_status
    );
  }

  saveToStore() {
    //console.log('layerIds vor dem Speichern: %o', kvm.store.getItem('layerIds_' + this.stelle.get('id')));
    this.settings.loaded = false;
    let layerIds =
      <string[]>(
        JSON.parse(kvm.store.getItem("layerIds_" + this.stelle.get("id")))
      ) || [];
    const settings = JSON.stringify(this.settings);

    kvm.store.setItem("layerSettings_" + this.getGlobalId(), settings);
    //console.log("%s: layerSettings_%s eingetragen.", this.title, this.getGlobalId());

    if ($.inArray(this.get("id"), layerIds) < 0) {
      console.log(
        "%s->saveToStore: Insert layerId %s in layerIds List at index %s",
        this.title,
        this.get("id"),
        this.stelle.getLayerDrawingIndex(this)
      );
      layerIds.splice(
        this.stelle.getLayerDrawingIndex(this),
        0,
        this.get("id")
      );
      kvm.store.setItem(
        "layerIds_" + this.stelle.get("id"),
        JSON.stringify(layerIds)
      );
    }
  }

  removeFromStore() {
    //console.log("removeFromStore");
    console.log(
      "layerIds in Store vor dem Löschen: %s",
      kvm.store.getItem("layerIds_" + this.stelle.get("id"))
    );
    const layerIds =
      <string[]>(
        JSON.parse(kvm.store.getItem("layerIds_" + this.stelle.get("id")))
      ) || [];
    console.log(
      "Entferne LayerID %s aus layerIds Liste im Store.",
      this.get("id")
    );
    layerIds.splice(layerIds.indexOf(this.get("id")), 1);
    kvm.store.setItem(
      "layerIds_" + this.stelle.get("id"),
      JSON.stringify(layerIds)
    );
    console.log(
      "layerIds in Store nach dem Löschen: %s",
      kvm.store.getItem("layerIds_" + this.stelle.get("id"))
    );
    kvm.store.removeItem("layerSettings_" + this.getGlobalId());
  }

  getSyncPrivilege() {
    return parseInt(this.get("sync")) > 0;
  }

  getEditPrivilege() {
    return this.getSyncPrivilege() && parseInt(this.get("privileg")) > 0;
  }

  getDeletePrivilege() {
    return this.getSyncPrivilege() && parseInt(this.get("privileg")) == 2;
  }

  refresh() {
    kvm.tick(`${this.title}:<br>&nbsp;&nbsp;Datenanzeige auffrischen.`);
    this.activate();
  }

  /**
   * Set the layer active. If a layer is active already deactivate it before.
   * - Select layer in layerlist
   * - Create layerFilter
   * - Set sortAttribute
   * - Set dataView and if editable featureForm
   * - Highlight layer in layer control
   * - hide and show the edit functions in info windows
   * - hide or show new, edit and delete buttons
   * - createFeatureList
   * It will be called when
   * - a layer is newly selected in layer settings sektion. Defined in bindLayerEvents for element input[name=activeLayerId]...
   * - function ReadData is ready with reading data
   * - function UpdateTable is ready with updating table
   * Wann sollte activate ausgeführt werden?
   * - Wenn vorher ein anderer Layer aktiv war und dieser Layer aktiv geworden ist
   * - Wenn dieser Layer neu geladen wurde und aktiv ist
   * - Wenn dieser Layer gesynct wurde und aktiv ist
   */
  activate() {
    console.log(
      "Setze Layer " +
        this.get("title") +
        " (" +
        (this.get("alias") ? this.get("alias") : "kein Aliasname") +
        ") aktiv."
    );
    try {
      if (kvm.activeLayer) {
        kvm.activeLayer.deactivate();
      }
      this.isActive = true;
      kvm.addLayer(this);
      kvm.activeLayer = this;
      kvm.store.setItem("activeLayerId", this.get("id"));

      $("#featurelistHeading").html(
        this.get("alias") ? this.get("alias") : this.get("title")
      );

      // Create layerFilter
      try {
        this.createLayerFilterForm();
      } catch ({ name, message }) {
        kvm.msg(
          "Fehler beim Erzeugen des Layerfilterformulars im Layer id: " +
            this.getGlobalId() +
            "! Fehlertyp: " +
            name +
            " Fehlermeldung: " +
            message
        );
      }
      // ToDo
      // layerFilter für jeden Layer einzeln im Store speichern und auch beim Löschen
      // und neu Laden des Layers löschen bzw. reseten
      var layerFilter = kvm.store.getItem("layerFilter");
      if (layerFilter) {
        try {
          kvm.tick("Lade Layerfilter.");
          this.loadLayerFilterValues(JSON.parse(layerFilter));
        } catch ({ name, message }) {
          kvm.msg(
            "Fehler beim Laden der Filterwerte im Layer id: " +
              this.getGlobalId() +
              "! Fehlertyp: " +
              name +
              " Fehlermeldung: " +
              message
          );
        }
      }

      // Set sortAttribute
      kvm.tick(`${this.title}:<br>&nbsp;&nbsp;Setze Sortieroptionen.`);
      $('#anzeigeSortSelect option[value!=""]').remove();
      $.each(this.attributes, function (key, value) {
        $("#anzeigeSortSelect").append(
          $(
            '<option value="' +
              value.settings.name +
              '">' +
              value.settings.alias +
              "</option>"
          )
        );
      });

      // ToDo
      // sortAttribute für jeden Layer einzeln im Store speichern und auch beim Löschen
      // und neu Laden des Layers löschen bzw. reseten
      var sortAttribute = kvm.store.getItem("sortAttribute");
      if (sortAttribute) {
        $("#anzeigeSortSelect").val(sortAttribute);
      }

      // Set dataView and if editable featureForm
      $("#formular").html("");
      if (this.hasEditPrivilege) {
        try {
          this.createFeatureForm();
        } catch ({ name, message }) {
          kvm.msg(
            "Fehler beim Erzeugen des Sachdatenformulares im Layer id: " +
              this.getGlobalId() +
              "! Fehlertyp: " +
              name +
              " Fehlermeldung: " +
              message
          );
        }
      }
      try {
        this.createDataView();
      } catch ({ name, message }) {
        kvm.msg(
          "Fehler beim Erzeugen der Datenansicht im Layer id: " +
            this.getGlobalId() +
            "! Fehlertyp: " +
            name +
            " Fehlermeldung: " +
            message
        );
      }

      kvm.tick(`${this.title}:<br>&nbsp;&nbsp;Aktiviere Layer in Layerliste.`);
      (<any>$("input[name=activeLayerId]")).checked = false;
      (<any>$("input[value=" + this.getGlobalId() + "]")[0]).checked = true;
      $(".layer-functions-button, .layer-functions-div").hide();
      $(
        "#layer_" + kvm.activeLayer.getGlobalId() + " > .layer-functions-button"
      ).show();
      $(
        "#layer_" + kvm.activeLayer.getGlobalId() + " > .layer-functions-button"
      ).removeClass("fa-ellipsis-vertical fa-square-xmark");
      $(
        "#layer_" + kvm.activeLayer.getGlobalId() + " > .layer-functions-button"
      ).addClass("fa-ellipsis-vertical");
      if (this.hasEditPrivilege) {
        $("#newFeatureButton").show();
      } else {
        $("#newFeatureButton").hide();
      }

      // ToDo: Die Kommentare überarbeiten.
      // Load Features from Database, recreate FeatureList and draw in map
      // readData hier raus, weil alle layer immer schon geladen sind,
      // nach sync wird auch erst readData aufgerufen und wenn layer
      // activ ist isActive, hier also kein readData mehr
      //this.readData();
      this.createFeatureList();

      // Unselect all overlayLayers in Layer control and select this overlaylayer
      // Style layer in control to show that the layer is editable

      // ToDo: Do not remove and add layerGroup here but in appendToApp
      // Deactivate the events on features of other layers

      // activate the events of this activ layer

      //kvm.controls.layers.removeLayer(this.layerGroup);
      //console.log('Add layerGroup %s in activate als overlay zum Layer Control hinzu.', this.get('title'));
      //kvm.controls.layers.addOverlay(this.layerGroup, kvm.coalesce(this.get('alias'), this.get('title'), this.get('table_name')));
      if (this.hasGeometry) {
        this.selectActiveLayerInControl();
        $("input:checkbox.leaflet-control-layers-selector").map(function (
          i,
          e
        ) {
          const layerLegendName = $(e).next().html();
          if (layerLegendName.includes(kvm.activeLayer.title)) {
            if ((<any>!$(e)).checked) {
              $(e).click(); // switch activeLayer on if it is off
            }
          } else {
            if ((<any>$(e)).checked) {
              $(e).click(); // switch other layer off if they are on
            }
          }
        });
      }
    } catch ({ name, message }) {
      console.log("Fehler in activate: %s, %s", name, message);
      kvm.msg(
        "Fehler beim Aktivieren des Layers id: " +
          this.getGlobalId() +
          "! Fehlertyp: " +
          name +
          " Fehlermeldung: " +
          message
      );
    }
  }

  /**
   * Function deactivate the layer. If the layer have an activeFeature
   * deactivate this also before.
   */
  deactivate() {
    if (this.activeFeature) {
      this.activeFeature.deactivate();
    }

    if (this.isActive) {
      this.isActive = false;
      // TODO
      kvm.addLayer(this);
      kvm.activeLayer = null;
      kvm.store.removeItem("activeLayerId");
      $("#searchFeatureField").val("");
    }
  }

  /**
   * Activated feature means
   *  - it is styled as activated in map
   *  - the popup is open direkt after selection, but can be closed by user later
   *  - it is highlighted in feature list
   *  - the data view is loaded with values of this feature
   *  - edit function buttons are visible
   * If zoom it true, the map zoom to features location
   * @param feature
   * @param zoom
   */
  activateFeature(feature, zoom = true) {
    // console.log(
    // 	"Activate Feature id: %s in Layer %s globalLayerId: %s, in LeafletLayer id: %s as activeFeature.",
    // 	feature.id,
    // 	this.title,
    // 	feature.globalLayerId,
    // 	feature.layerId
    // );
    this.activeFeature = feature.activate(zoom);
    this.loadFeatureToView(feature, { editable: false });
  }

  /**
   * Deactivate the selected feature if layer have one
   */
  deactivateFeature() {
    if (this.activeFeature) {
      // console.log(
      // 	"Deactivate Feature id: %s in Layer %s globalLayerId: %s, in LeafletLayer id: %s as activeFeature.",
      // 	this.activeFeature.id,
      // 	this.title,
      // 	this.activeFeature.globalLayerId,
      // 	this.activeFeature.layerId
      // );
      this.activeFeature.deactivate();
      this.activeFeature = null;
    }
  }

  /**
   * Function cancel current geometry edit,
   * create a new Feature in subLayerId,
   * activate the sublayer,
   * set parentFeature id in FK-attribute of sublayer and
   * switch to exitFeature mode.
   * parentFeature is set from currently activeLayer
   * @param options Object mit Attributen parentLayerId
   */
  newSubDataSet(
    options = { parentLayerId: "", subLayerId: "", fkAttribute: "" }
  ) {
    // parentLayerId, parentFeatureId, subLayerId, subLayerFKAttribute) {
    kvm.openSperrDiv("Neuer Sublayer-Datensatz");
    const parentLayer = kvm.getLayer(options.parentLayerId);
    if (parentLayer.hasGeometry) {
      parentLayer.cancelEditGeometry();
    }
    const subLayer = kvm.getLayer(options.subLayerId);
    subLayer.parentLayerId = options.parentLayerId;
    subLayer.parentFeatureId = parentLayer.activeFeature.id;
    subLayer.specifiedValues[options.fkAttribute] =
      parentLayer.activeFeature.id;
    subLayer.activate();
    subLayer.newFeature();
    subLayer.editFeature(subLayer.activeFeature.id);
    // kvm.closeSperrDiv(`Neues Formular für Layer ${subLayer.title} geladen.`);
    kvm.closeSperrDiv();
  }

  createLayerFilterForm() {
    let filter_operators = ["=", ">", "<", ">=", "<=", "IN", "LIKE"];
    let filter_operator_options = filter_operators.map(function (operator) {
      return (
        '<option value="' +
        operator +
        '"' +
        (operator == "=" ? " selected" : "") +
        ">" +
        operator +
        "</option>"
      );
    });

    $("#attributeFilterFieldDiv").html("");
    $.each(this.attributes, function (key, value) {
      if (value.settings.type != "geometry") {
        if (value.settings.name == "status") {
          /*
         if (value.settings.options == "") {
            kvm.msg(
              "Layer Konfigurationsfehler: Der Layer " +
                kvm.activeLayer.settings.title +
                " kann nicht verwendet werden. Das Attribut Status hat keine Optionen. Wenden Sie sich an den Administrator der WebGIS Anwendung zum Einstellen der Optionen.",
              "Fehler"
            );
            return false;
          }
          if (!Array.isArray(value.settings.options)) {
            kvm.msg(
              "Layer Konfigurationsfehler: Der Layer " +
                kvm.activeLayer.settings.title +
                " kann nicht verwendet werden. Das Optionenfeld ist zwar belegt mit " +
                value.settings.options +
                ", aber es handelt sich nicht um ein Array von Auswahlmöglichkeiten. Wenden Sie sich an den Administrator der WebGIS Anwendung zum Einstellen der Optionen.",
              "Fehler"
            );
            return false;
          }
          */
          $("#statusFilterSelect option").remove();
          if (
            value.settings.enums !== "" &&
            Array.isArray(value.settings.enums)
          ) {
            $("#statusFilterSelect").append(
              $('<option value="" selected>-- Bitte wählen --</option>')
            );
            value.settings.enums.map(function (enum_option) {
              $("#statusFilterSelect").append(
                $(
                  '<option value="' +
                    enum_option.value +
                    '">' +
                    enum_option.output +
                    "</option>"
                )
              );
            });
          }
        }
        // TODO Bug
        let input_field;
        switch (value.settings.form_element_type) {
          case "Auswahlfeld":
            {
              input_field = $(
                '<select id="filter_value_' +
                  value.settings.name +
                  '" class="filter-view-value-field" name="filter_value_' +
                  value.settings.name +
                  '">'
              );
              input_field.append(
                $('<option value="" selected>-- Bitte wählen --</option>')
              );
              if (
                value.settings.enums !== "" &&
                Array.isArray(value.settings.enums)
              ) {
                value.settings.enums.map(function (enum_option) {
                  input_field.append(
                    $(
                      '<option value="' +
                        enum_option.value +
                        '">' +
                        enum_option.output +
                        "</option>"
                    )
                  );
                });
              } else {
                console.log("options keine Array: %o", value.settings.enums);
              }
            }
            break;
          case "Time":
            {
              input_field =
                '<input id="filter_value_' +
                value.settings.name +
                '" class="filter-view-value-field" name="filter_value_' +
                value.settings.name +
                '" type="datetime-local" value=""/>';
            }
            break;
          default: {
            input_field =
              '<input id="filter_value_' +
              value.settings.name +
              '" class="filter-view-value-field" name="filter_value_' +
              value.settings.name +
              '" type="text" value=""/>';
          }
        }
        $("#attributeFilterFieldDiv").append(
          $(
            '<div class="filter-view-field" database_type="' +
              value.settings.type +
              '" name="' +
              value.settings.name +
              '">'
          )
            .append(
              '<div class="filter-view-label">' +
                value.settings.alias +
                "</div>"
            )
            .append(
              '<div class="filter-view-operator"><select id="filter_operator_' +
                value.settings.name +
                '">' +
                filter_operator_options +
                "</select></div>"
            )
            .append($('<div class="filter-view-value">').append(input_field))
        );
      }
    });
  }

  loadLayerFilterValues(layerFilter) {
    Object.keys(layerFilter).forEach(function (attr_name) {
      $("#filter_operator_" + attr_name).val(layerFilter[attr_name].operator);
      $("#filter_value_" + attr_name).val(layerFilter[attr_name].value);
    });
  }

  notNullValid() {
    var errMsg = "";

    $.each(kvm.activeLayer.attributes, function (i, v) {
      if (
        !v.isAutoAttribute("") &&
        !v.isPseudoAttribute() &&
        v.get("nullable") == 0 &&
        v.formField.getValue() == null
      ) {
        errMsg += "Das Feld " + v.get("alias") + " benötigt eine Eingabe! ";
      }
    });

    return errMsg;
  }

  /**
   * Function append or insert expressions for where, order, limit and/or offset in sql.
   * @param sql string
   * @param where string[]
   * @param order string
   * @param limit string
   * @param offset string
   * @returns
   */
  extentSql(sql: string, where: string[], order = "", limit = "", offset = "") {
    let whereIndex = sql.toLowerCase().indexOf("where");
    let orderByIndex = sql.toLowerCase().indexOf("order by");
    let limitIndex = sql.toLowerCase().indexOf("limit ");
    let offsetIndex = sql.toLowerCase().indexOf("offset ");

    if (offset && offsetIndex === -1) {
      sql += ` OFFSET ${offset}`;
    }
    offsetIndex = sql.toLowerCase().indexOf("offset ");

    if (limit && limitIndex === -1) {
      let limitExpression = ` LIMIT ${limit}`;
      if (offsetIndex !== -1) {
        sql = `${sql.slice(0, offsetIndex)} ${limitExpression} ${sql.slice(
          offsetIndex
        )}`;
      } else {
        sql += ` LIMIT ${limit}`;
      }
    }
    offsetIndex = sql.toLowerCase().indexOf("offset ");
    limitIndex = sql.toLowerCase().indexOf("limit ");

    if (order) {
      let orderByExpression = `${
        orderByIndex !== -1 ? ", " : " ORDER BY "
      } ${order}`;
      if (limitIndex !== -1) {
        sql = `${sql.slice(0, limitIndex)} ${orderByExpression} ${sql.slice(
          limitIndex
        )}`;
      } else if (offsetIndex !== -1) {
        sql = `${sql.slice(0, offsetIndex)} ${orderByExpression} ${sql.slice(
          offsetIndex
        )}`;
      } else {
        sql += ` ${orderByExpression}`;
      }
    }

    offsetIndex = sql.toLowerCase().indexOf("offset ");
    limitIndex = sql.toLowerCase().indexOf("limit ");
    orderByIndex = sql.toLowerCase().indexOf("order by");

    if (where.length > 0) {
      let whereExpression = `${
        whereIndex !== -1 ? " AND " : " WHERE "
      } ${where.join(" AND ")}`;
      if (orderByIndex !== -1) {
        sql = `${sql.slice(0, orderByIndex)} ${whereExpression} ${sql.slice(
          orderByIndex
        )}`;
      } else if (limitIndex !== -1) {
        sql = `${sql.slice(0, limitIndex)} ${whereExpression} ${sql.slice(
          limitIndex
        )}`;
      } else if (offsetIndex !== -1) {
        sql = `${sql.slice(0, offsetIndex)} ${whereExpression} ${sql.slice(
          offsetIndex
        )}`;
      } else {
        sql += ` ${whereExpression}`;
      }
    }

    return sql;
  }
}

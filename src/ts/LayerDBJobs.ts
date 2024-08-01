import { Layer } from "./Layer";
import { executeSQL } from "./Util";
import { kvm } from "./app";

export async function runInsert(layer: Layer, delta: { type: string; change: string; delta: string }) {
  console.log("LayerDBJobs.runInsert", layer, delta);
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
  return new Promise<SQLitePlugin.Results>(async (resolve, reject) => {
    try {
      // const rsBackupDS = await backupDataset(layer);
      const sql = delta.delta;
      console.log("SQL zum Anlegen eines neuen Datensatzes: ", sql);
      const rsUpdate = await executeSQL(kvm.db, sql);
      await writeDelta(layer, delta);
      const rsNew = readDataset(layer);
      // console.log("resolve....");
      resolve(rsNew);
    } catch (ex) {
      reject(ex);
    }
  });
}

export async function runDelete(layer: Layer, delta: { type: string; change: string; delta: string }) {
  console.log("LayerDBJobs.runDelete", layer);
  // const strategy = {
  //   context: this,
  //   succFunc: "backupDataset",
  //   next: {
  //     succFunc: "deleteDataset",
  //     next: {
  //       succFunc: "writeDelta",
  //       next: {
  //         succFunc: "deleteDeltas",
  //         other: "insert",
  //         next: {
  //           succFunc: "afterDeleteDataset",
  //           succMsg:
  //             "Datensatz erfolgreich gelöscht! Er kann wieder hergestellt werden.",
  //         },
  //       },
  //     },
  //   },
  // };
  return new Promise<SQLitePlugin.Results>(async (resolve, reject) => {
    try {
      // const rsBackupDS = await backupDataset(layer);

      // ToDo pk: Delete all sub featues
      // layer.attributes
      //   .filter((allAttr) => {
      //     return allAttr.get("form_element_type") === "SubFormEmbeddedPK";
      //   })
      //   .forEach((subFormAttr) => {
      //     let subLayerId = subFormAttr.getGlobalSubLayerId();
      //     let subLayerFK = subFormAttr.getFKAttribute();
      //     let featureId = layer.activeFeature.id;
      //     console.log(
      //       `Delete features in subLayerId: ${subLayerId} with featureId: ${featureId} in foreign key attribute: ${subLayerFK}`
      //     );
      //     [...kvm.getLayer(subLayerId).getFeaturesByFK(subLayerFK, featureId)].forEach(([id, feature]) => {
      //       delta = layer.getDeleteDelta(feature.id);
      //       sql =  delta.delta + " AND endet IS NULL";
      //       console.log("SQL zum Löschen des SubFeatures: ", sql);
      //       let rsDelete = await executeSQL(kvm.db, sql);
      //       await writeDelta(layer, delta);
      //       const rsNew = deleteDeltas(layer);
      //       // console.log("resolve....");
      //       resolve(rsNew);
      //     });
      //   });

      const sql = delta.delta + " AND endet IS NULL";
      console.log("SQL zum Löschen eines Datensatzes: ", sql);
      let rsDelete = await executeSQL(kvm.db, sql);
      await writeDelta(layer, delta);
      const rsNew = deleteDeltas(layer);
      // console.log("resolve....");
      resolve(rsNew);
    } catch (ex) {
      reject(ex);
    }
  });
}

// export async function runDeleteStrategy(layer: Layer, delta: { type: string; change: string; delta: string }) {
//     //console.log('runDeleteStrategy');
//     return new Promise<SQLitePlugin.Results>(async (resolve, reject) => {
//         try {
//             const rsBackupDS = await backupDataset(layer);
//             const sql = delta.delta + " AND endet IS NULL";
//             const rsUpdate = await executeSQL(kvm.db, sql);
//             await writeDelta(layer, delta);
//             const rsNew = readDataset(layer);
//             console.error("resolve....");
//             resolve(rsNew);
//         } catch (ex) {
//             reject(ex);
//         }
//     });
// }

/**
 * updated den Datensatz unf gibt den neu gelesenden Datensatz zurück
 *
 * @param layer
 * @param delta
 * @returns
 */
export async function runUpdate(layer: Layer, delta: { type: string; change: string; delta: string }) {
  console.log("LayerDBJobs.runUpdate", layer, delta);
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

  return new Promise<SQLitePlugin.Results>(async (resolve, reject) => {
    try {
      const rsBackupDS = await backupDataset(layer);
      const sql = delta.delta + " AND endet IS NULL";
      const rsUpdate = await executeSQL(kvm.db, sql);
      await writeDelta(layer, delta);
      const rsNew = readDataset(layer);
      // console.log("resolve....");
      resolve(rsNew);
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * Function copy a dataset with endet = current date as a backup of activeFeature
 * if not allready exists
 * @param object strategy Object with context and information about following processes
 */
async function backupDataset(layer: Layer) {
  // console.log("backupDataset");
  const table = layer.getSqliteTableName();
  const tableColumns = layer.getTableColumns();
  const id_attribute = layer.get("id_attribute");
  const id = layer.activeFeature.getDataValue(id_attribute);
  const sql =
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

  return executeSQL(kvm.db, sql);
  // kvm.db.executeSql(sql, [], layer[this.next.succFunc].bind(this.next), function (err) {
  //     console.log("Fehler", err);
  //     kvm.msg("Fehler beim Ausführen von " + sql + " in backupDataset! Fehler: " + (<any>err).code + "\nMeldung: " + err.message, "Fehler");
  // });
}

// function getDelta(layer: Layer) {
//     console.log("updateDataset");

//     let changes = layer.collectChanges("update");

//     if (changes.length == 0) {
//         const msg = "Keine Änderungen! Zum Abbrechen verwenden Sie den Button neben Speichen.";
//         kvm.closeSperrDiv(msg);
//         //kvm.msg(msg);
//     } else {
//         kvm.alog("Changes gefunden: ", changes, 4);
//         const imgChanges = changes.filter(function (change) {
//             return $.inArray(change.key, layer.getDokumentAttributeNames()) > -1;
//         });

//         if (imgChanges.length == 0) {
//             //console.log('no imgChanges');
//         } else {
//             layer.createImgDeltas(imgChanges);
//         }

//         //kvm.log("Layer.updateDataset addAutoChanges", 4);
//         changes = layer.addAutoChanges(changes, "update");

//         return layer.getUpdateDelta(changes);
//         // const sql = delta.delta + " AND endet IS NULL";

//         // // this.next.context = layer;
//         // this.delta = delta;
//         // //  this.changes = changes;
//         // return executeSQL(kvm.db, sql);
//     }
// }

// function updateDataset(delta: string) {
//     // console.log("updateDataset rs: %o", rs);
//     try {
//         const sql = delta + " AND endet IS NULL";
//         return executeSQL(kvm.db, sql);
//     } catch (ex) {
//         console.log("Error in updateDataset", ex);
//     }
// }

/**
 * write delta dataset to database expect:
 * for delete delta if insert delta exists or
 * for insert delta if delte delta exists
 */
async function writeDelta(layer: Layer, delta: { type: string; change: string; delta: string }) {
  try {
    // console.log("writeDelta: ", delta);
    // const layer = this.layer;
    // const delta = this.delta;
    // const changes = this.changes;
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
    '${layer.underlineToPointName(delta.delta, layer.get("schema_name"), layer.get("table_name")).replace(/\'/g, "''")}' AS delta,
    '${kvm.now()}' AS created_at
  WHERE
    (
      SELECT
        count(*)
      FROM
        ${layer.getSqliteTableName()}_deltas
      WHERE
        INSTR(delta, '${layer.activeFeature.id}') > 0 AND
        type = 'sql' AND
        (
          (change = 'insert' AND '${delta.change} ' = 'delete') OR
          (change = 'delete' AND '${delta.change}' = 'insert')
        )
    ) = 0
`;

    // console.log("Funktion nach schreiben des Deltas: %s", this.next.succFunc);
    return executeSQL(kvm.db, sql);
  } catch (ex) {
    console.error("Error in writeDelta", ex);
  }
}

// async function createDataset(layer: Layer) {
//     console.error("createDataset");

//     let changes = layer.collectChanges("insert");
//     const dokumentAttributeNames = layer.getDokumentAttributeNames();
//     let imgChanges = changes.filter(function (change) {
//             return $.inArray(change.key, dokumentAttributeNames) > -1;
//         }),
//         // delta: any = {},
//         sql = "";

//     if (imgChanges.length == 0) {
//         //console.log('no imgChanges');
//     } else {
//         layer.createImgDeltas(imgChanges);
//     }

//     changes = layer.addAutoChanges(changes, "insert");
//     const delta = layer.getInsertDelta(changes);
//     sql = delta.delta;

//     return executeSQL(kvm.db, sql);
// }

/**
 * read feature data from database and call function this.next.succFunc
 * @param resultset rs Result set from former function is here not used
 */
async function readDataset(layer: Layer) {
  // console.log("readDataset");
  const id_attribute = layer.get("id_attribute");
  const featureId = layer.activeFeature.getDataValue(id_attribute);
  const sql = layer.extentSql(kvm.replaceParams(layer.settings.query), [`${layer.settings.table_alias}.${id_attribute} = '${featureId}'`, `${layer.settings.table_alias}.endet IS NULL`]);
  console.log("LayerDBJobs->readDataset: ", sql);
  return executeSQL(kvm.db, sql);
}

async function deleteDeltas(layer: Layer) {
  // console.log("deleteDeltas");
  let sql = `
    DELETE FROM ${layer.getSqliteTableName()}_deltas
    WHERE
      type = 'sql' AND
      (change = 'update' OR change = 'insert') AND
      INSTR(delta, '${layer.activeFeature.id}') > 0
  `;
  console.log("Lösche Deltas mit sql: %s", sql);
  return executeSQL(kvm.db, sql);
}

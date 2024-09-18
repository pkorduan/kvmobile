import { Feature } from "./Feature";
import { Layer } from "./Layer";
import { executeSQL, underlineToPointName } from "./Util";
import { kvm } from "./app";

/**
 * insert den Datensatz, liest die Datensätze des Layers neu, und gibt diese zurück
 *
 * @param layer
 * @param delta
 * @returns
 */
export async function runInsert(feature: Feature, delta: { action: "insert"; sql: string }) {
  console.log("LayerDBJobs.runInsert", feature, delta);
  return new Promise<SQLitePlugin.Results>(async (resolve, reject) => {
    try {
      const sql = delta.sql;
      await executeSQL(kvm.db, sql);
      await writeDelta(feature, delta);
      const rsNew = readDataset(feature.layer);
      resolve(rsNew);
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * updated den Datensatz, liest die Datensätze des Layers neu, und gibt diese zurück
 *
 * @param layer
 * @param delta
 * @returns
 */
export async function runUpdate(feature: Feature, delta: { action: "update"; sql: string }) {
  console.log("LayerDBJobs.runUpdate", feature, delta);
  return new Promise<SQLitePlugin.Results>(async (resolve, reject) => {
    try {
      const sql = delta.sql + " AND endet IS NULL";
      await executeSQL(kvm.db, sql);
      await writeDelta(feature, delta);
      const rsNew = readDataset(feature.layer);
      resolve(rsNew);
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * updated den Datensatz, liest die Datensätze des Layers neu, und gibt diese zurück
 *
 * @param layer
 * @param delta
 * @returns
 */
export async function runDelete(feature: Feature, delta: { action: "delete"; sql: string }) {
  console.log("LayerDBJobs.runDelete", feature);
  return new Promise<void>(async (resolve, reject) => {
    try {
      const sql = delta.sql + " AND endet IS NULL";
      await executeSQL(kvm.db, sql);
      await writeDelta(feature, delta);
      resolve();
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
async function writeDelta(feature: Feature, delta: { action: "insert" | "delete" | "update"; sql: string }) {
  try {
    const layer = feature.layer;
    const schemaName = layer.get("schema_name");
    const tableName = layer.get("table_name");

    const sql = `
  INSERT INTO deltas (
    action,
    sql,
    uuid,
    action_time,
    schema_name,
    table_name
  )
  SELECT
    '${delta.action}' AS action,
    '${underlineToPointName(delta.sql, layer.get("schema_name"), layer.get("table_name")).replace(/\'/g, "''")}' AS sql,
    '${feature.id}' as uuid,
    '${kvm.now()}' AS created_at,
    '${schemaName}', 
    '${tableName}'
  WHERE
    (
      SELECT
        count(*)
      FROM
        deltas 
      WHERE
        INSTR(sql, '${layer.activeFeature.id}') > 0 AND
        (
          (action = 'insert' AND '${delta.action}' = 'delete') OR
          (action = 'delete' AND '${delta.action}' = 'insert')
        )
    ) = 0
`;

    // console.log("Funktion nach schreiben des Deltas: %s", this.next.succFunc);
    return executeSQL(kvm.db, sql);
  } catch (ex) {
    console.error("Error in writeDelta", ex);
  }
}

export async function writeImgDelta(feature: Feature, delta: { action: "insert" | "delete"; file: string }) {
  try {
    const layer = feature.layer;

    const sql = `
  INSERT INTO image_deltas (
    action,
    file,
    uuid,
    action_time,
    layer_id
  )
  values(
    '${delta.action}',
    '${delta.file}',
    '${feature.id}',
    '${kvm.now()}',
    '${layer.get("id")}'
  )`;

    // console.log("Funktion nach schreiben des Deltas: %s", this.next.succFunc);
    return executeSQL(kvm.db, sql);
  } catch (ex) {
    console.error("Error in writeDelta", ex);
    throw new Error("Fehler beim Schreiben des Image-Deltas", { cause: ex });
  }
}

/**
 * read feature data from database and call function this.next.succFunc
 * @param resultset rs Result set from former function is here not used
 */
async function readDataset(layer: Layer) {
  // console.log("readDataset");
  const id_attribute = layer.get("id_attribute");
  const featureId = layer.activeFeature.getDataValue(id_attribute);
  const sql = layer.extentSql(kvm.getActiveStelle().replaceParams(layer.settings.query), [`${layer.settings.table_alias}.${id_attribute} = '${featureId}'`, `${layer.settings.table_alias}.endet IS NULL`]);
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

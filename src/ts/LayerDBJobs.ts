import { Feature } from "./Feature";
import { executeSQL, underlineToPointName } from "./Util";
import { kvm } from "./app";
import * as Util from "./Util";

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
      const rsNew = await readDataset(feature);
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
      const rsNew = await readDataset(feature);
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
      reject(new Error("Fehler beim Löschen des Feature " + feature, { cause: ex }));
    }
  });
}

/**
 * Function copy a dataset with endet = current date as a backup of activeFeature
 * if not allready exists
 * @param object strategy Object with context and information about following processes
 */
async function backupDataset(feature: Feature) {
  // console.log("backupDataset");
  const layer = feature.layer;
  const table = layer.getSqliteTableName();
  const tableColumns = layer.getTableColumns();
  const id_attribute = layer.get("id_attribute");
  const id = feature.getDataValue(id_attribute);
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
    Util.now() +
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
}

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
    '${Util.now()}' AS created_at,
    '${schemaName}', 
    '${tableName}'
  WHERE
    (
      SELECT
        count(*)
      FROM
        deltas 
      WHERE
        INSTR(sql, '${feature.id}') > 0 AND
        (
          (action = 'insert' AND '${delta.action}' = 'delete') OR
          (action = 'delete' AND '${delta.action}' = 'insert')
        )
    ) = 0
`;

    // console.log("Funktion nach schreiben des Deltas: %s", this.next.succFunc);
    return executeSQL(kvm.db, sql);
  } catch (ex) {
    throw ex;
    console.error("Error in writeDelta", ex);
  } finally {
    try {
      kvm.updateDeltaDisplay();
    } catch (ex) {
      console.error(ex);
    }
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
    '${Util.now()}',
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
async function readDataset(f: Feature) {
  // console.log("readDataset");
  const layer = f.layer;
  const id_attribute = layer.get("id_attribute");
  const featureId = f.getDataValue(id_attribute);
  const sql = layer.extentSql(kvm.getActiveStelle().replaceParams(layer.settings.query), [`${layer.settings.table_alias}.${id_attribute} = '${featureId}'`, `${layer.settings.table_alias}.endet IS NULL`]);
  console.log("LayerDBJobs->readDataset: ", [sql]);
  return executeSQL(kvm.db, sql);
}

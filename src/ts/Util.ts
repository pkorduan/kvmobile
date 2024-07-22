export type AsyncFunction<T> = (params?: any) => Promise<T>;

export function listFiles(dir: string) {
  window.resolveLocalFileSystemURL(
    dir,
    function (entry) {
      console.error("listFiles: " + dir);
      if (entry.isDirectory) {
        (<DirectoryEntry>entry).createReader().readEntries(
          (fileSystemEntries) => {
            let s = "dir: " + dir + " => " + entry.nativeURL;
            for (let i = 0; i < fileSystemEntries.length; i++) {
              const fEntry = fileSystemEntries[i];
              const typ = fEntry.isDirectory ? "d" : "f";
              s += "\n" + typ + "  " + fileSystemEntries[i].name;
            }
            console.log(s);
          },
          (err) => {
            console.error("Error in Listfiles.readEntries", err);
          }
        );
      }
    },
    function (err) {
      console.error("Error in Listfiles", err);
    }
  );
}

export async function executeSQL(
  db: SQLitePlugin.Database,
  statement: string,
  params?: any[]
): Promise<SQLitePlugin.Results> {
  return new Promise<SQLitePlugin.Results>((resolve, reject) => {
    db.executeSql(
      statement,
      params,
      (results) => resolve(results),
      (err) => reject(err)
    );
  });
}

export async function fileExists(url: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    window.resolveLocalFileSystemURL(
      url,
      (fileEntry: Entry) => {
        resolve(true);
      },
      (e: FileError) => {
        resolve(false);
        console.log("could not resolve: " + url, e);
      }
    );
  });
}

// export async function runStrategy(fcts: AsyncFunction<any>[], paramOfFirsFct: any) {
//     const results = [];
//     return new Promise((resolve, reject) => {
//         function _run(idx: number, fcts: AsyncFunction<any>[], params: any, resolve: (result: any) => void) {
//             fcts[idx](params).then((result) => {
//                 idx++;
//                 results.push(result);
//                 if (idx < fcts.length) {
//                     _run(idx, fcts, result, resolve);
//                 } else {
//                     resolve(results);
//                 }
//             });
//         }
//         _run(0, fcts, paramOfFirsFct, resolve);
//     });
// }

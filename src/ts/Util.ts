/// <reference types="cordova-plugin-file" />

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

/**
 *
 * @param filePath deviceFilePath oder FileUrl
 * @returns
 */
export async function getWebviewUrl(filePath: string): Promise<string> {
  // console.log("getFileUrl: ", filePath);

  //   listFiles(filePath.substring(0, filePath.lastIndexOf("/")));
  let path = filePath.startsWith("file") ? filePath : "file://" + filePath;
  //   listFiles(path.substring(0, path.lastIndexOf("/")));
  if (path.indexOf('"') > 0) {
    path = path.substring(0, path.lastIndexOf('"'));
  }

  return new Promise((resolve, reject) => {
    window.resolveLocalFileSystemURL(
      path,
      (fileEntry) => {
        const fileEntryURL = fileEntry.toURL();
        // console.log("getFileUrl(" + filePath + ")=>" + fileEntryURL);
        resolve(fileEntryURL);
      },
      (err) => {
        console.error("getFileUrl(" + filePath + ")=>error: ", err);
        reject(new Error(`Fehler beim Auflösen der LocalFileSystemURL ${filePath}`, { cause: err }));
      }
    );
  });
}

export async function executeSQL(db: SQLitePlugin.Database, statement: string, params?: any[]): Promise<SQLitePlugin.Results> {
  return new Promise<SQLitePlugin.Results>((resolve, reject) => {
    db.executeSql(
      statement,
      params,
      (results) => resolve(results),
      (err) =>
        reject({
          message: `Fehler beim Ausführen der SQL-Anweisung ${statement}`,
          cause: err,
        })
    );
  });
}

export async function tableExists(db: SQLitePlugin.Database, tablename: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const statement = `SELECT name FROM sqlite_master WHERE type='table' AND name='${tablename}'`;
    db.executeSql(
      statement,
      [],
      (results) => {
        console.log(`Tabelle ${tablename} existiert ${results.rows.length === 1}`);
        resolve(results.rows.length === 1);
      },
      (err) => {
        console.error("error in exists table: ", err);
        reject(err);
      }
    );
  });
}

export async function resolveLocalFileSystemURL(url: string) {
  return new Promise<Entry>((resolve, reject) => {
    window.resolveLocalFileSystemURL(
      url,
      (entry) => {
        resolve(entry);
      },
      (error) => {
        reject(error);
      }
    );
  });
}

export async function fileExists(url: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    window.resolveLocalFileSystemURL(
      url,
      (fileEntry: Entry) => {
        resolve(fileEntry.isFile || fileEntry.isDirectory);
      },
      (e: FileError) => {
        resolve(false);
        console.log("could not resolve: " + url, e);
      }
    );
  });
}

export async function writeData(dir: string, file: string, dataObj: Blob | string | ArrayBuffer): Promise<FileEntry> {
  return new Promise<FileEntry>((resolve, reject) => {
    window.resolveLocalFileSystemURL(
      dir,
      (dirEntry) => {
        (<DirectoryEntry>dirEntry).getFile(file, { create: true }, (fileEntry: FileEntry) => {
          fileEntry.createWriter(
            (fileWriter) => {
              fileWriter.onwriteend = () => {
                // console.log("Successful file write...");
                // console.log(`Datei "${file}" wurde erfolgreich in das Verzeichnis "${dir}" geschrieben."`);
                resolve(fileEntry);
              };
              fileWriter.onerror = (e) => {
                console.error(`Fehler beim Schreiben der Datei "${file}" in das Verzeichnis "${dir}".`, e);
                reject({
                  message: `Fehler beim Schreiben der Datei "${file}" in das Verzeichnis "${dir}".`,
                  cause: e,
                });
                // console.log("Failed file write: " + e.toString());
                // const msg =
                //   "Fehler beim Erzeugen der Delta-Datei, die geschickt werden soll.";
                // kvm.msg(msg, "Upload Änderungen");
                // if (
                //   $("#syncLayerIcon_" + this.getGlobalId()).hasClass("fa-spinner")
                // ) {
                //   $("#syncLayerIcon_" + this.getGlobalId()).toggleClass(
                //     "fa-refresh fa-spinner fa-spin"
                //   );
                //   kvm.closeSperrDiv(msg);
                // }
              };
              fileWriter.write(dataObj);
            },
            (fileError) => {
              reject({
                message: `Fehler beim Erzeugen des FileWriter von Entry nativeUrl=${fileEntry.nativeURL} name=${fileEntry.name}`,
                cause: fileError,
              });
            }
          );
        });
      },
      (fileError) => {
        reject({
          message: `Fehler in resolveLocalFileSystemURL nativeUrl=${dir}`,
          cause: fileError,
        });
      }
    );
  });
}

export async function readFileAsString(fileEntry: FileEntry, encoding?: string) {
  return new Promise<string>((resolve, reject) => {
    const fileReadFct = (file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(<string>reader.result);
      };
      reader.onerror = (ev) => {
        reject({ message: "Fehler beim Lesen des Blobs", cause: ev });
      };
      reader.readAsText(file);
    };

    fileEntry.file(fileReadFct, (error) =>
      reject({
        message: `Fehler beim Laden der Datei: ${fileEntry.name}.`,
        cause: error,
      })
    );
  });
}

export function upload(fileURL: string, server: string, options?: FileUploadOptions, trustAllHosts?: boolean) {
  return new Promise<FileUploadResult>((resolve, reject) => {
    const ft = new FileTransfer();
    ft.upload(
      fileURL,
      server,
      (result: FileUploadResult) => resolve(result),
      (error: FileTransferError) => reject(error),
      options,
      trustAllHosts
    );
  });
}

export function download(fileURL: string, localFile: string, trustAllHosts?: boolean, options?: FileDownloadOptions) {
  return new Promise<FileEntry>((resolve, reject) => {
    const ft = new FileTransfer();
    ft.download(
      fileURL,
      localFile,
      (result: FileEntry) => resolve(result),
      (error: FileTransferError) => reject({ message: "Fehler beim Download", cause: error }),
      trustAllHosts,
      options
    );
  });
}

export async function showAlert(message: string, title?: string, buttonName?: string) {
  return new Promise<void>((resolve, reject) => {
    navigator.notification.alert(
      message,
      () => {
        resolve();
      },
      title,
      buttonName
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

export function createHtmlElement<K extends keyof HTMLElementTagNameMap>(tag: K, parent?: HTMLElement, className?: string, mixin?: any): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (parent) {
    parent.appendChild(el);
  }
  if (className) {
    el.className = className;
  }
  if (mixin) {
    for (const k in mixin) {
      el[k] = mixin[k];
    }
  }
  return el;
}

export function getValueOfElement(id: string): string {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
    return el.value;
  }
  return null;
}

export function setValueOfElement(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
    el.value = value;
  }
}

export function removeOptions(selectElement: HTMLSelectElement) {
  for (let i = selectElement.options.length - 1; i >= 0; i--) {
    selectElement.remove(i);
  }
}

export function hideElement(id: string) {
  const el = document.getElementById(id);
  el.style.display = "none";
}
export function showElement(id: string) {
  const el = document.getElementById(id);
  el.style.display = "";
}

export function underlineToPointName(sql: string, schema: string, table: string) {
  return sql.replace(schema + "_" + table, schema + "." + table);
}

export function pointToUnderlineName(sql: string, schema: string, table: string) {
  return sql.replace(schema + "." + table, schema + "_" + table);
}

export async function getSpatialLiteVersion(db: SQLitePlugin.Database) {
  try {
    const rs = await executeSQL(this.db, "SELECT spatialite_version() as version");
    return <string>rs.rows.item(0).version;
  } catch (err) {
    return "Kann nicht ermittelt werden. Fehler: " + err.message;
  }
}
export async function getSqliteVersion(db: SQLitePlugin.Database) {
  try {
    const rs = await executeSQL(this.db, "SELECT sqlite_version() as version");
    return <string>rs.rows.item(0).version;
  } catch (err) {
    return "Kann nicht ermittelt werden. Fehler: " + err.message;
  }
}
/**
 * wechselt die Sichtbarkeit (via display)
 * @param el
 */
export function toggle(el: HTMLElement) {
  el.style.display = el.style.display === "none" ? "" : "none";
}

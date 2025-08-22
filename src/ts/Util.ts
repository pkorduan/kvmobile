/// <reference types="cordova-plugin-file" />

import type { FingerprintAuth as FingerprintAuthI, FingerprintAuthConfig, FingerprintAuthEncryptSuccess, FingerprintAuthIsAvailableSuccess, IFingerprintAuthErrors } from "cordova-plugin-android-fingerprint-auth";
import { LatLngTuple } from "leaflet";
declare var FingerprintAuth: typeof FingerprintAuthI;

// export type AsyncFunction<T> = (params?: any) => Promise<T>;

export async function checksum(obj: any) {
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const checksumBuffer = await window.crypto.subtle.digest("SHA-1", data);
  const uint8ViewOfHash = new Uint8Array(checksumBuffer);
  // We then convert it to a regular array so we can convert each item
  // to hexadecimal strings, where characters of 0-9 or a-f represent
  // a number between 0 and 15, containing 4 bits of information,
  // so 2 of them is 8 bits (1 byte).
  const hashAsString = Array.from(uint8ViewOfHash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashAsString;
}

export function listFiles(dir: string) {
  window.resolveLocalFileSystemURL(
    dir,
    function (entry) {
      // console.error("listFiles: " + dir);
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

export function printResultSet(headline: string, rs: SQLitePlugin.Results) {
  let s = headline + "\n";
  for (let i = 0; i < rs.rows.length; i++) {
    const row = rs.rows.item(i);
    for (const k in row) {
      s += k + ":" + row[k] + "\t";
    }
    s += "\n";
  }
  console.info(s);
}

export async function openDatabase(dbname: String) {
  return new Promise<SQLitePlugin.Database>((resolve, reject) => {
    window.sqlitePlugin.openDatabase(
      {
        name: dbname + ".db",
        location: "default",
        androidDatabaseImplementation: 2,
      },
      (db) => {
        resolve(db);
      },
      (error) => {
        reject(Error('Fehler beim Anlegen der Datenbank "${dbname}"', { cause: error }));
      }
    );
  });
}

export async function deleteDatabase(dbname: String) {
  // console.error("deleteDatabase");
  return new Promise<boolean>((resolve, reject) => {
    window.sqlitePlugin.deleteDatabase(
      {
        name: dbname + ".db",
        location: "default",
      },
      () => {
        resolve(true);
      },
      (error) => {
        reject(Error('Fehler beim Löschen der Datenbank "${dbname}"', { cause: error }));
      }
    );
  });
}

export async function executeSQL(db: SQLitePlugin.Database, statement: string, params?: any[]): Promise<SQLitePlugin.Results> {
  // console.error("executeSQL", statement, params);
  return new Promise<SQLitePlugin.Results>((resolve, reject) => {
    db.executeSql(
      statement,
      params,
      (results) => resolve(results),
      (err) => reject(Error(`Fehler beim Ausführen der SQL-Anweisung ${statement}`, { cause: err }))
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
        reject(Error(`Fehler beim Testen, ib die Tabelle ${tablename} existiert`, { cause: err }));
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
        console.info(`could not find entry for "${url}"`);
        resolve(null);
        // reject(error);
      }
    );
  });
}

export function getFileErrorAsText(code: number) {
  switch (code) {
    case FileError.ABORT_ERR:
      return "ABORT_ERR";
    case FileError.ENCODING_ERR:
      return "ENCODING_ERR";
    case FileError.INVALID_MODIFICATION_ERR:
      return "INVALID_MODIFICATION_ERR";
    case FileError.INVALID_STATE_ERR:
      return "INVALID_STATE_ERR";
    case FileError.NOT_READABLE_ERR:
      return "NOT_READABLE_ERR";
    case FileError.NO_MODIFICATION_ALLOWED_ERR:
      return "NO_MODIFICATION_ALLOWED_ERR";
    case FileError.PATH_EXISTS_ERR:
      return "PATH_EXISTS_ERR";
    case FileError.QUOTA_EXCEEDED_ERR:
      return "QUOTA_EXCEEDED_ERR";
    case FileError.SECURITY_ERR:
      return "SECURITY_ERR";
    case FileError.SYNTAX_ERR:
      return "SYNTAX_ERR";
    default:
      return "unkwown";
  }
}

/**
 *
 * @param {string} url must start with file://tsdoc
 * @returns {Promise<boolean>}
 */
export async function fileExists(url: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    window.resolveLocalFileSystemURL(
      url,
      (fileEntry: Entry) => {
        resolve(fileEntry.isFile || fileEntry.isDirectory);
      },
      (e: FileError) => {
        if (e.code === FileError.NOT_FOUND_ERR) {
          resolve(false);
        }
        reject(new Error(getFileErrorAsText(e.code) + " in fileExists"));
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
                reject(Error(`Fehler beim Schreiben der Datei "${file}" in das Verzeichnis "${dir}".`, { cause: e }));
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
              reject(Error(`Fehler beim Erzeugen des FileWriter von Entry nativeUrl=${fileEntry.nativeURL} name=${fileEntry.name}`, { cause: fileError }));
            }
          );
        });
      },
      (fileError) => {
        reject(Error(`Fehler in resolveLocalFileSystemURL nativeUrl=${dir}`, { cause: fileError }));
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
        reject(Error("Fehler beim Lesen des Blobs", { cause: ev }));
      };
      reader.readAsText(file);
    };

    fileEntry.file(fileReadFct, (error) => {
      reject(Error(`Fehler beim Laden der Datei: ${fileEntry.name}.`, { cause: error }));
    });
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
      (error: FileTransferError) => reject(Error("Fehler beim Download", { cause: error })),
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
/**
 * Shows a confirmation dialog box
 *
 * @param message
 * @param title Titel des Dialoges Default: "Confirm"
 * @param okButtonText
 * @param rejectButtonText
 * @returns {Promise<boolean>} true if ok button is chosen
 */
export async function confirm(message: string, title?: string, okButtonText?: string, rejectButtonText?: string) {
  return new Promise<boolean>((resolve, reject) => {
    navigator.notification.confirm(
      message,
      (buttonIndex) => {
        console.info("confirmed: " + (buttonIndex === 1));
        resolve(buttonIndex === 1);
      },
      title,
      [okButtonText || "ok", rejectButtonText || "Abbruch"]
    );
  });
}
/**
 * Shows a alert box using cordava navigator.notification.alert
 *
 * @param message
 * @param title Titel des Dialoges Default: "Alert"
 * @param buttonText Default: "oK"
 * @returns {Promise<void>}
 */
export async function alertNative(message: string, title?: string, buttonText?: string): Promise<void> {
  console.info(message);
  return new Promise<void>((resolve, reject) => {
    navigator.notification.alert(
      message,
      () => {
        resolve();
      },
      title,
      buttonText || "ok"
    );
  });
}

export async function alertOverlay(message: string, title?: string, okButtonText?: string, exMsg?: string) {
  console.trace("Util.alert");
  const div = document.createElement("div");
  div.className = "msg-background";
  const msgDiv = createHtmlElement("div", div, "msg-pane");
  const msgTitle = createHtmlElement("div", msgDiv, "msg-title");
  msgTitle.innerText = title || "";
  const msgTextWrapper = createHtmlElement("div", msgDiv, "msg-text-wrapper");
  const msgText = createHtmlElement("div", msgTextWrapper, "msg-text");
  msgText.innerText = message;

  const divBttns = createHtmlElement("div", null, "msg-button-div");
  if (exMsg) {
    const divShowMore = createHtmlElement("div", msgDiv);
    const bttnShowMore = createHtmlElement("span", divBttns, "msg-button");
    bttnShowMore.innerText = "mehr";
    const showMoreText = createHtmlElement("div", msgDiv, "msg-details");
    showMoreText.innerHTML = exMsg.trim();
    showMoreText.style.display = "none";
    bttnShowMore.addEventListener("click", () => {
      if (bttnShowMore.innerText === "mehr") {
        showMoreText.style.display = "";
        bttnShowMore.innerText = "weniger";
      } else {
        showMoreText.style.display = "none";
        bttnShowMore.innerText = "mehr";
      }
    });
  }

  const okBttn = createHtmlElement("button", divBttns, "msg-button");
  okBttn.innerText = okButtonText || "OK";
  okBttn.addEventListener("click", () => {
    div.remove();
  });
  msgDiv.appendChild(divBttns);

  document.body.appendChild(div);
}

export async function showError(msg: string, ex: Error | any) {
  console.trace("errorMesg", msg, ex);
  let exMsg = "";
  if (ex) {
    let indent = "\t";
    while (ex) {
      exMsg += "\nUrsache:\n";
      if (ex instanceof Error) {
        // msg += indent + ex.message + "\n";
        exMsg += ex.stack;
      } else {
        exMsg += indent + JSON.stringify(ex);
      }
      ex = ex.cause;
    }
  }
  await alertOverlay(msg, "Fehler", "ok", exMsg);
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
    const rs = await executeSQL(db, "SELECT spatialite_version() as version");
    return <string>rs.rows.item(0).version;
  } catch (err) {
    return "Kann nicht ermittelt werden. Fehler: " + err.message;
  }
}
export async function getSqliteVersion(db: SQLitePlugin.Database) {
  try {
    const rs = await executeSQL(db, "SELECT sqlite_version() as version");
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

export function isFingerprintAuthAvailable() {
  return new Promise<boolean>((resolve, reject) => {
    FingerprintAuth.isAvailable(
      (result: FingerprintAuthIsAvailableSuccess) => {
        console.log("FingerprintAuth available: " + JSON.stringify(result));
        resolve(result.isAvailable);
      },
      function (error: string) {
        reject(error);
      }
    );
  });
}

export function encryptFingerPrint(encryptConfig: FingerprintAuthConfig) {
  return new Promise<boolean>((resolve, reject) => {
    FingerprintAuth.encrypt(
      encryptConfig,
      function (_fingerResult: FingerprintAuthEncryptSuccess) {
        //console.log("successCallback(): " + JSON.stringify(_fingerResult));
        if (_fingerResult.withFingerprint) {
          resolve(true);
        } else if (_fingerResult.withBackup) {
          resolve(true);
        }
        resolve(false);
      },
      function (err: IFingerprintAuthErrors) {
        if (err === "FINGERPRINT_CANCELLED") {
          resolve(false);
        } else {
          reject("FingerprintAuth Error: " + err);
        }
      }
    );
  });
}

export function traceElementChange(el: HTMLElement) {
  const callback = (mutationList: MutationRecord[], observer: MutationObserver) => {
    for (const mutation of mutationList) {
      if (mutation.type === "childList") {
        console.log("A child node has been added or removed.", mutation.addedNodes);
      } else if (mutation.type === "attributes") {
        console.error(`The ${mutation.attributeName} attribute was modified.`, mutation);
      }
    }
  };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);

  // Start observing the target node for configured mutations
  observer.observe(el || document.body, { attributes: true, childList: true, subtree: true });

  return observer;
}

export function getCurrentPosition() {
  return new Promise<GeolocationPosition | GeolocationPositionError>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (geoLocation) => {
        resolve(geoLocation);
      },
      (error) => {
        resolve(error);
      },
      {
        maximumAge: 2000, // duration to cache current position
        timeout: 5000, // timeout for try to call successFunction, else call errorFunction
        enableHighAccuracy: true, // take position from gps not network-based method
      }
    );
  });
}

/**
 * zeigt das Element für die showTime in msec und blendet es danach über die fadeTime aus;
 *
 * @export
 * @param {*} el
 * @param {*} showTime
 * @param {*} fadeTime
 */
export function showShort(el: HTMLElement, showTime: number, fadeTime: number) {
  console.info(`showShort showTime=${showTime} fadeTime=${fadeTime}`);
  el.addEventListener("transitionend", (ev) => {
    console.info("animationend");
    el.style.display = "none";
  });
  el.style.display = "";
  el.style.transitionDuration = "";
  el.style.transitionProperty = "";
  el.style.opacity = "1";
  window.setTimeout(() => {
    console.info(`fadeout showTime=${showTime} fadeTime=${fadeTime}`);
    el.style.transitionDuration = fadeTime + "ms";
    el.style.transitionProperty = "opacity";
    el.style.opacity = "0";
  }, showTime);
}

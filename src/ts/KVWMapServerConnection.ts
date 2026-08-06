/// <reference types="./type"/>

import { kvm } from "./app";
import { SendDeltasResponse } from "./Stelle";
import * as Util from "./Util";
import { createHtmlElement } from "./Util";

export type LoginResponse = {
  success: boolean;
  error?: string;
  msg?: string;
};

export class AccessError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "AccessError";
  }
}

export class AgreementNotAcceptError extends Error {
  constructor(message?) {
    super(message);
    this.name = "AgreementNotAcceptError";
  }
}

export interface ErrorBasis {
  error: string;
}

export interface AgreementMissingError extends ErrorBasis {
  error: "AGREEMENT_MISSING";
  error_msg: string;
  agreement_url: string;
  agree_param: string;
  agreement_html: string;
}

export interface LoginError extends ErrorBasis {
  error: "LOGIN_REQUIRED";
  error_msg: string;
  agreement_url: string;
  agree_param: string;
  agreement_html: string;
}

export interface LoginFailedError extends ErrorBasis {
  error: "LOGIN_FAILED";
  error_msg: string;
}

export type ErrorResponse = AgreementMissingError | LoginError | LoginFailedError;

export type ServerParameter = { url: string; login: string; password: string; stelleId?: string };

export class KVWMapServerConnection {
  credential: ServerParameter | null = null;

  csrfToken: string | null;
  isLoginPending: boolean = false;

  setServerParameter(serverParam: ServerParameter) {
    const csrfToken = window.localStorage.getItem("csrf_token");
    if (csrfToken && csrfToken !== "undefined") {
      this.csrfToken = csrfToken;
    }
    this.credential = serverParam;
    if (serverParam && serverParam.url) {
      const url = serverParam.url;
      let file = "";
      if (url.slice(-3) == ".de") file = "/index.php?";
      if (url.slice(-1) == "/") file = "index.php?";
      if (url.slice(-9) == "index.php") file = "?";
      if (file == "") file = "/index.php?";
      serverParam.url = url + file;
    }
    console.info("this.setCredential", serverParam);
  }

  private async handleError(resultObj: ErrorResponse): Promise<any> {
    if (!this.credential) {
      throw new Error("Serverparameter nicht gesetzt");
    }

    if ("error" in resultObj) {
      if (resultObj.error === "LOGIN_FAILED") {
        await kvm.msg("Die Zugangsdaten sind fehlerhaft. Bitte ändern Sie diese unter Einstellungen|Zugangsdaten");
        kvm.showSetting("panelZugangsdaten");
        throw new AccessError("Die Zugangsdaten sind fehlerhaft. Bitte ändern Sie diese unter Einstellungen|Zugangsdaten");
      }
      if (resultObj.error === "LOGIN_REQUIRED") {
        return this.runLogin();
      }
      if (resultObj.error === "AGREEMENT_MISSING") {
        return this.handleErrorAgreementMissing(resultObj);
      }
    } else {
      throw new Error("Method not implemented.");
    }
  }

  async runLogin(): Promise<LoginResponse> {
    // const param = {
    //   login_name: this.credential.login,
    //   passwort: this.credential.password,
    //   Stelle_ID: this.credential.stelleId || "",
    //   kvmobile_version: kvm.versionNumber,
    // };
    if (this.isLoginPending) {
      return;
    }
    this.isLoginPending = true;
    cordova.plugin.http.clearCookies();

    const options: CordovaHttp.HttpOptions = {
      method: "get",
      params: {
        login_name: this.credential.login,
        passwort: this.credential.password,
        Stelle_ID: this.credential.stelleId || "",
        kvmobile_version: kvm.versionNumber,
        format: "json",
        mime_type: "json_result",
      },
    };
    try {
      const response = await this.httpSendRequest(this.credential.url, options);
      console.info("runGetRequest=>response", response);
      const responseData = JSON.parse(response.data);
      Util.writeLog("runLogin", responseData);
      if (responseData.csrf_token) {
        this.csrfToken = responseData.csrf_token;
        window.localStorage.setItem("csrf_token", responseData.csrf_token);
      }
      this.isLoginPending = false;
      return responseData;
    } catch (ex) {
      this.isLoginPending = false;
      throw new Error("Fehler bei der Kommunikation mit dem Server.", { cause: ex });
    }
  }

  private async handleErrorAgreementMissing(resultObj) {
    Util.writeLog("AgreementMissing");
    return new Promise((resolve, reject) => {
      const divDatenschutz = document.createElement("div");
      divDatenschutz.style.cssText = "z-index:4001;width: 100%;height: 100%;overflow: hidden;position: absolute;background-color: aliceblue;padding: 4px;font-size: medium;top: 0px;display: flex;flex-direction: column;";
      const divText = createHtmlElement("div", divDatenschutz);
      divText.innerHTML = resultObj.agreement_html;
      divText.style.cssText = "overflow:auto";

      const divBttn = createHtmlElement("div", divDatenschutz);
      divBttn.style.cssText = "min-height: 2rem;display: flex;justify-content: space-evenly;padding: 0.2rem";

      const bttnOk = createHtmlElement("button", divBttn);
      bttnOk.style.cssText = "width:40%";
      bttnOk.innerText = "akzeptieren";
      bttnOk.addEventListener("click", () => {
        let url = this.credential.url;
        url += "index.php?login_name=" + encodeURIComponent(this.credential.login);
        url += "&passwort=" + encodeURIComponent(this.credential.password);
        url += "&agreement=1";
        url += "&agreement_accepted=1";
        url += "&mime_type=json";
        url += "&format=json_result";
        // url += "&format=json";
        cordova.plugin.http.get(
          url,
          null,
          null,
          (response) => {
            console.info(response);
            if (response.status === 200) {
              divDatenschutz.remove();
              resolve(true);
            } else {
              divDatenschutz.remove();
              reject(response);
            }
          },
          (err) => {
            console.error(err);
            divDatenschutz.remove();
            reject(err);
          },
        );
      });

      const bttnCancel = createHtmlElement("button", divBttn);
      bttnCancel.style.cssText = "width:40%";
      bttnCancel.innerText = "ablehnen";
      bttnCancel.addEventListener("click", () => {
        // divDatenschutz.remove();
        Util.showAlert("Sie haben den Datenschutzerklärungen nicht zugestimmt. Ohne Ihre Zustimmung ist die App nicht verwendbar.");
        // navigator.app.exitApp();
        // reject(new AgreementNotAcceptError());
      });

      document.body.append(divDatenschutz);
    });
  }

  async runGetRequest(params: any): Promise<any> {
    if (!this.credential) {
      throw new Error("Serverparameter nicht gesetzt");
    }
    const urlParams = {
      ...params,
      Stelle_ID: this.credential.stelleId || "",
      format: "json",
      mime_type: "json_result",
      kvmobile_version: kvm.versionNumber,
      login_name: this.credential.login,
      passwort: this.credential.password,
    };
    if (this.csrfToken) {
      urlParams.csrf_token = this.csrfToken;
    }
    const options: CordovaHttp.GetOptions = { method: "get", params: urlParams };
    let response: CordovaHttp.HttpResponse;
    try {
      response = await this.httpSendRequest(this.credential.url, options);
      console.info("runGetRequest=>response", response);
      Util.writeLog("runGetRequest=>response", response);
    } catch (ex) {
      throw new Error("Fehler bei der Kommunikation mit dem Server.", { cause: ex });
    }

    if (response.status === 200) {
      try {
        const resultObj = JSON.parse(response.data);
        if (Array.isArray(resultObj)) {
          const response = await this.runLogin();
          if (response) {
            this.runGetRequest(params);
          }
        } else if ("error" in resultObj) {
          const success = await this.handleError(resultObj);
          if (success) {
            return await this.runGetRequest(params);
          } else {
            throw new Error("Fehler", { cause: resultObj });
          }
        } else {
          return resultObj;
        }
      } catch (ex) {
        if (ex instanceof SyntaxError) {
          throw new Error("Beim Parsen tratt ein Fehler auf.", { cause: ex });
        }
        throw ex;
      }
    } else if (Array.isArray(response)) {
      const response = await this.runLogin();
      if (response) {
        this.runGetRequest(params);
      }
    } else {
      throw new Error("Fehler bei der Kommunikation mit dem Server.", { cause: response });
    }
  }

  async runDownloadFile(params: any, filePath: string): Promise<FileEntry> {
    Util.writeLog(`runDownloadFile ${JSON.stringify(params)} to ${filePath}`);
    if (!this.credential) {
      throw new Error("Serverparameter nicht gesetzt");
    }
    const urlParams = {
      ...params,
      Stelle_ID: this.credential.stelleId || "",
      kvmobile_version: kvm.versionNumber,
      format: "json",
      mime_type: "json_result",
      login_name: this.credential.login,
      passwort: this.credential.password,
    };
    if (this.csrfToken) {
      urlParams.csrf_token = this.csrfToken;
    }
    try {
      return await this.httpDownloadFile(this.credential.url, urlParams, {}, filePath);
    } catch (err) {
      Util.writeLog(`runDownloadFile ${JSON.stringify(urlParams)}`, err);
      if (err?.status === 405) {
        console.error("runDownloadFile 405");
        await this.runLogin();
        if (this.csrfToken) {
          urlParams.csrf_token = this.csrfToken;
        }
        return await this.httpDownloadFile(this.credential.url, urlParams, {}, filePath);
      }
    }
  }

  /**
   * Description placeholder
   *
   * @async
   * @param {FileEntry} fileEntry
   * @param {number} lastDeltaVersion
   * @returns {Promise<FileUploadResult>}
   */
  async mobileSyncAll(fileEntry: FileEntry, lastDeltaVersion: number): Promise<SendDeltasResponse> {
    const fileURL = fileEntry.nativeURL;
    // console.log(`going to upload deltas fileURL: "${fileURL}`);

    const server = this.credential.url;

    const options: FileUploadOptions = {
      params: {
        Stelle_ID: this.credential.stelleId || "",
        login_name: this.credential.login,
        passwort: this.credential.password,
        client_id: device.uuid,
        client_time: Util.now(),
        last_delta_version: lastDeltaVersion,
        mime_type: "json",
        format: "json_result",
        go: "mobile_sync_all",
        kvmobile_version: kvm.versionNumber,
      },
      chunkedMode: true,
      fileKey: "client_deltas",
      fileName: fileURL.substring(fileURL.lastIndexOf("/") + 1),
      mimeType: "application/json",
    };
    console.log(`going to upload deltas fileURL: "${fileURL} to url: "${this.credential.url}"`, options);
    const response = await this.upload(fileURL, encodeURI(server), options);
    try {
      return <SendDeltasResponse>JSON.parse(response.response);
    } catch (ex) {
      throw new Error("Konnte Antwort nicht parsen", { cause: ex });
    }
  }
  /**
   * Description placeholder
   *
   * @async
   * @param {FileEntry} fileEntry
   * @param {number} lastDeltaVersion
   * @returns {Promise<FileUploadResult>}
   */
  async mobileSyncAllX(fileEntry: FileEntry, lastDeltaVersion: number): Promise<SendDeltasResponse> {
    const fileURL = fileEntry.nativeURL;
    // console.log(`going to upload deltas fileURL: "${fileURL}`);

    const server = this.credential.url;

    const params = {
      client_id: device.uuid,
      client_time: Util.now(),
      last_delta_version: lastDeltaVersion,
      mime_type: "json",
      format: "json_result",
      go: "mobile_sync_all",
      kvmobile_version: kvm.versionNumber,
    };
    console.log(`going to upload deltas fileURL: "${fileURL} to url: "${this.credential.url}"`, params);

    const response = await this.runUploadFile(params, fileEntry, "client_deltas");
    // urlParams: any, fileEntry: FileEntry, paramName: string
    try {
      return <SendDeltasResponse>JSON.parse(response.response);
    } catch (ex) {
      throw new Error("Konnte Antwort nicht parsen", { cause: ex });
    }
  }

  async upload(fileURL: string, server: string, options?: FileUploadOptions, trustAllHosts?: boolean) {
    const uploadOptions = {
      ...options,
    };
    uploadOptions.params["format"] = "json";
    uploadOptions.params["mime_type"] = "json_result";
    return new Promise<FileUploadResult>((resolve, reject) => {
      const ft = new FileTransfer();
      ft.upload(
        fileURL,
        server,
        (result: FileUploadResult) => resolve(result),
        (error: FileTransferError) => reject(error),
        uploadOptions,
        trustAllHosts,
      );
    });
  }

  async mobileSyncAllNew(fileEntry: FileEntry, lastDeltaVersion: number): Promise<SendDeltasResponse> {
    // 1. Das native File-Objekt aus dem FileEntry extrahieren
    // xxxxx
    if (!this.credential) {
      throw new Error("Serverparameter nicht gesetzt");
    }

    const params = {
      login_name: this.credential.login,
      passwort: this.credential.password,
      Stelle_ID: this.credential.stelleId || "",
      kvmobile_version: kvm.versionNumber,
      client_id: device.uuid,
      client_time: Util.now(),
      last_delta_version: lastDeltaVersion,
      mime_type: "json",
      format: "json_result",
      go: "mobile_sync_all",
    };
    let url = this.credential.url;
    let i = 0;
    for (let k in params) {
      if (i === 0) {
        url += "?";
      } else {
        url += "&";
      }
      url += k + "=" + params[k];
      i++;
    }
    debugger;

    fileEntry.file(
      function (file) {
        // 2. FormData-Objekt erstellen (entspricht einem HTML-Formular)
        const formData = new FormData();

        // 3. Die Datei an das Formular anhängen
        // 'file' ist der Name des POST-Parameters, den PHP in $_FILES['file'] erwartet
        formData.append("client_deltas", file, fileEntry.name);

        // // 4. Zusätzliche POST-Parameter anhängen (falls vorhanden)
        // Object.keys(additionalFields).forEach(key => {
        //     formData.append(key, additionalFields[key]);
        // });

        console.log("Starte ressourcenschonenden Upload via fetch()...");

        // 5. Den Request absenden
        fetch(url, {
          method: "POST",
          body: formData,
          // WICHTIG: Keine Content-Type Header setzen!
          // Der Browser/WebView setzt den Content-Type inkl. Boundary automatisch korrekt.
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Server-Fehler: " + response.statusText);
            }
            // Erwartet dein PHP-Skript JSON, Text oder XML als Antwort?
            return response.text(); // Ändere zu response.json(), falls JSON zurückkommt
          })
          .then((responseText) => {
            console.log("Upload erfolgreich! Server-Antwort:", responseText);
          })
          .catch((error) => {
            console.error("Fehler beim fetch-Upload:", error);
          });
      },
      function (fileError) {
        console.error("Fehler beim Lesen des FileEntry:", fileError);
      },
    );
    return;
  }

  async runUploadFile(urlParams: any, fileEntry: FileEntry, paramName: string): Promise<any> {
    if (!this.credential) {
      throw new Error("Serverparameter nicht gesetzt");
    }
    const params = {
      ...urlParams,
      Stelle_ID: this.credential.stelleId || "",
      kvmobile_version: kvm.versionNumber,
      format: "json",
      mime_type: "json_result",
    };
    if (this.csrfToken) {
      urlParams.csrf_token = this.csrfToken;
    }
    let response: CordovaHttp.HttpResponse;
    try {
      // cordova.plugin.http.setDataSerializer("json");
      cordova.plugin.http.setRequestTimeout(60.0);
      response = await this.httpUploadFile(this.credential.url, urlParams, null, fileEntry, paramName);
      console.info("runUploadFile=>response", response);
    } catch (ex) {
      throw new Error("Fehler bei der Kommunikation mit dem Server.", { cause: ex });
    }

    if (response.status === 200) {
      try {
        const resultObj = JSON.parse(response.data);
        if ("error" in resultObj) {
          const success = await this.handleError(resultObj);
          if (success) {
            return await this.runUploadFile(params, fileEntry, paramName);
          } else {
            throw new Error("Error handling doesn't succeed", { cause: resultObj });
          }
        } else {
          return resultObj;
        }
      } catch (ex) {
        if (ex instanceof SyntaxError) {
          throw new Error("Beim Parsen tratt ein Fehler auf.", { cause: ex });
        }
        throw ex;
      }
    } else {
      throw new Error("Fehler bei der Kommunikation mit dem Server.", { cause: response });
    }
  }

  private httpDownloadFile(url: string, urlParam: any, headers: any, filePath: string, isRetry?: boolean) {
    return new Promise<FileEntry>((resolve, reject) => {
      cordova.plugin.http.downloadFile(
        url,
        urlParam,
        headers,
        filePath,
        (response) => {
          console.info(response);
          resolve(response);
        },
        (err) => {
          if (err.status === 405) {
            if (!isRetry) {
              this.runLogin();
              this.httpDownloadFile(url, urlParam, headers, filePath, true);
            }
          }
          console.error(err);
          reject(err);
        },
      );
    });
  }

  private httpUploadFile(url: string, urlParam: any, headers: any, filePath: FileEntry, name: string) {
    return new Promise<CordovaHttp.HttpResponse>((resolve, reject) => {
      cordova.plugin.http.uploadFile(
        url,
        urlParam,
        headers,
        filePath.nativeURL,
        name,
        (response) => {
          resolve(response);
        },
        (err) => {
          console.error(err);
          reject(err);
        },
      );
    });
  }

  private httpSendRequest(url: string, options: CordovaHttp.HttpOptions) {
    return new Promise<CordovaHttp.HttpResponse>((resolve, reject) => {
      cordova.plugin.http.sendRequest(
        url,
        options,
        (response) => {
          resolve(response);
        },
        (err) => {
          console.error(err);
          reject(err);
        },
      );
    });
  }
}

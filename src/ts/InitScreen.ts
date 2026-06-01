import { Kvm } from "./app";
import { AccessError, AgreementNotAcceptError } from "./KVWMapServerConnection";
import { sperrBildschirm } from "./SperrBildschirm";
import { RequestStellenResponse } from "./Stelle";
import { alertNative, createHtmlElement, writeLog, showError } from "./Util";
import { StelleSettings } from "./views/PanelEinstellungen";
export async function showInitScreen(app: Kvm) {
  return new Promise<StelleSettings>((resolve, reject) => {
    new InitScreen(app).show(resolve, reject);
  });
}

class InitScreen {
  app: Kvm;

  loginContainer: HTMLDivElement;
  titleLabel: HTMLLabelElement;
  userLabel: HTMLLabelElement;
  passLabel: HTMLLabelElement;

  userInput: HTMLInputElement;
  passInput: HTMLInputElement;

  loginBttn: HTMLButtonElement;
  nextBttn: HTMLButtonElement;

  selectField: HTMLSelectElement;

  stellenSettings: StelleSettings[] | undefined;

  resolve: (value?: any) => void;
  reject: (reason?: any) => void;

  constructor(app: Kvm) {
    let kvwmobileLoginName = null;
    let kvwmobilePassword = null;
    if (app.store) {
      kvwmobileLoginName = window.localStorage.getItem("kvwmapServerLoginName");
      kvwmobilePassword = window.localStorage.getItem("kvwmapServerPasswort");
    }
    if (kvwmobileLoginName && kvwmobilePassword) {
      try {
        kvwmobileLoginName = JSON.parse(kvwmobileLoginName);
        kvwmobilePassword = JSON.parse(kvwmobilePassword);
      } catch (ex) {}
    }
    this.app = app;
    this.loginContainer = document.createElement("div");
    this.loginContainer.id = "login-box";
    this.titleLabel = document.createElement("label");
    this.titleLabel.className = "title";
    this.titleLabel.innerText = this.app.getConfigurationOption("name");

    this.userInput = document.createElement("input");
    this.userInput.value = kvwmobileLoginName || "";
    this.userInput.id = "input-username";
    this.userInput.autocomplete = "username";
    this.userInput.required = true;
    this.userInput.type = "text";
    this.userLabel = document.createElement("label");
    this.userLabel.innerText = "Benutzername:";
    this.userLabel.htmlFor = "input-username";

    this.passInput = document.createElement("input");
    this.passInput.value = kvwmobilePassword || "";
    this.passInput.id = "input-pwd";
    this.passInput.required = true;
    this.passInput.type = "password";
    this.passLabel = document.createElement("label");
    this.passLabel.innerText = "Passwort:";
    this.passLabel.htmlFor = "input-pwd";

    // 3. Button mit Event-Listener
    this.loginBttn = document.createElement("button");
    this.loginBttn.innerText = "weiter";
    this.loginBttn.addEventListener("click", () => this.loginBttnClicked());

    this.nextBttn = document.createElement("button");
    this.nextBttn.innerText = "weiter";
    this.nextBttn.addEventListener("click", () => this.nextBttnClicked());

    // this.selectStelleBttn = document.createElement("button");
    // this.selectStelleBttn.innerText = "we";

    this.selectField = document.createElement("select");

    this.loginContainer.append(this.titleLabel, this.userLabel, this.userInput, this.passLabel, this.passInput, this.loginBttn);
  }

  async show(resolve: (value?: StelleSettings) => void, reject: (reason?: any) => void) {
    this.resolve = resolve;
    this.reject = reject;
    document.body.appendChild(this.loginContainer);
  }

  private async loginBttnClicked() {
    const user: string = this.userInput.value.trim();
    const pass: string = this.passInput.value.trim();
    if (user && pass) {
      this.userInput.disabled = true;
      this.passInput.disabled = true;
      this.loginBttn.disabled = true;
      await this.requestStellen(user, pass);
    } else {
      alert("Bitte Benutzername und Passwort eingeben!");
    }
  }

  private async requestStellen(user: string, pass: string) {
    // (serverCredential: { url: string; login: string; password: string }) {
    // const serverCredential = null;
    // kvm.serverConnection.setServerParameter(serverCredential);
    sperrBildschirm.show();
    console.log(`Login-Versuch für: ${user}`);
    this.app.serverConnection.setServerParameter({
      url: this.app.getConfigurationOption("kvwmapServerUrl"),
      login: user,
      password: pass,
    });
    try {
      const resultObj = <RequestStellenResponse>await this.app.serverConnection.runGetRequest({ go: "mobile_get_stellen" });
      this.app.store.setItem("userId", resultObj.user_id);
      this.app.userId = String(resultObj.user_id);
      this.app.store.setItem("userName", resultObj.user_name);
      this.app.userName = String(resultObj.user_name);

      if (resultObj) {
        this.app.setConfigurationOption("kvwmapServerLoginName", user);
        this.app.setConfigurationOption("kvwmapServerPasswort", pass);
        if (resultObj.stellen.length === 1) {
          this.loginContainer.remove();
          this.resolve(resultObj.stellen[0]);
        } else {
          this.loginBttn.remove();
          const selectField = this.selectField;
          selectField.addEventListener("change", () => {
            if (selectField.value !== "-") {
              this.nextBttn.disabled = false;
            }
          });
          this.stellenSettings = resultObj.stellen;
          selectField.append(createHtmlElement("option", selectField, undefined, { value: "-", innerText: "Bitte Stelle wählen" }));
          resultObj.stellen.forEach((stelle) => {
            selectField.append(createHtmlElement("option", selectField, undefined, { value: stelle.ID, innerText: stelle.Bezeichnung }));
          });
          this.loginContainer.append(selectField);
          this.nextBttn.disabled = true;
          this.loginContainer.append(this.nextBttn);
        }
      }
    } catch (ex) {
      if (ex instanceof AccessError) {
        alertNative("Zugang zum Server wurde verweigert. Bitte Prüfen Sie Ihre Zugangsdaten.", "");
      } else if (ex instanceof AgreementNotAcceptError) {
        alertNative("Die Datenschutzerklärung wurde von Ihnen nicht akzeptiert.", "");
      } else {
        writeLog("Die Stellen konnten nicht abgefragt werden.", ex);
        await showError("Die Stellen konnten nicht abgefragt werden.", ex);
      }
      this.userInput.disabled = false;
      this.passInput.disabled = false;
      this.loginBttn.disabled = false;
    }
    sperrBildschirm.close();
  }

  private async nextBttnClicked() {
    console.info("", this.selectField.value);
    sperrBildschirm.show();
    const stelleSetting = this.stellenSettings.find((value) => value.ID === this.selectField.value);
    if (stelleSetting) {
      console.error("new Stelle:", stelleSetting, this.app);
      this.loginContainer.remove();
      this.resolve(stelleSetting);
    }
    sperrBildschirm.close();
  }
}

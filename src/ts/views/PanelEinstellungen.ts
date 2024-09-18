import { Kvm, kvm } from "../app";
import { Configuration, configurations } from "../configurations";
import { FileUtils } from "../controller/files";
import { AttributFilter, Layer } from "../Layer";
import { sperrBildschirm } from "../SperrBildschirm";
import { RequestStellenResponse, Stelle } from "../Stelle";
import { createHtmlElement, removeOptions, setValueOfElement, getSqliteVersion, getSpatialLiteVersion, download, readFileAsString, executeSQL, confirm } from "../Util";

abstract class PanelEinstellungen {
  domHeader: HTMLElement;

  static currentPanel: PanelEinstellungen;
  static id2panel = new Map<string, PanelEinstellungen>();

  constructor(nodeId: string) {
    const dom = (this.domHeader = <HTMLElement>document.getElementById(nodeId));
    PanelEinstellungen.id2panel.set(nodeId, this);
    if (dom) {
      console.error("xxxxx", nodeId, this);
      dom.addEventListener("click", () => {
        if (!dom.classList.toggle("b-collapsed")) {
          if (PanelEinstellungen.currentPanel) {
            PanelEinstellungen.currentPanel.domHeader.classList.add("b-collapsed");
            PanelEinstellungen.currentPanel.hide();
          }
          PanelEinstellungen.currentPanel = this;
          this.show();
        } else {
          this.hide();
          PanelEinstellungen.currentPanel = null;
          show("layer");
        }
      });
    }
  }

  show(): void {
    console.info("show", this);
    this.domHeader.scrollIntoView();
  }
  hide(): void {
    console.info("hide", this);
  }

  static init() {
    console.log("Register click event on .toggle-settings-div");
    const toggleMehr = document.getElementById("toggle_mehr");
    const toggleWeniger = document.getElementById("toggle_weniger");
    toggleMehr.addEventListener("click", () => {
      document.getElementById("switchable_settings_div").style.display = "";
      toggleMehr.style.display = "none";
      toggleWeniger.style.display = "";
    });
    toggleWeniger.addEventListener("click", () => {
      document.getElementById("switchable_settings_div").style.display = "none";
      toggleMehr.style.display = "";
      toggleWeniger.style.display = "none";
    });
  }
}

PanelEinstellungen.init();

export function show(id: string) {
  console.info(`showEinstellung ${id}`);
  const panel = PanelEinstellungen.id2panel.get("h2_" + id);
  if (panel) {
    if (panel !== PanelEinstellungen.currentPanel) {
      panel.domHeader.classList.remove("b-collapsed");
      if (PanelEinstellungen.currentPanel) {
        PanelEinstellungen.currentPanel.domHeader.classList.add("b-collapsed");
      }
      PanelEinstellungen.currentPanel = panel;
    }
    panel.domHeader.scrollIntoView();
  }
}

export class Konfiguration extends PanelEinstellungen {
  // dom: HTMLElement;
  selectField: HTMLSelectElement;

  constructor(configurations: Configuration[]) {
    super("h2_konfiguration");
    const domPanel = document.getElementById("configFileDiv");
    const selectField = (this.selectField = createHtmlElement("select", domPanel));
    selectField.addEventListener("input", () => {
      this.selectFieldChanged();
    });

    const activeConf = kvm.store.getItem("configName");
    for (const configuration of configurations) {
      const option = createHtmlElement("option", selectField);
      option.value = configuration.name;
      option.innerText = configuration.name;
      option.selected = configuration.name == activeConf;
    }
  }

  private selectFieldChanged() {
    navigator.notification.confirm(
      "Wollen Sie wirklich die Konfiguration ändern? Dabei gehen alle lokalen Änderungen verloren, die Layer und Einstellungen werden gelöscht und die Anwendung wird mit den Default-Werten der anderen Konfiguration neu gestartet!",
      (buttonIndex) => {
        if (buttonIndex === 1) {
          kvm.setConfiguration(this.selectField.value);
        }
      },
      "Konfiguration",
      ["Ja", "Abbruch"]
    );
  }

  setKonfigurations() {}
}

export class Server extends PanelEinstellungen {
  requestStellenResponse: RequestStellenResponse;

  // stellen: {
  //   ID: string;
  //   Bezeichnung: string;
  //   dbname: string;
  //   west: number;
  //   south: number;
  //   east: number;
  //   north: number;
  //   startCenterLat: number;
  //   startCenterLon: number;
  //   layer_params: [];
  // }[];
  stelle: Stelle;

  //dom: HTMLElement;
  // kvwmapServerIdField: HTMLInputElement;
  kvwmapServerUrlField: HTMLInputElement;

  kvwmapServerLoginNameField: HTMLInputElement;
  kvwmapServerPasswortField: HTMLInputElement;
  activeStelleBezeichnungDiv: HTMLElement;

  requestStellenButton: HTMLButtonElement;

  kvwmapServerStelleSelectField: HTMLSelectElement;

  saveServerSettingsButton: HTMLButtonElement;

  kvwmapServerNameField: HTMLInputElement;

  constructor() {
    super("h2_server");

    // this.kvwmapServerIdField = <HTMLInputElement>document.getElementById("kvwmapServerIdField");

    this.kvwmapServerNameField = <HTMLInputElement>document.getElementById("kvwmapServerNameField");

    this.kvwmapServerUrlField = <HTMLInputElement>document.getElementById("kvwmapServerUrlField");

    this.kvwmapServerLoginNameField = <HTMLInputElement>document.getElementById("kvwmapServerLoginNameField");
    this.kvwmapServerPasswortField = <HTMLInputElement>document.getElementById("kvwmapServerPasswortField");

    this.activeStelleBezeichnungDiv = <HTMLElement>document.getElementById("activeStelleBezeichnungDiv");

    this.requestStellenButton = <HTMLButtonElement>document.getElementById("requestStellenButton");
    this.requestStellenButton.addEventListener("click", () => this.clickedRequestStellenButton());

    this.kvwmapServerStelleSelectField = <HTMLSelectElement>document.getElementById("kvwmapServerStelleSelectField");

    this.saveServerSettingsButton = <HTMLButtonElement>document.getElementById("saveServerSettingsButton");
    this.saveServerSettingsButton.addEventListener("click", () => this.clickedSaveServerSettingsButton());

    this.kvwmapServerStelleSelectField.addEventListener("change", () => {
      this.saveServerSettingsButton.style.display = "";
    });

    kvm.addEventListener(Kvm.EVENTS.ACTIVE_CONFIGURATION_CHANGED, (evt) => {
      this.setConfiguration(evt.newValue);
    });
    kvm.addEventListener(Kvm.EVENTS.ACTIVE_STELLE_CHANGED, (evt) => {
      this.setStelle(evt.newValue);
    });
    this.setStelle(kvm.getActiveStelle());
  }

  show() {
    super.show();
  }

  private setConfiguration(configName: string) {
    const config = configurations.find((conf) => conf.name === configName);
    this.kvwmapServerNameField.value = config?.kvwmapServerName || "";
    this.kvwmapServerUrlField.value = config?.kvwmapServerUrl || "";
    this.kvwmapServerLoginNameField.value = config?.kvwmapServerLoginName || "";
  }

  setStelle(stelle: Stelle) {
    //kvm.log("ServerSettings.viewSettings", 4);
    if (stelle !== this.stelle) {
      console.error(`setStelle(${stelle?.get("ID")})`);
      this.stelle = stelle;
      // this.kvwmapServerIdField.value = stelle?.get("ID") || "";
      this.kvwmapServerNameField.value = stelle?.get("name") || "";
      this.kvwmapServerUrlField.value = stelle?.get("url") || "";
      this.kvwmapServerLoginNameField.value = stelle?.get("login_name") || "";
      this.kvwmapServerPasswortField.value = stelle?.get("passwort") || "";
    }

    // $("#kvwmapServerStelleSelectField").find("option").remove();
    // // $.each(JSON.parse(this.get("stellen")), function (index, stelle) {
    // // 	$("#kvwmapServerStelleSelectField").append('<option value="' + stelle.ID + '">' + stelle.Bezeichnung + "</option>");
    // // });
    // $("#kvwmapServerStelleSelectField").val(this.get("Stelle_ID"));
    // $("#kvwmapServerStellenField").val(this.get("stellen"));
  }

  private clickedRequestStellenButton() {
    navigator.notification.confirm(
      "Vor dem neu Laden der Stellen müssen alle Änderungen mit dem Server synchronisiert worden sein, sonst können Daten verloren gehen! Ich habe alle Layer synchronisiert. Jetzt andere Stelle auswählen?",
      (buttonIndex) => {
        if (buttonIndex == 1) {
          // ja
          if (navigator.onLine) {
            if (this.kvwmapServerUrlField.value && this.kvwmapServerLoginNameField.value && this.kvwmapServerPasswortField.value) {
              sperrBildschirm.show("Frage Stellen ab");
              this.activeStelleBezeichnungDiv.style.display = "none";
              // const stelle = new Stelle({
              //   url: this.kvwmapServerUrlField.value,
              //   login_name: this.kvwmapServerLoginNameField.value,
              //   passwort: this.kvwmapServerPasswortField.value,
              // });
              // console.log("Stellenobjekt erzeugt um Stellen abfragen zu können: " + JSON.stringify(stelle));
              //kvm.log("Stellenobjekt erzeugt um Stellen abfragen zu können: " + JSON.stringify(stelle), 4);
              // stelle.reloadLayer;
              this.requestStellen();
            } else {
              kvm.msg("Sie müssen erst die Server URL, Nutzername und Password angeben!");
            }
          } else {
            kvm.msg("Kein Internet. Stellen Sie sicher, dass sie eine Netzverbindung haben!");
          }
        }
        if (buttonIndex == 2) {
          // nein
          kvm.msg("Ok, nichts passiert!", "Stellen abfragen");
        }
      },
      "Stellen abfragen",
      ["ja", "nein"]
    );
  }

  private async clickedSaveServerSettingsButton() {
    this.saveServerSettingsButton.style.display = "none";
    if (!navigator.onLine) {
      kvm.msg("Stellen Sie eine Netzverbindung her zum Laden der Layer und speichern Sie noch mal die Servereinstellungen.");
    }
    // const stellen = this.kvwmapServerStellenField.value;
    const selectedStelleId = this.kvwmapServerStelleSelectField.value;
    const stelleSettings = this.requestStellenResponse.stellen.find((stelle) => {
      return stelle.ID == selectedStelleId;
    });
    // stelleSettings["id"] = this.kvwmapServerIdField.value;
    stelleSettings["name"] = this.kvwmapServerNameField.value;
    stelleSettings["bezeichnung"] = this.kvwmapServerStelleSelectField.selectedOptions[0].text;
    stelleSettings["url"] = this.kvwmapServerUrlField.value;
    stelleSettings["login_name"] = this.kvwmapServerLoginNameField.value.trim();
    stelleSettings["passwort"] = this.kvwmapServerPasswortField.value;
    stelleSettings["Stelle_ID"] = this.kvwmapServerStelleSelectField.value;

    const stelle = (this.stelle = new Stelle(stelleSettings));
    // stelle.set("last_delta_version", this.requestStellenResponse.last_delta_version);

    stelle.saveToStore();
    // stelle.activate();
    sperrBildschirm.show();
    kvm.setActiveStelle(stelle);
    await stelle.requestLayers();

    this.kvwmapServerStelleSelectField.style.display = "none";
    this.saveServerSettingsButton.style.display = "none";
    this.requestStellenButton.style.display = "";
    show("layer");
    sperrBildschirm.close();
  }

  setActiveStellenBezeichnung(stellenBezeichnung: string) {
    this.activeStelleBezeichnungDiv.innerHTML = stellenBezeichnung;
    this.activeStelleBezeichnungDiv.style.display = "";
  }

  private getStellenUrl() {
    let url = this.kvwmapServerUrlField.value;
    const file = Stelle.getUrlFile(url);
    url += file + "go=mobile_get_stellen" + "&login_name=" + this.kvwmapServerLoginNameField.value + "&passwort=" + encodeURIComponent(this.kvwmapServerPasswortField.value) + "&format=json";
    return url;
  }

  async requestStellen() {
    const url = this.getStellenUrl();

    kvm.log("Download Stellen von Url: " + url);

    // let response: Response;
    let txt: string;
    try {
      // response = await fetch(url);
      const fileEntry = await download(url, cordova.file.dataDirectory + "stellen.json");
      txt = await readFileAsString(fileEntry);
    } catch (err) {
      const errMsg = "Fehler beim Download der Stellendaten code: " + err.code + " status: " + err.http_status + " Prüfen Sie ob der Nutzer vom dem Gerät aus mit seiner IP auf die Stelle zugreifen darf und die Domain in config.xml eingetragen ist.";
      console.error(err);
      kvm.msg(errMsg);
    }
    let errMsg: string;
    let resultObj: RequestStellenResponse;
    if (txt) {
      // const txt = await response.text();
      if (txt.indexOf('form name="login"') === -1) {
        try {
          resultObj = JSON.parse(txt);
        } catch (err) {
          errMsg = "Fehler beim Abfragen der Stellendaten. Abfrage liefert keine korrekten Daten vom Server. Entweder sind keine auf dem Server vorhanden oder die URL der Anfrage ist nicht korrekt. Prüfen Sie die Parameter unter Einstellungen.";
        }
      } else {
        errMsg = "Zugang zum Server verweigert! Prüfen Sie Ihre Zugangsdaten unter Einstellungen.";
      }
    }

    if (resultObj) {
      console.log("Download erfolgreich. Antwortobjekt: %o", resultObj);
      const selectField = this.kvwmapServerStelleSelectField;
      // this.stellen = resultObj.stellen;
      this.requestStellenResponse = resultObj;

      removeOptions(this.kvwmapServerStelleSelectField);

      kvm.store.setItem("userId", resultObj.user_id);
      kvm.userId = String(resultObj.user_id);
      kvm.store.setItem("userName", resultObj.user_name);
      kvm.userName = String(resultObj.user_name);
      resultObj.stellen.forEach((stelle) => {
        selectField.append(createHtmlElement("option", selectField, null, { value: stelle.ID, innerText: stelle.Bezeichnung }));
      });
      setValueOfElement("kvwmapServerStellenField", JSON.stringify(resultObj.stellen));
      this.requestStellenButton.style.display = "none";
      if (resultObj.stellen.length === 1) {
        this.kvwmapServerStelleSelectField.value = resultObj.stellen[0].ID;
        this.saveServerSettingsButton.style.display = "";
      } else {
        this.saveServerSettingsButton.style.display = "none";
      }
      this.kvwmapServerStelleSelectField.style.display = "";
    }

    if (errMsg) {
      kvm.msg(errMsg);
      kvm.log(errMsg, 1);
    }
    sperrBildschirm.close();
  }

  // TODO <i class="fa fa-eye" aria-hidden="true" onclick="this.classList.toggle('fa-eye'); this.classList.toggle('fa-eye-slash'); document.getElementById('kvwmapServerPasswortField').type = (document.getElementById('kvwmapServerPasswortField').type === 'text' ? 'password' : 'text');"></i><br>
  /*
    <div id="activeStelleBezeichnungDiv"></div>
    <button id="requestStellenButton" class="settings-button">
      <i class="fa fa-key" aria-hidden="true"></i> Stellen abfragen
    </button>
    <select id="kvwmapServerStelleSelectField" name="kvwmapServerStelleId" style="display: none;">
      <option value="">Stelle Wählen</option>
    </select>
    <input id="kvwmapServerStellenField" name="kvwmapServerStellen" type="hidden" value="">

    <button id="saveServerSettingsButton" class="settings-button" style="display: none;">
      <i class="fa fa-regular fa-floppy-disk" aria-hidden="true"></i> Einstellungen Speichern
    </button>
    */
}

export class Layers extends PanelEinstellungen {
  divLayerList: HTMLElement;

  layerId2layerListIem = new Map<string, { dom: HTMLElement; setActiv(activ: boolean): void }>();

  activeLayer: Layer;

  constructor() {
    super("h2_layer");
    this.divLayerList = document.getElementById("layer_list");
    const layers = kvm.getLayers();
    if (layers) {
      for (const layer of layers) {
        this.appendLayer(layer);
      }
    }
    kvm.addEventListener(Kvm.EVENTS.ACTIVE_LAYER_CHANGED, (evt) => {
      console.error("Kvm.EVENTS.ACTIVE_LAYER_CHANGED", evt);
      this.setActiveLayer(evt.newValue);
    });
    kvm.addEventListener(Kvm.EVENTS.LAYER_ADDED, (evt) => {
      console.error("Kvm.EVENTS.LAYER_ADDED", evt);
      this.appendLayer(evt.newValue);
    });
    kvm.addEventListener(Kvm.EVENTS.LAYER_REMOVED, (evt) => {
      console.error("Kvm.EVENTS.LAYER_REMOVED", evt);
      this.removeLayer(evt.oldValue);
    });
    this.setActiveLayer(kvm.getActiveLayer());

    if (!layers || layers.length === 0) {
      document.getElementById("syncLayerButtonTxt").innerHTML = "Layer abfragen";
    } else {
      document.getElementById("syncLayerButtonTxt").innerHTML = "Layer mit Server synchronisieren";
    }
    document.getElementById("syncLayerButton").addEventListener("click", (evt) => this.bttnSyncLayersClicked(evt));
  }

  async requestLayers() {
    sperrBildschirm.clear();
    const stelle = kvm.getActiveStelle();
    if (stelle) {
      sperrBildschirm.show();
      await stelle.requestLayers();
      sperrBildschirm.close();
    } else {
      kvm.msg("Bitte Stelle wählen");
      show("server");
    }
  }

  show() {
    console.error("showLayers");
    super.show();
    this.setActiveLayer(kvm.getActiveLayer());
  }

  async bttnSyncLayersClicked(evt: MouseEvent) {
    console.error(`bttnSyncLayersClicked`);
    // const layer = kvm._activeLayer;
    if (this.layerId2layerListIem.size === 0) {
      this.requestLayers();
      return;
    }

    sperrBildschirm.clear();

    // Sichere Datenbank
    if ((<HTMLButtonElement>evt.currentTarget).classList.contains("inactive-button")) {
      kvm.msg("Keine Internetverbindung! Kann Layer jetzt nicht synchronisieren.");
    } else {
      sperrBildschirm.show();
      const confirmed = await confirm("Jetzt lokale Änderungen Daten und Bilder, falls vorhanden, zum Server schicken, Änderungen vom Server holen und lokal einspielen? Wenn Änderungen vom Server kommen wird die lokale Datenbank vorher automatisch gesichert.", "Layer mit Server synchronisieren", "ja", "nein");
      if (confirmed) {
        try {
          await kvm.syncLayers();
          sperrBildschirm.close();
        } catch (ex) {
          console.error("Fehler beim Synchronisieren", ex);
          sperrBildschirm.close("Fehler beim Synchronisieren: ", ex);
        }
      }
    }
  }

  appendLayer(layer: Layer) {
    if (this.layerId2layerListIem.size === 0) {
      document.getElementById("syncLayerButtonTxt").innerHTML = "Layer mit Server synchronisieren";
    }

    console.error(`PanelLayer.appendLayer(${layer.title})`);
    console.log(`### getLayerListItem ${layer.title}`);
    const dom = createHtmlElement("div", null, "layer-list-div");
    dom.id = `layer_${layer.getGlobalId()}`;
    const radioInput = createHtmlElement("input", dom);
    radioInput.type = "radio";
    radioInput.addEventListener("change", (evt) => {
      this.setActiveLayer(layer);
    });
    (radioInput.name = "activeLayerId"), (radioInput.value = `${layer.getGlobalId()}`);
    const label = createHtmlElement("span", dom, "layer-list-element");
    label.innerText = layer.get("alias") || layer.get("title");
    const menuBttn = createHtmlElement("i", dom, "layer-functions-button fa-regular fa-ellipsis-vertical");

    const fctDiv = createHtmlElement("div", dom, "layer-functions-div");
    fctDiv.style.display = "none";

    // menuBttn.id = `layer-functions-button_${layer.getGlobalId()}`;
    if (layer.isActive) {
      menuBttn.ariaHidden = "false";
      menuBttn.style.display = "";
    } else {
      menuBttn.ariaHidden = "true";
      menuBttn.style.display = "none";
    }
    menuBttn.addEventListener("click", () => {
      if (fctDiv.style.display === "none") {
        fctDiv.style.display = "";
        menuBttn.classList.remove("fa-ellipsis-vertical");
        menuBttn.classList.add("fa-square-xmark");
      } else {
        fctDiv.style.display = "none";
        menuBttn.classList.add("fa-ellipsis-vertical");
        menuBttn.classList.remove("fa-square-xmark");
      }
    });

    fctDiv.append(layer.createLayerListItemFunction("Lokale Daten löschen", "clearLayer", "clear-layer-button", "fa fa-ban", (ev) => layer.bttnClearLayerClicked(ev)));
    fctDiv.append(layer.createLayerListItemFunction("Layer neu laden", "reloadLayer", "reload-layer-button", "fa fa-window-restore", (ev) => layer.bttnReloadLayerClicked(ev)));

    if (layer.hasGeometry) {
      fctDiv.append(layer.createLayerListItemFunction("Layer Style", "styleLayer", "style-layer-button", "fa fa-paint-brush", (ev) => layer.bttnStyleLayerClicked(ev)));
    }

    const infoPanel = layer.getLayerinfoPanel();
    const infoListItem = layer.createLayerListItemFunction("Layer-Info", "infoLayer", "info-layer-button", "fa fa-info", (ev) => layer.bttnShowLayerInfoClicked(infoPanel, ev));
    infoListItem.append(infoPanel.dom);
    fctDiv.append(infoListItem);

    this.divLayerList.append(dom);
    this.layerId2layerListIem.set(layer.getGlobalId(), {
      dom: dom,
      setActiv: (activ: boolean) => {
        radioInput.checked = activ;
        menuBttn.style.display = activ ? "" : "none";
        menuBttn.ariaHidden = activ ? "false" : "true";
        if (!activ) {
          fctDiv.style.display = "none";
          menuBttn.classList.add("fa-ellipsis-vertical");
          menuBttn.classList.remove("fa-square-xmark");
        }
      },
    });
  }
  removeLayer(layer: Layer) {
    const layerListIem = this.layerId2layerListIem.get(layer.getGlobalId());
    if (layerListIem) {
      layerListIem.dom.remove();
      this.layerId2layerListIem.delete(layer.getGlobalId());
    }
  }

  setActiveLayer(layer: Layer) {
    if (!(this.activeLayer === layer)) {
      if (this.activeLayer && this.activeLayer !== layer) {
        const layerListIem = this.layerId2layerListIem.get(this.activeLayer.getGlobalId());
        if (layerListIem) {
          layerListIem.setActiv(false);
        }
        this.activeLayer = null;
      }
      if (layer) {
        const layerListIem = this.layerId2layerListIem.get(layer.getGlobalId());
        if (layerListIem) {
          layerListIem.setActiv(true);
          this.activeLayer = layer;
          kvm.setActiveLayer(layer);
        }
      }
    }
  }
}

export class LayerParams extends PanelEinstellungen {
  layer_prams_list: HTMLElement;

  constructor() {
    super("h2_layerparams");
    this.layer_prams_list = <HTMLElement>document.getElementById("layer_prams_list");
    kvm.addEventListener(Kvm.EVENTS.ACTIVE_STELLE_CHANGED, (evt) => {
      this.setStelle(evt.newValue);
    });
  }

  setStelle(stelle: Stelle) {
    // layerParamSettings, layerParams = []) {
    console.error("PanelEinstellungen.LayerParams.setStelle", stelle?.settings?.layer_params);
    const layer_params = stelle?.settings?.layer_params;
    this.layer_prams_list.innerHTML = "";
    if (layer_params) {
      for (const key of Object.keys(layer_params)) {
        const layerParam = layer_params[key];
        const selectValue = stelle.getLayerParam(key);
        const el = createHtmlElement("div", this.layer_prams_list, "form-label");
        const label = createHtmlElement("label", el);
        label.innerHTML = layerParam.alias;
        const select = createHtmlElement("select", el);
        select.addEventListener("change", async () => {
          sperrBildschirm.show();
          try {
            await stelle.setLayerParam(key, select.value);
          } catch (ex) {
            console.error("error while calling setLayerParam", ex);
          }
          sperrBildschirm.close();
        });
        for (const option of layerParam.options) {
          const selectOption = createHtmlElement("option", select);
          selectOption.value = option.value;
          selectOption.innerHTML = option.output;
          selectOption.selected = option.value === selectValue;
        }
      }
    }

    // let layerParamsDiv = $("#h2_layerparams").parent();
    // if (layerParamSettings && Object.keys(layerParamSettings).length > 0) {
    //   let layerParamsList = $("#layer_prams_list");
    //   layerParamsList.html("");
    //   Object.keys(layerParamSettings).forEach((key) => {
    //     let paramSetting = layerParamSettings[key];
    //     let savedValue = key in layerParams ? layerParams[key] : null; // übernehme gespeicherten Wert wenn er existiert
    //     kvm.layerParams[key] = savedValue || paramSetting.default_value; // setze gespeicherten oder wenn leer dann den default Wert.

    //     let labelElement = $(`<div class="form-label><label for="${key}">${paramSetting.alias}</label></div>`);
    //     let valueElement = $(`
    //       <div class="form-value">
    //         <select id="${key}" name="${key}" onchange="kvm.saveLayerParams(this)">
    //           ${paramSetting.options
    //             .map((option) => {
    //               return `<option value="${option.value}"${kvm.layerParams[key] == option.value ? " selected" : ""}>${option.output}</option>`;
    //             })
    //             .join("")}
    //         </select>
    //       </div>
    //     `);
    //     layerParamsList.append(labelElement).append(valueElement);
    //   });
    //   layerParamsDiv.show();
    // } else {
    //   layerParamsDiv.hide();
    // }
  }
}

export class AnzeigeFilter extends PanelEinstellungen {
  inputLimit: HTMLInputElement;
  inputOffset: HTMLInputElement;

  cbHistoryFilter: HTMLInputElement;
  cbUserIdFilter: HTMLInputElement;

  bttnRunFilter: HTMLButtonElement;
  bttnToggleFilterDiv: HTMLButtonElement;

  filterDiv: HTMLElement;
  attributeFilterFieldDiv: HTMLElement;

  setting: any;
  layer: Layer;
  map: Map<string, { operatorSelect: HTMLSelectElement; valueField: HTMLInputElement | HTMLSelectElement }>;

  /*
          <div id="anzeigeFilterDiv" class="switchable-setting">
        <!--select id="statusFilterSelect">
          <option value="" selected>kein Filter</option>
        </select//-->
        <div class="settings-label">Anzahl der Zeilen:</div><input type="number" id="limit" value="" size="5"/>
        <div style="clear:both"></div>
        <div class="settings-label">Starten bei Zeile:</div><input type="number" id="offset" value="" size="5"/>
        <div style="clear:both"></div>
        Nur historische Datensätze: <input id="historyFilter" type="checkbox">
        Nur eigene Datensätze: <input id="userIdFilter" type="checkbox">
        <div style="clear:both"></div>
        <input id="runFilterButton" type="button" value="Anwenden" class="settings-button" style="margin-top: 5px"/>
        <input id="toggleFilterDivButton" type="button" value="mehr" class="settings-button"/>
        <div id="filterDiv" style="display: none">
          <div id="attributeFilterFieldDiv"></div>
        </div
    */

  constructor(setting: any = {}, layer?: Layer) {
    super("h2_anzeigefilter");
    console.error(`newAnzeigeFilter`, setting, layer);
    this.setting = setting;

    const fctInptHandler = () => {
      this.checkChanges();
    };

    const inputLimit = (this.inputLimit = <HTMLInputElement>document.getElementById("limit"));
    inputLimit.value = kvm.getConfigurationOption("limit");
    inputLimit.addEventListener("input", fctInptHandler);
    const inputOffset = (this.inputOffset = <HTMLInputElement>document.getElementById("offset"));
    inputOffset.value = kvm.getConfigurationOption("offset");
    inputOffset.addEventListener("input", fctInptHandler);

    const cbHistoryFilter = (this.cbHistoryFilter = <HTMLInputElement>document.getElementById("historyFilter"));
    cbHistoryFilter.checked = kvm.getConfigurationOption("historyFilter") === true;
    cbHistoryFilter.addEventListener("input", fctInptHandler);
    const cbUserIdFilter = (this.cbUserIdFilter = <HTMLInputElement>document.getElementById("userIdFilter"));
    cbUserIdFilter.checked = kvm.getConfigurationOption("userIdFilter") === true;
    cbUserIdFilter.addEventListener("input", fctInptHandler);

    const bttnRunFilter = (this.bttnRunFilter = <HTMLButtonElement>document.getElementById("runFilterButton"));
    bttnRunFilter.addEventListener("click", () => {
      kvm.setConfigurationOption("limit", parseInt(this.inputLimit.value));
      kvm.setConfigurationOption("offset", parseInt(this.inputOffset.value));
      this.setting.userIdFilter = this.cbUserIdFilter.checked;
      this.setting.historyFilter = this.cbHistoryFilter.checked;
      // kvm.store.setItem("layerFilter", JSON.stringify(kvm.composeLayerFilter()));
      if (this.layer) {
        this.layer.setFilter(this.getLayerFilters());
      }
      kvm.getActiveLayer().readData(this.setting.limit, this.setting.offset);
    });
    bttnRunFilter.disabled = true;

    this.filterDiv = <HTMLElement>document.getElementById("filterDiv");
    this.attributeFilterFieldDiv = <HTMLElement>document.getElementById("attributeFilterFieldDiv");
    const bttnToggleFilterDiv = (this.bttnToggleFilterDiv = <HTMLButtonElement>document.getElementById("toggleFilterDivButton"));
    bttnToggleFilterDiv.addEventListener("click", () => this.toogleFilterDiv());

    this.setLayer(layer);
    kvm.addEventListener(Kvm.EVENTS.ACTIVE_LAYER_CHANGED, (evt) => {
      this.setLayer(evt.newValue);
    });
  }

  // createOperatorOptions() {
  //   const operationOptions = document.createElement("template");
  //   const filter_operators = ["=", ">", "<", ">=", "<=", "IN", "LIKE"];
  //   filter_operators.forEach((operator) => {
  //     createHtmlElement("option", operationOptions, null, { value: operator, innerText: operator });
  //   });
  //   return operationOptions;
  // }

  // setLayerx(layer: Layer) {
  //   this.layer = layer;
  //   this.attributeFilterFieldDiv.innerHTML = "";
  //   if (layer) {
  //     const filter_operators = ["=", ">", "<", ">=", "<=", "IN", "LIKE"];
  //     const filter_operator_options = filter_operators.map(function (operator) {
  //       return '<option value="' + operator + '"' + (operator == "=" ? " selected" : "") + ">" + operator + "</option>";
  //     });
  //     layer.attributes.forEach((value) => {
  //       if (value.settings.type != "geometry") {
  //         if (value.settings.name === "status") {
  //           /*
  //            */
  //           $("#statusFilterSelect option").remove();
  //           if (value.settings.enums !== "" && Array.isArray(value.settings.enums)) {
  //             $("#statusFilterSelect").append($('<option value="" selected>-- Bitte wählen --</option>'));
  //             value.settings.enums.map(function (enum_option) {
  //               $("#statusFilterSelect").append($('<option value="' + enum_option.value + '">' + enum_option.output + "</option>"));
  //             });
  //           }
  //         }
  //         // TODO Bug
  //         let input_field;
  //         switch (value.settings.form_element_type) {
  //           case "Auswahlfeld":
  //             {
  //               input_field = $('<select id="filter_value_' + value.settings.name + '" class="filter-view-value-field" name="filter_value_' + value.settings.name + '">');
  //               input_field.append($('<option value="" selected>-- Bitte wählen --</option>'));
  //               if (value.settings.enums !== "" && Array.isArray(value.settings.enums)) {
  //                 value.settings.enums.map(function (enum_option) {
  //                   input_field.append($('<option value="' + enum_option.value + '">' + enum_option.output + "</option>"));
  //                 });
  //               } else {
  //                 console.log("options keine Array: %o", value.settings.enums);
  //               }
  //             }
  //             break;
  //           case "Time":
  //             {
  //               input_field = '<input id="filter_value_' + value.settings.name + '" class="filter-view-value-field" name="filter_value_' + value.settings.name + '" type="datetime-local" value=""/>';
  //             }
  //             break;
  //           default: {
  //             input_field = '<input id="filter_value_' + value.settings.name + '" class="filter-view-value-field" name="filter_value_' + value.settings.name + '" type="text" value=""/>';
  //           }
  //         }
  //         $("#attributeFilterFieldDiv").append(
  //           $('<div class="filter-view-field" database_type="' + value.settings.type + '" name="' + value.settings.name + '">')
  //             .append('<div class="filter-view-label">' + value.settings.alias + "</div>")
  //             .append('<div class="filter-view-operator"><select id="filter_operator_' + value.settings.name + '">' + filter_operator_options + "</select></div>")
  //             .append($('<div class="filter-view-value">').append(input_field))
  //         );
  //       }
  //     });
  //   } else {
  //     console.error("not implemented");
  //   }
  // }

  layerFilterChanged(evt: Event) {
    // const optionselect = <HTMLSelectElement>evt.currentTarget;
    // optionselect.dataset.attrName;
    this.checkChanges();
  }

  setLayer(layer: Layer) {
    this.layer = layer;
    this.attributeFilterFieldDiv.innerHTML = "";

    if (layer) {
      const fctLayerFilterChanged = (evt: Event) => this.layerFilterChanged(evt);
      this.map = new Map<string, { operatorSelect: HTMLSelectElement; valueField: HTMLInputElement | HTMLSelectElement }>();
      const map = new Map<string, AttributFilter>();
      if (layer.settings.attributeFilter) {
        for (let i = 0; i < layer.settings.attributeFilter.length; i++) {
          map.set(layer.settings.attributeFilter[i].attrName, layer.settings.attributeFilter[i]);
        }
      }

      // const fctOptions = (evt:Event)=>{
      //   this.operatorSelected(evt);
      // }
      // const templateOperatorOptions = this.createOperatorOptions();
      layer.attributes.forEach((value) => {
        if (value.settings.type != "geometry") {
          const filterRow = createHtmlElement("div", this.attributeFilterFieldDiv, "filter-view-field");
          createHtmlElement("label", filterRow, "filter-view-label", { innerText: value.settings.name });
          const operatorSelect = createHtmlElement("select", filterRow, "filter-view-operator");
          operatorSelect.dataset.attrName = value.settings.name;
          const filter_operators = ["=", ">", "<", ">=", "<=", "IN", "LIKE"];

          let valueElement: HTMLInputElement | HTMLSelectElement;

          filter_operators.forEach((operator) => {
            operatorSelect.options.add(createHtmlElement("option", null, null, { value: operator, innerText: operator }));
            operatorSelect.value = map.get(value.settings.name)?.operator || "=";
          });
          switch (value.settings.form_element_type) {
            case "Auswahlfeld":
              {
                const valueSelect = (valueElement = createHtmlElement("select", filterRow, "filter-view-value"));
                valueSelect.dataset.attrName = value.settings.name;
                createHtmlElement("option", valueSelect, null, { innerText: "-- Bitte wählen --" });
                if (Array.isArray(value.settings.enums)) {
                  for (const valueOption of value.settings.enums) {
                    createHtmlElement("option", valueSelect, null, { value: valueOption.value, innerText: valueOption.output });
                  }
                } else {
                  console.log("options keine Array: %o", value.settings.enums);
                }
              }
              break;
            case "Time":
              {
                valueElement = createHtmlElement("input", filterRow, "filter-view-value", { type: "datetime-local" });
              }
              break;
            default: {
              valueElement = createHtmlElement("input", filterRow, "filter-view-value", { type: "text" });
            }
          }
          valueElement.value = map.get(value.settings.name)?.value || "";
          valueElement.addEventListener("input", fctLayerFilterChanged);
          this.map.set(value.settings.name, { operatorSelect: operatorSelect, valueField: valueElement });
        }
      });
    } else {
      console.error("not implemented");
    }
  }

  getLayerFilters() {
    const filter: { attrName: string; operator: string; value: string }[] = [];
    this.map.forEach((value, attrName) => {
      if (value.valueField.value !== "") {
        filter.push({ attrName: attrName, operator: value.operatorSelect.value, value: value.valueField.value });
      }
    });
    return filter;
  }

  private toogleFilterDiv() {
    if (this.bttnToggleFilterDiv.value === "mehr") {
      this.bttnToggleFilterDiv.value = "weniger";
      this.filterDiv.style.display = "";
    } else {
      this.bttnToggleFilterDiv.value = "mehr";
      this.filterDiv.style.display = "none";
    }
  }
  private checkChanges() {
    const notChanged = this.isEqual(this.setting.offset, this.inputLimit.value) && this.isEqual(this.setting.offset, this.inputOffset.value) && this.isEqual(this.setting.userIdFilter, this.cbUserIdFilter.checked) && this.isEqual(this.setting.historyFilter, this.cbHistoryFilter.checked);
    this.bttnRunFilter.disabled = notChanged && !this.hasFilterChanged();
  }

  private hasFilterChanged() {
    if (this.layer) {
      const oldFilters = this.layer.settings.attributeFilter || [];
      const currFilters = this.getLayerFilters();
      if (oldFilters.length === currFilters.length) {
        for (let i = 0; i < oldFilters.length; i++) {
          const oldFilter = oldFilters[i];
          const currFilter = currFilters[i];
          if (oldFilter.attrName != currFilter.attrName || oldFilter.operator != currFilter.operator || oldFilter.value != currFilter.value) {
            return true;
          }
        }
        return false;
      }
      return true;
    }
  }

  private isEqual(value: any, htmlInpValue: string | boolean) {
    if (htmlInpValue === value) {
      return true;
    }
    if (typeof value === "number") {
      const nrHtmlInpValue = Number(value);
      return nrHtmlInpValue === value;
    }
    if (typeof htmlInpValue === "boolean") {
      if (htmlInpValue && (value === 1 || value === "1")) {
        return true;
      } else {
        return !value && !htmlInpValue;
      }
    }
    return !value && htmlInpValue.trim() === "";
  }
}

export class Sortierung extends PanelEinstellungen {
  inputLimit: HTMLInputElement;

  layer: Layer;

  anzeigeSortSelect: HTMLSelectElement;

  constructor() {
    super("h2_sortierung");
    this.anzeigeSortSelect = <HTMLSelectElement>document.getElementById("anzeigeSortSelect");

    this.anzeigeSortSelect.addEventListener("input", () => this.clickedAnzeigeSortSelect());
    this.setLayer(kvm.getActiveLayer());
    kvm.addEventListener(Kvm.EVENTS.ACTIVE_LAYER_CHANGED, (evt) => {
      this.setLayer(evt.newValue);
    });
  }

  setLayer(layer: Layer) {
    this.layer = layer;

    const selectElement = this.anzeigeSortSelect;
    if (layer) {
      for (let i = selectElement.options.length - 1; i > 0; i--) {
        selectElement.remove(i);
      }
      removeOptions(this.anzeigeSortSelect);
      layer.attributes.forEach((attr) => {
        const option = createHtmlElement("option", selectElement);
        option.value = attr.settings.name;
        option.innerHTML = attr.settings.alias || attr.settings.name;
      });
      if (layer.settings?.sortBy) {
        selectElement.value = layer.settings.sortBy;
      }
    }
  }

  private clickedAnzeigeSortSelect() {
    if (this.layer) {
      this.layer.setSortAttribute(this.anzeigeSortSelect.value);
    }
  }
}

export class ColorSection extends PanelEinstellungen {
  colorSelectorDiv: HTMLElement;

  fontSizeProzent: HTMLElement;
  fontSizeDefaultButton: HTMLButtonElement;
  defaultFontSize: number;

  constructor() {
    super("h2_farben");

    this.defaultFontSize = parseFloat(kvm.getDefaultConfigurationOption("fontSize"));

    const fontSize = kvm.getConfigurationOption("fontSize");
    const sizePixel = parseFloat(fontSize || "24px");
    const sizeProzent = Math.round((sizePixel / this.defaultFontSize) * 100);

    const colorSelectorDiv = (this.colorSelectorDiv = <HTMLElement>document.getElementById("colorSelectorDiv"));

    this.fontSizeProzent = <HTMLElement>document.getElementById("fontSizeProzent");
    this.fontSizeProzent.innerHTML = `${sizeProzent} %`;

    const fontSizeUpButton = <HTMLButtonElement>document.getElementById("fontSizeUpButton");
    fontSizeUpButton.addEventListener("click", () => this.changeFontSize("up"));

    const fontSizeDownButton = <HTMLButtonElement>document.getElementById("fontSizeDownButton");
    fontSizeDownButton.addEventListener("click", () => this.changeFontSize("down"));

    const fontSizeDefaultButton = (this.fontSizeDefaultButton = <HTMLButtonElement>document.getElementById("fontSizeDefaultButton"));
    fontSizeDefaultButton.addEventListener("click", () => this.changeFontSize("default"));
    fontSizeDefaultButton.style.display = sizeProzent == 100 ? "none" : "inline";

    const markerStyles = kvm.getMarkerStyles();
    Object.values(markerStyles).forEach((style: any, i: number) => {
      const idx = i;
      const txt = "Status " + i;
      const id = "colorStatus" + i;
      const row = createHtmlElement("div", colorSelectorDiv);
      const label = createHtmlElement("label", row);
      label.htmlFor = id;
      label.innerText = txt;
      const input = createHtmlElement("input", row);
      input.type = "color";
      input.id = id;
      input.value = style.fillColor;

      input.addEventListener("input", () => {
        kvm.updateMarkerStyle(idx, input.value);
      });
    });
  }

  private changeFontSize(mode: "up" | "down" | "default") {
    let sizePixel: number;
    let sizeProzent: number;

    if (mode === "default") {
      sizePixel = this.defaultFontSize;
      sizeProzent = 100;
      this.fontSizeDefaultButton.style.display = "none";
    } else {
      const step5Prozent: number = (Math.round((this.defaultFontSize / 100) * 5 * 10) / 10) * (mode === "up" ? 1 : -1);
      sizePixel = parseFloat(document.body.style.fontSize) + step5Prozent;
      sizeProzent = Math.round((sizePixel / this.defaultFontSize) * 100);
      if (sizeProzent < 30) {
        kvm.msg("Kleiner geht nicht!", "Einstellung Textgröße");
        return;
      }
      if (sizeProzent > 150) {
        kvm.msg("Größer geht nicht!", "Einstellung Textgröße");
        return;
      }
    }
    const fontSize: string = `${sizePixel}px`;
    document.body.style.fontSize = fontSize;
    this.fontSizeProzent.innerHTML = `${sizeProzent} %`;
    this.fontSizeDefaultButton.style.display = sizeProzent == 100 ? "none" : "";
    kvm.setConfigurationOption("fontSize", fontSize);
  }
}

export class Symbole extends PanelEinstellungen {
  constructor() {
    super("h2_symbole");
    const fillOpacitySlider = <HTMLInputElement>document.getElementById("fillOpacitySlider");
    const fillOpacitySpan = <HTMLElement>document.getElementById("fillOpacitySpan");

    fillOpacitySlider.addEventListener("input", () => {
      console.info(`transparency changed: ${fillOpacitySlider.value}`);

      const newOpacity = parseInt(fillOpacitySlider.value) / 10;
      fillOpacitySpan.innerHTML = newOpacity.toString();

      const markerStyles = JSON.parse(kvm.store.getItem("markerStyles"));
      for (let index in markerStyles) {
        markerStyles[index].fillOpacity = newOpacity;
      }
      kvm.store.setItem("markerStyles", JSON.stringify(markerStyles));
    });
  }
}

export class Bildaufnahme extends PanelEinstellungen {
  constructor() {
    super("h2_bildaufnahme");
    const cameraOptionsQualitySlider = <HTMLInputElement>document.getElementById("cameraOptionsQualitySlider");
    const cameraOptionsQuality = <HTMLElement>document.getElementById("cameraOptionsQuality");

    const cameraOptionsSaveToPhotoAlbum = <HTMLInputElement>document.getElementById("cameraOptionsSaveToPhotoAlbum");

    const fctInput = () => {
      console.info(`transparency changed: ${cameraOptionsQualitySlider.value}`);

      const quality = parseInt(cameraOptionsQualitySlider.value);
      cameraOptionsQuality.innerHTML = quality.toString();
      kvm.setCameraOption(quality, cameraOptionsSaveToPhotoAlbum.checked);
    };
    cameraOptionsQualitySlider.addEventListener("input", fctInput);
    cameraOptionsSaveToPhotoAlbum.addEventListener("input", fctInput);
  }
}

export class Karteneinstellung extends PanelEinstellungen {
  newPosSelect: HTMLSelectElement;

  minTrackDistanceSlider: HTMLInputElement;

  mapSettings_west: HTMLInputElement;
  mapSettings_south: HTMLInputElement;
  mapSettings_east: HTMLInputElement;
  mapSettings_north: HTMLInputElement;

  mapSettings_startCenterLat: HTMLInputElement;
  mapSettings_startCenterLon: HTMLInputElement;

  mapSettings_minZoom: HTMLSelectElement;
  mapSettings_maxZoom: HTMLSelectElement;
  mapSettings_startZoom: HTMLSelectElement;

  constructor() {
    super("h2_karteneinstellungen");
    const newPosSelect = (this.newPosSelect = <HTMLSelectElement>document.getElementById("newPosSelect"));

    const minTrackDistanceSlider = (this.minTrackDistanceSlider = <HTMLInputElement>document.getElementById("minTrackDistanceSlider"));
    const minTrackDistance = <HTMLElement>document.getElementById("minTrackDistance");
    minTrackDistanceSlider.addEventListener("input", () => {
      minTrackDistance.innerHTML = minTrackDistanceSlider.value + "m";
    });

    const mapSettings_west = (this.mapSettings_west = <HTMLInputElement>document.getElementById("mapSettings_west"));
    mapSettings_west.addEventListener("change", () => {
      kvm.setMapSetting("west", mapSettings_west.value);
    });
    const mapSettings_south = (this.mapSettings_south = <HTMLInputElement>document.getElementById("mapSettings_south"));
    mapSettings_south.addEventListener("change", () => {
      kvm.setMapSetting("south", mapSettings_south.value);
    });
    const mapSettings_east = (this.mapSettings_east = <HTMLInputElement>document.getElementById("mapSettings_east"));
    mapSettings_east.addEventListener("change", () => {
      kvm.setMapSetting("east", mapSettings_east.value);
    });
    const mapSettings_north = (this.mapSettings_north = <HTMLInputElement>document.getElementById("mapSettings_north"));
    mapSettings_north.addEventListener("change", () => {
      kvm.setMapSetting("north", mapSettings_north.value);
    });

    const mapSettings_startCenterLat = (this.mapSettings_startCenterLat = <HTMLInputElement>document.getElementById("mapSettings_startCenterLat"));
    mapSettings_startCenterLat.addEventListener("change", () => {
      kvm.setMapSetting("startCenterLat", mapSettings_startCenterLat.value);
    });
    const mapSettings_startCenterLon = (this.mapSettings_startCenterLon = <HTMLInputElement>document.getElementById("mapSettings_startCenterLon"));
    mapSettings_startCenterLon.addEventListener("change", () => {
      kvm.setMapSetting("startCenterLon", mapSettings_startCenterLon.value);
    });

    const mapSettings_minZoom = (this.mapSettings_minZoom = <HTMLSelectElement>document.getElementById("mapSettings_minZoom"));
    mapSettings_minZoom.addEventListener("change", () => {
      kvm.setMapSetting("minZoom", mapSettings_minZoom.value);
    });
    const mapSettings_maxZoom = (this.mapSettings_maxZoom = <HTMLSelectElement>document.getElementById("mapSettings_maxZoom"));
    mapSettings_maxZoom.addEventListener("change", () => {
      kvm.setMapSetting("maxZoom", mapSettings_maxZoom.value);
    });
    const mapSettings_startZoom = (this.mapSettings_startZoom = <HTMLSelectElement>document.getElementById("mapSettings_startZoom"));
    mapSettings_startZoom.addEventListener("change", () => {
      kvm.setMapSetting("startZoom", mapSettings_startZoom.value);
    });

    const mapSettings = kvm.getMapSettings();

    newPosSelect.value = mapSettings.newPosSelect;
    mapSettings_west.value = mapSettings.west;
    mapSettings_south.value = mapSettings.south;
    mapSettings_east.value = mapSettings.east;
    mapSettings_north.value = mapSettings.north;
    mapSettings_minZoom.value = mapSettings.minZoom;
    mapSettings_maxZoom.value = mapSettings.maxZoom;
    mapSettings_startZoom.value = mapSettings.startZoom;
    mapSettings_startCenterLat.value = mapSettings.startCenterLat;
    mapSettings_startCenterLon.value = mapSettings.startCenterLon;
  }
}

export class Sachdaten extends PanelEinstellungen {
  constructor() {
    super("h2_sachdateneinstellungen");
    const viewAfterCreate = <HTMLSelectElement>document.getElementById("viewAfterCreate");
    viewAfterCreate.value = kvm.getConfigurationOption("viewAfterCreate");

    const viewAfterUpdate = <HTMLSelectElement>document.getElementById("viewAfterUpdate");
    viewAfterUpdate.value = kvm.getConfigurationOption("viewAfterUpdate");

    const confirmSave = <HTMLInputElement>document.getElementById("confirmSave");
    confirmSave.checked = <boolean>kvm.getConfigurationOption("confirmSave");

    viewAfterCreate.addEventListener("change", () => {
      kvm.setConfigurationOption("viewAfterCreate", viewAfterCreate.value);
    });

    viewAfterUpdate.addEventListener("change", () => {
      kvm.setConfigurationOption("viewAfterUpdate", viewAfterCreate.value);
    });

    confirmSave.addEventListener("change", () => {
      kvm.setConfigurationOption("confirmSave", confirmSave.checked);
    });
  }
}

export class OfflineKarten extends PanelEinstellungen {
  constructor() {
    super("h2_kartenverwaltung");
    console.log("initLoadOfflineMapsDiv");
    const offlineLayers = kvm.getConfigurationOption("backgroundLayerSettings").filter((setting) => {
      return setting.online === false;
    });
    console.log("offlineLayers in initLoadOfflineMapsDiv: %o", offlineLayers);
    const loadOfflineMapsDiv = document.getElementById("loadOfflineMapsDiv");
    offlineLayers.forEach((offlineLayer) => {
      const row = createHtmlElement("div", loadOfflineMapsDiv);
      createHtmlElement("label", row, null, { innerText: offlineLayer.label });
      const bttn = createHtmlElement("button", row, "settings-button");
      createHtmlElement("i", bttn, "fa fa-download");
      bttn.append(document.createTextNode("herunterladen"));

      bttn.addEventListener("click", () => {
        kvm.downloadBackgroundLayer(offlineLayer);
      });
    });
  }
}

export class HintergrundLayer extends PanelEinstellungen {
  constructor() {
    super("h2_hintergrundlayer");
    const backgroundLayerSettingsDiv = document.getElementById("backgroundLayerSettingsDiv");

    try {
      const backgroundLayerSettings = kvm.getBackgroundLayerSettings();

      backgroundLayerSettings.forEach((l, i) => {
        const divEntry = createHtmlElement("div", backgroundLayerSettingsDiv);
        createHtmlElement("b", divEntry, null, { innerText: l.label });
        createHtmlElement("br", divEntry);
        divEntry.append(document.createTextNode("URL:"));
        const urlInput = createHtmlElement("input", divEntry);
        urlInput.value = l.url;
        if (l.params.layers) {
          createHtmlElement("br", divEntry);
          divEntry.append(document.createTextNode("Layer:"));
          createHtmlElement("br", divEntry);
          const inputParamLayerr = createHtmlElement("input", divEntry);
          inputParamLayerr.value = l.params.layers;
        }
      });
    } catch (error) {
      console.error(error);
    }

    const resetBackgroundLayerSettingsButton = document.getElementById("resetBackgroundLayerSettingsButton");
    const changeBackgroundLayerSettingsButton = document.getElementById("changeBackgroundLayerSettingsButton");
    const loadBackgroundLayerButton = document.getElementById("loadBackgroundLayerButton");
    // TODO
    resetBackgroundLayerSettingsButton.addEventListener("click", () => {
      kvm.getConfigurationOption("backgroundLayerSettings").forEach((l, i) => {
        $("#backgroundLayerURL_" + i).val(l.url);
        if (l.params.layers) {
          $("#backgroundLayerLayer_" + i).val(l.params.layers);
        }
      });
      kvm.saveBackgroundLayerSettings(kvm.getConfigurationOption("backgroundLayerSettings"));
      kvm.msg("Einstellung zu Hintergrundlayern aus config Datei erfolgreich wiederhergestellt.");
    });

    // TODO
    changeBackgroundLayerSettingsButton.addEventListener("click", () => {
      kvm.backgroundLayerSettings.forEach((l, i) => {
        l.url = <string>$("#backgroundLayerURL_" + i).val();
        if (l.params.layers) {
          l.params.layers = <string>$("#backgroundLayerLayer_" + i).val();
        }
      });
      console.log("Neue BackgroundLayerSettings: ", kvm.backgroundLayerSettings);
      kvm.saveBackgroundLayerSettings(kvm.backgroundLayerSettings);
      kvm.msg("Einstellung zu Hintergrundlayern übernommen. Diese werden erst nach einem Neustart der Anwendung wirksam!");
    });

    loadBackgroundLayerButton.addEventListener("click", (evt) => {
      // TODO
      navigator.notification.confirm(
        "Wollen Sie die Daten des Hintergrundlayers für den aktuellen Kartenausschnitt runterladen und lokal speichern?",
        function (buttonIndex) {
          if (buttonIndex == 1) {
            console.log("download backgroundlayer on event", evt.target);
            // ja
            //						kvm.backgroundLayers[i].downloadData();
          } else {
            console.log("Background layer nicht runterladen.");
          }
        },
        "Kacheln für Hintergrundlayer runterladen",
        ["ja", "nein"]
      );
    });
  }
}

export class Netzwerkstatus extends PanelEinstellungen {
  constructor() {
    super("h2_netzwerkstatus");
  }

  show(): void {
    super.show();
    document.getElementById("networkStatusText").innerHTML = kvm.networkStatus.status;
  }
}
export class GPSStatus extends PanelEinstellungen {
  gpsStatusText: HTMLElement;
  gpsCurrentPosition: HTMLElement;
  zoomToCurrentLocation: HTMLButtonElement;
  watchId: number;
  constructor() {
    super("h2_gps_status");

    this.gpsStatusText = <HTMLElement>document.getElementById("gpsStatusText");
    this.gpsCurrentPosition = <HTMLElement>document.getElementById("gpsCurrentPosition");

    this.zoomToCurrentLocation = <HTMLButtonElement>document.getElementById("zoomToCurrentLocation");
    this.zoomToCurrentLocation.addEventListener("click", () => {
      kvm.showView("map");
      kvm.map.locate({ setView: true, maxZoom: 16 });
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (evt) => this.onlocationfound(evt),
        (evt) => this.onlocationerror(evt),
        {
          enableHighAccuracy: true,
          timeout: 5000,
        }
      );
    } else {
      this.gpsStatusText.innerHTML = "GPS wird vom Browser nicht unterstützt.";
      this.gpsCurrentPosition.innerHTML = "";
      this.zoomToCurrentLocation.style.display = "none";
    }
  }

  onlocationfound(evt: any) {
    this.gpsStatusText.innerHTML = "GPS vorhanden und funktioniert";
    const timestamp = new Date(evt.timestamp);
    const coords = evt.coords ? evt.coords : evt;

    this.gpsCurrentPosition.innerHTML = "Position: " + coords.latitude.toString() + " " + coords.longitude.toString() + "<br>Genauigkeit: " + coords.accuracy + "<br>Zeit: " + timestamp.toLocaleDateString() + " " + timestamp.toLocaleTimeString();
    this.zoomToCurrentLocation.style.display = "";
    // kvm.GpsIsOn = true;
  }

  onlocationerror(evt: GeolocationPositionError) {
    kvm.msg("Der Standort kann nicht bestimmt werden!\nSchalten Sie in Ihrem Gerät unter Einstellungen die Option 'Standort verwenden' ein.\nFehler bei der Bestimmung der GPS-Position.\nDie Wartezeit für eine neue Position ist überschritten.\nMeldung des GPS-Gerätes: " + evt.message, "GPS Positionierung");
    this.gpsStatusText.innerHTML = "GPS Zeitüberschreitungsfehler";
    this.zoomToCurrentLocation.style.display = "";
    // kvm.GpsIsOn = false;
  }

  show(): void {
    super.show();
    console.error("cccccc1");
    if (navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        (evt) => this.onlocationfound(evt),
        (evt) => this.onlocationerror(evt),
        {
          enableHighAccuracy: true,
          timeout: 5000,
        }
      );
    }
  }

  hide(): void {
    console.error("cccccc2");
    if (this.watchId) {
      console.info("watchId=" + this.watchId);
      navigator.geolocation.clearWatch(this.watchId);
    }
  }
}

export class Security extends PanelEinstellungen {
  constructor() {
    super("h2_security");
    const fingerprintAuth = <HTMLInputElement>document.getElementById("fingerprintAuth");
    fingerprintAuth.checked = kvm.getConfigurationOption("fingerprintAuth") ? true : false;

    fingerprintAuth.addEventListener("change", () => {
      kvm.setConfigurationOption("fingerprintAuth", fingerprintAuth.checked);
    });
  }
}

export class DeviceInfos extends PanelEinstellungen {
  constructor() {
    super("h2_geraeteinformationen");
    this.init();
  }
  async init() {
    (<any>cordova).getAppVersion.getVersionNumber((versionNumber) => {
      document.getElementById("cordovaAppVersion").innerHTML = versionNumber;
      document.title = "kvmobile " + versionNumber;
      kvm.versionNumber = versionNumber;
    });
    document.getElementById("deviceCordova").innerHTML = device.cordova;
    document.getElementById("deviceModel").innerHTML = device.model;
    document.getElementById("devicePlatform").innerHTML = device.platform;
    document.getElementById("deviceUuid").innerHTML = device.uuid;
    document.getElementById("deviceVersion").innerHTML = device.version;
    document.getElementById("deviceManufacturer").innerHTML = device.manufacturer;
    document.getElementById("deviceSerial").innerHTML = device.serial;
    document.getElementById("applicationDirectory").innerHTML = cordova.file.applicationDirectory;
    document.getElementById("applicationStorageDirectory").innerHTML = cordova.file.applicationStorageDirectory;
    document.getElementById("dataDirectory").innerHTML = cordova.file.dataDirectory;
    document.getElementById("cacheDirectory").innerHTML = cordova.file.cacheDirectory;
    document.getElementById("externalApplicationStorageDirectory").innerHTML = cordova.file.externalApplicationStorageDirectory;
    document.getElementById("externalDataDirectory").innerHTML = cordova.file.externalDataDirectory;
    document.getElementById("externalCacheDirectory").innerHTML = cordova.file.externalCacheDirectory;
    document.getElementById("externalRootDirectory").innerHTML = cordova.file.externalRootDirectory;
    document.getElementById("tempDirectory").innerHTML = cordova.file.tempDirectory;
    document.getElementById("syncedDataDirectory").innerHTML = cordova.file.syncedDataDirectory;
    document.getElementById("documentsDirectory").innerHTML = cordova.file.documentsDirectory;
    document.getElementById("sharedDirectory").innerHTML = cordova.file.sharedDirectory;
    document.getElementById("sqlLiteVersion").innerHTML = await getSqliteVersion(kvm.db);
    document.getElementById("spatialLiteVersion").innerHTML = await getSpatialLiteVersion(kvm.db);
  }
}

export class Database extends PanelEinstellungen {
  showDeltasButton: HTMLButtonElement;
  showDeltasWaiting: HTMLElement;
  showDeltasDiv: HTMLElement;
  hideDeltasButton: HTMLButtonElement;

  showImageDeltasButton: HTMLButtonElement;
  showImageDeltasWaiting: HTMLElement;
  showImageDeltasDiv: HTMLElement;
  hideImageDeltasButton: HTMLButtonElement;

  constructor() {
    super("h2_datenbank");

    const showDeltasButton = (this.showDeltasButton = <HTMLButtonElement>document.getElementById("showDeltasButton"));
    this.showDeltasWaiting = <HTMLElement>document.getElementById("showDeltasWaiting");
    const hideDeltasButton = (this.hideDeltasButton = <HTMLButtonElement>document.getElementById("hideDeltasButton"));
    const showDeltasDiv = (this.showDeltasDiv = <HTMLElement>document.getElementById("showDeltasDiv"));

    const showImageDeltasButton = (this.showImageDeltasButton = <HTMLButtonElement>document.getElementById("showImageDeltasButton"));
    this.showImageDeltasWaiting = <HTMLElement>document.getElementById("showImageDeltasWaiting");
    const hideImageDeltasButton = (this.hideImageDeltasButton = <HTMLButtonElement>document.getElementById("hideImageDeltasButton"));
    const showImageDeltasDiv = (this.showImageDeltasDiv = <HTMLElement>document.getElementById("showImageDeltasDiv"));

    const localBackupPath = <HTMLInputElement>document.getElementById("localBackupPath");
    localBackupPath.value = kvm.getConfigurationOption("localBackupPath");
    localBackupPath.addEventListener("change", () => {
      kvm.setConfigurationOption("localBackupPath", localBackupPath.value);
    });

    const saveDatabaseButton = <HTMLButtonElement>document.getElementById("saveDatabaseButton");
    saveDatabaseButton.addEventListener("click", () => {
      navigator.notification.prompt(
        "Geben Sie einen Namen für die Sicherungsdatei an. Die Datenbank wird im Internen Speicher im Verzeichnis " + kvm.getConfigurationOption("localBackupPath") + ' mit der Dateiendung .db gespeichert. Ohne Eingabe wird der Name "Sicherung_" + aktuellem Zeitstempel + ".db" vergeben.',
        function (results) {
          if (results.buttonIndex === 1) {
            kvm.backupDatabase(results.input1, "Datenbank erfolgreich gesichert.");
          }
        },
        "Datenbanksicherung",
        ["OK", "Abbrechen"]
      );
    });

    const resetSettingsButton = <HTMLButtonElement>document.getElementById("resetSettingsButton");

    const saveImagesButton = <HTMLButtonElement>document.getElementById("saveImagesButton");
    saveImagesButton.addEventListener("click", () => {
      let destDir = localBackupPath.value || kvm.getConfigurationOption("localBackupPath");

      navigator.notification.confirm(
        `Sollen die Bilddaten nach ${destDir} gesichert werden? Gleichnamige Dateien im Zielverzeichnis werden überschrieben!`,
        (buttonIndex) => {
          if (buttonIndex == 1) {
            FileUtils.copyFiles(kvm.getConfigurationOption("localImgPath"), destDir);
          }
          if (buttonIndex == 2) {
            // nein
          }
        },
        "Bilddaten sichern?",
        ["ja", "nein"]
      );
    });

    showDeltasButton.addEventListener("click", () => this.showDeltas());
    hideDeltasButton.addEventListener("click", () => this.hideDeltas());

    showImageDeltasButton.addEventListener("click", () => this.showImageDelta());
    hideImageDeltasButton.addEventListener("click", () => this.hideImageDeltas());
  }

  hideDeltas() {
    this.hideDeltasButton.style.display = "none";
    this.showDeltasButton.style.display = "";
    this.showDeltasDiv.style.display = "none";
    this.showDeltasDiv.innerHTML = "";
  }

  hideImageDeltas() {
    this.hideImageDeltasButton.style.display = "none";
    this.showImageDeltasButton.style.display = "";
    this.showImageDeltasDiv.style.display = "none";
    this.showDeltasDiv.innerHTML = "";
  }

  async showDeltas() {
    const sql = `SELECT * FROM deltas`;

    const rs = await executeSQL(kvm.db, sql);
    try {
      const numRows = rs.rows.length;
      if (numRows > 0) {
        this.showDeltasButton.style.display = "none";
        this.showDeltasWaiting.style.display = "";
        this.showDeltasDiv.innerHTML = "";
        const fragm = createTable(rs);
        this.showDeltasDiv.append(fragm);
        this.showDeltasDiv.style.display = "";
        this.hideDeltasButton.style.display = "";
      } else {
        kvm.msg("Keine Änderungen vorhanden");
        this.showDeltasDiv.style.display = "";
      }
      this.showDeltasWaiting.style.display = "none";
    } catch (error) {
      const msg = `Fehler in bei Abfrage der Deltas mit sql: ${sql} Fehler: ${error.message} code: ${(<any>error).code}`;
      console.error(msg);
      kvm.log(msg, 1);
      kvm.msg(msg, "Datenbank");
    }
  }

  async showImageDelta() {
    const sql = `SELECT * FROM image_deltas`;

    const rs = await executeSQL(kvm.db, sql);
    try {
      const numRows = rs.rows.length;
      if (numRows > 0) {
        this.showImageDeltasButton.style.display = "none";
        this.showImageDeltasWaiting.style.display = "";
        this.showImageDeltasDiv.innerHTML = "";
        const fragm = createTable(rs);
        this.showImageDeltasDiv.append(fragm);
        this.showImageDeltasDiv.style.display = "";
        this.hideImageDeltasButton.style.display = "";
      } else {
        kvm.msg("Keine Änderungen vorhanden");
        this.showImageDeltasDiv.style.display = "";
      }
      this.showImageDeltasWaiting.style.display = "none";
    } catch (error) {
      const msg = `Fehler in bei Abfrage der Deltas mit sql: ${sql} Fehler: ${error.message} code: ${(<any>error).code}`;
      console.error(msg);
      kvm.log(msg, 1);
      kvm.msg(msg, "Datenbank");
    }
  }

  hide(): void {
    console.info("PanelEinstellungen.Database.hide");
    this.hideDeltas();
    this.hideImageDeltas();
  }
}

function createTable(rs: SQLitePlugin.Results) {
  const fragm = document.createDocumentFragment();
  const table = createHtmlElement("table");
  fragm.appendChild(table);
  const htmlHeadRow = createHtmlElement("tr", table);
  for (let i = 0; i < rs.rows.length; i++) {
    const dbRow = rs.rows.item(i);
    const htmlRow = createHtmlElement("tr", table);
    for (const key in dbRow) {
      if (i === 0) {
        createHtmlElement("th", htmlHeadRow, null, { innerText: key });
      }
      const v = dbRow[key];
      createHtmlElement("td", htmlRow, null, { innerText: typeof v === "string" ? v.trim() : v });
      if (i % 2 === 0) {
        htmlRow.style.backgroundColor = "#ccc";
      }
    }
  }
  return fragm;
}

export class Protokoll extends PanelEinstellungen {
  constructor() {
    super("h2_protokoll");
  }
}

export class Update extends PanelEinstellungen {
  constructor() {
    super("h2_update");
  }
}

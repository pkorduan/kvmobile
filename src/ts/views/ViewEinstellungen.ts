import { configurations } from "../configurations";
import { Kvm, kvm } from "../app";
import * as PanelEinstellungen from "./PanelEinstellungen";
import { View } from "./View";

export class ViewEinstellungen extends View {
  dom: HTMLElement;

  panelLayer: PanelEinstellungen.Layers;
  panelSortierung: PanelEinstellungen.Sortierung;
  panelAnzeigeFilter: PanelEinstellungen.AnzeigeFilter;
  panelConfiguration: PanelEinstellungen.Konfiguration;
  panelServer: PanelEinstellungen.Server;
  panelColorSection: PanelEinstellungen.ColorSection;
  panelSymbol: PanelEinstellungen.Symbole;
  panelBildaufnahme: PanelEinstellungen.Bildaufnahme;
  panelKarteneinstellung: PanelEinstellungen.Karteneinstellung;
  panelSachdaten: PanelEinstellungen.Sachdaten;

  panelOfflineKarten: PanelEinstellungen.OfflineKarten;
  panelHintergrundLayer: PanelEinstellungen.HintergrundLayer;
  panelNetzwerkstatus: PanelEinstellungen.Netzwerkstatus;
  panelGPSStatus: PanelEinstellungen.GPSStatus;
  panelDeviceInfos: PanelEinstellungen.DeviceInfos;
  panelDatabase: PanelEinstellungen.Database;
  panelProtokoll: PanelEinstellungen.Protokoll;
  panelUpdate: PanelEinstellungen.Update;

  panelSecurity: PanelEinstellungen.Security;

  panelSymbole: PanelEinstellungen.Symbole;

  constructor(app: Kvm) {
    super(app, "settings");
    this.panelConfiguration = new PanelEinstellungen.Konfiguration(configurations);
    this.panelServer = new PanelEinstellungen.Server();
    this.panelLayer = new PanelEinstellungen.Layers();
    this.panelAnzeigeFilter = new PanelEinstellungen.AnzeigeFilter();
    this.panelSortierung = new PanelEinstellungen.Sortierung();
    this.panelColorSection = new PanelEinstellungen.ColorSection();
    this.panelSymbol = new PanelEinstellungen.Symbole();
    this.panelBildaufnahme = new PanelEinstellungen.Bildaufnahme();
    this.panelKarteneinstellung = new PanelEinstellungen.Karteneinstellung();
    this.panelSachdaten = new PanelEinstellungen.Sachdaten();

    this.panelOfflineKarten = new PanelEinstellungen.OfflineKarten();
    this.panelHintergrundLayer = new PanelEinstellungen.HintergrundLayer();
    this.panelNetzwerkstatus = new PanelEinstellungen.Netzwerkstatus();
    this.panelGPSStatus = new PanelEinstellungen.GPSStatus();
    this.panelSecurity = new PanelEinstellungen.Security();
    this.panelDeviceInfos = new PanelEinstellungen.DeviceInfos();
    this.panelDatabase = new PanelEinstellungen.Database();
    this.panelProtokoll = new PanelEinstellungen.Protokoll();
    this.panelUpdate = new PanelEinstellungen.Update();
  }

  show() {
    super.show();
    console.info(`show ViewEinstellungen`, this);
  }
  hide() {
    super.hide();
    console.info(`hide ViewEinstellungen`, this);
  }
}

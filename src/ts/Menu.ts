import { Kvm } from "./app";
import * as PanelEinstellungen from "./views/PanelEinstellungen";
import { View } from "./views/View";

export class Menu {
  private showSettings: HTMLElement;
  private showMapEdit: HTMLElement;
  private showFormEdit: HTMLElement;
  private showFeatureList: HTMLElement;
  private cancelFeatureButton: HTMLElement;
  private showMap: HTMLElement;
  private saveFeatureButton: HTMLElement;
  private newFeatureButton: HTMLElement;
  private editFeatureButton: HTMLElement;
  private tplFeatureButton: HTMLElement;
  private restoreFeatureButton: HTMLElement;
  private deleteFeatureButton: HTMLElement;
  private menuItems: HTMLElement[];

  private id2View = new Map<string, View>();

  private activeView: View;
  app: Kvm;

  constructor(app: Kvm) {
    this.app = app;

    for (const view of app.views) {
      this.id2View.set(view.id, view);
    }

    this.menuItems = [
      (this.showSettings = <HTMLElement>document.getElementById("showSettings")),
      (this.showMapEdit = <HTMLElement>document.getElementById("showMapEdit")),
      (this.showFormEdit = <HTMLElement>document.getElementById("showFormEdit")),
      (this.showFeatureList = <HTMLElement>document.getElementById("showFeatureList")),
      (this.cancelFeatureButton = <HTMLElement>document.getElementById("cancelFeatureButton")),
      (this.showMap = <HTMLElement>document.getElementById("showMap")),
      (this.saveFeatureButton = <HTMLElement>document.getElementById("saveFeatureButton")),
      (this.newFeatureButton = <HTMLElement>document.getElementById("newFeatureButton")),
      (this.editFeatureButton = <HTMLElement>document.getElementById("editFeatureButton")),
      (this.tplFeatureButton = <HTMLElement>document.getElementById("tplFeatureButton")),
      (this.restoreFeatureButton = <HTMLElement>document.getElementById("restoreFeatureButton")),
      (this.deleteFeatureButton = <HTMLElement>document.getElementById("deleteFeatureButton")),
    ];
    for (const item of this.menuItems) {
      item.style.display = "none";
    }
    this.showFormEdit.addEventListener("click", () => {
      this.app.showItem("formular");
    });

    this.showFeatureList.addEventListener("click", () => {
      this.app.showItem("featurelist");
    });
    this.showMap.addEventListener("click", () => {
      this.app.showItem("map");
    });
    this.showMapEdit.addEventListener("click", () => {
      this.app.showItem("mapEdit");
    });

    this.showSettings.addEventListener("click", () => {
      this.app.showItem("settings");
    });

    this.editFeatureButton.addEventListener("click", () => {
      const layer = app.getActiveLayer();
      layer.editFeature(layer.activeFeature);
    });

    this.newFeatureButton.addEventListener("click", () => {
      const layer = this.app.getActiveLayer();
      layer.newFeature();
      layer.editFeature(layer.activeFeature.id);
    });

    this.tplFeatureButton.addEventListener("click", () => {
      const layer = this.app.getActiveLayer();
      const tplId = layer.activeFeature.id;
      layer.newFeature();
      layer.editFeature(tplId);
      layer.loadTplFeatureToForm(tplId);
    });

    this.cancelFeatureButton.addEventListener("click", (evt) => {
      console.log("cancelFeatureButton geklickt.");
      const activeLayer = this.app.getActiveLayer();
      const activeFeature = activeLayer.activeFeature;
      const featureId = activeFeature.id;

      const changes = activeLayer.collectChanges(activeFeature.new ? "insert" : "update");
      if (changes.length > 0) {
        navigator.notification.confirm(
          "Änderungen verwerfen?",
          (buttonIndex) => {
            if (buttonIndex == 1) {
              this.app.cancelEditFeature();
            }
          },
          "Eingabeformular schließen",
          ["ja", "nein"]
        );
      } else {
        this.app.cancelEditFeature();
      }
    });

    this.app.addEventListener(Kvm.EVENTS.ACTIVE_LAYER_CHANGED, (evt) => {
      this.newFeatureButton.style.display = evt.newValue?.hasEditPrivilege ? "" : "none";
    });
  }

  showMenuMapEdit() {
    const items = [this.showFormEdit, this.saveFeatureButton, this.cancelFeatureButton];
    if (this.app.getActiveLayer()?.hasDeletePrivilege && !this.app.getActiveLayer()?.activeFeature?.new) {
      items.push(this.deleteFeatureButton);
    }
    this.showItems(items);
  }

  showDefaultMenu() {
    const items = [this.showSettings, this.showFeatureList, this.showMap];
    if (this.app.getActiveLayer()?.hasEditPrivilege) {
      items.push(this.newFeatureButton);
    }
    this.showItems(items);
  }

  showFormMenu() {
    const items = [this.showMapEdit, this.saveFeatureButton, this.cancelFeatureButton];
    if (this.app.getActiveLayer()?.hasDeletePrivilege && !this.app.getActiveLayer()?.activeFeature?.new) {
      items.push(this.deleteFeatureButton);
    }
    this.showItems(items);
  }

  showDataViewMenu() {
    const items = [this.showSettings, this.showFeatureList, this.showMap];
    // TODO!!!!
    // $("#showSettings, #showFeatureList, #showMap").show();
    if ($("#historyFilter").is(":checked")) {
      $("#restoreFeatureButton").show();
    } else {
      if (this.app.getActiveLayer()?.hasEditPrivilege) {
        // erstmal rausgenommen weil es zu Fehler führen kann.
        // klären was mit den die Kopiert wird passiert beim Speichern und Sync.
        // $("#editFeatureButton, #tplFeatureButton").show();
        items.push(this.editFeatureButton);
      }
    }
    this.showItems(items);
  }

  getFormularMenu() {
    const items = [this.saveFeatureButton, this.cancelFeatureButton];
    if (this.app.getActiveLayer()?.hasGeometry) {
      items.push(this.showMapEdit);
    }
    if (this.app.getActiveLayer()?.hasDeletePrivilege && !this.app.getActiveLayer()?.activeFeature?.new) {
      items.push(this.deleteFeatureButton);
    }

    this.showItems(items);
  }

  activate(item: string) {
    console.error(`yyyy newView=${item}  oldView=${this.activeView?.id}`);
    if (this.activeView) {
      // this.activeView.style.display = "none";
      this.activeView.hide();
    }

    // if (["map", "mapEdit"].indexOf(item) === -1) {
    //   document.getElementById("geolocation_div").style.display = "none";
    // }
    let newView: View;
    switch (item) {
      case "settings":
        this.showDefaultMenu();
        PanelEinstellungen.show("layer");
        newView = this.id2View.get(item);
        break;
      case "loggings":
        this.showDefaultMenu();
        newView = this.id2View.get(item);
        break;
      case "featurelist":
        this.showDefaultMenu();
        newView = this.id2View.get(item);
        this.app.lastMapOrListView = "featurelist";
        break;
      case "map":
        this.showDefaultMenu();
        newView = this.id2View.get(item);
        this.app.lastMapOrListView = "map";
        break;
      case "mapEdit":
        this.showMenuMapEdit();
        newView = this.id2View.get("map");
        this.app.map.invalidateSize();
        break;
      case "dataView":
        this.showDataViewMenu();
        $("#dataView").show().scrollTop(0);
        this.app.lastMapOrListView = "dataView";
        newView = this.id2View.get(item);
        break;
      case "formular":
        this.showFormMenu();
        newView = this.id2View.get(item);
        break;
      default:
        this.showDefaultMenu();
        newView = this.id2View.get("settings");
    }
    this.activeView = newView;
    newView.show();
    // newView.scrollTop(0);
  }

  private showItems(items: HTMLElement[]) {
    for (const menuItem of this.menuItems) {
      menuItem.style.display = items.includes(menuItem) ? "" : "none";
    }
  }
}

import { Kvm } from "./app";
import { sperrBildschirm } from "./SperrBildschirm";
import * as PanelEinstellungen from "./views/PanelEinstellungen";
import { View } from "./views/View";

export type ViewName = "settings" | "loggings" | "featurelist" | "map" | "mapEdit" | "dataView" | "formular";

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
  private activeViewName: ViewName;
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
      this.app.showView("formular");
    });

    this.showFeatureList.addEventListener("click", () => {
      this.app.showView("featurelist");
    });
    this.showMap.addEventListener("click", () => {
      this.app.showView("map");
    });
    this.showMapEdit.addEventListener("click", () => {
      this.app.showView("mapEdit");
    });

    this.showSettings.addEventListener("click", () => {
      this.app.showView("settings");
    });

    this.editFeatureButton.addEventListener("click", () => {
      app.editFeature(app.getActiveFeature());
    });

    this.newFeatureButton.addEventListener("click", async () => {
      sperrBildschirm.show();
      try {
        const layer = this.app.getActiveLayer();
        const newFeature = await layer.createNewFeature();
        await app.editFeature(newFeature);
        sperrBildschirm.close();
      } catch (error) {
        console.error(error);
        sperrBildschirm.close("Fehler beim Anlegen eines neuen Features", error);
      }
    });

    this.tplFeatureButton.addEventListener("click", async () => {
      const layer = this.app.getActiveLayer();
      const tplId = app.getActiveFeature().id;
      const f = await layer.createNewFeature();
      app.editFeature(f);
      layer.loadTplFeatureToForm(tplId);
    });

    this.cancelFeatureButton.addEventListener("click", (evt) => {
      console.log("cancelFeatureButton geklickt.");
      const activeLayer = this.app.getActiveLayer();
      const activeFeature = this.app.getActiveFeature();
      // const featureId = activeFeature.id;

      const changes = activeLayer.collectChanges(activeFeature, activeFeature.new ? "insert" : "update");
      if (changes.length > 0) {
        navigator.notification.confirm(
          "Änderungen verwerfen?",
          (buttonIndex) => {
            if (buttonIndex === 1) {
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
      // Todo fff
      if (this.activeView?.id !== "formular") {
        this.newFeatureButton.style.display = evt.newValue?.hasEditPrivilege ? "" : "none";
      }
    });
  }

  showMenuMapEdit() {
    const items = [this.showFormEdit, this.saveFeatureButton, this.cancelFeatureButton];
    if (this.app.getActiveLayer()?.hasDeletePrivilege && !this.app.getActiveFeature()?.new) {
      items.push(this.deleteFeatureButton);
    }
    this.showItems(items);
  }

  showDefaultMenu() {
    // TODO fff
    const items = [this.showSettings, this.showFeatureList, this.showMap];
    if (this.app.getActiveLayer()?.hasEditPrivilege) {
      items.push(this.newFeatureButton);
    }
    this.showItems(items);
  }

  showFormMenu() {
    const items = [this.showMapEdit, this.saveFeatureButton, this.cancelFeatureButton];
    if (this.app.getActiveLayer()?.hasDeletePrivilege && !this.app.getActiveFeature()?.new) {
      items.push(this.deleteFeatureButton);
    }
    this.showItems(items);
  }

  showDataViewMenu() {
    const items = [this.showSettings, this.showFeatureList, this.showMap];
    // TODO jquery
    // TODO!!!!
    // $("#showSettings, #showFeatureList, #showMap").show();
    if ($("#historyFilter").is(":checked")) {
      $("#restoreFeatureButton").show();
    } else {
      if (this.app.getActiveLayer()?.hasEditPrivilege && !this.app.getActiveFeature().hasEditiersperre()) {
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
    if (this.app.getActiveLayer()?.hasDeletePrivilege && !this.app.getActiveFeature()?.new) {
      items.push(this.deleteFeatureButton);
    }

    this.showItems(items);
  }

  activate(item: ViewName) {
    // console.info(`yyyy newView=${item}  oldView=${this.activeView?.id}`);
    if (this.activeView) {
      this.activeView.hide();
    }

    let newView: View;
    switch (item) {
      case "settings":
        this.showDefaultMenu();
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
        newView = this.id2View.get("mapView");
        this.app.lastMapOrListView = "map";
        break;
      case "mapEdit":
        this.showMenuMapEdit();
        newView = this.id2View.get("mapView");
        this.app.map.invalidateSize();
        break;
      case "dataView":
        this.showDataViewMenu();
        document.getElementById("dataView").scrollTop = 0;
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
    this.activeViewName = item;
    newView.show();

    if (item === "settings") {
      PanelEinstellungen.show("layer");
    }
    // newView.scrollTop(0);
  }

  isActiveView(viewName: ViewName) {
    return viewName === this.activeViewName;
  }

  private showItems(items: HTMLElement[]) {
    for (const menuItem of this.menuItems) {
      menuItem.style.display = items.includes(menuItem) ? "" : "none";
    }
  }

  enableSaveFeatureButton(enable: boolean) {
    console.error("enableSaveFeatureButton: " + enable);
    if (enable) {
      this.saveFeatureButton.classList.remove("inactive-button");
    } else {
      this.saveFeatureButton.classList.add("inactive-button");
    }
  }
}

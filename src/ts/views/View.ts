import { Kvm } from "../app";

export abstract class View {
  dom: HTMLElement;
  id: string;
  app: Kvm;

  constructor(app: Kvm, domId?: string) {
    if (domId) {
      this.dom = <HTMLElement>document.getElementById(domId);
    }
    this.id = domId;
    this.app = app;
  }
  show() {
    this.dom.style.display = "";
    this.dom.style.zIndex = "1";
  }
  hide() {
    console.error("View.hide " + this.id);
    this.dom.style.display = "none";
  }
}

import { Kvm } from "../app";
import { View } from "./View";

export class ViewLoggings extends View {
  constructor(app: Kvm) {
    super(app, "loggings");
  }

  show() {
    super.show();
    console.info(`show ViewLoggings`, this);
  }
  hide() {
    super.hide();
    console.info(`hide ViewLoggings`, this);
  }
}

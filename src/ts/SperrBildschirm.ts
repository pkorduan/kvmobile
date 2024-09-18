import { kvm } from "./app";
import { alert as nativeAlert } from "./Util";

function objectToString(err: Object) {
  let s = "";
  if (err instanceof Error) {
    s = err.message || "";
    if (err.cause) {
      if (err.cause instanceof Error) {
        s += "\nUrsache:" + objectToString(err.cause);
      } else if (err.cause instanceof Object) {
        s += objectToString(err.cause);
      }
    }
  } else if (err instanceof Object) {
    Object.keys(err).forEach((key) => {
      const v = err[key];
      if (v instanceof Object) {
        s += "\n" + key + ": " + objectToString(v);
      } else {
        s += "\n" + key + ": " + v;
      }
    });
  }
  return s;
}

class SperrBildschirm {
  private sperrDiv: HTMLElement;
  private sperrDivSpinner: HTMLElement;
  private sperrDivContent: HTMLElement;

  //   <div id="sperr_div" class="modal">
  //   <i class="fa fa-spinner fa-pulse fa-2x"></i>
  //   <div id="sperr_div_content" class="sperr-div-content"></div>

  constructor() {
    console.info("SperrBildschirm new");
    const f = () => {
      this.sperrDiv = document.getElementById("sperr_div") as HTMLElement;
      this.sperrDivSpinner = this.sperrDiv.querySelector("i") as HTMLElement;
      this.sperrDivContent = document.getElementById("sperr_div_content") as HTMLElement;
      document.removeEventListener("deviceready", f);

      this.sperrDiv.addEventListener("dblclick", (evt) => {
        navigator.notification.confirm(
          "Sperrbildschirm aufheben?",
          (buttonIndex) => {
            if (buttonIndex === 1) {
              this.close();
            }
          },
          "",
          ["ja", "nein"]
        );
      });

      console.info("SperrBildschirm init");
    };
    document.addEventListener("deviceready", f);
  }

  clear() {
    this.sperrDivContent.innerHTML = "";
  }

  async close(msg?: string, o?: Object) {
    if (msg) {
      msg = msg.replaceAll("\\n", "\n");
      msg = msg.replaceAll("<br>", "\n");
      msg = msg.replaceAll('"', '"');

      if (o instanceof Object) {
        msg += objectToString(o);
      }

      await nativeAlert(msg, null, "ok");
    }
    this.sperrDiv.style.display = "none";
    this.sperrDivContent.innerHTML = "";
  }

  show(msg?: string) {
    this.sperrDiv.style.display = "block";
    this.sperrDiv.style.zIndex = "999";
    if (msg) {
      this.tick(`<b>${msg}</b>`, false);
    }
  }

  setContent(htmlTxt: any, append?: boolean) {
    if (append) {
      const span = document.createElement("span");
      span.innerHTML = "<br>" + htmlTxt;
      this.sperrDivContent.append(span);
    } else {
      this.sperrDivContent.innerHTML = htmlTxt;
    }
  }

  tick(msg: string, append = true) {
    msg = kvm.replacePassword(msg);
    if (append) {
      const span = document.createElement("span");
      span.innerHTML = "<br>" + msg;
      this.sperrDivContent.append(span);
    } else {
      this.sperrDivContent.innerHTML = msg;
    }
  }
}

export const sperrBildschirm = new SperrBildschirm();

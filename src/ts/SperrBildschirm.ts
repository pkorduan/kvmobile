import { kvm, Kvm } from "./app";

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

  close(msg?: string) {
    if (msg) {
      navigator.notification.confirm(
        msg,
        (buttonIndex) => {
          if (buttonIndex == 1) {
            this.sperrDiv.style.display = "none";
          }
        },
        "Laden",
        ["OK"]
      );
    } else {
      this.sperrDiv.style.display = "none";
      this.sperrDivContent.innerHTML = "";
    }
  }

  show(msg?: string) {
    this.sperrDiv.style.display = "block";
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

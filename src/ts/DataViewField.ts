import { kvm } from "./app";
import { createHtmlElement, getWebviewUrl, confirm } from "./Util";
import { Attribute, AttributeSetting } from "./Attribute";
import { Feature } from "./Feature";

export class DataViewField {
  settings: AttributeSetting;
  element: HTMLElement;
  images_div_id: string;
  attribute: Attribute;
  private dom: HTMLElement;

  /**
   * create a field in data view in the form
   *   <div class="data-view-field">
   *     <div class="data-view-label">
   *       label
   *     </div>
   *     <div class="data-view-value">
   *       value
   *    </div>
   *  </div>
   */
  // constructor(divId, attribute) {
  constructor(attribute: Attribute) {
    this.attribute = attribute;
    this.settings = attribute.settings;
  }

  private _createDom() {
    const dom = (this.dom = createHtmlElement("div", null, "data-view-field"));
    dom.id = "dataViewFieldDiv_" + this.attribute.layer.get("id") + "_" + this.get("index");
    if (this.attribute.getArrangementStyle()) {
      dom.style.cssText = this.attribute.getArrangementStyle();
    }
    const label = createHtmlElement("div", dom, "data-view-label");

    label.append(this.get("alias") ? this.get("alias") : this.get("name"));

    if (this.settings.tooltip) {
      const infoBttn = createHtmlElement("i", label, "fa fa-exclamation-circle");
      infoBttn.style.color = "#f57802";
      infoBttn.style.paddingLeft = "0.2rem";
      infoBttn.addEventListener("click", () => kvm.msg(this.settings.tooltip));
    }

    this.images_div_id = `images_${this.get("index")}`;
    this.element = createHtmlElement("div", dom, "data-view-value");
    // console.log('created element %o', this.element);
    this.element.id = "dataViewFieldValue_" + this.get("index");
  }

  get(key: keyof AttributeSetting) {
    return this.attribute.settings[key];
  }

  hide() {
    if (this.dom) {
      this.dom.style.display = "none";
    }
  }
  show() {
    if (this.dom) {
      this.dom.style.display = "";
    }
  }

  async setDocumentValue(val) {
    try {
      console.error(`DataViewField.setDocumentValue(${val})`);
      val = kvm.coalesce(val, "");
      this.element.innerHTML = "";
      const imgPrevDiv = createHtmlElement("div", this.element);
      imgPrevDiv.id = "previews_" + this.get("index");
      this.element.append(imgPrevDiv);

      // create new images if exists
      if (val == "") {
        imgPrevDiv.style.display = "none";
      } else {
        imgPrevDiv.style.display = "";
        //console.log("setValue add images to previews div: %s", val);
        // console.log(this);
        const images = kvm.removeBrackes(val).split(",");

        for (let i = 0; i < images.length; i++) {
          const remoteFile = kvm.removeQuotas(images[i]);
          const localFile = kvm.removeOriginalName(kvm.serverToLocalPath(remoteFile));
          const imgUrl = await getWebviewUrl(localFile);

          const imgDiv = createHtmlElement("input", null, "img preview", {
            id: `preview_${this.get("index")}_${i}`,
            field_id: this.get("index"),
          });
          imgDiv.style.backgroundImage = `url('${imgUrl}')`;

          imgDiv.addEventListener("click", (evt) => {
            cordova.plugins.fileOpener2.open(localFile, "image/jpeg", {
              error: (e) => {
                console.error("Fehler beim laden der Datei: '" + localFile + "'. Fehler:", e);
                alert("Fehler beim laden der Datei: '" + localFile + "'. Fehler:" + e);
              },
              success: () => {
                console.log("Datei " + localFile + " erfolgreich geöffnet.");
              },
            });
          });
          imgPrevDiv.append(imgDiv);

          window.resolveLocalFileSystemURL(
            localFile,
            function (fileEntry) {
              console.log("Datei " + fileEntry.toURL() + " existiert.");
              // Hier muss nix mehr gemacht werden weil Bild schon Einstellungen hat.
              //const src = fileEntry.toURL();
              //console.log("Set img src: %s", src);
              //this.imgDiv.attr("src", src);
            }.bind({
              context: this,
              localFile: localFile,
              remoteFile: remoteFile,
              imgDiv: imgDiv,
            }),
            function () {
              //console.log("Datei " + this.localFile + " existiert nicht!");
              if (navigator.onLine) {
                //console.log("Try to download file: %s", this.remoteFile);
                kvm.getActiveLayer().downloadImage(this.localFile, this.remoteFile);
              } else {
                console.log("Kein Netz set src: img/no_image.png");
                this.imgDiv.css("background-image", "img/no_image.png");
                /*
              let imgDiv = $(
                '<div class="img" src="img/no_image.png" style="background-image: url(' +
                  this.localFile +
                  ');" field_id="' +
                  this.context.get("index") +
                  '"name="preview_' +
                  this.localFile +
                  '"></div>'
              );
              */
              }
            }.bind({
              context: this,
              localFile: localFile,
              remoteFile: remoteFile,
              imgDiv: imgDiv,
            })
          );
        }
      }
    } catch (ex) {
      console.error("Error this.setDocumentValue", ex);
    }
  }

  setSubFormFKValue(val) {
    this.element.innerHTML = "";
    const globalParentLayerId = this.attribute.getGlobalParentLayerId();
    // let parentLayer = kvm.layers.get(globalParentLayerId);
    const vorschauOption = this.attribute.getVorschauOption();
    const div = createHtmlElement("div", this.element);
    div.addEventListener("click", () => {
      kvm.activateFeature(globalParentLayerId, val);
    });
    const iBttn = createHtmlElement("div", div, "fa fa-arrow-left");
    iBttn.ariaHidden = "true";
    iBttn.style.cssText = "margin-right: 10px";
    div.append(vorschauOption);
  }

  setAuswahlfeldValue(val) {
    const options = this.get("enums");
    let output = "";
    if (val && options && Array.isArray(options)) {
      // output options instead of values
      let values = [];
      let outputs = [];
      if (this.attribute.isArrayType()) {
        values = kvm.removeBrackes(val).split(",");
      } else {
        values.push(String(val));
      }
      outputs = options.filter((option) => {
        return values.includes(String(option.value));
      });
      if (outputs.length > 1) {
        output = `
          <ul class="multiple-options-list">
            <li>${outputs
              .map((option) => {
                return option.output;
              })
              .join("</li><li>")}</li>
          </ul>
        `;
      } else if (outputs.length == 1) {
        output = String(outputs[0].output);
      } else {
        output = "";
      }
    } else {
      output = val ? String(val) : "";
    }
    if (this.attribute.get("name") == "alternanz_id") {
      console.log(output);
    }
    this.element.innerHTML = output;
    return output;
  }

  setValue(f: Feature, val: any) {
    if (val == "null") {
      val = null;
    }

    if (val && this.get("type") === "timestamp") {
      const datetime = new Date(val);
      val = datetime.toLocaleDateString() + " " + datetime.toLocaleTimeString();
      this.element.innerHTML = kvm.coalesce(val, "");
    } else if (this.get("form_element_type") == "Dokument") {
      this.setDocumentValue(val);
    } // end of document
    else if (this.get("form_element_type") == "SubFormFK") {
      this.setSubFormFKValue(val);
    } else if (this.get("form_element_type") == "SubFormEmbeddedPK") {
      this.attribute.layer.readVorschauAttributes(this.attribute, f.getDataValue(this.attribute.getPKAttribute()), this.element, "activateFeature");
    } else if (this.get("form_element_type") == "Auswahlfeld") {
      this.setAuswahlfeldValue(val);
    } else if (this.get("form_element_type") == "Checkbox") {
      const output = val ? (val === "t" ? "ja" : "nein") : "";
      this.element.innerHTML = output;
    } else {
      this.element.innerHTML = kvm.coalesce(val, "");
    }
    // this.element.trigger("change");
    return val;
  }

  // this function bind events pending on form_element_type
  bindEvents(): void {
    switch (this.get("form_element_type")) {
      case "Dokument":
        // open image in viewer
        $('div[name$="' + name + '"]').on("click", function (evt) {
          var target = $(evt.target),
            src = target.attr("src"),
            fieldId = target.attr("field_id");
          if (src == "img/no_image.png") {
            navigator.notification.confirm(
              "Bild herunterladen?",
              function (buttonIndex) {
                if (buttonIndex == 1) {
                  // ja
                  var remoteFile = target.attr("name"),
                    localFile = kvm.getActiveLayer().attributes[fieldId].formField.serverToLocalPath(remoteFile);

                  kvm.getActiveLayer().downloadImage(localFile, remoteFile);
                }
                if (buttonIndex == 2) {
                  // nein
                  // Do nothing
                }
              },
              "",
              ["ja", "nein"]
            );
          } else {
            console.log("Versuche das Bild zu öffnen: " + src);
            cordova.plugins.fileOpener2.open(src, "image/jpeg", {
              error: (e) => {
                console.error("Fehler beim laden der Datei: '" + src + "'. Fehler:", e);
                alert("Fehler beim Laden der Datei: '" + src + "'. Fehler:" + e);
              },
              success: async () => {
                console.log("Datei " + src + " erfolgreich geöffnet.");
              },
            });
          }
        });
        break;
    }
  }

  /*
   * src is der FileName file shown in view
   * name is the file stored in database
   * Images not downloaded yet to the device are default no_image.png
   * otherwise src is equal to name
   */
  addImage(src: string, name = "") {
    // TODO jquery
    //console.log("DataViewField: Add Image with src: %s and name: %s", src, name);
    // console.log("DataViewField.addimage", src, name);
    name = name == "" ? src : name;
    const imgDiv = $('<div class="img" src="' + src + '" style="background-image: url(' + src + ');" field_id="' + this.get("index") + '"name="' + name + '"></div>');
    $("#" + this.images_div_id)
      .append(imgDiv)
      .show();

    $('div[name$="' + name + '"]').on("click", function (evt) {
      var target = $(evt.target),
        src = target.attr("src"),
        fieldId = target.attr("field_id");

      if (src === "img/no_image.png") {
        if (navigator.onLine) {
          navigator.notification.confirm(
            "Bild herunterladen?",
            function (buttonIndex) {
              if (buttonIndex == 1) {
                // ja
                var remoteFile = target.attr("name"),
                  localFile = kvm.getActiveLayer().attributes[fieldId].formField.serverToLocalPath(remoteFile);

                kvm.getActiveLayer().downloadImage(localFile, remoteFile);
              }
              if (buttonIndex == 2) {
                // nein
                // Do nothing
              }
            },
            "",
            ["ja", "nein"]
          );
        } else {
          kvm.msg("Kein Internet! Bild kann gerade nicht heruntergeladen werden.", "Bilder Download");
        }
      } else {
        console.log("Versuche das Bild zu öffnen: " + src);
        cordova.plugins.fileOpener2.open(src, "image/jpeg", {
          error: function (e) {
            console.error("Fehler beim laden der Datei: '" + src + "'. Fehler:", e);
            alert("Fehler beim Laden der Datei: '" + src + "'. Fehler:" + e);
          },
          success: function () {
            console.log("Datei " + src + " erfolgreich geöffnet.");
            navigator.notification.confirm(
              "Bild Löschen?",
              function (buttonIndex) {
                if (buttonIndex == 1) {
                  // ja
                  const field = kvm.getActiveLayer().attributes[fieldId].formField;
                  field.dropImage(target);
                }
                if (buttonIndex == 2) {
                  // nein
                  // Do nothing
                }
              },
              "",
              ["ja", "nein"]
            );
          },
        });
      }
    });
  }

  // withLabel(): HTMLElement {
  //   return dataViewField;
  // }

  // getWithLabel(): HTMLElement {
  //   const dom = createHtmlElement("div", null, "data-view-field");
  //   dom.id = `dataViewFieldDiv_${this.get("index")}`;
  //   const label = createHtmlElement("div", dom, "data-view-label");
  //   label.append(this.get("alias") ? this.get("alias") : this.get("name"));
  //   if (this.get("tooltip")) {
  //     const tooTippBttn = createHtmlElement("i", label, "fa fa-exclamation-circle");
  //     tooTippBttn.style.cssText = "color: #f57802";
  //     tooTippBttn.addEventListener("click", () => {
  //       kvm.msg(this.get("tooltip"));
  //     });
  //   }
  //   dom.append(this.element);
  //   return dom;
  // }

  getDom(): HTMLElement {
    if (!this.dom) {
      this._createDom();
    }
    return this.dom;
  }
}

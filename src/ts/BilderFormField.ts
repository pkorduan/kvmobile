/// <reference types="cordova-plugin-camera"/>
/// <reference types="cordova-plugin-file-opener2"/>

import { kvm } from "./app";
import { AttributeSetting } from "./Attribute";
import { AbstractField, Field } from "./Field";
import { confirm, createHtmlElement, fileExists, getWebviewUrl } from "./Util";

export class BilderFormField extends AbstractField {
  images_div_id: string;

  element: HTMLElement;
  imagesDiv: HTMLElement;

  hiddenElement: HTMLInputElement;

  takePictureButton: HTMLElement;
  loadPictureFromPhotolibrary: HTMLElement;
  dropAllPictureButton: HTMLElement;

  // moveFile: (srcFile, dstDir) => void;

  constructor(formId: string, settings: AttributeSetting) {
    console.trace("BilderFormField", formId, settings);
    super(formId, settings);
    this.images_div_id = "images_" + settings["index"];

    this.element = createHtmlElement("div", null, "form-value");

    if (this.settings.privilege === "1") {
      const takePictureButton = (this.takePictureButton = createHtmlElement("i", this.element, "fa fa-camera fa-2x"));
      takePictureButton.style.cssText = "color: rgb(38, 50, 134); margin: 5px 10px 15px 0px";
      takePictureButton.id = "takePictureButton_" + this.settings.index;
      takePictureButton.addEventListener("click", (ev) => this.takePicture(ev));

      const loadPictureFromPhotolibrary = (this.loadPictureFromPhotolibrary = createHtmlElement("i", this.element, "fa fa-image fa-2x"));
      loadPictureFromPhotolibrary.style.cssText = "color: rgb(38, 50, 134); margin: 0px 0px 14px 9px";
      loadPictureFromPhotolibrary.id = "loadPictureFromPhotolibrary_" + this.settings.index;
      loadPictureFromPhotolibrary.addEventListener("click", (ev) => this.floadPictureFromPhotolibrary(ev));

      const dropAllPictureButton = (this.dropAllPictureButton = createHtmlElement("i", this.element, "fa fa-trash fa-2x"));
      dropAllPictureButton.style.cssText = "color: rgb(238, 50, 50); float: right; display: none;";
      dropAllPictureButton.id = "dropAllPictureButton_" + this.settings.index;
      dropAllPictureButton.addEventListener("click", (ev) => this.dropAllPictures(ev));
    }

    this.imagesDiv = createHtmlElement("div", this.element, "images-div");

    this.hiddenElement = createHtmlElement("input", this.element, "form-value");
    this.hiddenElement.type = "hidden";
    this.hiddenElement.id = String(this.settings.index);
    this.hiddenElement.name = String(this.settings.name);

    // this.element = $('<div class="form-value">').append(
    //   '\
    //     <input\
    //     type="hidden"\
    //     id="' +
    //     this.settings.index +
    //     '"\
    //     name="' +
    //     this.settings.name +
    //     '"\
    //     value=""' +
    //     (this.settings.privilege == "0" ? " disabled" : "") +
    //     "\
    //     />"
    // );
    // this.moveFile = this.moveFile_.bind(this);
  }
  // get(key) {
  //     return this.settings[key];
  // }

  /* Assign the value of the feature to the form field as it is in the database and
   * create corresponding form and view elements.
   * @params any set to '' if val is undefined, null, 'null' or NAN
   */
  async setValue(kvwmapFilePath: string) {
    console.log("BilderFormField.setValue kvwmapFilePath=" + kvwmapFilePath);
    // console.log("BilderFormField.setValue with value: " + val);
    this._oldValue = kvwmapFilePath;

    const val = kvm.coalesce(kvwmapFilePath, "");
    // let images;
    // let localFile;
    // let remoteFile;

    this.hiddenElement.value = val;

    // remove images from preview div
    this.imagesDiv.innerHTML = "";

    if (val == "") {
      this.imagesDiv.innerHTML = "";
      if (this.settings.privilege === "1") {
        this.dropAllPictureButton.style.display = "none";
      }
    } else {
      console.log("Add images to previews div: %s", val);
      const images = kvm.removeBrackes(val).split(",");
      console.log("images: %s", JSON.stringify(images));
      for (let i = 0; i < images.length; i++) {
        const remoteFile = kvm.removeQuotas(images[i]);
        const localFile = kvm.removeOriginalName(kvm.serverToLocalPath(remoteFile));
        console.log("images[" + i + "]: %s", remoteFile);
        window.resolveLocalFileSystemURL(
          localFile,
          (fileEntry) => {
            console.log("Datei " + fileEntry.toURL() + " existiert.");
            try {
              this.addImage(fileEntry.nativeURL);
            } catch (ex) {
              console.error(ex);
            }
          },
          () => {
            kvm.log("Datei " + localFile + " existiert nicht!", 2);
            this.addImage("img/no_image.png", remoteFile);
            if (navigator.onLine) {
              kvm.getActiveLayer().downloadImage(localFile, remoteFile);
            }
          }
        );
      }
    }
  }

  getValue(action = "") {
    return this.hiddenElement.value || null;
  }

  hasChanged(): boolean {
    const hasChanged = super.hasChanged();
    if (hasChanged) {
      console.info(this._oldValue, this._value, this.hiddenElement.value, this._oldValue === this.hiddenElement.value);
    }
    return hasChanged;
  }

  /*
   * src is the file shown in view
   * name is the file stored in database
   * Images not downloaded yet to the device are default no_image.png
   * otherwise src is equal to name
   */
  async addImage(nativeURL: string, name = "") {
    // console.log("BilderFormField.addimage", nativeURL, name);
    name = name == "" ? nativeURL : name;
    console.log("BilderFormField: Add Image with src: %s and name: %s", nativeURL, name);
    const webviewUrl = await getWebviewUrl(nativeURL);
    // const url = await getFileUrl(src);

    // const src=webviewUrl;
    // const field_id=this.settings.index;
    // const xname=name;

    const imgDiv = createHtmlElement("div", this.imagesDiv, "img");
    imgDiv.style.backgroundImage = "url(" + webviewUrl + ")";
    imgDiv.dataset.src = webviewUrl;
    imgDiv.dataset.field_id = this.settings.index + "name=" + name;

    this.dropAllPictureButton.style.display = "";

    imgDiv.addEventListener("click", (evt) => {
      if (webviewUrl == "img/no_image.png") {
        if (navigator.onLine) {
          const confirmDownload = confirm("Bild herunterladen?");
          if (confirmDownload) {
            const remoteFile = name;
            const localFile = kvm.serverToLocalPath(remoteFile);
            kvm.getActiveLayer().downloadImage(localFile, remoteFile);
          }
        } else {
          kvm.msg("Kein Internet! Bild kann gerade nicht heruntergeladen werden.", "Bilder Download");
        }
      } else {
        kvm.log("Versuche das Bild zu öffnen: " + nativeURL, 4);
        cordova.plugins.fileOpener2.open(nativeURL, "image/jpeg", {
          error: async (e) => {
            alert("Fehler beim Laden der Datei '" + nativeURL + "'. Fehler: " + e.status);
            if (await confirm("Bild Löschen?", null, "ja", "nein")) {
              this.dropImage(imgDiv);
            }
          },
          success: async () => {
            kvm.log("Datei " + webviewUrl + " erfolgreich geöffnet.", 4);
            if (await confirm("Bild Löschen?", null, "ja", "nein")) {
              this.dropImage(imgDiv);
            }
          },
        });
      }
    });
  }

  addImgNameToVal(newImg) {
    console.log("addImgNameToVal", newImg);
    let val = this.getValue();

    val = val == null ? kvm.addBraces(newImg) : kvm.addBraces(kvm.removeBrackes(val) + "," + newImg);
    this._value = val;
    this.fireChanged();
    this.hiddenElement.value = val;
    // this.hiddenElement.trigger("change");
    return val;
  }

  /*
   * Remove the image tag witch have this src and
   * the corresponding path from hidden formfield
   */
  dropImage(imgDiv) {
    const imageField = this.element;
    const src = imgDiv.attr("src");
    // activeLayer = kvm.activeLayer,
    // sql = "";

    kvm.log("BilderFormField.dropImage img: " + src, 4);
    // ToDo implement this function and bind to delte choice of after dialog from image click
    // remove image string from field value
    // imageField.value = (
    //   kvm.addBraces(
    //     $.map(kvm.removeBrackes(imageField.val()).split(","), function (path) {
    //       if (path.indexOf(src.substring(src.lastIndexOf("/") + 1)) < 0) {
    //         return path;
    //       }
    //     }).join(",")
    //   )
    // );

    // imageField.trigger("change");
    this.fireChanged();
    imgDiv.remove();
  }

  bindEvents() {
    //console.log('BildFormField.bindEvents');
    // $("#featureFormular input[id=" + this.settings.index + "]").on("change", function () {
    //   // console.log('event on saveFeatureButton');
    //   if (!$("#saveFeatureButton").hasClass("active-button")) {
    //     $("#saveFeatureButton").toggleClass("active-button inactive-button");
    //   }
    // });
    // if (this.settings.privilege === "1") {
    //   this.takePictureButton.addEventListener("click", (ev) => this.takePicture(ev));
    //   this.loadPictureFromPhotolibrary.addEventListener("click", (ev) => this.floadPictureFromPhotolibrary(ev));
    //   this.dropAllPictureButton.addEventListener("click", (ev) => this.dropAllPictures(ev));
    // }
    /*
    $('#selectPictureButton_1').bind(
      'click',
      { context: this},
      this.selectPicture,
    );
*/
  }

  async dropAllPictures(evt: Event) {
    // const context = evt.data.context;
    //console.log('BilderformField.dropAllPictures');
    const confirmed = await confirm("Wirklich alle Bilder in diesem Datensatz Löschen?", null, "ja", "nein");
    if (confirmed) {
      this.setValue("");
      this.fireChanged();
    }
  }

  /**
   * capture a picture
   */
  takePicture(evt: Event) {
    // console.log("takePicture", evt);
    // kvm.log("BilderFormField.takePicture: " + JSON.stringify(evt), 4);

    navigator.camera.getPicture(
      (fileURL) => {
        kvm.log("this.addImage(" + fileURL + ");", 4);

        if (kvm.hasFilePath(fileURL, kvm.getConfigurationOption("localImgPath"))) {
          this.addImgNameToVal(kvm.localToServerPath(fileURL));
          getWebviewUrl(fileURL).then((webviewUrl) => this.addImage(webviewUrl));
        } else {
          this.moveFile(fileURL, kvm.getConfigurationOption("localImgPath"));
        }
        $("#featureFormular input[name=bilder_updated_at]").val(kvm.now("T", "")).show();
        this.fireChanged();
      },
      (message) => {
        kvm.msg("Keine Aufnahme gemacht! " + message);
      },
      {
        // TODO Add aditional options to edit or change orientation
        quality: kvm.getConfigurationOption("cameraOptionsQuality"),
        saveToPhotoAlbum: kvm.getConfigurationOption("cameraOptionsSaveToPhotoAlbum"),
        correctOrientation: false, // $("#cameraOptionsCorrectOrientation").is(":checked"),
        allowEdit: false, // $("#cameraOptionsAllowEdit").is(":checked"),
        sourceType: Camera.PictureSourceType.CAMERA,
        destinationType: Camera.DestinationType.FILE_URI,
      }
    );
  }

  /**
   * capture a picture
   */
  floadPictureFromPhotolibrary(evt: Event) {
    // console.log("takePicture", evt);
    kvm.log("BilderFormField.takePicture: " + JSON.stringify(evt), 4);
    navigator.camera.getPicture(
      (fileURL) => {
        kvm.log("this.addImage(" + fileURL + ");", 4);
        const ffileURL = "file://" + fileURL;
        kvm.log("this.addImage(" + fileURL + ");", 4);
        fileExists(fileURL).then((exists) => {
          console.log("File 1" + ffileURL + "  exist => " + exists);

          if (kvm.hasFilePath(ffileURL, kvm.getConfigurationOption("localImgPath"))) {
            this.addImgNameToVal(kvm.localToServerPath(ffileURL));
            getWebviewUrl(ffileURL).then((webviewUrl) => this.addImage(webviewUrl));
          } else {
            this.moveFile(ffileURL, kvm.getConfigurationOption("localImgPath"));
          }

          $("#featureFormular input[name=bilder_updated_at]").val(kvm.now("T", "")).show();
        });
      },
      (message) => {
        kvm.msg("Keine Aufnahme gemacht! " + message);
      },
      {
        // TODO
        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
        destinationType: Camera.DestinationType.FILE_URI,
      }
    );
  }

  /*
   * Move the srcFile to dstDir and return dstFile
   * @param String srcFile, Path and name of the file to move
   * @param String dstDir, Path of the destination directory
   * @return String Path and name of the file at destination directory
   */
  moveFile(srcFile: string, dstDir: string) {
    const dstFile = dstDir + srcFile.substring(srcFile.lastIndexOf("/") + 1);

    // listFiles(dstDir);
    // listFiles(srcFile.substring(0, srcFile.lastIndexOf("/") + 1));

    kvm.log("moveFile " + srcFile + " nach " + dstDir, 4);
    // console.log("moveFile(" + srcFile + ", " + dstDir + ")");
    window.resolveLocalFileSystemURL(
      dstDir,
      (dirEntry) => {
        kvm.log("Erzeuge dirEntry", 4);
        console.log("Kopiere nach dstDirEntry: %o", dirEntry);
        window.resolveLocalFileSystemURL(
          srcFile,
          (fileEntry: Entry) => {
            fileEntry.moveTo(
              <DirectoryEntry>dirEntry,
              fileEntry.name,
              () => {
                // TODO
                // kvm.log('Datei: ' + fileEntry.name + ' nach: ' + dstDirEntry.toURL() + ' verschoben.');
                this.addImage(dstFile);
                this.addImgNameToVal(kvm.localToServerPath(dstFile));
              },
              () => {
                console.log("copying FAILED");
              }
            );
          },
          (e: FileError) => {
            console.log("could not resolveLocalFileSystemURL: " + srcFile);
            console.log(JSON.stringify(e));
          }
        );
      },
      (e: FileError) => {
        console.log("could not resolveLocalFileSystemURL: " + dstDir);
        console.log(JSON.stringify(e));
      }
    );
  }

  /*
   * Extract the local image path from an local image file string
   * eg. file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/1525249567531.jpg
   * extract between file:///storage/ and /Android/data/de.gdiservice.kvmobile/files/
   */
  getLocalImgPath(imageData) {
    // console.log("getLocalImgPath", imageData);
    kvm.log("getLocalImgPath for imageData: " + imageData);
    const result = "file:///storage/" + imageData.split("file:///storage/")[1].split("/Android/data/de.gdiservice.kvmobile/files/")[0] + "/Android/data/de.gdiservice.kvmobile/files/";
    kvm.log("getLocalImgPath returning: " + result);
  }

  getDom(): HTMLElement {
    return this.element;
  }
}

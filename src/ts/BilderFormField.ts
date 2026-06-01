/// <reference types="cordova-plugin-camera"/>
/// <reference types="cordova-plugin-file-opener2"/>

import { kvm } from "./app";
import { Attribute } from "./Attribute";
import { Feature } from "./Feature";
import { AbstractField } from "./Field";
import { resolveLocalFileSystemURL, confirm, createHtmlElement, fileExists, getWebviewUrl, alertOverlay } from "./Util";
import * as Util from "./Util";

export class BilderFormField extends AbstractField {
  images_div_id: string;

  element: HTMLElement;
  imagesDiv: HTMLElement;

  hiddenElement: HTMLInputElement;

  takePictureButton: HTMLElement;
  loadPictureFromPhotolibraryBttn: HTMLElement;
  dropAllPictureButton: HTMLElement;

  // moveFile: (srcFile, dstDir) => void;

  constructor(formId: string, attr: Attribute) {
    console.trace("BilderFormField", formId, attr);
    super(formId, attr);
    const settings = attr.settings;
    this.images_div_id = "images_" + settings["index"];

    this.element = createHtmlElement("div", null, "form-value");

    if (settings.privilege === "1") {
      const takePictureButton = (this.takePictureButton = createHtmlElement("i", this.element, "fa fa-camera fa-2x"));
      takePictureButton.style.cssText = "color: rgb(38, 50, 134); margin: 5px 10px 15px 0px";
      takePictureButton.id = "takePictureButton_" + settings.index;
      takePictureButton.addEventListener("click", (ev) => this.takePicture(ev));

      const loadPictureFromPhotolibraryBttn = (this.loadPictureFromPhotolibraryBttn = createHtmlElement("i", this.element, "fa fa-image fa-2x"));
      loadPictureFromPhotolibraryBttn.style.cssText = "color: rgb(38, 50, 134); margin: 0px 0px 14px 9px";
      loadPictureFromPhotolibraryBttn.id = "loadPictureFromPhotolibrary_" + settings.index;
      loadPictureFromPhotolibraryBttn.addEventListener("click", (ev) => this.loadPictureFromPhotolibrary(ev));

      const dropAllPictureButton = (this.dropAllPictureButton = createHtmlElement("i", this.element, "fa fa-trash fa-2x"));
      dropAllPictureButton.style.cssText = "color: rgb(238, 50, 50); float: right; display: none;";
      dropAllPictureButton.id = "dropAllPictureButton_" + settings.index;
      dropAllPictureButton.addEventListener("click", (ev) => this.dropAllPictures(ev));
    }

    this.imagesDiv = createHtmlElement("div", this.element, "images-div");

    this.hiddenElement = createHtmlElement("input", this.element, "form-value");
    this.hiddenElement.type = "hidden";
    this.hiddenElement.id = String(settings.index);
    this.hiddenElement.name = String(settings.name);

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
   * example: {/var/www/data_streuobst/upload/bilder_kob_baum/1000068112.jpg,/var/www/data_streuobst/upload/bilder_kob_baum/1000068320.jpg}
   * @params any set to '' if val is undefined, null, 'null' or NAN
   */
  async setValue(f: Feature, pics: string) {
    // console.error("BilderFormField.setValue kvwmapFilePath=" + pics);
    // console.log("BilderFormField.setValue with value: " + val);
    super.setValue(f, pics);
    // this._oldValue = pics;

    const val = kvm.coalesce(pics, "");
    // let images;
    // let localFile;
    // let remoteFile;

    this.hiddenElement.value = val;

    // remove images from preview div
    this.imagesDiv.innerHTML = "";

    if (val == "" || /^\{\s*\}$/.test(val)) {
      if (this.attr.settings.privilege === "1") {
        this.dropAllPictureButton.style.display = "none";
      }
    } else {
      console.log("Add images to previews div: %s", val);
      const images = kvm.removeBrackes(val).split(",");
      console.log("images: %s", JSON.stringify(images));
      const fragment = new DocumentFragment();
      const messages: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const remoteFile = kvm.removeQuotas(images[i]);
        // const localFile = kvm.removeOriginalName(kvm.serverToLocalPath(remoteFile));
        fragment.appendChild(this._createImage(remoteFile));
        // console.log("images[" + i + "]: %s", remoteFile);
        // try {
        //   const fileEntry = await resolveLocalFileSystemURL(localFile);
        //   if (fileEntry) {
        //     let metaData: Metadata = null;
        //     try {
        //       metaData = await Util.getMetaData(fileEntry);
        //     } catch (ex) {
        //       console.error(ex);
        //     }
        //     if (metaData) {
        //       console.log("Datei " + fileEntry.toURL() + " existiert.", metaData);
        //     } else {
        //       console.log("Datei " + fileEntry.toURL() + " existiert.");
        //     }
        //     fragment.appendChild(await this._createImage(fileEntry.nativeURL));
        //   } else {
        //     fragment.appendChild(await this._createImage(null, remoteFile));
        //   }
        // } catch (ex) {
        //   messages.push(`Konnte Bild "${remoteFile}" nicht laden. ${ex.message}`);
        //   console.info("Datei " + localFile + " existiert nicht!");
        //   try {
        //     fragment.appendChild(await this._createImage(null, remoteFile));
        //   } catch {
        //     messages.push(`Konnte kein leeres Bild für das Bild ${remoteFile} laden`);
        //   }
        //   if (navigator.onLine) {
        //     kvm.getActiveLayer().downloadImage(f, localFile, remoteFile);
        //   }
        // }
      }
      this.imagesDiv.replaceChildren(fragment);
      if (messages?.length) {
        alertOverlay("Fehler beim Laden von Bildern\n" + messages.join("\n"));
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

  hide() {
    if (this.element?.parentElement) {
      this.element.parentElement.style.display = "none";
    }
  }
  show() {
    if (this.element?.parentElement) {
      this.element.parentElement.style.display = "";
    }
  }

  /*
   * src is the file shown in view
   * name is the file stored in database
   * Images not downloaded yet to the device are default no_image.png
   * otherwise src is equal to name
   */
  private _createImage(nativeURL: string, name = ""): HTMLElement {
    console.log("BilderFormField.addImage", nativeURL, name);
    // nativeURL = nativeURL || "/img/no_image.png";
    // name = name || nativeURL;
    // console.log("BilderFormField: Add Image with src: %s and name: %s", nativeURL, name);
    // let webviewUrl;
    // if (nativeURL !== "/img/no_image.png") {
    //   try {
    //     webviewUrl = await getWebviewUrl(nativeURL);
    //     if (!webviewUrl) {
    //       webviewUrl = "/img/no_image.png";
    //     }
    //   } catch (error) {
    //     throw new Error(`Bild ${nativeURL} konnte nicht geladen werden. ${error.message}`);
    //   }
    // } else {
    //   webviewUrl = "/img/no_image.png";
    // }

    // const url = await getFileUrl(src);

    // const src=webviewUrl;
    // const field_id=this.settings.index;
    // const xname=name;

    const imgDiv = createHtmlElement("div", null, "img");
    // imgDiv.style.backgroundImage = "url(" + webviewUrl + ")";
    // imgDiv.dataset.src = webviewUrl;
    imgDiv.dataset.field_id = this.attr.settings.index + "name=" + name;
    kvm.imageLoader.loadImage(this._feature, nativeURL, imgDiv);

    this.dropAllPictureButton.style.display = "";

    imgDiv.addEventListener("click", async (evt) => {
      if (imgDiv.dataset.src == "img/no_image.png") {
        if (navigator.onLine) {
          const confirmDownload = await confirm("Bild herunterladen?", "Bestätigung");
          if (confirmDownload) {
            const remoteFile = name;
            const localFile = kvm.serverToLocalPath(remoteFile);
            kvm.getActiveLayer().downloadImage(this._feature, localFile, remoteFile);
          }
        } else {
          kvm.msg("Kein Internet! Bild kann gerade nicht heruntergeladen werden.", "Bilder Download");
        }
      } else {
        console.log("Versuche das Bild zu öffnen: " + nativeURL);
        cordova.plugins.fileOpener2.open(nativeURL, "image/jpeg", {
          error: async (e) => {
            alert("Fehler beim Laden der Datei '" + nativeURL + "'. Fehler: " + e.status);
            if (await confirm("Bild Löschen?", "Löschen bestätigen", "ja", "nein")) {
              this.dropImage(imgDiv);
            }
          },
          success: async () => {
            console.log("Datei " + imgDiv.dataset.src + " erfolgreich geöffnet.");
            if (await confirm("Bild Löschen?", "Löschen bestätigen", "ja", "nein")) {
              this.dropImage(imgDiv);
            }
          },
        });
      }
    });
    return imgDiv;
  }

  /*
   * src is the file shown in view
   * name is the file stored in database
   * Images not downloaded yet to the device are default no_image.png
   * otherwise src is equal to name
   */
  private async _createImageO(nativeURL: string, name = ""): Promise<HTMLElement> {
    console.log("BilderFormField.addImage", nativeURL, name);
    nativeURL = nativeURL || "/img/no_image.png";
    name = name || nativeURL;
    console.log("BilderFormField: Add Image with src: %s and name: %s", nativeURL, name);
    let webviewUrl;
    if (nativeURL !== "/img/no_image.png") {
      try {
        webviewUrl = await getWebviewUrl(nativeURL);
        if (!webviewUrl) {
          webviewUrl = "/img/no_image.png";
        }
      } catch (error) {
        throw new Error(`Bild ${nativeURL} konnte nicht geladen werden. ${error.message}`);
      }
    } else {
      webviewUrl = "/img/no_image.png";
    }

    // const url = await getFileUrl(src);

    // const src=webviewUrl;
    // const field_id=this.settings.index;
    // const xname=name;

    const imgDiv = createHtmlElement("div", null, "img");
    imgDiv.style.backgroundImage = "url(" + webviewUrl + ")";
    imgDiv.dataset.src = webviewUrl;
    imgDiv.dataset.field_id = this.attr.settings.index + "name=" + name;

    this.dropAllPictureButton.style.display = "";

    imgDiv.addEventListener("click", (evt) => {
      if (webviewUrl == "img/no_image.png") {
        if (navigator.onLine) {
          const confirmDownload = confirm("Bild herunterladen?");
          if (confirmDownload) {
            const remoteFile = name;
            const localFile = kvm.serverToLocalPath(remoteFile);
            kvm.getActiveLayer().downloadImage(this._feature, localFile, remoteFile);
          }
        } else {
          kvm.msg("Kein Internet! Bild kann gerade nicht heruntergeladen werden.", "Bilder Download");
        }
      } else {
        console.log("Versuche das Bild zu öffnen: " + nativeURL);
        cordova.plugins.fileOpener2.open(nativeURL, "image/jpeg", {
          error: async (e) => {
            alert("Fehler beim Laden der Datei '" + nativeURL + "'. Fehler: " + e.status);
            if (await confirm("Bild Löschen?", "Löschen bestätigen", "ja", "nein")) {
              this.dropImage(imgDiv);
            }
          },
          success: async () => {
            console.log("Datei " + webviewUrl + " erfolgreich geöffnet.");
            if (await confirm("Bild Löschen?", "Löschen bestätigen", "ja", "nein")) {
              this.dropImage(imgDiv);
            }
          },
        });
      }
    });
    return imgDiv;
  }

  addImgNameToVal(newImg) {
    console.log("addImgNameToVal", newImg);
    let val = this.getValue();

    val = val == null ? kvm.addBraces(newImg) : kvm.addBraces(kvm.removeBrackes(val) + "," + newImg);
    this._value = val;
    this.hiddenElement.value = val;
    this.fireChanged();
    // this.hiddenElement.trigger("change");
    return val;
  }

  /*
   * Remove the image tag witch have this src and
   * the corresponding path from hidden formfield
   */
  dropImage(imgDiv: HTMLElement) {
    const src = imgDiv.dataset.src;
    console.log("BilderFormField.dropImage img: " + src);

    const curValue = this.hiddenElement.value;
    const arr = kvm.removeBrackes(curValue).split(",");
    const newArr: string[] = [];
    for (let path of arr) {
      if (path.indexOf(src.substring(src.lastIndexOf("/") + 1)) < 0) {
        newArr.push(path);
      }
    }
    const newValue = kvm.addBraces(newArr.join(","));

    this.hiddenElement.value = newValue;

    imgDiv.remove();
    this.fireChanged();
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
    //console.log('BilderformField.dropAllPictures');
    const confirmed = await confirm("Wirklich alle Bilder in diesem Datensatz Löschen?", "Bitte Bestätigen", "ja", "nein");
    if (confirmed) {
      await this.setValue(this._feature, "");
      await this.fireChanged();
    }
  }

  /**
   * capture a picture
   */
  async takePicture(evt: Event) {
    console.log("takePicture", evt);
    navigator.camera.getPicture(
      (fileURL) => {
        console.log("this.takePicture(" + fileURL + ");");

        if (kvm.hasFilePath(fileURL, kvm.getConfigurationOption("localImgPath"))) {
          this.addImgNameToVal(kvm.localToServerPath(fileURL));
          // getWebviewUrl(fileURL).then((webviewUrl) => {
          //   console.info(`takePicture fileURL=${fileURL} webviewUrl=${webviewUrl}`);
          // RTR
          // this._createImage(fileURL).then((value) => this.imagesDiv.appendChild(value));
          this.imagesDiv.appendChild(this._createImage(fileURL));
          // });
        } else {
          console.info(`takePicture moveFile fileURL=${fileURL}`);
          this.moveFile(fileURL, kvm.getConfigurationOption("localImgPath"));
        }
        $("#featureFormular input[name=bilder_updated_at]").val(Util.now("T", "")).show();
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
      },
    );
  }

  /**
   * capture a picture
   */
  loadPictureFromPhotolibrary(evt: Event) {
    // console.log("takePicture", evt);
    console.log("BilderFormField.loadPictureFromPhotolibrary: " + JSON.stringify(evt));
    navigator.camera.getPicture(
      (fileURL) => {
        console.log("this.loadPictureFromPhotolibrary(" + fileURL + ")");
        const ffileURL = "file://" + fileURL;
        fileExists(ffileURL).then((exists) => {
          console.info(`file ${ffileURL} ${exists}`);
          this.moveFile(ffileURL, kvm.getConfigurationOption("localImgPath"));
        });
        // getWebviewUrl(fileURL).then((webviewUrl) => {
        //   console.info(`loadPictureFromPhotolibrary getWebviewUrl=${webviewUrl}`);
        //   this.addImage(webviewUrl);
        // });
        //   console.log("File 1" + ffileURL + "  exist => " + exists);

        //   if (kvm.hasFilePath(ffileURL, kvm.getConfigurationOption("localImgPath"))) {
        //     this.addImgNameToVal(kvm.localToServerPath(ffileURL));
        //     getWebviewUrl(ffileURL).then((webviewUrl) => this.addImage(webviewUrl));
        //   } else {
        //     this.moveFile(ffileURL, kvm.getConfigurationOption("localImgPath"));
        //   }

        //  $("#featureFormular input[name=bilder_updated_at]").val(kvm.now("T", "")).show();
        //});
      },
      (message) => {
        kvm.msg("Keine Aufnahme gemacht! " + message);
      },
      {
        // TODO
        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
        destinationType: Camera.DestinationType.FILE_URI,
      },
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

    console.log("moveFile " + srcFile + " nach " + dstDir);
    // console.log("moveFile(" + srcFile + ", " + dstDir + ")");
    window.resolveLocalFileSystemURL(
      dstDir,
      (dirEntry) => {
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
                // RTR
                // this._createImage(dstFile).then((imgDiv) => this.imagesDiv.appendChild(imgDiv));
                this.imagesDiv.appendChild(this._createImage(dstFile));
                this.addImgNameToVal(kvm.localToServerPath(dstFile));
              },
              () => {
                console.log("copying FAILED");
              },
            );
          },
          (e: FileError) => {
            console.log("could not resolveLocalFileSystemURL: " + srcFile);
            console.log(JSON.stringify(e));
          },
        );
      },
      (e: FileError) => {
        console.log("could not resolveLocalFileSystemURL: " + dstDir);
        console.log(JSON.stringify(e));
      },
    );
  }

  /*
   * Extract the local image path from an local image file string
   * eg. file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/1525249567531.jpg
   * extract between file:///storage/ and /Android/data/de.gdiservice.kvmobile/files/
   */
  getLocalImgPath(imageData) {
    // console.log("getLocalImgPath", imageData);
    console.log("getLocalImgPath for imageData: " + imageData);
    const result = "file:///storage/" + imageData.split("file:///storage/")[1].split("/Android/data/de.gdiservice.kvmobile/files/")[0] + "/Android/data/de.gdiservice.kvmobile/files/";
    console.log("getLocalImgPath returning: " + result);
  }

  createInputElement(): HTMLElement {
    return this.element;
  }
}

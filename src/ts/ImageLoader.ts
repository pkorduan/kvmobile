import { Kvm } from "./app";
import { Feature } from "./Feature";
import * as Util from "./Util";
export class ImageLoader {
  app: Kvm;
  pendingRequest = new Map<String, HTMLElement[]>();
  constructor(app: Kvm) {
    this.app = app;
  }

  async loadImage(f: Feature, remoteFile: string, imageElement: HTMLElement) {
    console.debug("csrfToken", this.app.serverConnection);

    const idx = remoteFile.indexOf("&");
    if (idx > 0) {
      remoteFile = remoteFile.substring(0, idx);
    }
    const localFile = this.app.serverToLocalPath(remoteFile);

    const fileEntry = await Util.resolveLocalFileSystemURL(localFile);
    if (fileEntry) {
      let metaData: Metadata | null = null;
      try {
        metaData = await Util.getMetaData(fileEntry);
        Util.writeLog(`ImageLoader.loadImage found ${remoteFile} ${fileEntry.toURL()} size=${metaData.size}`);
        console.debug(`ImageLoader.loadImage found ${remoteFile} ${fileEntry.toURL()} size=${metaData.size}`);
      } catch (ex) {
        Util.writeLog(`ImageLoader.loadImage found ${remoteFile} ${fileEntry.toURL()}. Error with getting metadata`, ex);
        console.error(`ImageLoader.loadImage found ${remoteFile} ${fileEntry.toURL()}. Error with getting metadata`);
        console.error(ex);
      }
      // if (metaData) {
      //   console.error("ImageLoader Datei " + fileEntry.toURL() + " existiert.", metaData);
      // } else {
      //   console.error("ImageLoader Datei " + fileEntry.toURL() + " existiert.");
      // }
      const imgSrc = fileEntry.toURL();
      // imageElement.src = imgSrc;
      imageElement.style.backgroundImage = "url(" + imgSrc + ")";
      imageElement.dataset.src = imgSrc;
    } else {
      this.loadExternImage(f, localFile, remoteFile, imageElement);
      // await this.checkLoginStatus();

      // console.error(`ImageLoader.loadImage not_found ${remoteFile} Datei`);
      // Util.writeLog(`ImageLoader.loadImage not_found ${remoteFile} Datei`);
      // imageElement.style.backgroundImage = "url(img/no_image.png)";
      // imageElement.dataset.src = "img/no_image.png";
      // const urlParams = {
      //   go: "mobile_download_image",
      //   image: remoteFile,
      //   layer_id: f.layer.get("id"),
      //   feature_id: f.getFeatureId(),
      // };
      // const paramKey = JSON.stringify(urlParams);
      // if (this.pendingRequest.has(paramKey)) {
      //   const elements = this.pendingRequest.get(paramKey);
      //   elements?.push(imageElement);
      //   console.error(`ImageLoader.loadImage pending ${remoteFile} Datei`);
      //   Util.writeLog(`ImageLoader.loadImage pending ${remoteFile} Datei`);
      // } else {
      //   this.pendingRequest.set(paramKey, [imageElement]);
      //   console.error(`ImageLoader.loadImage runDownloading ${remoteFile}`);
      //   Util.writeLog(`ImageLoader.loadImage runDownloading ${remoteFile}`);
      //   try {
      //     const fileEntry = await this.app.serverConnection.runDownloadFile(urlParams, localFile);
      //     const metaData = await Util.getMetaData(fileEntry);
      //     console.error(`ImageLoader.loadImage downloaded ${fileEntry.toURL()} size=${metaData.size}`);
      //     Util.writeLog(`ImageLoader.loadImage downloaded ${fileEntry.toURL()} size=${metaData.size}`);

      //     const imageElements = this.pendingRequest.get(paramKey);
      //     if (imageElements) {
      //       for (const el of imageElements) {
      //         const imgSrc = fileEntry.toURL();
      //         el.style.backgroundImage = "url(" + imgSrc + ")";
      //         el.dataset.src = imgSrc;
      //         console.error(`ImageLoader.loadImage setting src on ImageElement ${remoteFile} ${fileEntry.toURL()} size=${metaData.size}`);
      //       }
      //       this.pendingRequest.delete(paramKey);
      //     }
      //   } catch (ex) {
      //     console.error(ex);
      //   }
      // }
    }
  }

  async loadExternImage(f: Feature, localFile: string, remoteFile: string, imageElement: HTMLElement) {
    await this.checkLoginStatus();

    console.debug(`ImageLoader.loadImage not_found ${remoteFile} Datei`);
    Util.writeLog(`ImageLoader.loadImage not_found ${remoteFile} Datei`);
    imageElement.style.backgroundImage = "url(img/no_image.png)";
    imageElement.dataset.src = "img/no_image.png";
    const urlParams = {
      go: "mobile_download_image",
      image: remoteFile,
      layer_id: f.layer.get("id"),
      feature_id: f.getFeatureId(),
    };
    const paramKey = JSON.stringify(urlParams);
    if (this.pendingRequest.has(paramKey)) {
      const elements = this.pendingRequest.get(paramKey);
      elements?.push(imageElement);
      console.info(`ImageLoader.loadImage pending ${remoteFile} Datei`);
      Util.writeLog(`ImageLoader.loadImage pending ${remoteFile} Datei`);
    } else {
      this.pendingRequest.set(paramKey, [imageElement]);
      console.info(`ImageLoader.loadImage runDownloading ${remoteFile}`);
      Util.writeLog(`ImageLoader.loadImage runDownloading ${remoteFile}`);
      try {
        const fileEntry = await this.app.serverConnection.runDownloadFile(urlParams, localFile);
        const metaData = await Util.getMetaData(fileEntry);
        console.info(`ImageLoader.loadImage downloaded ${fileEntry.toURL()} size=${metaData.size}`);
        Util.writeLog(`ImageLoader.loadImage downloaded ${fileEntry.toURL()} size=${metaData.size}`);

        const imageElements = this.pendingRequest.get(paramKey);
        if (imageElements) {
          for (const el of imageElements) {
            const imgSrc = fileEntry.toURL();
            el.style.backgroundImage = "url(" + imgSrc + ")";
            el.dataset.src = imgSrc;
            console.debug(`ImageLoader.loadImage setting src on ImageElement ${remoteFile} ${fileEntry.toURL()} size=${metaData.size}`);
          }
          this.pendingRequest.delete(paramKey);
        }
      } catch (ex) {
        console.error(ex);
      }
    }
  }
  async checkLoginStatus() {
    console.info("checkLoginStatus", this.app.serverConnection);
    if (!this.app.serverConnection.csrfToken) {
      await this.app.serverConnection.runLogin();
    }
  }
}

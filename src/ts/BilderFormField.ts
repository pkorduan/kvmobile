/// <reference types="cordova-plugin-camera"/>
/// <reference types="cordova-plugin-file-opener2"/>

import { kvm } from "./app";

export class BilderFormField {
    settings: any;
    images_div_id: string;
    selector: string;
    element: JQuery<HTMLElement>;

    moveFile: (srcFile, dstDir) => void;

    constructor(formId, settings) {
        console.error("BilderFormField", formId, settings);
        this.settings = settings;
        this.images_div_id = "images_" + settings["index"];
        this.selector = "#" + formId + " input[id=" + this.get("index") + "]";
        this.element = $('<div class="form-value">').append(
            '\
        <input\
        type="hidden"\
        id="' +
                this.get("index") +
                '"\
        name="' +
                this.get("name") +
                '"\
        value=""' +
                (this.get("privilege") == "0" ? " disabled" : "") +
                "\
        />"
        );
        this.moveFile = this.moveFile_.bind(this);
    }
    get(key) {
        return this.settings[key];
    }

    /* Assign the value of the feature to the form field as it is in the database and
     * create corresponding form and view elements.
     * @params any set to '' if val is undefined, null, 'null' or NAN
     */
    setValue(val) {
        console.error("BilderFormField.setValue", val);
        // console.log("BilderFormField.setValue with value: " + val);
        var val = kvm.coalesce(val, "");
        // let images;
        // let localFile;
        // let remoteFile;

        this.element.val(val);

        // remove images from preview div
        $("#" + this.images_div_id).html("");

        // create new images if exists
        if (val == "") {
            $("#" + this.images_div_id)
                .html("")
                .hide();
            $("#dropAllPictureButton_" + this.get("index")).hide();
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
                        this.addImage(fileEntry.toURL());
                    },
                    () => {
                        kvm.log("Datei " + localFile + " existiert nicht!", 2);
                        this.addImage("img/no_image.png", remoteFile);
                        if (navigator.onLine) {
                            kvm.activeLayer.downloadImage(localFile, remoteFile);
                        }
                    }
                );
            }
        }
    }

    getValue(action = "") {
        //console.log('BilderFormField.getValue');
        var val = this.element.val();

        if (typeof val === "undefined" || val == "") {
            val = null;
        }

        return val;
    }

    /*
     * src is the file shown in view
     * name is the file stored in database
     * Images not downloaded yet to the device are default no_image.png
     * otherwise src is equal to name
     */
    addImage(src, name = "") {
        console.error("addimage", src, name);
        name = name == "" ? src : name;
        console.log("BilderFormField: Add Image with src: %s and name: %s", src, name);
        const imgDiv = $('<div class="img" src="' + src + '" style="background-image: url(' + src + ');" field_id="' + this.get("index") + '"name="' + name + '"></div>');
        /*  ToDo: Ein Kommentarfeld einfügen. Realisieren über Datentyp, der dann aber auch das Datum des Bildes beinhaltet.
    img_div.append($('<br>'));
    img_div.append($('<input type="text"\ name="' + src + '"/>'));
*/
        $("#" + this.images_div_id)
            .append(imgDiv)
            .show();

        $("#dropAllPictureButton_" + this.get("index")).show();

        imgDiv.on("click", function (evt) {
            var target = $(evt.target),
                src = target.attr("src"),
                fieldId = target.attr("field_id");
            if (src == "img/no_image.png") {
                if (navigator.onLine) {
                    navigator.notification.confirm(
                        "Bild herunterladen?",
                        function (buttonIndex) {
                            if (buttonIndex == 1) {
                                // ja
                                var remoteFile = target.attr("name"),
                                    localFile = kvm.activeLayer.attributes[fieldId].formField.serverToLocalPath(remoteFile);

                                kvm.activeLayer.downloadImage(localFile, remoteFile);
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
                kvm.log("Versuche das Bild zu öffnen: " + src, 4);
                cordova.plugins.fileOpener2.open(src, "image/jpeg", {
                    error: function (e) {
                        alert("Fehler beim laden der Datei: " + e.message + " Status: " + e.status);
                    },
                    success: function () {
                        kvm.log("Datei " + src + " erfolgreich geöffnet.", 4);
                        navigator.notification.confirm(
                            "Bild Löschen?",
                            function (buttonIndex) {
                                if (buttonIndex == 1) {
                                    // ja
                                    var field = kvm.activeLayer.attributes[fieldId].formField;
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

    addImgNameToVal(newImg) {
        console.error("addImgNameToVal");
        let val = this.getValue();
        val = val == null ? kvm.addBraces(newImg) : kvm.addBraces(kvm.removeBrackes(val) + "," + newImg);
        this.element.val(val);
        this.element.trigger("change");
        return val;
    }

    /*
     * Remove the image tag witch have this src and
     * the corresponding path from hidden formfield
     */
    dropImage(imgDiv) {
        var imageField = this.element,
            src = imgDiv.attr("src"),
            activeLayer = kvm.activeLayer,
            sql = "";

        kvm.log("BilderFormField.dropImage img: " + src, 4);
        // ToDo implement this function and bind to delte choice of after dialog from image click
        // remove image string from field value
        imageField.val(
            kvm.addBraces(
                $.map(kvm.removeBrackes(imageField.val()).split(","), function (path) {
                    if (path.indexOf(src.substring(src.lastIndexOf("/") + 1)) < 0) {
                        return path;
                    }
                }).join(",")
            )
        );

        imageField.trigger("change");
        imgDiv.remove();
    }

    bindEvents() {
        //console.log('BildFormField.bindEvents');
        $("#featureFormular input[id=" + this.get("index") + "]").on("change", function () {
            // console.log('event on saveFeatureButton');
            if (!$("#saveFeatureButton").hasClass("active-button")) {
                $("#saveFeatureButton").toggleClass("active-button inactive-button");
            }
        });

        $("#takePictureButton_" + this.get("index")).on("click", { context: this }, (ev) => this.takePicture(ev));
        /*
    $('#selectPictureButton_1').bind(
      'click',
      { context: this},
      this.selectPicture,
    );
*/
        $("#dropAllPictureButton_" + this.get("index")).bind("click", { context: this }, this.dropAllPictures);
    }

    dropAllPictures(evt) {
        var context = evt.data.context;
        //console.log('BilderformField.dropAllPictures');
        navigator.notification.confirm(
            "Wirklich alle Bilder in diesem Datensatz Löschen?",
            function (buttonIndex) {
                if (buttonIndex == 1) {
                    // ja
                    context.setValue("");
                    context.element.trigger("change");
                }
                if (buttonIndex == 2) {
                    // nein
                    // Do nothing
                }
            },
            "",
            ["ja", "nein"]
        );
    }

    /**
     * capture a picture
     */
    takePicture(evt) {
        console.error("takePicture", evt);
        kvm.log("BilderFormField.takePicture: " + JSON.stringify(evt), 4);

        navigator.camera.getPicture(
            function (cameraPicture) {
                kvm.log("this.addImage(" + cameraPicture + ");", 4);

                if (kvm.hasFilePath(cameraPicture, kvm.config.localImgPath)) {
                    this.addImage(cameraPicture);
                    this.addImgNameToVal(kvm.localToServerPath(cameraPicture));
                } else {
                    this.moveFile(cameraPicture, kvm.config.localImgPath);
                }
                $("#featureFormular input[name=bilder_updated_at]").val(new Date().toISOString().replace("Z", "")).show();
            }.bind(evt.data.context),
            function (message) {
                kvm.msg("Keine Aufnahme gemacht! " + message);
            },
            {
                // TODO
                quality: <number>$("#cameraOptionsQualitySlider").val(),
                correctOrientation: $("#cameraOptionsCorrectOrientation").is(":checked"),
                allowEdit: $("#cameraOptionsAllowEdit").is(":checked"),
                sourceType: Camera.PictureSourceType.CAMERA,
                destinationType: Camera.DestinationType.FILE_URI,
                saveToPhotoAlbum: $("#cameraOptionsSaveToPhotoAlbum").is(":checked"),
            }
        );
    }

    /*
     * Move the srcFile to dstDir and return dstFile
     * @param String srcFile, Path and name of the file to move
     * @param String dstDir, Path of the destination directory
     * @return String Path and name of the file at destination directory
     */
    moveFile_(srcFile: string, dstDir: string) {
        const dstFile = dstDir + srcFile.substring(srcFile.lastIndexOf("/") + 1);

        kvm.log("moveFile " + srcFile + " nach " + dstDir, 4);
        window.resolveLocalFileSystemURL(
            dstDir,
            (dirEntry: any) => {
                kvm.log("Erzeuge dirEntry", 4);
                console.log("Kopiere nach dstDirEntry: %o", dirEntry);
                window.resolveLocalFileSystemURL(
                    srcFile,
                    (fileEntry: Entry) => {
                        fileEntry.moveTo(
                            dirEntry,
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
        console.error("getLocalImgPath", imageData);
        kvm.log("getLocalImgPath for imageData: " + imageData);
        const result = "file:///storage/" + imageData.split("file:///storage/")[1].split("/Android/data/de.gdiservice.kvmobile/files/")[0] + "/Android/data/de.gdiservice.kvmobile/files/";
        kvm.log("getLocalImgPath returning: " + result);
    }
}

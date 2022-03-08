/// <reference types="cordova-plugin-dialogs" />
/// <reference types="jquery" />
/*
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
import { kvm } from "./app";

export function DataViewField(divId, settings): void {
    this.settings = settings;

    this.get = function (key) {
        return this.settings[key];
    };

    this.selector = "#" + divId + " > #" + this.get("index");

    this.element = $('<div id="' + this.get("index") + '" class="data-view-value">');

    this.setValue = function (val) {
        console.log("DataViewField.setValue %s with value: %s", this.settings.name, val);
        if (val && this.get("type") == "timestamp") {
            let datetime = new Date(val);
            val = datetime.toLocaleDateString() + " " + datetime.toLocaleTimeString();
            this.element.html(kvm.coalesce(val, ""));
        } else if (this.get("form_element_type") == "Dokument") {
            kvm.log("DataViewField.setValue for Document Attribute with value: " + val, 4);
            var val = kvm.coalesce(val, ""),
                images,
                localFile,
                remoteFile,
                i;

            this.element.html("");
            this.element.append('<div id="imagePreviewDiv" style="display: none">');

            // create new images if exists
            if (val == "") {
                $("#imagePreviewDiv").hide();
            } else {
                kvm.log("Add images to previews div: " + val, 4);
                images = kvm.removeBraces(val).split(",");
                kvm.log("images: " + JSON.stringify(images), 4);
                for (i = 0; i < images.length; i++) {
                    remoteFile = images[i];
                    localFile = kvm.removeOriginalName(kvm.serverToLocalPath(remoteFile));
                    kvm.log("images[" + i + "]: " + remoteFile, 4);

                    window.resolveLocalFileSystemURL(
                        localFile,
                        function (fileEntry) {
                            kvm.log("Datei " + fileEntry.toURL() + " existiert.", 4);
                            var src = fileEntry.toURL();
                            var img_div = $('<div class="img" src="' + src + '" style="background-image: url(' + src + ');" field_id="' + this.get("index") + '"name="preview_' + src + '"></div>');
                            this.element.append(img_div);
                            img_div.on("click", function (evt) {
                                var target = $(evt.target),
                                    src = target.attr("src"),
                                    fieldId = target.attr("field_id");

                                cordova.plugins.fileOpener2.open(src, "image/jpeg", {
                                    error: function (e) {
                                        alert("Fehler beim laden der Datei: " + e.message + " Status: " + e.status);
                                    },
                                    success: function () {
                                        kvm.log("Datei " + src + " erfolgreich geöffnet.", 4);
                                    },
                                });
                            });
                        }.bind(this),
                        function () {
                            kvm.log("Datei " + this.localFile + " existiert nicht!", 2);
                            var img_div = $('<div class="img" src="img/no_image.png" style="background-image: url(img/no_image.png);" field_id="' + this.context.get("index") + '"name="img/no_image.png"></div>');
                            kvm.activeLayer.downloadImage(this.localFile, this.remoteFile);
                        }.bind({
                            context: this,
                            localFile: localFile,
                            remoteFile: remoteFile,
                        })
                    );
                }
            }
        } // end of document
        else if (this.get("form_element_type") == "SubFormEmbeddedPK") {
            var options = this.get("options").split(";")[0].split(","),
                stelleId = kvm.activeStelle.get("id"),
                subFormLayerId = options[0],
                subFormFK = options[1],
                subFormPreviewAttribute = options[2],
                subFormTable = $.parseJSON(kvm.store.getItem("layerSettings_" + stelleId + "_" + subFormLayerId)).table_name;
            let sql = "\
        SELECT\
        FROM\
          " + subFormTable + "\
      ";
            console.log("SQL: %s", sql);
        } else {
            this.element.html(kvm.coalesce(val, ""));
        }
        this.element.trigger("change");
        return val;
    };

    // this function bind events pending on form_element_type
    this.bindEvents = function () {
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
                break;
        }
    };

    this.withLabel = function () {
        var label = $('<div class="data-view-label">');

        label.append(this.get("alias") ? this.get("alias") : this.get("name"));

        if (this.get("tooltip")) {
            label.append('&nbsp;<i class="fa fa-exclamation-circle" style="color: #f57802" onclick="kvm.msg(\'' + this.get("tooltip") + "');\"></i>");
        }

        return $('<div class="data-view-field">').append(label).append(this.element);
    };

    return this;
}

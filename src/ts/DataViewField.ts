import { kvm } from "./app";
import { Attribute } from "./Attribute";

export class DataViewField {
	settings: any;
	element: JQuery<HTMLElement>;
	images_div_id: string;
	attribute: Attribute;

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
	constructor(divId, attribute) {
		this.attribute = attribute;
		this.settings = attribute.settings;
		// this.selector = "#" + divId + " > #" + this.get("index");
		this.images_div_id = `images_${this.get("index")}`;
		this.element = $(`<div id="dataViewFieldValue_${this.get("index")}" class="data-view-value">`);
	}

	get(key) {
		return this.attribute.settings[key];
	}

	setValue(val) {
		let images, localFile, remoteFile, i, imgDiv;

		console.log("DataViewField.setValue %s with value: %s", this.attribute.settings.name, val);
		if (val && this.get("type") === "timestamp") {
			let datetime = new Date(val);
			val = datetime.toLocaleDateString() + " " + datetime.toLocaleTimeString();
			this.element.html(kvm.coalesce(val, ""));
		}
		else if (this.get("form_element_type") == "Dokument") {
			//kvm.log("DataViewField.setValue for Document Attribute with value: " + val, 4);
			val = kvm.coalesce(val, "");
			// let images;
			//   localFile,
			//   remoteFile,
			//   i;

			this.element.html("");
			let imgPrevDiv = $('<div id="previews_' + this.get("index") + '">');
			this.element.append(imgPrevDiv);

			// create new images if exists
			if (val == "") {
				imgPrevDiv.hide();
			} else {
				imgPrevDiv.show();
				//console.log("setValue add images to previews div: %s", val);
				images = kvm.removeBrackes(val).split(",");
				for (i = 0; i < images.length; i++) {
					remoteFile = images[i];
					localFile = kvm.removeOriginalName(kvm.serverToLocalPath(remoteFile));
					console.log("Add remoteFile: %s localFile: %s", remoteFile, localFile);
					imgDiv = $(
						'<div id="preview_' +
							this.get("index") +
							"_" +
							i +
							'" class="img preview" src="' +
							localFile +
							'" style="background-image: url(' +
							localFile +
							');" field_id="' +
							this.get("index") +
							'"name="preview_' +
							localFile +
							'"></div>'
					);
					imgDiv.on("click", function (evt) {
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
								kvm.activeLayer.downloadImage(this.localFile, this.remoteFile);
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
		} // end of document
		else if (this.get("form_element_type") == "SubFormFK") {
			this.element.html(`<div onclick="kvm.activateFeature('${this.attribute.getGlobalParentLayerId()}', '${val}')"><i class="fa fa-hand-o-left" aria-hidden="true" style="margin-right: 10px"></i>${val}</div>`);
		}
		else if (this.get("form_element_type") == "SubFormEmbeddedPK") {
			let feature = this.attribute.layer.activeFeature;
			this.attribute.layer.readVorschauAttributes(this.attribute, feature.get(this.attribute.getPKAttribute()), this.element);
		}
		else if (this.get("form_element_type") == "Auswahlfeld") {
			let output = "";
			if (
				this.get("options") &&
				Array.isArray(this.get("options")) &&
				this.get("options").find((option) => {
					return option.value === String(val);
				})
			) {
				output = this.get("options").find((option) => {
					return option.value === String(val);
				}).output;
			} else {
				output = val ? String(val) : "";
			}
			this.element.html(output);
			return output;
		} else if (this.get("form_element_type") == "Checkbox") {
			const output = val ? (val === "t" ? "ja" : "nein") : "";
			this.element.html(output);
		} else {
			this.element.html(kvm.coalesce(val, ""));
		}
		this.element.trigger("change");
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
	}

	/*
	 * src is the file shown in view
	 * name is the file stored in database
	 * Images not downloaded yet to the device are default no_image.png
	 * otherwise src is equal to name
	 */
	addImage(src, name = "") {
		//console.log("DataViewField: Add Image with src: %s and name: %s", src, name);
		name = name == "" ? src : name;
		const imgDiv = $(
			'<div class="img" src="' + src + '" style="background-image: url(' + src + ');" field_id="' + this.get("index") + '"name="' + name + '"></div>'
		);
		$("#" + this.images_div_id)
			.append(imgDiv)
			.show();

		$('div[name$="' + name + '"]').on("click", function (evt) {
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

	withLabel(): JQuery<HTMLElement> {
		const label = $('<div class="data-view-label">');

		label.append(this.get("alias") ? this.get("alias") : this.get("name"));

		if (this.get("tooltip")) {
			label.append('&nbsp;<i class="fa fa-exclamation-circle" style="color: #f57802" onclick="kvm.msg(\'' + this.get("tooltip") + "');\"></i>");
		}

		return $(`<div id="dataViewFieldDiv_${this.get("index")}" class="data-view-field" ${this.attribute.getArrangementStyle()}>`).append(label).append(this.element);
	}
}

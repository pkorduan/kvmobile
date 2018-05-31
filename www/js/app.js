/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
kvm = {
  version: '1.2.2',
  Buffer: require('buffer').Buffer,
  wkx: require('wkx'),
  controls: {},
  controller: {},
  views: {},

  loadHeadFile: function(filename, filetype) {
    if (filetype=="js"){ //if filename is a external JavaScript file
      var fileref=document.createElement('script')
      fileref.setAttribute("type","text/javascript")
      fileref.setAttribute("src", filename)
    }
    else if (filetype=="css"){ //if filename is an external CSS file
      var fileref=document.createElement("link")
      fileref.setAttribute("rel", "stylesheet")
      fileref.setAttribute("type", "text/css")
      fileref.setAttribute("href", filename)
    }
    if (typeof fileref!="undefined")
      document.getElementsByTagName("head")[0].appendChild(fileref)
  },

  init: function() {
    kvm.log('init', 4);
    document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
  },

  onDeviceReady: function() {
    var activeView = 'featurelist'
    kvm.log('onDeviceReady', 4);

    this.store = window.localStorage;
    kvm.log('Lokaler Speicher verfügbar', 3);

    this.db = window.sqlitePlugin.openDatabase({
      name: config.dbname + '.db',
      location: 'default',
      androidDatabaseImplementation: 2
    });
    kvm.log('Lokale Datenbank geöffnet.', 3);
    $('#dbnameText').html(config.dbname + '.db');

    kvm.log('Lade Gerätedaten.', 3);
    this.loadDeviceData();

    kvm.log('Lade Sync Status.', 3);
    SyncStatus.load(this.store);

    kvm.log('Lade Netzwerkstatus', 3);
    NetworkStatus.load();

    kvm.log('initialisiere Karte.', 3);
    this.initMap();

    if (this.store.getItem('activeStelleId')) {
      var activeStelleId = this.store.getItem('activeStelleId'),
          activeStelleSettings = this.store.getItem('stelleSettings_' + activeStelleId),
          stelle = new Stelle(activeStelleSettings);

      kvm.log('Aktive Stelle ' + activeStelleId + ' gefunden.', 3);

      stelle.viewSettings();
      stelle.setActive();

      if (this.store.getItem('activeLayerId')) {
        var activeLayerId = this.store.getItem('activeLayerId'),
            activeLayerSettings = this.store.getItem('layerSettings_' + activeStelleId + '_' + activeLayerId),
            layer = new Layer(stelle, activeLayerSettings);

        kvm.log('Aktiven Layer ' +  activeLayerId + ' gefunden.', 3);

        // ToDo do not createTable instead attach schema database for layer if not exists
        // before create LayerList();
        layer.createTable();
        setTimeout(
          function() {
            kvm.controller.mapper.createLayerList(stelle);
            kvm.log('Setze Layer: ' + layer.get('schema_name') + '.' + layer.get('table_name'), 3);
            layer.setActive();
            layer.readData(); // load from loacl db to feature list
          },
          2000
        );
      }
      else {
        kvm.msg('Laden Sie die Layer vom Server.');
        $('#newFeatureButton, #showDeltasButton').hide();
        activeView = 'settings';
      }
    }
    else {
      kvm.msg('Stellen Sie die Zugangsdaten zum Server ein.');
      var stelle = new Stelle('{}');
      stelle.viewDefaultSettings();
      activeView = 'settings';
      $(document).scrollTop($('#serverSettingHeader').offset().top);
    };

    // ToDo
    //GpsStatus.load();
    //kvm.log('GPS Position geladen');

    kvm.log('Ereignisüberwachung eingerichtet.', 4);
    this.bindEvents();

    kvm.log('Liste der Datensätze angezeigt.', 4);
    this.showItem(activeView);
  },

  initMap: function() {
    kvm.log('Karte initialisieren.', 3);

    var map = L.map('map').setView([54, 12.2], 8);

    L.tileLayer('https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png', {
        attribution: 'Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.'
    }).addTo(map);

    map.addControl(new L.control.betterscale({metric: true}));
    map.addControl(new L.control.locate({
      position: 'topright',
      strings: {
        title: "Zeig mir wo ich bin.",
        flyTo: true,
        metersUnit: "Meter",
        popup: "Sie befinden sich im Umkreis von {distance} {unit}.",
        outsideMapBoundsMsg: "Sie sind außerhalb des darstellbaren Bereiches der Karte."
      }
    }));
    this.map = map;
  },

  bindEvents: function() {
    document.addEventListener(
      "offline",
      this.setConnectionStatus,
      false
    );

    document.addEventListener(
      "online",
      this.setConnectionStatus,
      false
    );

    $('#requestStellenButton').on(
      'click',
      function() {
        if ($('#kvwmapServerUrlField').val() != '' && $('#kvwmapServerUsernameField').val() != '' && $('#kvwmapServerPasswortField').val() != '') {
          $('#sperr_div').show();
          var stelle = new Stelle({
            url : $('#kvwmapServerUrlField').val(),
            username : $('#kvwmapServerUsernameField').val(),
            passwort : $('#kvwmapServerPasswortField').val()
          });
          kvm.log('Stellenobjekt erzeugt um Stellen abfragen zu können: ' + JSON.stringify(stelle), 4);
          stelle.requestStellen();
        }
        else {
          kvm.msg('Sie müssen erst die Server URL, Nutzername und Password angeben!');
        }
      }
    );

    $('#kvwmapServerStelleSelectField').on(
      'change',
      function() {
        $('#saveServerSettingsButton').show();
      }
    );

    $('#requestLayersButton').on(
      'click',
      function () {
        $('#sperr_div').show();
        var layer = new Layer(kvm.activeStelle);
        layer.requestLayers();
      }
    );

    $('#saveServerSettingsButton').on(
      'click',
      function() {
        var stelle = new Stelle({
          "id": $('#kvwmapServerIdField').val(),
          "name": $('#kvwmapServerNameField').val(),
          "url": $('#kvwmapServerUrlField').val(),
          "username": $('#kvwmapServerUsernameField').val(),
          "passwort": $('#kvwmapServerPasswortField').val(),
          "Stelle_ID": $('#kvwmapServerStelleSelectField').val(),
          "stellen": $('#kvwmapServerStellenField').val()
        });
        stelle.saveToStore();
        stelle.setActive();
        if ($('#saveServerSettingsButton').hasClass('settings-button-active')) {
          $('#saveServerSettingsButton').toggleClass('settings-button settings-button-active');
        }
        if (navigator.onLine) {
          $('#requestLayersButton').show();
        }
        else {
          kvm.msg('Stellen Sie eine Netzverbindung her zum Laden der Layer und speichern Sie noch mal die Servereinstellungen.');
        }
      }
    );

    $('#showDeltasButton').on(
      'click',
      { context: this},
      function(evt) {
        kvm.log('Delta anzeigen.', 3);
        var this_ = evt.data.context,
            sql = "\
              SELECT\
                * \
              FROM\
                " + this_.activeLayer.get('schema_name') + '.' + this_.activeLayer.get('table_name') + "_deltas\
            ";

        $('#showDeltasButton').hide();
        $('#showDeltasWaiting').show();
        this_.db.executeSql(
          sql,
          [],
          function(rs) {
            var numRows = rs.rows.length,
                item,
                i;

            if (numRows > 0) {
              $('#showDeltasDiv').html('<b>Deltas</b>');
              for (i = 0; i < numRows; i++) {
                item = rs.rows.item(i);
                $('#showDeltasDiv').append('<br>' + item.version + ': ' + (item.type == 'sql' ? item.delta : item.change + ' ' + item.delta));
              }
              $('#showDeltasDiv').show();
              $('#hideDeltasButton').show();
            }
            else {
              kvm.msg('Keine Änderungen vorhanden');
              $('#showDeltasButton').show();
            }
            $('#showDeltasWaiting').hide();
          },
          function(error) {
            kvm.log('Fehler in bei Abfrage der Deltas: ' + JSON.stringify(error), 1);
            alert('Fehler beim Zugriff auf die Datenbank');
          }
        );
      }
    );

    $('#hideDeltasButton').on(
      'click',
      function() {
        $('#hideDeltasButton').hide();
        $('#showDeltasDiv').hide();
        $('#showDeltasButton').show();
      }
    );

    $('#showLoggingsButton').on(
      'click',
      function() {
        kvm.showItem('loggings');
      }
    )

    $('#formOptionButton').on(
      'click',
      function() {
        navigator.notification.confirm(
          'Datensatz Löschen?',
          function(buttonIndex) {
            if (buttonIndex == 1) { // ja
              kvm.log('Datensatz löschen.', 3);
              kvm.activeLayer.createDeltas('DELETE', []);
              kvm.activeLayer.createImgDeltas('DELETE',
                $.map(
                  kvm.activeLayer.getDokumentAttributeNames(),
                  function(name) {
                    return {
                      "key" : name,
                      "value" : ''
                    }
                  }
                )
              );
            }

            if (buttonIndex == 2) { // nein
              // Do nothing
            }
          },
          '',
          ['ja', 'nein']
        );
      }
    );

    $('#backArrow').on(
      'click',
      function(evt) {
        if ($('#saveFeatureButton').hasClass('active-button')) {
          navigator.notification.confirm(
            'Änderungen verwerfen?',
            function(buttonIndex) {
              if (buttonIndex == 1) { // ja
                kvm.showItem('featurelist');
                $('#saveFeatureButton').toggleClass('active-button inactive-button');
                $('.popup-aendern-link').show();
                kvm.controller.mapper.clearWatch();
              }
              if (buttonIndex == 2) { // nein
                // Do nothing
              }
            },
            'Formular',
            ['ja', 'nein']
          );
        }
        else {
          kvm.showItem('featurelist');
        }
      }
    );

    $('#anzeigeFilterSelect').on(
      'change',
      function(evt) {
        kvm.activeLayer.readData();
      }
    );

    $('#deleteFeatureButton').on(
      'click',
      function(evt) {
        kvm.log('Klick auf deleteFeatureButton.', 4);
        if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) == 2) {
          navigator.notification.confirm(
            'Datensatz wirklich Löschen?',
            function(buttonIndex) {
              if (buttonIndex == 1) { // ja
                kvm.log('Lösche Feature uuid: ' + kvm.activeLayer.activeFeature.get('uuid'), 3);
                kvm.controller.mapper.clearWatch();
                kvm.activeLayer.createDeltas('DELETE', []);
              }

              if (buttonIndex == 2) { // nein
                // do nothing
              }

            },
            'Datenbank',
            ['ja', 'nein']
          );
        }
        else {
          navigator.notification.confirm(
            'Sie haben nicht das Recht zum Löschen von Datensätzen in diesem Layer!',
            function(buttonIndex) {
            },
            'Datenbank',
            ['habe Verstanden']
          );
        }
      }
    );

    $('#saveFeatureButton').on(
      'click',
      function(evt) {
        var saveButton = $(evt.target),
            changes = {},
            delta = '',
            errMsg = '';

        if ((saveButton).hasClass('active-button')) {
          if ($('#featureFormular input[id=0]').val()) {
            var notNullErrMsg = kvm.activeLayer.notNullValid();
            if (notNullErrMsg == '') {
              navigator.notification.confirm(
                'Datensatz Speichern?',
                function(buttonIndex) {
                  var action = (typeof kvm.activeLayer.features['id_' + kvm.activeLayer.activeFeature.get('uuid')] == 'undefined' ? 'INSERT' : 'UPDATE');
                  if (buttonIndex == 1) { // ja
                    changes = kvm.activeLayer.collectChanges(action);
                    kvm.log('Änderungen: ' + JSON.stringify(changes), 3);

                    if (changes.length > 1) {
                      // more than created_at or updated_at_client
                      kvm.activeLayer.createDeltas(action, changes);
                      imgChanges = changes.filter(
                        function(change) {
                          return ($.inArray(change.key, kvm.activeLayer.getDokumentAttributeNames()) > -1);
                        }
                      );
                      if (imgChanges.length > 0) kvm.activeLayer.createImgDeltas(action, imgChanges);
                    }
                    else {
                      kvm.log('Keine Änderungen.', 2);
                      kvm.msg('Keine Änderungen!');
                    }

                    $('.popup-aendern-link').show();
                    saveButton.toggleClass('active-button inactive-button');
                    kvm.controller.mapper.clearWatch();
                  }

                  if (buttonIndex == 2) { // nein
                    // Do nothing
                  }

                },
                'Datenbank',
                ['ja', 'nein']
              );
            }
            else {
              errMsg = notNullErrMsg;
            }
          }
          else {
            errMsg = 'Sie haben noch keine Koordinaten erfasst!';
          }
        }
        else {
          errMsg = 'Keine Änderungen!';
        }

        if (errMsg != '') {
          kvm.msg(errMsg, 'Formular');
        }
      }
    );

    $('#kvwmapServerDataForm > input').on(
      'keyup',
      function() {
        if ($('#saveServerSettingsButton').hasClass('settings-button')) {
          $('#saveServerSettingsButton').toggleClass('settings-button settings-button-active');
        }
      }
    );

    $("#showHaltestelle").mouseover(function() {
      $("#showHaltestelle_button").hide();
      $("#showHaltestelle_button_white").show();
    });

    $("#showHaltestelle").mouseleave(function() {
      $("#showHaltestelle_button").show();
      $("#showHaltestelle_button_white").hide();
    });

    $("#showSearch").click(function() {
      if ($("#searchHaltestelle").is(':visible')) {
        $("#searchHaltestelle").hide();
      }
      else {
        $("#searchHaltestelle").show();
      }
    });

    $('#newFeatureButton').on(
      'click',
      {
        "context": this
      },
      function(evt) {
        var this_ = evt.data.context;

        this_.activeLayer.loadFeatureToForm(
          new Feature({
            uuid : this_.uuidv4()
          })
        );

        this_.showItem('formular');
        $('#formOptionButton').hide();
      }
    );

    /* Clientside Filter according to http://stackoverflow.com/questions/12433835/client-side-searching-of-a-table-with-jquery */
    /*** Search Haltestelle ***/
    $("#searchHaltestelle").on(
      "keyup paste",
      function() {
        var needle = $(this).val().toLowerCase(),
            haystack = $(".feature-item");

        haystack.each(
          function(index) {
            $(this).html().toLowerCase().indexOf(needle) > -1 ? $(this).show() : $(this).hide();
          }
        );
      }
    );

    $("#geoLocationButton").on(
      'click',
      kvm.getGeoLocation
    );

    $("#startSyncButton").on(
      'click',
      {
        "context": this
      },
      function(evt) {
        kvm.log('Syncronisation aufgerufen.', 3);
        var _this = evt.data.context,
            syncVersion = _this.store.getItem('syncVersion');

        if (navigator.onLine) {
          kvm.log('Gerät ist onLine.', 3);
          if (_this.serverSettingsExists()) {
            kvm.log('Alle Verbindungseinstellungen sind gesetzt.', 3);
            if (syncVersion) {
              kvm.log('Es existiert eine Version der letzten Syncronisation.', 3);
              _this.syncronize(evt.data.context);
            }
            else {
              kvm.log('Keine letzte Version gefunden. Starte Download aller Daten.', 2);
              _this.downloadData(evt.data.context);
            }
          }
          else {
            kvm.log('Es fehlen Einstellungen', 2);
            alert('Es fehlen Einstellungen!', 1);
          }
        }
        else {
          kvm.log('Keine Netzverbindung', 2);
          alert('Keine Netzverbindung!', 1);
        }
      }
    );
  },

  bindFeatureItemClickEvents: function() {
    kvm.log('bindFeatureItemClickEvents', 4);
    $(".feature-item").on(
      'click',
      function(evt) {
        kvm.log('Öffne Formular mit Objektdaten.', 4);

        var id = evt.target.getAttribute('id'),
            feature = kvm.activeLayer.features['id_' + id];

        kvm.activeLayer.loadFeatureToForm(feature);
        kvm.showItem('formular');
      }
    );
  },

  bindLayerEvents: function() {
    $('input[name=activeLayerId]').on(
      'change',
      function(evt) {
        var id = evt.target.value,
            layerSettings = kvm.store.getItem('layerSettings_' + id);
            layer = new Layer(kvm.activeStelle, layerSettings);

        layer.readData();
        layer.setActive();
//        kvm.showItem('featurelist');
      }
    );

    $('.sync-layer-button').on(
      'click',
      function(evt) {
        var id = evt.target.value,
            layer = kvm.activeLayer;

        $('#syncLayerIcon_' + layer.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
        $('#sperr_div').show();

        if (layer.isEmpty()) {
          layer.requestData();
        }
        else {
          layer.syncData();
        }
      }
    );

    $('.sync-images-button').on(
      'click',
      function(evt) {
        var id = evt.target.value,
            layer = kvm.activeLayer;

        navigator.notification.confirm(
          'Bilder mit Server Syncronisieren?',
          function(buttonIndex) {
            if (buttonIndex == 1) { // nein
              // Do nothing
            }

            if (buttonIndex == 2) { // ja
              $('#syncImageIcon_' + layer.getGlobalId()).toggleClass('fa-upload fa-spinner fa-spin');
              $('#sperr_div').show();

              layer.syncImages();
            }
          },
          '',
          ['nein', 'ja']
        );
      }
    );

    $('.clear-layer-button').on(
      'click',
      function(evt) {
        var id = evt.target.value,
            layer = kvm.activeLayer;

        if (layer.isEmpty()) {
          navigator.notification.confirm(
            'Layer ist schon geleert!',
            function (buttonIndex) {
            },
            'Datenbank',
            ['OK']
          );
        }
        else {
          navigator.notification.confirm(
            'Alle lokale Daten und nicht hochgeladene Änderungen wirklich Löschen?',
            function(buttonIndex) {
              if (buttonIndex == 1) { // nein
                // Do nothing
              }

              if (buttonIndex == 2) { // ja
                $('#clearLayerIcon_' + layer.getGlobalId()).toggleClass('fa-ban fa-spinner fa-spin');
                layer.clearData();
              }
            },
            '',
            ['nein', 'ja']
          );
        }
      }
    );

  },

  loadDeviceData: function() {
    kvm.log('loadDeviceData', 4);
    $('#deviceDataText').html(
      'kvmobile Version: ' + kvm.version + '<br>' +
      'Cordova Version: ' + device.cordova + '<br>' +
      'Modell: ' + device.model + '<br>' +
      'Platform: ' + device.platform + '<br>' +
      'Uuid: ' + device.uuid + '<br>' +
      'Android Version: ' + device.version + '<br>' +
      'Hersteller: ' + device.manufacturer + '<br>' +
      'Seriennummer: ' + device.serial
    );
  },

  /*
  * create the list of features of active layer in list view
  */
  createFeatureList: function() {
    kvm.log('Erzeuge die Liste der Datensätze neu.', 3);
    $('#featurelistHeading').html(this.activeLayer.get('alias') ? this.activeLayer.get('alias') : this.activeLayer.get('title'));
    $('#featurelistBody').html('');

    $.each(
      this.activeLayer.features,
      function (key, feature) {
        //console.log('append feature: %o', feature);
        var needle = $('#searchHaltestelle').val().toLowerCase(),
            element = $(feature.listElement()),
            haystack = element.html().toLowerCase();

        $('#featurelistBody').append(
          haystack.indexOf(needle) > -1 ? element.show() : element.hide()
        );
      }
    );
    kvm.bindFeatureItemClickEvents();
    if (Object.keys(this.activeLayer.features).length > 0) {
      kvm.showItem('featurelist');
      $('#numDatasetsText').html(Object.keys(this.activeLayer.features).length).show();
    }
  },

  showItem: function(item) {
    kvm.log('showItem: ' + item, 4);

    switch (item) {
      case 'map':
        kvm.showDefaultMenu();
        $("#featurelist, #settings, #formular, #loggings").hide();
        $("#map").show();
        if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) > 0) $('#newFeatureButton').show();
        kvm.map.invalidateSize();
        break;
      case 'mapFormular':
        $('.menubutton').hide()
        $("#backArrow, #saveFeatureButton, #deleteFeatureButton").hide();
        $("#featurelist, #settings, #formular, #loggings").hide();
        $("#map, #backToFormButton").show();
        kvm.map.invalidateSize();
        break;
      case "featurelist":
        kvm.showDefaultMenu();
        $("#map, #settings, #formular, #loggings").hide();
        $("#featurelist").show();
        if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) > 0) $('#newFeatureButton').show();
        break;
      case "loggings":
        kvm.showDefaultMenu();
        $("#map, #featurelist, #settings, #formular").hide();
        if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) > 0) $('#newFeatureButton').show();
        $("#loggings").show();
        break;
      case "settings":
        kvm.showDefaultMenu();
        $("#map, #featurelist, #formular, #loggings").hide();
        $("#settings").show();
        if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) > 0) $('#newFeatureButton').show();
        break;
      case "formular":
        kvm.showFormMenu();
        $("#map, #featurelist, #settings, #loggings, #newFeatureButton, #backToFormButton").hide();
        $("#formular").show();
        break;
      default:
        kvm.showDefaultMenu();
        $("#map, #featurelist, #settings, #loggings, #formular").hide();
        $("#settings").show();
        if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) > 0) $('#newFeatureButton').show();
    }
  },

  showDefaultMenu: function() {
    $("#backArrow, #saveFeatureButton, #deleteFeatureButton, #backToFormButton").hide();
    $("#showMap, #showLine, #showHaltestelle, #showSettings").show();
  },

  showFormMenu: function() {
    $("#showMap, #showLine, #showHaltestelle, #showSettings").hide();
    $("#backArrow, #saveFeatureButton").show();
    if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) == 2) $('#deleteFeatureButton').show();
  },

  getGeoLocation: function() {
    navigator.geolocation.getCurrentPosition(
      kvm.getGeoLocationOnSuccess,
      kvm.getGeoLocationOnError
    );
  },

  getGeoLocationOnSuccess: function(geoLocation) {
    $('#geoLocation').val(geoLocation.coords.latitude + ' ' + geoLocation.coords.longitude);
  },

  getGeoLocationOnError: function(error) {
    alert('Fehler: ' + error.code + ' ' + error.message);
  },

  syncronize: function(context) {
    kvm.log('function syncronize');
    var url = context.getSyncUrl();
  },

  downloadData: function(context) {
    kvm.log('download data');
    var fileTransfer = new FileTransfer(),
        filename = 'download_data.json',
        url = context.getSyncUrl();

    kvm.log('download data from url: ' + url);
    kvm.log('store the file in: ' + cordova.file.dataDirectory + filename);
    fileTransfer.download(
      url,
      cordova.file.dataDirectory + filename,
      function (fileEntry) {
        kvm.log("download complete: " + fileEntry.toURL());
        fileEntry.file(
          function (file) {
            var reader = new FileReader();

            reader.onloadend = function() {
              kvm.log('downloadData onloadend');
              var items = [];
              kvm.log('downloadData result: ' + this.result)
              items = $.parseJSON(this.result);
              if (items.length > 0) {
                kvm.log('Mindestens 1 Datensatz empfangen.');
                kvm.writeData(items);
              }
              else {
                alert('Abfrage liefert keine Daten vom Server. Entweder sind noch keine auf dem Server vorhanden oder die URL der Anfrage ist nicht korrekt. Prüfen Sie die Parameter unter Einstellungen.');
              }
            };

            reader.readAsText(file);
          },
          function(error) {
            alert('Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für die Synchronisation verwendet werden.');
            kvm.log('Fehler beim lesen der Datei: ' + error.code);
          }
        );
      },
      kvm.downloadError,
      true
    );
  },

  uuidv4: function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  log: function(msg, level = 3) {
    if (level <= config.logLevel) {
      $('#logText').append('<br>' + msg);
      if (config.debug) {
        console.log('Log msg: ' + msg);
      }
    }
  },

  msg: function(msg, title = '') {
    navigator.notification.confirm(
      msg,
      function(buttonIndex) {
      },
      title,
      ['ok']
    );
  },

  coalesce: function() {
    var i, undefined, arg;

    for( i=0; i < arguments.length; i++ ) {
      arg = arguments[i];
      if (
        arg !== 'null' &&
        arg !== null &&
        arg !== undefined && (
          typeof arg !== 'number' ||
          arg.toString() !== 'NaN'
        )
      ) {
        return arg;
      }
    }
    return null;
  },

  isValidJsonString: function(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

};

kvm.loadHeadFile('js/controller/mapper.js', 'js');

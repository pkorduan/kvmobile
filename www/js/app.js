kvm = {
  version: '1.5.0',
  Buffer: require('buffer').Buffer,
  wkx: require('wkx'),
  controls: {},
  controller: {},
  views: {},
  layerDataLoaded: false,
  featureListLoaded: false,

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
    this.setConnectionStatus();

    kvm.log('Lade GPS-Status', 3);
    this.setGpsStatus();

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
            kvm.layerDataLoaded = false;
            kvm.featureListLoaded = false;
            //layer.loadFeaturesToMap();
            layer.readData($('#limit').val(), $('#offset').val()); // load from loacl db to feature list
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

    var orka_offline = L.tileLayer(config.localTilePath + 'tiles/{z}/{x}/{y}.png', {
          attribution: 'Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.'
        }),
        orka_online = L.tileLayer('https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png', {
          attribution: 'Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.'
        }),
        map = L.map(
          'map', {
            editable: true,
            center: config.startPosition,
            zoom: config.startZoom,
            minZoom: config.minZoom,
            maxZoom: config.maxZoom,
            layers: [
              orka_offline,
              orka_online
            ]
          }
        ),
        baseMaps = {
          'Hintergrundkarte offline': orka_offline,
          'Hintergrundkarte online': orka_online
        };

//    L.PM.initialize({ optIn: true });
    kvm.myRenderer = L.canvas({ padding: 0.5 });
    map.addControl(new L.control.betterscale({metric: true}));
    map.addControl(new L.control.locate({
      position: 'topright',
      keepCurrentZoomLevel: true,
      flyTo: true,
      strings: {
        title: "Zeig mir wo ich bin.",
        metersUnit: "Meter",
        popup: "Sie befinden sich im Umkreis von {distance} {unit}.",
        outsideMapBoundsMsg: "Sie sind außerhalb des darstellbaren Bereiches der Karte."
      }
    }));
    L.control.layers(baseMaps).addTo(map);
/*
    map.pm.addControls({
      position: 'topright',
      drawCircle: false,
      drawCircleMarker: false,
      drawRectangle: false,
      drawCircle: false,
      removalMode: false
    });
    */
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

    document.addEventListener(
      "dataLoaded",
      function() {
        if (
          kvm.featureListLoaded &&
          kvm.layerDataLoaded
        ) {
          $('#sperr_div').hide();
        }
      },
      false
    );

    $('#showFormEdit').on(
      'click',
      function() {
        kvm.showItem('formular');
      }
    );

    $('#showMapEdit').on(
      'click',
      function() {
        kvm.showItem('mapEdit');
      }
    );

    $('#showSettings').on(
      'click',
      function() {
        kvm.showItem('settings');
      }
    );

    $('#requestStellenButton').on(
      'click',
      function() {
        if ($('#kvwmapServerUrlField').val() != '' && $('#kvwmapServerLoginNameField').val() != '' && $('#kvwmapServerPasswortField').val() != '') {
          $('#sperr_div').show();
          var stelle = new Stelle({
            url : $('#kvwmapServerUrlField').val(),
            login_name : $('#kvwmapServerLoginNameField').val(),
            passwort : $('#kvwmapServerPasswortField').val()
          });
          console.log('Stellenobjekt erzeugt um Stellen abfragen zu können: ' + JSON.stringify(stelle));
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
        kvm.activeStelle.requestLayers();
      }
    );

    $('#saveServerSettingsButton').on(
      'click',
      function() {
        var stelle = new Stelle({
          "id": $('#kvwmapServerIdField').val(),
          "name": $('#kvwmapServerNameField').val(),
          "url": $('#kvwmapServerUrlField').val(),
          "login_name": $('#kvwmapServerLoginNameField').val(),
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
                " + this_.activeLayer.get('schema_name') + '_' + this_.activeLayer.get('table_name') + "_deltas\
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

    $('#clearLoggingsButton').on(
      'click',
      function() {
        $('#logText').html('Log geleert: ' + new Date().toUTCString());
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

    /* wird nicht mehr benutzt
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
    */

    /*
    * Bricht Änderungen im Formular ab,
    * - läd das Feature neu in das Formular im Anzeigemodus
    * - Löscht die editable Geometrie in der Karte
    * - setzt saveFeatureButton wieder auf inactiv
    */
    $('#cancelFeatureButton').on(
      'click',
      { context: this},
      function(evt) {
        console.log('cancelFeatureButton geklickt.');
        var this_ = evt.data.context;

        navigator.notification.confirm(
          'Änderungen verwerfen?',
          function(buttonIndex) {
            console.log('Änderungen verwerfen.');
            var activeFeature = this_.activeLayer.activeFeature,
                featureId = activeFeature.id;

            if (buttonIndex == 1) { // ja
              console.log('Feature ist neu? %s', activeFeature.options.new);
              if (activeFeature.options.new) {
                console.log('Änderungen am neuen Feature verwerfen.');
                this_.activeLayer.cancelEditGeometry();
                if (this_.controller.mapper.isMapVisible()) {
                  this_.showItem('map');
                }
                else {
                  this_.showItem('featurelist');
                }
              }
              else {
                console.log('Änderungen am vorhandenen Feature verwerfen.');
                this_.activeLayer.cancelEditGeometry(featureId); // Editierung der Geometrie abbrechen
                this_.activeLayer.loadFeatureToForm(activeFeature, { editable: false}); // Formular mit ursprünglichen Daten laden

                if (this_.controller.mapper.isMapVisible()) {
                  // ToDo editableLayer existier im Moment nur, wenn man den Änderungsmodus im Popup in der Karte ausgelößt hat.
                  // auch noch für neue Features einbauen.
                  this_.showItem('map');
                }
                else {
                  this_.showItem('dataView');
                }
              }

              this_.controller.mapper.clearWatch(); // GPS-Tracking ausschalten
            }
            if (buttonIndex == 2) { // nein
              // Do nothing
            }
          },
          'Formular',
          ['ja', 'nein']
        );
      }
    );

    $('#statusFilterSelect').on(
      'change',
      function(evt) {
        kvm.activeLayer.readData($('#limit').val(), $('#offset').val());
      }
    );

    $('#toggleFilterDivButton').on(
      'click',
      function() {
        $('#filterDiv').toggle();
        $('#toggleFilterDivButton').val(($('#toggleFilterDivButton').val() == 'mehr' ? 'weniger' : 'mehr'));
      }
    )

    $('#runFilterButton').on(
      'click',
      function() {
        kvm.activeLayer.readData($('#limit').val(), $('#offset').val());
      }
    );

    $('#anzeigeSortSelect').on(
      'change',
      function(evt) {
        kvm.activeLayer.readData($('#limit').val(), $('#offset').val());
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

        if ($('#featureFormular input[name=' + kvm.activeLayer.id_attribute + ']').val()) {
          var notNullErrMsg = kvm.activeLayer.notNullValid();
          if (notNullErrMsg == '') {
            navigator.notification.confirm(
              'Datensatz Speichern?',
              function(buttonIndex) {
                var action = (kvm.activeLayer.activeFeature.options.new ? 'INSERT' : 'UPDATE');
                kvm.log('Action: ' + action);
                if (buttonIndex == 1) { // ja
                  kvm.log('Speichern');
                  changes = kvm.activeLayer.collectChanges(action);
                  console.log('Änderungen: %o', changes);
                  console.log('Anzahl Änderungen %s', changes.length);

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

    $('#showFeatureList').click(function() {
      kvm.showItem('featurelist');
    });

    $("#showFeatureList").mouseover(function() {
      $("#showFeatureList_button").hide();
      $("#showFeatureList_button_white").show();
    });

    $("#showFeatureList").mouseleave(function() {
      $("#showFeatureList_button").show();
      $("#showFeatureList_button_white").hide();
    });

    $('#newFeatureButton').on(
      'click',
      this.controller.mapper.newFeature
    );

    /*
    * Läd das Formular im Editiermodus
    */
    $('#editFeatureButton').on(
      'click',
      { "context": this },
      function(evt) {
        var this_ = evt.data.context,
            featureId = this_.activeLayer.activeFeature.id,
            feature = this_.activeLayer.features[featureId];

//        this_.activeLayer.loadFeatureToForm(feature, { editable: true });
        kvm.activeLayer.editGeometry(featureId);
      }
    );

    /* Clientside Filter according to http://stackoverflow.com/questions/12433835/client-side-searching-of-a-table-with-jquery */
    /*** Search Haltestelle ***/
    $("#searchHaltestelle").on(
      "keyup paste change search",
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

    // Update the current slider value (each time you drag the slider handle)
    $('#cameraOptionsQualitySlider').on(
      'input',
      function() {
        $('#cameraOptionsQuality').html(this.value);
      }
    );

  },

  bindFeatureItemClickEvents: function() {
    kvm.log('bindFeatureItemClickEvents', 4);
    $(".feature-item").on(
      'click',
      kvm.featureItemClickEventFunction
    );
  },

  featureItemClickEventFunction: function(evt) {
    kvm.log('Öffne DataView für Feature ' + kvm.activeLayer.features[evt.target.getAttribute('id')], 4);

    kvm.activeLayer.selectFeature(kvm.activeLayer.features[evt.target.getAttribute('id')]);

    kvm.activeLayer.loadFeatureToView(kvm.activeLayer.activeFeature, { editable: false });

    kvm.showItem('dataView');
  },

  /*
  * Erzeugt die Events für die Auswahl, Syncronisierung und das Zurücksetzen von Layern
  */
  bindLayerEvents: function(layerGlobalId = 0) {
    /*
    * Schaltet einen anderen Layer und deren Sync-Funktionen aktiv
    * Die Einstellungen des Layers werden aus dem Store geladen
    * Die Featureliste und Kartenelemente werden falls vorhanden aus der Datenbank geladen.
    */
    $('input[name=activeLayerId]' + (layerGlobalId > 0 ? "[value='" + layerGlobalId + "']" : '')).on(
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

    $('.sync-layer-button' + (layerGlobalId > 0 ? "[id='syncLayerButton_" + layerGlobalId + "']" : '')).on(
      'click',
      function(evt) {
        var layer = kvm.activeLayer;

        if ($('.sync-layer-button').hasClass('inactive-button')) {
          kvm.msg('Keine Internetverbindung! Kann Layer jetzt nicht synchronisieren.');
        }
        else {
          $('#syncLayerIcon_' + layer.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
          $('#sperr_div').show();

          if (layer.isEmpty()) {
            navigator.notification.confirm(
              'Daten vom Server holen und lokal speichern?',
              function(buttonIndex) {
                if (buttonIndex == 2) { // ja
                  layer.requestData();
                }
                else {
                  $('#sperr_div').hide();
                }
              },
              'Daten mit Server synchronisieren',
              ['nein', 'ja']
            );
          }
          else {
            navigator.notification.confirm(
              'Jetzt lokale Änderungen zum Server schicken und Änderungen vom Server holen und lokal einspielen?',
              function(buttonIndex) {
                if (buttonIndex == 2) { // ja
                  layer.syncData();
                }
                else {
                  $('#sperr_div').hide();
                }
              },
              '',
              ['nein', 'ja']
            );
          }
        }
      }
    );

    $('.sync-images-button' + (layerGlobalId > 0 ? "[id='syncImagesButton_" + layerGlobalId + "']" : '')).on(
      'click',
      function(evt) {
        var layer = kvm.activeLayer;

        if ($('.sync-images-button').hasClass('inactive-button')) {
          kvm.msg('Keine Internetverbindung! Kann Bilder jetzt nicht synchronisieren.');
        }
        else {
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
      }
    );

    $('.clear-layer-button' + (layerGlobalId > 0 ? "[id='clearLayerButton_" + layerGlobalId + "']" : '')).on(
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

    $('.reload-layer-button' + (layerGlobalId > 0 ? "[id='reloadLayerButton_" + layerGlobalId + "']" : '')).on(
      'click',
      function(evt) {
        var id = evt.target.value,
            layer = kvm.activeLayer;

        if (!layer.isEmpty()) {
          navigator.notification.confirm(
            'Layer ist noch nicht geleert. Die Daten des Layers auf dem Endgerät müssen erst gelöscht werden.',
            function (buttonIndex) {
            },
            'Datenbank',
            ['OK']
          );
        }
        else {
          navigator.notification.confirm(
            'Die Einstellungen des Layers neu laden und die Tabelle neu anlegen.',
            function(buttonIndex) {
              if (buttonIndex == 1) { // nein
                // Do nothing
              }

              if (buttonIndex == 2) { // ja
                if (kvm.aciveLayer) kvm.activeLayer.clearData();
                $('#reloadLayerIcon_' + layer.getGlobalId()).toggleClass('fa-window-restore fa-spinner fa-spin');
                console.log('reload layer id: %s', kvm.activeLayer.get('id'));
                kvm.activeStelle.reloadLayer(kvm.activeLayer.get('id'));
              }
            },
            '',
            ['nein', 'ja']
          );
        }
      }
    );

  },

  setConnectionStatus: function() {
    kvm.log('setConnectionStatus');
    NetworkStatus.load();
  },

  setGpsStatus: function() {
    kvm.log('setGpsStatus');
    GpsStatus.load();
  },

  hideSperrDiv: function() {
    
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
  * create the list of features of active layer in list view at once
  */
  createFeatureList: function() {
    kvm.log('Erzeuge die Liste der Datensätze neu.');
    $('#featurelistHeading').html(this.activeLayer.get('alias') ? this.activeLayer.get('alias') : this.activeLayer.get('title'));
    $('#featurelistBody').html('');
    html = '';

    $.each(
      this.activeLayer.features,
      function (key, feature) {
        //console.log('append feature: %o to list', feature);
        var needle = $('#searchHaltestelle').val().toLowerCase(),
            element = $(feature.listElement()),
            haystack = element.html().toLowerCase();

        html = html + feature.listElement();
        //console.log(feature.get('uuid') + ' zur Liste hinzugefügt.');
        //console.log(html);
      }
    );
    $('#featurelistBody').append(html);
    kvm.bindFeatureItemClickEvents();
    if (Object.keys(this.activeLayer.features).length > 0) {
      kvm.showItem('featurelist');
      $('#numDatasetsText').html(Object.keys(this.activeLayer.features).length).show();
    }
  },

  showItem: function(item) {
    kvm.log('showItem: ' + item, 4);
    // erstmal alle panels ausblenden
    $(".panel").hide();

    switch (item) {
      case "settings":
        kvm.showDefaultMenu();
        $("#settings").show();
        break;
      case "loggings":
        kvm.showDefaultMenu();
        $("#loggings").show();
        break;
      case "featurelist":
        kvm.showDefaultMenu();
        $("#featurelist").show();
        break;
      case 'map':
        kvm.showDefaultMenu();
        $("#map").show();
        kvm.map.invalidateSize();
        break;
      case 'mapEdit':
        $(".menu-button").hide();
        $("#showFormEdit, #saveFeatureButton, #saveFeatureButton, #cancelFeatureButton").show();
        if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) == 2) {
          $('#deleteFeatureButton').show();
        }
        $("#map").show();
        kvm.map.invalidateSize();
        break;
      case "dataView":
        $(".menu-button").hide();
        $("#showSettings, #showFeatureList, #showMap, #editFeatureButton").show();
        $("#dataView").show().scrollTop(0);
        break;
      case "formular":
        $(".menu-button").hide();
        $("#showMapEdit, #saveFeatureButton, #saveFeatureButton, #cancelFeatureButton").show();
        if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) == 2) {
          $('#deleteFeatureButton').show();
        }
        $("#formular").show().scrollTop(0);
        break;
      default:
        kvm.showDefaultMenu();
        $("#settings").show();
    }
  },

  showDefaultMenu: function() {
    $(".menu-button").hide();
  //  $("#backArrow, #saveFeatureButton, #deleteFeatureButton, #backToFormButton").hide();
    $("#showSettings, #showFeatureList, #showMap, #newFeatureButton").show();
    if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) > 0) $('#newFeatureButton').show();
  },

  showFormMenu: function() {
    $(".menu-button").hide();
    $("#showFeatureList, #showMap, #saveFeatureButton").show();
    if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) == 2) {
      $('#deleteFeatureButton').show();
    }
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

    kvm.log('download data from url: ' + url.substr(0, url.indexOf('passwort=') + 9) + '****');
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
                // Warum kvm.writeData writeData ist eine Methode von Layer
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

  paginate: function(evt) {
    debug_e = evt;
    var limit = 25,
        target = $(evt),
        page = parseInt(target.attr('page')),
        prevPage = page - limit;
        nextPage = page + limit;

    kvm.activeLayer.readData(limit, page);

    if (target.attr('class') == 'page_next_link') {
      $('.page_first_link').show();
      $('.page_prev_link').show();
    }

    if (page < limit) {
      $('.page_first_link').hide();
      $('.page_prev_link').hide();
    }    

    $('.page_prev_link').attr('page', prevPage);
    $('.page_next_link').attr('page', nextPage);
  },

  uuidv4: function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  log: function(msg, level = 3, show_in_sperr_div = false) {
    if (level <= config.logLevel) {
      if (config.debug) {
        console.log('Log msg: ' + msg);
      }
      setTimeout(function() {
        $('#logText').append('<br>' + msg);
        if (show_in_sperr_div) {
          $('#sperr_div_content').html(msg);
        }
      });
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

  deb: function(msg) {
    $('#debText').append('<p>' + msg);
    //$(document).scrollBottom($('#debText').offset().bottom);
    if ($('#show_allways_debug_messages').is(':checked')) {
      $('#debugs').show();
    }
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
  },

  parseLayerResult: function(layerResult) {
    kvm.log('Starte parseLayerResult', 4);
    var resultObj = {
          "success" : false
        };

    if (layerResult.indexOf('form name="login"') > -1) {
      kvm.log('form name="login" gefunden!', 4);
      resultObj.errMsg = 'Zugang zum Server verweigert! Prüfen Sie Ihre Zugangsdaten unter Einstellungen.';
      return resultObj;
    }

    if (!kvm.isValidJsonString(layerResult)) {
      kvm.log('Das Ergebnis der Layerdatenanfrage ist kein JSON!', 4);
      resultObj.errMsg = "Fehler beim Abfragen der Layerdaten. Abfrage liefert keine korrekten Daten vom Server. Entweder sind keine auf dem Server vorhanden, die URL der Anfrage ist nicht korrekt oder der es wird eine Fehlermeldung vom Server geliefert statt der Daten.\nURL der Anfrage:\n" + kvm.activeStelle.getLayerUrl({ hidePassword: true}) + "\nZurückgelieferte Result:\n" + layerResult;
      return resultObj;
    }

    resultObj = $.parseJSON(layerResult);

    if (!resultObj.success) {
      kvm.log('Result success ist false!', 4);
      resultObj.errMsg = 'Fehler beim Abfragen der Layerdaten. Falsche Serverparameter oder Fehler auf dem Server.';
    }

    return resultObj;
  },

  /**
  * function return true if path is the path of the file
  * @params string file The complete path with filename of the file
  * @params string path The path to check if the file path match
  * @return boolean true if file has path
  */
  hasFilePath: function(file, path) {
    var fileDir = (file.match(/(.*)[\/\\]/)[1]||'/') + '/';
    return fileDir == path;
  },

  /*
  * Remove first and last caracter from string
  * in this class used to remove the braces {...} from array values
  * but can be used also for all other enclosing character
  */
  removeBraces: function(val) {
    kvm.log('kvm.removeBraces ' + val, 4);
    var result = val.substring(1, val.length - 1);
    return result;
  },

  /*
  * Add braces around the value to make an array
  */
  addBraces: function(val) {
    kvm.log('kvm.addBraces ' + val, 4);
    var result = '{' + val + '}';
    return result;
  },

  /*
  * Remove the part with original name of image in val
  * Return the first part before & delimiter
  */
  removeOriginalName: function(val) {
    kvm.log('kvm.removeOriginalName: ' + val, 4);
    return val.split('&').shift();
  },

  /*
  * Replace server image path by local image path
  */
  serverToLocalPath: function(src) {
    kvm.log('kvm.serverToLocalPath ' + src, 4);
    var result = config.localImgPath + src.substring(src.lastIndexOf('/') + 1);
    return result
  },

  /*
  * Replace local image path by servers image path
  */
  localToServerPath: function(src) {
    kvm.log('kvm.localToServerPath src: ' + src, 4);
    var result = kvm.activeLayer.get('document_path') + src.substring(src.lastIndexOf('/') + 1);
    kvm.log('Result: ' + result,4);
    return result
  },

  /**
  * Function return a quotation mark if the given database type has to be used as string and requires quotation marks
  * @params string type The database type of an attribute
  * @return string If it is a string returns a single quotation mark "'" if not or unknown returns an empty string ""
  */
  bracketForType: function(type) {
    kvm.log('Frage an ob type: ' + type + ' Hochkommas braucht.');
    return (['bpchar', 'varchar', 'text', 'date', 'timestamp', 'geometry'].indexOf(type) > -1 ? "'" : "");
  }

};

kvm.loadHeadFile('js/controller/mapper.js', 'js');
kvm.loadHeadFile('js/controller/files.js', 'js');

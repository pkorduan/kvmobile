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
  debug: true,
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
    console.log('init');
    document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
  },

  onDeviceReady: function() {
    var activeView = 'featurelist'
    kvm.log('onDeviceReady');

    this.store = window.localStorage;
    kvm.log('Lokaler Speicher verfügbar');

    this.db = window.sqlitePlugin.openDatabase({
      name: config.dbname + '.db',
      location: 'default',
      androidDatabaseImplementation: 2
    });
    kvm.log('Lokale Datenbank geöffnet.');
    $('#dbnameText').html(config.dbname + '.db');

    kvm.log('Lade Gerätedaten.');
    this.loadDeviceData();

    kvm.log('Lade Sync Status.');
    SyncStatus.load(this.store);

    kvm.log('Lade Netzwerkstatus');
    NetworkStatus.load();

    kvm.log('initialisiere Karte.');
    this.initMap();

    if (this.store.getItem('activeStelleId')) {
      var activeStelleId = this.store.getItem('activeStelleId'),
          activeStelleSettings = this.store.getItem('stelleSettings_' + activeStelleId),
          stelle = new Stelle(activeStelleSettings);

      kvm.log('Aktive Stelle ' + activeStelleId + ' gefunden');

      stelle.viewSettings();
      stelle.setActive();

      if (this.store.getItem('activeLayerId')) {
        var activeLayerId = this.store.getItem('activeLayerId'),
            activeLayerSettings = this.store.getItem('layerSettings_' + activeStelleId + '_' + activeLayerId),
            layer = new Layer(stelle, activeLayerSettings);

        kvm.log('Aktiven Layer ' +  activeLayerId + ' gefunden.');

        // ToDo do not createTable instead attach schema database for layer if not exists
        // before create LayerList();
        layer.createTable();
        setTimeout(
          function() {
            kvm.controller.mapper.createLayerList(stelle);
            console.log('set layer to active %o', layer);
            layer.setActive();
            layer.readData(); // load from loacl db to feature list
          },
          2000
        );
      }
      else {
        kvm.msg('Laden Sie die Layer vom Server.');
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

    kvm.log('richte Ereignisüberwachung ein.');
    this.bindEvents();

    kvm.log('zeige Liste der Datensätze');
    this.showItem(activeView);
  },

  initMap: function() {
    console.log('initMap');
    var utmZone = config.projZone,
        myProjectionName = "EPSG:258" + utmZone,
        myProjection,
        view,
        map,
        orkaMv;

    proj4.defs(myProjectionName, "+proj=utm +zone=" + utmZone + " +ellps=GRS80 +units=m +no_defs");
    myProjection = ol.proj.get(myProjectionName);

    view = new ol.View({
      projection: myProjection,
      center: ol.proj.transform(config.startPosition, "EPSG:4326", myProjectionName),
      extent: config.maxExtent,
      zoom: config.startZoom,
      minZoom: 8
    });

    map = new ol.Map({
      controls: ol.control.defaults({
        attribution: true,
        attributionOptions: {
          label: "kvmobile"
        }
      }).extend([
        new ol.control.ScaleLine({
          className: 'ol-scale-line',
          title: 'Maßstabsbalken'
        }),
        new kvm.controls.gpsControl()
      ]),
      layers: [],
      projection: "EPSG:258" + utmZone,
      target: "map",
      view: view
    });

    orkaMv= new ol.layer.Tile({
      source: new ol.source.TileWMS({
        url: "https://www.orka-mv.de/geodienste/orkamv/wms",
        params: {"LAYERS": "orkamv-gesamt",
                        "VERSION": "1.3.0"}
      })
    });
    map.addLayer(orkaMv);

    helpLayer = new ol.layer.Vector({
      name: 'Hilslayer',
      opacity: 0.3,
      source: new ol.source.Vector({
        projection: map.getView().getProjection(),
        features: []
      }),
      style: new ol.style.Style({
        image: new ol.style.Circle({
          radius: 10,
          stroke: new ol.style.Stroke({
            color: 'blue',
            width:2
          }),
          fill: new ol.style.Fill({
            color: 'blue'
          })
        })
      }),
      zIndex: 200
    });
    map.addLayer(helpLayer);

    this.map = map;
  },

  bindEvents: function() {
    console.log('bindEvents');

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
/*
    navigator.geolocation.watchPosition(
      function(geoLocation) {
        console.log(Date() + ' Neue Position: ' + geoLocation.coords.latitude + ' ' + geoLocation.coords.longitude);
      },
      function(error) {
        console.log('Fehler bei der Positionsabfrage code: ' + error.code + ' message: ' + error.message);
      }, {
        maximumAge: 2000, // duration to cache current position
        timeout: 30000, // timeout for try to call successFunction, else call errorFunction 
        enableHighAccuracy: true // take position from gps not network-based method
      }
    );
*/

    this.map.on(
      'click',
      (function(evt) {
        console.log('app click event on map');
        var selectedFeatures = {};

        this.map.forEachFeatureAtPixel(
          evt.pixel,
          (function(feature, layer) {
            if (layer) {
              console.log('Click on layer %o', layer);
              if (layer.get('name') == 'Hilfslayer') {
                console.log('Click on Feature %o', feature);
                layer.getSource().clear();
              }
              else {
                console.log('app click on feature %o', feature);
                this.activeLayer.loadFeatureToForm(
                  this.activeLayer.features['id_' + feature.get('gid')]
                );
              }
              this.showItem('formular');
            }
          }).bind(this)
        );
      }).bind(this)
    );

    this.map.on(
      'pointerdrag',
      function(evt) {
        var gpsControlButton = $('#gpsControlButton');
        if (gpsControlButton.hasClass('kvm-gps-track')) {
          console.log('switch of gps-track');
          gpsControlButton.toggleClass('kvm-gps-on kvm-gps-track');
        }
      }
    );

    $('#requestLayersButton').on(
      'click',
      function () {
        var layer = new Layer(kvm.activeStelle);
        layer.requestLayers();
        $('#requestLayersButton').hide();
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
          "Stelle_ID": $('#kvwmapServerStelleIdField').val(),
        });
        stelle.saveToStore();
        stelle.setActive();
        $('#saveServerSettingsButton').css('background', '#afffaf');
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
        console.log('Klick on showDeltasButton');
        var this_ = evt.data.context,
            sql = "\
              SELECT\
                * \
              FROM\
                " + this_.activeLayer.get('schema_name') + '.' + this_.activeLayer.get('table_name') + "_deltas\
            ";

        $('#showDeltasButton').hide();
        $('#showDeltasWaiting').show();
        console.log('apps.js showDeltasButton execute sql: ' + sql);
        this_.db.executeSql(
          sql,
          [],
          function(rs) {
            console.log('apps.js query deltas success result %o:', rs);
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
            console.log('apps.js query deltas Fehler: %o', error);
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

    $('#formOptionButton').on(
      'click',
      function() {
        navigator.notification.confirm(
          'Datensatz Löschen?',
          function(buttonIndex) {
            if (buttonIndex == 1) { // ja
              console.log('Datensatz löschen');
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

    $('#saveFeatureButton').on(
      'click',
      function(evt) {
        var saveButton = $(evt.target),
//            waitingDiv = $('#waitingDiv'),
            changes = {},
            delta = '';

        if ((saveButton).hasClass('active-button')) {
          navigator.notification.confirm(
            'Datensatz Speichern?',
            function(buttonIndex) {
              var action = (typeof kvm.activeLayer.features['id_' + kvm.activeLayer.activeFeature.get('uuid')] == 'undefined' ? 'INSERT' : 'UPDATE');
              if (buttonIndex == 1) { // ja
                changes = kvm.activeLayer.collectChanges(action);
                console.log('changes: %o', changes);
                kvm.activeLayer.createDeltas(action, changes);

                imgChanges = changes.filter(
                  function(change) {;
                    return ($.inArray(change.key, kvm.activeLayer.getDokumentAttributeNames()) > -1);
                  }
                );
                if (imgChanges.length > 0) kvm.activeLayer.createImgDeltas(action, imgChanges);

                //  waitingDiv.hide();

                saveButton.toggleClass('active-button inactive-button');
              }

              if (buttonIndex == 2) { // nein
                // Do nothing
              }

              if (buttonIndex == 3) { // Abbrechen
                // dont save form values and switch to feature list
              }

            },
            'Datenbank',
            ['ja', 'nein', 'Abbrechen']
          );
        }
        else {
          navigator.notification.alert(
            'Keine Änderungen!'
          );
        }
      }
    );

    $('#kvwmapServerDataForm > input').on(
      'keyup',
      function() {
        $('#saveServerSettingsButton').css('background', '#f9afaf');
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
          new Feature({ uuid : this_.uuidv4()})
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
        console.log('app keyup paste on searchHaltestelle');
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
        kvm.log('Syncronisation aufgerufen.');
        var _this = evt.data.context,
            syncVersion = _this.store.getItem('syncVersion');

        if (navigator.onLine) {
          kvm.log('Gerät ist onLine.');
          if (_this.serverSettingsExists()) {
            kvm.log('Alle Verbindungseinstellungen sind gesetzt.');
            if (syncVersion) {
              kvm.log('Es existiert eine Version der letzten Syncronisation.');
              _this.syncronize(evt.data.context);
            }
            else {
              kvm.log('Keine letzte Version gefunden. Starte Download aller Daten.');
              _this.downloadData(evt.data.context);
            }
          }
          else {
            alert('Es fehlen Einstellungen!');
          }
        }
        else {
          alert('Keine Netzverbindung!');
        }
      }
    );

  },

  bindFeatureItemClickEvents: function() {
    console.log('bindFeatureItemClickEvents');
    $(".feature-item").on(
      'click',
      function(evt) {
        console.log('event click on feature item');

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

        $('#syncImageIcon_' + layer.getGlobalId()).toggleClass('fa-upload fa-spinner fa-spin');

        layer.syncImages();
      }
    );

    $('.clear-layer-button').on(
      'click',
      function(evt) {
        var id = evt.target.value,
            layer = kvm.activeLayer;

        $('#clearLayerIcon_' + layer.getGlobalId()).toggleClass('fa-ban fa-spinner fa-spin');

        if (!layer.isEmpty()) {
          layer.clearData();
        }
      }
    );

  },

  loadDeviceData: function() {
    console.log('loadDeviceData');
    $('#deviceDataText').html(
      'Cordova Version: ' + device.cordova + '<br>' +
      'Modell: ' + device.model + '<br>' +
      'Platform: ' + device.platform + '<br>' +
      'Uuid: ' + device.uuid + '<br>' +
      'Version: ' + device.version + '<br>' +
      'Hersteller: ' + device.manufacturer + '<br>' +
      'Seriennummer: ' + device.serial
    );
  },

  /*
  * create the list of features of active layer in list view
  */
  createFeatureList: function() {
    console.log('app.createFeatureList');

    kvm.log('Erzeuge die Liste der Datensätze neu.');
    $('#featurelistHeading').html(this.activeLayer.get('title'));
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
    $('#numDatasetsText').html(Object.keys(this.activeLayer.features).length);
  },

  drawFeatureMarker: function() {
    //console.log('app.drawFeatureMarker');
    $.each(
      this.activeLayer.features,
      function (key, feature) {
        //console.log('app.drawFeatureMarker: add feature in map: %o', feature);

        if (feature.getCoord()) {
          kvm.activeLayer.olLayer.getSource().addFeature(
            feature.getOlFeature()
          )
        }
      }
    );
    kvm.activeLayer.olLayer.refresh({force: true});
    console.log('app.drawFeatureMarker added ' + this.activeLayer.features.length + ' feature in map');
  },
/*
  checkIfTableExists: function() {
    kvm.log('function checkIfTableExists');
    this.db.executeSql(
      "\
        SELECT\
          count(name) n\
        FROM\
          sqlite_master\
        WHERE\
          type='table' AND\
          name='haltestellen'\
      ",
      [],
      function(rs, context) {
        kvm.log('checkIfTableExists success');
        var numTables = rs.rows.item(0).n;
        if (numTables == 1) {
          kvm.log('numTables: 1, Tablle haltestellen existiert.');
          kvm.loadData();
        }
        else {
          kvm.log('numTables: != 1, Tabelle haltestellen existiert noch nicht');
          if (tableSettingsExists) {
            kvm.log('tableSettingsExists: ja, Layereinstellungen zur Tabelle haltestellen liegen vor.');
            kvm.createTable();
          }
          else {
            kvm.log('tableSettingsExists: nein, Layereinstellungen liegen noch nicht vor');
            kvm.loadLayer(context);
          }
        }
        $('#numDatasetsText').html(numDatasets);
      },
      function(error) {
        kvm.log('checkIfTableExists error');
        alert('Fehler beim Zugriff auf die Datenbank');
      }
    );
  },
*/

  showItem: function(item) {
    console.log('showItem: ' + item);
    
    switch (item) {
      case 'map':
        kvm.showDefaultMenu();
        $("#featurelist, #settings, #formular, #loggings").hide();
        $("#map, #newFeatureButton, .ol-unselectable").show();
        break;
      case "featurelist":
        kvm.showDefaultMenu();
        $("#map, #settings, #formular, #loggings").hide();
        $("#featurelist, #newFeatureButton").show();
        break;
      case "loggings":
        kvm.showDefaultMenu();
        $("#map, #featurelist, #settings, #formular, #newFeatureButton").hide();
        $("#loggings").show();
        break;
      case "settings":
        kvm.showDefaultMenu();
        $("#map, #featurelist, #formular, #loggings").hide();
        $("#settings, #newFeatureButton").show();
        break;
      case "formular":
        kvm.showFormMenu();
        $("#map, #featurelist, #settings, #loggings, #newFeatureButton").hide();
        $("#formular").show();
        break;
      default:
        kvm.showDefaultMenu();
        $("#map, #featurelist, #settings, #loggings, #formular").hide();
        $("#settings, #newFeatureButton").show();
    }
  },
  
  showDefaultMenu: function() {
    $("#backArrow, #saveFeatureButton, #formOptionButton").hide();
    $("#showMap, #showLine, #showHaltestelle, #showSettings").show();
  },

  showFormMenu: function() {
    $("#showMap, #showLine, #showHaltestelle, #showSettings").hide();
    $("#backArrow, #saveFeatureButton, #formOptionButton").show();
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
              console.log('downloadData onloadend this: %o', this);
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
        console.log('mach was mit der Datei: %o', fileEntry);
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

  log: function(msg) {
    if (this.debug) {
      $('#logText').append('<br>' + msg);
      console.log('Log msg: ' + msg);
    }
  },

  msg: function(msg) {
    navigator.notification.confirm(
      msg,
      function(buttonIndex) {
      },
      '',
      ['ok']
    );
    console.log('Output msg: ' + msg);
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
  }
};

kvm.loadHeadFile('js/controls/gpsControl.js', 'js');
kvm.loadHeadFile('js/controller/mapper.js', 'js');
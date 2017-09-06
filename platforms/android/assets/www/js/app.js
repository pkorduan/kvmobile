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
var kvm = {
  debug: true,

  init: function() {
    console.log('init');
    document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
  },

  onDeviceReady: function() {
    var activeView = 'haltestellen'
    kvm.log('onDeviceReady');

    this.store = window.localStorage;
    kvm.log('Lokaler Speicher verfügbar');

    this.db = window.sqlitePlugin.openDatabase({name: config.dbname + '.db', location: 'default'});
    kvm.log('Lokale Datenbank geöffnet.');
    $('#dbnameText').html(config.dbname + '.db');

    kvm.log('Lade Gerätedaten.');
    this.loadDeviceData();

    kvm.log('Lade Sync Status.');
    SyncStatus.load(this.store);

    kvm.log('Lade Netzwerkstatus');
    NetworkStatus.load();

    if (this.store.getItem('activeStelleId')) {
      var activeStelleId = this.store.getItem('activeStelleId'),
          activeStelleSettings = this.store.getItem('stelleSettings_' + activeStelleId),
          stelle = new Stelle(activeStelleSettings);

      stelle.viewSettings();
      stelle.setActive();

      if (this.store.getItem('activeLayerId')) {
        var activeLayerId = this.store.getItem('activeLayerId'),
            activeLayerSettings = this.store.getItem('layerSettings_' + activeStelleId + '_' + activeLayerId),
            layer = new Layer(stelle, activeLayerSettings);

        layer.viewLayerList();
        layer.setActive();
        layer.readData(); // load from loacl db to feature list
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
    };

    kvm.log('initialisiere Karte.');
    this.initMap();

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
    var myProjectionName = "EPSG:25832";
    proj4.defs(myProjectionName, "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs");
    var myProjection = ol.proj.get(myProjectionName);

    /*** Set View **/
    var view = new ol.View({
      projection: myProjection,
      center: ol.proj.transform([12.10,54.10], "EPSG:4326", "EPSG:25832"),
      extent: [655000.000000000, 5945000.000000000, 750000.000000000, 6030000.000000000],
      zoom: 12,
      minZoom: 11
    });

    /*** Set the Map***/
    var map = new ol.Map({
      controls: [],
      layers: [],
      projection: "EPSG:25832",
      target: "map",
      view: view
    });

    var orkaMv= new ol.layer.Tile({
      source: new ol.source.TileWMS({
        url: "https://www.orka-mv.de/geodienste/orkamv/wms",
        params: {"LAYERS": "orkamv-gesamt",
                        "VERSION": "1.3.0"}
      })
    });
    map.addLayer(orkaMv);
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
    ),

    $('#kvwmapServerDataForm > input').on(
      'keyup',
      function() {
        $('#saveServerSettingsButton').css('background', '#f9afaf');
      }
    ),

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

    /* Clientside Filter according to http://stackoverflow.com/questions/12433835/client-side-searching-of-a-table-with-jquery */
    /*** Search Haltestelle ***/
    $("#searchHaltestelle").on("keyup paste", function() {
      var value = $(this).val().toUpperCase();
      var $rows = $("#haltestellen_table tr");
      if(value === ''){
        $rows.show(500);
        return false;
      }
      $rows.each(function(index) {
        $row = $(this);
        var column = $row.find("td a").html().toUpperCase();
        if (column.indexOf(value) > -1) {
          $row.show(500);
        }
        else {
          $row.hide(500);
        }
      });
    });

    $(".haltestelle").click(function() {
      kvm.showItem("formular");
      // Sets Name of Haltestelle
      $("#nameHaltestelle").val($(this).text());
    });
    
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

  bindHaltestellenClickEvents: function() {
    $(".haltestelle").click(function() {
      kvm.showItem("formular");
      // Sets Name of Haltestelle
      $("#nameHaltestelle").val($(this).text());
    });
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
        kvm.showItem('haltestellen');
      }
    );

    $('.sync-layer-button').on(
      'click',
      function(evt) {
        var id = evt.target.value,
            layer = kvm.activeLayer;

        layer.requestData();
      }
    )

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

  createTable: function() {
    kvm.log('createTable');
    this.db.transaction(
      function(db) {
        db.executeSql(
          '\
            CREATE TABLE IF NOT EXISTS haltestellen (\
              id INTEGER,\
              name TEXT,\
              nr INTEGER,\
              lat REAL,\
              lon REAL,\
              haltestellenmast_mit_fahrplanaushang INTEGER,\
              taktiles_aufmerksamkeitsfeld INTEGER,\
              taktiles_leitsystem_parallel_zur_haltestellenkante INTEGER,\
              befestigte_warteflaeche INTEGER,\
              barrierefreie_bordhoehe INTEGER,\
              wegweisung_zur_haltestelle_taktiles_leitsystem_zur_haltestelle INTEGER,\
              wegweisung_zur_haltestelle_querungshilfen INTEGER,\
              wegweisung_zur_haltestelle_befestigte_wege_zur_haltestelle INTEGER,\
              wegweisung_zur_haltestelle_lichtsignalanlage INTEGER,\
              wegweisung_zur_haltestelle_fussgaengerueberweg INTEGER,\
              aufstellflaeche_hoehe REAL,\
              aufstellflaeche_breite REAL,\
              aufstellflaeche_laenge REAL,\
              fahrgastunterstand TEXT,\
              dfi TEXT,\
              visuell_kontrastreiche_gestaltung_der_bedienelemente INTEGER,\
              beleuchtung INTEGER,\
              uhr INTEGER,\
              auflademoeglichkeiten_fuer_ebikes INTEGER,\
              papierkorb INTEGER,\
              fahrradabstellmoeglichkeiten INTEGER,\
              ein_aussteiger INTEGER,\
              einwohnerzahl INTEGER,\
              created_at TEXT,\
              updated_at_server TEXT,\
              bilder TEXT,\
              bilder_updated_at TEXT,\
              user TEXT,\
              status TEXT,\
              point TEXT,\
              updated_at_client TEXT,\
              version TEXT\
            )\
          ',
          [],
          function(db, res) {
            kvm.log('sql ausgeführt');  
          }
        );
      },
      function(error) {
        kvm.log('Fehler beim Anlegen der Tabelle. ' + error.message);
      },
      function() {
        kvm.log('Tabelle erfolgreich angelegt.');
      }
    );
  },

  showItem: function(item) {
    console.log('showItem: ' + item);
    switch (item) {
      case 'map':
        kvm.showDefaultMenu();
        $("#haltestellen, #settings, #formular, #loggings").hide();
        $("#map").show();
        break;
      case "haltestelle":
        kvm.showDefaultMenu();
        $("#map, #settings, #formular, #loggings").hide();
        $("#haltestellen").show();
        break;
      case "loggings":
        kvm.showDefaultMenu();
        $("#map, #haltestellen, #settings, #formular").hide();
        $("#loggings").show();
        break;
      case "settings":
        kvm.showDefaultMenu();
        $("#map, #haltestellen, #formular, #loggings").hide();
        $("#settings").show();
        break;
      case "formular":
        kvm.showFormMenu();
        $("#map, #haltestellen, #settings, #loggings").hide();
        $("#formular").show();
        break;
      default:
        kvm.showDefaultMenu();
        $("#map, #haltestellen, #settings, #loggings, #formular").hide();
        $("#settings").show();
    }
  },
  
  showDefaultMenu: function() {
    $("#backArrow, #saveForm").hide();
    $("#showMap, #showLine, #showHaltestelle, #showSettings").show();
  },

  showFormMenu: function() {
    $("#showMap, #showLine, #showHaltestelle, #showSettings").hide();
    $("#backArrow, #saveForm").show();
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

  log: function(msg) {
    if (this.debug) {
      $('#logText').append('<br>' + msg);
      console.log('Log msg: ' + msg);
    }
  },

  msg: function(msg) {
    alert(msg);
    console.log('Output msg: ' + msg);
  }
};
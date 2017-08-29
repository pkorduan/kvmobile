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
    console.log('onDeviceReady');
    this.storage = window.localStorage;
    this.db = window.sqlitePlugin.openDatabase({name: config.dbname + '.db', location: 'default'});
    $('#dbnameText').html(config.dbname + '.db');
    console.log('Database kvmobile.db is open: %o', this.db);
    this.initSettings();
    this.setSyncStatus();
    this.setConnectionStatus();
    this.initMap();
    this.bindEvents();
    $('#login').hide();
    $('#map').hide();
/*
    this.showGPSCoordinates();
*/
  },

  initSettings: function() {
    this.loadDeviceData();

    if (this.allSettingsExists()) {
      $('#kvwmapServerUrlField').val(this.storage.getItem('kvwmapServerUrl'));
      $('#kvwmapServerUsernameField').val(this.storage.getItem('kvwmapServerUsername'));
      $('#kvwmapServerPasswortField').val(this.storage.getItem('kvwmapServerPasswort'));
      $('#kvwmapServerStelleIdField').val(this.storage.getItem('kvwmapServerStelleId'));
      $('#kvwmapServerLayerIdField').val(this.storage.getItem('kvwmapServerLayerId'));
    }
    else {
      kvm.log('Es fehlen Parameter für den Zugang zum kvwmap Server.');
      alert('Es fehlen Zugangsdaten zum kvwmap Server. Geben Sie diese unter Menüpunkt Optionen Abschnitt Serverdaten ein!');
      $('#kvwmapServerUrlField').val(config.kvwmapServerUrl);
      $('#kvwmapServerUsernameField').val(config.kvwmapServerUsername);
      $('#kvwmapServerPasswortField').val(config.kvwmapServerPasswort);
      $('#kvwmapServerStelleIdField').val(config.kvwmapServerStelleId);
      $('#kvwmapServerLayerIdField').val(config.kvwmapServerLayerId);
      $('#haltestellen').hide();
      $('#settings').show();
    }

    /*
    check if local data in database exists
    if not tell the client that he have to sync
    if yes load it to haltestellen liste view
    */
    this.checkIfTableExists();
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

    $('#saveKvwmapServerDataButton').on(
      'click', {
        "context": this
      },
      this.saveKvwmapServerData
    ),

    $('#kvwmapServerDataForm > input').on(
      'keyup',
      function() {
        $('#saveKvwmapServerDataButton').css('background', '#f9afaf');
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
        var _this = evt.data.context,
            syncVersion = _this.storage.getItem('syncVersion');

        if (navigator.onLine) {
          kvm.log('onLine');
          if (_this.allSettingsExists()) {
            if (syncVersion) {
              _this.syncronize(evt.data.context);
            }
            else {
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
    
    $("#loginButton").on(
      'click',
      function() {
        kvm.loadLayer();
      }
    )
  },

  bindHaltestellenClickEvents: function() {
    $(".haltestelle").click(function() {
      kvm.showItem("formular");
      // Sets Name of Haltestelle
      $("#nameHaltestelle").val($(this).text());
    });
  },

  loadDeviceData: function() {
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

  setSyncStatus: function() {
    var syncLastLocalTimestamp = this.storage.getItem('syncLastLocalTimestamp'),
        syncLastLocalVersion = this.storage.getItem('syncVersion');

    $('#syncLastLocalTimestampText').html(
      (syncLastLocalTimestamp ? syncLastLocalTimestamp : 'noch nie synchronisiert')
    );
    $('#syncLastLocalVersionText').html(
      (syncLastLocalVersion ? syncLastLocalVersion : 'keine')
    );
  },

  setConnectionStatus: function() {
    var networkState = navigator.connection.type;

    var states = {};
    states[Connection.UNKNOWN]  = 'Unbekannte Netzverbindung';
    states[Connection.ETHERNET] = 'Ethernet Verbindung';
    states[Connection.WIFI]     = 'WLAN Netz';
    states[Connection.CELL_2G]  = '2G Netz';
    states[Connection.CELL_3G]  = '3G Netz';
    states[Connection.CELL_4G]  = '4G Netz';
    states[Connection.CELL]     = 'generisches Netz';
    states[Connection.NONE]     = 'Keine Netzwerkverbindung';

    $('#networkStatusText').html(states[networkState]);

    if (navigator.onLine) {
      if ($('#startSyncButton').hasClass('inactive-button')) {
        $('#startSyncButton').toggleClass('active-button', 'inactive-button');
      }
    }
    else {
      if ($('#startSyncButton').hasClass('active-button')) {
        $('#startSyncButton').toggleClass('active-button', 'inactive-button');
      }
    }
  },

  /*
  * Return true if all settings exists
  */
  allSettingsExists: function() {
    return !(
      !this.storage.getItem('kvwmapServerUrl') ||
      !this.storage.getItem('kvwmapServerUsername') ||
      !this.storage.getItem('kvwmapServerPasswort') ||
      !this.storage.getItem('kvwmapServerStelleId') ||
      !this.storage.getItem('kvwmapServerLayerId')
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
        kvm.log('Tabelle haltestellen existiert ' + numTables + ' mal.');
        if (numTables == 1) {
          kvm.loadData();
        }
        else {
          kvm.createTable();
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

  loadData: function() {
    kvm.log('function loadData');
    this.db.executeSql(
      "\
        SELECT\
          count(*) AS n\
        FROM\
          haltestellen\
      ",
      [],
      function(rs) {
        console.log('rs in loadData success: %o', rs);
        var numDatasets = rs.rows.item(0).n;
        kvm.log('Anzahl der Datensätze: ' + numDatasets);
        if (numDatasets > 0) {
          kvm.log('Es sind Datensätze vorhanden rufe readData auf.');
          kvm.readData();
        }
        else {
          // if network connection
          // anbieten das jetzt synchronisiert wird
          // wenn nicht
          // darauf hinweisen, dass synchronisiert werden sollte, wenn Netzverbindung besteht.
          alert('Es sind noch keine Daten auf dem Gerät vorhanden. Synchronisieren Sie mit dem Server.');
        }
        $('#numDatasetsText').html(numDatasets);
      },
      function(error) {
        alert('Fehler beim Zugriff auf die Datenbank');
      }
    );
  },

  writeData: function(items) {
    kvm.log('function writeData');
    console.log('write Data Items: %o', items);
    debug_items = items;
/* example of haltestelle
{"id":"27","name":"Ahlbecker Stra\u00dfe","nr":"18","lat":null,"lon":null,"haltestellenmast_mit_fahrplanaushang":"f","taktiles_aufmerksamkeitsfeld":"f","taktiles_leitsystem_parallel_zur_haltestellenkante":"f","befestigte_warteflaeche":"f","barrierefreie_bordhoehe":"unter 16cm","wegweisung_zur_haltestelle_taktiles_leitsystem_zur_haltestelle":"f","wegweisung_zur_haltestelle_querungshilfen":"f","wegweisung_zur_haltestelle_befestigte_wege_zur_haltestelle":"f","wegweisung_zur_haltestelle_lichtsignalanlage":"f","wegweisung_zur_haltestelle_fussgaengerueberweg":"f","aufstellflaeche_hoehe":null,"aufstellflaeche_breite":null,"aufstellflaeche_laenge":null,"fahrgastunterstand":"Sitzschalen","dfi":"4-zeilig","visuell_kontrastreiche_gestaltung_der_bedienelemente":"f","beleuchtung":"f","uhr":"f","auflademoeglichkeiten_fuer_ebikes":"f","papierkorb":"f","fahrradabstellmoeglichkeiten":"f","ein_aussteiger":null,"einwohnerzahl":null,"created_at":"25.08.2017 17:55:40.188323","updated_at_server":"25.08.2017 17:56:22","bilder":null,"bilder_updated_at":"25.08.2017 17:56:22","status":null,"point":"0101000020E6100000751E6242B6182840A77253986E124B40","updated_at_client":"25.08.2017 17:56:22","deleted_at_server":null,"version":"32"}
*/
    var tableName = 'haltestellen',
        keys = $.map(
          items[0],
          function(value, key) {
            return key;
          }
        ).join(', '),
        values = '(' +
          $.map(
            items,
            function(item) {
              return $.map(
                item,
                function(value, key) {
                  var v;
                  switch (true) {
                    case value == 't' :
                      v = 1;
                      break;
                    default:
                      v = "'" + value + "'";
                  }
                  return v;
                }
              ).join(', ');
            }
          ).join('), (') +
        ')';

    sql = "\
      INSERT INTO haltestellen (\
        " + keys + ")\
      VALUES\
        " + values + "\
    ";

    kvm.log('write Data with sql: ' + sql);
    this.db.executeSql(
      sql,
      [],
      function(rs) {
        kvm.log('Daten erfolgreich in Datenbank geschrieben');
        kvm.readData();
      },
      function(error) {
        alert('Fehler beim Zugriff auf die Datenbank: ' + error.message);
      }
    );
  },

  readData: function() {
    kvm.log('function readData');
    console.log('context in readData: %o', this);
    this.db.executeSql(
      "\
        SELECT\
          *\
        FROM\
          haltestellen\
      ",
      [],
      function(rs) {
        kvm.log('readData success function');
        var html = '',
            numRows = rs.rows.length,
            item;

        console.log('result: %o', rs);
        kvm.log('readData ' + numRows + ' Datensaetze gelesen.');
        for (var i = 0; i < numRows; i++) {
          item = rs.rows.item(i);
          html += '<tr><td id="haltestelle_' + item.id + '"><a class="haltestelle">' + item.name + '</a></td></tr>';
        }
        kvm.log('replace feature list with html: ' + html);
        $('#haltestellenBody').html(html);
        kvm.bindHaltestellenClickEvents();

        $('#storeTestDataResult').html('Anzahl Testdatensätze: ' + rs.rows.length);
      },
      function(error) {
        kvm.log('Fehler bei der Abfrage der Daten aus lokaler Datenbank: ' + error.message);
        $('#storeTestDataResult').html('SQL ERROR: ' + error.message);
      }
    );
  },

  saveKvwmapServerData: function(evt) {
    var storage = evt.data.context.storage;
    storage.setItem('kvwmapServerUrl', $('#kvwmapServerUrlField').val());
    storage.setItem('kvwmapServerUsername', $('#kvwmapServerUsernameField').val());
    storage.setItem('kvwmapServerPasswort', $('#kvwmapServerPasswortField').val());
    storage.setItem('kvwmapServerStelleId', $('#kvwmapServerStelleIdField').val());
    storage.setItem('kvwmapServerLayerId', $('#kvwmapServerLayerIdField').val());
    $('#saveKvwmapServerDataButton').css('background', '#afffaf');
  },

  showItem: function(item) {
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
        $("#line, #haltestellen, #settings, #formular").hide();
        $("#map").show();
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

  loadLayer: function() {
    console.log('loadLayer');
    
  },

  syncronize: function(context) {
    kvm.log('function syncronize');
    var url = context.getSyncUrl();
  },

  getSyncUrl: function() {
    kvm.log('function getSyncUrl');
    var url = this.storage.getItem('kvwmapServerUrl'),
        file = '';

    kvm.log('url vor file: ' + url);
    // add missing parts to url when server.de, server.de/ oder server.de/index.php
    if (url.slice(-3) == '.de') file = '/index.php?';
    if (url.slice(-1) == '/') file = 'index.php?';
    if (url.slice(-9) == 'index.php') file = '?';
    if (file == '') file = '/index.php?';

    url += file +
      'Stelle_ID=' + this.storage.getItem('kvwmapServerStelleId') + '&' +
      'username=' + this.storage.getItem('kvwmapServerUsername') + '&' +
      'passwort=' + this.storage.getItem('kvwmapServerPasswort') + '&' +
      'selected_layer_id=' + this.storage.getItem('kvwmapServerLayerId');

    if (this.storage.getItem('syncVersion')) {
      // sync deltas
      url += '&' +
        'go=Syncronize';
      
    }
    else {
      // get all data as new base for deltas
      url += '&' +
        'go=Layer-Suche_Suchen' + '&' +
        'anzahl=10000' + '&' +
        'orderby' + this.storage.getItem('kvwmapServerLayerId') + '=name' + '&' +
        'mime_type=application/json' + '&' +
        'format=json' + '&' + 'selectors=id,name,nr,lat,lon,haltestellenmast_mit_fahrplanaushang,taktiles_aufmerksamkeitsfeld,taktiles_leitsystem_parallel_zur_haltestellenkante,befestigte_warteflaeche,barrierefreie_bordhoehe,wegweisung_zur_haltestelle_taktiles_leitsystem_zur_haltestelle,wegweisung_zur_haltestelle_querungshilfen,wegweisung_zur_haltestelle_befestigte_wege_zur_haltestelle,wegweisung_zur_haltestelle_lichtsignalanlage,wegweisung_zur_haltestelle_fussgaengerueberweg,aufstellflaeche_hoehe,aufstellflaeche_breite,aufstellflaeche_laenge,fahrgastunterstand,dfi,visuell_kontrastreiche_gestaltung_der_bedienelemente,beleuchtung,uhr,auflademoeglichkeiten_fuer_ebikes,papierkorb,fahrradabstellmoeglichkeiten,ein_aussteiger,einwohnerzahl,created_at,updated_at_server,bilder,bilder_updated_at,user,status,point,updated_at_client,version';
    }
    kvm.log('Url: ' +  url);
    return url;
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
      function (error) {
        kvm.log("download error source " + error.source);
        kvm.log("download error target " + error.target);
        kvm.log("download error code: " + error.code);
        kvm.log("download error message: " + error.code);
        alert('Fehler beim herunterladen der Datei von der Url: . Prüfen Sie ob die Netzverbidnung besteht und versuchen Sie es später noch einmal, wenn Sie wieder Netz haben. ' + error.message);
      },
      true
    );
  },

  log: function(msg) {
    if (this.debug) {
      $('#logText').append('<br>' + msg);
      console.log(msg);
    }
  }

};


/*
            <tr><td id="haltestelle_1"><a class="haltestelle">A.-Schweitzer-Str.</a></td></tr>
            <tr><td id="haltestelle_2"><a class="haltestelle">Albert-Schulz-Straße</a></td></tr>
            <tr><td id="haltestelle_3"><a class="haltestelle">Alter Hafen Süd</a></td></tr>
            <tr><td id="haltestelle_4"><a class="haltestelle">Am Bagehl</a></td></tr>
            <tr><td id="haltestelle_5"><a class="haltestelle">Am Dorfteich</a></td></tr>
            <tr><td id="haltestelle_6"><a class="haltestelle">Am Kringelgraben</a></td></tr>
            <tr><td id="haltestelle_7"><a class="haltestelle">Am Liepengraben</a></td></tr>
            <tr><td id="haltestelle_8"><a class="haltestelle">Am Petridamm</a></td></tr>
            <tr><td id="haltestelle_9"><a class="haltestelle">Bahnbetriebswerk</a></td></tr>
            <tr><td id="haltestelle_10"><a class="haltestelle">Campingplatz</a></td></tr>
            <tr><td id="haltestelle_11"><a class="haltestelle">Dänenberg</a></td></tr>
            <tr><td id="haltestelle_12"><a class="haltestelle">E.-Schlesinger-Straße</a></td></tr>
            <tr><td id="haltestelle_13"><a class="haltestelle">Fährstr. Michaelshof</a></td></tr>
            <tr><td id="haltestelle_14"><a class="haltestelle">Galileistraße</a></td></tr>
            <tr><td id="haltestelle_15"><a class="haltestelle">Hafenallee</a></td></tr>
            <tr><td id="haltestelle_16"><a class="haltestelle">Immendiek</a></td></tr>
            <tr><td id="haltestelle_17"><a class="haltestelle">J.-Curie-Allee</a></td></tr>
            <tr><td id="haltestelle_18"><a class="haltestelle">K.-Schumacher-Ring</a></td></tr>
            <tr><td id="haltestelle_19"><a class="haltestelle">Lange Straße</a></td></tr>
            <tr><td id="haltestelle_20"><a class="haltestelle">M.-Gorki-Straße</a></td></tr>
            <tr><td id="haltestelle_21"><a class="haltestelle">Neu Hinrichsdorf</a></td></tr>
            <tr><td id="haltestelle_22"><a class="haltestelle">Oldendorf</a></td></tr>
            <tr><td id="haltestelle_23"><a class="haltestelle">Parkstraße</a></td></tr>
            <tr><td id="haltestelle_24"><a class="haltestelle">R.-Wagner-Str. TZW</a></td></tr>
            <tr><td id="haltestelle_25"><a class="haltestelle">Saarplatz</a></td></tr>
            <tr><td id="haltestelle_26"><a class="haltestelle">Taklerring</a></td></tr>
            <tr><td id="haltestelle_27"><a class="haltestelle">U.-Kekkonen-Str.</a></td></tr>
            <tr><td id="haltestelle_28"><a class="haltestelle">Vicke-Schorler-Ring</a></td></tr>
            <tr><td id="haltestelle_29"><a class="haltestelle">W'münde Kirchenplatz</a></td></tr>
            <tr><td id="haltestelle_30"><a class="haltestelle">ZOB</td></tr>
*/
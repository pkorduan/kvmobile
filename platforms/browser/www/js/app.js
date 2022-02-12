var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// window.open = cordova.InAppBrowser.open;
kvm = {
    version: '1.7.12',
    Buffer: require('buffer').Buffer,
    wkx: require('wkx'),
    controls: {},
    controller: {},
    views: {},
    layerDataLoaded: false,
    featureListLoaded: false,
    mapSettings: {},
    layers: [],
    overlays: [],
    loadHeadFile: function (filename, filetype) {
        //console.log('Lade filename %s, filetype: %s', filename, filetype);
        if (filetype == "js") { //if filename is a external JavaScript file
            var fileref = document.createElement('script');
            fileref.setAttribute("type", "text/javascript");
            fileref.setAttribute("src", filename);
        }
        else if (filetype == "css") { //if filename is an external CSS file
            var fileref = document.createElement("link");
            fileref.setAttribute("rel", "stylesheet");
            fileref.setAttribute("type", "text/css");
            fileref.setAttribute("href", filename);
        }
        if (typeof fileref != "undefined") {
            document.getElementsByTagName("head")[0].appendChild(fileref);
        }
    },
    /**
    * function return all urls to fetch vector tiles in box with lower left corner p1
    * to upper right corner p2 for zoom level zoom
    * @param L.latLng p1
    * @param L.latLng p2
    * @param integer zoom
    */
    getTilesUrls: function (p1, p2, zoom, orgUrl) {
        const coordArray = this.getTilesCoord(p1, p2, zoom), urls = [];
        for (let i = 0; i < coordArray.length; i++) {
            let url = orgUrl.replace('{z}', coordArray[i].z);
            url = url.replace('{x}', coordArray[i].x);
            url = url.replace('{y}', coordArray[i].y);
            urls.push(url);
        }
        return urls;
    },
    /*
    * function return coords of vector tiles in box with lower left corner p1
    * to upper right corner p2 for zoom level zoom
    */
    getTilesCoord: function (p1, p2, zoom) {
        const t1 = this.map.project(p1, zoom).divideBy(256).floor(), t2 = this.map.project(p2, zoom).divideBy(256).floor(), minX = t1.x < t2.x ? t1.x : t2.x, minY = t1.y < t2.y ? t1.y : t2.y, maxX = t1.x > t2.x ? t1.x : t2.x, maxY = t1.y > t2.y ? t1.y : t2.y;
        coordArray = [];
        mod = Math.pow(2, zoom);
        for (var i = minX; i <= maxX; i++) {
            for (var j = minY; j <= maxY; j++) {
                const x = (i % mod + mod) % mod, y = (j % mod + mod) % mod, coords = new L.Point(x, y);
                coords.z = zoom;
                coordArray.push(coords);
            }
        }
        return coordArray;
    },
    /**
    * function extract and return the coordinates from the vector tile url
    */
    getTileKey: function (url) {
        const sA = url.split(/[\/.]/);
        return '_' + sA[sA.length - 4] + '_' + sA[sA.length - 3] + '_' + sA[sA.length - 2];
    },
    saveTileServerConfiguration: function (data) {
        kvm.store.setItem('tileServerConfig', JSON.stringify(data));
        return data;
    },
    getTileServerConfiguration: function () {
        return JSON.parse(kvm.store.getItem('tileServerConfig'));
    },
    /**
    *
    * params: {url:string, type:'json'|'arrayBuffer'|?}
    * callback(err: ?Error, data: ?Object)
    */
    customProtocolHandler: function (params, callback) {
        //    console.info('start customProtocolHandler with params: ', params);
        const urlPattern = /.*\d+\/\d+\/\d+\..*/;
        // check if url is a tile url if not assume it is a tile description url 
        if (params.url.match(urlPattern)) {
            // matched tile url
            const key = kvm.getTileKey(params.url);
            console.info('Searching for tile %s', key);
            kvm.readTile(key).then((d) => {
                if (d) {
                    console.info('Tile %s found in DB', key);
                    callback(null, d, null, null);
                }
                else {
                    const url = params.url.replace('custom', 'http');
                    console.info('Tile %s not in DB. Fetching from url: %s', key, url);
                    fetch(url).then(t => {
                        t.arrayBuffer().then(arr => {
                            kvm.saveTile(key, arr.slice(0));
                            console.info('Tile %s saved in DB', key);
                            callback(null, arr);
                        });
                    });
                }
            }).catch((err) => {
                console.info("error=>fetching", err);
                fetch(params.url.replace('custom', 'http')).then(t => {
                    t.arrayBuffer().then(arr => {
                        const xx = arr.slice(0);
                        kvm.saveTile(key, xx);
                        console.info('Tile %s saved in DB', key);
                        callback(null, arr);
                    });
                });
            });
        }
        else {
            // request the json describing the source 
            // original will be fetched
            // in the response the protocol the tiles will be changed from http to custom
            let url = params.url.replace('custom', 'http');
            // switch between on and offline
            if (navigator.onLine) {
                fetch(url).then(t => {
                    t.json().then(data => {
                        console.info(data);
                        kvm.orgTileUrl = data.tiles[0];
                        data.tiles[0] = data.tiles[0].replace('http', 'custom');
                        kvm.saveTileServerConfiguration(data);
                        // callback(err: ?Error, tileJSON: ?Object)
                        callback(null, data);
                    });
                })
                    .catch(e => {
                    callback(new Error(e));
                });
            }
            else {
                data = kvm.getTileServerConfiguration();
                callback(null, data);
            }
        }
        return { cancel: () => { } };
    },
    init: function () {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
        /**
         * if maplibre sees an url like custum:// it will call customProtocolHandler
         *
         * customProtocolHandler: (requestParameters: RequestParameters, callback: ResponseCallback<any>) => Cancelable
         * requestParameters: {url:string, type:json?? }
         */
        maplibregl.addProtocol('custom', this.customProtocolHandler);
    },
    fail: function (e) {
        console.log("FileSystem Error");
        console.dir(e);
    },
    writeLog: function (str) {
        if (!logOb)
            return;
        var t = new Date();
        var log = '[' + t.getFullYear() + '-' + t.getMonth() + '-' + t.getDay() + ' ' + t.getHours() + ':' + t.getMinutes().toString().padStart(2, '0') + ':' + t.getSeconds().toString().padStart(2, '0') + '] ' + str + "\n";
        logOb.createWriter(function (fileWriter) {
            fileWriter.seek(fileWriter.length);
            var blob = new Blob([log], { type: 'text/plain' });
            fileWriter.write(blob);
        }, kvm.fail);
    },
    onDeviceReady: function () {
        this.store = window.localStorage;
        var foundConfiguration = configurations.filter(function (c) { return c.name == (kvm.store.getItem('configName') ? kvm.store.getItem('configName') : 'Standard'); });
        if (foundConfiguration.length == 0) {
            config = configurations[0];
        }
        else {
            config = foundConfiguration[0];
        }
        /*
            // Write log to cordova.file.externalDataDirectory
            // which is at file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/
            window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function(dir) {
              //console.log("got main dir",dir);
              dir.getFile("log.txt", {create:true}, function(file) {
                //console.log("got the file", file);
                logOb = file;
                kvm.writeLog("App started");
              });
            });
        */
        /*
            BackgroundGeolocation.configure({
              startForeground: true,
        //      locationProvider: BackgroundGeolocation.ACTIVITY_PROVIDER,
              locationProvider: BackgroundGeolocation.DISTANCE_FILTER_PROVIDER,
              desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
              stationaryRadius: 1,
              distanceFilter: 1,
              notificationTitle: 'Background tracking',
              notificationText: 'enabled',
              debug: true,
              interval: 10000,
              fastestInterval: 5000,
              activitiesInterval: 10000,
              url: 'https://gdi-service.de/kvwmap_pet_dev/custom/layouts/snippets/track_location.php',
              httpHeaders: {
                'X-FOO': 'bar'
              },
              // customize post properties
              postTemplate: {
                lat: '@latitude',
                lon: '@longitude'
              },
              maxLocations: 1000
            });
         
            BackgroundGeolocation.on('location', function(location) {
              // handle your locations here
              console.log('loc: %o', location);
              kvm.writeLog('event location: ' + location.time + ' ' + location.latitude + ' ' + location.longitude);
        
              // to perform long running operation on iOS
              // you need to create background task
        
              BackgroundGeolocation.startTask(function(taskKey) {
                console.log('BackgroundGeolocation startTask with taskKey: ', taskKey);
                // execute long running task
                // eg. ajax post location
        
                BackgroundGeolocation.headlessTask(function(event) {
                  console.log('event in headlessTask %o', event);
                  kvm.writeLog('run headlessTask with event params: ' + JSON.stringify(event.params));
                  if (event.name === 'location' || event.name === 'stationary') {
                    console.log('event.name: %s', event.name);
        
                    kvm.writeLog('event.name: ' + event.name);
        //            var xhr = new XMLHttpRequest();
        //            xhr.open('POST', 'https://gdi-service.de/kvwmap_pet_dev/custom/layouts/snippets/track_location.php');
        //            xhr.setRequestHeader('Content-Type', 'application/json');
        //            xhr.send(JSON.stringify(event.params));
                  }
                  else {
                    kvm.writeLog('location but stationary: ' + event.params.time + ' ' + event.params.latitude + ' ' + event.params.longitude);
                  }
                    kvm.writeLog('location but stationary: ' + event.params.time + ' ' + event.params.latitude + ' ' + event.params.longitude);
                  return 'Processing event: ' + event.name + ' params: ' + JSON.stringify(event.params); // will be logged
                });
        
                // IMPORTANT: task has to be ended by endTask
                BackgroundGeolocation.endTask(taskKey);
              });
        
            });
        
            BackgroundGeolocation.on('stationary', function(stationaryLocation) {
              // handle stationary locations here
              console.log('stationary: %o', stationaryLocation);
              kvm.writeLog('stationary: ' + stationaryLocation.time + ' ' + stationaryLocation.latitude + ' ' + stationaryLocation.longitude);
            });
         
            BackgroundGeolocation.on('error', function(error) {
              console.log('[ERROR] BackgroundGeolocation error:', error.code, error.message);
            });
        
            BackgroundGeolocation.on('start', function() {
              console.log('[INFO] BackgroundGeolocation service has been started');
            });
        
            BackgroundGeolocation.on('stop', function() {
              console.log('[INFO] BackgroundGeolocation service has been stopped');
            });
        
            BackgroundGeolocation.on('authorization', function(status) {
              console.log('[INFO] BackgroundGeolocation authorization status: ' + status);
              if (status !== BackgroundGeolocation.AUTHORIZED) {
                // we need to set delay or otherwise alert may not be shown
                setTimeout(function() {
                  var showSettings = confirm('App requires location tracking permission. Would you like to open app settings?');
                  if (showSetting) {
                    return BackgroundGeolocation.showAppSettings();
                  }
                }, 1000);
              }
            });
        
            BackgroundGeolocation.on('background', function() {
              console.log('[INFO] App is in background');
              // you can also reconfigure service (changes will be applied immediately)
              BackgroundGeolocation.configure({ debug: true });
              kvm.writeLog('go to background: ');
            });
        
            BackgroundGeolocation.on('foreground', function() {
              console.log('[INFO] App is in foreground');
              BackgroundGeolocation.configure({ debug: false });
              kvm.writeLog('go to foreground: ');
            });
        
            BackgroundGeolocation.on('abort_requested', function() {
              console.log('[INFO] Server responded with 285 Updates Not Required');
        
              // Here we can decide whether we want stop the updates or not.
              // If you've configured the server to return 285, then it means the server does not require further update.
              // So the normal thing to do here would be to `BackgroundGeolocation.stop()`.
              // But you might be counting on it to receive location updates in the UI, so you could just reconfigure and set `url` to null.
            });
        
            BackgroundGeolocation.on('http_authorization', () => {
              console.log('[INFO] App needs to authorize the http requests');
            });
        
            BackgroundGeolocation.checkStatus(function(status) {
              console.log('[INFO] BackgroundGeolocation service is running', status.isRunning);
              console.log('[INFO] BackgroundGeolocation services enabled', status.locationServicesEnabled);
              console.log('[INFO] BackgroundGeolocation auth status: ' + status.authorization);
        
              // you don't need to check status before start (this is just the example)
              if (!status.isRunning) {
        //        BackgroundGeolocation.start(); //triggers start on start event
              }
            });
        
            BackgroundGeolocation.getCurrentLocation(function(location) { console.log('loc: %o', location); }, function(fail) { console.log('fail: %o', fail); }, {});
        
          //  BackgroundGeolocation.getLocations(
          //    function (locations) {
          //      console.log(locations);
          //    }
          //  );
            //BackgroundGeolocation.getLogEntries(1000, 0, 'TRACE', function(entry) { console.log('log: %o', entry); }, function(fail) { console.log('log fail: %o', fail); })
        
            try {
              BackgroundGeolocation.start();
            }
            catch (e) {
              console.log('gestartet Fehler: %o', e);
            }
        */
        this.db = window.sqlitePlugin.openDatabase({
            name: config.dbname + '.db',
            location: 'default',
            androidDatabaseImplementation: 2
        }, function (db) {
            //kvm.log('Lokale Datenbank geöffnet.', 3);
            $('#dbnameText').html(config.dbname + '.db');
            //kvm.startApplication();
            FingerprintAuth.isAvailable(function (result) {
                console.log("FingerprintAuth available: " + JSON.stringify(result));
                // Check the docs to know more about the encryptConfig object
                var encryptConfig = {
                    clientId: "myAppName",
                    username: "currentUser",
                    password: "currentUserPassword",
                    maxAttempts: 5,
                    locale: "de_DE",
                    dialogTitle: "Authentifizierung mit Fingerabdruck",
                    dialogMessage: "Lege Finger auf den Sensor",
                    dialogHint: "Diese Methode ist nur Verfügbar mit Fingerabdrucksensor"
                }; // See config object for required parameters
                // Set config and success callback
                //https://www.npmjs.com/package/cordova-plugin-android-fingerprint-auth
                FingerprintAuth.encrypt(encryptConfig, function (_fingerResult) {
                    //console.log("successCallback(): " + JSON.stringify(_fingerResult));
                    if (_fingerResult.withFingerprint) {
                        //console.log("Successfully encrypted credentials.");
                        //console.log("Encrypted credentials: " + result.token);
                        kvm.startApplication();
                    }
                    else if (_fingerResult.withBackup) {
                        //console.log("Authenticated with backup password");
                        kvm.startApplication();
                    }
                    // Error callback
                }, function (err) {
                    if (err === "Cancelled") {
                        //console.log("FingerprintAuth Dialog Cancelled!");
                    }
                    else {
                        kvm.msg("FingerprintAuth Error: " + err, 'Fehler');
                    }
                });
            }, function (message) {
                //console.log("isAvailableError(): " + message);
                // TODO
                kvm.startApplication();
            });
        }, function (error) {
            kvm.msg('Open database ERROR: ' + JSON.stringify(error), 'Fehler');
        });
    },
    startApplication: function () {
        var activeView = 'featurelist';
        kvm.log('onDeviceReady', 4);
        this.dbPromise = idb.openDB('keyval-store', 1, {
            upgrade(db) {
                db.createObjectStore('keyval');
            },
        });
        this.readTile = function (key) {
            return __awaiter(this, void 0, void 0, function* () {
                return (yield this.dbPromise).get('keyval', key);
            });
        };
        this.saveTile = function (key, val) {
            return __awaiter(this, void 0, void 0, function* () {
                return (yield this.dbPromise).put('keyval', val, key);
            });
        };
        this.loadLogLevel();
        this.loadDeviceData();
        SyncStatus.load(this.store);
        this.setConnectionStatus();
        this.setGpsStatus();
        this.initConfigOptions();
        this.initMap();
        this.initColorSelector();
        this.initStatusFilter();
        this.initLocalBackupPath();
        if (this.store.getItem('activeStelleId')) {
            var activeStelleId = this.store.getItem('activeStelleId'), activeStelleSettings = this.store.getItem('stelleSettings_' + activeStelleId), stelle = new Stelle(activeStelleSettings);
            kvm.log('Aktive Stelle ' + activeStelleId + ' gefunden.', 3);
            stelle.viewSettings();
            stelle.setActive();
            /*
              Laden von Layern
              - Prüfen ob layerIds für die aktiveStelle registriert sind im store
              - Wenn ja aus store abfragen und für jede layerId folgendes ausführen:
                - Auslesen der layersettings
                - Layer Objekt erzeugen
                - Layer zur Layerliste, kvm.layers und Karte hinzufügen
                - Daten des Layer aus Datenbank abfragen und zeichnen
                - Wenn es der aktive Layer ist, aktiv schalten
            */
            if (this.store.getItem('layerIds_' + activeStelleId)) {
                // Auslesen der layersettings
                var layerIds = $.parseJSON(this.store.getItem('layerIds_' + activeStelleId));
                for (let layerId of layerIds) {
                    //console.log('Lade Layersettings for layerId: %s', layerId);
                    layerSettings = this.store.getItem('layerSettings_' + activeStelleId + '_' + layerId);
                    if (layerSettings != null) {
                        layer = new Layer(stelle, layerSettings);
                        layer.appendToApp();
                        if (this.store.getItem('activeLayerId') && this.store.getItem('activeLayerId') == layerId) {
                            console.log('layer: %s setActive', layer.get('alias'));
                            layer.setActive();
                        }
                        else {
                            console.log('layer: %s readData', layer.get('alias'));
                            layer.readData();
                        }
                        /*
                        // ToDo do not createTable instead attach schema database for layer if not exists
                        // before create LayerList();
                        //layer.createTable();
                        setTimeout(
                          function () {
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
                        */
                    }
                }
                // Prüfe ob Netz ist, wenn nicht lade die Overlays vom Store
                if (navigator.onLine) {
                    stelle.requestOverlays();
                }
                else {
                    var overlay, overlayIds = $.parseJSON(this.store.getItem('overlayIds_' + activeStelleId));
                    for (let overlayId of overlayIds) {
                        console.log('Lade OverlaySettings for overlayId: %s', overlayId);
                        overlaySettings = this.store.getItem('overlaySettings_' + activeStelleId + '_' + overlayId);
                        if (overlaySettings != null) {
                            overlay = new Overlay(stelle, overlaySettings);
                            kvm.overlays.push(overlay);
                            overlay.saveSettingsToStore(); // save layersettings to local storage
                            overlay.appendToApp();
                            overlay.addOverlayToMap(); // create the leaflet overlay and add to map
                            overlay.loadData();
                        }
                    }
                }
            }
            else {
                kvm.msg('Laden Sie die Stellen und Layer vom Server.');
                $('#newFeatureButton, #showDeltasButton').hide();
                activeView = 'settings';
                this.showSettingsDiv('server');
            }
        }
        else {
            kvm.msg('Wählen Sie eine Konfiguration aus und Stellen die Zugangsdaten zum Server ein.');
            var stelle = new Stelle('{}');
            stelle.viewDefaultSettings();
            activeView = 'settings';
            this.showSettingsDiv('server');
        }
        ;
        // ToDo
        //GpsStatus.load();
        //kvm.log('GPS Position geladen');
        kvm.log('Ereignisüberwachung eingerichtet.', 4);
        this.bindEvents();
        kvm.log('Liste der Datensätze angezeigt.', 4);
        this.showItem(activeView);
    },
    initConfigOptions: function () {
        $('#configFileDiv')
            .append($('<select>')
            .attr({
            id: 'configName',
            name: 'configName'
        })
            .change(function (evt) {
            var newVal = $(this).val();
            navigator.notification.confirm('Wollen Sie wirklich die Konfiguration ändern? Dabei gehen alle lokalen Änderungen verloren, die Layer und Einstellungen werden gelöscht und die Anwendung wird mit den Default-Werten der anderen Konfiguration neu gestartet!', function (buttonIndex) {
                if (buttonIndex == 2) {
                    $('#configName').val(kvm.store.getItem('configName'));
                }
                else {
                    kvm.setConfigOption(newVal);
                }
            }, 'Konfiguration', ['Ja', 'Abbruch']);
        }));
        configurations.map(function (c) {
            $('#configName')
                .append($('<option>')
                .attr({
                value: c.name,
            })
                .prop('selected', (c.name == kvm.store.getItem('configName')))
                .html(c.name));
        });
    },
    setConfigOption: function (configName) {
        this.store.clear();
        this.store.setItem('configName', configName);
        window.location.reload(true);
    },
    initMap: function () {
        kvm.log('Karte initialisieren.', 3);
        kvm.log('initialisiere Mapsettings', 3);
        this.initMapSettings();
        kvm.log('initialisiere backgroundLayers', 3);
        this.initBackgroundLayers();
        var crs25833 = new L.Proj.CRS('EPSG:25833', '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', {
            origin: [-464849.38, 6310160.14],
            resolutions: [16384, 8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1]
        });
        var map = L.map('map', {
            // crs: crs25833,
            editable: true,
            center: L.latLng(this.mapSettings.startCenterLat, this.mapSettings.startCenterLon),
            zoom: this.mapSettings.startZoom,
            minZoom: this.mapSettings.minZoom,
            maxZoom: this.mapSettings.maxZoom,
            layers: this.backgroundLayers[0]
        }), baseMaps = {};
        map.setMaxBounds(L.bounds(L.point(this.mapSettings.west, this.mapSettings.south), L.point(this.mapSettings.east, this.mapSettings.north)));
        for (var i = 0; i < this.backgroundLayers.length; i++) {
            baseMaps[this.backgroundLayerSettings[i].label] = this.backgroundLayers[i];
        }
        //    L.PM.initialize({ optIn: true });
        kvm.myRenderer = L.canvas({ padding: 0.5, tolerance: 7 });
        kvm.controls.layers = L.control.layers(baseMaps).addTo(map);
        kvm.controls.locate = L.control.locate({
            position: 'topright',
            keepCurrentZoomLevel: true,
            flyTo: true,
            strings: {
                title: "Zeig mir wo ich bin.",
                metersUnit: "Meter",
                popup: "Sie befinden sich im Umkreis von {distance} {unit}.",
                outsideMapBoundsMsg: "Sie sind außerhalb des darstellbaren Bereiches der Karte."
            }
        }).addTo(map);
        kvm.controls.betterscale = L.control.betterscale({
            metric: true
        }).addTo(map);
        kvm.controls.trackControl = L.easyButton({
            id: 'trackControl',
            position: 'topright',
            leafletClasses: true,
            states: [{
                    stateName: 'track-aufzeichnen',
                    icon: 'fa-circle',
                    title: 'Track aufzeichnen',
                    onClick: function (btn, map) {
                        navigator.notification.confirm('Wie möchten Sie fortfahren?', function (buttonIndex) {
                            var lastLatlng = kvm.activeLayer.activeFeature.getWaypoint('last');
                            if (buttonIndex == 1) {
                                console.log('Vorhandenen Track löschen und neu beginnen.');
                                // Editierbarkeit ausschalten
                                kvm.activeLayer.activeFeature.editableLayer.disableEdit();
                                // LatLngs zurücksetzen
                                kvm.activeLayer.activeFeature.editableLayer.setLatLngs([]);
                                // Tracking einschalten (latlngs hinzufügen auch im Hintergrund, wenn das Display aus ist.)
                                kvm.controller.mapper.startGpsTracking(lastLatlng);
                                btn.state('track-aufnahme');
                            }
                            else if (buttonIndex == 2) {
                                console.log('Vorhandenen Track weiterzeichnen.');
                                // Editierbarkeit ausschalten
                                kvm.activeLayer.activeFeature.editableLayer.disableEdit();
                                // Tracking einschalten (latlngs hinzufügen)
                                kvm.controller.mapper.startGpsTracking(lastLatlng);
                                btn.state('track-aufnahme');
                            }
                            else {
                                console.log('Abbruch');
                            }
                        }, 'GPS-Track aufzeichnen.', ['Löschen und neu beginnen', 'An Linie anhängen', 'Abbrechen']);
                    }
                }, {
                    stateName: 'track-aufnahme',
                    icon: 'fa-pause',
                    title: 'Track unterbrechen',
                    onClick: function (btn, map) {
                        navigator.notification.confirm('Wie möchten Sie fortfahren?', function (buttonIndex) {
                            if (buttonIndex == 1) {
                                console.log('Aufnahme beenden.');
                                // Tracking ausschalten
                                navigator.geolocation.clearWatch(kvm.controller.mapper.watchId);
                                // Track als Geometrie vom Feature übernehmen
                                //Editierbarkeit einschalten.
                                kvm.activeLayer.activeFeature.editableLayer.enableEdit();
                                btn.state('track-aufzeichnen');
                            }
                            else if (buttonIndex == 2) {
                                console.log('Aufnahme unterbrechen.');
                                // Tracking ausschalten
                                navigator.geolocation.clearWatch(kvm.controller.mapper.watchId);
                                btn.state('track-pause');
                            }
                            else {
                                console.log('Abbruch');
                            }
                        }, 'GPS-Track aufzeichnen.', ['Aufnahme beenden', 'Aufnahme unterbrechen', 'Abbrechen']);
                    }
                }, {
                    stateName: 'track-pause',
                    icon: 'fa-play',
                    title: 'Aufnahme fortsetzen',
                    onClick: function (btn, map) {
                        navigator.notification.confirm('Wie möchten Sie fortfahren?', function (buttonIndex) {
                            var lastLatlng = kvm.activeLayer.activeFeature.getWaypoint('last');
                            if (buttonIndex == 1) {
                                console.log('Aufnahme beenden.');
                                // Tracking ausschalten
                                navigator.geolocation.clearWatch(kvm.controller.mapper.watchId);
                                // Track als Geometrie vom Feature übernehmen
                                //Editierbarkeit einschalten.
                                kvm.activeLayer.activeFeature.editableLayer.enableEdit();
                                btn.state('track-aufzeichnen');
                            }
                            else if (buttonIndex == 2) {
                                console.log('Aufnahme fortsetzen.');
                                // Tracking einschalten
                                kvm.controller.mapper.startGpsTracking(lastLatlng);
                                btn.state('track-aufnahme');
                            }
                            else {
                                console.log('Abbruch');
                            }
                        }, 'GPS-Track aufzeichnen.', ['Aufnahme beenden', 'Aufnahme fortsetzen', 'Abbrechen']);
                    }
                }]
        }).addTo(map);
        $('#trackControl').parent().hide();
        this.map = map;
    },
    initColorSelector: function () {
        var markerStyles;
        if (!(markerStyles = JSON.parse(kvm.store.getItem('markerStyles')))) {
            markerStyles = config.markerStyles;
            kvm.store.setItem('markerStyles', JSON.stringify(markerStyles));
        }
        Object.values(markerStyles).forEach(this.addColorSelector);
    },
    initStatusFilter: function () {
        var statusFilter = kvm.store.getItem('statusFilter');
        if (statusFilter) {
            $('#statusFilterSelect').val(statusFilter);
        }
    },
    initLocalBackupPath: function () {
        var localBackupPath;
        if (!(localBackupPath = kvm.store.getItem('localBackupPath'))) {
            localBackupPath = config.localBackupPath;
            kvm.store.setItem('localBackupPath', localBackupPath);
        }
        $('#localBackupPath').val(localBackupPath);
    },
    initMapSettings: function () {
        if (!(this.mapSettings = JSON.parse(kvm.store.getItem('mapSettings')))) {
            this.saveMapSettings(config.mapSettings);
        }
        $('#newPosSelect').val(this.mapSettings.newPosSelect);
        $('#mapSettings_west').val(this.mapSettings.west);
        $('#mapSettings_south').val(this.mapSettings.south);
        $('#mapSettings_east').val(this.mapSettings.east);
        $('#mapSettings_north').val(this.mapSettings.north);
        $('#mapSettings_minZoom').val(this.mapSettings.minZoom);
        $('#mapSettings_maxZoom').val(this.mapSettings.maxZoom);
        $('#mapSettings_startZoom').val(this.mapSettings.startZoom);
        $('#mapSettings_startCenterLat').val(this.mapSettings.startCenterLat);
        $('#mapSettings_startCenterLon').val(this.mapSettings.startCenterLon);
    },
    saveMapSettings: function (mapSettings) {
        this.mapSettings = mapSettings;
        kvm.store.setItem('mapSettings', JSON.stringify(mapSettings));
    },
    initBackgroundLayers: function () {
        this.saveBackgroundLayerSettings(config.backgroundLayerSettings);
        $('#backgroundLayersTextarea').val(kvm.store.getItem('backgroundLayerSettings'));
        this.backgroundLayers = [];
        for (var i = 0; i < this.backgroundLayerSettings.length; ++i) {
            this.backgroundLayers.push(this.createBackgroundLayer(this.backgroundLayerSettings[i]));
        }
    },
    saveBackgroundLayerSettings: function (backgroundLayerSettings) {
        this.backgroundLayerSettings = backgroundLayerSettings;
        kvm.store.setItem('backgroundLayerSettings', JSON.stringify(backgroundLayerSettings));
    },
    createBackgroundLayer: function (backgroundLayerSetting) {
        if (backgroundLayerSetting.type == 'tile') {
            return L.tileLayer(backgroundLayerSetting.url, backgroundLayerSetting.params);
        }
        else if (backgroundLayerSetting.type == 'vectortile') {
            //      return L.vectorGrid.protobuf(backgroundLayerSetting.url, backgroundLayerSetting.params);
            return L.maplibreGL({
                style: maplibreStyleObj,
                interactive: backgroundLayerSetting.interactiv
            });
        }
        else {
            //backgroundLayerSetting.type == 'wms'
            return L.tileLayer.wms(backgroundLayerSetting.url, backgroundLayerSetting.params);
        }
    },
    addColorSelector: function (style, i) {
        var colorSelectorDiv = $('#colorSelectorDiv');
        colorSelectorDiv.append('\
      <label for="colorStatus' + i + '">Status ' + i + ':</label>\
      <input type="color" id="colorStatus' + i + '" name="colorStatus' + i + '" value="' + style.fillColor + '" onChange="kvm.updateMarkerStyle(this)"><br>\
    ');
    },
    updateMarkerStyle: function (elm) {
        //console.log('new Color: %o', elm);
        var markerStyles = JSON.parse(kvm.store.getItem('markerStyles')), index = elm.id.slice(-1);
        markerStyles[index].fillColor = elm.value;
        kvm.store.setItem('markerStyles', JSON.stringify(markerStyles));
        if (kvm.activeLayer)
            kvm.activeLayer.readData($('#limit').val(), $('#offset').val());
    },
    bindEvents: function () {
        document.addEventListener("backbutton", function () {
            navigator.notification.confirm('Anwendung schließen?', function (buttonIndex) {
                if (buttonIndex == 1) { // ja
                    navigator.app.exitApp();
                }
                if (buttonIndex == 2) { // nein
                    // do nothing
                    // evtl. mal so etwas wie navigator.app.backHistory();
                }
            }, '', ['ja', 'nein']);
        }, false);
        document.addEventListener("offline", this.setConnectionStatus, false);
        document.addEventListener("online", this.setConnectionStatus, false);
        document.addEventListener("dataLoaded", function () {
            if (kvm.featureListLoaded &&
                kvm.layerDataLoaded) {
                $('#sperr_div').hide();
            }
        }, false);
        $('.h2-div').on('click', function (evt) {
            var h2 = $(evt.target), h2div = h2.parent(), collapsed = h2.hasClass('b-collapsed');
            kvm.collapseAllSettingsDiv();
            if (collapsed) {
                h2.toggleClass('b-collapsed b-expanded');
                h2div.next().toggle();
                if (h2.prop('id') == 'h2_update') {
                    $('#settings').scrollTop(h2.offset().top);
                }
            }
        });
        $('#showFormEdit').on('click', function () {
            kvm.showItem('formular');
        });
        $('#showMapEdit').on('click', function () {
            kvm.showItem('mapEdit');
        });
        $('#showSettings').on('click', function () {
            kvm.showItem('settings');
        });
        $('#requestStellenButton').on('click', function () {
            if ($('#kvwmapServerUrlField').val() != '' && $('#kvwmapServerLoginNameField').val() != '' && $('#kvwmapServerPasswortField').val() != '') {
                $('#sperr_div').show();
                var stelle = new Stelle({
                    url: $('#kvwmapServerUrlField').val(),
                    login_name: $('#kvwmapServerLoginNameField').val(),
                    passwort: $('#kvwmapServerPasswortField').val()
                });
                console.log('Stellenobjekt erzeugt um Stellen abfragen zu können: ' + JSON.stringify(stelle));
                kvm.log('Stellenobjekt erzeugt um Stellen abfragen zu können: ' + JSON.stringify(stelle), 4);
                stelle.requestStellen();
            }
            else {
                kvm.msg('Sie müssen erst die Server URL, Nutzername und Password angeben!');
            }
        });
        $('#kvwmapServerStelleSelectField').on('change', function () {
            if ($('#saveServerSettingsButton').hasClass('settings-button')) {
                $('#saveServerSettingsButton').toggleClass('settings-button settings-button-active');
            }
            $('#saveServerSettingsButton').show();
        });
        $('#requestLayersButton').on('click', function () {
            $('#sperr_div').show();
            kvm.activeStelle.requestLayers();
        });
        $('#saveServerSettingsButton').on('click', function () {
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
            if (kvm.activeLayer) {
                kvm.activeLayer.stelle = stelle;
            }
            stelle.setActive();
            if ($('#saveServerSettingsButton').hasClass('settings-button-active')) {
                $('#saveServerSettingsButton').toggleClass('settings-button settings-button-active');
            }
            if (navigator.onLine) {
                kvm.showSettingsDiv('layer');
                $('#requestLayersButton').show();
            }
            else {
                kvm.msg('Stellen Sie eine Netzverbindung her zum Laden der Layer und speichern Sie noch mal die Servereinstellungen.');
            }
        });
        $('.mapSetting').on('change', function () {
            kvm.mapSettings[this.name] = this.value;
            kvm.saveMapSettings(kvm.mapSettings);
        });
        $('#mapSettings_maxZoom').on('change', function () {
            kvm.map.setMaxZoom(this.value);
            kvm.msg('maximale Zoomstufe auf ' + this.value + ' begrenzt!', 'Karteneinstellung');
        });
        $('#mapSettings_minZoom').on('change', function () {
            kvm.map.setMinZoom(this.value);
            kvm.msg('minimale Zoomstufe auf ' + this.value + ' begrenzt!', 'Karteneinstellung');
        });
        $('#mapSettings_west, #mapSettings_south, #mapSettings_east, #mapSettings_north').on('change', function () {
            kvm.map.setMaxBounds(L.bounds(L.point($('#mapSettings_west').val(), $('#mapSettings_south').val()), L.point($('#mapSettings_east').val(), $('#mapSettings_north').val())));
            kvm.msg('max Boundingbox geändert!', 'Karteneinstellung');
        });
        $('#logLevel').on('change', function () {
            config.logLevel = $('#logLevel').val();
            kvm.store.setItem('logLevel', config.logLevel);
            kvm.msg('Protokollierungsstufe geändert!', 'Protokollierung');
        });
        $('#backgroundLayerOnline_url, #backgroundLayerOnline_type, #backgroundLayerOnline_layers').on('change', function () {
            kvm.msg('Speichern noch nicht implementiert');
            //kvm.map.setBackgroundLayerOnline();
        });
        $('#resetBackgroundLayerSettingsButton').on('click', function () {
            kvm.saveBackgroundLayerSettings(config.backgroundLayerSettings);
            kvm.msg('Einstellung zu Hintergrundlayern aus config Datei erfolgreich wiederhergestellt.');
        });
        $('localBackupPath').on('change', function () {
            kvm.store.setItem('localBackupPath', this.val());
        });
        $('#saveDatabaseButton').on('click', function () {
            navigator.notification.prompt('Geben Sie einen Namen für die Sicherungsdatei an. Die Datenbank wird im Internen Speicher im Verzeichnis ' + kvm.store.getItem('localBackupPath') + ' mit der Dateiendung .db gespeichert. Ohne Eingabe wird der Name "Sicherung_" + aktuellem Zeitstempel + ".db" vergeben.', function (arg) {
                if (arg.input1 == '') {
                    arg.input1 = 'Sicherung_' + kvm.now();
                }
                kvm.controller.files.copyFile('file:///data/user/0/de.gdiservice.kvmobile/databases/', 'kvmobile.db', kvm.store.getItem('localBackupPath'), arg.input1 + '.db');
            }, 'Datenbanksicherung');
        });
        $('#showDeltasButton').on('click', { context: this }, function (evt) {
            kvm.log('Delta anzeigen.', 3);
            var this_ = evt.data.context, sql = "\
              SELECT\
                * \
              FROM\
                " + this_.activeLayer.get('schema_name') + '_' + this_.activeLayer.get('table_name') + "_deltas\
            ";
            $('#showDeltasButton').hide();
            $('#showDeltasWaiting').show();
            this_.db.executeSql(sql, [], function (rs) {
                var numRows = rs.rows.length, item, i;
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
            }, function (error) {
                kvm.log('Fehler in bei Abfrage der Deltas: ' + JSON.stringify(error), 1);
                alert('Fehler beim Zugriff auf die Datenbank');
            });
        });
        $('#hideDeltasButton').on('click', function () {
            $('#hideDeltasButton').hide();
            $('#showDeltasDiv').hide();
            $('#showDeltasButton').show();
        });
        $('#showLoggingsButton').on('click', function () {
            kvm.showItem('loggings');
        });
        $('#clearLoggingsButton').on('click', function () {
            $('#logText').html('Log geleert: ' + new Date().toUTCString());
            kvm.showItem('loggings');
        });
        /*
        * Bricht Änderungen im Formular ab,
        * - läd das Feature neu in das Formular im Anzeigemodus
        * - Löscht die editable Geometrie in der Karte
        * - setzt saveFeatureButton wieder auf inactiv
        */
        $('#cancelFeatureButton').on('click', { context: this }, function (evt) {
            console.log('cancelFeatureButton geklickt.');
            var this_ = evt.data.context;
            navigator.notification.confirm('Änderungen verwerfen?', function (buttonIndex) {
                console.log('Änderungen verwerfen.');
                var activeFeature = this_.activeLayer.activeFeature, featureId = activeFeature.id;
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
                        this_.activeLayer.loadFeatureToForm(activeFeature, { editable: false }); // Formular mit ursprünglichen Daten laden
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
            }, 'Formular', ['ja', 'nein']);
        });
        $('#statusFilterSelect').on('change', function (evt) {
            kvm.store.setItem('statusFilter', $('#statusFilterSelect').val());
            kvm.activeLayer.readData($('#limit').val(), $('#offset').val());
        });
        $('#toggleFilterDivButton').on('click', function () {
            $('#filterDiv').toggle();
            $('#toggleFilterDivButton').val(($('#toggleFilterDivButton').val() == 'mehr' ? 'weniger' : 'mehr'));
        });
        $('#runFilterButton').on('click', function () {
            kvm.store.setItem('layerFilter', JSON.stringify(kvm.composeLayerFilter()));
            kvm.activeLayer.readData($('#limit').val(), $('#offset').val());
        });
        $('#anzeigeSortSelect').on('change', function (evt) {
            kvm.store.setItem('sortAttribute', $('#anzeigeSortSelect').val());
            kvm.activeLayer.readData($('#limit').val(), $('#offset').val());
        });
        $('#deleteFeatureButton').on('click', function (evt) {
            kvm.log('Klick auf deleteFeatureButton.', 4);
            if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) == 2) {
                navigator.notification.confirm('Datensatz wirklich Löschen?', function (buttonIndex) {
                    if (buttonIndex == 1) { // ja
                        kvm.log('Lösche Feature uuid: ' + kvm.activeLayer.activeFeature.get('uuid'), 3);
                        kvm.controller.mapper.clearWatch();
                        kvm.activeLayer.runDeleteStrategy();
                        kvm.activeLayer.createImgDeltas($.map(kvm.activeLayer.getDokumentAttributeNames(), function (name) {
                            return {
                                "key": name,
                                "value": ''
                            };
                        }));
                    }
                    if (buttonIndex == 2) { // nein
                        // do nothing
                    }
                }, 'Datenbank', ['ja', 'nein']);
            }
            else {
                navigator.notification.confirm('Sie haben nicht das Recht zum Löschen von Datensätzen in diesem Layer!', function (buttonIndex) {
                }, 'Datenbank', ['habe Verstanden']);
            }
        });
        $('#saveFeatureButton').on('click', function (evt) {
            var saveButton = $(evt.target), changes = {}, delta = '', errMsg = '';
            if ($('#featureFormular input[name=' + kvm.activeLayer.id_attribute + ']').val()) {
                var notNullErrMsg = kvm.activeLayer.notNullValid();
                if (notNullErrMsg == '') {
                    navigator.notification.confirm('Datensatz Speichern?', function (buttonIndex) {
                        var action = (kvm.activeLayer.activeFeature.options.new ? 'insert' : 'update'), activeFeature = kvm.activeLayer.activeFeature, editableLayer = kvm.activeLayer.activeFeature.editableLayer;
                        kvm.log('Action: ' + action, 4);
                        if (buttonIndex == 1) { // ja
                            kvm.log('Speichern', 3);
                            if (activeFeature.options.geometry_type == 'Line') {
                                var speichern = true;
                                if (activeFeature.layerId) {
                                    speichern = kvm.map._layers[activeFeature.layerId].getLatLngs() != editableLayer.getLatLngs();
                                }
                                if (speichern) {
                                    editableLayer.fireEvent('isChanged', editableLayer.getLatLngs());
                                }
                            }
                            if (action == 'insert') {
                                kvm.activeLayer.runInsertStrategy();
                            }
                            else {
                                kvm.activeLayer.runUpdateStrategy();
                            }
                            //kvm.showGeomStatus();
                        }
                        if (buttonIndex == 2) { // nein
                            // Do nothing
                        }
                    }, 'Datenbank', ['ja', 'nein']);
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
        });
        $('#kvwmapServerDataForm > input').on('keyup', function () {
            if ($('#saveServerSettingsButton').hasClass('settings-button')) {
                $('#saveServerSettingsButton').toggleClass('settings-button settings-button-active');
            }
        });
        $('#showFeatureList').click(function () {
            kvm.showItem('featurelist');
        });
        $("#showFeatureList").mouseover(function () {
            $("#showFeatureList_button").hide();
            $("#showFeatureList_button_white").show();
        });
        $("#showFeatureList").mouseleave(function () {
            $("#showFeatureList_button").show();
            $("#showFeatureList_button_white").hide();
        });
        $('#newFeatureButton').on('click', function () {
            kvm.activeLayer.newFeature();
            kvm.activeLayer.editFeature();
            //kvm.showGeomStatus();
        });
        $('#tplFeatureButton').on('click', function () {
            var tplId = kvm.activeLayer.activeFeature.id;
            kvm.activeLayer.newFeature();
            kvm.activeLayer.editFeature();
            kvm.activeLayer.loadTplFeatureToForm(tplId);
            //kvm.showGeomStatus();
        });
        /*
        * Läd das Formular im Editiermodus
        */
        $('#editFeatureButton').on('click', { "context": this }, function (evt) {
            var this_ = evt.data.context, featureId = this_.activeLayer.activeFeature.id, feature = this_.activeLayer.features[featureId];
            kvm.activeLayer.editFeature();
            //kvm.activeLayer.editGeometry(featureId); # von dev-3 ToDo vergl. editFeature und editGeometry
        });
        $('#restoreFeatureButton').on('click', function () {
            navigator.notification.confirm('Wollen Sie den Datensatz wiederherstellen? Ein vorhandener mit der gleichen uuid wird dabei überschrieben!', function (buttonIndex) {
                if (buttonIndex == 1) { // ja
                    $('#sperr_div_content').html('Wiederherstellung von Datensätzen ist noch nicht implementiert!');
                    kvm.activeLayer.runRestoreStrategy();
                    $('#sperr_div').show();
                    setTimeout(function () {
                        $('#sperr_div').hide();
                    }, 3000);
                }
                else {
                    $('#sperr_div').hide();
                }
            }, 'Datensatz wiederherstellen', ['ja', 'nein']);
        });
        /* Clientside Filter according to http://stackoverflow.com/questions/12433835/client-side-searching-of-a-table-with-jquery */
        /*** Search Haltestelle ***/
        $("#searchHaltestelle").on("keyup paste change search", function () {
            var needle = $(this).val().toLowerCase(), haystack = $(".feature-item");
            haystack.each(function (index) {
                $(this).html().toLowerCase().indexOf(needle) > -1 ? $(this).show() : $(this).hide();
            });
        });
        $("#geoLocationButton").on('click', kvm.getGeoLocation);
        $('#cameraOptionsQualitySlider').on('input', function () {
            $('#cameraOptionsQuality').html(this.value);
        });
        $('#minTrackDistanceSlider').on('input', function () {
            $('#minTrackDistance').html(this.value);
        });
        $('#fillOpacitySlider').on('input', function () {
            var newOpacity = this.value / 10, markerStyles = JSON.parse(kvm.store.getItem('markerStyles'));
            //console.log('New fillOpacity: ', newOpacity);
            $('#fillOpacitySpan').html(newOpacity);
            for (var index in markerStyles) {
                markerStyles[index].fillOpacity = newOpacity;
            }
            kvm.store.setItem('markerStyles', JSON.stringify(markerStyles));
        });
        $('#resetSettingsButton').on('click', function () {
            navigator.notification.confirm('Alle lokalen Daten, Änderungen und Einstellungen wirklich Löschen?', function (buttonIndex) {
                if (buttonIndex == 1) { // ja
                    if (kvm.layers.length == 0) {
                        kvm.msg('Keine Daten und Layer zum löschen vorhanden.');
                    }
                    else {
                        kvm.layers.forEach(function (layer) {
                            console.log('Entferne Layer: %s', layer.get('title'));
                            layer.clearData();
                        });
                    }
                }
                if (buttonIndex == 2) { // nein
                    // Do nothing
                }
                kvm.layers = [];
                $('#layer_list').html('');
                kvm.activeLayer = kvm.activeStelle = kvm.store = {};
                window.localStorage.clear();
                kvm.msg("Fertig!\nStarten Sie die Anwendung neu und fragen Sie die Stelle und Layer unter Einstellungen neu ab.", 'Reset Datenbank und Einstellungen');
            }, '', ['ja', 'nein']);
        });
        $('#downloadBackgroundLayerButton').on('click', function (evt) {
            navigator.notification.confirm('Alle Vektorkacheln vom Gebiet LK-EE herunterladen? Vergewissern Sie sich, dass Sie in einem Netz mit guter Anbindung sind.', function (buttonIndex) {
                if (buttonIndex == 1) { // ja
                    kvm.msg('Ich beginne mit dem Download der Kacheln.', 'Kartenverwaltung');
                    // hide the button and show a progress div
                    // find p1, p2 and zoom levels to fetch data in layer configuration
                    // get urls for vector tiles to download
                    // download the files in background and update the progress div
                    // confirm the finish
                    // hide the progress div and show the delete and update button
                    var bl = config.backgroundLayerSettings.filter(function (l) { return (l.type == 'vectortile' && l.label == 'Vektorkacheln offline'); })[0], params = bl.params, key;
                    //console.log('Fetch vector tiles for p1: %s,%s p2: %s,%s', params.south, params.west, params.north, params.east);
                    for (var z = params.minZoom; z <= params.maxZoom; z++) {
                        //console.log('Zoom level: %s', z);
                        kvm.getTilesUrls(L.latLng(params.south, params.west), L.latLng(params.north, params.east), z, bl.url).forEach(function (url) {
                            //console.log('url: %s', url);
                            const key = kvm.getTileKey(url);
                            fetch(url).then(t => {
                                t.arrayBuffer().then(arr => {
                                    kvm.saveTile(key, arr.slice(0));
                                    //console.info('Tile saved to DB');
                                });
                            });
                        });
                    }
                    kvm.msg('Fertig.', 'Kartenverwaltung');
                }
                if (buttonIndex == 2) { // nein
                    kvm.msg('OK, Abbruch.', 'Kartenverwaltung');
                }
            }, 'Kartenverwaltung', ['ja', 'nein']);
        });
    },
    bindFeatureItemClickEvents: function () {
        kvm.log('bindFeatureItemClickEvents', 4);
        $(".feature-item").on('click', kvm.featureItemClickEventFunction);
    },
    featureItemClickEventFunction: function (evt) {
        kvm.log('Öffne DataView für Feature ' + kvm.activeLayer.features[evt.target.getAttribute('id')], 4);
        kvm.activeLayer.selectFeature(kvm.activeLayer.features[evt.target.getAttribute('id')]);
        kvm.activeLayer.loadFeatureToView(kvm.activeLayer.activeFeature, { editable: false });
        kvm.showItem('dataView');
    },
    setConnectionStatus: function () {
        kvm.log('setConnectionStatus');
        NetworkStatus.load();
    },
    setGpsStatus: function () {
        kvm.log('setGpsStatus');
        GpsStatus.load();
    },
    hideSperrDiv: function () {
    },
    loadLogLevel: function () {
        kvm.log('Lade LogLevel', 4);
        var logLevel = kvm.store.getItem('logLevel');
        if (logLevel == null) {
            logLevel = config.logLevel;
            kvm.store.setItem('logLevel', logLevel);
        }
        $('#logLevel').val(logLevel);
    },
    loadDeviceData: function () {
        kvm.log('loadDeviceData', 4);
        $('#deviceDataText').html('kvmobile Version: ' + kvm.version + '<br>' +
            'Cordova Version: ' + device.cordova + '<br>' +
            'Modell: ' + device.model + '<br>' +
            'Platform: ' + device.platform + '<br>' +
            'Uuid: ' + device.uuid + '<br>' +
            'Android Version: ' + device.version + '<br>' +
            'Hersteller: ' + device.manufacturer + '<br>' +
            'Seriennummer: ' + device.serial);
    },
    showItem: function (item) {
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
                if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) == 2 && !kvm.activeLayer.activeFeature.options.new) {
                    $('#deleteFeatureButton').show();
                }
                $("#map").show();
                kvm.map.invalidateSize();
                kvm.map.zoomOut();
                kvm.map.zoomIn();
                break;
            case "dataView":
                $(".menu-button").hide();
                $("#showSettings, #showFeatureList, #showMap").show();
                if ($('#historyFilter').is(':checked')) {
                    $('#restoreFeatureButton').show();
                }
                else {
                    $('#editFeatureButton, #tplFeatureButton').show();
                }
                $("#dataView").show().scrollTop(0);
                break;
            case "formular":
                $(".menu-button").hide();
                $("#showMapEdit, #saveFeatureButton, #saveFeatureButton, #cancelFeatureButton").show();
                if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) == 2 && !kvm.activeLayer.activeFeature.options.new) {
                    $('#deleteFeatureButton').show();
                }
                $("#formular").show().scrollTop(0);
                break;
            default:
                kvm.showDefaultMenu();
                $("#settings").show();
        }
    },
    collapseAllSettingsDiv: function () {
        $('.h2-div > h2').removeClass('b-expanded').addClass('b-collapsed');
        $('.h2-div + div').hide();
    },
    expandAllSettingsDiv: function () {
        $('.h2-div > h2').removeClass('b-collapsed').addClass('b-expanded'),
            $('.h2-div + div').show();
    },
    hideSettingsDiv: function (name) {
        var target = $('.h2_' + name);
        this.collapseAllSettingsDiv();
        target.removeClass('b-expanded').addClass('b-collapsed');
        target.parent().next().hide();
    },
    showSettingsDiv: function (name) {
        var target = $('#h2_' + name);
        this.collapseAllSettingsDiv();
        target.removeClass('b-collapsed').addClass('b-expanded');
        target.parent().next().show();
        $('#settings').scrollTop(target.offset().top);
    },
    showDefaultMenu: function () {
        $(".menu-button").hide();
        //  $("#backArrow, #saveFeatureButton, #deleteFeatureButton, #backToFormButton").hide();
        $("#showSettings, #showFeatureList, #showMap, #newFeatureButton").show();
        if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) > 0)
            $('#newFeatureButton').show();
    },
    showFormMenu: function () {
        $(".menu-button").hide();
        $("#showFeatureList, #showMap, #saveFeatureButton").show();
        if (kvm.activeLayer && parseInt(kvm.activeLayer.get('privileg')) == 2) {
            $('#deleteFeatureButton').show();
        }
    },
    getGeoLocation: function () {
        navigator.geolocation.getCurrentPosition(kvm.getGeoLocationOnSuccess, kvm.getGeoLocationOnError);
    },
    getGeoLocationOnSuccess: function (geoLocation) {
        $('#geoLocation').val(geoLocation.coords.latitude + ' ' + geoLocation.coords.longitude);
    },
    getGeoLocationOnError: function (error) {
        alert('Fehler: ' + error.code + ' ' + error.message);
    },
    synchronize: function (context) {
        kvm.log('function synchronize');
        var url = context.getSyncUrl();
    },
    /*
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
    */
    paginate: function (evt) {
        var limit = 25, target = $(evt), page = parseInt(target.attr('page')), prevPage = page - limit;
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
    replacePassword: function (s) {
        if (kvm.activeStelle) {
            return s.replace(kvm.activeStelle.settings.passwort, 'secretPwFromStelleSetting');
        }
        else {
            return s.replace($('#kvwmapServerPasswortField').val(), 'secretPwFromForm');
        }
    },
    uuidv4: function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    log: function (msg, level = 3, show_in_sperr_div = false) {
        if (level <= (typeof kvm.store == 'undefined' ? config.logLevel : kvm.store.getItem('logLevel')) && (typeof msg === 'string' || msg instanceof String)) {
            msg = this.replacePassword(msg);
            if (config.debug) {
                console.log('Log msg: ' + msg);
            }
            setTimeout(function () {
                $('#logText').append('<br>' + msg);
                if (show_in_sperr_div) {
                    $('#sperr_div_content').html(msg);
                }
            });
        }
    },
    alog: function (msg, arg = '', level = 3, show_in_sperr_div = false) {
        if (level <= config.logLevel) {
            msg = this.replacePassword(msg);
            if (config.debug) {
                var e = new Error();
                if (!e.stack)
                    try {
                        // IE requires the Error to actually be thrown or else the 
                        // Error's 'stack' property is undefined.
                        throw e;
                    }
                    catch (e) {
                        if (!e.stack) {
                            //return 0; // IE < 10, likely
                        }
                    }
                var stack = e.stack.toString().split(/\r\n|\n/);
                if (msg === '') {
                    msg = '""';
                }
                if (arg != '') {
                    console.log('Log msg: ' + msg, arg);
                }
                else {
                    console.log('Log msg: ' + msg);
                }
            }
            setTimeout(function () {
                $('#logText').append('<br>' + msg);
                if (show_in_sperr_div) {
                    $('#sperr_div_content').html(msg);
                }
            });
        }
    },
    msg: function (msg, title = '') {
        navigator.notification.confirm(msg, function (buttonIndex) {
        }, title, ['ok']);
    },
    deb: function (msg) {
        $('#debText').append('<p>' + msg);
        //$(document).scrollBottom($('#debText').offset().bottom);
        if ($('#show_allways_debug_messages').is(':checked')) {
            $('#debugs').show();
        }
    },
    coalesce: function () {
        var i, undefined, arg;
        for (i = 0; i < arguments.length; i++) {
            arg = arguments[i];
            if (arg !== 'null' &&
                arg !== null &&
                arg !== undefined && (typeof arg !== 'number' ||
                arg.toString() !== 'NaN')) {
                return arg;
            }
        }
        return null;
    },
    coalempty: function () {
        var i, undefined, arg;
        for (i = 0; i < arguments.length; i++) {
            arg = arguments[i];
            if (arg !== '' &&
                arg !== 'null' &&
                arg !== null &&
                arg !== undefined && (typeof arg !== 'number' ||
                arg.toString() !== 'NaN')) {
                return arg;
            }
        }
        return null;
    },
    isValidJsonString: function (str) {
        try {
            JSON.parse(str.trim());
        }
        catch (e) {
            return false;
        }
        return true;
    },
    parseLayerResult: function (layerResult) {
        kvm.log('Starte parseLayerResult', 4);
        var resultObj = {
            "success": false
        };
        if (layerResult.indexOf('form name="login"') > -1) {
            kvm.log('form name="login" gefunden!', 4);
            resultObj.errMsg = 'Zugang zum Server verweigert! Prüfen Sie Ihre Zugangsdaten unter Einstellungen.';
            return resultObj;
        }
        if (!kvm.isValidJsonString(layerResult)) {
            kvm.log('Das Ergebnis der Layerdatenanfrage ist kein JSON!', 4);
            resultObj.errMsg = "Fehler beim Abfragen der Layerdaten. Abfrage liefert keine korrekten Daten vom Server. Entweder sind keine auf dem Server vorhanden, die URL der Anfrage ist nicht korrekt oder der es wird eine Fehlermeldung vom Server geliefert statt der Daten.\nURL der Anfrage:\n" + kvm.activeStelle.getLayerUrl({ hidePassword: true }) + "\nZurückgelieferte Result:\n" + layerResult;
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
    hasFilePath: function (file, path) {
        var fileDir = (file.match(/(.*)[\/\\]/)[1] || '/') + '/';
        return fileDir == path;
    },
    /*
    * Remove first and last caracter from string
    * in this class used to remove the braces {...} from array values
    * but can be used also for all other enclosing character
    */
    removeBraces: function (val) {
        kvm.log('kvm.removeBraces ' + val, 4);
        var result = val.substring(1, val.length - 1);
        return result;
    },
    /*
    * Add braces around the value to make an array
    */
    addBraces: function (val) {
        kvm.log('kvm.addBraces ' + val, 4);
        var result = '{' + val + '}';
        return result;
    },
    /*
    * Remove the part with original name of image in val
    * Return the first part before & delimiter
    */
    removeOriginalName: function (val) {
        kvm.log('kvm.removeOriginalName: ' + val, 4);
        return val.split('&').shift();
    },
    /*
    * Replace server image path by local image path
    */
    serverToLocalPath: function (src) {
        var result = config.localImgPath + src.substring(src.lastIndexOf('/') + 1);
        kvm.log('kvm.serverToLocalPath convert: ' + src + ' to: ' + result, 4);
        return result;
    },
    /*
    * Replace local image path by servers image path
    */
    localToServerPath: function (src) {
        kvm.log('kvm.localToServerPath src: ' + src, 4);
        var result = kvm.activeLayer.get('document_path') + src.substring(src.lastIndexOf('/') + 1);
        kvm.log('Result: ' + result, 4);
        return result;
    },
    /**
    * Function return a quotation mark if the given database type has to be used as string and requires quotation marks
    * @params string type The database type of an attribute
    * @return string If it is a string returns a single quotation mark "'" if not or unknown returns an empty string ""
    */
    bracketForType: function (type) {
        return (['bpchar', 'varchar', 'text', 'date', 'timestamp', 'geometry'].indexOf(type) > -1 ? "'" : "");
    },
    composeLayerFilter: function () {
        var filter = kvm.activeLayer.attributes
            .filter(function (a) {
            return $('#filter_value_' + a.settings.name).val();
        })
            .map(function (a) {
            return {
                key: a.settings.name,
                value: $('#filter_value_' + a.settings.name).val(),
                operator: $('#filter_operator_' + a.settings.name).val()
            };
        })
            .reduce((acc, cur) => (Object.assign(Object.assign({}, acc), { [cur.key]: {
                value: cur.value,
                operator: cur.operator
            } })), {});
        return filter;
    },
    now: function () {
        var now = new Date();
        return now.getFullYear() + '-' + String('0' + parseInt(now.getMonth() + 1)).slice(-2) + '-' + String('0' + now.getDate()).slice(-2) + 'T'
            + String('0' + now.getHours()).slice(-2) + ':' + String('0' + now.getMinutes()).slice(-2) + ':' + String('0' + now.getSeconds()).slice(-2) + 'Z';
    },
    now_local: function () {
        var now = new Date();
        return now.getFullYear() + '-' + String('0' + parseInt(now.getMonth() + 1)).slice(-2) + '-' + String('0' + now.getDate()).slice(-2) + 'T'
            + String('0' + now.getHours()).slice(-2) + ':' + String('0' + now.getMinutes()).slice(-2) + ':' + String('0' + now.getSeconds()).slice(-2);
    },
    today: function () {
        var now = new Date();
        return now.getFullYear() + '-' + String('0' + parseInt(now.getMonth() + 1)).slice(-2) + '-' + String('0' + now.getDate()).slice(-2);
    },
    /*
    * Zeigt die verschiedenen Werte der Geometrie
    */
    showGeomStatus: function () {
        if (kvm.activeLayer && kvm.activeLayer.activeFeature) {
            console.log('activeFeature.point %o', kvm.activeLayer.activeFeature.get('point'));
            console.log('activeFeature.oldGeom %o', kvm.activeLayer.activeFeature.oldGeom);
            console.log('activeFeature.geom %o', kvm.activeLayer.activeFeature.geom);
            console.log('activeFeature.newGeom %o', kvm.activeLayer.activeFeature.newGeom);
            console.log('form geom_wkt: %s', $('#geom_wkt').val());
            console.log('form ' + kvm.activeLayer.get('geometry_attribute') + ': %s', $('.form-field [name="' + kvm.activeLayer.get('geometry_attribute') + '"]').val());
        }
        if (kvm.activeLayer.activeFeature.editableLayer) {
            console.log('editableLayer: %o', kvm.activeLayer.activeFeature.editableLayer.getLatLng());
        }
    },
    rgbToHex: function (rgb) {
        let parts = rgb.split(' '), componentToHex = function (c) {
            let hex = parseInt(c).toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        };
        return "#" + componentToHex(parts[0]) + componentToHex(parts[1]) + componentToHex(parts[2]);
    }
};
kvm.loadHeadFile('js/controller/mapper.js', 'js');
kvm.loadHeadFile('js/controller/files.js', 'js');
//# sourceMappingURL=app.js.map
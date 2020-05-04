function Layer(stelle, settings = {}) {
  kvm.log('Erzeuge Layerobjekt', 3);
  kvm.log('Layersettings: ' + JSON.stringify(settings), 4);
  var layer_ = this;
  this.stelle = stelle;
  this.settings = (typeof settings == 'string' ? $.parseJSON(settings) : settings);

/*
  // diese 3 Settings werden hier statisch gesetzt für den Fall dass der Server die Attribute noch nicht per mobile_get_layer liefert.
  this.settings['id_attribute'] = 'uuid';
  this.settings['geometry_attribute'] = 'geom';
  this.settings['geometry_type'] = 'Point';
*/
  //-----------------------------------------------
  
  this.attributes = [];
  this.runningSyncVersion = 0;
  this.layerGroup = L.layerGroup();
  this.showPopupButtons = true;
  this.id_attribute = 'uuid';

  if (this.settings.attributes) {
    this.attributes = $.map(
      this.settings.attributes,
      function(attribute) {
        return new Attribute(layer_, attribute);
      }
    )
  };

  this.features = {};

  this.get = function(key) {
    return this.settings[key];
  };

  this.set = function(key, value) {
    this.settings[key] = value;
    return this.settings[key];
  };

  this.getDokumentAttributeNames = function() {
    return $.map(
      this.attributes,
      function(attr) {
        if (attr.get('form_element_type') == 'Dokument') {
          return attr.get('name');
        }
      }
    );
  };

  this.isEmpty = function() {
    return (
      typeof this.get('syncVersion') == 'undefined' ||
      this.get('syncVersion') == null ||
      this.get('syncVersion') == '' ||
      this.get('syncVersion') == 0 ||
      (this.get('syncVersion') != '' && this.numFeatures == 0)
    );
  };

  this.setEmpty = function() {
    this.set('syncVersion') == 0;
  };

  /*
  * Funciton load all features of the layer from local database
  * create a hash with feature_id as key and mapObj_id as value
  * and show it in the layer in leaflet map. 
  */
/*
  this.loadFeaturesToMap = function() {
    var sql = "\
      SELECT\
        *\
      FROM\
        " + this.get('schema_name') + '_' + this.get('table_name') + "\
    ";
    kvm.log('Lese Datensätze aus lokaler Datenbank zur Darstellung in der Karte mit Sql: ' + sql, 3, true);
    kvm.db.executeSql(
      sql,
      [],
      (function(rs) {
        //kvm.log('Layer.loadFeaturesToMap result: ' + JSON.stringify(rs), 4);

        var numRows = rs.rows.length,
            item,
            feature_id,
            wkb,
            circleMarker,
            myRenderer = L.canvas({ padding: 0.5 });

        kvm.log(numRows + ' Datensaetze gelesen. Lade sie in die Karte ...', 3, true);
        this.numFeatures = numRows;

        this.features = {};
        //console.log('id_attribute: %o', this.get('id_attribute'));
        for (i = 0; i < numRows; i++) {
          console.log('Erzeuge circleMarker mit geom: %o', feature.newGeom);
          //console.log('Create Feature %s', i);
          item = rs.rows.item(i);
          feature_id = item[this.get('id_attribute')];
          wkb = item[this.get('geometry_attribute')];
          circleMarker = L.circleMarker(kvm.controller.mapper.wkbToLatLngs(wkb), {
            renderer: myRenderer
          }).bindPopup(this.getPopup(item));
          circleMarker.setStyle(feature.getNormalCircleMarkerStyle());
          // circleMarker als Layer zur Layergruppe hinzufügen
          this.layerGroup.addLayer(circleMarker);
          // layer_id abfragen und in Feature als markerId speichern
          this.features[feature_id] = this.layerGroup.getLayerId(circleMarker);
          console.log('Marker gezeichnet');
          this.layerGroup.addTo(kvm.map);
          kvm.layerDataLoaded = true;
          $(document).trigger('dataLoaded');
        }
      }).bind(this),
      function(error) {
        kvm.log('Fehler bei der Abfrage der Daten aus lokaler Datenbank: ' + error.message);
        $('#sperr_div').hide();
      }
    );
  };
*/

  /*
  * Load data from local db, create feature objects and show in list view
  * Read data from offset to offset + limit
  */
  this.readData = function(limit = 0, offset = 0, order = '') {
    kvm.log('Layer.readData from table: ' + this.get('schema_name') + '_' + this.get('table_name'), 3);
  //  order = (this.get('name_attribute') != '' ? this.get('name_attribute') : this.get('id_attribute'));
    $('#sperr_div').show();

    var filter = $('#anzeigeFilterSelect').val(),
        order = $('#anzeigeSortSelect').val(),
        sql = "\
      SELECT\
        *\
      FROM\
        " + this.get('schema_name') + '_' + this.get('table_name') + "\
      " + (filter != "" ? "WHERE " + filter : "") + "\
      " + (order  != "" ? "ORDER BY " + order : "") + "\
      " + (limit == 0 && offset == 0 ? "" : "LIMIT " + limit + " OFFSET " + offset) + "\
    ";
    kvm.log('Lese Daten aus lokaler Datenbank mit Sql: ' + sql, 3, true);
    kvm.db.executeSql(
      sql,
      [],
      (function(rs) {
        //kvm.log('Layer.readData result: ' + JSON.stringify(rs), 4);

        var numRows = rs.rows.length,
            item,
            i;

        kvm.log(numRows + ' Datensaetze gelesen, erzeuge Featureliste neu...', 3, true);
        this.numFeatures = numRows;
  
        this.features = {};
        //console.log('id_attribute: %o', this.get('id_attribute'));
        console.log('Anzahl Rows %s', numRows);

        for (i = 0; i < numRows; i++) {
          var item = rs.rows.item(i);
          //console.log('Item ' + i + ': %o', item);
          //console.log('Erzeuge Feature %s: ', i);
          this.features[item[this.get('id_attribute')]] = new Feature(
            item, {
              id_attribute: this.get('id_attribute'),
              geometry_type: this.get('geometry_type'),
              geometry_attribute: this.get('geometry_attribute'),
              new: false
            }
          );
          //console.log('Feature ' + i + ': %o', this.features[item[this.get('id_attribute')]]);
        }
        console.log('Features erzeugt.');
        if ($('#syncLayerIcon_' + this.getGlobalId()).hasClass('fa-spinner')) {
          $('#syncLayerIcon_' + this.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
        }
        kvm.setConnectionStatus();

        kvm.createFeatureList();
        if (numRows > 0) {
          this.drawFeatures();
        }

        $('#sperr_div').hide();
      }).bind(this),
      function(error) {
        kvm.log('Fehler bei der Abfrage der Daten aus lokaler Datenbank: ' + error.message);
        $('#sperr_div').hide();
      }
    );
  };

  this.writeData = function(items) {
    kvm.log('Schreibe die empfangenen Daten in die lokale Datebank...', 3, true);
    var tableName = this.get('schema_name') + '_' + this.get('table_name'),
        keys = $.map(
          this.attributes,
          function(attr) {
            return attr.get('name');
          }
        ).join(', '),
        values = '(' +
          $.map(
            items,
            function(item) {
              //console.log('item.geometry %', item.geometry);
              if (item.geometry) {
                return $.map(
                  kvm.activeLayer.attributes,
                  (function(attr) {
                      var type = attr.get('type'),
                          value = (type == 'geometry' ? this.item.geometry : this.item.properties[attr.get('name')]);

                      v = attr.toSqliteValue(type, value);
                      return v;
                  }).bind({
                    item : item
                  })
                ).join(', ');
              }
            }
          ).join('), (') +
        ')';

    sql = "\
      INSERT INTO " + this.get('schema_name') + '_' + this.get('table_name') +" (\
        " + keys + ")\
      VALUES\
        " + values + "\
    ";

    kvm.log('Schreibe Daten in lokale Datenbank mit Sql: ' + sql.substring(1, 1000), 4, true);
    kvm.db.executeSql(
      sql,
      [],
      (function(rs) {
        kvm.log('Daten erfolgreich in Datenbank geschrieben.', 3, true);
        this.set('syncVersion', this.runningSyncVersion);
        this.set('syncLastLocalTimestamp', Date());
        this.saveToStore();
        this.setActive();
        this.readData();
      }).bind(this),
      (function(error) {
        this.set('syncVersion', 0);
        kvm.log('Fehler beim Zugriff auf die Datenbank: ' + error.message, 1);
        alert('Fehler beim Zugriff auf die Datenbank: ' + error.message);
      }).bind(this)
    );
  };

  this.createTables = function() {
    kvm.log('Layer.createTables', 3);
    var layerIds = $.parseJSON(kvm.store.getItem('layerIds_' + this.stelle.get('id'))),
        layer_ = this,
        i;

    for (i = 0; i < layerIds.length; i++) {
      this.set('id', layerIds[i]);
      this.settings = $.parseJSON(kvm.store.getItem('layerSettings_' + this.getGlobalId()));
      this.attributes = $.map(
        this.settings.attributes,
        function(attribute) {
          return new Attribute(layer_, attribute);
        }
      );
      this.createTable();
    };
  };

  this.createTable = function() {
    kvm.db.transaction(
      (function(tx) {
        var tableName = this.get('schema_name') + '_' + this.get('table_name'),
            tableColumns = $.map(
              this.attributes,
              function(attr) {
                return attr.get('name') + ' ' + attr.getSqliteType() + (attr.get('nullable') == '0 ' ? ' NOT NULL' : '');
              }
            ).join(', '),
            sql = 'CREATE TABLE IF NOT EXISTS ' + tableName + ' (' + tableColumns + ')';

        kvm.log('Erzeuge Tabelle mit sql: ' + sql, 3);

        //create table
        tx.executeSql(sql, [],
          (function(tx, res) {
            kvm.log('Tabelle ' + this.get('schema_name') + '_' + this.get('table_name')  + ' erfolgreich angelegt.', 3);
            var tableName = this.get('schema_name') + '_' + this.get('table_name') + '_deltas',
                tableColumns = '\
                  version INTEGER PRIMARY KEY,\
                  type text,\
                  change text,\
                  delta text,\
                  created_at text\
                ',
                sql = 'CREATE TABLE IF NOT EXISTS ' + tableName + ' (' + tableColumns + ')';
            kvm.log('Erzeuge Delta-Tabelle mit sql: ' + sql, 3);

            tx.executeSql(sql,[],
              (function(tx, res) {
                kvm.log('Deltas Tabelle erfolgreich angelegt.', 3);
                this.appendToList();
                if ($('#layer_list .sync-layer-button').length == this.stelle.numLayers) {
                  // Erst wenn der letzte Layer geladen wurde.
                  kvm.bindLayerEvents();
                }
              }).bind(this),
              (function(error) {
                var tableName = this.get('schema_name') + '_' + this.get('table_name')
                kvm.msg('Fehler beim Anlegen der Tabelle: ' + tableName + ' ' + error.message);
              }).bind(this)
            )
          }).bind(this),
          (function(error) {
            var tableName = this.get('schema_name') + '_' + this.get('table_name')
            kvm.msg('Fehler beim Anlegen der Tabelle: ' + tableName + ' ' + error.message);
          }).bind(this)
        );
      }).bind(this),
      (function(error) {
        kvm.log('Fehler beim Anlegen der Tabellen für den Layer: ' + this.get('title') + ' ' + error.message, 1);
        kvm.msg('Fehler beim Anlegen der Tabellen für den Layer: ' + this.get('title') + ' ' + error.message);
      }).bind(this)
    );
  };

  this.updateTable = function() {
    kvm.db.transaction(
      (function(tx) {
        var tableName = this.get('schema_name') + '_' + this.get('table_name'),
            sql = 'DROP TABLE IF EXISTS ' + tableName;

        kvm.log('Lösche Tabelle mit sql: ' + sql, 3);
        tx.executeSql(sql, [],
          (function(tx, res) {
            kvm.log('Tabelle ' + this.get('schema_name') + '_' + this.get('table_name')  + ' erfolgreich gelöscht.', 3);
            var tableName = this.get('schema_name') + '_' + this.get('table_name'),
                tableColumns = $.map(
                  this.attributes,
                  function(attr) {
                    return attr.get('name') + ' ' + attr.getSqliteType() + (attr.get('nullable') == '0 ' ? ' NOT NULL' : '');
                  }
                ).join(', '),
                sql = 'CREATE TABLE IF NOT EXISTS ' + tableName + ' (' + tableColumns + ')';

            kvm.log('Erzeuge Tabelle neu mit sql: ' + sql, 3);
            tx.executeSql(sql,[],
              (function(tx, res) {
                kvm.log('Tabelle erfolgreich angelegt.', 3);
                // update layer name in layerlist for this layer
                this.appendToList();
                kvm.bindLayerEvents(this.getGlobalId());
                this.setActive();
                kvm.setConnectionStatus();
              }).bind(this),
              (function(error) {
                var tableName = this.get('schema_name') + '_' + this.get('table_name')
                kvm.msg('Fehler beim Anlegen der Tabelle: ' + tableName + ' ' + error.message);
              }).bind(this)
            )
          }).bind(this),
          (function(error) {
            var tableName = this.get('schema_name') + '_' + this.get('table_name')
            kvm.msg('Fehler beim Löschen der Tabelle: ' + tableName + ' ' + error.message);
          }).bind(this)
        );
      }).bind(this),
      (function(error) {
        kvm.log('Fehler beim Update der Tabellen für den Layer: ' + this.get('title') + ' ' + error.message, 1);
        kvm.msg('Fehler beim Update der Tabellen für den Layer: ' + this.get('title') + ' ' + error.message);
      }).bind(this)
    );
  };

  this.requestData = function() {
    // ToDo Ab hier in einem Fenster den Fortschritt des Ladevorganges anzeigen.
    kvm.log('Frage Daten vom Server ab.<br>Das kann je nach Datenmenge und<br>Internetverbindung einige Minuten dauern.' , 3, true);
    var fileTransfer = new FileTransfer(),
        filename = 'data_layer_' + this.getGlobalId() + '.json',
        url = this.getSyncUrl();

    kvm.log('Speicher die Daten in Datei: ' + cordova.file.dataDirectory + filename, 3);

    fileTransfer.download(
      url,
      cordova.file.dataDirectory + filename,
      function (fileEntry) {
        fileEntry.file(
          function (file) {
            var reader = new FileReader();

            reader.onloadend = function() {
              kvm.log('Download der Daten ist abgeschlossen.', 3, true);
              var items = [],
                  collection = {},
                  errMsg = '';

//              console.log('Download Ergebnis: %o', this.result);
              try {
                collection = $.parseJSON(this.result);
                if (collection.features.length > 0) {
                  kvm.log('Anzahl empfangene Datensätze: ' + collection.features.length, 3);
                  var layer = kvm.activeLayer;
                  layer.runningSyncVersion = collection.features[0].properties.version;
                  kvm.log('Version der Daten: ' + layer.runningSyncVersion, 3);
                  layer.writeData(collection.features);
                }
                else {
                  kvm.msg('Abfrage liefert keine Daten vom Server. Entweder sind noch keine auf dem Server vorhanden oder die URL der Anfrage ist nicht korrekt. Prüfen Sie die Parameter unter Einstellungen.', 'Fehler');
                }
              } catch (e) {
                errMsg = 'Es konnten keine Daten empfangen werden.' + this.result;
                kvm.msg(errMsg, 'Fehler');
                kvm.log(errMsg, 1);
                if ($('#syncLayerIcon_' + this.getGlobalId()).hasClass('fa-spinner')) {
                  $('#syncLayerIcon_' + this.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
                }
                $('#sperr_div').hide();
              }
            };

            reader.readAsText(file);
          },
          function(error) {
            alert('Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für die Synchronisation verwendet werden.');
            kvm.log('Fehler beim lesen der Datei: ' + error.code, 1);
            $('sperr_div').hide();
          }
        );
      },
      this.downloadError,
      true
    );
  };

  this.sendDeltas = function(deltas) {
    kvm.log('Layer.sendDeltas: ' + JSON.stringify(deltas), 3);
    deltas_ = deltas;
    window.requestFileSystem(
      window.TEMPORARY,
      5 * 1024 * 1024,
      (function (fs) {
        kvm.log('file system open: ' + fs.name, 4);
        var fileName = 'delta_layer_' + kvm.activeLayer.getGlobalId() + '.json';
        var dirEntry = fs.root;

        dirEntry.getFile(
          fileName,
          { create: true, exclusive: false },
          (function (fileEntry) {
            // Write something to the file before uploading it.
            this.writeFile(fileEntry, deltas_);
          }).bind(this),
          function(err) {
            kvm.log('Fehler beim Erzeugen der Delta-Datei, die geschickt werden soll.', 1);
            $('#sperr_div').hide();
          }
        );
      }).bind(this),
      function(err) {
        kvm.log('Fehler beim öffnen des Filesystems', 1);
      }
    );
  };

  this.writeFile = function(fileEntry, deltas) {
    // Create a FileWriter object for our FileEntry (log.txt).
    fileEntry.createWriter(
      (function (fileWriter) {
        fileWriter.onwriteend = (function () {
          kvm.log('Datei erfolgreich geschrieben.', 3);
          this.upload(fileEntry);
        }).bind(this);

        fileWriter.onerror = function (e) {
          kvm.log('Fehler beim Schreiben der Datei: ' + e.toString(), 1);
          $('#sperr_div').hide();
        };

        if (!deltas) {
          dataObj = new Blob(['kein deltas Array vorhanden'], { type: 'text/plain' });
        }
        else {
          dataObj = new Blob([JSON.stringify(deltas)], { type: 'application/json'});
        }
        fileWriter.write(dataObj);
      }).bind(this)
    );
  };

  this.upload = function(fileEntry) {
    var fileURL = fileEntry.toURL();
    var success = (function (r) {
      kvm.log('Erfolgreich hochgeladen ResponseCode: ' + r.responseCode, 3);
      kvm.log('Response: ' + JSON.stringify(r.response), 4);
      var response = $.parseJSON(r.response);

      if (response.success) {
        kvm.log('Syncronisierung erfolgreich auf dem Server durchgeführt.', 3);
        kvm.log('Antwort vom Server: ' + JSON.stringify(response), 4);
        $.each(
          response.deltas,
          (function(index, value) {
            kvm.log('Führe Änderungen vom Server auf dem Client aus: ' + value.sql);
            this.execDelta(this.pointToUnderlineName(value.sql, this.get('schema_name'), this.get('table_name')));
          }).bind(this)
        );
        this.deleteDeltas('sql');
        this.set('syncVersion', parseInt(response.syncData[0].push_to_version));
      }
      else {
        kvm.msg(response.err_msg);
      }
      if ($('#syncLayerIcon_' + this.getGlobalId()).hasClass('fa-spinner')) {
        $('#syncLayerIcon_' + this.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
        $('#sperr_div').hide();
      }
      // displayFileData(fileEntry.fullPath + " (content uploaded to server)");
    }).bind(this);

    var fail = function (error) {
      var msg = 'Fehler beim Hochladen der Sync-Datei! Fehler ' + error.code;
      kvm.msg(msg);
      kvm.log(msg, 1);
      $('#sperr_div').hide();
    }

    var layer = kvm.activeLayer,
        stelle = layer.stelle,
        url = stelle.get('url'),
        file = stelle.getUrlFile(url),
        server = url + file,
        params = {},
        options = new FileUploadOptions();

    params.device_id = device.uuid;
    params.Stelle_ID = stelle.get('Stelle_ID');
    params.login_name = stelle.get('login_name');
    params.passwort = stelle.get('passwort');
    params.selected_layer_id = layer.get('id');
    params.table_name = layer.get('table_name');
    params.client_time = (new Date()).toISOString();
    params.last_client_version = layer.get('syncVersion');
    params.go = 'mobile_sync';

    options.params = params;
    options.fileKey = 'client_deltas';
    options.fileName = fileURL.substr(fileURL.lastIndexOf('/') + 1);
    options.mimeType = "application/json";

    var ft = new FileTransfer();
    kvm.log('upload to url: ' + server, 3);
    kvm.log('with params: ' + JSON.stringify(params), 3);
    kvm.log('with options: ' + JSON.stringify(options), 3);
    ft.upload(fileURL, encodeURI(server), success, fail, options);
  };

  /*
  * Sync images
  * ToDos
  * -- Uploader, der in regelmäßigen Abständen schaut ob es neue Bilder hochzuladen und ob es welche zu löschen gibt.
  * -- Wenn es welche zum hochladen gibt, versucht er die Bilder der Reihe nach hochzuladen.
  *    - Wenn es geklappt hat, aus der Liste der hochzuladenen Bilder löschen
  * -- Wenn es welche zu löschen gibt, versucht er die Info an den Server zu schicken.
  *    - Wenn der Server gemeldet hat, dass er das Bild erfolgreich gelöscht hat, aus der Liste der zu löschenden Bilder entfernen.
  * -- Registrieren wenn alle Bilder syncronisiert wurden, dann sperr_div aus und Erfolgsmeldung.
  * Anforderung von Dirk
  * Metainfos zu einem Bild speichern. Da könnte auch die Info ran ob Bild schon geuploaded oder zu löschen ist. Wenn upload
  * geklappt hat, könnte Status von to_upload zu uploaded geändert werden und wenn löschen auf dem Server geklappt hat,
  * kann das Bild auch in der Liste der Bilder und somit auch deren Metadaten gelöscht werden.
  *
  */
  this.syncImages = function() {
    kvm.log('Layer.syncImages', 4);
    sql = "\
      SELECT\
        * \
      FROM\
        " + this.get('schema_name') + '_' + this.get('table_name') + "_deltas\
      WHERE\
        type = 'img'\
    ";
    kvm.log('Frage Deltas ab mit sql: ' + sql, 3);
    kvm.db.executeSql(
      sql,
      [],
      (function(rs) {
        kvm.log('Abfrage erfolgreich. Result:' + JSON.stringify(rs), 4);
        var numRows = rs.rows.length,
            icon,
            i;

        if (numRows > 0) {
          kvm.log(numRows + ' deltas gefunden.', 3);
          for (i = 0; i < numRows; i++) {
            if (rs.rows.item(i).change == 'insert') {
              kvm.log(i + '. insert', 3);
              this.sendNewImage(rs.rows.item(i).delta);
            }
            if (rs.rows.item(i).change == 'delete') {
              kvm.log(i + '. delete', 3);
              this.sendDropImage(rs.rows.item(i).delta);
            }
          }
        }
        else {
          kvm.msg('Keine neuen Bilder zum Hochladen vorhanden.');
          icon = $('#syncImagesIcon_' + this.getGlobalId());
          if (icon.hasClass('fa-spinner')) icon.toggleClass('fa-upload fa-spinner fa-spin');
          $('#sperr_div').hide();
        }
      }).bind(this),
      (function(error) {
        var icon;

        kvm.log('Layer.syncData query deltas Fehler: ' + JSON.stringify(error), 1);
        kvm.msg('Fehler beim Zugriff auf die Datenbank');
        icon = $('#syncImagesIcon_' + this.getGlobalId());
        if (icon.hasClass('fa-spinner')) icon.toggleClass('fa-upload fa-spinner fa-spin');
        $('#sperr_div').hide();
      }).bind(this)
    );
  };

  this.sendNewImage = function(img) {
    kvm.log('Layer.sendNewImage', 4);
    kvm.log('Bild ' + img + ' wird hochgeladen.', 3);
    var icon = $('#syncImagesIcon_' + this.getGlobalId()),
        ft = new FileTransfer(),
        fileURL = 'file://' + config.localImgPath + img.substring(img.lastIndexOf('/') + 1),
        url = this.stelle.get('url'),
        file = this.stelle.getUrlFile(url),
        server = url + file,
        win = (function (r) {
            kvm.log("Code = " + r.responseCode, 4);
            kvm.log("Response = " + r.response, 4);
            kvm.log("Sent = " + r.bytesSent, 4);
            this.layer.deleteDeltas('img', this.img);
        }).bind({
          layer : this,
          img : img
        }),
        fail = (function (error) {
          if (this.hasClass('fa-spinner')) this.toggleClass('fa-upload fa-spinner fa-spin');
          $('#sperr_div').hide();

          var msg = 'Fehler beim Hochladen der Datei: ' + error.code + ' source: ' + error.code;
          kvm.msg(msg);
          kvm.log(msg);

        }).bind(icon),
        options = new FileUploadOptions();

    // when the upload begin
    if (icon.hasClass('fa-upload')) icon.toggleClass('fa-upload fa-spinner fa-spin');

    options.fileKey = "image";
    options.fileName = fileURL.substr(fileURL.lastIndexOf('/') + 1);
    options.mimeType = "image/jpeg";
    options.params = {
      device_id : device.uuid,
      Stelle_ID : this.stelle.get('Stelle_ID'),
      login_name : this.stelle.get('login_name'),
      passwort : this.stelle.get('passwort'),
      selected_layer_id : this.get('id'),
      go : 'mobile_upload_image'
    };

    kvm.log('upload to url: ' + server, 3);
    kvm.log('with params: ' + JSON.stringify(options.params), 3);
    kvm.log('with options: ' + JSON.stringify(options), 3);
    ft.upload(fileURL, encodeURI(server), win, fail, options);

    // when the upload has been finished
    if (icon.hasClass('fa-spinner')) icon.toggleClass('fa-upload fa-spinner fa-spin');
  };

  this.sendDropImage = function(img) {
    kvm.log('Layer.sendDropImage', 4);
    var url = this.stelle.get('url');
        file = this.stelle.getUrlFile(url),
        data = {
          device_id : device.uuid,
          Stelle_ID : this.stelle.get('Stelle_ID'),
          login_name : this.stelle.get('login_name'),
          passwort : this.stelle.get('passwort'),
          selected_layer_id : this.get('id'),
          go : 'mobile_delete_images',
          images : img
        };
    kvm.log('Send ' + url + file + $.param(data) + ' to drop image', 2);

//    $.support.cors = true;

    $.ajax({
      url: url + file,
      data: data,
      context: {
        layer: this,
        img: img
      },
      success: function (r) {
        //console.log('Response: %o', r);
        var data = $.parseJSON(r);
        if (data.success) {
          kvm.log(data.msg);
          kvm.log('Bild: ' + this.img + ' erfolgreich gelöscht.', 4);
          this.layer.deleteDeltas('img', this.img);
        }
      },
      error: function (e) {
        kvw.msg("An error has occurred: Code = " + e.msg);
      }
    });
  };

  /*
  * - Frage Deltas ab und schreibe sie in eine Datei
  * - Schicke die Datei an den Server
  *   - Bei Erfolg:
  *     - Führe die Deltas vom Server aus
  *     - Lösche die Deltas, die weggeschickt wurden
  *     - Setze die neue syncVersion des Layers
  *   - Bei Fehler:
  *     - Zeige Fehlermeldung an
  */
  this.syncData = function() {
    kvm.log('Layer.syncData', 3);
    var tableName = this.get('schema_name') + '_' + this.get('table_name');

    sql = "\
      SELECT\
        * \
      FROM\
        " + tableName + "_deltas\
      WHERE\
        type = 'sql'\
    ";
    kvm.log('Layer.syncData: query deltas with sql: ' + sql, 3);
    kvm.db.executeSql(
      sql,
      [],
      (function(rs) {
        kvm.log('Layer.syncData query deltas success result:' + JSON.stringify(rs), 3);
        var numRows = rs.rows.length,
            deltas = {'rows' : [] },
            i;

        for (i = 0; i < numRows; i++) {
          kvm.log('Push item ' + i + ' to deltas.', 4);
          deltas.rows.push({
            'version' : rs.rows.item(i).version,
            'sql' : rs.rows.item(i).delta
          });
        }
        // Sende Anfrage auch mit leeren rows Array um Änderungen vom Server zu bekommen.
        this.sendDeltas(deltas);
      }).bind(this),
      function(error) {
        kvm.log('Layer.syncData query deltas Fehler: ' + JSON.stringify(error), 1);
        kvm.msg('Fehler beim Zugriff auf die Datenbank');
        if ($('#syncLayerIcon_' + this.getGlobalId()).hasClass('fa-spinner')) {
          $('#syncLayerIcon_' + this.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
          $('#sperr_div').hide();
        }
      }
    );
  };

  this.underlineToPointName = function(sql, schema, table) {
    return sql.replace(this.get('schema_name') + '_' + this.get('table_name'), this.get('schema_name') + '.' + this.get('table_name'));
  };

  this.pointToUnderlineName = function(sql, schema, table) {
    return sql.replace(this.get('schema_name') + '.' + this.get('table_name'), this.get('schema_name') + '_' + this.get('table_name'));
  };

  /*
  * Delete all features from layer, feature list, map and its data in the database table and deltas
  * and also lastVersionNr of the layer to make the way free for a new initial download
  */
  this.clearData = function() {
    kvm.log('Layer.clearData', 4);
    var sql = '\
      DELETE FROM ' + this.get('schema_name') + '_' + this.get('table_name') + '\
    ';
    kvm.db.executeSql(
      sql,
      [],
      function(rs) {
        navigator.notification.confirm(
          'Alle Daten des Layers in lokaler Datenbank gelöscht.',
          function(buttonIndex) {},
          'Datenbank',
          ['Verstanden']
        );
      },
      function(error) {
        navigator.notification.confirm(
          'Fehler bei Löschen der Layerdaten!\nFehlercode: ' + error.code + '\nMeldung: ' + error.message,
          function(buttonIndex) {
            // ToDo handling choices after error
          },
          'Datenbank',
          ['Abbruch']
        );
      }
    );

    this.deleteDeltas('all');
    this.features = [];
    $('#featurelistBody').html('');
    if (this.geometryLayer) {
      this.geometryLayer.clearLayers();
    }
    this.setEmpty();
  };

  this.deleteDeltas = function(type, delta) {
    if (typeof delta === 'undefined') delta = '';
    kvm.log('Layer.deleteDeltas', 4);
    var sql = '\
      DELETE FROM ' + this.get('schema_name') + '_' + this.get('table_name') + '_deltas\
    ';
    if (type != 'all') {
      sql += " WHERE type = '" + type + "'";
      if (delta != '') {
        sql += " AND delta = '" + delta + "'";
      }
    }
    kvm.log('Lösche Deltas mit Sql: ' + sql, 3);
    kvm.db.executeSql(
      sql,
      [],
      (function(rs) {
        kvm.log('Deltas in Tabelle erfolgreich gelöscht.', 3);
        var icon = $('#clearLayerIcon_' + this.layer.getGlobalId());
        if (icon.hasClass('fa-spinner')) icon.toggleClass('fa-ban fa-spinner fa-spin');
        icon = $('#syncImagesIcon_' + this.layer.getGlobalId());
        if (icon.hasClass('fa-spinner')) icon.toggleClass('fa-upload fa-spinner fa-spin');
        $('#sperr_div').hide();
        if (this.delta == '') {
          navigator.notification.confirm(
            'Alle Änderungsversionen des Layers in lokaler Datenbank gelöscht.',
            function(buttonIndex) {
            },
            'Datenbank',
            ['Verstanden']
          );
        }
      }).bind({
        layer : this,
        delta : delta
      }),
      function(error) {
        kvm.log('Fehler beim Löschen der Deltas!', 1);
        var icon = $('#clearLayerIcon_' + this.getGlobalId());
        if (icon.hasClass('fa-spinner')) icon.toggleClass('fa-ban fa-spinner fa-spin');
        navigator.notification.confirm(
          'Fehler bei Löschen der Änderungsdaten des Layers!\nFehlercode: ' + error.code + '\nMeldung: ' + error.message,
          function(buttonIndex) {
            // ToDo handling choices after error
          },
          'Datenbank',
          ['OK']
        );
      }
    );
  };

  this.downloadImage = function(localFile, remoteFile) {
    var fileTransfer = new FileTransfer(),
        downloadURL = this.getImgDownloadUrl(remoteFile);

    kvm.log('Download Datei von URL: ' + downloadURL, 3);
    kvm.log('Speicher die Datei auf dem Gerät in Datei: ' + localFile, 3);

    fileTransfer.download(
      downloadURL,
      localFile,
      (function (fileEntry) {
        kvm.log('Download des Bildes abgeschlossen: ' + fileEntry.fullPath, 4);
        var imageDiv = $('div[name$="' + this.remoteFile + '"]');

        imageDiv.attr('src', this.localFile);
        imageDiv.css('background-image', "url('" + this.localFile + "')");
      }).bind({
        localFile: localFile,
        remoteFile: remoteFile
      }),
      function (error) {
        kvm.log("download error source " + error.source, 1);
        kvm.log("download error target " + error.target, 1);
        kvm.log("upload error code" + error.code, 1);
      },
      true
    );
  };

  this.createFeatureForm = function() {
    kvm.log('Layer.createFeatureForm', 4);
    $('#formular')
      .append('<div id="formDiv">')
      .append('<form id="featureFormular">');
    $.map(
      this.attributes,
      function(attr) {
        $('#featureFormular').append(
          attr.withLabel()
        );
        attr.formField.bindEvents();
      }
    );
  };

  this.createDataView = function() {
    kvm.log('Layer.createDataView', 4);
    $('#dataView').html('\
      <h1 style="margin-left: 5px;">Sachdaten</h1>\
      <div id="dataViewDiv"></div>'
    );
    $.map(
      this.attributes,
      function(attr) {
        $('#dataViewDiv').append(
          attr.viewField.withLabel()
        ).append('<div style="clear: both">');
      }
    );
  };

  this.getIcon = function() {
    return L.icon({
        iconUrl: 'img/hst24.png',
//        shadowUrl: 'leaf-shadow.png',

        iconSize:     [24, 24], // size of the icon
//        shadowSize:   [50, 64], // size of the shadow
        iconAnchor:   [12, 12], // point of the icon which will correspond to marker's location
        shadowAnchor: [16, 8],  // the same for the shadow
        popupAnchor:  [0, -12] // point from which the popup should open relative to the iconAnchor
    });
  };

  /*
  * Erzeugt den View mit den Daten des Features
  *
  */
  this.loadFeatureToView = function(feature, options = {}) {
    kvm.log('Lade Feature in View.', 4);
    $.map(
      this.attributes,
      (function(attr) {
        var key = attr.get('name'),
            val = this.get(key);

        attr.viewField.setValue(val);
      }).bind(feature)
    );
  };

  /*
  * - Befüllt das Formular des Layers mit den Attributwerten des übergebenen Features
  * - Setzt das Feature als activeFeature im Layer
  * - Startet das GPS-Tracking
  */
  this.loadFeatureToForm = function(feature, options = { editable: false}) {
    console.log('Lade Feature %o in Formular.', feature);
    this.activeFeature = feature;

    $.map(
      this.attributes,
      (function(attr) {
        var key = attr.get('name'),
            val = this.get(key);

        attr.formField.setValue(val);
      }).bind(feature)
    );

    if (typeof kvm.activeLayer.features[kvm.activeLayer.activeFeature.get(this.get('id_attribute'))] == 'undefined') {
      $('#goToGpsPositionButton').hide();
    }
    else {
      if (feature.geom) {
        $('#geom_wkt').val(feature.geom.toWkt());
      }
      $('#goToGpsPositionButton').show();
    }

    if (options.editable) {
      kvm.controller.mapper.watchGpsAccuracy();
    }
  };

  /*
  * Zeichnet die Features in die Karte
  */
  this.drawFeatures = function() {
    kvm.log('Erzeuge Geometrieobjekt in der Karte: ', 3);
    kvm.log('Erzeuge ' + Object.keys(this.features).length + ' CircleMarker', 3);
    $.each(
      this.features,
      (function (key, feature) {
        // circleMarker erzeugen mit Popup Eventlistener
        var circleMarker = L.circleMarker(feature.wkxToLatLngs(feature.newGeom), {
          renderer: kvm.myRenderer,
          featureId: feature.id
        }).bindPopup(this.getPopup(feature));
        circleMarker.setStyle(feature.getNormalCircleMarkerStyle());
        circleMarker.on('click', function(evt) {
          debug_evt = 'evt';
          console.log(kvm.activeLayer.activeFeature.editable);
          if (kvm.activeLayer.activeFeature.editable) {
            $('.popup-functions').hide();
          }
          else {
            if (kvm.activeLayer.activeFeature) {
              kvm.activeLayer.activeFeature.unselect();
            }
            kvm.activeLayer.features[evt.target.options.featureId].select();
          }
        });

        // circleMarker als Layer zur Layergruppe hinzufügen
        this.layerGroup.addLayer(circleMarker);
        // layer_id abfragen und in Feature als markerId speichern
        feature.markerId = this.layerGroup.getLayerId(circleMarker);
      }).bind(this)
    );
    kvm.log('Marker gezeichnet', 4);
    this.layerGroup.addTo(kvm.map);
/*
    if (this.settings['geometry_type'] == 'Point') {
      if (this.geometryLayer) {
        this.geometryLayer.clearLayers();
      }
      this.geometryLayer = L.markerClusterGroup({
        maxClusterRadius: function(zoom) {
          return (zoom == 18 ? 5 : 50)
        }
      });
      kvm.log('Clustergruppe erzeugt.', 3);
    }

    $.each(
      this.features,
      (function (key, feature) {
        var geom = feature.getGeom();
        kvm.log('layer.drawFeature: add feature in map with geom: ' + JSON.stringify(geom), 3);

        if (geom) {
          switch (this.settings['geometry_type']) {
            case 'LineString': {
              feature.geometry = L.polyline(geom, {icon: this.getIcon()}).bindPopup(this.getPopup(feature));
            } break;
            case 'Polygon' : {
              feature.geometry = L.polygon(geom, {icon: this.getIcon()}).bindPopup(this.getPopup(feature));
            } break;
            default: {
              console.log('create feature geom for uuid: %s', feature.get('uuid'));
              feature.geometry = L.marker(geom, {icon: this.getIcon()}).bindPopup(this.getPopup(feature));
            }
          }
          //kvm.log('Füge Marker zur Clustergruppe hinzu...', 3, true);
          this.geometryLayer.addLayer(feature.geometry);
          //kvm.log('Marker hinzugefügt.', 3, true);
        }
      }).bind(this)
    );
    kvm.log('Füge Markercluster zur Karte hinzu...', 3, true);
    kvm.map.addLayer(this.geometryLayer);
*/
    kvm.log('layerGroup zur Karte hinzugefügt.', 4)
  };

  this.getPopup = function(feature) {
    var html;

    html = feature.get(this.get('name_attribute'));
    if (feature.showPopupButtons()) {
      html = html + '<br>\
        <div class="popup-functions">\
          <a\
            href="#"\
            title="Geometrie ändern"\
            onclick="kvm.activeLayer.editGeometry(\'' + feature.get(this.get('id_attribute')) + '\')"\
          ><span class="fa-stack fa-lg">\
              <i class="fa fa-square fa-stack-2x"></i>\
              <i class="fa fa-pencil fa-stack-1x fa-inverse"></i>\
          </span></i></a>\
          <a\
            class="popup-link"\
            href="#"\
            title="Sachdaten anzeigen"\
            onclick="kvm.activeLayer.showDataView(\'' + feature.get(this.get('id_attribute')) + '\')"\
          ><span class="fa-stack fa-lg">\
              <i class="fa fa-square fa-stack-2x"></i>\
              <i class="fa fa-bars fa-stack-1x fa-inverse"></i>\
            </span></i></a>\
        </div>\
      ';
    };
    return html;
  };

/*
  Werden nicht mehr benötigt.
  this.geteditablePopup = function(feature) {
    var html;

    html = feature.get(this.get('name_attribute')) + '\
      <br>\
      <a\
        href="#"\
        title="Geometrie speichern"\
        onclick="kvm.activeLayer.saveGeometry(\'' + feature.get(this.get('id_attribute')) + '\')"\
      ><span class="fa-stack fa-lg">\
          <i class="fa fa-square fa-stack-2x" style="color: darkgreen;"></i>\
          <i id="save_geometry_button" class="fa fa-check-square-o fa-stack-1x fa-inverse"></i>\
        </span></i></a>\
      <a\
        class="popup-link"\
        href="#"\
        title="Sachdaten ändern"\
        onclick="kvm.activeLayer.showFormular(\'' + feature.get(this.get('id_attribute')) + '\')"\
      ><span class="fa-stack fa-lg">\
          <i class="fa fa-square fa-stack-2x"></i>\
          <i class="fa fa-bars fa-stack-1x fa-inverse"></i>\
        </span></i></a>\
      <a\
        href="#"\
        title="Änderung verwerfen"\
        onclick="kvm.activeLayer.cancelEditGeometry(\'' + feature.get(this.get('id_attribute')) + '\')"\
      ><span class="fa-stack fa-lg">\
          <i class="fa fa-square fa-stack-2x" style="color: darkred;"></i>\
          <i class="fa fa-ban fa-stack-1x fa-inverse"></i>\
        </span></i></a>\
    ';
    return html;
  };
*/

  this.showDataView = function(featureId) {
    this.loadFeatureToView(this.features[featureId]);
    kvm.showItem('dataView');
  };

  this.showFormular = function(featureId) {
    // ToDo: Hier berücksichtigen, dass man auch von einer geänderten Geometrie kommen kann
    // in dem Fall muss die geänderte Geometrie mit in das Formular übernommen werden
    // für den Fall, dass man das Form speichert. Damit man da dann über getValue aus dem Geom Feld die letzte Geom
    // nimmt zum Speichern.
    // und berüsichtigen, dass man jetzt nur noch vom Menü aus in das FormularEdit wechselt.
    if ($('#saveFeatureButton').hasClass('active-button')) {
      kvm.msg('Es gibt nicht gespeicherte Änderungen! Gehen Sie zurück zum Formular und verwerfen Sie die Änderungen um eine neue Änderung zu beginnen.');
    }
    else {
      this.loadFeatureToForm(this.features[featureId], { editable: false});
      kvm.showItem('formular');
    }
  };

  /*
  * Wenn alatlng übergeben wurde beginne die Editierung an dieser Stelle statt an der Stelle der Koordinaten des activeFeatures
  * Wird verwendet wenn ein neues Feature angelegt wird.
  */
  this.startEditing = function(alatlng = []) {
    var feature = this.activeFeature;

    if (alatlng.length > 0) {
      feature.setGeom(feature.aLatLngsToWkx([alatlng]));
      feature.geom = feature.newGeom;
      feature.set(
        feature.options.geometry_attribute,
        kvm.wkx.Geometry.parse('SRID=4326;POINT(' + alatlng.join(' ') + ')').toEwkb().inspect().replace(/<|Buffer| |>/g, '')
      )
    }

    // Lad nur uuid, geometrie und setzt die Default-Werte in das Form weil es ein neues Feature ist.
    kvm.activeLayer.loadFeatureToForm(feature, { editable: true });

    feature.setEditable(true);

    if ($('#dataView').is(':visible')) {
      console.log('Map Is not Visible, open in formular');
      kvm.showItem('formular');
    }
    else {
      console.log('Map is Visible, keep panel map open.');
      kvm.showItem('mapEdit');
    }
  };

  /*
  * Ermittelt die layer_id des circleMarkers des Features
  * schließt den offenen Popup
  * unbind das Popup
  * Setzt den Style des circleMarkers auf grau
  * Erzeugt das Formular mit den Feature-Werten, aber bleibt in der Karte
  * Erzeugt einen editable Marker mit einem Popup.
  * Damit kann der Nutzer den Marker so lange verschieben wie er möchte.
  */
/* Dies gilt nicht mehr:
  * Wenn er den Marker anklickt kommt das Popup des editable Markers mit folgenden Funktionen:
  *   - Speichern: Speichert die neue Position mit der Funktion saveGeometry(feature_id)
  *   - Sachdaten editieren: Wechselt in die Sachdatenanzeige mit der Funktion showFormular(feature_id)
  *   - Abbrechen:
  *     - Setzt die Geometrie im Formular auf den ursprünglichen Wert
  *     - Löscht den editable Marker
  *     - Bindet das Popup des Features erneut an den circleMarker
  *     - ändert den Style zurück auf den Standardstyle des circleMarkers
*/
  this.editGeometry = function(featureId) {
    console.log('editGeometry Id: %s', featureId);
    // Ermittelt die layer_id des circleMarkers des Features
    var feature = this.features[featureId],
        circleMarker = this.layerGroup.getLayer(feature.markerId);

    console.log('Edit CircleMarker: %o in Layer Id: %s von Feature Id: %s.', circleMarker, feature.markerId, featureId);

    // schließt den offenen Popup
    kvm.map.closePopup();

    // unbind das Popup vom aktuellen layer
    circleMarker.unbindPopup();

    // färbt den circle Marker grau ein.
    circleMarker.setStyle(feature.getEditModeCircleMarkerStyle());

    // erzeugt die editierbare Geometrie
    this.features[featureId].setEditable(true);

    this.loadFeatureToForm(feature, { editable: true });

    if ($('#dataView').is(':visible')) {
      console.log('Map Is not Visible, open in formular');
      kvm.showItem('formular');
    }
    else {
      console.log('Map is Visible, keep panel map open.');
      kvm.showItem('mapEdit');
    }
  };
  /*
    kvm.activeLayer.editGeometry = function(featureId) {
      console.log('editGeometry Id: %s', featureId);
      var feature = this.features[featureId],
          circleMarker = this.layerGroup.getLayer(feature.markerId);

      console.log('Edit CircleMarker: %o in Layer Id: %s von Feature Id: %s.', circleMarker, feature.markerId, featureId);  
      circleMarker.setStyle({ color: '#f00', fillColor: '#f00' });
      editable = L.marker(feature.getGeom()).addTo(kvm.map);
      editable.enableEdit();
      editableId = editable._leaflet_id;
      kvm.map._layers[editable._leaflet_id].bindPopup(this.geteditablePopup(feature, editable));
      this.features[featureId].editable = editable;
    }
    kvm.activeLayer.editGeometry('0e926383-6ce8-4e1d-8a38-9e775f74ac1c')
  */

  /*
  * Löscht die editierbare Geometrie
  * zoomt zum ursprünglichen Geometrie
  * Setzt den Style des circle Markers auf den alten zurück
  * Binded das Popup an den dazugehörigen Layers
  * Selectiert das Feature in Karte und Liste
  */
  this.cancelEditGeometry = function(featureId) {
    console.log('cancelEditGeometry Id: %s', featureId);
    if (featureId) {
      // Ermittelt die layer_id des circleMarkers des Features
      var feature = this.features[featureId],
            layer = kvm.map._layers[feature.markerId];

      // Löscht die editierbare Geometrie
      this.features[featureId].setEditable(false);

      // Zoom zur ursprünglichen Geometrie
      kvm.map.panTo(kvm.map._layers[feature.markerId].getLatLng());

      //Setzt den Style des circle Markers auf den alten zurück
      kvm.map._layers[feature.markerId].setStyle(feature.getNormalCircleMarkerStyle());

      $('.popup-functions').show();
      // sorge dafür dass die buttons wieder in den Popups angezeigt werden
      this.showPopupButtons = true;

      // Binded das Popup an den dazugehörigen Layer
      kvm.map._layers[feature.markerId].bindPopup(this.getPopup(feature));
      feature.select();
    }
    else {
      // Beende das Anlegen eines neuen Features
      kvm.map.removeLayer(kvm.activeLayer.activeFeature.editableLayer);
      kvm.showItem('map');
    }
  }
  /*
    featureId = '0fb17108-f06f-4af8-b658-442d30bac8a4';
    layer = kvm.activeLayer;
    feature = layer.features[featureId],
    circleMarker = layer.layerGroup.getLayer(feature.markerId);
    kvm.map.fitBounds(L.latLngBounds([circleMarker.getLatLng()]));
  */

  /*
  * Das ist alles nicht nötig wenn die geänderte Geometrie per Trigger immer automatisch in das Form und das Featureobjekt geschrieben wird.
  * Dann reicht der Klick auf den Save-Button, der der gleiche ist wie der im Form. Form und Map sind Quasi eins, nur mit zwei Seiten zwischen denen geblättert werden kann.
  *
  * Sperrdiv Content Meldung setzen
  * Sperrdiv einblenden
  * Wartesymbol an Stelle des Speicherbutton anzeigen
  * Änderungsdatensatz anlegen
  * Ursprüngliche durch neue Geometrie ersetzen
  *  - im Layerobjekt (z.B. circleMarker)
  *  - im Featureobjekt
  *  - im Formular falls vorhanden
  * Style der ursprünglichen Geometrie auf default setzen
  * editierbare Geometrie aus der Karte löschen und damit Popup der editierbaren Geometrie schließen
  * Binded das default Popup an den dazugehörigen Layer
  * Sperrdiv entfernen
  *
  * Überarbeiten für neue Features evtl.
  */
  this.saveGeometry = function(featureId) {
    var feature = this.features[featureId],
        layer = kvm.map._layers[feature.markerId],
        latlng = feature.editableLayer.getLatLng();

    $('#sperr_div_content').html('Aktualisiere die Geometrie');
    $('#sperr_div').show();
//    $('#save_geometry_button').toggleClass('fa-check-square-o fa-spinner fa-pulse');

    /*
    * Änderung der Geometrie speichern wie folgt:
    * 
    */
    // Speichern des Formulares ohne es zu zeigen.
    //  - Dabei wird der Änderungsdatensatz erzeugt (Delta als hätte man das Form gespeichert)

    //  - Die Änderung im Featureobjekt vorgenommen
    feature.geom = feature.newGeom;

    if (layer) {
      // Ursprüngliche durch neue Geometrie ersetzen
      //  - im Layerobjekt (z.B. circleMarker)
      layer.setLatLng(feature.editableLayer.getLatLng());
    }
    else {
      // ToDo: layer neu anlegen und zur Layergruppe hinzufügen, siehe drawFeature
      // die Funktion in drawFeature und hier zusammenlegen zu einer Funktion die hier und da aufgerufen wird.

      // circleMarker erzeugen mit Popup Eventlistener
      var circleMarker = L.circleMarker(feature.wkxToLatLngs(feature.newGeom), {
        renderer: kvm.myRenderer,
        featureId: feature.id
      }).bindPopup(this.getPopup(feature));
      circleMarker.setStyle(feature.getNormalCircleMarkerStyle());
      circleMarker.on('click', function(evt) {
        kvm.log(kvm.activeLayer.activeFeature.editable, 4);
        if (kvm.activeLayer.activeFeature.editable) {
          $('.popup-functions').hide();
        }
        else {
          if (kvm.activeLayer.activeFeature) {
            kvm.activeLayer.activeFeature.unselect();
          }
          kvm.activeLayer.features[evt.target.options.featureId].select();
        }
      });

      // circleMarker als Layer zur Layergruppe hinzufügen
      this.layerGroup.addLayer(circleMarker);
      // layer_id abfragen und in Feature als markerId speichern
      feature.markerId = this.layerGroup.getLayerId(circleMarker);
    }

    // Style der ursprünglichen Geometrie auf default setzen
    layer.setStyle(feature.getNormalCircleMarkerStyle());

    // editierbare Geometrie aus der Karte löschen und damit Popup der editierbaren Geometrie schließen
    feature.setEditable(false);

    kvm.map.closePopup();

    // Binded das default Popup an den dazugehörigen Layer
    layer.bindPopup(this.getPopup(feature));

    feature.select();

  };
  /*
    featureId = '934d121b-18b8-4c0a-b755-f3554ea4388d';
    l = kvm.activeLayer;
    feature = l.features[featureId],
    layer = kvm.map._layers[feature.markerId];
    latlng = feature.editable.getLatLng();
    [latlng.lat, latlng.lng]
  */

  this.collectChanges = function(action) {
    kvm.log('Layer.collectChanges', 4);
    var activeFeature = this.activeFeature,
        changes = [];

    // loop over all elements of the form or over all attributes of the layer respectively
    // compare form element content with old values and if changes exists assign
    changes = $.map(
      this.attributes,
      (function(attr) {
        kvm.log('Vergleiche Werte von Attribut: ' + attr.get('name'));
        var key = attr.get('name'),
            oldVal = activeFeature.get(key),
            newVal = attr.formField.getValue(this.action);

        if (typeof oldVal == 'string') oldVal = oldVal.trim();
        if (typeof newVal == 'string') newVal = newVal.trim();

        kvm.log('Vergleiche ' + attr.get('form_element_type') + ' Attribut: ' + key + '(' + oldVal + ' (' + typeof oldVal + ') vs. ' + newVal + '(' + typeof newVal + '))');

        if (oldVal != newVal) {
          kvm.log('Änderung in Attribut ' + key + ' gefunden.', 3);
          kvm.deb('Änderung in Attribut ' + key + ' gefunden.');
          activeFeature.set(key, newVal);

          return {
            'key': key,
            'value': newVal,
            'type' : attr.getSqliteType()
          }
        }
      }).bind({ action: action})
    );

    return changes;
  };

  /*
  * create deltas for the active dataset related to the actions insert, update or delete
  * create also deltas for image updates for all document attributes
  */
  this.createDeltas = function(action, changes) {
    kvm.log('Erzeuge SQL für Änderung.', 3);
    var deltas = [];

    if (action == 'INSERT') {
      deltas.push({
        "type" : 'sql',
        "change" : 'insert',
        "delta" : '\
          INSERT INTO ' + this.get('schema_name') + '_' + this.get('table_name') + '(' +
            $.map(
              changes,
              function(change) {
                return change.key;
              }
            ).join(', ') + ', \
            ' + this.get('id_attribute') + '\
          )\
          VALUES (' +
            $.map(
              changes,
              function(change) {
                if (change.value == null) {
                  return 'null';
                }
                if (change.type == 'TEXT') {
                  return "'" + change.value + "'";
                }
                else {
                  return change.value;
                }
              }
            ).join(', ') + ', \
            \'' + this.activeFeature.get(this.get('id_attribute')) + '\'\
          )\
        '
      });
    };

    if (action == 'UPDATE') {
      deltas.push({
        "type" : 'sql',
        "change" : 'update',
        "delta" : '\
          UPDATE ' + this.get('schema_name') + '_' + this.get('table_name') + '\
          SET ' +
            $.map(
              changes,
              function(change) {
                if (change.value == null)
                  return change.key + " = null";
                if (change.type == 'TEXT')
                  return change.key + " = '" + change.value + "'";
                else
                  return change.key + " = " + change.value;
              }
            ).join(', ') + '\
          WHERE\
            ' + this.get('id_attribute') + ' = \'' + this.activeFeature.get(this.get('id_attribute')) + '\'\
        '
      });
    };

    if (action == 'DELETE') {
      deltas.push({
        "type" : 'sql',
        "change" : 'delete',
        "delta" : '\
          DELETE FROM ' + this.get('schema_name') + '_' + this.get('table_name') + '\
          WHERE\
            ' + this.get('id_attribute') + ' = \'' + this.activeFeature.get(this.get('id_attribute')) + '\'\
        '
      });
    }
    kvm.log('Änderung sql: ' + JSON.stringify(deltas), 3);
    this.writeDeltas(deltas);
  };

  this.createImgDeltas = function(action, changes) {
    kvm.log('Layer.createImgDeltas action: ' + action + ' changes: ' + JSON.stringify(changes), 4);
    $.each(
      changes,
      (function(index, change) {
        img_old = this.activeFeature.getAsArray(change.key);
        img_new = (change.value ? change.value.slice(1, -1).split(',') : []);

        $.map(
          img_new,
          function(img) {
            if (img_old.indexOf(img) < 0) {
              kvm.activeLayer.writeDeltas([{
                "type" : 'img',
                "change" : 'insert',
                "delta" : img
              }]);
            }
          }
        );

        $.map(
          img_old,
          (function(img) {
            if (img_new.indexOf(img) < 0) {
              // Remove insert delta of the image if exists, otherwise insert a delete delta for the img
              sql = "\
                SELECT\
                  *\
                FROM\
                  " + this.get('schema_name') + '_' + this.get('table_name') + "_deltas\
                WHERE\
                  change = 'insert' AND\
                  delta LIKE '%" + img + "%'\
              ";
              kvm.log('Layer.createImgDeltas Abfrage ob insert für Bild in deltas table existiert mit sql: ' + sql, 3);
              kvm.db.executeSql(
                sql,
                [],
                (function(rs) {
                  kvm.log('Layer.createImgDeltas Abfrage erfolgreich, rs: ' + JSON.stringify(rs), 4);
                  var numRows = rs.rows.length;

                  kvm.log('numRows: ' + numRows, 4);
                  if (numRows > 0) {
                    // lösche diesen Eintrag
                    sql = "\
                      DELETE FROM " + this.get('schema_name') + '_' + this.get('table_name') + "_deltas\
                      WHERE\
                        change = 'insert' AND\
                        delta LIKE '%" + img + "%'\
                    ";
                    kvm.log('Layer.createImgDeltas: insert delta vorhanden, Lösche diesen mit sql: ' + sql, 4);
                    kvm.db.executeSql(
                      sql,
                      [],
                      function(rs) {
                        kvm.log('Löschen des insert deltas erfolgreich', 3);
                      },
                      function(error) {
                        navigator.notification.alert(
                          'Fehler beim Löschen der Bildänderung!\nFehlercode: ' + error.code + '\nMeldung: ' + error.message
                        );
                      }
                    )
                  }
                  else {
                    kvm.log('Layer.createImgDeltas: kein insert delta vorhanden. Trage delete delta ein.', 3);
                    // Add delte of image to deltas table
                    this.writeDeltas([{
                      "type" : 'img',
                      "change" : 'delete',
                      "delta" : img
                    }]);
                  }
                }).bind(this),
                function(error) {
                  navigator.notification.alert(
                    'Fehler bei der Speicherung der Änderungsdaten für das Bild in der delta-Tabelle!\nFehlercode: ' + error.code + '\nMeldung: ' + error.message
                  );
                }
              );
            }
          }).bind(this)
        )
      }).bind(this)
    );
  };

  /*
  * exec sql in layer table and read Data again
  *
  * ToDo: Hier nicht alle Daten neu laden, sondern nur den gänderten Datensatz in Liste, Form und Karte aktualisieren
  * bzw. auf den Stand bringen als wäre er neu geladen. Wird weiter oben schon in callback von click on saveFeatureButton gemacht.
  *
  */
  this.execDelta = function(delta) {
    kvm.log('Layer.execDelta: ' + JSON.stringify(delta), 4);
    kvm.db.executeSql(
      delta,
      [],
      (function(rs) {
        kvm.log('Layer.execDelta Sql ausgeführt.', 4);
        //this.readData();
        //ToDo: Hier endet das log beim Speichern eines neuen Datensatzes.

        if (kvm.activeLayer.activeFeature.options.new) {
          kvm.activeLayer.activeFeature.options.new = false;
          kvm.activeLayer.activeFeature.addListElement();
        }
        else {
          kvm.activeLayer.activeFeature.updateListElement();
        }

        kvm.activeLayer.saveGeometry(kvm.activeLayer.activeFeature.id);

        kvm.showItem($('#formular').is(':visible') ? 'featurelist' : 'map');

        // Sperrdiv entfernen
        $('#sperr_div').hide();

      }).bind(this),
      function(error) {
        navigator.notification.confirm(
          'Fehler bei der Speicherung der Änderungen aus dem Formular!\nFehlercode: ' + error.code + '\nMeldung: ' + error.message,
          function(buttonIndex) {
            // ToDo handling choices after error
          },
          'Datenbank',
          ['Abbruch']
        );
      }
    );
  };

  /*
  * Schreibe Deltas mit . Trenner zwischen Schema und Tablle in die sqlite deltas Tabelle und
  * führe diese nach Erfolg in sqlite aus.
  */
  this.writeDeltas = function(deltas) {
    kvm.log('Layer.writeDeltas', 4);

    $.each(
      deltas,
      (function(index, delta) {
        var sql = "\
              INSERT INTO " + this.get('schema_name') + '_' + this.get('table_name') + "_deltas (\
                type,\
                change,\
                delta,\
                created_at\
              )\
              VALUES (\
                '" + delta.type + "',\
                '" + delta.change + "',\
                '" + this.underlineToPointName(delta.delta, this.get('schema_name'), this.get('table_name')).replace(/\'/g, '\'\'') + "',\
                '" + (new Date()).toISOString().replace('Z', '') + "'\
              )\
            ";

        kvm.log('Schreibe Deltas in Tabelle ' + this.get('schema_name') + '_' + this.get('table_name') + '_deltas sql: ' + sql, 3);

        kvm.db.executeSql(
          sql,
          [],
          (function(rs) {
            kvm.log('Layer.writeDeltas Speicherung erfolgreich.', 4);
            if (delta.type == 'sql') {
              this.execDelta(delta.delta);
            }
          }).bind(this),
          function(error) {
            kvm.msg('Fehler bei der Speicherung der Änderungsdaten in delta-Tabelle!\nFehlercode: ' + error.code + '\nMeldung: ' + error.message, 'Fehler');
          }
        );
      }).bind(this)
    );
  };

  this.appendToList = function() {
    kvm.log('Füge Layer ' + this.get('title') + ' zur Layerliste hinzu.', 3);
    $('#layer_list').append(this.getListItem());
  };

  this.getGlobalId = function() {
    return this.stelle.get('id') + '_' + this.get('id');
  };

  this.getListItem = function() {
    var html = '\
      <div id="layer_' + this.getGlobalId()  + '">\
        <input type="radio" name="activeLayerId" value="' + this.getGlobalId() + '"/> ' +
        (this.get('alias') ? this.get('alias') : this.get('title')) + '\
        <button id="syncLayerButton_' + this.getGlobalId() + '" value="' + this.getGlobalId() + '" class="settings-button sync-layer-button inactive-button" style="float: right; display: none;">\
          <i id="syncLayerIcon_' + this.getGlobalId() + '" class="fa fa-refresh" aria-hidden="true"></i>\
        </button>\
        <button id="syncImagesButton_' + this.getGlobalId() + '" value="' + this.getGlobalId() + '" class="settings-button sync-images-button inactive-button" style="float: right; margin-right: 5px; display: none;">\
          <i id="syncImagesIcon_' + this.getGlobalId() + '" class="fa fa-upload" aria-hidden="true"></i>\
        </button>\
        <button id="clearLayerButton_' + this.getGlobalId() + '" value="' + this.getGlobalId() + '" class="settings-button clear-layer-button" style="float: right; margin-right: 5px; display: none;">\
          <i id="clearLayerIcon_' + this.getGlobalId() + '" class="fa fa-ban" aria-hidden="true"></i>\
        </button>\
        <button id="reloadLayerButton_' + this.getGlobalId() + '" value="' + this.getGlobalId() + '" class="settings-button reload-layer-button" style="float: right; display: none;">\
          <i id="reloadLayerIcon_' + this.getGlobalId() + '" class="fa fa-window-restore" aria-hidden="true"></i>\
        </button>\
      </div>\
      <div style="clear: both"></div>';
    return html;
  };

  this.getSyncUrl = function() {
    kvm.log('Layer.getSyncUrl', 4);
    var url = this.stelle.get('url'),
        file = this.stelle.getUrlFile(url);

    url += file +
      'Stelle_ID=' + stelle.get('Stelle_ID') + '&' +
      'login_name=' + stelle.get('login_name') + '&' +
      'selected_layer_id=' + this.get('id') + '&' +
      'passwort=' + stelle.get('passwort');

    if (this.isEmpty()) {
      // get all data as new base for deltas
      url += '&' +
        'go=Daten_Export_Exportieren' + '&' +
        'export_format=GeoJSONPlus' + '&' +
        'all=1' + '&' +
        'epsg=4326';

      kvm.log('Hole initial alle Daten mit Url: ' +  url, 3);
    }
    else {
      // sync deltas
      url += '&' +
      'go=mobile_sync' + '&' +
      'pullVersionFrom=1';
      kvm.log('Hole Deltas mit Url: ' + url);
    }

    return url;
  };

  this.getImgDownloadUrl = function(image) {
    kvm.log('Layer.getImgDownloadUrl', 4);
    var url = this.stelle.get('url'),
        file = this.stelle.getUrlFile(url);

    url += file +
        'Stelle_ID=' + stelle.get('Stelle_ID') + '&' +
        'login_name=' + stelle.get('login_name') + '&' +
        'passwort=' + stelle.get('passwort') + '&' +
        'go=mobile_download_image' + '&' +
        'image=' + image;
    return url;
  };

  this.downloadError = function (error) {
    kvm.log("download error source " + error.source);
    kvm.log("download error target " + error.target);
    kvm.log("download error code: " + error.code);
    kvm.log("download error http_status: " + error.http_status);
    alert('Fehler beim herunterladen der Datei von der Url: ' + error.source + '! Error code: ' + error.code + ' http_status: ' + error.http_status);
  };

  this.saveToStore = function() {
    kvm.log('Speicher Settings für Layer: ' + this.settings.title, 3);
    var layerIds = $.parseJSON(kvm.store.getItem('layerIds_' + this.stelle.get('id'))),
        settings = JSON.stringify(this.settings);

    if (layerIds == null) {
      layerIds = [];
    }
    settings.loaded = false;
    kvm.store.setItem('layerSettings_' + this.getGlobalId(), settings);

    if ($.inArray(this.get('id'), layerIds) < 0) {
      layerIds.push(this.get('id'));
      kvm.store.setItem(
        'layerIds_' + this.stelle.get('id'),
        JSON.stringify(layerIds)
      );
    }
  };

  this.setActive = function() {
    kvm.log('Setze Layer ' + this.get('title') + ' (' + (this.get('alias') ? this.get('alias') : 'kein Aliasname') + ') auf aktiv.', 3);
    kvm.activeLayer = this;
    kvm.store.setItem('activeLayerId', this.get('id'));

    $.each(
      this.attributes,
      function(key, value) {
        var option = value.settings.name;
        $('#anzeigeSortSelect')
        .append($('<option>', { value : value.settings.value })
        .text(value.settings.alias));
      }
    );

    this.createFeatureForm();
    this.createDataView();
    $('input[name=activeLayerId]').checked = false
    $('input[value=' + this.getGlobalId() + ']')[0].checked = true;
    $('.reload-layer-button').hide();
    $('#reloadLayerButton_' + this.getGlobalId()).show();
    $('.sync-layer-button').hide();
    $('#syncLayerButton_' + this.getGlobalId()).show();
    $('.sync-images-button').hide();
    $('#syncImagesButton_' + this.getGlobalId()).show();
    $('.clear-layer-button').hide();
    $('#clearLayerButton_' + this.getGlobalId()).show();
    $('#showDeltasButton').show();
    if (parseInt(this.get('privileg')) > 0) {
      $('#newFeatureButton').show();
    }
  };

  this.notNullValid = function() {
    var errMsg = '';

    $.each(
      kvm.activeLayer.attributes,
      function(i, v) {
        if (v.get('nullable') == 0 && v.formField.getValue() == null) {
          errMsg += 'Das Feld ' + v.get('alias') + ' benötigt eine Eingabe! ';
        }
      }
    )

    return errMsg;
  };

  return this;
};

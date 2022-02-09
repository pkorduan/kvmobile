function Layer(stelle, settings = {}) {
  var layer_ = this;
  this.stelle = stelle;
  this.settings = (typeof settings == 'string' ? $.parseJSON(settings) : settings);
  kvm.log('Erzeuge Layerobjekt für Layer ' + this.settings.title + ' (id: ' + this.settings.id + ') in Stelle: ' + stelle.get('id'), 3);
  if (this.settings['name_attribute'] == '') {
    this.settings['name_attribute'] = this.settings['id_attribute'];
    console.log('Set id_attribute: %s as name_attribute', this.settings['id_attribute']);
  }
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
  this.id_attribute = 'uuid';

  if (this.settings.attributes) {
    this.attributes = $.map(
      this.settings.attributes,
      function(attribute) {
        return new Attribute(layer_, attribute);
      }
    );
    this.attribute_index = this.attributes.reduce(
      (hash, elem) => {
        hash[elem.settings.name] = Object.keys(hash).length;
        return hash
      },
      {}
    );
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
    console.log('isEmpty? syncVersion: ', this.get('syncVersion'));
    return (
      typeof this.get('syncVersion') == 'undefined' ||
      this.get('syncVersion') == null ||
      this.get('syncVersion') == '' ||
      this.get('syncVersion') == 0 ||
      (this.get('syncVersion') != '' && this.numFeatures == 0)
    );
  };

  this.setEmpty = function() {
    this.set('syncVersion', 0);
    this.runningSyncVersion = 0
  };

  /*
  * Load data from local db from offset to offset + limit and
  * show in list view if layer is active
  */
  this.readData = function(limit = 50000, offset = 0, order = '') {
    kvm.log('readData) Layer.readData from table: ' + this.get('schema_name') + '_' + this.get('table_name'), 3);
  //  order = (this.get('name_attribute') != '' ? this.get('name_attribute') : this.get('id_attribute'));
    $('#sperr_div').show();

    var filter = [],
        order = $('#anzeigeSortSelect').val(),
        sql = '';

    delete this.activeFeature;

    filter = $('.filter-view-field')
      .filter(
        function(i, field) {
          var value = $(field).find('.filter-view-value-field').val();
          return (value !== undefined && value != '');
        }
      )
      .map(
        function(i, field) {
          var bracket = kvm.bracketForType($(field).attr('database_type'));
          return $(field).attr('name') + ' '
            + $(field).find('.filter-view-operator select').val() + ' '
            + bracket + $(field).find('.filter-view-value-field').val() + bracket;
        }
      )
      .get();
    if ($('#statusFilterSelect').val() != '') {
      filter.push($('#statusFilterSelect').val());
    }

    if ($('#historyFilter').is(':checked')) {
      filter.push('endet IS NOT NULL');
    }
    else {
      filter.push('endet IS NULL');
    }

    sql = "\
      SELECT\
        " + this.getSelectExpressions().join(', ') + "\
      FROM\
        " + this.get('schema_name') + '_' + this.get('table_name') + "\
      " + (filter.length > 0 ? "WHERE " + filter.join(' AND ') : "") + "\
      " + (order  != "" ? "ORDER BY " + order + "" : "") + "\
      " + (limit == 0 && offset == 0 ? "" : "LIMIT " + limit + " OFFSET " + offset) + "\
    ";
    kvm.log('readData) Lese Daten aus lokaler Datenbank mit Sql: ' + sql, 3, true);
    kvm.db.executeSql(
      sql,
      [],
      (function(rs) {
        //kvm.log('Layer.readData result: ' + JSON.stringify(rs), 4);

        var numRows = rs.rows.length,
            item,
            i;

        kvm.log('  readData) ' + numRows + ' Datensätze gelesen, erzeuge Featureliste neu...', 3, true);
        this.numFeatures = numRows;
  
        this.features = {};
        //console.log('id_attribute: %o', this.get('id_attribute'));
        if (numRows == 0) {
          if (filter.length > 0) {
            //console.log('filter %o', filter);
            //kvm.msg('Abfrage liefert keine Ergebnisse. Daten synchronisieren, erstellen oder Filter anpassen.', 'Datenfilter');
          }
          else {
            kvm.msg('  readData) Tabelle ist leer. Unter Einstellungen des Layers können Daten synchronisiert werden.', 'Datenbank')
          }
        }

        // create the features for this layer
        for (i = 0; i < numRows; i++) {
          var item = rs.rows.item(i);
          //console.log('Item ' + i + ': %o', item);
          //console.log('Erzeuge Feature %s: ', i);
          //console.log('Erzeuge Feature von item %o', item);
          this.features[item[this.get('id_attribute')]] = new Feature(
            item, {
              id_attribute: this.get('id_attribute'),
              geometry_type: this.get('geometry_type'),
              geometry_attribute: this.get('geometry_attribute'),
              globalLayerId: this.getGlobalId(),
              new: false
            }
          );
          //console.log('Feature ' + i + ': %o', this.features[item[this.get('id_attribute')]]);
        }
        kvm.log(Object.keys(this.features).length + ' Features erzeugt.');
        if ($('#syncLayerIcon_' + this.getGlobalId()).hasClass('fa-spinner')) {
          $('#syncLayerIcon_' + this.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
        }
        kvm.setConnectionStatus();

        if (typeof kvm.activeLayer != 'undefined' && kvm.activeLayer.get('id') == this.get('id')) {
          console.log('  readData) > createFeatureList');
          this.createFeatureList();
        }

        // draw the features in map
        if (this.layerGroup) {
         this.layerGroup.clearLayers();
        }
        console.log('  readData) > drawFeatures');
        this.drawFeatures();
        $('#sperr_div').hide();
      }).bind(this),
      function(error) {
        kvm.log('Fehler bei der Abfrage der Daten aus lokaler Datenbank: ' + error.message);
        $('#sperr_div').hide();
      }
    );
  };

  /**
  * create the list of features in list view at once
  */
  this.createFeatureList = function() {
    console.log('createFeatureList for layer %s', this.get('alias'));
    kvm.log('Erzeuge die Liste der Datensätze neu.');
    $('#featurelistHeading').html(this.get('alias') ? this.get('alias') : this.get('title'));
    $('#featurelistBody').html('');
    html = '';

    $.each(
      this.features,
      function (key, feature) {
        console.log('append feature: %o to list', feature);
        var needle = $('#searchHaltestelle').val().toLowerCase(),
          element = $(feature.listElement()),
          haystack = element.html().toLowerCase();

        html = html + feature.listElement();
        console.log(feature.get('uuid') + ' zur Liste hinzugefügt.');
        //console.log(html);
      }
    );
    $('#featurelistBody').append(html);
    kvm.bindFeatureItemClickEvents();
    if (Object.keys(this.features).length > 0) {
      kvm.showItem('featurelist');
      $('#numDatasetsText').html(Object.keys(this.features).length).show();
    }
  };

  this.writeData = function(items) {
    kvm.log('Schreibe die empfangenen Daten in die lokale Datebank...', 3, true);
    debug_is = items;
    var tableName = this.get('schema_name') + '_' + this.get('table_name'),
        keys = this.getTableColumns().join(', '),
        values = '(' +
          $.map(
            items,
            function(item) {
              //console.log('item.geometry %', item.geometry);
              if (item.geometry) {
                return $.map(
                  kvm.activeLayer.attributes.filter(function(attr) {
                    return attr.get('saveable') == '1'
                  }),
                  (function(attr) {
                      var type = attr.get('type'),
                          value = (type == 'geometry' ? this.item.geometry : this.item.properties[attr.get('name')]);
                      //console.log('type: %s value: %s', type, value);
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

    kvm.log('lokale Datenbank mit Sql: ' + sql.substring(0, 1000), 4, true);
    kvm.db.executeSql(
      sql,
      [],
      (function(rs) {
        kvm.log('Daten erfolgreich in Datenbank geschrieben.', 3, true);
        this.set('syncVersion', this.runningSyncVersion);
        this.set('syncLastLocalTimestamp', Date());
        this.saveToStore();
        this.setActive();
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
        var sql = this.getCreateTableSql();
        kvm.log('Erzeuge Tabelle mit sql: ' + sql, 3);
        //create table
        tx.executeSql(sql, [],
          (function(tx, res) {
            kvm.log('Tabelle ' + this.get('schema_name') + '_' + this.get('table_name')  + ' erfolgreich angelegt.', 3);
            var tableName = this.get('schema_name') + '_' + this.get('table_name') + '_deltas',
                tableColumnDefinitions = [
                  'version INTEGER PRIMARY KEY',
                  'type text',
                  'change text',
                  'delta text',
                  'created_at text'
                ],
                sql = 'CREATE TABLE IF NOT EXISTS ' + tableName + ' (' + tableColumnDefinitions.join(', ') + ')';
            kvm.log('Erzeuge Delta-Tabelle mit sql: ' + sql, 3);

            tx.executeSql(sql,[],
              (function(tx, res) {
                kvm.log('Deltas Tabelle erfolgreich angelegt.', 3);
                // hier wurde früher der Layer zur Liste und Karte hinzugefügt. wenn alle Tabellen vorhanden waren. Jetzt erfolgt das beim Laden der Anwendung, weil das immer wieder geschehen muss nach dem Start der Anwendung aber natürlich auch nach dem Reload von Layern.

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
    //console.log('updateTable');
    kvm.db.transaction(
      (function(tx) {
        var tableName = this.get('schema_name') + '_' + this.get('table_name'),
            sql = 'DROP TABLE IF EXISTS ' + tableName;

        kvm.log('Lösche Tabelle mit sql: ' + sql, 3);
        tx.executeSql(sql, [],
          (function(tx, res) {
            kvm.log('Tabelle ' + this.get('schema_name') + '_' + this.get('table_name')  + ' erfolgreich gelöscht.', 3);
            var sql = this.getCreateTableSql();
            kvm.log('Erzeuge Tabelle neu mit sql: ' + sql, 3);
            tx.executeSql(sql,[],
              (function(tx, res) {
                kvm.log('Tabelle erfolgreich angelegt.', 3);
                // update layer name in layerlist for this layer
                this.appendToApp();
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

  /**
  * Function returns an array with column expressions
  * for create table statement but only for saveable attributes
  */
  this.getTableColumnDefinitions = function() {
    var tableColumnDefinitions = $.map(
      this.attributes.filter(function(attr) {
        return attr.get('saveable') == '1';
      }),
      function(attr) {
        return attr.get('name') + ' ' + attr.getSqliteType() + (attr.get('nullable') == '0 ' ? ' NOT NULL' : '');
      }
    );
    return tableColumnDefinitions;
  };

  this.getTableColumns = function() {
    kvm.log('getTableColumns', 4);
    var tableColumns = $.map(
      this.attributes.filter(function(attr) {
        return attr.get('saveable') == '1';
      }),
      function(attr) {
        return attr.get('name');
      }
    );
    //console.log('Return tableColumns: %o', tableColumns);
    return tableColumns;
  };

  this.getColumnValues = function() {
    kvm.alog('getColumnValues', '', 4)
    var values = $.map(
          this.attributes.filter(function(attr) {
            return attr.get('saveable') == '1';
          }),
          function(attr) {
            var type = attr.get('type'),
                value = this.activeFeature.get(attr.get('name'));

            v = attr.toSqliteValue(type, value);
            return v;
          }
        );
        kvm.alog('values: %o', values, 4);
    return values;
  };

  /**
  * Erzeugt und liefert das SQL zum Anlegen der Datentabelle
  */
  this.getCreateTableSql = function() {
    kvm.log('getCreateTableSql', 4);
    var tableName = this.get('schema_name') + '_' + this.get('table_name'),
        tableColumnDefinitions = this.getTableColumnDefinitions(),
        sql = 'CREATE TABLE IF NOT EXISTS ' + tableName + ' (' + tableColumnDefinitions.join(', ') + ', endet TEXT)';

    return sql;
  };

  /**
  * Function returns an array with column expressions for select statement
  * use attribute name, if difference from real_name use it in stead
  */
  this.getSelectExpressions = function() {
    var selectExpressions = $.map(
      this.attributes,
      function(attr) {
        return (attr.get('name') != attr.get('real_name') ? attr.get('real_name') + ' AS ' + attr.get('name') : attr.get('name'));
      }
    );
    return selectExpressions;
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

                //console.log('Download Ergebnis (Head 1000): %s', this.result.substring(0, 1000));
                try {
                  this.result = this.result.replace("\n", "\\\n");
                  collection = $.parseJSON(this.result);
                  kvm.log('Anzahl empfangene Datensätze: ' + collection.features.length, 3);
                  var layer = kvm.activeLayer;
                  kvm.log('Version in Response: ' + collection.lastDeltaVersion, 3);
                  layer.runningSyncVersion = collection.lastDeltaVersion;
                  kvm.log('Version der Daten: ' + layer.runningSyncVersion, 3);
                  if (collection.features.length > 0) {
                    layer.writeData(collection.features);
                  }
                  else {
                    kvm.msg('Keine Daten zum Download vorhanden. Lokale Änderungen können jetzt synchronisiert werden.', 'Hinweis');
                    layer.set('syncVersion', layer.runningSyncVersion);
                    layer.set('syncLastLocalTimestamp', Date());
                    if ($('#syncLayerIcon_' + layer.getGlobalId()).hasClass('fa-spinner')) {
                      $('#syncLayerIcon_' + layer.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
                    }
                    $('#sperr_div').hide();
                  }
                } catch (e) {
                  errMsg = 'Fehler beim Parsen der heruntergeladenen Daten: ' + this.result;
                  //console.log('Anfrage: %s', kvm.getSyncUrl)
                  kvm.msg(errMsg, 'Fehler');
                  kvm.log(errMsg, 1);
                  if ($('#syncLayerIcon_' + kvm.activeLayer.getGlobalId()).hasClass('fa-spinner')) {
                    $('#syncLayerIcon_' + kvm.activeLayer.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
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

        //console.log(fileName);
        //console.log(dirEntry);

        dirEntry.getFile(
          fileName,
          { create: true, exclusive: false },
          (function (fileEntry) {
            // Write something to the file before uploading it.
            this.writeFile(fileEntry, deltas_);
          }).bind(this),
          function(err) {
            kvm.msg('Fehler beim Erzeugen der Delta-Datei, die geschickt werden soll.', 'Upload Änderungen');
            if ($('#syncLayerIcon_' + kvm.activeLayer.getGlobalId()).hasClass('fa-spinner')) {
              $('#syncLayerIcon_' + kvm.activeLayer.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
              $('#sperr_div').hide();
            }
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
        kvm.log('Synchronisierung erfolgreich auf dem Server durchgeführt.', 3);
        kvm.log('Antwort vom Server: ' + JSON.stringify(response), 3);
        this.numExecutedDeltas = 0;
        this.numReturnedDeltas = response.deltas.length;
        debug_r = response.deltas;
        console.log('numReturendDeltas before execute deltas: %s', this.numReturnedDeltas);
        console.log('response.deltas.length: %s', response.deltas.length);

        if (this.numReturnedDeltas > 0) {
          $.each(
            response.deltas,
            (function(index, value) {
              if (kvm.coalesce(value.sql, '') != '') {
                kvm.alog('Führe Änderungen vom Server auf dem Client aus: ', value.sql, 4);
                console.log('Execute sql von version: %s', value.version);
                this.execSql(
                  this.pointToUnderlineName(value.sql, this.get('schema_name'), this.get('table_name')),
                  (this.execServerDeltaSuccessFunc).bind({ context: this, response: response, numReturnedDeltas: this.numReturnedDeltas})
                );
              }
            }).bind(this)
          );
        }
        else {
          this.set('syncVersion', parseInt(response.syncData[response.syncData.length - 1].push_to_version));
          this.runningSyncVersion = this.get('syncVersion');
          this.saveToStore();
          kvm.msg('Keine Änderungen vom Server bekommen! Die aktuelle Version ist: ' + this.get('syncVersion'));
          this.clearDeltas('sql');
          this.readData($('#limit').val(), $('#offset').val());
        }
      }
      else {
        kvm.msg(response.err_msg, 'Daten Synchronisieren');
      }
      if ($('#syncLayerIcon_' + this.getGlobalId()).hasClass('fa-spinner')) {
        $('#syncLayerIcon_' + this.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
      }
        $('#sperr_div').hide();
      // displayFileData(fileEntry.fullPath + " (content uploaded to server)");
    }).bind(this);

    var fail = function (error) {
      var msg = 'Fehler beim Hochladen der Sync-Datei! Prüfe die Netzverbindung! Fehler Nr: ' + error.code;
      kvm.msg(msg);
      kvm.log(msg, 1);
      if ($('#syncLayerIcon_' + this.getGlobalId()).hasClass('fa-spinner')) {
        $('#syncLayerIcon_' + this.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
      }
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
  * -- Registrieren wenn alle Bilder synchronisiert wurden, dann sperr_div aus und Erfolgsmeldung.
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
            this.layer.clearDeltas('img', this.img);
        }).bind({
          layer : this,
          img : img
        }),
        fail = (function (error) {
          //console.log('err: %o', error);
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
    options.chunkedMode = false;
    options.headers = {
      Connection: "close"
    };

    kvm.log('upload to url: ' + server, 3);
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
          this.layer.clearDeltas('img', this.img);
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

    $('#sperr_div_content').html('Synchronisiere Daten mit Server.');

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
  * Delete all features from layer, store, feature list, map and its data in the database table and deltas
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
      (function(rs) {
        kvm.store.removeItem('layerFilter');
        //console.log('removeItem %o', 'layerSettings_' + this.getGlobalId());
        //kvm.store.removeItem('layerSettings_' + this.getGlobalId());
        $('numDatasetsText').html('0');
/*
        navigator.notification.confirm(
          'Alle Daten der Tabelle ' + this.get('schema_name') + '.' + this.get('table_name') + ' in lokaler Datenbank gelöscht.',
          function(buttonIndex) {},
          'Datenbank',
          ['OK']
        );
*/
      }).bind(this),
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

    this.clearDeltas('all');
    this.features = [];
    $('#featurelistBody').html('');
    if (this.layerGroup) {
      this.layerGroup.clearLayers();
    }
    this.setEmpty();
  };

  this.clearDeltas = function(type, delta) {
    if (typeof delta === 'undefined') delta = '';
    kvm.log('Layer.clearDeltas', 4);
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
/*
        navigator.notification.confirm(
          'Synchronisierung der Änderungen abgeschlossen.',
          function(buttonIndex) {
          },
          'Datenbank',
          ['OK']
        );
*/
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
      this.attributes.filter(function(attribute) { return attribute.get('type') != 'geometry'; }),
      function(attr) {
        $('#dataViewDiv').append(
          attr.viewField.withLabel()
        ).append('<div style="clear: both">');
        attr.viewField.bindEvents();
      }
    );
  };

  this.getIcon = function() {
    return L.icon({
//        iconUrl: 'img/hst24.png',
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
      this.attributes.filter(function(attribute) { return attribute.get('type') != 'geometry'; }),
      (function(attr) {
        var key = attr.get('name'),
            val = this.get(key);

        attr.viewField.setValue(val);
      }).bind(feature)
    );
    this.selectFeature(feature, true);
  };

  this.selectFeature = function(feature, zoom = true) {
    kvm.log('Selectiere Feature ' + feature.id, 4);

    // deselect feature if a selected exists
    if (this.activeFeature) {
      this.activeFeature.unselect();
    }
    this.activeFeature = feature.select(zoom);
  };

  /*
  * - Befüllt das Formular des Layers mit den Attributwerten des übergebenen Features
  * - Setzt das Feature als activeFeature im Layer
  * - Startet das GPS-Tracking
  */
  this.loadFeatureToForm = function(feature, options = { editable: false}) {
    kvm.log('Layer.loadFeatureToForm.', 4);
    this.activeFeature = feature;

    $.map(
      this.attributes,
      (function(attr) {
        var key = attr.get('name'),
            val = this.get(key),
            req_by_idx;

        // Set Default values if feature is new and not nullable
        if (
          this.options.new &&
          attr.get('nullable') == 0 &&
          attr.get('default') != ''
        ) {
          val = attr.get('default');
        }
        console.log('Feature is new? %s', this.options.new);
        console.log('Set %s %s: %s', attr.get('form_element_type'), key, val);
        attr.formField.setValue(val);
        if (kvm.coalesce(attr.get('req_by'), '') != '') {
          req_by_idx = kvm.activeLayer.attribute_index[attr.get('req_by')];
          kvm.activeLayer.attributes[req_by_idx].formField.filter_by_required(
            attr.get('name'),
            val
          );
        }
      }).bind(feature)
    );
    $('#geom_wkt').val(feature.geom.toWkt());
    $('#goToGpsPositionButton').show();
    if (options.editable) {
      kvm.controller.mapper.watchGpsAccuracy();
    }
  };

  this.loadTplFeatureToForm = function(tplId) {
    kvm.log('Layer.loadTplFeatureToForm.', 4);
    $.map(
      this.attributes,
      (function(attr) {
        var key = attr.get('name'),
            val = this.get(key); // this is here the tplFeature

        if (!['uuid', 'version', this.options.geometry_attribute].includes(key)) {
          //console.log('Set %s %s: %s', attr.get('form_element_type'), key, val);
          attr.formField.setValue(val);
        }
      }).bind(this.features[tplId])
    );
  };

  /*
  * Zeichnet die Features in die Karte
  */
  this.drawFeatures = function() {
    kvm.log('Zeichne ' + Object.keys(this.features).length + ' Features von Layer ' + this.get('title'), 3);

    $.each(
      this.features,
      (function (key, feature) {
        var vectorLayer;

        if (feature.newGeom) {
          //console.log('Zeichne Feature: %o in Layer: ', feature, this.get('title'));
          if (feature.options.geometry_type == 'Point') {
            vectorLayer = L.circleMarker(feature.wkxToLatLngs(feature.newGeom), {
              renderer: kvm.myRenderer,
              featureId: feature.id
            });
          }
          else if (feature.options.geometry_type == 'Line') {
            vectorLayer = L.polyline(feature.wkxToLatLngs(feature.newGeom), {
              renderer: kvm.myRenderer,
              featureId: feature.id
            });
          }
          else if (feature.options.geometry_type == 'Polygon') {
            vectorLayer = L.polygon(feature.wkxToLatLngs(feature.newGeom), {
              renderer: kvm.myRenderer,
              featureId: feature.id
            });
          }

          // Popup zum Kartenobjekt hinzufügen
          const popupFct = (layer) => {
            console.log('popupFct activelayer: %s, this: %s', kvm.activeLayer.getGlobalId(), this.getGlobalId());
            return this.getPopup(feature, kvm.activeLayer.getGlobalId() == this.getGlobalId() && !(kvm.activeLayer.activeFeature && kvm.activeLayer.activeFeature.editable));
          }
          vectorLayer.bindPopup(popupFct);

          // Das angeklickte Feature selektieren wenn der Layer selektiert ist zu dem das Feature gehört
          // und gerade kein anderes feature editiert wird.
          vectorLayer.on(
            'click',
            function(evt) {
              if (
                evt.target.options.featureId in kvm.activeLayer.features &&
                !(kvm.activeLayer.activeFeature && kvm.activeLayer.activeFeature.editable)
              ) {
                console.log('Select the clicked feature');
                kvm.activeLayer.selectFeature(kvm.activeLayer.features[evt.target.options.featureId], false);
              }
            }
          );

          // Setze default Style für Kartenobjekt
          vectorLayer.setStyle(feature.getNormalStyle());

          // Kartenobjekt als Layer zur Layergruppe hinzufügen
          this.layerGroup.addLayer(vectorLayer);

          // layer_id abfragen und in Feature als layerId speichern
          feature.layerId = this.layerGroup.getLayerId(vectorLayer);
        }
      }).bind(this)
    );
    kvm.log('Featuregeometrie gezeichnet', 4);
    this.layerGroup.addTo(kvm.map);
    this.selectLayerInControl();
    kvm.log('layerGroup zur Karte hinzugefügt.', 4)
  };

  this.selectLayerInControl = function() {
    console.log('selectLayerInControl layer: ', this.get('alias'));
    $(".leaflet-control-layers-overlays span").removeClass('active-layer');
    $(".leaflet-control-layers-overlays :contains('" + this.get('alias') + "') span").addClass('active-layer');
  };

  this.getPopup = function(feature, isActive) {
    var html;

    html = '<b>' + this.get('title') + '</b><br>' + feature.getLabelValue() + '<br>\
      <div\
        id="popupFunctions_' + this.getGlobalId() + '"\
        class="' + (isActive ? 'popup-functions' : 'no-popup-functions') + '"\
      >\
        <a\
          href="#"\
          title="Geometrie ändern"\
          onclick="kvm.activeLayer.editFeature(\'' + feature.get(this.get('id_attribute')) + '\')"\
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
    return html;
  };

  /*
  * Deselectiert das aktive Feature falls vorhanden
  * Legt ein neues Feature Objekt ohne Geometry an und
  * ordnet diese activeFeature zu
  */
  this.newFeature = function() {
    kvm.log('Layer.newFeature', 4);

    if (this.activeFeature) {
      this.activeFeature.unselect();
    }
    this.activeFeature = new Feature(
      '{ "' + this.get('id_attribute') + '": "' + kvm.uuidv4() + '", "version": "' + ((this.get('syncVersion') == 'null' ? 0 : this.get('syncVersion')) + 1) + '"}',
      {
        id_attribute: 'uuid',
        geometry_type: this.get('geometry_type'),
        geometry_attribute: this.get('geometry_attribute'),
        globalLayerId: this.getGlobalId(),
        new: true
      }
    );
    //console.log('Neues Feature mit id: %s erzeugt.', this.activeFeature.id);
  };

  this.editFeature = function(featureId = null) {
    kvm.log('Layer.editFeature', 4);

    if (this.activeFeature == undefined && featureId != null) {
      this.selectFeature(this.features[featureId], true);
    }

    if (this.activeFeature.geom) {
      this.startEditing();
    }
    else {
      if ($('#newPosSelect').val() == 1) {
        navigator.geolocation.getCurrentPosition(
          function(geoLocation) {
            //console.log('Starte Editierung an GPS-Coordinate');
            kvm.activeLayer.startEditing(
              kvm.activeLayer.getStartGeomAtLatLng([geoLocation.coords.latitude, geoLocation.coords.longitude])
            );
            $('#gpsCurrentPosition').html(geoLocation.coords.latitude.toString() + ' ' + geoLocation.coords.longitude.toString());
          },
          function(error) {
            //console.log('Starte Editierung in Bildschirmmitte');
            var center = kvm.map.getCenter();
            kvm.activeLayer.startEditing(
              kvm.activeLayer.getStartGeomAtLatLng([center.lat, center.lng])
            );
            navigator.notification.confirm(
              'Da keine GPS-Position ermittelt werden kann, wird die neue Geometrie in der Mitte der Karte gezeichnet. Schalten Sie die GPS Funktion auf Ihrem Gerät ein und suchen Sie einen Ort unter freiem Himmel auf um GPS benutzen zu können.',
              function(buttonIndex) {
                if (buttonIndex == 1) {
                  kvm.log('Einschalten der GPS-Funktion.', 3);
                }
              },
              'GPS-Position',
              ['ok', 'ohne GPS weitermachen']
            );
          },
          {
            maximumAge: 2000, // duration to cache current position
            timeout: 5000, // timeout for try to call successFunction, else call errorFunction
            enableHighAccuracy: true // take position from gps not network-based method
          }
        );
      }
      else {
        var center = kvm.map.getCenter();
        //console.log('Starte Editierung in Bildschirmmitte');
        this.startEditing(
          kvm.activeLayer.getStartGeomAtLatLng([center.lat, center.lng])
        );
      }
    }
  };

  this.getStartGeomAtLatLng = function(latlng) {
    var startGeomSize = 0.0002,
        startGeom;

    if (this.get('geometry_type') == 'Point') {
      startGeom = [{ lat: latlng[0], lng: latlng[1] }];
    }
    else if (this.get('geometry_type') == 'Line') {
      startGeom = [
        { lat: latlng[0], lng: latlng[1] },
        { lat: latlng[0] + startGeomSize, lng: latlng[1] + startGeomSize }
      ];
    }
    else if (this.get('geometry_type') == 'MultiLine') {
      startGeom = [[
        { lat: latlng[0] - startGeomSize / 2, lng: latlng[1] - startGeomSize },
        { lat: latlng[0] + startGeomSize / 2, lng: latlng[1] - startGeomSize / 2 },
        { lat: latlng[0] - startGeomSize / 2, lng: latlng[1] + startGeomSize / 2 },
        { lat: latlng[0] + startGeomSize / 2, lng: latlng[1] + startGeomSize }
      ]];
    }
    else if (this.get('geometry_type') == 'Polygon') {
      startGeom = [[
        { lat: latlng[0] + startGeomSize, lng: latlng[1] + startGeomSize },
        { lat: latlng[0] + startGeomSize, lng: latlng[1] - startGeomSize },
        { lat: latlng[0] - startGeomSize, lng: latlng[1] - startGeomSize },
        { lat: latlng[0] - startGeomSize, lng: latlng[1] + startGeomSize }
      ]];
    }
    //console.log('Verwende Startgeometrie: %o', startGeom);
    return startGeom;
  };

  this.showDataView = function(featureId) {
    this.loadFeatureToView(this.features[featureId]);
    kvm.showItem('dataView');
  };

  /*
  * Wenn alatlng übergeben wurde beginne die Editierung an dieser Stelle statt an der Stelle der Koordinaten des activeFeatures
  * Wird verwendet wenn ein neues Feature angelegt wird, oder das Feature noch keine Geometrie hatte.
  */
  this.startEditing = function(alatlng = []) {
    kvm.log('Layer.startEditing', 4);
    var feature = this.activeFeature,
        vectorLayer;

    if (alatlng.length > 0) {
      kvm.alog('Setzte Geometry für Feature %o', alatlng, 4);
      feature.setGeom(feature.aLatLngsToWkx(alatlng));
      feature.geom = feature.newGeom;
      feature.set(
        feature.options.geometry_attribute,
        feature.wkxToEwkb(feature.geom)
      )
    }
    this.loadFeatureToForm(feature, { editable: true });
    kvm.map.closePopup();
    if (feature.layerId) {
      vectorLayer = this.layerGroup.getLayer(feature.layerId);
      //console.log('Edit VectorLayer: %o in Layer Id: %s von Feature Id: %s.', vectorLayer, feature.layerId, feature.id);
      vectorLayer.unbindPopup();
      vectorLayer.setStyle(feature.getEditModeStyle());
    }
    feature.setEditable(true);

    feature.zoomTo(feature.editableLayer);

    $('deleteFeatureButton').hide();
    if ($('#dataView').is(':visible')) {
      //console.log('Map Is not Visible, open in formular');
      kvm.showItem('formular');
    }
    else {
      //console.log('Map is Visible, keep panel map open.');
      kvm.showItem('mapEdit');
    }
  };

  /*
  * Löscht die editierbare Geometrie
  * zoomt zum ursprünglichen Geometrie
  * Setzt den Style des circle Markers auf den alten zurück
  * Binded das Popup an den dazugehörigen Layers
  * Selectiert das Feature in Karte und Liste
  */
  this.cancelEditGeometry = function(featureId) {
    kvm.log('cancelEditGeometry');
    var feature = this.activeFeature;
    if (featureId) {
      // Ermittelt die layer_id des circleMarkers des Features
      var layer = kvm.map._layers[feature.layerId];

      // Zoom zur ursprünglichen Geometrie
      feature.zoomTo(kvm.map._layers[feature.layerId]);

      //Setzt den Style des circle Markers auf den alten zurück
      kvm.map._layers[feature.layerId].setStyle(feature.getNormalStyle());

      // Binded das Popup an den dazugehörigen Layer
      // Popup zum Kartenobjekt hinzufügen
      const popupFct = (layer) => {
        console.log('popupFct activelayer: %s, this: %s', kvm.activeLayer.getGlobalId(), this.getGlobalId());
        return this.getPopup(feature, kvm.activeLayer.getGlobalId() == this.getGlobalId() && !(kvm.activeLayer.activeFeature && kvm.activeLayer.activeFeature.editable));
      }
      kvm.map._layers[feature.layerId].bindPopup(popupFct);
      
      this.selectFeature(feature);
    }
    else {
      // Beende das Anlegen eines neuen Features
      kvm.map.removeLayer(kvm.activeLayer.activeFeature.editableLayer);
      // Löscht die editierbare Geometrie
      feature.unselect();
      kvm.showItem('map');
    }
    feature.setEditable(false);
    // sorge dafür dass die buttons wieder in den Popups angezeigt werden. Kann aber wahrscheinlich hier wieder raus,
    // weil das in der Popup-Funktion geregelt wird was angezeigt wird.
    $('.popup-functions').show();
  }

  /**
  * ToDo: Prüfen ob der Algorithmus so ist wie hier beschrieben und Doku anpassen
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
  this.saveGeometry = function(feature) {
    //console.log('saveGeometry mit feature: %o', feature);
    var layer,
        vectorLayer;

    if (feature.options.geometry_type == 'Point') {
      latlng = feature.editableLayer.getLatLng();
//      console.log('latlng: %o', latlng);
    }
    else if (feature.options.geometry_type == 'Line') {
      latlngs = feature.editableLayer.getLatLngs();
//      console.log('latlngs: %o', latlngs);
    }
    else if (feature.options.geometry_type == 'Polygon') {
      latlngs = feature.editableLayer.getLatLngs();
//      console.log('latlngs: %o', latlngs);
    }

    if (feature.layerId) {
      //console.log('feature.layerId: %s', feature.layerId);
      var layer = kvm.map._layers[feature.layerId];
      //console.log('layer extrahiert: %o', layer);
    }

    $('#sperr_div_content').html('Aktualisiere die Geometrie');
    $('#sperr_div').show();

// Ist schon passiert durch readDataset
//    console.log('setze neue geometry for feature: %o', feature.newGeom);
//    //  - Die Änderung im Featureobjekt vorgenommen
//    feature.geom = feature.newGeom;

    if (layer) {
      this.layerGroup.removeLayer(feature.layerId);
    }
/*
      // Ursprüngliche durch neue Geometrie ersetzen
      //  - im Layerobjekt (z.B. circleMarker)
      console.log('setLatLng from editable layer');
      layer.setLatLng(feature.editableLayer.getLatLng());

      console.log('Style der ursprünglichen Geometrie auf default setzen');
      layer.setStyle(feature.getNormalStyle());
*/

    if (feature.options.geometry_type == 'Point') {

      //console.log('Lege neuen CircleMarker an.');
      // circleMarker erzeugen mit Popup Eventlistener
      vectorLayer = L.circleMarker(feature.wkxToLatLngs(feature.newGeom), {
        renderer: kvm.myRenderer,
        featureId: feature.id
      });
    }
    else if (feature.options.geometry_type == 'Line') {
      vectorLayer = L.polyline(feature.wkxToLatLngs(feature.newGeom), {
        featureId: feature.id
      });
    }
    else if (feature.options.geometry_type == 'Polygon') {
      vectorLayer = L.polygon(feature.wkxToLatLngs(feature.newGeom), {
        featureId: feature.id
      });
    }

    //console.log('Bind Popup for vectorLayer');

    // Popup zum Kartenobjekt hinzufügen
    const popupFct = (layer) => {
      console.log('popupFct activelayer: %s, this: %s', kvm.activeLayer.getGlobalId(), this.getGlobalId());
      return this.getPopup(feature, kvm.activeLayer.getGlobalId() == this.getGlobalId() && !(kvm.activeLayer.activeFeature && kvm.activeLayer.activeFeature.editable));
    }
    vectorLayer.bindPopup(popupFct);

    //console.log('Style der neuen Geometrie auf default setzen');
    vectorLayer.setStyle(feature.getNormalStyle());

    //console.log('Setze click event for vectorLayer');
    vectorLayer.on(
      'click',
      function(evt) {
        if (
          evt.target.options.featureId in kvm.activeLayer.features &&
          !(kvm.activeLayer.activeFeature && kvm.activeLayer.activeFeature.editable)
        ) {
          console.log('Select the clicked feature');
          kvm.activeLayer.selectFeature(kvm.activeLayer.features[evt.target.options.featureId], false);
        }
      }
    );

    //console.log('Füge vectorLayer zur layerGroup hinzu.');
    // vectorLayer als Layer zur Layergruppe hinzufügen
    this.layerGroup.addLayer(vectorLayer);

    //console.log('Frage layerId ab und ordne feature zu.');
    // layer_id abfragen und in Feature als layerId speichern
    feature.layerId = this.layerGroup.getLayerId(vectorLayer);

    //console.log('setze layer variable mit vectorLayer id: %s', feature.layerId);
    layer = kvm.map._layers[feature.layerId];
    //console.log('layer variable jetzt: %o', layer);

    //console.log('Setze feature auf nicht mehr editierbar.');
    // editierbare Geometrie aus der Karte löschen und damit Popup der editierbaren Geometrie schließen
    feature.setEditable(false);

    //console.log('Zoome zum Feature');
    this.selectFeature(feature, false);
  };

  this.collectChanges = function(action) {
    kvm.log('Layer.collectChanges ' + (action ? ' with action: ' + action : ''), 4);
    var activeFeature = this.activeFeature,
        changes = [];

    // loop over all elements of the form or over all attributes of the layer respectively
    // compare form element content with old values and if changes exists assign
    changes = $.map(
      this.attributes,
      (function(attr) {
        //console.log('attr name: %s', attr.get('name'));
        //console.log('attr.privilege: %s', attr.get('privilege'));
        if (
          attr.get('name') != this.id_attribute &&
          !attr.isAutoAttribute(action) &&
          attr.get('privilege') != '0'
        ) {
          var key = attr.get('name'),
              oldVal = activeFeature.get(key),
              newVal = attr.formField.getValue(action);

          if (typeof oldVal == 'string') oldVal = oldVal.trim();
          if (typeof newVal == 'string') newVal = newVal.trim();
          if (oldVal == 'null' && newVal == null) {
            newVal = 'null'; // null String und null Object sollen gleich sein beim Vergleich
          }

          if (attr.get('name') == this.geometry_attribute && action == 'insert') {
            oldVal = '';
          }

          kvm.log('Vergleiche ' + attr.get('form_element_type') + ' Attribut: ' + key + '(' + oldVal + ' (' + typeof oldVal + ') vs. ' + newVal + '(' + typeof newVal + '))');

          if (oldVal != newVal) {
            kvm.log('Änderung in Attribut ' + key + ' gefunden.', 3);
            kvm.deb('Änderung in Attribut ' + key + ' gefunden.');
//            activeFeature.set(key, newVal); Wird jetzt in afterUpdateDataset ausgeführt mit feature.updateChanges

            return {
              'key': key,
              'oldVal': oldVal,
              'newVal': newVal,
              'type' : attr.getSqliteType()
            }
          }
        }
      }).bind({ geometry_attribute: this.get('geometry_attribute'), id_attribute: this.get('id_attribute') })
    );

    return changes;
  };

  /**
  * This function runs the startFunc with the bound strategy as context
  */
  this.runStrategy = function(startFunc) {
    //console.log('runStrategy with context: %o', this);
    startFunc();
  };

  /**
  * Function create a dataset in the local database and
  * create the appropriated delta dataset in the deltas table
  * @param array changes Data from the activeFeature for the new dataset
  * @param function The callback function for success
  */
  this.runInsertStrategy = function() {
    //console.log('runInsertStrategy');
    var strategy = {
      context: this,
      succFunc: 'backupDataset',
      next: {
        succFunc: 'createDataset',
        next: {
          succFunc: 'writeDelta',
          next: {
            succFunc: 'readDataset',
            next: {
              succFunc: 'afterCreateDataset',
              succMsg: 'Datensatz erfolgreich angelegt'
            }
          }
        }
      }
    }
//    console.log('runInsertStrategy uebergebe strategy: %s', JSON.stringify(strategy));

    this.runStrategy((this[strategy.succFunc]).bind(strategy));
    return true;
  }; 

  /**
  * Function copy a dataset with endet = current date as a backup of activeFeature
  * if not allready exists
  * @param object strategy Object with context and information about following processes
  */
  this.backupDataset = function() {
    //console.log('backupDataset');
    var layer = this.context,
        table = layer.get('schema_name') + "_" + layer.get('table_name'),
        tableColumns = layer.getTableColumns(),
        id_attribute = layer.get('id_attribute'),
        id = layer.activeFeature.get(id_attribute),
        sql = "\
          INSERT INTO " + table + "(" +
            tableColumns.join(', ') + ",\
            endet\
          )\
          SELECT " + tableColumns.join(', ') + ", '" + kvm.now() + "'\
          FROM " + table + "\
          WHERE\
            " + id_attribute + " = '" + id + "' AND\
            (\
              SELECT " + id_attribute + "\
              FROM " + table + "\
              WHERE\
                " + id_attribute + " = '" + id + "' AND\
                endet IS NOT NULL\
            ) IS NULL\
        ";

    //console.log('Backup vorhandenen Datensatz mit sql: %o', sql);
    this.next.context = layer;
    kvm.db.executeSql(
      sql,
      [],
      (layer[this.next.succFunc]).bind(this.next),
      function(err) {
        kvm.msg('Fehler beim Ausführen von ' + sql + ' in backupDataset! Fehler: ' + err.code + '\nMeldung: ' + err.message, 'Fehler');
      }
    );
  };

  this.createDataset = function(rs) {
    //console.log('insertDataset rs: %o', rs);
    var layer = this.context,
        changes = layer.collectChanges('insert'),
        imgChanges = changes.filter(
          function(change) {
            return ($.inArray(change.key, layer.getDokumentAttributeNames()) > -1);
          }
        ),
        delta = {},
        sql = '';


    if (imgChanges.length == 0) {
      //console.log('no imgChanges');
    }
    else {
      layer.createImgDeltas(imgChanges);
    }

    changes = layer.addAutoChanges(changes, 'insert');
    delta = layer.getInsertDelta(changes);
    sql = delta.delta;

    this.next.context = layer;
    this.next.delta = delta;
    this.next.changes = changes;
    //console.log('createDataset with sql: %s', sql);
    kvm.db.executeSql(
      sql,
      [],
      (layer[this.next.succFunc]).bind(this.next),
      function(err) {
        kvm.msg('Fehler beim Anlegen des Datensatzes! Fehler: ' + err.code + '\nMeldung: ' + err.message, 'Fehler');
      }
    );
  };

  /*
  * Function, die nach dem erfolgreichen Eintragen eines INSERT - Deltas Entrages ausgeführt werden soll
  */
  this.afterCreateDataset = function(rs) {
    //console.log('afterCreateDataset rs: %o', rs.rows.item(0));
    var layer = this.context;

    //console.log('set data for activeFeature: %o', rs.rows.item(0));
    //console.log('with geom: %o', rs.rows.item(0).geom);
    layer.activeFeature.setData(rs.rows.item(0));
    layer.addActiveFeature();
    layer.activeFeature.options.new = false;
    layer.activeFeature.addListElement();
    layer.saveGeometry(layer.activeFeature);
    kvm.showItem($('#formular').is(':visible') ? 'featurelist' : 'map');
    $('#sperr_div').hide();
    $('.popup-aendern-link').show();
    $('#saveFeatureButton').toggleClass('active-button inactive-button');
    kvm.controller.mapper.clearWatch();
    kvm.msg(this.succMsg, 'Hinweis');
  };
//e2ccff60-0d23-4d03-8b52-ca80f2da5b42
  /**
  * Function make an backup of the dataset if not exists allready,
  * update it in the local database and
  * create the appropriated delta dataset in the deltas table
  * @param array changes Data from the activeFeature for the update
  * @param function The callback function for success
  */
  this.runUpdateStrategy = function() {
    //console.log('runUpdateStrategy');
    var strategy = {
      context: this,
      succFunc: 'backupDataset',
      next: {
        succFunc: 'updateDataset',
        next: {
          succFunc: 'writeDelta',
          next: {
            succFunc: 'readDataset',
            next: {
              succFunc: 'afterUpdateDataset',
              succMsg: 'Datensatz erfolgreich aktualisiert'
            }
          }
        }
      }
    }
//    console.log('runUpdateStrategy uebergebe strategy: %s', JSON.stringify(strategy));

    this.runStrategy((this[strategy.succFunc]).bind(strategy));
    return true;
  };

  this.updateDataset = function(rs) {
    //console.log('updateDataset rs: %o', rs);
    var layer = this.context,
        changes = layer.collectChanges('update'),
        delta = {},
        sql = '';

    if (changes.length == 0) {
      $('#sperr_div').hide();
      kvm.msg('Keine Änderungen! Zum Abbrechen verwenden Sie den Button neben Speichen.');
    }
    else {
      kvm.alog('Changes gefunden: ', changes, 4);
      imgChanges = changes.filter(
        function(change) {
          return ($.inArray(change.key, layer.getDokumentAttributeNames()) > -1);
        }
      );

      if (imgChanges.length == 0) {
        //console.log('no imgChanges');
      }
      else {
        layer.createImgDeltas(imgChanges);
      }

      kvm.log('Layer.updateDataset addAutoChanges', 4);
      changes = layer.addAutoChanges(changes, 'update');

      delta = layer.getUpdateDelta(changes);
      sql = delta.delta + " AND endet IS NULL";

      this.next.context = layer;
      this.next.delta = delta;
      this.next.changes = changes;
      kvm.db.executeSql(
        sql,
        [],
        (layer[this.next.succFunc]).bind(this.next),
        function(err) {
          kvm.msg('Fehler beim Aktualisieren des Datensatzes! Fehler: ' + err.code + '\nMeldung: ' + err.message, 'Fehler');
        }
      );
    }
  };

  /**
  * Function add auto values for attributes of formular_element_type User, UserID and Time and attributes
  * with name user_name, updated_at_client and created_at pending on action and option insert or update
  * @param array changes The array of changes made in formular
  * @param string action insert or update used to determine if auto value shall be created pending on option of the attribute
  * @return array The array of changes including the auto values
  */
  this.addAutoChanges = function(changes, action) {
    kvm.log('Layer.addAutoChanges mit action ' + action, 4);
    var changesKeys = $.map(
        changes,
        function(change) {
          return change.key;
        }
      ),
      autoChanges = $.map(
        this.attributes,
        function(attr) {
          if (
            attr.isAutoAttribute(action) &&
            !changesKeys.includes(attr.get('name'))
          ) {
            var autoValue = attr.formField.getAutoValue();
            kvm.log('Ergänze Autowert: ' + attr.get('name') + ' = ' + autoValue);
            return {
              'key': attr.get('name'),
              'oldVal': kvm.activeLayer.activeFeature.get(attr.get('name')),
              'newVal': autoValue,
              'type' : attr.getSqliteType()
            }
          }
        }
      );

    kvm.alog('Add autoChanges: ', autoChanges, 4);
    var result = changes.concat(autoChanges);
    kvm.alog('Return:', result, 4);
    return result;
  };

  /*
  * Function, die nach dem erfolgreichen Eintragen eines UPDATE ausgeführt werden soll
  * @param result set rs Resultset from a readDataset query
  */
  this.afterUpdateDataset = function(rs) {
    //console.log('afterUpdateDataset rs: %o', rs);
    var layer = this.context;

    layer.activeFeature.setData(rs.rows.item(0));
    layer.activeFeature.updateListElement();
    layer.saveGeometry(layer.activeFeature);
    kvm.showItem($('#formular').is(':visible') ? 'featurelist' : 'map');
    $('.popup-aendern-link').show();
    $('#saveFeatureButton').toggleClass('active-button inactive-button');
    kvm.controller.mapper.clearWatch();
    $('#sperr_div').hide();
  };

  /**
  * Function make an backup of the dataset if not exists allready,
  * delete it in the local database and
  * create and remove the appropriated delta datasets in the deltas table
  * @param function The callback function for success
  */
  this.runDeleteStrategy = function() {
    //console.log('runDeleteStrategy');
    var strategy = {
      context: this,
      succFunc: 'backupDataset',
      next: {
        succFunc: 'deleteDataset',
        next: {
          succFunc: 'writeDelta',
          next: {
            succFunc: 'deleteDeltas',
            other: 'insert',
            next : {
              succFunc: 'afterDeleteDataset',
              succMsg: 'Datensatz erfolgreich gelöscht! Er kann wieder hergestellt werden.'
            }
          }
        }
      }
    }
//    console.log('runDeleteStrategy uebergebe strategy: %s', JSON.stringify(strategy));

    this.runStrategy((this[strategy.succFunc]).bind(strategy));
    return true;
  };

  this.deleteDataset = function(rs) {
    //console.log('deleteDataset');
    var layer = this.context,
        delta = layer.getDeleteDelta(),
        sql = delta.delta + " AND endet IS NULL";

    this.next.context = layer;
    this.next.delta = delta;
    //console.log('SQL zum Löschen des Datensatzes: %s', sql);
    //console.log('Nächste Funktion nach Datenbankabfrage: %s', this.next.succFunc);
    kvm.db.executeSql(
      sql,
      [],
      (layer[this.next.succFunc]).bind(this.next),
      function(err) {
        kvm.msg('Fehler beim Löschen des Datensatzes!\nFehlercode: ' + err.code + '\nMeldung: ' + err.message, 'Fehler');
      }
    );
  };

  /**
  * function called after writing a delete Statement into Client sqlite DB
  * Do every thing to delete the feature, geometry, Layer and listelement
  *
  */
  this.afterDeleteDataset = function(rs) {
    //console.log('afterDeleteDataset');
    var layer = this.context,
        featureId = layer.activeFeature.id,
        layerId = layer.activeFeature.layerId;

    //console.log('Datensatz erfolgreich gesichert und aktueller gelöscht.')

    //console.log('Remove Editable Geometrie');
    kvm.controller.mapper.removeEditable(layer.activeFeature);

    //console.log('Löscht Layer mit layerId: %s aus Layergroup', layer.activeFeature.layerId);
    layer.layerGroup.removeLayer(layerId);

    //console.log('Löscht Feature aus FeatureList : %o', layer.activeFeature);
    $('#' + layer.activeFeature.id).remove();

    //console.log('Wechsel die Ansicht zur Featurelist.');
    kvm.showItem((!$('#map').is(':visible')) ? 'featurelist' : 'map');
    //console.log('Scroll die FeatureListe nach ganz oben');

    //console.log('Lösche Feature aus features Array des activeLayer');
    delete layer.features[featureId];

    //console.log('Lösche activeFeature')
    delete layer.activeFeature;

    //console.log('Blende Sperrdiv aus');
    // Sperrdiv entfernen
    $('#sperr_div').hide();
    kvm.msg(this.succMsg, 'Hinweis');
  };
  /**
  * write delta dataset to database expect:
  * for delete delta if insert delta exists or
  * for insert delta if delte delta exists
  */
  this.writeDelta = function(rs) {
    //console.log('writeDelta');
    //console.log('layer: %o', this.context);
    //console.log('delta: %o', this.delta);
    //console.log('changes: %o', this.changes);
    var layer = this.context,
        delta = this.delta,
        changes = this.changes,
        sql = "\
          INSERT INTO " + layer.get('schema_name') + '_' + layer.get('table_name') + "_deltas (\
            type,\
            change,\
            delta,\
            created_at\
          )\
          SELECT\
            '" + delta.type + "' AS type,\
            '" + delta.change + "' AS change,\
            '" + layer.underlineToPointName(delta.delta, layer.get('schema_name'), layer.get('table_name')).replace(/\'/g, '\'\'') + "' AS delta,\
            '" + kvm.now() + "' AS created_at\
          WHERE\
            (\
              SELECT\
                count(*)\
              FROM\
                " + layer.get('schema_name') + '_' + layer.get('table_name') + "_deltas\
              WHERE\
                delta LIKE '%" + layer.activeFeature.get(layer.get('id_attribute')) + "%' AND\
                type = 'sql' AND\
                (\
                  (change = 'insert' AND '" + delta.change + "' = 'delete') OR\
                  (change = 'delete' AND '" + delta.change + "' = 'insert')\
                )\
             ) = 0\
        ";

    this.next.context = layer;
    //console.log('SQL zum Schreiben des Deltas: %s', sql);
    //console.log('Funktion nach erfolgreicher Datenbankabfrag: %s', this.next.succFunc);
    kvm.db.executeSql(
      sql,
      [],
      (layer[this.next.succFunc]).bind(this.next),
      function(err) {
        kvm.msg('Fehler beim Schreiben der Deltas! Fehler: ' + err.code + '\nMeldung: ' + err.message, 'Fehler');
      }
    );
  };

  this.runRestoreStrategy = function() {
    //console.log('runRestoreStrategy');
    var strategy = {
      context: this,
      succFunc: 'deleteDataset',
      next: {
        succFunc: 'restoreDataset',
        next: {
          succFunc: 'writeDelta',
          next: {
            succFunc: 'deleteDeltas',
            next : {
              succFunc: 'afterDeleteDataset',
              succMsg: 'Datensatz erfolgreich wiederhergestellt! Wechseln Sie den Filter um ihn zu sehen.'
            }
          }
        }
      }
    }

    this.runStrategy((this[strategy.succFunc]).bind(strategy));
    return true;
  };

  this.restoreDataset = function(rs) {
    //console.log('restoreDataset');
    //console.log('context %o', this.context);
    //console.log('attr gefiltert: %o', );
    var layer = this.context,
        table = layer.get('schema_name') + '_' + layer.get('table_name'),
        id_attribute = layer.get('id_attribute'),
        id = layer.activeFeature.get(id_attribute),
        sql = "\
          UPDATE " + table + "\
          SET endet = NULL\
          WHERE\
            " + id_attribute + " = '" + id + "' AND\
            endet IS NOT NULL\
        ",
        changes = $.map(
          layer.attributes.filter(function(attr) {
            return attr.get('saveable') == '1';
          }),
          function(attr) {
            var key = attr.get('name');
            return {
              'key' : key,
              'oldVal' : null,
              'newVal' : layer.activeFeature.get(key),
              'type' : attr.getSqliteType()
            }
          }
        ),
        delta = layer.getInsertDelta(changes);

    this.next.context = layer;
    this.next.delta = delta;
    //console.log('SQL zum Wiederherstellen des Datensatzes: %s', sql);
    //console.log('Nächste Funktion nach Datenbankabfrage: %s', this.next.succFunc);
    kvm.db.executeSql(
      sql,
      [],
      (layer[this.next.succFunc]).bind(this.next),
      function(err) {
        kvm.msg('Fehler beim Wiederherstellen des Datensatzes! Fehler: ' + err.code + '\nMeldung: ' + err.message, 'Fehler');
      }
    );
  };

  /**
  * read feature data from database and call function this.next.succFunc
  * @param resultset rs Result set from former function is here not used
  */
  this.readDataset = function(rs = null) {
    //console.log('readDataset');
    //console.log('layer: %o', this.context);
    var layer = this.context,
        id_attribute = layer.get('id_attribute'),
        id = layer.activeFeature.get(id_attribute),
        sql = "\
          SELECT\
            " + layer.getSelectExpressions().join(', ') + "\
          FROM\
            " + layer.get('schema_name') + '_' + layer.get('table_name') + "\
          WHERE\
            " + id_attribute + " = '" + id + "'\
        ";

    this.next.context = layer;
    //console.log('SQL zum lesen des Datensatzes: %s', sql);
    //console.log('Funktion nach erfolgreicher Datenbankabfrage: %s', this.next.succFunc);
    kvm.db.executeSql(
      sql,
      [],
      (layer[this.next.succFunc]).bind(this.next),
      function(err) {
        kvm.msg('Fehler beim Lesen des Datensatzes aus der Datenbank! Fehler: ' + err.code + '\nMeldung: ' + err.message, 'Fehler');
      }
    );
  };

  /**
  * function return insert delta based on changes of a dataset
  * @param array changes
  * @return object The insert delta object.
  */
  this.getInsertDelta = function(changes) {
    kvm.log('Erzeuge INSERT Delta', 3);
    var delta = {
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
                  if (change.newVal == null) {
                    return 'null';
                  }
                  if (['TEXT', 'DATE'].includes(change.type)) {
                    return "'" + change.newVal + "'";
                  }
                  else {
                    return change.newVal;
                  }
                }
              ).join(', ') + ', \
              \'' + this.activeFeature.get(this.get('id_attribute')) + '\'\
            )\
          '
        };

    kvm.log('INSERT Delta: ' + JSON.stringify(delta), 3);   
    return delta;
  };

  /**
  * Create update delta
  */
  this.getUpdateDelta = function(changes) {
    kvm.log('Erzeuge SQL für UPDATE Delta', 3);
    var delta = {
      "type" : 'sql',
      "change" : 'update',
      "delta" : '\
        UPDATE ' + this.get('schema_name') + '_' + this.get('table_name') + '\
        SET ' +
          $.map(
            changes,
            function(change) {
              if (change.newVal == null) {
                return change.key + " = null";
              }
              if (['TEXT', 'DATE'].includes(change.type)) {
                return change.key + " = '" + change.newVal + "'";
              }
              else {
                return change.key + " = " + change.newVal;
              }
            }
          ).join(', ') + '\
        WHERE\
          ' + this.get('id_attribute') + ' = \'' + this.activeFeature.get(this.get('id_attribute')) + '\'\
      '
    };
    kvm.log('UPDATE Delta sql: ' + JSON.stringify(delta), 3);
    return delta;
  }

  /**
  * Create delete delta
  */
  this.getDeleteDelta = function(changes) {
    kvm.log('Erzeuge SQL für DELETE Delta', 3)
    var delta = {
      "type" : 'sql',
      "change" : 'delete',
      "delta" : '\
        DELETE FROM ' + this.get('schema_name') + '_' + this.get('table_name') + '\
        WHERE\
          ' + this.get('id_attribute') + ' = \'' + this.activeFeature.get(this.get('id_attribute')) + '\'\
      '
    };
    kvm.log('DELETE Delta sql: ' + JSON.stringify(delta), 3);
    return delta;
  }

  /**
  * Delete all sql update deltas from activeFeature and other (insert or delete) deltas
  * @param string this.other Delete also this other deltas
  */
  this.deleteDeltas = function(rs) {
    //console.log('deleteDeltas');
    var layer = this.context,
        sql = '';

    this.next.context = layer;
    sql = "\
      DELETE FROM " + layer.get('schema_name') + "_" + layer.get('table_name') + "_deltas\
      WHERE\
        type = 'sql' AND\
        (change = 'update' OR change = '" + this.other + "') AND\
        delta LIKE '%" + layer.activeFeature.get(layer.get('id_attribute')) + "%'\
    ";
    kvm.db.executeSql(
      sql,
      [],
      (layer[this.next.succFunc]).bind(this.next),
      function(err) {
        kvm.msg('Fehler beim Löschen der Deltas!\nFehlercode: ' + err.code + '\nMeldung: ' + err.message, 'Fehler');
      }
    );
  };

  this.createImgDeltas = function(changes) {
    kvm.log('Layer.createImgDeltas with changes: ' + JSON.stringify(changes), 4);
    $.each(
      changes,
      (function(index, change) {
        img_old = (change.oldVal && change.oldVal != 'null' ? change.oldVal.slice(1, -1).split(',') : []);
        img_new = (change.newVal ? change.newVal.slice(1, -1).split(',') : []);
        console.log('img_old %o', img_old);
        console.log('img_new: %o', img_new);

        $.map(
          img_new,
          (function(img) {
            //console.log(img + ' in ' + img_old.join(', ') + '?');
            if (img_old.indexOf(img) < 0) {
              //console.log('neues Image');
              var context = {
                context : this,
                delta: {
                  "type" : 'img',
                  "change" : 'insert',
                  "delta" : img
                },
                next: {
                  succFunc: 'showMessage',
                  msg: img + ' als neues Bild eingetragen.',
                  title: 'Datenbank'
                }
              };
              //console.log('context: %o', context);
              (this.writeDelta).bind(context)();
            }
          }).bind(this)
        );

        $.map(
          img_old,
          (function(img) {
            //console.log(img + ' in ' + img_new.join(', ') + '?');
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
                  kvm.log('Layer.createImgDeltas Abfrage ob insert für Bild existiert erfolgreich, rs: ' + JSON.stringify(rs), 4);
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
                    // Add delete of image to deltas table
                    (this.writeDelta).bind({
                      context : this,
                      delta: {
                        "type" : 'img',
                        "change" : 'delete',
                        "delta" : img
                      },
                      next: {
                        succFunc: 'showMessage',
                        msg: 'Löschung von Bild ' + img + ' eingetragen.',
                        title: 'Datenbank'
                      }
                    })();
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

  this.showMessage = function() {
    kvm.msg(this.msg, this.title);
  };

  /*
  * exec sql in layer table and read Data again
  *
  * ToDo: Hier nicht alle Daten neu laden, sondern nur den gänderten Datensatz in Liste, Form und Karte aktualisieren
  * bzw. auf den Stand bringen als wäre er neu geladen. Wird weiter oben schon in callback von click on saveFeatureButton gemacht.
  *
  */
  this.execSql = function(sql, successFunc) {
    kvm.log('Layer.execSql: ' + sql, 5);
    kvm.db.executeSql(
      sql,
      [],
      (successFunc).bind(this),
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

  this.execServerDeltaSuccessFunc = function(rs) {
    this.context.numExecutedDeltas++;
    kvm.log('execServerDeltaSuccessFunc numExecutedDeltas: ' + this.context.numExecutedDeltas + ' context.numReturnedDeltas: ' + this.context.numReturnedDeltas + ' numReturnedDeltas: ' + this.numReturnedDeltas);
    if (this.context.numExecutedDeltas == this.context.numReturnedDeltas) {
      var newVersion = parseInt(this.response.syncData[this.response.syncData.length - 1].push_to_version);
      this.context.set('syncVersion', newVersion);
      this.context.saveToStore();
      kvm.msg('Synchronisierung erfolgreich abgeschlossen!  Die aktuelle Version ist: ' + newVersion);
      this.context.clearDeltas('sql');
      this.context.readData($('#limit').val(), $('#offset').val());
    }
    else {
      //console.log(this.context.numExecutedDeltas + '. Delta ausgeführt! Weiter ...');
    }
  };

  // ToDo getInsertDelta schreiben und ggf. auch in createDelta verwenden.
  // Prüfen ob values auch so wie in collectChanges erzeugt werden können oder dort wieder verwendet werden kann.
  // was wenn ein changes Array erzeugt wird und damit writeDelta aufgerufen wird bei einem restore Dataset. Muss da nicht
  // immer ein neuer Datensatz her? Also statt endet auf null setzen immer einen neuen erzeugen und dafür den mit endet = Datum immer löschen.
  // prüfen wie sich die ganze Geschichte auf img auswirkt.
  // prüfen wie das mit dem user_name ist, der darf nach einem Rückgängig machen nicht mit drin sein, wenn vorher keiner drin stand.

  /**
  * function create the listElement with functions buttons for layer settings page,
  * add layer in layer control of the map
  * add layer to the map
  * save layer object in kvm.layers array and
  * save layerSettings to store
  * Do not read data for listing and mapping
  */
  this.appendToApp = function() {
    kvm.log('Füge Layer ' + this.get('title') + ' zur Layerliste hinzu.', 3);
    $('#layer_list').append(this.getListItem());
    this.bindLayerEvents(this.getGlobalId());
//    kvm.map.addLayer(this.layerGroup);
    kvm.controls.layers.addOverlay(this.layerGroup, kvm.coalempty(this.get('alias'), this.get('title'), this.get('table_name'), 'overlay' + this.getGlobalId()));
    kvm.layers[this.getGlobalId()] = this;
    this.saveToStore();
  };

  /*
  * Erzeugt die Events für die Auswahl, Synchronisierung und das Zurücksetzen von Layern
  */
  this.bindLayerEvents = function(layerGlobalId = 0) {
    console.log('bindLayerEvents for layerGlobalId: %s', layerGlobalId);
    // Schaltet alle layer function button events zunächst aus.
    $('.layer-function-button').off()
    //
    // Schaltet einen anderen Layer und deren Sync-Funktionen aktiv
    // Die Einstellungen des Layers werden aus dem Store geladen
    // Die Featureliste und Kartenelemente werden falls vorhanden aus der Datenbank geladen.
    //
    $('input[name=activeLayerId]' + (layerGlobalId > 0 ? "[value='" + layerGlobalId + "']" : '')).on(
      'change',
      function(evt) {
        var globalId = evt.target.value,
            layer = kvm.layers[globalId];

//        layer.readData();
        // unselect active Feature
        if (kvm.activeLayer.activeFeature) {
          kvm.map.closePopup();
          kvm.activeLayer.activeFeature.unselect();
        }
        layer.setActive(); // include loading filter, sort, data view, form and readData
        $('input:checkbox.leaflet-control-layers-selector').map(function (i, e) {
          var layerLegendName = $(e).next().html();
          if (layerLegendName.includes(kvm.activeLayer.get('alias'))) {
            if (!$(e).checked) {
              $(e).click(); // switch activeLayer on if it is off 
            }
          }
          else {
            if ($(e).checked) {
              $(e).click(); // switch other layer off if they are on
            }
          }
        });

//        kvm.showItem('featurelist');
      }
    );

    $('#layer-functions-button_' + layerGlobalId).on(
      'click',
      function(evt) {
        var target = $(evt.target);
        console.log('click on layer-functions-button von div %o', target.parent().attr('id'));
        target.parent().children().filter('.layer-functions-div').toggle();
        target.toggleClass('fa-ellipsis-v fa-window-close-o');
      }
    );

    $('.sync-layer-button' + (layerGlobalId > 0 ? "[id='syncLayerButton_" + layerGlobalId + "']" : '')).on(
      'click',
      function(evt) {
        var layer = kvm.activeLayer,
            target = $(evt.target);

        $('#sperr_div_content').html('');

        if (target.hasClass('inactive-button')) {
          kvm.msg('Keine Internetverbindung! Kann Layer jetzt nicht synchronisieren.');
        }
        else {
          $('#syncLayerIcon_' + layer.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
          $('#sperr_div').show();

          if (layer.runningSyncVersion == 0) {
            navigator.notification.confirm(
              'Daten vom Server holen. Danach können eigene Änderungen synchronisiert werden.',
              function(buttonIndex) {
                if (buttonIndex == 1) { // ja
                  layer.requestData();
                }
                else {
                  $('#syncLayerIcon_' + layer.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
                  $('#sperr_div').hide();
                }
              },
              'Layer mit Server synchronisieren',
              ['ja', 'nein']
            );
          }
          else {
            navigator.notification.confirm(
              'Jetzt lokale Änderungen, fallse vorhanden, zum Server schicken und Änderungen vom Server holen und lokal einspielen?',
              function(buttonIndex) {
                if (buttonIndex == 1) { // ja
                  layer.syncData();
                }
                else {
                  $('#syncLayerIcon_' + layer.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
                  $('#sperr_div').hide();
                }
              },
              'Layer mit Server synchronisieren',
              ['ja', 'nein']
            );
          }
        }
      }
    );

    $('.sync-images-button' + (layerGlobalId > 0 ? "[id='syncImagesButton_" + layerGlobalId + "']" : '')).on(
      'click',
      function(evt) {
        var layer = kvm.activeLayer,
            target = $(evt.target);

        if (target.hasClass('inactive-button')) {
          kvm.msg('Keine Internetverbindung! Kann Bilder jetzt nicht synchronisieren.');
        }
        else {
          navigator.notification.confirm(
            'Bilder mit Server Synchronisieren?',
            function(buttonIndex) {
              if (buttonIndex == 1) { // ja
                $('#syncImageIcon_' + layer.getGlobalId()).toggleClass('fa-upload fa-spinner fa-spin');
                $('#sperr_div').show();
                layer.syncImages();
              }
              if (buttonIndex == 2) { // nein
                // Do nothing
              }

            },
            '',
            ['ja', 'nein']
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
              if (buttonIndex == 1) { // ja
                $('#clearLayerIcon_' + layer.getGlobalId()).toggleClass('fa-ban fa-spinner fa-spin');
                layer.clearData();
              }
              if (buttonIndex == 2) { // nein
                // Do nothing
              }
            },
            '',
            ['ja', 'nein']
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
              if (buttonIndex == 1) { // ja
                var layer = kvm.activeLayer;
                $('#reloadLayerIcon_' + layer.getGlobalId()).toggleClass('fa-window-restore fa-spinner fa-spin');
                console.log('reload layer id: %s', layer.get('id'));
                kvm.activeStelle.reloadLayer(layer.get('id'));
              }
              if (buttonIndex == 2) { // nein
                // Do nothing
              }
            },
            '',
            ['ja', 'nein']
          );
        }
      }
    )
/*
    $('#short_password_field').on(
      'keyup',
      function(e) {
        if (e.target.value.length == 4) {
          console.log('login with short password');
        }
      }
    );

    $('#password_field').on(
      'keyup',
      function(e) {
        if (e.target.value.length > 0) {
          $('#password_ok_button').show();
        }
        else {
          $('#password_ok_button').hide();
        }
      }
    );

    $('#password_view_checkbox').on(
      'change',
      function(e) {
        console.log('checkbox changed');
        if (e.target.checked) {
          $('#password_field').attr('type', 'text');
        }
        else {
          $('#password_field').attr('type', 'password');
        }
      }
    );

    $('#password_ok_button').on(
      'click',
      function(e) {
        console.log('login with password');
      }
    );
*/
  }

  /**
   * Function remove layer from store, layer options list, clear data, remove from layer control, map and kvm.layers array
   * Do not remove featurelist, because this will be updated wenn the new layer has been loaded
   * and wenn all layer has been removed a text will appear instead of the featurelist.
   * The layer that replace an active layer will also be set active
  */
  this.removeFromApp = function() {
    console.log('remove layer %s (%s)', this.get('title'), this.get('id'));
    //console.log('Entferne layer div aus layer options list.');
    $('#layer_' + this.getGlobalId()).remove();
    //console.log('Lösche die Daten vom aktiven Layer');
    this.clearData();
    //console.log('Entferne layer aus layer control');
    kvm.controls.layers.removeLayer(this.layerGroup);
    //console.log('Entferne layer von map');
    kvm.map.removeLayer(this.layerGroup);
    //console.log('Lösche activeLayer von kvm layers array');
    const i = kvm.layers.indexOf(this.get('id'));
    if (i > -1) {
      kvm.layers.splice(i, 1)
    };
  }

  this.addActiveFeature = function() {
    this.features[this.activeFeature.id] = this.activeFeature;
  };

  this.getGlobalId = function() {
    return this.stelle.get('id') + '_' + this.get('id');
  };

  this.getListItem = function() {
    var html = '\
      <div id="layer_' + this.getGlobalId()  + '">\
        <input type="radio" name="activeLayerId" value="' + this.getGlobalId() + '"/> ' +
        (this.get('alias') ? this.get('alias') : this.get('title')) + '\
        <i id="layer-functions-button_' + this.getGlobalId() + '" class="layer-functions-button fa fa-ellipsis-v" aria-hidden="true"></i>\
        <div class="layer-functions-div">\
          <button id="syncLayerButton_' + this.getGlobalId() + '" value="' + this.getGlobalId() + '" class="settings-button sync-layer-button layer-function-button">\
            <i id="syncLayerIcon_' + this.getGlobalId() + '" class="fa fa-refresh" aria-hidden="true"></i>\
          </button> Daten synchronisieren\
        </div>\
        <div class="layer-functions-div">\
          <button id="syncImagesButton_' + this.getGlobalId() + '" value="' + this.getGlobalId() + '" class="settings-button sync-images-button layer-function-button">\
            <i id="syncImagesIcon_' + this.getGlobalId() + '" class="fa fa-upload" aria-hidden="true"></i>\
          </button> Bilder synchronisieren\
        </div>\
        <div class="layer-functions-div">\
          <button id="clearLayerButton_' + this.getGlobalId() + '" value="' + this.getGlobalId() + '" class="settings-button clear-layer-button layer-function-button">\
            <i id="clearLayerIcon_' + this.getGlobalId() + '" class="fa fa-ban" aria-hidden="true"></i>\
          </button> Lokale Daten löschen\
        </div>\
        <div class="layer-functions-div">\
          <button id="reloadLayerButton_' + this.getGlobalId() + '" value="' + this.getGlobalId() + '" class="settings-button reload-layer-button layer-function-button">\
            <i id="reloadLayerIcon_' + this.getGlobalId() + '" class="fa fa-window-restore" aria-hidden="true"></i>\
          </button> Layer neu laden\
        </div>\
      </div>\
      <div style="clear: both"></div>';
    return html;
  };

  this.getSyncUrl = function() {
    kvm.log('Layer.getSyncUrl', 4);
    var url = this.stelle.get('url'),
        file = this.stelle.getUrlFile(url);

    url += file +
      'Stelle_ID=' + this.stelle.get('Stelle_ID') + '&' +
      'login_name=' + this.stelle.get('login_name') + '&' +
      'selected_layer_id=' + this.get('id') + '&' +
      'passwort=' + encodeURIComponent(this.stelle.get('passwort'));

    if (this.runningSyncVersion == 0) {
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
        'passwort=' + encodeURIComponent(stelle.get('passwort')) + '&' +
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
    //console.log('layerIds vor dem Speichern: %o', kvm.store.getItem('layerIds_' + this.stelle.get('id')));
    var layerIds = $.parseJSON(kvm.store.getItem('layerIds_' + this.stelle.get('id'))),
        settings = JSON.stringify(this.settings);

    if (layerIds == null) {
      layerIds = [];
    }
    settings.loaded = false;
    kvm.store.setItem('layerSettings_' + this.getGlobalId(), settings);
    console.log('layerSettings_%s eingetragen. store: %o',this.getGlobalId(), kvm.store);

    if ($.inArray(this.get('id'), layerIds) < 0) {
      layerIds.push(this.get('id'));
      console.log('layer id in layerIds Liste aufgenommen.');
      kvm.store.setItem(
        'layerIds_' + this.stelle.get('id'),
        JSON.stringify(layerIds)
      );
      console.log('neue layerId %s eingetragen.', this.get('id'));
    }
    console.log('layerIds nach dem Speichern: %o', kvm.store.getItem('layerIds_' + this.stelle.get('id')));
  };

  /**
    Select layer in layerlist
    - Create layerFilter
    - Set sortAttribute
    - Set featureForm and dataView
    - readData:
      - Load Features from Database, recreate FeatureList and draw in map
      - Select Layer in Layer control
    ToDo: Remove the click events on map features of other layers that are not active
          or make it possible to select and edit all visible features in the map by switching dataview and formfield
          penging on layer where the feature belongs to
  */
  this.setActive = function() {
    kvm.log('Setze Layer ' + this.get('title') + ' (' + (this.get('alias') ? this.get('alias') : 'kein Aliasname') + ') auf aktiv.', 3);
    kvm.activeLayer = this;
    kvm.store.setItem('activeLayerId', this.get('id'));
    $('#featurelistHeading').html(this.get('alias') ? this.get('alias') : this.get('title'));

    // Create layerFilter
    this.createLayerFilterForm();
    var layerFilter = kvm.store.getItem('layerFilter');
    if (layerFilter) {
      this.loadLayerFilterValues(JSON.parse(layerFilter));
    }

    // Set sortAttribute
    $('#anzeigeSortSelect option[value!=""]').remove();
    $.each(
      this.attributes,
      function(key, value) {
        $('#anzeigeSortSelect').append($('<option value="' + value.settings.name + '">' + value.settings.alias + '</option>'));
      }
    );
    var sortAttribute = kvm.store.getItem('sortAttribute');
    if (sortAttribute) {
      $('#anzeigeSortSelect').val(sortAttribute);
    }

    // Set featureForm and dataView
    $('#formular').html('');
    this.createFeatureForm();
    this.createDataView();
    $('input[name=activeLayerId]').checked = false
    $('input[value=' + this.getGlobalId() + ']')[0].checked = true;
    $('.layer-functions-button, .layer-functions-div').hide();
    $('#layer_' + kvm.activeLayer.getGlobalId() + ' > .layer-functions-button').show();
    $('#layer_' + kvm.activeLayer.getGlobalId() + ' > .layer-functions-button').removeClass('fa-ellipsis-v fa-window-close-o');
    $('#layer_' + kvm.activeLayer.getGlobalId() + ' > .layer-functions-button').addClass('fa-ellipsis-v');
    if (parseInt(this.get('privileg')) > 0) {
      $('#newFeatureButton').show();
    }

    // Load Features from Database, recreate FeatureList and draw in map
    this.readData();

    // Unselect all overlayLayers in Layer control and select this overlaylayer
    // Style layer in control to show that the layer is editable
    
    // ToDo: Do not remove and add layerGroup here but in appendToApp
    // Deactivate the events on features of other layers

    // activate the events of this activ layer

    //kvm.controls.layers.removeLayer(this.layerGroup);
    //console.log('Add layerGroup %s in setActive als overlay zum Layer Control hinzu.', this.get('title'));
    //kvm.controls.layers.addOverlay(this.layerGroup, kvm.coalesce(this.get('alias'), this.get('title'), this.get('table_name')));
  };

  this.createLayerFilterForm = function() {
    var operators = [
          '=', '>', '<', '>=' , '<=', 'IN', 'LIKE'
        ],
        options = operators.map(
          function(operator) {
            return '<option value="' + operator + '"' + (operator == '=' ? ' selected' : '') + '>' + operator + '</option>'
          }
        );

    $('#attributeFilterFieldDiv').html('');
    $.each(
      this.attributes,
      function(key, value) {
        if (value.settings.type != 'geometry') {
          if (value.settings.name == 'status') {
            if (value.settings.options == '') {
              kvm.msg('Layer Konfigurationsfehler: Der Layer ' + kvm.activeLayer.settings.title + ' kann nicht verwendet werden. Das Attribut Status hat keine Optionen. Wenden Sie sich an den Administrator der WebGIS Anwendung zum Einstellen der Optionen.', 'Fehler');
              return false;
            }
            if (!Array.isArray(value.settings.options)) {
              kvm.msg('Layer Konfigurationsfehler: Der Layer ' + kvm.activeLayer.settings.title + ' kann nicht verwendet werden. Das Optionenfeld ist zwar belegt mit ' + value.settings.options + ', aber es handelt sich nicht um ein Array von Auswahlmöglichkeiten. Wenden Sie sich an den Administrator der WebGIS Anwendung zum Einstellen der Optionen.', 'Fehler');
              return false;
            }
            $('#statusFilterSelect option').remove();
            $('#statusFilterSelect').append($('<option value="" selected>-- Bitte wählen --</option>'));
            value.settings.options.map(
              function(option) {
                $('#statusFilterSelect').append($('<option value="' + option.value + '">' + option.output + '</option>'));
              }
            );
          }
          switch (value.settings.form_element_type) {
            case 'Auswahlfeld' : {
              input_field = $('<select id="filter_value_' + value.settings.name + '" class="filter-view-value-field" name="filter_value_' + value.settings.name + '">');
              input_field.append($('<option value="" selected>-- Bitte wählen --</option>'));
              value.settings.options.map(
                function(option) {
                  input_field.append($('<option value="' + option.value + '">' + option.output + '</option>'));
                }
              )
            } break;
            case 'Time' : {
              input_field = '<input id="filter_value_' + value.settings.name + '" class="filter-view-value-field" name="filter_value_' + value.settings.name + '" type="datetime-local" value=""/>';
            } break;
            default : {
              input_field = '<input id="filter_value_' + value.settings.name + '" class="filter-view-value-field" name="filter_value_' + value.settings.name + '" type="text" value=""/>';
            }
          }
          $('#attributeFilterFieldDiv').append(
            $('<div class="filter-view-field" database_type="' + value.settings.type + '" name="' + value.settings.name + '">')
              .append('<div class="filter-view-label">' + value.settings.alias + '</div>')
              .append('<div class="filter-view-operator"><select id="filter_operator_' + value.settings.name + '">' + options + '</select></div>')
              .append($('<div class="filter-view-value">').append(input_field))
          )
        }
      }
    );
  };

  this.loadLayerFilterValues = function(layerFilter) {
    Object.keys(layerFilter).forEach(function(attr_name) {
      $('#filter_operator_' + attr_name).val(layerFilter[attr_name].operator);
      $('#filter_value_' + attr_name).val(layerFilter[attr_name].value);
    })
  };

  this.notNullValid = function() {
    var errMsg = '';

    $.each(
      kvm.activeLayer.attributes,
      function(i, v) {
        if (
          !v.isAutoAttribute('') &&
          v.get('nullable') == 0 &&
          v.formField.getValue() == null
        ) {
          errMsg += 'Das Feld ' + v.get('alias') + ' benötigt eine Eingabe! ';
        }
      }
    )

    return errMsg;
  };

  return this;
};
function Layer(stelle, settings = {}) {
  kvm.log('Erzeuge Layerobjekt', 3);
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
  * Load data from local db, create feature objects and show in list view
  * Read data from offset to offset + limit
  */
  this.readData = function(limit = 50000, offset = 0, order = '') {
    kvm.log('Layer.readData from table: ' + this.get('schema_name') + '_' + this.get('table_name'), 3);
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
        kvm.log('Anzahl Rows: ' + numRows);

        if (numRows == 0) {
          if (filter.length > 0) {
            kvm.msg('Filter liefert keine Ergebnisse.', 'Datenfilter');
          }
          else {
            kvm.msg('Tabelle ist leer. Unter Einstellungen des Layers können Daten synchronisiert werden.', 'Datenbank')
          }
        }

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
        kvm.log('Features erzeugt.');
        if ($('#syncLayerIcon_' + this.getGlobalId()).hasClass('fa-spinner')) {
          $('#syncLayerIcon_' + this.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
        }
        kvm.setConnectionStatus();

        kvm.createFeatureList();
        if (numRows > 0) {
          if (this.layerGroup) {
            this.layerGroup.clearLayers();
          }
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
        this.readData($('#limit').val(), $('#offset').val());
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
            var sql = this.getCreateTableSql();
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
    kvm.alog('return tableColumns: %o', tableColumns);
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

              //console.log('Download Ergebnis (Head 1000): %s', this.result.substring(1, 1000));
              try {
                collection = $.parseJSON(this.result);
                if (collection.features.length > 0) {
                  kvm.log('Anzahl empfangene Datensätze: ' + collection.features.length, 3);
                  var layer = kvm.activeLayer;
                  kvm.log('Version in Response: ' + collection.lastDeltaVersion, 3);
                  layer.runningSyncVersion = collection.lastDeltaVersion;
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

        console.log(fileName);
        console.log(dirEntry);

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
        kvm.log('Syncronisierung erfolgreich auf dem Server durchgeführt.', 3);
        kvm.log('Antwort vom Server: ' + JSON.stringify(response), 3);
        this.numExecutedDeltas = 0;
        this.numReturnedDeltas = response.deltas.length;
        if (this.numReturnedDeltas > 0) {
          $.each(
            response.deltas,
            (function(index, value) {
              if (kvm.coalesce(value.sql) != null) {
                kvm.alog('Führe Änderungen vom Server auf dem Client aus: ', value.sql, 4);
                this.execSql(
                  this.pointToUnderlineName(value.sql, this.get('schema_name'), this.get('table_name')),
                  (this.execServerDeltaSuccessFunc).bind({ context: this, response: response})
                );
              }
            }).bind(this)
          );
        }
        else {
          this.set('syncVersion', parseInt(response.syncData[response.syncData.length - 1].push_to_version));
          this.runningSyncVersion = this.get('syncVersion');
          this.saveToStore();
          kvm.msg('Synchronisierung erfolgreich abgeschlossen!');
          kvm.msg('Keine neuen Daten vom Server! Aktuelle Version: ' + this.get('syncVersion'));
          this.clearDeltas('sql');
          this.readData($('#limit').val(), $('#offset').val());
        }
      }
      else {
        kvm.msg(response.err_msg);
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
            this.layer.clearDeltas('img', this.img);
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
        kvm.store.removeItem('layerSettings_' + this.getGlobalId());
        navigator.notification.confirm(
          'Alle Daten des Layers in lokaler Datenbank gelöscht.',
          function(buttonIndex) {},
          'Datenbank',
          ['Verstanden']
        );
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
        navigator.notification.confirm(
          'Alle Änderungseinträge zu Bildern des Layers in lokaler Datenbank gelöscht.',
          function(buttonIndex) {
          },
          'Datenbank',
          ['Verstanden']
        );
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
      this.attributes,
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
            val = this.get(key);

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
          console.log('Set %s %s: %s', attr.get('form_element_type'), key, val);
          attr.formField.setValue(val);
        }
      }).bind(this.features[tplId])
    );
  };

  /*
  * Zeichnet die Features in die Karte
  */
  this.drawFeatures = function() {
    kvm.log('Erzeuge Geometrieobjekte in der Karte: ', 3);
    kvm.log('Erzeuge ' + Object.keys(this.features).length + ' CircleMarker', 3);
    console.log('drawFeatures mit showPopupButton: %s', this.showPopupButtons);
    $.each(
      this.features,
      (function (key, feature) {
        if (feature.newGeom) {
          //console.log('Zeichne Feature: %o', feature);
          // circleMarker erzeugen mit Popup Eventlistener
          var circleMarker = L.circleMarker(feature.wkxToLatLngs(feature.newGeom), {
            renderer: kvm.myRenderer,
            featureId: feature.id
          }).bindPopup(this.getPopup(feature));
          circleMarker.setStyle(feature.getNormalCircleMarkerStyle());
          circleMarker.on('click', function(evt) {
            console.log('open popup defined in drawFeatures');
            console.log('activeFeature %s', kvm.activeLayer.activeFeature);
            console.log('activeFeature.editable %s', kvm.activeLayer.activeFeature.editable);
            if (kvm.activeLayer.activeFeature && kvm.activeLayer.activeFeature.editable) {
              console.log('hide all popup-functions with hide function defined in drawFeatures');
              $('.popup-functions').hide();
            }
            else {
              kvm.activeLayer.selectFeature(kvm.activeLayer.features[evt.target.options.featureId], false);
            }
          });

          // circleMarker als Layer zur Layergruppe hinzufügen
          this.layerGroup.addLayer(circleMarker);
          // layer_id abfragen und in Feature als markerId speichern
          feature.markerId = this.layerGroup.getLayerId(circleMarker);
        }
      }).bind(this)
    );
    kvm.log('Marker gezeichnet', 4);
    this.layerGroup.addTo(kvm.map);
    kvm.log('layerGroup zur Karte hinzugefügt.', 4)
  };

  this.getPopup = function(feature) {
    var html;

    html = feature.get(this.get('name_attribute'));
    console.log('getPopup');
    console.log('showPopupButtons: %s', feature.showPopupButtons());
    if (feature.showPopupButtons()) {
      console.log('showPopupButtons');
      html = html + '<br>\
        <div class="popup-functions">\
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
    };
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
        new: true
      }
    );
    console.log('Neues Feature mit id: %s erzeugt.', this.activeFeature.id);
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
            console.log('Starte Editierung an GPS-Coordinate');
            kvm.activeLayer.startEditing([geoLocation.coords.latitude, geoLocation.coords.longitude]);
            $('#gpsCurrentPosition').html(geoLocation.coords.latitude.toString() + ' ' + geoLocation.coords.longitude.toString());
          },
          function(error) {
            console.log('Starte Editierung in Bildschirmmitte');
            var center = kvm.map.getCenter();
            kvm.activeLayer.startEditing([center.lat, center.lng]);
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
        console.log('Starte Editierung in Bildschirmmitte');
        this.startEditing([center.lat, center.lng]);
      }
    }
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
    var feature = this.activeFeature;

    if (alatlng.length > 0) {
      kvm.alog('Setzte Geometry für Feature %o', alatlng, 4);
      feature.setGeom(feature.aLatLngsToWkx([alatlng]));
      feature.geom = feature.newGeom;
      feature.set(
        feature.options.geometry_attribute,
        kvm.wkx.Geometry.parse('SRID=4326;POINT(' + alatlng.join(' ') + ')').toEwkb().inspect().replace(/<|Buffer| |>/g, '')
      )
    }
    this.loadFeatureToForm(feature, { editable: true });
    kvm.map.closePopup();
    if (feature.markerId) {
      circleMarker = this.layerGroup.getLayer(feature.markerId);
      console.log('Edit CircleMarker: %o in Layer Id: %s von Feature Id: %s.', circleMarker, feature.markerId, feature.id);
      circleMarker.unbindPopup();
      circleMarker.setStyle(feature.getEditModeCircleMarkerStyle());
    }
    feature.setEditable(true);
    kvm.map.flyTo(feature.editableLayer.getLatLng(), 18);

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
      var layer = kvm.map._layers[feature.markerId];

      // Zoom zur ursprünglichen Geometrie
      kvm.map.panTo(kvm.map._layers[feature.markerId].getLatLng());

      //Setzt den Style des circle Markers auf den alten zurück
      kvm.map._layers[feature.markerId].setStyle(feature.getNormalCircleMarkerStyle());

      // Binded das Popup an den dazugehörigen Layer
      kvm.map._layers[feature.markerId].bindPopup(this.getPopup(feature));
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
    $('.popup-functions').show();
    // sorge dafür dass die buttons wieder in den Popups angezeigt werden
    this.showPopupButtons = true;
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
    console.log('saveGeometry mit feature: %s', feature);
    var layer,
        latlng = feature.editableLayer.getLatLng();

    console.log('latlng: %o', latlng);
    if (feature.markerId) {
      console.log('feature.markerId: %s', feature.markerId);
      var layer = kvm.map._layers[feature.markerId];
      console.log('layer extrahiert: %o', layer);
    }

    $('#sperr_div_content').html('Aktualisiere die Geometrie');
    $('#sperr_div').show();

// Ist schon passiert durch readDataset
//    console.log('setze neue geometry for feature: %o', feature.newGeom);
//    //  - Die Änderung im Featureobjekt vorgenommen
//    feature.geom = feature.newGeom;

    if (layer) {
      this.layerGroup.removeLayer(feature.markerId);
    }
/*
      // Ursprüngliche durch neue Geometrie ersetzen
      //  - im Layerobjekt (z.B. circleMarker)
      console.log('setLatLng from editable layer');
      layer.setLatLng(feature.editableLayer.getLatLng());

      console.log('Style der ursprünglichen Geometrie auf default setzen');
      layer.setStyle(feature.getNormalCircleMarkerStyle());
*/

    console.log('Lege neuen CircleMarker an.');
    // circleMarker erzeugen mit Popup Eventlistener
    var circleMarker = L.circleMarker(feature.wkxToLatLngs(feature.newGeom), {
      renderer: kvm.myRenderer,
      featureId: feature.id
    }).bindPopup(this.getPopup(feature));

    console.log('Style der neuen Geometrie auf default setzen');
    circleMarker.setStyle(feature.getNormalCircleMarkerStyle());

    console.log('Setze click event for marker');
    circleMarker.on('click', function(evt) {
      console.log('open popup gesetzt in save Geometry');
      console.log('activeFeature is editable: %s', kvm.activeLayer.activeFeature.editable);
      if (kvm.activeLayer.activeFeature && kvm.activeLayer.activeFeature.editable) {
        console.log('hide all popup-functions with hide function');
        $('.popup-functions').hide();
      }
      else {
        console.log('select Feature');
        kvm.activeLayer.selectFeature(kvm.activeLayer.features[evt.target.options.featureId]);
      }
    });

    console.log('Füge circleMarker zur layerGroup hinzu.');
    // circleMarker als Layer zur Layergruppe hinzufügen
    this.layerGroup.addLayer(circleMarker);

    console.log('Frage markerId ab und ordne feature zu.');
    // layer_id abfragen und in Feature als markerId speichern
    feature.markerId = this.layerGroup.getLayerId(circleMarker);

    console.log('setze layer variable mit circleMarker id: %s', feature.markerId);
    layer = kvm.map._layers[feature.markerId];
    console.log('layer variable jetzt: %o', layer);

    console.log('Setze feature auf nicht mehr editierbar.');
    // editierbare Geometrie aus der Karte löschen und damit Popup der editierbaren Geometrie schließen
    feature.setEditable(false);

    console.log('Zoome zum Feature');
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
        console.log('attr.name: %s', attr.get('name'));
        //console.log('attr.privilege: %s', attr.get('privilege'));
        if (
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
      }).bind({ geometry_attribute: this.get('geometry_attribute') })
    );

    return changes;
  };

  /**
  * This function runs the startFunc with the bound strategy as context
  */
  this.runStrategy = function(startFunc) {
    console.log('runStrategy with context: %o', this);
    startFunc();
  };

  /**
  * Function create a dataset in the local database and
  * create the appropriated delta dataset in the deltas table
  * @param array changes Data from the activeFeature for the new dataset
  * @param function The callback function for success
  */
  this.runInsertStrategy = function() {
    console.log('runInsertStrategy');
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
    console.log('backupDataset');
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

    console.log('Backup vorhandenen Datensatz mit sql: %o', sql);
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
    console.log('insertDataset rs: %o', rs);
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
      console.log('no imgChanges');
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
    console.log('createDataset with sql: %s', sql);
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
    console.log('afterCreateDataset rs: %o', rs.rows.item(0));
    var layer = this.context;

    console.log('set data for activeFeature: %o', rs.rows.item(0));
    console.log('with geom: %o', rs.rows.item(0).geom);
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
    console.log('runUpdateStrategy');
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
    console.log('updateDataset rs: %o', rs);
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
        console.log('no imgChanges');
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
    console.log('afterUpdateDataset rs: %o', rs);
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
    console.log('runDeleteStrategy');
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
    console.log('deleteDataset');
    var layer = this.context,
        delta = layer.getDeleteDelta(),
        sql = delta.delta + " AND endet IS NULL";

    this.next.context = layer;
    this.next.delta = delta;
    console.log('SQL zum Löschen des Datensatzes: %s', sql);
    console.log('Nächste Funktion nach Datenbankabfrage: %s', this.next.succFunc);
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
    console.log('afterDeleteDataset');
    var layer = this.context,
        featureId = layer.activeFeature.id,
        markerId = layer.activeFeature.markerId;

    console.log('Datensatz erfolgreich gesichert und aktueller gelöscht.')

    console.log('Remove Editable Geometrie');
    kvm.controller.mapper.removeEditable(layer.activeFeature);

    console.log('Löscht Layer mit markerId: %s aus Layergroup', layer.activeFeature.markerId);
    layer.layerGroup.removeLayer(markerId);

    console.log('Löscht Feature aus FeatureList : %o', layer.activeFeature);
    $('#' + layer.activeFeature.id).remove();

    console.log('Wechsel die Ansicht zur Featurelist.');
    kvm.showItem((!$('#map').is(':visible')) ? 'featurelist' : 'map');
    console.log('Scroll die FeatureListe nach ganz oben');

    console.log('Lösche Feature aus features Array des activeLayer');
    delete layer.features[featureId];

    console.log('Lösche activeFeature')
    delete layer.activeFeature;

    console.log('Blende Sperrdiv aus');
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
    console.log('writeDelta');
    console.log('layer: %o', this.context);
    console.log('delta: %o', this.delta);
    console.log('changes: %o', this.changes);
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
    console.log('SQL zum Schreiben des Deltas: %s', sql);
    console.log('Funktion nach erfolgreicher Datenbankabfrag: %s', this.next.succFunc);
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
    console.log('runRestoreStrategy');
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
    console.log('restoreDataset');
    console.log('context %o', this.context);
    console.log('attr gefiltert: %o', );
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
    console.log('SQL zum Wiederherstellen des Datensatzes: %s', sql);
    console.log('Nächste Funktion nach Datenbankabfrage: %s', this.next.succFunc);
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
    console.log('readDataset');
    console.log('layer: %o', this.context);
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
    console.log('SQL zum lesen des Datensatzes: %s', sql);
    console.log('Funktion nach erfolgreicher Datenbankabfrage: %s', this.next.succFunc);
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
    console.log('deleteDeltas');
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
        img_old = (change.oldVal ? change.oldVal.slice(1, -1).split(',') : []);
        img_new = (change.newVal ? change.newVal.slice(1, -1).split(',') : []);

        $.map(
          img_new,
          (function(img) {
            console.log(img + ' in ' + img_old.join(', ') + '?');
            if (img_old.indexOf(img) < 0) {
              console.log('neues Image');
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
              console.log('context: %o', context);
              (this.writeDelta).bind(context)();
            }
          }).bind(this)
        );

        $.map(
          img_old,
          (function(img) {
            console.log(img + ' in ' + img_new.join(', ') + '?');
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
                        msg: 'Löschung von Bild' + img + ' eingetragen.',
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
    kvm.log('execServerDeltaSuccessFunc');
    this.context.numExecutedDeltas++;
    if (this.context.numExecutedDeltas == this.context.numReturnedDeltas) {
      this.context.set('syncVersion', parseInt(this.response.syncData[this.response.syncData.length - 1].push_to_version));
      this.context.saveToStore();
      kvm.msg('Synchronisierung erfolgreich abgeschlossen!');
      //kvm.msg('Aktuelle Version: ' + this.context.get('syncVersion'));
      this.context.clearDeltas('sql');
      this.context.readData($('#limit').val(), $('#offset').val());
    }
    else {
      console.log(this.context.numExecutedDeltas + '. Delta ausgeführt! Weiter ...');
    }
  };

  // ToDo getInsertDelta schreiben und ggf. auch in createDelta verwenden.
  // Prüfen ob values auch so wie in collectChanges erzeugt werden können oder dort wieder verwendet werden kann.
  // was wenn ein changes Array erzeugt wird und damit writeDelta aufgerufen wird bei einem restore Dataset. Muss da nicht
  // immer ein neuer Datensatz her? Also statt endet auf null setzen immer einen neuen erzeugen und dafür den mit endet = Datum immer löschen.
  // prüfen wie sich die ganze Geschichte auf img auswirkt.
  // prüfen wie das mit dem user_name ist, der darf nach einem Rückgängig machen nicht mit drin sein, wenn vorher keiner drin stand.

  this.appendToList = function() {
    kvm.log('Füge Layer ' + this.get('title') + ' zur Layerliste hinzu.', 3);
    $('#layer_list').append(this.getListItem());
  };

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
        <i class="layer-functions-button fa fa-ellipsis-v" aria-hidden="true"></i>\
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
    console.log('getlayerIds: %o', kvm.store.getItem('layerIds_' + this.stelle.get('id')));
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

    // create layerFilter
    this.createLayerFilterForm();
    var layerFilter = kvm.store.getItem('layerFilter');
    if (layerFilter) {
      this.loadLayerFilterValues(JSON.parse(layerFilter));
    }

    // set sortAttribute
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

    // set featureForm and dataView
    $('#formular').html('');
    this.createFeatureForm();
    this.createDataView();
    $('input[name=activeLayerId]').checked = false
    $('input[value=' + this.getGlobalId() + ']')[0].checked = true;
    $('.layer-functions-button, .layer-functions-div').hide();
    $('#layer_' + kvm.activeLayer.getGlobalId() + ' > .layer-functions-button').show();
    $('#layer_' + kvm.activeLayer.getGlobalId() + ' > .layer-functions-button').children().removeClass('fa-ellipsis-v fa-window-close-o');
    $('#layer_' + kvm.activeLayer.getGlobalId() + ' > .layer-functions-button').children().addClass('fa-ellipsis-v');
    if (parseInt(this.get('privileg')) > 0) {
      $('#newFeatureButton').show();
    }
    kvm.controls.layers.removeLayer(this.layerGroup);
    kvm.controls.layers.addOverlay(this.layerGroup, this.get('alias'));
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
          
          if (value.settings.form_element_type == 'Auswahlfeld') {
            input_field = $('<select id="filter_value_' + value.settings.name + '" class="filter-view-value-field" name="filter_value_' + value.settings.name + '">');
            input_field.append($('<option value=""></option>'));
            value.settings.options.map(
              function(option) {
                input_field.append($('<option value="' + option.value + '">' + option.output + '</option>'));
              }
            )
          }
          else {
            input_field = '<input id="filter_value_' + value.settings.name + '" class="filter-view-value-field" name="filter_value_' + value.settings.name + '" type="text" value=""/>';
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

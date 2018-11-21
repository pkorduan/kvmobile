function Layer(stelle, settings = {}) {
  kvm.log('Erzeuge Layerobjekt mit settings: ' + JSON.stringify(settings), 3);
  var layer_ = this;
  this.stelle = stelle;
  this.settings = (typeof settings == 'string' ? $.parseJSON(settings) : settings);
  this.attributes = [];
  this.runningSyncVersion = 0;

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
  */
  this.readData = function() {
    kvm.log('Layer.readData from table: ' + this.get('schema_name') + '.' + this.get('table_name'), 3);
    $('#sperr_div').show();

    var filter = $('#anzeigeFilterSelect').val(),
        sql = "\
      SELECT\
        *\
      FROM\
        " + this.get('schema_name') + '.' + this.get('table_name') + "\
      WHERE\
        " + (filter == '' ? "1 = 1" : filter) + "\
      ORDER BY \
        " + (this.get('name_attribute') != '' ? this.get('name_attribute') : this.get('id_attribute')) + "\
    ";
    kvm.log('Lese Daten aus lokaler Datenbank mit Sql: ' + sql, 3);
    kvm.db.executeSql(
      sql,
      [],
      (function(rs) {
        kvm.log('Layer.readData result: ' + JSON.stringify(rs), 4);

        var numRows = rs.rows.length,
            item,
            i;

        kvm.log(numRows + ' Datensaetze gelesen, erzeuge Featurliste neu.', 3);
        this.numFeatures = numRows;

        this.features = {};
        for (i = 0; i < numRows; i++) {

          item = rs.rows.item(i);
          this.features['id_' + item.uuid] = new Feature(item);
        }
        if ($('#syncLayerIcon_' + this.getGlobalId()).hasClass('fa-spinner')) {
          $('#syncLayerIcon_' + this.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
        }
        kvm.setConnectionStatus();
        kvm.createFeatureList();

        this.drawFeatureMarker();
        $('#sperr_div').hide();
      }).bind(this),
      function(error) {
        kvm.log('Fehler bei der Abfrage der Daten aus lokaler Datenbank: ' + error.message);
        $('#sperr_div').hide();
      }
    );
  };

  this.writeData = function(items) {
    kvm.log('Schreibe die Empfangenen Daten in die lokale Datebank', 3);
    var tableName = this.get('schema_name') + '.' + this.get('table_name'),
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
              ).join(', ')
            }
          ).join('), (') +
        ')';

    sql = "\
      INSERT INTO " + this.get('schema_name') + '.' + this.get('table_name') +" (\
        " + keys + ")\
      VALUES\
        " + values + "\
    ";

    kvm.log('Schreibe Daten in lokale Datenbank mit Sql: ' + sql, 4);
    kvm.db.executeSql(
      sql,
      [],
      (function(rs) {
        kvm.log('Daten erfolgreich in Datenbank geschrieben', 3);
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
    kvm.log('Tabelle anlegen.', 3);
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
      this.createTable(this);
    };
  };

  this.createTable = function(layer) {
    kvm.log('Layer.createTable with settings: ' + JSON.stringify(this.settings), 4);
    layer_ = this;

    kvm.db.attach(
      this.get('schema_name'),
      config.dbname + '.db',
      (function() {
        var layer_ = this;
        kvm.log('Erzeuge Tabelle ' + layer_.get('schema_name') + '.' + layer_.get('table_name') +' in lokaler Datenbank.');
        sql = '\
          CREATE TABLE IF NOT EXISTS ' + layer_.get('schema_name') + '.' + layer_.get('table_name') + ' (' +
            $.map(
              layer_.attributes,
              function(attr) {
                return attr.get('name') + ' ' + attr.getSqliteType() + (attr.get('nullable') == '0 ' ? ' NOT NULL' : '');
              }
            ).join(', ') + '\
          )\
        ';
        kvm.log('Erzeuge Tabelle mit Statement sql: ' + sql, 3);

        kvm.db.executeSql(
          sql,
          [],
          function(db, res) {
            kvm.log('Tabelle erfolgreich angelegt.', 3);
          },
          function(error) {
            kvm.log('Fehler beim Anlegen der Tabelle: ' + error.message, 1);
            kvm.msg('Fehler beim Anlegen der Tabelle: ' + error.message);
          }
        );

        layer_.createDeltaTable();
      }).bind(layer_),
      function(err) {
        kvm.log('err: ' + JSON.stringify(err), 1);
      }
    );
  };

  this.createDeltaTable = function() {
    kvm.log('Erzeuge Tabelle für deltas in lokaler Datenbank.', 3);
    sql = '\
      CREATE TABLE IF NOT EXISTS ' + this.get('schema_name') + '.' + this.get('table_name') + '_deltas (\
        version INTEGER PRIMARY KEY,\
        type text,\
        change text,\
        delta text,\
        created_at text\
      )\
    ';
    kvm.log('Erzeuge Deltas Tabelle mit Statement sql: ' + sql, 3);

    kvm.db.executeSql(
      sql,
      [],
      function(db, res) {
        kvm.log('Deltas Tabelle erfolgreich angelegt.', 3);
      },
      function(error) {
        kvm.log('Fehler beim Anlegen der Deltas Tabelle: ' + error.message, 1);
        kvm.msg('Fehler beim Anlegen der Deltas Tabelle: ' + error.message);
      }
    );
  };

  this.requestData = function() {
    kvm.log('Frage Daten ab.' , 3);
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
              kvm.log('Download der Daten ist abgeschlossen.', 3);
              var items = [],
                  collection = {},
                  errMsg = '';

              kvm.log('Download Ergebnis:' + JSON.stringify(this.result), 4);
              try {
                collection = $.parseJSON(this.result);
                if (collection.features.length > 0) {
                  kvm.log('Mindestens 1 Datensatz empfangen.', 3);
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
          dataObj = new Blob(['file data to upload'], { type: 'text/plain' });
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
            this.execDelta(value.sql);
          }).bind(this)
        );
        // ToDo delete deltas and set new Version at the end of a transaction in which all deltas has been executed
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
        " + this.get('schema_name') + '.' + this.get('table_name') + "_deltas\
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

    sql = "\
      SELECT\
        * \
      FROM\
        " + this.get('schema_name') + '.' + this.get('table_name') + "_deltas\
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

        if (numRows > 0) {
          for (i = 0; i < numRows; i++) {
            kvm.log('Push item ' + i + ' to deltas.', 4);
            deltas.rows.push({
              'version' : rs.rows.item(i).version,
              'sql' : rs.rows.item(i).delta
            });
          }
          this.sendDeltas(deltas);
        }
        else {
          kvm.msg('Keine Änderungen zum Syncronisieren vorhanden.');
          if ($('#syncLayerIcon_' + this.getGlobalId()).hasClass('fa-spinner')) {
            $('#syncLayerIcon_' + this.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
            $('#sperr_div').hide();
          }
        }
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

  /*
  * Delete all features from layer, feature list, map and its data in the database table and deltas
  * and also lastVersionNr of the layer to make the way free for a new initial download
  */
  this.clearData = function() {
    kvm.log('Layer.clearData', 4);
    var sql = '\
      DELETE FROM ' + this.get('schema_name') + '.' + this.get('table_name') + '\
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
    if (this.markerClusters) this.markerClusters.clearLayers();
    this.setEmpty();
  };

  this.deleteDeltas = function(type, delta) {
    if (typeof delta === 'undefined') delta = '';
    kvm.log('Layer.deleteDeltas', 4);
    var sql = '\
      DELETE FROM ' + this.get('schema_name') + '.' + this.get('table_name') + '_deltas\
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

  /*
  * Request all layers from active serversetting
  */
  this.requestLayers = function() {
    //console.log('Layer.requestLayers for stelle: %o', this.stelle);
    var fileTransfer = new FileTransfer(),
        filename = cordova.file.dataDirectory + 'layers_stelle_' + this.stelle.get('id') + '.json',
        //filename = 'temp_file.json',
        url = this.getLayerUrl();

    kvm.log('Download Layerdaten von Url: ' + url);
    kvm.log('Speicher die Datei auf dem Gerät in Datei: ' + filename);

    fileTransfer.download(
      url,
      filename,
      function (fileEntry) {
        fileEntry.file(
          function (file) {
            var reader = new FileReader();

            reader.onloadend = function() {
              kvm.log('Download der Layerdaten abgeschlossen.');
              var items = [];
              kvm.log('Download Result: ' + this.result, 4);
              if (this.result.indexOf('form name="login"') > -1) {
                kvm.msg('Zugang zum Server verweigert! Prüfen Sie Ihre Zugangsdaten unter Einstellungen.');
                $('#sperr_div').hide();
              }
              else {
                resultObj = $.parseJSON(this.result);
                if (resultObj.success) {
                  kvm.log('Download erfolgreich.', 3);
                  //console.log('resultObj: %o', resultObj);
                  $('#layer_list').html('');
                  $.each(
                    resultObj.layers,
                    function(index, layerSetting) {
                      //console.log('Layer.requestLayers create layer with settings: %o', layerSetting);
                      kvm.log('Erzeuge Layerliste.', 3);
                      layer = new Layer(kvm.activeStelle, layerSetting);
                      layer.saveToStore();
                      layer.createTable();
                      layer.appendToList();
                    }
                  );
                  kvm.bindLayerEvents();
                  kvm.setConnectionStatus();
                  //console.log('Store after save layer: %o', kvm.store);
                  $('#requestLayersButton').hide();
                  $('#sperr_div').hide();
                }
                else {
                  kvm.log('Fehler beim Abfragen der Layerdaten. Falsche Serverparameter oder Fehler auf dem Server.', 2);
                  alert('Abfrage liefert keine Daten vom Server. Entweder sind keine auf dem Server vorhanden oder die URL der Anfrage ist nicht korrekt. Prüfen Sie die Parameter unter Einstellungen.');
                  $('#sperr_div').hide();
                }
              }
            };

            reader.readAsText(file);
          },
          function(error) {
            alert('Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für den Download verwendet werden.');
            kvm.log('Fehler beim lesen der Datei: ' + error.code);
            $('#sperr_div').hide();
          }
        );
      },
      this.downloadError,
      true
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
    $('#formular').html('\
      <form id="featureFormular">\
      </form>'
    );
    $.map(
      this.attributes,
      function(attr) {
        $('#featureFormular').append(
          attr.formField.withLabel()
        );

        attr.formField.bindEvents();
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

  this.loadFeatureToForm = function(feature) {
    kvm.log('Lade Feature in Formular.', 3);
    this.activeFeature = feature;

    $.map(
      this.attributes,
      (function(attr) {
        var key = attr.get('name'),
            val = this.get(key);

        attr.formField.setValue(val);
      }).bind(feature)
    );

    if (typeof kvm.activeLayer.features['id_' + kvm.activeLayer.activeFeature.get('uuid')] == 'undefined') {
      $('#goToGpsPositionButton').hide();
    }
    else {
      $('#goToGpsPositionButton').show();
    }

    kvm.controller.mapper.watchGpsAccuracy();
  };

  this.drawFeatureMarker = function() {
    kvm.log('Erzeuge Markercluster in der Karte: ', 3);

    if (this.markerClusters) this.markerClusters.clearLayers();
    this.markerClusters = L.markerClusterGroup({
      maxClusterRadius: function(zoom) {
        return (zoom == 18 ? 5 : 50)
      }
    });
    $.each(
      this.features,
      (function (key, feature) {
        var latlng = feature.getCoord();
        //kvm.log('layer.drawFeatureMarker: add feature in map to latlng: ' + JSON.stringify(latlng), 4);

        if (latlng) {
          feature.marker = L.marker(latlng, {icon: this.getIcon()}).bindPopup(this.getPopup(feature));
          this.markerClusters.addLayer(feature.marker);
        }
      }).bind(this)
    );
    kvm.map.addLayer(this.markerClusters);
    kvm.log(Object.keys(this.features).length + ' Objekte in Karte eingefügt.', 3);
  };

  this.getPopup = function(feature) {
    var html;

    html = feature.get('hst_name') + '<br>\
        <a class="popup-aendern-link" href="#" onclick="kvm.activeLayer.goToForm(\'' + feature.get('uuid') + '\')">Ändern</a>\
    ';
    return html;
  };

  this.goToForm = function(uuid) {
    if ($('#saveFeatureButton').hasClass('active-button')) {
      kvm.msg('Es gibt nicht gespeicherte Änderungen! Gehen Sie zurück zum Formular und verwerfen Sie die Änderungen um eine neue Änderung zu beginnen.');
    }
    else {
      this.loadFeatureToForm(this.features['id_' + uuid]);
      kvm.showItem('formular');
    }
  };

  this.collectChanges = function(action) {
    kvm.log('Layer.collectChanges', 4);
    var activeFeature = this.activeFeature,
        changes = [];

    // loop over all elements of the form or over all attributes of the layer respectively
    // compare form element content with old values and if changes exists assign
    changes = $.map(
      this.attributes,
      (function(attr) {
        kvm.log('Vergleiche Werte von Attribut: ' + attr.get('name') + ' action: ' + action, 3);
        var key = attr.get('name'),
            oldVal = activeFeature.get(key);
            newVal = attr.formField.getValue(this.action);

        if (typeof oldVal == 'string') oldVal = oldVal.trim();
        if (typeof newVal == 'string') newVal = newVal.trim();

        kvm.log('Vergleiche ' + attr.get('form_element_type') + ' Attribut: ' + key + '(' + oldVal + ' (' + typeof oldVal + ') vs. ' + newVal + '(' + typeof newVal + '))', 3);
        if (oldVal != newVal) {
          kvm.log('Änderung in Attribut ' + key + ' gefunden.', 3);
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
          INSERT INTO ' + this.get('schema_name') + '.' + this.get('table_name') + '(' +
            $.map(
              changes,
              function(change) {
                return change.key;
              }
            ).join(', ') + ', \
            uuid\
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
            \'' + this.activeFeature.get('uuid') + '\'\
          )\
        '
      });
    };

    if (action == 'UPDATE') {
      deltas.push({
        "type" : 'sql',
        "change" : 'update',
        "delta" : '\
          UPDATE ' + this.get('schema_name') + '.' + this.get('table_name') + '\
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
            uuid = \'' + this.activeFeature.get('uuid') + '\'\
        '
      });
    };

    if (action == 'DELETE') {
      deltas.push({
        "type" : 'sql',
        "change" : 'delete',
        "delta" : '\
          DELETE FROM ' + this.get('schema_name') + '.' + this.get('table_name') + '\
          WHERE\
            uuid = \'' + this.activeFeature.get('uuid') + '\'\
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
                  " + this.get('schema_name') + '.' + this.get('table_name') + "_deltas\
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
                      DELETE FROM " + this.get('schema_name') + '.' + this.get('table_name') + "_deltas\
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
  * exec sql in layer table and if success write delta in deltas table
  */
  this.execDelta = function(delta) {
    kvm.log('Layer.execDelta: ' + JSON.stringify(delta), 4);
    kvm.db.executeSql(
      delta,
      [],
      (function(rs) {
        kvm.log('Layer.execDelta Sql ausgeführt.', 4);
        this.readData();
        kvm.showItem('featurelist');
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

  this.writeDeltas = function(deltas) {
    kvm.log('Layer.writeDeltas: ' + JSON.stringify(deltas), 4);

    $.each(
      deltas,
      (function(index, delta) {
        var sql = "\
              INSERT INTO " + this.get('schema_name') + '.' + this.get('table_name') + "_deltas (\
                type,\
                change,\
                delta,\
                created_at\
              )\
              VALUES (\
                '" + delta.type + "',\
                '" + delta.change + "',\
                '" + delta.delta.replace(/\'/g, '\'\'') + "',\
                '" + (new Date()).toISOString().replace('Z', '') + "'\
              )\
            ";

        kvm.log('Layer.writeDeltas to table ' + this.get('schema_name') + '.' + this.get('table_name') + '_deltas sql: ' + sql, 3);

        kvm.db.executeSql(
          sql,
          [],
          (function(rs) {
            kvm.log('Layer.writeDeltas Speicherung erfolgreich.', 4);
            if (delta.type == 'sql') this.execDelta(delta.delta);
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
      </div>\
      <div style="clear: both"></div>';
    return html;
  };

  this.getLayerUrl = function() {
    kvm.log('Layer.getLayerUrl', 4);
    var url = this.stelle.get('url'),
        file = this.stelle.getUrlFile(url);

    url += file +
      'go=mobile_get_layers' + '&' +
      'login_name=' + stelle.get('login_name') + '&' +
      'passwort=' + stelle.get('passwort') + '&' +
      'Stelle_ID=' + stelle.get('Stelle_ID');
    return url;
  };

  this.getSyncUrl = function() {
    kvm.log('Layer.getSyncUrl', 4);
    var url = this.stelle.get('url'),
        file = this.stelle.getUrlFile(url);

    url += file +
      'Stelle_ID=' + stelle.get('Stelle_ID') + '&' +
      'login_name=' + stelle.get('login_name') + '&' +
      'passwort=' + stelle.get('passwort') + '&' +
      'selected_layer_id=' + this.get('id');

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
    kvm.log('Einstellungen speichern.', 3);
    var layerIds = $.parseJSON(kvm.store.getItem('layerIds_' + this.stelle.get('id'))),
        settings = JSON.stringify(this.settings);

    if (layerIds == null) { layerIds = []; }
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
    kvm.log('Setze Layer ' + this.get('title') + ' (' + this.get('alias') + ') auf aktiv.', 3);
    kvm.activeLayer = this;
    kvm.store.setItem('activeLayerId', this.get('id'));
    this.createFeatureForm();
    $('input[name=activeLayerId]').checked = false
    $('input[value=' + this.getGlobalId() + ']')[0].checked = true;
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

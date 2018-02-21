function Layer(stelle, settings = {}) {
  console.log('Erzeuge Layerobjekt mit settings %o', { settings : settings });
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
  }

  this.isEmpty = function() {
    return (
      typeof this.get('syncVersion') == 'undefined' ||
      this.get('syncVersion') == null ||
      this.get('syncVersion') == '' ||
      this.get('syncVersion') == 0
    );
  };

  this.setEmpty = function() {
    this.set('syncVersion') == 0;
  };

  /*
  * Load data from local db, create feature objects and show in list view
  */
  this.readData = function() {
    console.log('Layer.readData from table: ' + this.get('schema_name') + '.' + this.get('table_name'));
    kvm.log('Lese Daten aus lokaler Datenbank');
    sql = "\
      SELECT\
        *\
      FROM\
        " + this.get('schema_name') + '.' + this.get('table_name') + "\
      ORDER BY \
        name\
    ";
    kvm.db.executeSql(
      sql,
      [],
      (function(rs) {
        console.log('Layer.readData result: %o', rs);
        debug_rs = rs;

        var numRows = rs.rows.length,
            item,
            i;

        kvm.log(numRows + ' Datensaetze gelesen, erzeuge Featurliste neu.');
        this.features = {};
        for (i = 0; i < numRows; i++) {
          item = rs.rows.item(i);
          this.features['id_' + item.uuid] = new Feature(item);
        }
        if ($('#syncLayerIcon_' + this.getGlobalId()).hasClass('fa-spinner')) {
          $('#syncLayerIcon_' + this.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
        }
        kvm.createFeatureList();
        this.olLayer.getSource().clear();
        kvm.drawFeatureMarker();
      }).bind(this),
      function(error) {
        kvm.log('Fehler bei der Abfrage der Daten aus lokaler Datenbank: ' + error.message);
        $('#storeTestDataResult').html('SQL ERROR: ' + error.message);
      }
    );
  };

  this.writeData = function(items) {
    kvm.log('Schreibe die Empfangenen Daten in die lokale Datebank');
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

    console.log('Schreibe Daten in lokale Datenbank mit Sql: %o', { sql: sql});
    kvm.db.executeSql(
      sql,
      [],
      (function(rs) {
        kvm.log('Daten erfolgreich in Datenbank geschrieben');
        this.set('syncVersion', this.runningSyncVersion);
        this.set('syncLastLocalTimestamp', Date());
        this.saveToStore();
        this.setActive();
        this.readData();
      }).bind(this),
      (function(error) {
        this.set('syncVersion', 0);
        alert('Fehler beim Zugriff auf die Datenbank: ' + error.message);
      }).bind(this)
    );
  };
  
  this.createTable = function() {
    console.log('Layer.createTable with settings: %o', this.settings);
    layer_ = this;

    kvm.db.attach(
      this.get('schema_name'),
      config.dbname + '.db',
      function() {
        kvm.log('Erzeuge Tabelle in lokaler Datenbank.');
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
        console.log('Erzeuge Tabelle mit Statement sql: ' + sql);

        kvm.db.executeSql(
          sql,
          [],
          function(db, res) {
            kvm.log('Tabelle erfolgreich angelegt.');
          },
          function(error) {
            kvm.msg('Fehler beim Anlegen der Tabelle: ' + error.message);
          }
        );

        layer_.createDeltaTable();
      },
      function(err) {
        console.log('err: %o', err);
      }
    );
  };

  this.createDeltaTable = function() {
    console.log('Layer.createDeltaTable with settings: %o', this.settings);
    kvm.log('Erzeuge Tabelle für deltas in lokaler Datenbank.');
    sql = '\
      CREATE TABLE IF NOT EXISTS ' + this.get('schema_name') + '.' + this.get('table_name') + '_deltas (\
        version INTEGER PRIMARY KEY,\
        type text,\
        change text,\
        delta text,\
        created_at text\
      )\
    ';
    console.log('Erzeuge Deltas Tabelle mit Statement sql: ' + sql);

    kvm.db.executeSql(
      sql,
      [],
      function(db, res) {
        kvm.log('Deltas Tabelle erfolgreich angelegt.');
      },
      function(error) {
        kvm.msg('Fehler beim Anlegen der Deltas Tabelle: ' + error.message);
      }
    );
  };
/*  lastVersionExists: function() {
    console.log('Layer.lastVersionExists');
    return (kvm.activeLayer.lastVersion ? true : false);
  },

  requestDeltas: function() {
    console.log('Layer.requestDeltas');
  },
*/

  this.requestData = function() {
    console.log('Layer.requestData');
    var fileTransfer = new FileTransfer(),
        filename = 'data_layer_' + this.getGlobalId() + '.json',
        url = this.getSyncUrl();

    kvm.log('Speicher die Daten in Datei: ' + cordova.file.dataDirectory + filename);
    fileTransfer.download(
      url,
      cordova.file.dataDirectory + filename,
      function (fileEntry) {
        fileEntry.file(
          function (file) {
            var reader = new FileReader();

            reader.onloadend = function() {
              kvm.log('Download der Daten ist abgeschlossen.');
              var items = [],
                  collection = {};

              console.log('Download result: %o', { result: this.result })
              try {
                collection = $.parseJSON(this.result);
                if (collection.features.length > 0) {
                  kvm.log('Mindestens 1 Datensatz empfangen.');
                  var layer = kvm.activeLayer;
                  layer.runningSyncVersion = collection.features[0].properties.version;
                  kvm.log('Version der Daten: ' + layer.runningSyncVersion);
                  layer.writeData(collection.features);
                }
                else {
                  alert('Abfrage liefert keine Daten vom Server. Entweder sind noch keine auf dem Server vorhanden oder die URL der Anfrage ist nicht korrekt. Prüfen Sie die Parameter unter Einstellungen.');
                }
              } catch (e) {
                kvm.msg('Es konnten keine Daten empfangen werden.' + this.result);
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
      this.downloadError,
      true
    );
  };

  this.sendDeltas = function(deltas) {
    console.log('Layer.sendDeltas %o', deltas);
    deltas_ = deltas;
    window.requestFileSystem(
      window.TEMPORARY,
      5 * 1024 * 1024,
      (function (fs) {
        console.log('file system open: ' + fs.name);
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
            console.log('onErrorCreateFile');
          }
        );
      }).bind(this),
      function(err) {
        console.log('onErrorLoadFs');
      }
    );
  };

  this.writeFile = function(fileEntry, deltas) {
    // Create a FileWriter object for our FileEntry (log.txt).
    fileEntry.createWriter(
      (function (fileWriter) {
        fileWriter.onwriteend = (function () {
          console.log("Successful file write...");
          this.upload(fileEntry);
        }).bind(this);

        fileWriter.onerror = function (e) {
          console.log("Failed file write: " + e.toString());
        };

        if (!deltas) {
          dataObj = new Blob(['file data to upload'], { type: 'text/plain' });
        }
        else {
          dataObj = new Blob([JSON.stringify(deltas)], { type: 'application/json'});
        }
        console.log('Layer.writeFile dataObj %o', dataObj);
        fileWriter.write(dataObj);
      }).bind(this)
    );
  };

  this.upload = function(fileEntry) {
    var fileURL = fileEntry.toURL();
    var success = (function (r) {
      console.log("Successful upload...");
      console.log("Code = " + r.responseCode);
      console.log('Response: %o', r.response);
      var response = $.parseJSON(r.response);

      if (response.success) {
        kvm.log('Syncronisierung erfolgreich auf dem Server durchgeführt.');
        console.log('Antwort vom Server: %o', response);
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
      }
      // displayFileData(fileEntry.fullPath + " (content uploaded to server)");
    }).bind(this);

    var fail = function (error) {
      kvm.msg("Fehler beim Hochladen der Sync-Datei! Fehler " + error.code);
    }

    var layer = kvm.activeLayer,
        stelle = layer.stelle,
        url = stelle.get('url'),
        file = layer.getUrlFile(url),
        server = url + file,
        params = {},
        options = new FileUploadOptions();

    params.device_id = device.uuid; 
    params.Stelle_ID = stelle.get('Stelle_ID');
    params.username = stelle.get('username');
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
    console.log('upload to url: ' + server);
    console.log('with params: %o', params);
    console.log('with options: %o', options);
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
  * Anforderung von Dirk
  * Metainfos zu einem Bild speichern. Da könnte auch die Info ran ob Bild schon geuploaded oder zu löschen ist. Wenn upload
  * geklappt hat, könnte Status von to_upload zu uploaded geändert werden und wenn löschen auf dem Server geklappt hat,
  * kann das Bild auch in der Liste der Bilder und somit auch deren Metadaten gelöscht werden.
  *
  */
  this.syncImages = function() {
    console.log('Layer.syncImages');
    sql = "\
      SELECT\
        * \
      FROM\
        " + this.get('schema_name') + '.' + this.get('table_name') + "_deltas\
      WHERE\
        type = 'img'\
    ";
    console.log('Layer.syncImages: query deltas with sql: ' + sql);
    kvm.db.executeSql(
      sql,
      [],
      (function(rs) {
        console.log('Layer.syncImages query deltas success result %o:', rs);
        var numRows = rs.rows.length,
            icon,
            i;

        if (numRows > 0) {
          console.log(numRows + ' deltas gefunden.');
          for (i = 0; i < numRows; i++) {
            if (rs.rows.item(i).change == 'insert') {
              console.log(i + '. insert');
              this.sendNewImage(rs.rows.item(i).delta);
            }
            if (rs.rows.item(i).change == 'delete') {
              console.log(i + '. delete');
              this.sendDropImage(rs.rows.item(i).delta);
            }
          }
        }
        else {
          kvm.msg('Keine neuen Bilder zum Hochladen vorhanden.');
          icon = $('#syncImagesIcon_' + this.getGlobalId());
          if (icon.hasClass('fa-spinner')) icon.toggleClass('fa-upload fa-spinner fa-spin');
        }
      }).bind(this),
      function(error) {
        console.log('Layer.syncData query deltas Fehler: %o', error);
        kvm.msg('Fehler beim Zugriff auf die Datenbank');
      }
    );
  };

  this.sendNewImage = function(img) {
    console.log('Layer.sendNewImage');
    console.log('Bild ' + img + ' wird hochgeladen.');
    var icon = $('#syncImagesIcon_' + this.getGlobalId()),
        ft = new FileTransfer(),
        fileURL = 'file://' + config.localImgPath + img.substring(img.lastIndexOf('/') + 1),
        url = this.stelle.get('url'),
        file = this.getUrlFile(url),
        server = url + file,
        win = (function (r) {
            console.log("Code = " + r.responseCode);
            console.log("Response = " + r.response);
            console.log("Sent = " + r.bytesSent);
            this.layer.deleteDeltas('img', this.img);
        }).bind({
          layer : this,
          img : img
        }),
        fail = (function (error) {
          if (this.hasClass('fa-spinner')) this.toggleClass('fa-upload fa-spinner fa-spin');

          kvm.msg("An error has occurred: Code = " + error.code);
          console.log("upload error source " + error.source);
          console.log("upload error target " + error.target);

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
      username : this.stelle.get('username'),
      passwort : this.stelle.get('passwort'),
      selected_layer_id : this.get('id'),
      go : 'mobile_upload_image'
    };

    console.log('upload to url: ' + server);
    console.log('with params: %o', options.params);
    console.log('with options: %o', options);
    ft.upload(fileURL, encodeURI(server), win, fail, options);

    // when the upload has been finished
    if (icon.hasClass('fa-spinner')) icon.toggleClass('fa-upload fa-spinner fa-spin');
  };

  this.sendDropImage = function(img) {
    console.log('Layer.sendDropImage');
    var url = this.stelle.get('url');
        file = this.getUrlFile(url),
        data = {
          device_id : device.uuid,
          Stelle_ID : this.stelle.get('Stelle_ID'),
          username : this.stelle.get('username'),
          passwort : this.stelle.get('passwort'),
          selected_layer_id : this.get('id'),
          go : 'mobile_delete_images',
          images : img
        };
    console.log('Send ' + url + file + $.param(data) + ' to drop image');

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
          debug_img = this;
          console.log('Bild: ' + this.img + ' erfolgreich gelöscht.');
          this.layer.deleteDeltas('img', this.img);
        }
      },
      error: function (e) {
        kvw.msg("An error has occurred: Code = " + e.msg);
      }
    });
    console.log('after ajax request');
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
    console.log('Layer.syncData');

    sql = "\
      SELECT\
        * \
      FROM\
        " + this.get('schema_name') + '.' + this.get('table_name') + "_deltas\
      WHERE\
        type = 'sql'\
    ";
    console.log('Layer.syncData: query deltas with sql: ' + sql);
    kvm.db.executeSql(
      sql,
      [],
      (function(rs) {
        console.log('Layer.syncData query deltas success result %o:', rs);
        var numRows = rs.rows.length,
            deltas = {'rows' : [] },
            i;

        if (numRows > 0) {
          for (i = 0; i < numRows; i++) {
            console.log('Push item ' + i + ' to deltas.');
            deltas.rows.push({
              'version' : rs.rows.item(i).version,
              'sql' : rs.rows.item(i).delta
            });
          }
          this.sendDeltas(deltas);
        }
        else {
          kvm.msg('Keine Änderungen zum Syncronisieren vorhanden.');
          if ($('#syncLayerIcon_' + this.getGlobalId()).hasClass('fa-spinner'))
            $('#syncLayerIcon_' + this.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
        }
      }).bind(this),
      function(error) {
        console.log('Layer.syncData query deltas Fehler: %o', error);
        kvm.msg('Fehler beim Zugriff auf die Datenbank');
        if ($('#syncLayerIcon_' + this.getGlobalId()).hasClass('fa-spinner'))
          $('#syncLayerIcon_' + this.getGlobalId()).toggleClass('fa-refresh fa-spinner fa-spin');
      }
    );
  };

  /*
  * Delete all features from layer, feature list, map and its data in the database table and deltas
  * and also lastVersionNr of the layer to make the way free for a new initial download
  */
  this.clearData = function() {
    console.log('Layer.clearData');
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
    this.olLayer.getSource().clear();
    this.setEmpty();
  };

  this.deleteDeltas = function(type, delta) {
    if (typeof delta === 'undefined') delta = '';
    console.log('Layer.deleteDeltas');
    var sql = '\
      DELETE FROM ' + this.get('schema_name') + '.' + this.get('table_name') + '_deltas\
    ';
    if (type != 'all') {
      sql += " WHERE type = '" + type + "'";
      if (delta != '') {
        sql += " AND delta = '" + delta + "'";
      }
    }
    console.log('with sql: ' + sql);
    kvm.db.executeSql(
      sql,
      [],
      (function(rs) {
        console.log('Deltas in Tabelle erfolgreich gelöscht.');
        console.log('globalid ' + this.layer.getGlobalId());
        var icon = $('#clearLayerIcon_' + this.layer.getGlobalId());
        console.log('icon vorher: %o', icon);
        if (icon.hasClass('fa-spinner')) icon.toggleClass('fa-ban fa-spinner fa-spin');
        console.log('icon nachher: %o', icon);
        icon = $('#syncImagesIcon_' + this.layer.getGlobalId());
        if (icon.hasClass('fa-spinner')) icon.toggleClass('fa-upload fa-spinner fa-spin');
        
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
        console.log('Fehler beim Löschen der Deltas');
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
    console.log('Layer.requestLayers for stelle: %o', this.stelle);
    var fileTransfer = new FileTransfer(),
        filename = 'layers_stelle_' + this.stelle.get('id') + '.json',
        url = this.getLayerUrl();

    kvm.log('Download Layerdaten von Url: ' + url);
    kvm.log('Speicher die Datei auf dem Gerät in Datei: ' + cordova.file.dataDirectory + filename);
    fileTransfer.download(
      url,
      cordova.file.dataDirectory + filename,
      function (fileEntry) {
        fileEntry.file(
          function (file) {
            var reader = new FileReader();

            reader.onloadend = function() {
              kvm.log('Download der Layerdaten abgeschlossen.');
              var items = [];
              kvm.log('Download Result: ' + this.result);
              resultObj = $.parseJSON(this.result);
              if (resultObj.success) {
                kvm.log('Download erfolgreich');
                console.log('resultObj: %o', resultObj);
                $('#layer_list').html('');
                $.each(
                  resultObj.layers,
                  function(index, layerSetting) {
                    console.log('Layer.requestLayers create layer with settings: %o', layerSetting);
                    layer = new Layer(kvm.activeStelle, layerSetting);
                    layer.saveToStore();
                    layer.createTable();
                    layer.appendToList();
                  }
                );
                kvm.bindLayerEvents();
                console.log('Store after save layer: %o', kvm.store);
              }
              else {
                alert('Abfrage liefert keine Daten vom Server. Entweder sind keine auf dem Server vorhanden oder die URL der Anfrage ist nicht korrekt. Prüfen Sie die Parameter unter Einstellungen.');
              }
            };

            reader.readAsText(file);
          },
          function(error) {
            alert('Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für den Download verwendet werden.');
            kvm.log('Fehler beim lesen der Datei: ' + error.code);
          }
        );
      },
      this.downloadError,
      true
    );
  };

  this.downloadImage = function(data) {
    console.log('Layer.downloadImage with data: %o', data);
    var fileTransfer = new FileTransfer(),
    filename = data.localFile,
    url = this.getImgDownloadUrl(data.remoteFile);
    kvm.log('Download Image von Url: ' + url);
    kvm.log('Speicher die Datei auf dem Gerät in Datei: ' + filename);
    fileTransfer.download(
      url,
      filename,
      (function (fileEntry) {
        console.log('Download des Bildes abgeschlossen: ' + fileEntry.fullPath);
        this.target.src = this.localFile;
        $(this.target).width('100%');
      }).bind(data),
      function (error) {
        console.log("download error source " + error.source);
        console.log("download error target " + error.target);
        console.log("upload error code" + error.code);
      },
      true
    );

/*{
    this.data = data;

    window.requestFileSystem(
      LocalFileSystem.PERSISTENT,
      0,
      (function (fs) {
        console.log('file system open: ' + fs.name);
        console.log('getFile with this: %o', this.data);
        fs.root.getFile(
          this.data.localFile,
          {
            create: true,
            exclusive: false
          },
          (function (fileEntry) {
            var url = this.getImgDownloadUrl(this.data.remoteFile);
            console.log('fileEntry is file? ' + fileEntry.isFile.toString());
            console.log('xhr request on url: ' + url);
            var oReq = new XMLHttpRequest();
            // Make sure you add the domain name to the Content-Security-Policy <meta> element.
            oReq.open("GET", url, true);
            // Define how you want the XHR data to come back
            oReq.responseType = "blob";
            oReq.onload = (function (oEvent) {
              debug_oe = oEvent;
              var blob = oReq.response; // Note: not oReq.responseText
              if (blob) {
                  // Create a URL based on the blob, and set an <img> tag's src to it.
                  //var url = window.URL.createObjectURL(blob);
                  console.log('Setze url auf src: ' + this.data.localFile);
                  this.data.target.src = this.data.localFile;
                  // Or read the data with a FileReader

              }
              else {
                console.error('we didnt get an XHR response!');
              }
            }).bind(this);
            oReq.send(null);
          }).bind(this),
          (function (err) {
            debug_err = err;
            console.error('error getting file! %o', err);
            console.error('url: ' + "http://gdi-service.de/kvwmap_pet_dev/index.php?go=mobile_download_image&image=" + this.data.remoteFile);
          }).bind(this)
        );
      }).bind(this),
      function (err) {
        console.error('error getting persistent fs! ' + err);
      }
    );
}*/
  };

  this.createFeatureForm = function() {
    console.log('Layer.createFeatureForm');
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

  this.createFeatureLayer = function() {
    console.log('Layer.createFeatureLayer');
    this.olLayer = new ol.layer.Vector({
      name: this.get('title'),
      opacity: 1,
      source: new ol.source.Vector({
        attributions: [
          new ol.Attribution({
            html: this.get('kvwmap Server')
          })
        ],
        projection: kvm.map.getView().getProjection(),
        features: []
      }),
      style: this.getStyle,
      zIndex:100
    });
    kvm.map.addLayer(this.olLayer);
  };

  this.getStyle = function(feature, resolution) {
    //console.log('Feature.getStyle for resolution:' + resolution);
    var radius = Math.round((6/Math.sqrt(resolution)) + 4);

      if (radius > 50) radius = 50;
      style = new ol.style.Style({
      image: new ol.style.Circle({
        radius: radius,
        stroke: new ol.style.Stroke({
          color: 'green',
          width: (radius/10 < 2 ? 2 : radius/10)
        }),
        fill: new ol.style.Fill({
          color: 'yellow'
        })
      }),
      text: new ol.style.Text({
        font: (radius * 1.5) + 'px arial-bold',
        text: 'H',
        textBaseline: 'alphabetic',
        offsetY: Math.round(radius/1.7),
        fill: new ol.style.Fill({
          color: 'green'
        })
      })
    });
    return [style];
  };

  this.loadFeatureToForm = function(feature) {
    console.log('Layer.loadFeatureToForm %o', feature);
    this.activeFeature = feature;
    layer = this;

    $.map(
      this.attributes,
      function(attr) {
        var key = attr.get('name'),
            val = feature.get(key);

        attr.formField.setValue(val);
      }
    );
  };

  this.collectChanges = function(action) {
    console.log('Layer.collectChanges');
    var activeFeature = this.activeFeature,
        changes = [];

    // loop over all elements of the form or over all attributes of the layer respectively
    // compare form element content with old values and if changes exists assign 
    changes = $.map(
      this.attributes,
      (function(attr) {
        console.log('Vergleiche Werte von Attribut: ' + attr.get('name'));
        var key = attr.get('name'),
            oldVal = activeFeature.get(key);
            newVal = attr.formField.getValue(this.layer.action);

        if (typeof oldVal == 'string') oldVal = oldVal.trim();
        if (typeof newVal == 'string') newVal = newVal.trim();

        console.log('Vergleiche ' + attr.get('form_element_type') + ' Attribut: ' + key + '(' + oldVal + ' (' + typeof oldVal + ') vs. ' + newVal + '(' + typeof newVal + '))');
        if (oldVal != newVal) {
          kvm.log('Änderung in Attribut ' + key + ' gefunden');
          return {
            'key': key,
            'value': newVal,
            'type' : attr.getSqliteType()
          }
        }
      }).bind({ layer: this})
    );

    return changes;
  };

  /*
  * create deltas for the active dataset related to the actions insert, update or delete
  * create also deltas for image updates for all document attributes
  */
  this.createDeltas = function(action, changes) {
    console.log('Layer.createDeltas ' + action + ' %o', changes);
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
    console.log('created deltas: %o', deltas);
    this.writeDeltas(deltas);
  };

  this.createImgDeltas = function(action, changes) {
    console.log('Layer.createImgDeltas action: ' + action + ' changes: %o', changes);
    $.each(
      changes,
      (function(index, change) {
        img_old = this.activeFeature.getAsArray(change.key);
        img_new = (change.value ? change.value.slice(1, -1).split(',') : []);

        console.log('img_old %o', img_old);
        console.log('img_new %o', img_new);

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
              console.log('Layer.createImgDeltas Abfrage ob insert für Bild in deltas table existiert mit sql: ' + sql);
              kvm.db.executeSql(
                sql,
                [],
                (function(rs) {
                  console.log('Layer.createImgDeltas Abfrage erfolgreich, rs: %o', rs);
                  var numRows = rs.rows.length;

                  console.log('numRows: ' + numRows);
                  if (numRows > 0) {
                    // lösche diesen Eintrag
                    sql = "\
                      DELETE FROM " + this.get('schema_name') + '.' + this.get('table_name') + "_deltas\
                      WHERE\
                        change = 'insert' AND\
                        delta LIKE '%" + img + "%'\
                    ";
                    console.log('Layer.createImgDeltas: insert delta vorhanden, Lösche diesen mit sql: ' + sql);
                    kvm.db.executeSql(
                      sql,
                      [],
                      function(rs) {
                        console.log('Löschen des insert deltas erfolgreich');
                      },
                      function(error) {
                        navigator.notification.alert(
                          'Fehler beim Löschen der Bildänderung!\nFehlercode: ' + error.code + '\nMeldung: ' + error.message
                        );
                      }
                    )
                  }
                  else {
                    console.log('Layer.createImgDeltas: kein insert delta vorhanden. Trage delete delta ein.');
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
    console.log('Layer.execDelta %o', delta);
    kvm.db.executeSql(
      delta,
      [],
      (function(rs) {
        console.log('Layer.execDelta Sql ausgeführt.');
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
    console.log('Layer.writeDeltas %o', deltas);
    debug_deltas = deltas;

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

        console.log('Layer.writeDeltas to table ' + this.get('schema_name') + '.' + this.get('table_name') + '_deltas sql: ' + sql);

        kvm.db.executeSql(
          sql,
          [],
          (function(rs) {
            console.log('Layer.writeDeltas Speicherung erfolgreich.');
            if (delta.type == 'sql') this.execDelta(delta.delta);
          }).bind(this),
          function(error) {
            navigator.notification.alert(
              'Fehler bei der Speicherung der Änderungsdaten in delta-Tabelle!\nFehlercode: ' + error.code + '\nMeldung: ' + error.message,
            );
          }
        );
      }).bind(this)
    );
  };

  this.appendToList = function() {
    console.log('Layer.appendToList');
    kvm.log('Füge Layer ' + this.get('title') + ' zur Layerliste hinzu.');
    $('#layer_list').append(this.getListItem());
  };

  this.getGlobalId = function() {
    return this.stelle.get('id') + '_' + this.get('id');
  };

  this.getListItem = function() {
    var html = '\
      <div id="layer_' + this.getGlobalId()  + '">\
        <input type="radio" name="activeLayerId" value="' + this.getGlobalId() + '"/> ' +
        this.get('title') + '\
        <button id="syncLayerButton_' + this.getGlobalId() + '" value="' + this.getGlobalId() + '" class="sync-layer-button" style="border-radius: 5px; background: #afffaf; float: right; display: none;">\
          <i id="syncLayerIcon_' + this.getGlobalId() + '" class="fa fa-refresh" aria-hidden="true"></i>\
        </button>\
        <button id="syncImagesButton_' + this.getGlobalId() + '" value="' + this.getGlobalId() + '" class="sync-images-button" style="border-radius: 5px; background: #afffaf; float: right; margin-right: 10px; display: none;">\
          <i id="syncImagesIcon_' + this.getGlobalId() + '" class="fa fa-upload" aria-hidden="true"></i>\
        </button>\
        <button id="clearLayerButton_' + this.getGlobalId() + '" value="' + this.getGlobalId() + '" class="clear-layer-button" style="border-radius: 5px; background: #afffaf; float: right; margin-right: 10px; display: none;">\
          <i id="clearLayerIcon_' + this.getGlobalId() + '" class="fa fa-ban" aria-hidden="true"></i>\
        </button>\
      </div>\
      <div style="clear: both"></div>';
    return html;
  };

  this.getLayerUrl = function() {
    console.log('Layer.getLayerUrl');
    var url = this.stelle.get('url'),
        file = this.getUrlFile(url);

    url += file +
      'go=mobile_get_layers' + '&' +
      'username=' + stelle.get('username') + '&' +
      'passwort=' + stelle.get('passwort') + '&' +
      'Stelle_ID=' + stelle.get('Stelle_ID');
    return url;
  };

  /*
  * get missing parts to url when server.de, server.de/ oder server.de/index.php
  */
  this.getUrlFile = function(url) {
    var file = '';

    if (url.slice(-3) == '.de') file = '/index.php?';
    if (url.slice(-1) == '/') file = 'index.php?';
    if (url.slice(-9) == 'index.php') file = '?';
    if (file == '') file = '/index.php?';

    return file;
  };

  this.getSyncUrl = function() {
    console.log('Layer.getSyncUrl');
    var url = this.stelle.get('url'),
        file = this.getUrlFile(url);

    url += file +
      'Stelle_ID=' + stelle.get('Stelle_ID') + '&' +
      'username=' + stelle.get('username') + '&' +
      'passwort=' + stelle.get('passwort') + '&' +
      'selected_layer_id=' + this.get('id');

    if (this.isEmpty()) {
      // get all data as new base for deltas
      url += '&' +
        'go=Daten_Export_Exportieren' + '&' +
        'export_format=GeoJSONPlus' + '&' +
        'all=1' + '&' +
        'epsg=4326';
/*
      url += '&' +
        'go=Layer-Suche_Suchen' + '&' +
        'anzahl=10000' + '&' +
        'orderby' + this.get('id') + '=name' + '&' +
        'mime_type=application/json' + '&' +
        'format=json' + '&' + 'selectors=' +
        $.map(
          this.attributes,
          function(attr) {
            return attr.get('name');
          }
        ).join(',');
*/
      kvm.log('Hole initial alle Daten mit Url: ' +  url);
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
    console.log('Layer.getImgDownloadUrl');
    var url = this.stelle.get('url'),
        file = this.getUrlFile(url);

    url += file +
        'Stelle_ID=' + stelle.get('Stelle_ID') + '&' +
        'username=' + stelle.get('username') + '&' +
        'passwort=' + stelle.get('passwort') + '&' +
        'go=mobile_download_image' + '&' +
        'image=' + image;
    return url;
  };

  this.downloadError = function (error) {
    kvm.log("download error source " + error.source);
    kvm.log("download error target " + error.target);
    kvm.log("download error code: " + error.code);
    kvm.log("download error message: " + error.code);
    alert('Fehler beim herunterladen der Datei von der Url: . Prüfen Sie ob die Netzverbidnung besteht und versuchen Sie es später noch einmal, wenn Sie wieder Netz haben. ' + error.message);
  };

  this.saveToStore = function() {
    console.log('Layer.saveToStore: %o', this.settings);
    var layerIds = $.parseJSON(kvm.store.getItem('layerIds_' + this.stelle.get('id'))),
        settings = JSON.stringify(this.settings);

    if (layerIds == null) { layerIds = []; } 
    console.log('save settings %o', { settings: settings });
    kvm.store.setItem('layerSettings_' + this.getGlobalId(), settings);

    console.log('try to add layerId: ' + this.get('id') + ' to layerIds: ' + JSON.stringify(layerIds));
    if ($.inArray(this.get('id'), layerIds) < 0) {
      console.log('add layerId ' + this.get('id') + ' to layerIds in store');
      layerIds.push(this.get('id'));
      kvm.store.setItem(
        'layerIds_' + this.stelle.get('id'),
        JSON.stringify(layerIds)
      );
    }
  };

  this.setActive = function() {
    console.log('Layer.setActive layer: %o', this);
    kvm.activeLayer = this;
    kvm.store.setItem('activeLayerId', this.get('id'));
    this.createFeatureForm();
    this.createFeatureLayer();
    $('input[name=activeLayerId]').checked = false
    $('input[value=' + this.getGlobalId() + ']')[0].checked = true;
    $('.sync-layer-button').hide();
    $('#syncLayerButton_' + this.getGlobalId()).show();
    $('.sync-images-button').hide();
    $('#syncImagesButton_' + this.getGlobalId()).show();
    $('.clear-layer-button').hide();
    $('#clearLayerButton_' + this.getGlobalId()).show();
  };

  return this;
};
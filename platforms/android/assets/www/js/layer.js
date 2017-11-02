function Layer(stelle, settings = {}) {
  console.log('Erzeuge Layerobjekt mit settings %o', settings);
  var layer_ = this;
  this.stelle = stelle;
  this.settings = (typeof settings == 'string' ? $.parseJSON(settings) : settings);
  this.attributes = [];
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

  /*
  * Load data from local db, create feature objects and show in list view
  */
  this.readData = function() {
    this_ = this;
    console.log('Layer.readData from table %', this_.get('table_name'));
    kvm.log('Lese Daten aus lokaler Datenbank');
    kvm.db.executeSql(
      "\
        SELECT\
          *\
        FROM\
          " + this_.get('table_name') + "\
        ORDER BY \
          name\
      ",
      [],
      function(rs) {
        console.log('Layer.readData result: %o', rs);

        var numRows = rs.rows.length,
            item,
            i;

        kvm.log(numRows + ' Datensaetze gelesen, erzeuge Featurliste neu.');
        this_.features = {};
        for (i = 0; i < numRows; i++) {
          item = rs.rows.item(i);
          this_.features['id_' + item.uuid] = new Feature(item);
        }
        kvm.createFeatureList();
        kvm.drawFeatureMarker();
      },
      function(error) {
        kvm.log('Fehler bei der Abfrage der Daten aus lokaler Datenbank: ' + error.message);
        $('#storeTestDataResult').html('SQL ERROR: ' + error.message);
      }
    );
  };

  this.writeData = function(items) {
    kvm.log('Schreibe die Empfangenen Daten in die lokale Datebbank');
    var tableName = this.get('table_name'),
        keys = $.map(
          items[0].properties,
          function(value, key) {
            return key;
          }
        ).join(', ') + ', ' +
        'point',
        values = '(' +
          $.map(
            items,
            function(item) {
              return $.map(
                item.properties,
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
              ).join(', ') + ', ' +
              "'" + (item.geometry == null ? '' : item.geometry.coordinates.join(' ')) + "'";
            }
          ).join('), (') +
        ')';

    sql = "\
      INSERT INTO " + this.get('table_name') +" (\
        " + keys + ")\
      VALUES\
        " + values + "\
    ";

    kvm.log('Schreibe Daten in lokale Datenbank mit Sql: ' + sql);
    kvm.db.executeSql(
      sql,
      [],
      function(rs) {
        kvm.log('Daten erfolgreich in Datenbank geschrieben');
        // ToDo setze hier die vom Server gelieferte letzte syncVersion und Zeit
        var layer = kvm.activeLayer;
        layer.set('syncVersion', 1);
        layer.set('syncLastLocalTimestamp', Date());
        layer.saveToStore();
        layer.setActive();
        layer.readData();
      },
      function(error) {
        alert('Fehler beim Zugriff auf die Datenbank: ' + error.message);
      }
    );
  };
  
  this.createTables = function() {
    console.log('Layer.createTables');
    var layerIds = $.parseJSON(kvm.store.getItem('layerIds_' + this.stelle.get('id'))),
        layer_ = this,
        i;

    for (i = 0; i < layerIds.length; i++) {
      this.set('id', layerIds[i]);
      this.settings = $.parseJSON(kvm.store.getItem('layerSettings_' + this.getGlobalId()));
      console.log('settings aus store: %o', this.settings);
      this.attributes = $.map(
        this.settings.attributes,
        function(attribute) {
          return new Attribute(layer_, attribute);
        }
      );
      this.createTable();
      this.createDeltaTable();
    };
  };

  this.createTable = function() {
    console.log('Layer.createTable with settings: %o', this.settings);
    kvm.log('Erzeuge Tabelle in lokaler Datenbank.');
    sql = '\
      CREATE TABLE IF NOT EXISTS ' + this.get('table_name') + ' (' +
        $.map(
          this.attributes,
          function(attr) {
            return attr.get('name') + ' ' + attr.getSqliteType();
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
  };

  this.createDeltaTable = function() {
    console.log('Layer.createDelataTable with settings: %o', this.settings);
    kvm.log('Erzeuge Tabelle für deltas in lokaler Datenbank.');
    sql = '\
      CREATE TABLE IF NOT EXISTS ' + this.get('table_name') + '_deltas (\
        version INTEGER PRIMARY KEY,\
        sql text,\
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
              var items = [];
              kvm.log('Download result: ' + this.result)
              collection = $.parseJSON(this.result);
              if (collection.features.length > 0) {
                kvm.log('Mindestens 1 Datensatz empfangen.');
                var layer = kvm.activeLayer;
                layer.writeData(collection.features);
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
      this.downloadError,
      true
    );
  },

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
                debug_res = this.result;
                kvm.log('Download erfolgreich');
                console.log('resultObj: %o', resultObj);
                layer = new Layer(kvm.activeStelle, {});
                layer.storeLayerSettings(resultObj.layers);
                layer.createTables();
                layer.createLayerList();
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

  this.storeLayerSettings = function(settings) {
    console.log('Layer.storeLayerSettings settings %o', settings);
    var layerIds = [],
        layer,
        i;

    for (i = 0; i < settings.length; i++) {
      this.settings = settings[i];
      this.saveToStore();
      layerIds.push(this.get('id'));
    }
    console.log('Layer.storeLayerSettings store layerIds: %o', layerIds);
    kvm.store.setItem('layerIds_' + this.stelle.get('id'), JSON.stringify(layerIds));
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
  },

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
  },

  this.getStyle = function(feature, resolution) {
    console.log('Feature.getStyle for resolution:' + resolution);
    var radius = Math.round((6/Math.sqrt(resolution))+3);
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
  },

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

  this.collectChanges = function() {
    console.log('Layer.collectChanges');
    var activeFeature = this.activeFeature,
        changes = [];

    // loop over all elements of the form or over all attributes of the layer respectively
    // compare form element content with old values and if changes exists assign 
    changes = $.map(
      this.attributes,
      function(attr) {
        console.log('Vergleiche Werte von Attribut: ' + attr.get('name'));
        var key = attr.get('name'),
            oldVal = activeFeature.get(key);
            newVal = attr.formField.getValue();

        if (typeof oldVal == 'string') oldVal = oldVal.trim();
        if (typeof newVal == 'string') newVal = newVal.trim();
        if (oldVal == null) oldVal = '';

        console.log('Vergleiche ' + attr.get('form_element_type') + ' Attribut: ' + key + '(' + oldVal + ' (' + typeof oldVal + ') == ' + newVal + '(' + typeof newVal + '))');
        if (oldVal != newVal) {
          kvm.log('Änderung in Attribut ' + key + ' gefunden');
          return {
            'key': key,
            'value': newVal,
            'type' : attr.getSqliteType()
          }
        }
      }
    );

    return changes;
  },

  this.createDelta = function(action, changes) {
    console.log('Layer.createDeltas ' + action + ' %o', changes);
    var delta = '';

    if (action == 'INSERT') {
      delta = '\
        INSERT INTO ' + this.get('table_name') + '(' +
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
              return (change.type == 'TEXT' ? "'" + change.value + "'" : change.value);
            }
          ).join(', ') + ', \
          \'' + this.activeFeature.get('uuid') + '\'\
        )\
      ';
    };

    if (action == 'UPDATE') {
      delta = '\
        UPDATE ' + this.get('table_name') + '\
        SET ' +
          $.map(
            changes,
            function(change) {
              return change.key + ' = ' + (change.type == 'TEXT' ? "'" + change.value + "'" : change.value);
            }
          ).join(', ') + '\
        WHERE\
          uuid = \'' + this.activeFeature.get('uuid') + '\'\
      ';
    };

    if (action == 'DELETE') {
      delta = '\
        DELETE FROM ' + this.get('table_name') + '\
        WHERE\
          uuid = \'' + this.activeFeature.get('uuid') + '\'\
      ';
    }
    console.log('delta %o', delta);
    return delta;
  },

  /*
  * exec sql in layer table and if success write delta in deltas table
  */
  this.execDelta = function(delta) {
    console.log('Layer.execDelta %o', delta);
    kvm.db.executeSql(
      delta,
      [],
      function(rs) {
        console.log('Layer.execDelta Speicherung erfolgreich.');
        kvm.activeLayer.writeDelta(delta);
      },
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
  },

  this.writeDelta = function(delta) {
    console.log('Layer.writeDelta %o', delta);
    console.log('write in table: ' + this.get('table_name') + '_deltas');
    var sql = "\
          INSERT INTO " + this.get('table_name') + "_deltas (\
            sql,\
            created_at\
          )\
          VALUES (\
            '" + delta.replace(/\'/g, '\'\'') + "',\
            '" + (new Date()).toISOString().replace('Z', '') + "'\
          )\
        ";

    console.log('Layer.writeDelta with sql: ' + sql);
    kvm.db.executeSql(
      sql,
      [],
      function(rs) {
        console.log('Layer.writeDelta Speicherung erfolgreich.');

        kvm.activeLayer.readData();
        kvm.showItem('featurelist');

      },
      function(error) {
        navigator.notification.alert(
          'Fehler bei der Speicherung der Änderungsdaten in delta-Tabelle!\nFehlercode: ' + error.code + '\nMeldung: ' + error.message,
        );
      }
    );
  },

  this.createLayerList = function() {
    console.log('Layer.createLayerList');
    var layerIds = $.parseJSON(kvm.store.getItem('layerIds_' + this.stelle.get('id'))),
        i;

    $('#layer_list').html('');
    for (i = 0; i < layerIds.length; i++) {
      this.set('id', layerIds[i]);
      this.settings = $.parseJSON(kvm.store.getItem('layerSettings_' + this.getGlobalId()));
      this.appendToList();
    };

    kvm.bindLayerEvents();
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
          <i class="fa fa-refresh" aria-hidden="true"></i>\
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

    if (this.get('syncVersion')) {
      // sync deltas
      url += '&' +
        'go=Syncronize' + '&' +
        'pullVersionFrom=1';
      kvm.log('Hole Deltas mit Url: ' + url);
    }
    else {
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
    settings = JSON.stringify(this.settings);
    console.log('save settings %o', settings);
    kvm.store.setItem('layerSettings_' + this.getGlobalId(), settings);
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
  };

  return this;
};
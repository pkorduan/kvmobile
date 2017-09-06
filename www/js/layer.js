function Layer(stelle, settings = {}) {
  this.stelle = stelle;
  this.settings = (typeof settings == 'string' ? $.parseJSON(settings) : settings);

  this.get = function(key) {
    return this.settings[key];
  };

  this.set = function(key, value) {
    this.settings[key] = value;
    return this.settings[key];
  };

  /*
  * Load data from local db and show in list view
  */
  this.readData = function() {
    console.log('Layer.readData');
    kvm.log('Lese Daten aus lokaler Datenbank');
    kvm.db.executeSql(
      "\
        SELECT\
          *\
        FROM\
          haltestellen\
      ",
      [],
      function(rs) {
        kvm.log('Daten erfolgreich gelesen.');
        var html = '',
            numRows = rs.rows.length,
            item;

        console.log('Layer.readData result: %o', rs);
        kvm.log(numRows + ' Datensaetze gelesen.');
        kvm.log('Erzeuge die Liste der Datensätze.');
        for (var i = 0; i < numRows; i++) {
          item = rs.rows.item(i);
          html += '<tr><td id="haltestelle_' + item.id + '"><a class="haltestelle">' + item.name + '</a></td></tr>';
        }
        $('#haltestellenBody').html(html);
        kvm.bindHaltestellenClickEvents();

        $('#numDatasetsText').html(rs.rows.length);
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
        i;

    for (i = 0; i < layerIds.length; i++) {
      this.set('id', layerIds[i]);
      this.layerSettings = $.parseJSON(kvm.store.getItem('layerSettings_' + this.getGlobalId()));
      this.createTable();
    };
  };

  this.createTable = function() {
    console.log('Layer.createTable');
    kvm.log('Erzeuge Tabelle in lokaler Datenbank.');
    sql = '\
      CREATE TABLE IF NOT EXISTS ' + this.get('table_name') + ' (' +
        $.map(
          this.get('attributes'),
          function(attr) {
            return attr.name + ' ' + mapDataType(attr.type);
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
              items = $.parseJSON(this.result);
              if (items.length > 0) {
                kvm.log('Mindestens 1 Datensatz empfangen.');
                var layer = kvm.activeLayer;
                layer.writeData(items);
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
                kvm.log('Download erfolgreich');
                layer = new Layer(kvm.activeStelle, {});
                layer.storeLayerSettings(resultObj.layers);
                layer.createTables();
                layer.viewLayerList();
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

  this.viewLayerList = function() {
    console.log('Layer.viewLayerList');
    var layerIds = $.parseJSON(kvm.store.getItem('layerIds_' + this.stelle.get('id'))),
        i;

    $('#layer_list').html('');
    for (i = 0; i < layerIds.length; i++) {
      this.set('id', layerIds[i]);
      this.layerSettings = $.parseJSON(kvm.store.getItem('layerSettings_' + this.getGlobalId()));
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
        'go=Layer-Suche_Suchen' + '&' +
        'anzahl=10000' + '&' +
        'orderby' + this.get('id') + '=name' + '&' +
        'mime_type=application/json' + '&' +
        'format=json' + '&' + 'selectors=' +
        $.map(
          this.get('attributes'),
          function(attr) {
            return attr.name;
          }
        ).join(',');
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
    console.log('Layer.saveToStore settings %o', this.settings);
    kvm.store.setItem('layerSettings_' + this.getGlobalId(), JSON.stringify(this.settings));
  };

  this.setActive = function() {
    console.log('Layer.setActive layer: %o', this);
    kvm.activeLayer = this;
    kvm.store.setItem('activeLayerId', this.get('id'));
    $('input[name=activeLayerId]').checked = false
    $('input[value=' + this.getGlobalId() + ']')[0].checked = true;
    $('.sync-layer-button').hide();
    $('#syncLayerButton_' + this.getGlobalId()).show();
  };

  return this;
};

function mapDataType(pgType) {
  var slType = '';
  switch (true) {
    case ($.inArray(pgType, [
        'character varying',
        'text',
        'character'
      ]) > -1) :
      slType = 'TEXT';
      break;
    case ($.inArray(pgType, [
        'int4',
        'int2',
        'int8',
        'int16',
        'bigint',
        'integer'
      ]) > -1) :
      slType = 'INTEGER';
      break;
    case ($.inArray(pgType, [
        'double precision'
      ]) > -1) :
      slType = 'REAL';
      default : slType = 'TEXT';
  }
  return slType;
}
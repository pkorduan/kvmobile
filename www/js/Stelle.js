function Stelle(settings = {}) {
  this.settings = (typeof settings == 'string' ? $.parseJSON(settings) : settings);

  this.get = function(key) {
    return this.settings[key];
  };

  this.set = function(key, value) {
    this.settings[key] = value;
    return this.settings[key];
  };

  this.viewDefaultSettings = function() {
    $('#kvwmapServerIdField').val(config.kvwmapServerId);
    $('#kvwmapServerNameField').val(config.kvwmapServerName);
    $('#kvwmapServerUrlField').val(config.kvwmapServerUrl);
    $('#kvwmapServerLoginNameField').val(config.kvwmapServerLoginName);
    $('#kvwmapServerPasswortField').val(config.kvwmapServerPasswort);
  };

  this.viewSettings = function() {
    kvm.log('ServerSettings.viewSettings', 4);
    $('#kvwmapServerIdField').val(this.get('id'));
    $('#kvwmapServerNameField').val(this.get('name'));
    $('#kvwmapServerUrlField').val(this.get('url'));
    $('#kvwmapServerLoginNameField').val(this.get('login_name'));
    $('#kvwmapServerPasswortField').val(this.get('passwort'));

    $('#kvwmapServerStelleSelectField').find('option').remove();
    $.each(
      JSON.parse(this.get('stellen')),
      function(index, stelle) {
        $('#kvwmapServerStelleSelectField').append('<option value="' + stelle.ID + '">' + stelle.Bezeichnung + '</option>');
      }
    );
    $('#kvwmapServerStelleSelectField').val(this.get('Stelle_ID'));
    $('#kvwmapServerStellenField').val(this.get('stellen'));
  };

  this.saveToStore = function() {
    kvm.log('Speicher Stelleneinstellungen in lokalen Speicher: ' + JSON.stringify(this.settings));
    kvm.store.setItem('stelleSettings_' + this.get('id'), JSON.stringify(this.settings));
  };

  this.setActive = function() {
    kvm.log('Stelle.js setActive', 4);
    kvm.activeStelle = this;
    kvm.store.setItem('activeStelleId', this.get('id'));
  };

  /*
  * Request all stellen from active serversetting
  */
  this.requestStellen = function() {
    kvm.log('Stelle.requestStellen');
    var fileTransfer = new FileTransfer(),
        filename = cordova.file.dataDirectory + 'stellen.json',
        url = this.getStellenUrl();

    kvm.log('Download Stellen von Url: ' + url);
    kvm.log('Speicher die Datei auf dem Gerät in Datei: ' + filename);

    fileTransfer.download(
      url,
      filename,
      function (fileEntry) {
        fileEntry.file(
          function (file) {
            var reader = new FileReader();

            reader.onloadend = function() {
              kvm.log('Download Result: ' + this.result, 4);
              var errMsg = '';

              if (this.result.indexOf('form name="login"') == -1) {
                if (kvm.isValidJsonString(this.result)) {
                  resultObj = $.parseJSON(this.result);
                  if (resultObj.success) {
                    validResult = true;
                    kvm.log('Download der Stellendaten erfolgreich.', 3);
                    console.log('Download erfolgreich. Antwortobjekt: %o', resultObj);

                    $('#kvwmapServerStelleSelectField').find('option').remove();
                    kvm.store.setItem('userId', resultObj.user_id);
                    kvm.store.setItem('userName', resultObj.user_name);
                    $.each(
                      resultObj.stellen,
                      function(index, stelle) {
                        $('#kvwmapServerStelleSelectField').append('<option value="' + stelle.ID + '">' + stelle.Bezeichnung + '</option>');
                      }
                    );
                    $('#kvwmapServerStellenField').val(JSON.stringify(resultObj.stellen));
                    $('#requestStellenButton').hide();
                    if (resultObj.stellen.length == 1) {
                      $('#kvwmapServerStelleSelectField').val(resultObj.stellen[0].ID);
                      $('#saveServerSettingsButton').show();
                    }
                    else {
                      $('#saveServerSettingsButton').hide();
                    }
                    $('#kvwmapServerStelleSelectField').show();
                  }
                  else {
                    errMsg = 'Fehler beim Abfragen der Stellendaten. ' + resultObj.err_msg;
                  }
                }
                else {
                  errMsg = 'Fehler beim Abfragen der Stellendaten. Abfrage liefert keine korrekten Daten vom Server. Entweder sind keine auf dem Server vorhanden oder die URL der Anfrage ist nicht korrekt. Prüfen Sie die Parameter unter Einstellungen.';
                }
              }
              else {
                errMsg = 'Zugang zum Server verweigert! Prüfen Sie Ihre Zugangsdaten unter Einstellungen.';
              }
              if (errMsg != '') {
                kvm.msg(errMsg);
                kvm.log(errMsg, 1);
              }
              $('#sperr_div').hide();
            };

            reader.readAsText(file);
          },
          function(error) {
            kvm.msg('Fehler beim Einlesen der heruntergeladenen Datei. Prüfen Sie die URL und Parameter, die für den Download verwendet werden.');
            kvm.log('Fehler beim lesen der Datei: ' + error.code);
            $('#sperr_div').hide();
          }
        );
      },
      function(err) {
        var errMsg = 'Fehler beim Download der Stellendaten code: ' + err.code + ' status: ' + err.http_status + ' Prüfen Sie ob der Nutzer vom dem Gerät aus mit seiner IP auf die Stelle zugreifen darf und die Domain in config.xml eingetragen ist.';
        kvm.msg(errMsg);
        $('#sperr_div').hide();
      },
      true
    );
  };

  this.getStellenUrl = function() {
    kvm.log('Stellen.getStellenUrl', 4);
    var url = this.get('url'),
        file = this.getUrlFile(url);

    url += file +
      'go=mobile_get_stellen' + '&' +
      'login_name=' + this.get('login_name') + '&' +
      'passwort=' + escape(this.get('passwort'));
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

  /*
  * For current activeLayer do:
  *   Delete all local data and deltas
  *   Delete table and delta table
  *   load layer definition with attributes new from server therewith
  *   save settings in store and set layer active
  *   create table and delta table new
  *   load data from server and store in local database
  *   load the data from local database and create features, map markers, form and featurelist
  */
  // ToDo: Diese Funktion ggf. Klasse Layer zuordnen wenn es möglich ist die Layersettings eines einzelnen Layers herunterzuladen. Dort dann keine layerId mehr übergeben sondern updateLayerSettings on LayerObjekt
  // also ToDo mobile_get_layers erweitern mit der Option das für eine bestimmte LayerID zu filtern.
  this.reloadLayer = function(layerId) {
    console.log('Layer.reloadLayer for stelle: %o', this);
    var fileTransfer = new FileTransfer(),
        filename = cordova.file.dataDirectory + 'layers_stelle_' + this.get('id') + '.json',
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
              kvm.log('Reload der Layerdaten abgeschlossen.', 3);
              var items = [],
                  validationResult = '';

              kvm.log('Download Result: ' + this.result, 4);
              resultObj = kvm.parseLayerResult(this.result);

              if (resultObj.success) {
                kvm.log('layerResult is valid!', 4);
                var layers = [];
                kvm.log('Download erfolgreich.', 3);
                //console.log('resultObj: %o', resultObj);

                kvm.activeStelle.numLayers = resultObj.layers.length;

                var layerSettings = resultObj.layers.filter(function(layer) { return layer.id == layerId; })[0],
                    layer;

                kvm.activeLayer.removeFromApp();
                console.log('Erzeuge neuen Layer');
                layer = new Layer(kvm.activeStelle, layerSettings);
                layer.saveToStore();
                layer.updateTable(); // function includes appendToApp() and setActive()
              }
              else {
                kvm.log('Fehlerausgabe von parseLayerResult!', 4);
                kvm.msg(resultObj.errMsg, 2);
              }
              $('#sperr_div').hide();
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

  /*
  * Request all layers from stelle,
  * write to store,
  * create tables in database and
  * append layer to list
  */
  this.requestLayers = function() {
    //console.log('Layer.requestLayers for stelle: %o', this);
    var fileTransfer = new FileTransfer(),
        filename = cordova.file.dataDirectory + 'layers_stelle_' + this.get('id') + '.json',
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
              var items = [],
                  validationResult = '';
              kvm.log('Download Result: ' + this.result, 4);
              resultObj = kvm.parseLayerResult(this.result);

              if (resultObj.success) {
                var layers = [];
                kvm.alog('Download der Layer der Stelle erfolgreich.', '', 3);
                //console.log('resultObj: %o', resultObj);

                // remove existing layers
                console.log('Entferne existierende Layer aus der Anwendung.');
                $('#layer_list').html('');
                if ('layerIds_' + kvm.activeStelle.get('id') in kvm.store) {
                  JSON.parse(kvm.store['layerIds_' + kvm.activeStelle.get('id')]).map(
                    function(id) {
                      if (kvm.layers[id]) {
                        kvm.layers[id].removeFromApp();
                      }
                    }
                  );
                }
                kvm.store.removeItem('activeLayerId');
                $('#featurelistHeading').html('Noch keine Layer synchronisiert');
                $('#featurelistBody').html('Wählen Sie unter Einstellungen in der Gruppe "Layer" einen Layer aus. Öffnen Sie dann das Optionen Menü und wählen die Funktion "Daten synchronisieren"!');
                $('#showSearch').hide();

                kvm.activeStelle.numLayers = resultObj.layers.length;
                // add requested layers
                console.log('Füge neu runtergeladene Layer zur Anwendung hinzu.');
                $.each(
                  resultObj.layers,
                  function(index, layerSetting) {
                    var layer;
                    //console.log('Layer.requestLayers create layer with settings: %o', layerSetting);
                    layer = new Layer(kvm.activeStelle, layerSetting);
                    layer.createTable(this);
                    layer.appendToApp();
                  }
                );

                kvm.setConnectionStatus();
                //console.log('Store after save layer: %o', kvm.store);
                $('#requestLayersButton').hide();
                $('#sperr_div').hide();
              }
              else {
                kvm.log('Fehlerausgabe von parseLayerResult!', 4);
                kvm.msg(resultObj.errMsg, 'Downloadfehler');
              }
              $('#sperr_div').hide();
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


  this.removeLayers = function() {
    Object.keys(kvm.layers).map(function (layerId) {
      kvm.layers[layerId].removeFromApp();
    });

  };

  this.getLayerUrl = function(options = { hidePassword: false}) {
    kvm.log('Stelle.getLayerUrl', 4);
    var url = this.get('url'),
        file = this.getUrlFile(url);

    url += file +
      'go=mobile_get_layers' + '&' +
      'login_name=' + this.get('login_name') + '&' +
      'passwort=' + (options.hidePassword ? '*****' : this.get('passwort')) + '&' +
      'Stelle_ID=' + this.get('Stelle_ID');
    return url;
  };

  this.allLayerLoaded = function() {
    var layerIds = $.parseJSON(kvm.store.getItem('layerIds_' + this.get('id'))),
        loaded = true;

    $.each(
      this.layerIds,
      function (key, layerId) {
        var layerSettings = kvm.store.getItem('layerSettings_' + layerId);
        if (layerSettings.loaded == false) {
          loaded = false;
        }
      }
    );
    return loaded;
  };
}
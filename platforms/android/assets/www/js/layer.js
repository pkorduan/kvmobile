Layer = {

  /*
  * Load data from local db only (sync=false) or
  * sync data with server before (sync=true) and
  * load than data from local db
  */
  loadData: function(id, sync) {
    console.log('Layer(' + id + ').load with sync: ' + sync);
    this.id = id;

    if (this.layerExists()) {
      kvm.log('Layer existiert.');
      if (this.tableExists()) {
        if (sync) {
          if (navigator.onLine) {
            if (this.lastVersionExists) {
              this.requestDeltas();
            }
            else {
              this.requestData();
            }
          }
        }
        else {
          this.readData();
        }
      }
      else {
        kvm.log('Tablle existiert noch nicht. Lege Tabelle an.');
        this.createTable(sync);
      }
    }
    else {
      kvm.log('Layer existiert noch nicht.');
      this.load();
    }
  },

  layerExists: function() {
    console.log('Layer(' + this.id + ').layerExists');
    return kvm.store.getItem('layer' + this.id + 'Exists');
  },

  tableExists: function() {
    console.log('Layer.tableExists');
    return false;
  },

  createTable: function(sync) {
    console.log('Layer.createTable with getFunction: %o', getFunction);
    // create Table with Layer.loadData(sync) as success callback
  },

  lastVersionExists: function() {
    console.log('Layer.lastVersionExists');
    return false;
  },

  requestDeltas: function() {
    console.log('Layer.requestDeltas');
  },

  requestData: function() {
    console.log('Layer.requestData');
  },

  load: function() {
    console.log('Layer(' + this.id + ').load');
    this.serverSettings = ServerSettings.load();
    if (this.serverSettings.settingsExists()) {
      this.layerSettings = LayerSettings.load(this.id);
      if (this.layerSettings.settingsExists()) {
        if (navigator.onLine) {
          console.log('Layer(' + this.id + ').load online');
          this.request();
        }
        else {
          console.log('Layer(' + this.id + ').load offline');
          kvm.msg('Kann Layerdaten nicht vom Server laden, weil keine Netzverbindung besteht. Versuchen Sie es noch einmal wenn Sie Netz haben.');
        }
      }
    }
  },

  request: function() {
    console.log('Layer(' + this.id + ').request');  
    var fileTransfer = new FileTransfer(),
        filename = 'download_layer_' + this.id + '.json',
        url = this.getLayerUrl();

    kvm.log('Download Layerdaten von Url: ' + url);
    kvm.log('Speicher die Datei auf dem Gerät in Datei: ' + cordova.file.dataDirectory + filename);
    fileTransfer.download(
      url,
      cordova.file.dataDirectory + filename,
      function (fileEntry) {
        kvm.log("download complete: " + fileEntry.toURL());
        fileEntry.file(
          function (file) {
            var reader = new FileReader();

            reader.onloadend = function() {
              kvm.log('Download Layerdaten abgeschlossen.');
              console.log('Download layerData onloadend this: %o', this);
              var items = [];
              kvm.log('Download Result: ' + this.result);
              resultObj = $.parseJSON(this.result);
              if (resultObj.success) {
                kvm.log('Download erfolgreich');
                var layer = resultObj.layers[0];
                console.log('Layerobject from download: %o', layer);
                Layer.saveAttributes(layer);
                var layerSettingsId = kvm.store.getItem('layer' + layer.id + 'SettingsId');
                kvm.store.setItem('layer' + layerSettingsId + 'Exists', true);
                kvm.log('Daten von Layer ' + layer.id + ' auf dem Gerät gespeichert.');
                console.log('Store after save layer: %o', kvm.store);
                
                //Layer.loadData(layerSettingsId, false);
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
  },

  getLayerUrl: function() {
    kvm.log('Layer(' + this.id + ').getLayerUrl');
    var url = kvm.store.getItem('kvwmapServerUrl'),
        file = this.getUrlFile(url);

    url += file +
      'go=mobile_get_layer' + '&' +
      'username=' + kvm.store.getItem('kvwmapServerUsername') + '&' +
      'passwort=' + kvm.store.getItem('kvwmapServerPasswort') + '&' +
      'Stelle_ID=' + kvm.store.getItem('layerSettingsStelleId_' + this.id) + '&' +
      'selected_layer_id=' + kvm.store.getItem('layerSettingsLayerId_' + this.id);
    return url;
  },

  /*
  * get missing parts to url when server.de, server.de/ oder server.de/index.php
  */
  getUrlFile: function(url) {
    kvm.log('url vor file: ' + url);
    var file = '';

    if (url.slice(-3) == '.de') file = '/index.php?';
    if (url.slice(-1) == '/') file = 'index.php?';
    if (url.slice(-9) == 'index.php') file = '?';
    if (file == '') file = '/index.php?';

    return file;
  },

  getSyncUrl: function() {
    kvm.log('function getSyncUrl');
    var url = kvm.store.getItem('kvwmapServerUrl'),
        file = this.getUrlFile(url);

    url += file +
      'Stelle_ID=' + kvm.store.getItem('kvwmapServerStelleId') + '&' +
      'username=' + kvm.store.getItem('kvwmapServerUsername') + '&' +
      'passwort=' + kvm.store.getItem('kvwmapServerPasswort') + '&' +
      'selected_layer_id=' + kvm.store.getItem('kvwmapServerLayerId');

    if (kvm.store.getItem('syncVersion')) {
      // sync deltas
      url += '&' +
        'go=Syncronize';
      
    }
    else {
      // get all data as new base for deltas
      url += '&' +
        'go=Layer-Suche_Suchen' + '&' +
        'anzahl=10000' + '&' +
        'orderby' + kvm.store.getItem('kvwmapServerLayerId') + '=name' + '&' +
        'mime_type=application/json' + '&' +
        'format=json' + '&' + 'selectors=id,name,nr,lat,lon,haltestellenmast_mit_fahrplanaushang,taktiles_aufmerksamkeitsfeld,taktiles_leitsystem_parallel_zur_haltestellenkante,befestigte_warteflaeche,barrierefreie_bordhoehe,wegweisung_zur_haltestelle_taktiles_leitsystem_zur_haltestelle,wegweisung_zur_haltestelle_querungshilfen,wegweisung_zur_haltestelle_befestigte_wege_zur_haltestelle,wegweisung_zur_haltestelle_lichtsignalanlage,wegweisung_zur_haltestelle_fussgaengerueberweg,aufstellflaeche_hoehe,aufstellflaeche_breite,aufstellflaeche_laenge,fahrgastunterstand,dfi,visuell_kontrastreiche_gestaltung_der_bedienelemente,beleuchtung,uhr,auflademoeglichkeiten_fuer_ebikes,papierkorb,fahrradabstellmoeglichkeiten,ein_aussteiger,einwohnerzahl,created_at,updated_at_server,bilder,bilder_updated_at,user,status,point,updated_at_client,version';
    }
    kvm.log('Url: ' +  url);
    return url;
  },

  saveAttributes: function(l) {
    var st = kvm.store,
        i = 0,
        a;
    st.setItem('layer' + l.id + 'NumAttributes', l.attributes.length);
    for (i = 0; i < l.attributes.length; i++) {
      a = l.attributes[i];
      st.setItem('l' + l.id + 'a' + a.index + 'Name', a.name);
      st.setItem('l' + l.id + 'a' + a.index + 'RealName', a.real_name);
      st.setItem('l' + l.id + 'a' + a.index + 'Alias', a.alias);
      st.setItem('l' + l.id + 'a' + a.index + 'Tooltip', a.tooltip);
      st.setItem('l' + l.id + 'a' + a.index + 'DataType', a.type);
      st.setItem('l' + l.id + 'a' + a.index + 'Nullable', a.nullable);
      st.setItem('l' + l.id + 'a' + a.index + 'FormType', a.form_element_type);
      st.setItem('l' + l.id + 'a' + a.index + 'Options', a.options);
      st.setItem('l' + l.id + 'a' + a.index + 'Privilege', a.privilege);
    }
  },

  downloadError: function (error) {
    kvm.log("download error source " + error.source);
    kvm.log("download error target " + error.target);
    kvm.log("download error code: " + error.code);
    kvm.log("download error message: " + error.code);
    alert('Fehler beim herunterladen der Datei von der Url: . Prüfen Sie ob die Netzverbidnung besteht und versuchen Sie es später noch einmal, wenn Sie wieder Netz haben. ' + error.message);
  }

}
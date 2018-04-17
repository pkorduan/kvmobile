kvm.views.mapper = {};

/*
* Es gibt 3 Zustände des GPS Trackings
* kvm-gps-off GPS-Position wird nicht angezeigt
*   showGpsPositionButton Style Hintergrund weiß Icon grau
*   Click auf showGpsPositionButton wechselt in Mode 2
* kvm-gps-on GPS-Position wird angezeigt
    showGpsPositionButton Style Hintergrund weiß Icon Blau
*   Click auf showGpsPositionButton wechselt in Mode 2
* kvm-gps-track GPS-Position wird angezeigt und die Karte nachgeführt
*   showGpsPositionButton Style Hinergrund blau Icon weiß
*   Click auf showGpsPositionButton wechselt in Mode 0
*   On mapMove oder mapZoom wechselt nach Mode 1
*/

kvm.controller.mapper = {
  watchGpsPosition: function() {
    kvm.log('mapper controller: watchGpsPosition');

    this.watchId = navigator.geolocation.watchPosition(
      function(geoLocation) {
        var pos = geoLocation.coords,
            utm = ol.proj.transform(
              [pos.longitude, pos.latitude],
              "EPSG:4326",
              kvm.map.getView().getProjection()
            ),
            layer = kvm.map.getLayers().item(1), //gps-position layer
            source = layer.getSource(),
            features = layer.getSource().getFeatures(),
            view = kvm.map.getView(),
            radius = pos.accuracy;

        //console.log('controller.mapper new pos: ' + pos.latitude + ' ' + pos.longitude + ' ' + pos.accuracy);

        if (features.length == 0) {
          //console.log('create new feature');
          feature = new ol.Feature({
            geometry: new ol.geom.Point(utm),
          });
          source.addFeature(feature);
        }
        else {
          //console.log('set new position to feature');
          feature = features[0];
          feature.getGeometry().setCoordinates(utm);
        }
        layer.getStyle().getImage().setRadius((radius > 50 ? 50 : radius));

        console.log(radius);

        switch (true) {
          case radius > 50 : this.signalLevel = 1; break;
          case radius > 25 : this.signalLevel = 2; break;
          case radius > 15 : this.signalLevel = 3; break;
          case radius > 11 : this.signalLevel = 4; break;
          default : signalLevel = 5;
        }

        $('#gps-signal-icon').attr('class', 'gps-signal-level-' + signalLevel);

        if ($('#gpsControlButton').hasClass('kvm-gps-track')) {
          //console.log('recenter map');
          view.setCenter(utm);
        }
      },
      function(error) {
        kvm.controller.mapper.clearWatch();
        navigator.notification.confirm(
          'Fehler bei der Positionsabfrage code: ' + error.code + ' message: ' + error.message + ' ' +
          'Es kann keine GPS-Position bestimmt werden. Schalten Sie die GPS Funktion auf Ihrem Gerät ein, suchen Sie einen Ort unter freiem Himmel auf und versuchen Sie es dann noch einmal.',
          function(buttonIndex) {
            if (buttonIndex == 1) {
              kvm.log('Einschalten der GPS-Funktion.', 3);
            }
          },
          'GPS-Position',
          ['ok', 'abbrechen']
        );
        $('#gpsControlButton').toggleClass('kvm-gps-off kvm-gps-track');
      },
      {
        maximumAge: 2000, // duration to cache current position
        timeout: 5000, // timeout for try to call successFunction, else call errorFunction 
        enableHighAccuracy: true // take position from gps not network-based method
      }
    );
  },

  getSignalLevel: function() {
    return (typeof this.signalLevel === "undefined" ? 0 : this.signalLevel);
  },

  clearWatch: function() {
    kvm.map.getLayers().item(1).getSource().clear();
    navigator.geolocation.clearWatch(this.watchId);
  },

  createLayerList: function(stelle) {
    kvm.log('Erzeuge Layerliste.', 3);
    var layerIds = $.parseJSON(kvm.store.getItem('layerIds_' + stelle.get('id'))),
        i,
        layer;

    $('#layer_list').html('');
    for (i = 0; i < layerIds.length; i++) {
      layer = new Layer(
        stelle,
        $.parseJSON(kvm.store.getItem('layerSettings_' + stelle.get('id') + '_' + layerIds[i]))
      );
      layer.appendToList();
    };

    kvm.bindLayerEvents();
  },

  goToGpsPosition: function() {
    //console.log('controller mapper: goToGpsPosition');
    navigator.geolocation.getCurrentPosition(
      function(geoLocation) {
        console.log('controller mapper goToGpsPosition');
        var view = kvm.map.getView();

        view.setCenter(
          ol.proj.transform(
            [geoLocation.coords.longitude, geoLocation.coords.latitude],
            "EPSG:4326",
            view.getProjection()
          )
        );
        view.setZoom(17);
      },
      kvm.controller.mapper.gpsError,
      {
        maximumAge: 2000, // duration to cache current position
        timeout: 5000, // timeout for try to call successFunction, else call errorFunction 
        enableHighAccuracy: true // take position from gps not network-based method
      }
    );
  },

  gpsError: function(error) {
    $('#gps-signal-icon').attr('class', 'gps-signal-level-0');
    navigator.notification.confirm(
      'Es kann keine GPS-Position bestimmt werden. Schalten Sie die GPS Funktion auf Ihrem Gerät ein, suchen Sie einen Ort unter freiem Himmel auf und versuchen Sie es dann noch einmal. Fehler: ' + error.message,
      function(buttonIndex) {
        if (buttonIndex == 1) {
          console.log('Einschalten der GPS-Funktion');
        }
      },
      'GPS-Position',
      ['ok', 'abbrechen']
    );
  }
}
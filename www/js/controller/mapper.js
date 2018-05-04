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
  watchGpsAccuracy: function() {
    kvm.log('mapper controller: watchGpsAccuracy');
    this.watchId = navigator.geolocation.watchPosition(
      (function(geoLocation) {
        kvm.log('Set new geo location accuracy', 4);
        this.accuracy = geoLocation.coords.accuracy;

        switch (true) {
          case this.accuracy > 50 : this.signalLevel = 1; break;
          case this.accuracy > 25 : this.signalLevel = 2; break;
          case this.accuracy > 15 : this.signalLevel = 3; break;
          case this.accuracy > 11 : this.signalLevel = 4; break;
          default : this.signalLevel = 5;
        }

        $('#gps-signal-icon').attr('class', 'gps-signal-level-' + this.signalLevel);
      }).bind(this)
    );
  },

  getSignalLevel: function() {
    return (typeof this.signalLevel === "undefined" ? 0 : this.signalLevel);
  },

  getGPSAccuracy: function() {
    return (typeof this.accuracy === "undefined" ? 0 : this.accuracy);
  },

  clearWatch: function() {
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

  gpsError: function(error) {
    $('#gps-signal-icon').attr('class', 'gps-signal-level-0');
    navigator.notification.confirm(
      'Es kann keine GPS-Position bestimmt werden. Schalten Sie die GPS Funktion auf Ihrem Gerät ein, suchen Sie einen Ort unter freiem Himmel auf und versuchen Sie es dann noch einmal. Fehler: ' + error.message,
      function(buttonIndex) {
        if (buttonIndex == 1) {
          kvm.log('Einschalten der GPS-Funktion', 3);
        }
      },
      'GPS-Position',
      ['ok', 'abbrechen']
    );
  }
}

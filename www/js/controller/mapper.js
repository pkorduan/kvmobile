kvm.views.mapper = {};
/*
auch ne Variante wie man die Features in die Karte bekommt:
$.getJSON("script_dass_geojson_liefert.php?id=xy", function(data) {
  L.geoJson(data, {
      pointToLayer: function (feature, latlng) {
          return L.circleMarker(latlng, geojsonMarkerOptions);

      },
       onEachFeature: function (feature, layer) {
           popupOptions = {maxWidth: 200};
          layer.bindPopup(feature.properties.popupContent);
      },
      coordsToLatLng: function (coords) {
      return new L.heatLayer(coords);
      }

  }).addTo(map);
});
*/

/*
* Es gibt 3 Zustände des GPS Trackings, die aber in dieser Anwendung so nicht umgesetzt sind.
* Statt dessen wird das L.control.locate Control in app.js verwendet.
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
  // ToDo Keys der anderen Typen als Point müssen den Geometrietypen entsprechen, die in geometry_type des Layers übergeben werden.
  coordsLevelsDeep: {
    POINT: 0, // kvm.wkx.Geometry.parse('SRID=4326;POINT(10 20)')
    MULTIPOINT: 2, // kvm.wkx.Geometry.parse('SRID=4326;MULTIPOINT((10 20), (14 20), (12 21))')
    LINESTRING: 2, // L.GeoJSON.coordsToLatLngs(kvm.wkx.Geometry.parse('SRID=4326;LINESTRING(10 20, 14 20, 14 24, 10 24)').toGeoJSON().coordinates, 2)
    MULTILINESTRING: 1, // L.GeoJSON.coordsToLatLngs(kvm.wkx.Geometry.parse('SRID=4326;MULTILINESTRING((10 20, 14 20), (12 21, 13 21), (30 40, 35 45, 56 67))').toGeoJSON().coordinates, 1)
    POLYGON: 1, // L.GeoJSON.coordsToLatLngs(kvm.wkx.Geometry.parse('SRID=4326;POLYGON((10 20, 14 20, 14 24, 10 24, 10 20))').toGeoJSON().coordinates, 2)
    MULTIPOLYGON: 2 // L.GeoJSON.coordsToLatLngs(kvm.wkx.Geometry.parse('SRID=4326;MULTIPOLYGON(((10 20, 14 20, 14 24, 10 24, 10 20), (12 21, 13 21, 13 22, 12 22, 12 21)), ((30 40, 35 45, 56 67)))').toGeoJSON().coordinates, 2)
  },

  createEditable: function(feature) {
    console.log('Erzeuge Editierbare Geometrie für Feature: %o', feature);
    var editableLayer;

    // Erzeugt eine editierbare Geometrie der Featuregeometrie
    if (feature.options.geometry_type == 'Point') {
      editableLayer = L.marker(
        feature.wkxToLatLngs(), {
          icon: this.getDraggableIcon()
        }
      ).addTo(kvm.map);
    }

    //ToDo auch implementieren für lines und polyongs
    editableLayer.enableEdit();

//    draggableId = draggable._leaflet_id;
    // kein Popup am Draggable, ist nicht notwendig wegen der Button im Menü   kvm.map._layers[draggable._leaflet_id].bindPopup(this.getDraggablePopup(feature, draggable));

    kvm.map._layers[editableLayer._leaflet_id].on(
      'dragend',
      function(evt) {
        var feature = kvm.activeLayer.activeFeature,
            latlng = feature.editableLayer.getLatLng();
        console.log('trigger geomChanged mit latlng: %o', latlng);
        $(document).trigger('geomChanged', [{ geom: feature.aLatLngsToWkx([[latlng.lat, latlng.lng]]), exclude: 'latlngs'}]);
      }
    );
    return editableLayer;
  },

  removeEditable: function(feature) {
    kvm.map.removeLayer(feature.editableLayer);
  },

  watchGpsAccuracy: function() {
    kvm.log('mapper controller: watchGpsAccuracy');
    this.watchId = navigator.geolocation.watchPosition(
      (function(geoLocation) {
//        kvm.log('Set new geo location accuracy', 4);
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

  getDraggableIcon: function() {
    return L.icon({
        iconUrl: 'img/draggableIcon.svg',
        iconSize: [38, 95],
        iconAnchor: [19, 81],
        popupAnchor: [-3, -76],
        shadowUrl: 'img/draggableIconShadow.svg',
        shadowSize: [68, 95],
        shadowAnchor: [19, 81]
    });
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
  },

  isMapVisible: function() {
    return ($('#showMapEdit').css('display') == 'none');
  },

  /*
  * Legt ein neues Feature Objekt an
  * übernimmt die Geometrie vom GPS oder der Mitte der Karte
  * und macht die Geometrie editierbar.
  */
  newFeature: function(evt) {
    // Erzeugt ein neues leeres Feature Objekt erstmal ohne Geometrie
    kvm.activeLayer.activeFeature = new Feature(
          '{ "' + kvm.activeLayer.get('id_attribute') + '": "' + kvm.uuidv4() + '"}',
          {
            id_attribute: 'uuid',
            geometry_type: kvm.activeLayer.get('geometry_type'),
            geometry_attribute: kvm.activeLayer.get('geometry_attribute'),
            new: true
          }
        );
    console.log('Neues Feature mit id: %s erzeugt.', kvm.activeLayer.activeFeature.id);

    if ($('#newPosSelect').val() == 1) {
      // Setzt die Position des Features
      navigator.geolocation.getCurrentPosition(
        function(geoLocation) {
          // GPS-Position konnte ermittelt werden.
          // ToDo hier die Funktion aufrufen, die was aus der Koordinate vom GPS macht.
          // - Geom für Feature übernehmen,
          // - ins Form übernehmen
          // - Neues Editable anlegen.
          // - ggf. Views und Buttons umschalten

          //?      kvm.activeLayer.activeFeature.setGeom();
          console.log('Starte Editierung an GPS-Coordinate');
          kvm.activeLayer.startEditing([geoLocation.coords.latitude, geoLocation.coords.longitude]);
          $('#gpsCurrentPosition').html(geoLocation.coords.latitude.toString() + ' ' + geoLocation.coords.longitude.toString());
        },
        function(error) {
          var center = kvm.map.getCenter();

          console.log('Starte Editierung in Bildschirmmitte');
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
        }, {
          maximumAge: 2000, // duration to cache current position
          timeout: 5000, // timeout for try to call successFunction, else call errorFunction
          enableHighAccuracy: true // take position from gps not network-based method
        }
      );
    }
    else {
      var center = kvm.map.getCenter();

      console.log('Starte Editierung in Bildschirmmitte');
      kvm.activeLayer.startEditing([center.lat, center.lng]);
    }
  },

  zoomToFeature: function(featureId) {
    var feature = kvm.activeLayer.features[featureId];

    kvm.map.fitBounds(feature.editableLayer.getBounds(), { padding: [50, 50]});
  },

  wkbToLatLngs: function(wkb) {
    // ToDo hier ggf. den Geometrietyp auch aus this.geometry_type auslesen und nicht aus der übergebenen geom
    // Problem dann, dass man die Funktion nur benutzen kann für den Geometrietype des activeLayer
    var wkx = kvm.wkx.Geometry.parse(new kvm.Buffer(wkb, 'hex')),
        coordsLevelDeep = this.coordsLevelsDeep[wkx.toWkt().split('(')[0].toUpperCase()],
        coords = wkx.toGeoJSON().coordinates;
    return (coordsLevelDeep == 0 ? L.GeoJSON.coordsToLatLng(coords) : L.GeoJSON.coordsToLatLngs(coords, coordsLevelDeep));
  }
}

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
        POINT: 0,
        MULTIPOINT: 2,
        LINESTRING: 2,
        MULTILINESTRING: 1,
        POLYGON: 1,
        MULTIPOLYGON: 2 // L.GeoJSON.coordsToLatLngs(kvm.wkx.Geometry.parse('SRID=4326;MULTIPOLYGON(((10 20, 14 20, 14 24, 10 24, 10 20), (12 21, 13 21, 13 22, 12 22, 12 21)), ((30 40, 35 45, 56 67)))').toGeoJSON().coordinates, 2)
    },
    createEditable: function (feature) {
        //ToDo auch implementieren für polyongs
        console.log('Erzeuge Editierbare Geometrie für %s: %o', feature.options.geometry_type, feature);
        var editableLayer;
        // Erzeugt eine editierbare Geometrie der Featuregeometrie
        if (feature.options.geometry_type == 'Point') {
            editableLayer = L.marker(feature.wkxToLatLngs(), {
                icon: this.getDraggableIcon()
            }).addTo(kvm.map);
        }
        else if (feature.options.geometry_type == 'Line') {
            editableLayer = L.polyline(feature.wkxToLatLngs(), {
                stroke: true,
                fill: false,
                color: '#ffff50',
                weight: 3,
                opacity: 0.7
            }).addTo(kvm.map);
            $('#trackControl').parent().show();
        }
        else if (feature.options.geometry_type == 'Polygon') {
            editableLayer = L.polygon(feature.wkxToLatLngs(), {
                stroke: true,
                color: '#ff3333',
                weight: 2,
                opacity: 0.8,
                fill: true,
                fillColor: '#e07676',
                fillOpacity: 0.7
            }).addTo(kvm.map);
        }
        return editableLayer;
    },
    bindEventHandler: function (feature) {
        console.log('bindEventHandler für feature: %o', feature);
        //ToDo auch implementieren für polyongs
        //    draggableId = draggable._leaflet_id;
        // kein Popup am Draggable, ist nicht notwendig wegen der Button im Menü   kvm.map._layers[draggable._leaflet_id].bindPopup(this.getDraggablePopup(feature, draggable));
        if (feature.options.geometry_type == 'Point') {
            kvm.map._layers[feature.editableLayer._leaflet_id].on('dragend', function (evt) {
                console.log('draged');
                var latlng = feature.editableLayer.getLatLng();
                console.log('trigger geomChanged mit latlng: %o', latlng);
                $(document).trigger('geomChanged', [{ geom: feature.aLatLngsToWkx([latlng]), exclude: 'latlngs' }]);
            });
        }
        else if (feature.options.geometry_type == 'Line') {
            kvm.map._layers[feature.editableLayer._leaflet_id].on('isChanged', function (evt) {
                console.log('isChanged');
                var latlngs = feature.editableLayer.getLatLngs();
                console.log('trigger geomChange mit latlngs: %o', latlngs);
                $(document).trigger('geomChanged', [{ geom: feature.aLatLngsToWkx(latlngs), exclude: 'latlngs' }]);
            });
        }
        else if (feature.options.geometry_type == 'Polygon') {
            console.log('Handler to act on Geometry is changed.');
            kvm.map._layers[feature.editableLayer._leaflet_id]
                .on('editable:dragend', function (evt) {
                console.log('Polygon wurde verschoben');
                var latlngs = feature.editableLayer.getLatLngs();
                $(document).trigger('geomChanged', [{ geom: feature.aLatLngsToWkx(latlngs), exclude: 'latlngs' }]);
            })
                .on('editable:vertex:dragend', function (evt) {
                console.log('Stützpunkt von Polygon wurde verschoben');
                var latlngs = feature.editableLayer.getLatLngs();
                $(document).trigger('geomChanged', [{ geom: feature.aLatLngsToWkx(latlngs), exclude: 'latlngs' }]);
            });
        }
    },
    removeEditable: function (feature) {
        if (feature.options.geometry_type == 'Line') {
            $('#trackControl').parent().hide();
        }
        kvm.map.removeLayer(feature.editableLayer);
    },
    watchGpsAccuracy: function () {
        kvm.log('mapper controller: watchGpsAccuracy');
        this.watchId = navigator.geolocation.watchPosition((function (geoLocation) {
            //        kvm.log('Set new geo location accuracy', 4);
            this.accuracy = geoLocation.coords.accuracy;
            switch (true) {
                case this.accuracy > 50:
                    this.signalLevel = 1;
                    break;
                case this.accuracy > 25:
                    this.signalLevel = 2;
                    break;
                case this.accuracy > 15:
                    this.signalLevel = 3;
                    break;
                case this.accuracy > 11:
                    this.signalLevel = 4;
                    break;
                default: this.signalLevel = 5;
            }
            $('#gps-signal-icon').attr('class', 'gps-signal-level-' + this.signalLevel);
        }).bind(this));
    },
    startGpsTracking: function (startLatlng) {
        this.lastLatlng = startLatlng;
        this.watchId = navigator.geolocation.watchPosition((function (location) {
            var latlng = L.latLng(location.coords.latitude, location.coords.longitude);
            console.log('gps Location: %s', latlng.toString());
            if (this.lastLatlng.distanceTo(latlng) > (config.minTrackDistance ? config.minTrackDistance : 5)) {
                console.log('Add Point to Line at Location: %s', latlng.toString());
                kvm.map.flyTo(latlng);
                kvm.activeLayer.activeFeature.editableLayer.addLatLng(latlng);
                this.lastLatlng = latlng;
            }
        }).bind(this));
    },
    getDraggableIcon: function () {
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
    getSignalLevel: function () {
        return (typeof this.signalLevel === "undefined" ? 0 : this.signalLevel);
    },
    getGPSAccuracy: function () {
        return (typeof this.accuracy === "undefined" ? 0 : this.accuracy);
    },
    clearWatch: function () {
        navigator.geolocation.clearWatch(this.watchId);
    },
    /*
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
          layer.appendToApp();
        };
    
        kvm.bindLayerEvents();
      },
    */
    gpsError: function (error) {
        $('#gps-signal-icon').attr('class', 'gps-signal-level-0');
        navigator.notification.confirm('Es kann keine GPS-Position bestimmt werden. Schalten Sie die GPS Funktion auf Ihrem Gerät ein, suchen Sie einen Ort unter freiem Himmel auf und versuchen Sie es dann noch einmal. Fehler: ' + error.message, function (buttonIndex) {
            if (buttonIndex == 1) {
                kvm.log('Einschalten der GPS-Funktion', 3);
            }
        }, 'GPS-Position', ['ok', 'abbrechen']);
    },
    isMapVisible: function () {
        return ($('#showMapEdit').css('display') == 'none');
    },
    zoomToFeature: function (featureId) {
        var feature = kvm.activeLayer.features[featureId];
        kvm.map.flyTo(feature.editableLayer.getLatLng(), 18);
    },
    wkbToLatLngs: function (wkb) {
        // ToDo hier ggf. den Geometrietyp auch aus this.geometry_type auslesen und nicht aus der übergebenen geom
        // Problem dann, dass man die Funktion nur benutzen kann für den Geometrietype des activeLayer
        var wkx = kvm.wkx.Geometry.parse(new kvm.Buffer(wkb, 'hex')), coordsLevelDeep = this.coordsLevelsDeep[wkx.toWkt().split('(')[0].toUpperCase()], coords = wkx.toGeoJSON().coordinates;
        return (coordsLevelDeep == 0 ? L.GeoJSON.coordsToLatLng(coords) : L.GeoJSON.coordsToLatLngs(coords, coordsLevelDeep));
    }
};
//# sourceMappingURL=mapper.js.map
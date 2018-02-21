function GeometrieFormField(formId, settings) {
  this.settings = settings;

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']',

  this.element = $('\
    <input\
      type="text"\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"\
      value=""' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '\
    />'
  );

  this.setValue = function(val) {
    //console.log('GeometrieFormField.setValue with value: %o', val);
    if (val == null || val == 'null') {
      val = '';
    }
    else {
      var geom = kvm.wkx.Geometry.parse(new kvm.Buffer(val, 'hex'));
      val = geom.x + ' ' + geom.y;
    }
    this.element.val(val);
  };

  this.getValue = function(action = '') {
    //console.log('GeometrieFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = null;
    }
    else {
      val = kvm.wkx.Geometry.parse('SRID=4326;POINT(' + val + ')').toEwkb().inspect().replace(/<|Buffer| |>/g, '');
    }

    return val;
  };

  this.bindEvents = function() {
    //console.log('SelectFormField.bindEvents');
    $('#featureFormular input[id=' + this.get('index') + ']').on(
      'change',
      function() {
        console.log('event for saveFeatureButton');
        if (!$('#saveFeatureButton').hasClass('active-button')) {
          $('#saveFeatureButton').toggleClass('active-button inactive-button');
        }
      }
    );

    $('#goToGpsPositionButton').on(
      'click',
      function() {
        console.log('click on goToGpsPositionButton');
        var lnglat = $('#featureFormular input[name=point]').val().split(' ');
            coord = ol.proj.transform(
              [lnglat[0], lnglat[1]],
              "EPSG:4326",
              kvm.map.getView().getProjection()
            ),
            point = new ol.geom.Point(coord),
            feature = new ol.Feature({
              geometry: point
            }),
            view = kvm.map.getView(),
            source = kvm.map.getLayers().item(1).getSource();

        source.clear();
        source.addFeature(feature);

//        helpLayer.refresh({force: true});

        view.setCenter(
          feature.getGeometry().getCoordinates()
        );

        view.setZoom(17);

        kvm.showItem('map');
      }
    );

    $('#saveGpsPositionButton').on(
      'click',
      function() {
        console.log('click on saveGpsPositionButton');
        navigator.geolocation.getCurrentPosition(
          function(geoLocation) {
            navigator.notification.confirm(
              'Neue Position:\n' + geoLocation.coords.latitude + ' ' + geoLocation.coords.longitude + '\nübernehmen?',
              function(buttonIndex) {
                if (buttonIndex == 1) {
                  console.log('set new Position ' + geoLocation.coords.latitude + ' ' + geoLocation.coords.longitude);
                  $('#featureFormular input[id=0]').val(geoLocation.coords.longitude + ' ' + geoLocation.coords.latitude).trigger('change');
                }
              },
              'GPS-Position',
              ['ja', 'nein']
            );
          },
          function(error) {
            navigator.notification.confirm(
              'Es kann keine GPS-Position bestimmt werden. Schalten Sie die GPS Funktion auf Ihrem Gerät ein, suchen Sie einen Ort unter freiem Himmel auf und versuchen Sie es dann noch einmal.',
              function(buttonIndex) {
                if (buttonIndex == 1) {
                  console.log('Einschalten der GPS-Funktion');
                }
              },
              'GPS-Position',
              ['ok', 'abbrechen']
            );
          }, {
            maximumAge: 2000, // duration to cache current position
            timeout: 5000, // timeout for try to call successFunction, else call errorFunction 
            enableHighAccuracy: true // take position from gps not network-based method
          }
        );
      }
    );
  };

  this.withLabel = function() {
    return $('<div class="form-field">').append(
      $('<label for="Koordinaten" />')
        .html(
          '<i id="saveGpsPositionButton" class="fa fa-map-marker fa-2x" aria-hidden="true" style="margin-right: 20px; margin-left: 7px; color: rgb(38, 50, 134);"></i>\
          <i id="goToGpsPositionButton" class="fa fa-globe fa-2x" aria-hidden="true" style="margin-right: 20px; margin-left: 7px; color: rgb(38, 50, 134);"></i>'
        )
        .append(
          this.element
        )
    )
  };

  return this;
}
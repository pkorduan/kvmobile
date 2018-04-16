kvm.controls.gpsControl = function(opt_options) {
  var options = opt_options || {};

  var button = $('<button/>').attr({
      id: 'gpsControlButton',
      class: 'kvm-gps-off'
  });

  button.html('<i class=\"fa fa-dot-circle-o\" aria-hidden="true"></i>');

  button.on(
    'click',
    function() {
      var gpsControlButton = $('#gpsControlButton');

      switch (true) {
        case gpsControlButton.hasClass('kvm-gps-off') : {
          kvm.log('GPS-Tracking ausschalten.', 3);
          // watch GPS-Position
          // track
          // show button as active
          gpsControlButton.toggleClass('kvm-gps-off kvm-gps-track');
          kvm.controller.mapper.watchGpsPosition();
          break;
        }

        case gpsControlButton.hasClass('kvm-gps-on') : {
          kvm.log('GPS-Tracking Wechel von an zu track.', 3);
          // track
          // show button as active
          gpsControlButton.toggleClass('kvm-gps-on kvm-gps-track');
          break;
        }

        case gpsControlButton.hasClass('kvm-gps-track') : {
          kvm.log('GPS-Tracking Wechsel von track nach aus.', 3);
          // clearWatch
          gpsControlButton.toggleClass('kvm-gps-off kvm-gps-track');
          kvm.controller.mapper.clearWatch();
          break;
        }
      }
    }
  );

  var element = $('<div></div>').attr({
    class: 'kvm-gps-control ol-unselectable ol-control',
    title: 'Anzeige aktueller GPS-Position'
  });
  element.append(button);
  
  return new ol.control.Control({
    element: element.get(0),
    target: options.target
  });
}
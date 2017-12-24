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
      console.log('gpsControl button on click');
      var gpsControlButton = $('#gpsControlButton');

      switch (true) {
        case gpsControlButton.hasClass('kvm-gps-off') : {
          console.log('switch from off to track');
          // watch GPS-Position
          // track
          // show button as active
          gpsControlButton.toggleClass('kvm-gps-off kvm-gps-track');
          kvm.controller.mapper.watchGpsPosition();
          break;
        }

        case gpsControlButton.hasClass('kvm-gps-on') : {
          console.log('switch from on to track');
          // track
          // show button as active
          gpsControlButton.toggleClass('kvm-gps-on kvm-gps-track');
          break;
        }

        case gpsControlButton.hasClass('kvm-gps-track') : {
          console.log('switch from track to off');
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
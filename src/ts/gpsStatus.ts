import "jquery";
export const GpsStatus = {
  load: function () {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        //console.log("Position: %o", position);
        const timestamp = new Date(position.timestamp);
        $("#gpsStatusText").html("GPS vorhanden und funktioniert.");
        $("#gpsCurrentPosition").html(
          "Position: " +
            position.coords.latitude.toString() +
            " " +
            position.coords.longitude.toString() +
            "<br>Genauigkeit: " +
            position.coords.accuracy +
            "<br>Zeit: " +
            timestamp.toLocaleDateString() +
            " " +
            timestamp.toLocaleTimeString()
        );
      });
    } else {
      $("#gpsStatusText").html("GPS wird vom Browser nicht unterstützt.");
      $("#gpsCurrentPosition").html("");
    }
  },
};

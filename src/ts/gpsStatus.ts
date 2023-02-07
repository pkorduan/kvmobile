import "jquery";
import { kvm } from "./app";
export const GpsStatus = {
  load: () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(kvm.onlocationfound, kvm.onlocationerror, {
        enableHighAccuracy: true,
        timeout: 5000,
      });
    } else {
      $("#gpsStatusText").html("GPS wird vom Browser nicht unterstützt.");
      $("#gpsCurrentPosition").html("");
      $("#zoomToCurrentLocation").hide();
    }
  },
};

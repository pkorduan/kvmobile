import "jquery";
import { kvm } from "./app";

export const GpsStatus = {
  status: "pending",
  geolocationPosition: <GeolocationPosition>null,
  ok: <boolean>null,
};

export async function getGpsStatus(timeout: number) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (evt) => resolve(evt),
        (evt) => reject(evt),
        {
          enableHighAccuracy: true,
          timeout: timeout,
        }
      );
    } else {
      reject({ message: "GPS wird nicht unterstützt" });
    }
  });
}

getGpsStatus(5000)
  .then((geolocationPosition) => {
    console.error("gpsStatus", geolocationPosition);
    GpsStatus.status = "GPS vorhanden und funktioniert";
    GpsStatus.geolocationPosition = geolocationPosition;
    GpsStatus.ok = true;
  })
  .catch((err) => {
    kvm.msg("Der Standort kann nicht bestimmt werden!\nSchalten Sie in Ihrem Gerät unter Einstellungen die Option 'Standort verwenden' ein.\nFehler bei der Bestimmung der GPS-Position.\nDie Wartezeit für eine neue Position ist überschritten.\nMeldung des GPS-Gerätes: " + err.message, "GPS Positionierung");
    GpsStatus.status = "Fehler";
    GpsStatus.ok = false;
  });

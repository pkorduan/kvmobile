config = {
  dbname: 'kvmobile',
/*
* Beispiele für Pfade in denen Bilder gespeichert werden
* file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/
* file:///storage/BA82-4AA9/Android/data/de.gdiservice.kvmobile/cache/
* emulated/0 wird als default in den Einstellungen gesetzt
* der Nutzer kann die Angabe unter Einstellungen setzen
* wenn das erste Foto gespeichert wird mit dem Camera Plugin, wird
* der verwendete Pfad ermittelt und die Einstellung überschrieben.
*/

//  localImgPath: 'file:///storage/' + 'BAB2-4AA9' + '/Android/data/de.gdiservice.kvmobile/cache/',
  localImgPath: 'file:///storage/' + 'emulated/0' + '/Android/data/de.gdiservice.kvmobile/cache/',

  projZone: 33,
//  maxExtent: [274300, 5936054.721, 360500, 6023975.279],
  maxExtent: [154300, 5836054.721, 360500, 6023975.279],
  startPosition: [12.20896, 53.095876],
  startZoom: 8,
  logLevel: 3, // 0 off, 1 error, 2 waring, 3 info, 4 debug
  debug: false,
  kvwmapServerId: 1,
  kvwmapServerName: 'kvwmap Server',

  kvwmapServerUrl: 'https://geoportal.lkros.de/kvwmap_dev',
  kvwmapServerUsername: '',
  kvwmapServerPasswort: '',
  kvwmapServerStelleId: 610011
}
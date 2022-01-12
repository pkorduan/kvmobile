# kvmobile
Mobile client for web gis kvwmap.

Anwendung zur Erfassung von Geodaten und zum synchronisieren mit dem Web-GIS kvwmap.

https://github.com/srahn/kvwmap/

http://kvwmap.de

# Change log
## 1.7.8
	* Behebung des Fehlers, dass beim Reload von Overlays die ohne Daten nicht vorher entfert werden.
	* Dynmaische Einstellung der Opacity von Overlayflächen möglich
## 1.7.7
	* Behebung des Fehlers, dass die Opacity der Overlay nicht von der Klasse des Layers übernommen wurde
## 1.7.6
	* Darstellung der Overlays mit Style der 1. Klasse des Layers in kvwmap
## 1.7.5
	* Anzeige und Reload von Overlays
## 1.7.4
	* Verbesserung beim Synchronisieren und Versionieren.
## 1.7.3
	* Fehler bei der Synchronisierung behoben
	* Alle Ja Links in Dialogen rechts
## 1.7.2
	* Selectable configurations
	* BackgroundGeolocation enabled
## 1.7.1
	* Fix issues mit more than one layer and offline maps
## 1.7.0
	* Vector-Tile Layer als Hintergrundlayer und Cache für offline-Nutzung
## 1.6.0
	* Unterstützung von abhängigen Auswahllisten
	* Funktion zum Anzeigen und Editieren von Polygonen
## 1.5.9
	* Fix bug bei Positionierung des Markers nach dem Erzeugen oder Ändern von Featurs und dem Zeigen der Funktions-Buttons im Popup-Fenster
## 1.5.8
	* Fix bug bei Erzeugung neuer Feature. Die Geometrie wird jetzt korrekt übernommen und keine Fehler wegen fehlernder Werte.
	* Default Werte werden korrekt gesetzt bei neuen Datensätzen
	* Zoomeinstellung wird nach dem Speichern von Geometrien erhalten.
	* Fehler beim Speichern von Date bei neuen Datensätzen behoben.
	* Funktion zum Übernehmen der Werte vorhandener Features in Formular eines neuen Features.
## 1.5.7
	* Datumsfelder als Formularfeld mit Datumspicker.
	* Bessere Formatierung des Formulars mit besserer Unterscheidung von editier- und nicht editierbaren Feldern.
## 1.5.6
	* Jetzt sind auch Datensätze, die keine Geometrie haben editierbar.
	* Werte, die null sind, werden beim INSERT nicht mehr geschrieben.
	* Autoattribute werden als Changes immer angehängt.
	* Auch die Karteneinstellung "Startposition neuer Objekte" wird in den Einstellungen gespeichert.
	* Neu angelegte und geänderte Daten werden jetzt vor dem Hinzufügen in die Featureliste immer von der Datenbank abgefragt, damit zusammengesetzte Attribute gleich richtig angezeigt werden.
## 1.5.5
	* Funktion zum Wiederherstellen von Datensätzen.
	* Korrektur von Fehlern bei Synchronisierung.
	* Auf- und Zuklappbare Abschnitte in den Einstellungen.
## 1.5.4
	* Berücksichtigung von zusammengesetzten Attributen, die auf dem Server als not saveable pseudoattribute definiert sind.
	* Layerfunktionen mit Beschriftung und toggle.
	* Löschfunktion auf Client korrigiert.
	* Monat im Timestamp auf Client korrigiert.
	* Speicherpfad für Backups lässt sich einstellen.
	* Änderungsmöglichkeit für Transparenz der MarkerSymbole.
	* Featurelayer zum Layercontrol hinzugefügt um ihn ein- und ausschalten zu können.
	* Send Passwort for login escaped.
## 1.5.3
	* Änder- und speicherbare Karteneinstellungen, Ausdehnung, min-, maxzoom, sowie Startposition und Startzoom.
	* Bug beim Speichern von Bildern behoben.
	* Speichern des Autoatributes user_id und user_name ermöglicht.
## 1.5.2
	* Der Zurück-Button zeigt einen Dialog ob man die Anwendung beenden möchte.
	* Formularelementtypen Time, User und UserID werden auf der Client-Seite automatisch befüllt entsprechend der Optionen die für das Attribut gesetzt sind.
	* Status-, Layerattributfilter und Sortierattribut werden local gespeichert, so dass sie nach einem Neustart der App wieder verwendet werden.
	* Auf Client erzeugte Zeiten in Local-Time.
## 1.5.1
	* Fix incomplete sync procedure.
	* Colorselector in settings.
	* Pfadeinstellung zu orka-tiles geändert auf files/orka-tiles-vg.
## 1.5.0
	* Change methode to load layer.
	* enable different types of geometry by applying geom_attribut setting of layer.
	* sort function.
	* filter function.
	* settings for taking pictures.
## 1.4.4
	* Enable origin https://geoport-vr.de/kvwmap/ in config.xml.
## 1.4.3
	* Enable origin https://geoportal-vg.de/kvwmap/ in config.xml.
## 1.4.2
	* Toggle style and function of sync Buttons pending from networkstatus.
	* Send also layer sync request with no deltas on client side.
## 1.4.1
	* Fix destination path of images taken with the camera. New images now will be strored allways to the directory specified in config.js parameter localImgPath.
	* Eye Button to show and hide the password text in settings view.
	* Remove note about apache Licence in app.js because the software ist under GNU Licence as defined in LICENSE file.
## 1.4.0
	* Change username to login_name.
	* Add change log to Readme.
	* Set Version in package.json, config.xml widget version attribut and app.js kvm.version.

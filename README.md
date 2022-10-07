# kvmobile
Mobile client for web gis kvwmap.

Anwendung zur Erfassung von Geodaten und zum synchronisieren mit dem Web-GIS kvwmap.

Git-Repo von kvwmap: https://github.com/srahn/kvwmap/

Doku zu kvwmap: https://kvwmap.de

Doku zum Plugin mobile von kvwmap: https://kvwmap.de/index.php/Plugins#Mobile_.28f.C3.BCr_kvmobile.29

Doku zu kvmobile: https://kvwmap.de/index.php/kvmobile

Download von gebauten Versionen für Android (apk-Dateien): https://gdi-service.de/public/kvmobile/

# Change log
## 1.9.4
  * Feature
    * A click on the feature lists header deselect the currently active feature.
    * Set circle marker radius on class size param.
  * Bugfix
    * Fix click on Google to search in feature list.
    * Use also class styles after geometry editing and edit canceling.
## 1.9.3
  * Maintainance
    * Get and show AppVersion from cordova build environment, No need anymore to change the version number in index.html and app.js
  * Bugfix
    * Use Default Color if line have not a color in class style 
## 1.9.2
  * Features
    * Beim Synchronisieren der Daten werden auch die lokal erfassten Bilder synchronisiert.
    * Unterdrücken der Erfolgsmeldungen beim Speichern eines Datensätzes und eines Bildes
## 1.9.1
  * Features
    * Style Layer also with opacity
## 1.9.0
  * Features
    * Make only synced layer editable
    * Sync Layer allways if app is started
    * Style Layer with classes style from server
    * Show Style in layer section
    * Show more layer infos
    * Save Database to Documents or in user defined location
    * Less confirm messages when saving data
  * Bugfixes
    * Fix bug in removeBrackets and removeQuotas
## 1.8.7
  * Features
    * Changable Backgroundlayer URL's
  * Bugfixes
    * Fix error with wrong context in execServerDeltaSuccessFunc wenn sync deltas from server to client.
## 1.8.6
  * Features
    * Show output of select fields in data view
    * Show yes or no for boolean fields in data view 
  * Bugfixes
    * Highlight Layer in control correct
    * Sync correct at start
## 1.8.5
  * Overlays section removed in settings view
  * Add configuration for LK V-R
## 1.8.4
  * Value for Range and select fields for layer style
## 1.8.3
  * User defined layer styles
## 1.8.2
  * Code Structure
    * Load Overlays as non editable layers
## 1.8.1
  * Bugfixes
    * Fix canot create a new dataset
    * Fix download when offline
## 1.8.0
  * Bugfixes
    * Fix Bug, that overlays will not be loaded in offline mode
    * Fix Bug, that vector will tiles not be shown in map in offline mode
    * Make sync overlay button inactive in offline mode
	* Code Structure
  	* Switch to TypeScript, jquery only in app context, use node build chain with webpack
  	* Switch some functions to classes
  	* Switch from $.parseJSON to native JSON.parse
## 1.7.12
	* Fix Bug beim erstmaligen Wechseln zwkschen Layern nach dem Laden von der Stelle.
## 1.7.11
	* Fix Bugs durch doppelt geladene oder nicht korrekt entfernte Layer
	* Steuerung der Darstellung der Popup Funktionen an nur einer Stelle in Funktion per Style
	* Anzeige aller Overlays in Layer-Control
	* Größere Klicktoleranz für verbessertes Anklicken von Linien.
	* Hervorheben des selektierten Layer in Layer-Control
## 1.7.10
	* Funktion zum Download neuer Versionen
	* Fix Bug in usage of coalesce add coalempty to ignore also empty spaces and to show overlaynames correcty
## 1.7.9
	* Behebung des Fehlers, dass beim neu Anlegen eines Objektes nichts passiert. (Anpassung coalesce Funktion)
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

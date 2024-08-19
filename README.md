# kvmobile

Mobile client for web gis kvwmap.

Anwendung zur Erfassung von Geodaten und zum synchronisieren mit dem Web-GIS kvwmap.

Git-Repo von kvwmap: https://github.com/srahn/kvwmap/

Doku zu kvwmap: https://kvwmap.de

Doku zum Plugin mobile von kvwmap: https://kvwmap.de/index.php/Plugins#Mobile_.28f.C3.BCr_kvmobile.29

Doku zu kvmobile: https://kvwmap.de/index.php/kvmobile

Download von gebauten Versionen für Android (apk-Dateien): https://gdi-service.de/public/kvmobile/

# Change log

## 1.18.0

- Features
  - Die Karteneinstellungen sind unter Einstellungen immer sichtbar.
- Bugfix
  - Hochzählen eines Zahlfeldes mit Kondition behoben mit params_replace nach gdi_conditional_next_val.
  - Und nächsten Datensatz erfassen lauffähig machen.

## 1.17.1

- Bugfix
  - Fix create table error for Default values with strings in single quotas

## 1.17.0

- Features
  - Font Size Setting

## 1.16.3

- Bugfix
  - Fix writeDeta for delete case.
  - Reload all Layer when change layerparameter

## 1.16.2

- Bugfix
  - Fix storage of multiple selectFormField

## 1.16.1

- Bugfix
  - Fix multiple selectFormField

## 1.16.0

- Bugfix
  - Fix SelectAutoFormField to return correct multivalues.
  - Correct replaceParams.
  - Enable multi select.
  - Fix within test.
  - Sort layer list and activate first in legendorder after request Layers
- Maintainance
  - Check tableExists befor readData.
  - Remove backupDatasets before Insert and Delete.
- Features
  - Filter by layer_params
  - FK-Validierung

## 1.15.1

- Bugfix
  - Fix error handling in kvm.writeLog()

## 1.15.0

- Bugfix
  - Fix Image sync
  - Fix Delete feature bug
- Features
  - Image selection from galery

## 1.14.1

- Bugfix
  - Fix sync error
- Features
  - Improve SelectFields with many options

## 1.14.0

- Maintainance
  - Update cordova and reengeneering for type script

## 1.13.2

- Features
  - Shows images sync button on layer settings only if layer has document attribute.
- Bug
  - Delete fk related sub features before deleting a parent feature.
  - Fix search for parent feature with within test.
  - Fix display of feature without geometry in dataview.

## 1.13.1

- Maintainance
  - Better getTimeStamp function.
  - Backup Database only if response from sync have deltas.
- Features
  - Write Logs to file in backupPath.

## 1.13.0

- Bugfixes
  - Correct zoom for new features.
- Maintainance
  - Update to awesomefont v 6.5.1
- Features
  - Add bing areal imagery layer.
  - Show output from Auswahlliste in Vorschau from subformPK attribute.
  - Make use of gdi_conditional_val function for default values from other tables
  - Change settings button to open always layer settings first.
  - Support querys for layers with joined tables
  - Selectable layer parameters.

## 1.12.3

- Features
  - Links zu Parent und Child Feature
    - Sprung zum Ändern eines anderen Features erst nach Bestätigung.
  - Bestätigung beim Wechsel vom Formular zur Datenansicht nur wenn vorher im Formular etwas geändert wurde.
  - Darstellung der Optionswerte bei Auswahllisten mit mehreren Möglichkeiten.
  - New configurable options
    - Require FingerprintAuth and PIN on start yes / no
    - Confirm before save a dataset yes / no
    - Create a new dataset after create yes / no
    - Next view after create
    - Next view after update
  - Funktion zur Sicherung der Bilddaten im lokalen Verzeichnis

## 1.12.2

- Features
- Anzeige von Rücksprunglinks zu Parentobjekt mit Vorschau aus drittem Element von Attribute-Option.
- Nach der Eingabe eines neuen Sub-Datensatz "Weiter"-Button der Zeigt auf das übergeordnete Objekt und "Nächsten anlegen" öffnet Form für nächsten neuen Datensatz.

## 1.12.1

- Bugfix
  - Unknown Fehler durch Ersetzung von LIKE mit % in INSERT SELECT-Kombination durch INSTR Funktion behoben.
  - Auswahllistenwerte mit integer Values im DataView korrekt anzeigen.
- Maintainance
  - Hinzufügen des plugin cordova-spatialite-storage
- Features
  - Automatisches hochzählen von Attributen die im default nextval stehen haben.
  - Automatisches hochzählen pro abhängigem Attribut die im default gdi_conditional_nextval stehen haben.
  - Setzen der id des Features des übergeordneten Layers in dessen Geometrie das neue Feature fällt in subFromFKFormFields.
  - Automatisches Sichern der Datenbank auf dem Client vor syncData

## 1.12.0

- Features
  - Map follow location when location control is active until pan or zoom.

## 1.11.2

- Features
  - Support pmtiles from layersettings
  - Hide unimportant configuration parameters

## 1.11.1

- Bugfix
  - Correct amount of vertex in wkt object
  - Correct var for Datensatzbezeichnung in Layerinfo
- Layout
  - Clear both bevor form-field-rows
  - Gray attribute names
  - 5px Padding input form fields
- Features
  - Jump from Parent to Client form and vise versa.
  - Save and show last active background layer
  - Enable Abhängige Auswahlfelder
  - Consider visibility dependencies
  - Show and hide layer groups in data view

## 1.11.0

- Maintainance
  - Konfiguration from Server not from configurations file in apk.

## 1.10.5

- Bugfix
  - Add layerGroup to map when saveGeometry of first object in layer.
  - Fix set active layer in stelle
- Maintainance
  - Catch Error for incorrect formField type.

## 1.10.4

- Bugfix
  - Asynchron loading images and previews.
  - Different image elements for data and form view.
  - ReadData only from layer when sorting.

## 1.10.3

- Maintainance
  - Add many try and catch blocks to catch errors

## 1.10.2

- Bugfix
  - Fix query LK-EE Backgroundlayer if not initialized configuration

## 1.10.1

- Features
  - Show numeric type attributs as numeric input fields
- Bugfix
  - Check for activeStelleId before usage

## 1.10.0

- Features
  - Function to reload all layers in map to restore correct drawed geometries. Its a work around for wrong or not drawn features after zoom or pan actions in LK-EE layers.
  - Function to load pm vector tiles via MapLibreGL and maplibre-gl-leaflet binding and query tile features
  - Show error message if image upload fails
- Maintainance
  - Update to leaflet Version 1.9.3
  - Fix 10 vulnerabilities of packages
  - Log layer sync Fehler
  - Remove unused code
- Bugfix
  - Add end coordinate in polygon rings
  - Set style.weight as integer to prevent the feature snipped drawing

## 1.9.14

- Bugfixes
  - Behebung des Fehlers zur Anzeige der GPS-Position in der Karte

## 1.9.13

- Features
  - Improve GPS-Status update
  - Show num Features in Layer info and not in database settings
  - Set default value if exists for attributs in sqlite database
- Bugfixes
  - Fix cancel edit error
  - Fix empty deltas lead to missing readData

## 1.9.12

- Features
  - Begrenzung des Karten zoom und pan auf maximale Ausdehnung der Konfigurationsdatei.
  - Zoom nicht mehr auf das Feature wenn man eines in der Karte auswählt.
  - Nicht mehr rein und rauszoomen wenn man ein Feature neu stylet.
  - Anzeige der Bezeichnung der ausgewählten aktiven Stelle in den Settings unter Server.
  - Anzeige des Button Stellen abfragen nachdem eine Stelle ausgewählt und deren Einstellungen gespeichert wurden.
  - PanTo active feature erst wenn der Kartenview geöffnet wird.
  - Beim Klick auf ein Feature aus einem Layer, der nicht aktiv geschaltet ist, wird nur das Popup geöffnet, nicht selektiert.
  - Im aktiven Layer sind die Feature die ausgewählt wurden gehighlighted.
  - Beim Laden der Layer werden gleich alle synchronisiert.
  - Beim Start der Anwendung werden die Layer automatisch synchronisiert.
  - Vor dem Neu Laden der Stellen muss der Nutzer bestätigen, dass er alle Layer synchronisiert hat.
- Maintainance
  - Überarbeitung der Selektion bzw. aktiv Schaltung der Feature.
- Bugfixes
  - Create correct text in Popup of featues of not active layers.
  - Get the style from layer that belongs to the feature not from activeLayer.
  - Set empty store in stead of null in kvm when clear the configuration.
  - Select feature correctly in map.

## 1.9.11

- Bugfix
  - Sortierattribut Status nicht mit in Abfrage nehmen

## 1.9.10

- Bugfixes
  - Sortierattribute nicht aus dem Store laden bei Layer.setActive
  - LayerFilter nicht aus dem Store laden bei Layer.setActive

## 1.9.9

- ToDos
  - Beim Laden der Layer Sperrbildschirm anzeigen und was gerade läuft
  - Beim Laden von Auswahllistentabellen ohne Geometry treten Fehler auf
  - Lupe fehlt wenn Suche eingeschaltet ist und Layer neu ausgewählt wird
- Features
  - Es können verschiedene Styles verwendet werden für Vektorkachel Hintergrundlayer.
  - Umstellung auf die neuen Vektorkacheldienst unter tileserver-gl-mv
- Bugfixes
  - Einstellung des letzten Item ohne Fehler oder alternative Items zeigen
  - Fehler bei der Anzeige von Options der Auswahlfelder die NULL sind behoben.

## 1.9.8

- Features
  - Nicht Synchronisieren wenn kein Netz

## 1.9.7

- Bugfixes
  - Korrektur beim Laden der Layer und Daten

## 1.9.6

- Features
  - Die App merkt sich welcher View als letztes offen war und zeigt diesen wieder an wenn die App neu gestartet wird.
  - Die App merkt sich auch den zuletzt eingestellten Zoom und die Mitte vom Kartenview.
  - Die Reihenfolge der Legende ändert sich gleich wenn ein neu geladener Layer eine neue drawingorder vom Server bekommen hat.
- Bugfix
  - Wenn die App gestartet wurde wird jetzt der richtige activeLayer in der Legende fett hervorgehoben.

## 1.9.5

- Features
  - Die Reihenfolge der Layer unter Einstellungen und in der Legende richtet sich nach der drawingorder vom Server

## 1.9.4

- Features
  - A click on the feature lists header deselect the currently active feature.
  - Set circle marker radius on class size param.
- Bugfixes
  - Fix click on Google to search in feature list.
  - Use also class styles after geometry editing and edit canceling.

## 1.9.3

- Maintainance
  - Get and show AppVersion from cordova build environment, No need anymore to change the version number in index.html and app.js
- Bugfix
  - Use Default Color if line have not a color in class style

## 1.9.2

- Features
  - Beim Synchronisieren der Daten werden auch die lokal erfassten Bilder synchronisiert.
  - Unterdrücken der Erfolgsmeldungen beim Speichern eines Datensätzes und eines Bildes

## 1.9.1

- Features
  - Style Layer also with opacity

## 1.9.0

- Features
  - Make only synced layer editable
  - Sync Layer allways if app is started
  - Style Layer with classes style from server
  - Show Style in layer section
  - Show more layer infos
  - Save Database to Documents or in user defined location
  - Less confirm messages when saving data
- Bugfixes
  - Fix bug in removeBrackets and removeQuotas

## 1.8.7

- Features
  - Changable Backgroundlayer URL's
- Bugfixes
  - Fix error with wrong context in execServerDeltaSuccessFunc wenn sync deltas from server to client.

## 1.8.6

- Features
  - Show output of select fields in data view
  - Show yes or no for boolean fields in data view
- Bugfixes
  - Highlight Layer in control correct
  - Sync correct at start

## 1.8.5

- Overlays section removed in settings view
- Add configuration for LK V-R

## 1.8.4

- Value for Range and select fields for layer style

## 1.8.3

- User defined layer styles

## 1.8.2

- Code Structure
  - Load Overlays as non editable layers

## 1.8.1

- Bugfixes
  - Fix canot create a new dataset
  - Fix download when offline

## 1.8.0

- Bugfixes
  - Fix Bug, that overlays will not be loaded in offline mode
  - Fix Bug, that vector will tiles not be shown in map in offline mode
  - Make sync overlay button inactive in offline mode
- Code Structure
  - Switch to TypeScript, jquery only in app context, use node build chain with webpack
  - Switch some functions to classes
  - Switch from $.parseJSON to native JSON.parse

## 1.7.13

- Zeige Output von Auswahlfeld-Attributen in DataView an Stelle von Werten

## 1.7.12

- Fix Bug beim erstmaligen Wechseln zwkschen Layern nach dem Laden von der Stelle.

## 1.7.11

- Fix Bugs durch doppelt geladene oder nicht korrekt entfernte Layer
- Steuerung der Darstellung der Popup Funktionen an nur einer Stelle in Funktion per Style
- Anzeige aller Overlays in Layer-Control
- Größere Klicktoleranz für verbessertes Anklicken von Linien.
- Hervorheben des selektierten Layer in Layer-Control

## 1.7.10

- Funktion zum Download neuer Versionen
- Fix Bug in usage of coalesce add coalempty to ignore also empty spaces and to show overlaynames correcty

## 1.7.9

- Behebung des Fehlers, dass beim neu Anlegen eines Objektes nichts passiert. (Anpassung coalesce Funktion)

## 1.7.8

- Behebung des Fehlers, dass beim Reload von Overlays die ohne Daten nicht vorher entfert werden.
- Dynmaische Einstellung der Opacity von Overlayflächen möglich

## 1.7.7

- Behebung des Fehlers, dass die Opacity der Overlay nicht von der Klasse des Layers übernommen wurde

## 1.7.6

- Darstellung der Overlays mit Style der 1. Klasse des Layers in kvwmap

## 1.7.5

- Anzeige und Reload von Overlays

## 1.7.4

- Verbesserung beim Synchronisieren und Versionieren.

## 1.7.3

- Fehler bei der Synchronisierung behoben
- Alle Ja Links in Dialogen rechts

## 1.7.2

- Selectable configurations
- BackgroundGeolocation enabled

## 1.7.1

- Fix issues mit more than one layer and offline maps

## 1.7.0

- Vector-Tile Layer als Hintergrundlayer und Cache für offline-Nutzung

## 1.6.0

- Unterstützung von abhängigen Auswahllisten
- Funktion zum Anzeigen und Editieren von Polygonen

## 1.5.9

- Fix bug bei Positionierung des Markers nach dem Erzeugen oder Ändern von Featurs und dem Zeigen der Funktions-Buttons im Popup-Fenster

## 1.5.8

- Fix bug bei Erzeugung neuer Feature. Die Geometrie wird jetzt korrekt übernommen und keine Fehler wegen fehlernder Werte.
- Default Werte werden korrekt gesetzt bei neuen Datensätzen
- Zoomeinstellung wird nach dem Speichern von Geometrien erhalten.
- Fehler beim Speichern von Date bei neuen Datensätzen behoben.
- Funktion zum Übernehmen der Werte vorhandener Features in Formular eines neuen Features.

## 1.5.7

- Datumsfelder als Formularfeld mit Datumspicker.
- Bessere Formatierung des Formulars mit besserer Unterscheidung von editier- und nicht editierbaren Feldern.

## 1.5.6

- Jetzt sind auch Datensätze, die keine Geometrie haben editierbar.
- Werte, die null sind, werden beim INSERT nicht mehr geschrieben.
- Autoattribute werden als Changes immer angehängt.
- Auch die Karteneinstellung "Startposition neuer Objekte" wird in den Einstellungen gespeichert.
- Neu angelegte und geänderte Daten werden jetzt vor dem Hinzufügen in die Featureliste immer von der Datenbank abgefragt, damit zusammengesetzte Attribute gleich richtig angezeigt werden.

## 1.5.5

- Funktion zum Wiederherstellen von Datensätzen.
- Korrektur von Fehlern bei Synchronisierung.
- Auf- und Zuklappbare Abschnitte in den Einstellungen.

## 1.5.4

- Berücksichtigung von zusammengesetzten Attributen, die auf dem Server als not saveable pseudoattribute definiert sind.
- Layerfunktionen mit Beschriftung und toggle.
- Löschfunktion auf Client korrigiert.
- Monat im Timestamp auf Client korrigiert.
- Speicherpfad für Backups lässt sich einstellen.
- Änderungsmöglichkeit für Transparenz der MarkerSymbole.
- Featurelayer zum Layercontrol hinzugefügt um ihn ein- und ausschalten zu können.
- Send Passwort for login escaped.

## 1.5.3

- Änder- und speicherbare Karteneinstellungen, Ausdehnung, min-, maxzoom, sowie Startposition und Startzoom.
- Bug beim Speichern von Bildern behoben.
- Speichern des Autoatributes user_id und user_name ermöglicht.

## 1.5.2

- Der Zurück-Button zeigt einen Dialog ob man die Anwendung beenden möchte.
- Formularelementtypen Time, User und UserID werden auf der Client-Seite automatisch befüllt entsprechend der Optionen die für das Attribut gesetzt sind.
- Status-, Layerattributfilter und Sortierattribut werden local gespeichert, so dass sie nach einem Neustart der App wieder verwendet werden.
- Auf Client erzeugte Zeiten in Local-Time.

## 1.5.1

- Fix incomplete sync procedure.
- Colorselector in settings.
- Pfadeinstellung zu orka-tiles geändert auf files/orka-tiles-vg.

## 1.5.0

- Change methode to load layer.
- enable different types of geometry by applying geom_attribut setting of layer.
- sort function.
- filter function.
- settings for taking pictures.

## 1.4.4

- Enable origin https://geoport-vr.de/kvwmap/ in config.xml.

## 1.4.3

- Enable origin https://geoportal-vg.de/kvwmap/ in config.xml.

## 1.4.2

- Toggle style and function of sync Buttons pending from networkstatus.
- Send also layer sync request with no deltas on client side.

## 1.4.1

- Fix destination path of images taken with the camera. New images now will be strored allways to the directory specified in config.js parameter localImgPath.
- Eye Button to show and hide the password text in settings view.
- Remove note about apache Licence in app.js because the software ist under GNU Licence as defined in LICENSE file.

## 1.4.0

- Change username to login_name.
- Add change log to Readme.
- Set Version in package.json, config.xml widget version attribut and app.js kvm.version.

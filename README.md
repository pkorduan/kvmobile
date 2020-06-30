# kvmobile
Mobile client for web gis kvwmap.

Anwendung zur Erfassung von Geodaten und zum synchronisieren mit dem Web-GIS kvwmap.

https://github.com/srahn/kvwmap/

http://kvwmap.de

# Change log
## 1.5.2
  * Der Zurück-Button zeigt einen Dialog ob man die Anwendung beenden möchte.
	* Formularelementtypen Time, User und UserID werden auf der Client-Seite automatisch befüllt entsprechend der Optionen die für das Attribut gesetzt sind.
	* Status-, Layerattributfilter und Sortierattribut werden local gespeichert, so dass sie nach einem Neustart der App wieder verwendet werden.
	* Auf Client erzeugte Zeiten in Local-Time
## 1.5.1
  * Fix incomplete sync procedure
	* Colorselector in settings
	* Pfadeinstellung zu orka-tiles geändert auf files/orka-tiles-vg
## 1.5.0
  * Change methode to load layer
  * enable different types of geometry by applying geom_attribut setting of layer
	* sort function
	* filter function
	* settings for taking pictures
## 1.4.4
	* Enable origin https://geoport-vr.de/kvwmap/ in config.xml
## 1.4.3
	* Enable origin https://geoportal-vg.de/kvwmap/ in config.xml
## 1.4.2
	* Toggle style and function of sync Buttons pending from networkstatus
	* Send also layer sync request with no deltas on client side
	
## 1.4.1
	* Fix destination path of images taken with the camera. New images now will be strored allways to the directory specified in config.js parameter localImgPath.
	* Eye Button to show and hide the password text in settings view.
	* Remove note about apache Licence in app.js because the software ist under GNU Licence as defined in LICENSE file

## 1.4.0
	* Change username to login_name
	* Add change log to Readme
	* Set Version in package.json, config.xml widget version attribut and app.js kvm.version

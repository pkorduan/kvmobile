# kvmobile
Mobile client for web gis kvwmap.

Anwendung zur Erfassung von Geodaten und zum synchronisieren mit dem Web-GIS kvwmap.

https://github.com/srahn/kvwmap/

http://kvwmap.de

# Change log
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

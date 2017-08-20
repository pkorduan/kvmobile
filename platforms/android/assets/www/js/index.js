/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function() {
      document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
      this.db = window.sqlitePlugin.openDatabase({name: 'demo.db', location: 'default'});
      this.receivedEvent('deviceready');
      this.addEventListeners();
      this.showDeviceInfo(device.cordova);
      this.checkConnection();
      this.showGPSCoordinates();
      this.showDeviceData();
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    },
    
    addEventListeners: function() {
      $('#takePictureButton').bind(
        'click',
        this.takePicture,
      );

      $('#storeTestDataButton').bind(
        'click',
        {
          db: this.db
        },
        this.storeTestData,
      );

      $('#queryTestDataButton').bind(
        'click',
        {
          db: this.db
        },
        this.queryTestData,
      );

      $('#truncateTestDataButton').bind(
        'click',
        {
          db: this.db
        },
        this.truncateTestData,
      );

      $('#loadRemoteJsonButton').bind(
        'click',
        {
          this: this
        },
        this.getAndShowFileTransferData
      );
    },

    showDeviceInfo: function(info) {
      var deviceInfoElement = $('#deviceinfo');
      $('#deviceInfoText').html(info);
    },

    checkConnection: function() {
        var networkState = navigator.connection.type;
 
        var states = {};
        states[Connection.UNKNOWN]  = 'Unknown connection';
        states[Connection.ETHERNET] = 'Ethernet connection';
        states[Connection.WIFI]     = 'WiFi connection';
        states[Connection.CELL_2G]  = 'Cell 2G connection';
        states[Connection.CELL_3G]  = 'Cell 3G connection';
        states[Connection.CELL_4G]  = 'Cell 4G connection';
        states[Connection.CELL]     = 'Cell generic connection';
        states[Connection.NONE]     = 'No network connection';
 
        $('#networkStatusText').html(states[networkState]);
    },

    showGPSCoordinates: function() {
      var geolocation = navigator.geolocation;

      geolocation.getCurrentPosition(
        function(position) {
          $('#gpsCoordinatesText').html(
            'Latitude: '          + position.coords.latitude          + '<br>' +
            'Longitude: '         + position.coords.longitude         + '<br>' +
            'Altitude: '          + position.coords.altitude          + '<br>' +
            'Accuracy: '          + position.coords.accuracy          + '<br>' +
            'Altitude Accuracy: ' + position.coords.altitudeAccuracy  + '<br>' +
            'Heading: '           + position.coords.heading           + '<br>' +
            'Speed: '             + position.coords.speed             + '<br>' +
            'Timestamp: '         + position.timestamp                + '<br>'
          );
        },
        function(error) {
          alert(
            'code: '    + error.code    + '<br>' +
            'message: ' + error.message + '<br>'
          );
        }
      );
    },

    takePicture: function() {
      navigator.camera.getPicture(
        function(imageData) {
          var image = $('#myImage');
          image.attr("src", imageData);
          $('#imageText').html(imageData);
        },
        function(message) {
          alert('Failed because: ' + message);
        }, {
          quality: 25,
          destinationType: Camera.DestinationType.FILE_URI
        }
      );
    },

/* nice to have just for testing
    openDatabase: fucntion() {
      db = window.sqlitePlugin.openDatabase({name: 'demo.db', location: 'default'});
    },

    testDatabase: function() {
      window.sqlitePlugin.echoTest(function() {
        console.log('ECHO test OK');
      });
      window.sqlitePlugin.selfTest(function() {
        console.log('SELF test OK');
      });
    },
*/
    storeTestData: function(event) {
      event.data.db.transaction(
        function(tx) {
          tx.executeSql('CREATE TABLE IF NOT EXISTS DemoTable (name, score)');
          tx.executeSql('INSERT INTO DemoTable VALUES (?,?)', ['Alice', 101]);
          tx.executeSql('INSERT INTO DemoTable VALUES (?,?)', ['Betty', 202]);
        },
        function(error) {
          $('#storeTestDataResult').html('Fehler beim Eintragen der Testdaten: ' + error.message);
        },
        function() {
          $('#storeTestDataResult').html('Testdaten erfolgreich hinzugefügt.');
        }
      );
    },

    queryTestData: function(event) {
      event.data.db.executeSql(
        "\
          SELECT\
            count(*) AS mycount\
          FROM DemoTable\
        ",
        [],
        function(rs) {
          $('#storeTestDataResult').html('Anzahl Testdatensätze: ' + rs.rows.item(0).mycount);
        },
        function(error) {
          $('#storeTestDataResult').html('SQL ERROR: ' + error.message);
        }
      );
    },

    truncateTestData: function(event) {
      event.data.db.transaction(
        function(tx) {
          tx.executeSql(
            'DELETE FROM DemoTable',
            [],
            function(tx, rs) {
              $('#storeTestDataResult').html('Testdatentabelle geleert');
            },
            function(tx, error) {
              $('#storeTestDataResult').html('ERROR beim leeren der Testtabelle: ' + error.message);
            }
          );
        }
      );
    },

    getAndShowFileTransferData: function(event) {
      console.log('event loadRemoteJsonButton: %o', event);
      url = 'https://gdi-service.de/kvwmap_pet_dev/index.php' + '?' +
            'Stelle_ID=54' + '&' +
            'username=korduan' + '&' +
            'passwort=' + config.password + '&' +
            'go=Layer-Suche_Suchen' + '&' +
            'selected_layer_id=789' + '&' +
            'orderby789=name' + '&' +
            'mime_type=application/json' + '&' +
            'format=json'
      event.data.this.downloadFile(
        url,
        'test.json',
        function(fileEntry) {
          fileEntry.file(
            function (file) {
              var reader = new FileReader();

              reader.onloadend = function() {
                var li = '';
                $.each($.parseJSON(this.result), function(i, item) {
                  li += '<li><a href="index.html?id=' + item.id + '">' + item.name + '</a></li>';
                });
                console.log(li);
                $('#haltestellenliste').append(li).listview('refresh');
              };
              reader.readAsText(file);
            },
            function(error) {
              console.log('Fehler beim lesen der Datei: ' + error.code);
            }
          );
          console.log('mach was mit der Datei: %o', fileEntry);
        },
        function() {
          console.log('mach was wegen Fehler.');
        }
      );
    },

    downloadFile: function(url, filename, callback, callback_error) {
      var fileTransfer = new FileTransfer();
      console.log('store the file in' + cordova.file.dataDirectory + filename);
      fileTransfer.download(
        url,
        cordova.file.dataDirectory + filename,
        function (fileEntry) {
          console.log("download complete: " + fileEntry.toURL());
          if (callback) callback(fileEntry);
        },
        function (error) {
          console.log("download error source " + error.source);
          console.log("download error target " + error.target);
          console.log("upload error code: " + error.code);
          if (callback_error) callback_error();
        },
        true
      );
    },

    showDeviceData: function() {
      $('#deviceDataText').html(
        'Modell: ' + device.model + '<br>' +
        'Platform: ' + device.platform + '<br>' +
        'Uuid: ' + device.uuid + '<br>' +
        'Version: ' + device.version + '<br>' +
        'Hersteller: ' + device.manufacturer + '<br>' +
        'Seriennummer: ' + device.serial
      );
    }
};

app.initialize();
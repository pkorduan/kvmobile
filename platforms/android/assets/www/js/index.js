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
      this.receivedEvent('deviceready');
      this.addEventListeners();
      this.showDeviceInfo(device.cordova);
      this.checkConnection();
      this.showGPSCoordinates();
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
    }

};

app.initialize();
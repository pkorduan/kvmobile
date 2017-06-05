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
var kvm = {
  initMap: function() {
    var myProjectionName = "EPSG:25832";
    proj4.defs(myProjectionName, "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs");
    var myProjection = ol.proj.get(myProjectionName);

    /*** Set View **/
    var view = new ol.View({
      projection: myProjection,
      center: ol.proj.transform([12.10,54.10], "EPSG:4326", "EPSG:25832"),
      extent: [655000.000000000, 5945000.000000000, 750000.000000000, 6030000.000000000],
      zoom: 12,
      minZoom: 11
    });

    /*** Set the Map***/
    var map = new ol.Map({
      controls: [],
      layers: [],
      projection: "EPSG:25832",
      target: "map",
      view: view
    });

    var orkaMv= new ol.layer.Tile({
      source: new ol.source.TileWMS({
        url: "https://www.orka-mv.de/geodienste/orkamv/wms",
        params: {"LAYERS": "orkamv-gesamt",
                        "VERSION": "1.3.0"}
      })
    });
    map.addLayer(orkaMv);
    this.map = map;
  },

  bindEvents: function() {
    /***                                  ***/
    /*** General Functions ***/
    /***                                  ***/
    /*** Awesome Font imitation mouseover ***/
    $("#showHaltestelle").mouseover(function() {
      $("#showHaltestelle_button").hide();
      $("#showHaltestelle_button_white").show();
    });
    $("#showHaltestelle").mouseleave(function() {
      $("#showHaltestelle_button").show();
      $("#showHaltestelle_button_white").hide();
    });

    $("#showSearch").click(function() {
      if ($("#searchHaltestelle").is(':visible')) { 
        $("#searchHaltestelle").hide();
      }
      else {
        $("#searchHaltestelle").show();
      }
    });

    /* Clientside Filter according to http://stackoverflow.com/questions/12433835/client-side-searching-of-a-table-with-jquery */
    /*** Search Haltestelle ***/
    $("#searchHaltestelle").on("keyup paste", function() {
      var value = $(this).val().toUpperCase();
      var $rows = $("#haltestellen_table tr");
      if(value === ''){
        $rows.show(500);
        return false;
      }
      $rows.each(function(index) {
        $row = $(this);
        var column = $row.find("td a").html().toUpperCase();
        if (column.indexOf(value) > -1) {
          $row.show(500);
        }
        else {
          $row.hide(500);
        }
      });
    });

    $(".haltestelle").click(function() {
      kvm.showItem("formular");
      // Sets Name of Haltestelle
      $("#nameHaltestelle").val($(this).text());
    });
    
    $("#geoLocationButton").on(
      'click',
      kvm.getGeoLocation
    );
    
    $("#startSyncButton").on(
      'click',
      function() {
        if (navigator.onLine) {
          kvm.sync();
        }
        else {
          alert('Keine Netzverbindung!');
        }
      }
    );
  },

  init: function() {
    this.initMap();
    this.bindEvents();
    $('#map').hide();
  },

  showItem: function(item) {
    switch (item) {
      case 'map':
        kvm.showDefaultMenu();
        $("#haltestellen, #settings, #formular").hide();
        $("#map").show();
        break;
      case "haltestelle":
        kvm.showDefaultMenu();
        $("#map, #settings, #formular").hide();
        $("#haltestellen").show();
        break;
      case "settings":
        kvm.showDefaultMenu();
        $("#map, #haltestellen, #formular").hide();
        if (navigator.onLine) {
          if (!$('#startSyncButton').hasClass('active-button')) {
            $('#startSyncButton').addClass('active-button');
          }
        }
        else {
          if ($('#startSyncButton').hasClass('active-button')) {
            $('#startSyncButton').removeClass('active-button');
          }
        }
        $("#settings").show();
        break;
      case "formular":
        kvm.showFormMenu();
        $("#map, #haltestellen, #settings").hide();
        $("#formular").show();
        break;
      default:
        kvm.showDefaultMenu();
        $("#line, #haltestellen, #settings, #formular").hide();
        $("#map").show();
    }
  },
  
  showDefaultMenu: function() {
    $("#backArrow, #saveForm").hide();
    $("#showMap, #showLine, #showHaltestelle, #showSettings").show();
  },

  showFormMenu: function() {
    $("#showMap, #showLine, #showHaltestelle, #showSettings").hide();
    $("#backArrow, #saveForm").show();
  },

  getGeoLocation: function() {
    navigator.geolocation.getCurrentPosition(
      kvm.getGeoLocationOnSuccess,
      kvm.getGeoLocationOnError
    );
  },
  
  getGeoLocationOnSuccess: function(geoLocation) {
    $('#geoLocation').val(geoLocation.coords.latitude + ' ' + geoLocation.coords.longitude);
  },
  
  getGeoLocationOnError: function(error) {
    alert('Fehler: ' + error.code + ' ' + error.message); 
  },

  sync: function() {
    alert('Start syncronisation');
  }
};

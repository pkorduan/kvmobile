import { kvm } from "./app";

declare var Connection;
export const NetworkStatus = {
  load: function () {
    this.view(this.get());
  },

  view: function (status) {
    //console.log("View Connection status: %s", status);
    $("#networkStatusText").html(status);
    if (navigator.onLine) {
      if ($(".sync-images-button").hasClass("inactive-button")) {
        //console.log("Switch from inactive to active buttons");
        $(".sync-images-button").toggleClass("active-button inactive-button");
        $(".sync-layer-button").toggleClass("active-button inactive-button");
        $(".reload-layer-button").toggleClass("active-button inactive-button");
        $(".sync-overlay-button").toggleClass("active-button inactive-button");
      }
    } else {
      if ($(".sync-images-button").hasClass("active-button")) {
        //console.log("Switch from active to inactive buttons");
        $(".sync-images-button").toggleClass("active-button inactive-button");
        $(".sync-layer-button").toggleClass("active-button inactive-button");
        $(".reload-layer-button").toggleClass("active-button inactive-button");
        $(".sync-overlay-button").toggleClass("active-button inactive-button");
      }
    }
  },

  get: function () {
    //console.log("Get connection status");
    var networkState = navigator.connection.type,
      states = {};

    states[Connection.UNKNOWN] = "Unbekannte Netzverbindung";
    states[Connection.ETHERNET] = "Ethernet Verbindung";
    states[Connection.WIFI] = "WLAN Netz";
    states[Connection.CELL_2G] = "2G Netz";
    states[Connection.CELL_3G] = "3G Netz";
    states[Connection.CELL_4G] = "4G Netz";
    states[Connection.CELL] = "generisches Netz";
    states[Connection.NONE] = "Keine Netzwerkverbindung";

    return (navigator.onLine ? "Wir sind online!" : "Wir haben kein Netz!") + " " + states[networkState];
  },
  noNetMsg: function (title = "Netzverbindung") {
    kvm.msg("Sie sind nicht online!<br>Diese Funktion steht nur mit Netzverbindung zur Verfügung.<br>Bitte prüfen Sie Ihre Netzverbindung!", title);
  },
};

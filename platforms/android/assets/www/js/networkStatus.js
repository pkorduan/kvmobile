NetworkStatus = {

  load: function() {
    this.view(
      this.get()
    );
  },

  view: function(status) {
    $('#networkStatusText').html(status);
    if (navigator.onLine) {
      if ($('#startSyncButton').hasClass('inactive-button')) {
        $('#startSyncButton').toggleClass('active-button', 'inactive-button');
      }
    }
    else {
      if ($('#startSyncButton').hasClass('active-button')) {
        $('#startSyncButton').toggleClass('active-button', 'inactive-button');
      }
    }
  },
  
  get: function() {
    var networkState = navigator.connection.type,
        states = {};

    states[Connection.UNKNOWN]  = 'Unbekannte Netzverbindung';
    states[Connection.ETHERNET] = 'Ethernet Verbindung';
    states[Connection.WIFI]     = 'WLAN Netz';
    states[Connection.CELL_2G]  = '2G Netz';
    states[Connection.CELL_3G]  = '3G Netz';
    states[Connection.CELL_4G]  = '4G Netz';
    states[Connection.CELL]     = 'generisches Netz';
    states[Connection.NONE]     = 'Keine Netzwerkverbindung';

    return states[networkState];
  }
}
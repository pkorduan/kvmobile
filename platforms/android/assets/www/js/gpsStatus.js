GpsStatus = {

  load: function() {
    this.view(
      this.get()
    );
  },

  view: function(status) {
    $('#gpsStatusText').html(status);
  },
  
  get: function() {
    return 'Zuletzt gemessene GPS-Position: ';
  }
}
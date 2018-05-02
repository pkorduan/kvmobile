function Stelle(settings = {}) {
  this.settings = (typeof settings == 'string' ? $.parseJSON(settings) : settings);

  this.get = function(key) {
    return this.settings[key];
  };

  this.set = function(key, value) {
    this.settings[key] = value;
    return this.settings[key];
  };

  this.viewDefaultSettings = function() {
    $('#kvwmapServerIdField').val(config.kvwmapServerId);
    $('#kvwmapServerNameField').val(config.kvwmapServerName);
    $('#kvwmapServerUrlField').val(config.kvwmapServerUrl);
    $('#kvwmapServerUsernameField').val(config.kvwmapServerUsername);
    $('#kvwmapServerPasswortField').val(config.kvwmapServerPasswort);
    $('#kvwmapServerStelleIdField').val(config.kvwmapServerStelleId);
  };

  this.viewSettings = function() {
    kvm.log('ServerSettings.viewSettings', 4);
    $('#kvwmapServerIdField').val(this.get('id'));
    $('#kvwmapServerNameField').val(this.get('name'));
    $('#kvwmapServerUrlField').val(this.get('url'));
    $('#kvwmapServerUsernameField').val(this.get('username'));
    $('#kvwmapServerPasswortField').val(this.get('passwort'));
    $('#kvwmapServerStelleIdField').val(this.get('Stelle_ID'));
  };

  this.saveToStore = function() {
    kvm.store.setItem('stelleSettings_' + this.get('id'), JSON.stringify(this.settings));
  };

  this.setActive = function() {
    kvm.log('Stelle.js setActive', 4);
    kvm.activeStelle = this;
    kvm.store.setItem('activeStelleId', this.get('id'));
  };

  return this;
}
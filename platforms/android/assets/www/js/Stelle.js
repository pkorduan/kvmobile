function Stelle(settings = {}) {
  this.settings = (typeof settings == 'string' ? $.parseJSON(settings) : settings);

  this.get = function(key) {
    return this.settings[key];
  };

  this.set = function(key, value) {
    this.settings[key] = value;
    return this.settings[key];
  };

/*  load: function(id) {
    console.log('ServerSettings.load');
    this.id = id;

    if (this.settingsExists()) {
      kvm.log('Servereinstellungen existieren bereits.');
      this.get();
    }
    else {
      kvm.log('Es wurden noch keine Zugangsdaten zum Server eingestellt. Es wurden die default-Werte in das Formular übernommen.');
      alert('Es fehlen Zugangsdaten zum kvwmap Server. Geben Sie diese unter Menüpunkt Optionen Abschnitt Server ein!');
      this.name = config.kvwmapServerName;
      this.url = config.kvwmapServerUrl;
      this.username = config.kvwmapServerUsername;
      this.passwort = config.kvwmapServerPasswort;
    }
    this.view();
    return this;
  },

  /*
  *
  *
  */
  this.viewDefaultSettings = function() {
    $('#kvwmapServerIdField').val(config.kvwmapServerId);
    $('#kvwmapServerNameField').val(config.kvwmapServerName);
    $('#kvwmapServerUrlField').val(config.kvwmapServerUrl);
    $('#kvwmapServerUsernameField').val(config.kvwmapServerUsername);
    $('#kvwmapServerPasswortField').val(config.kvwmapServerPasswort);
    $('#kvwmapServerStelleIdField').val(config.kvwmapServerStelleId);
  };

  this.viewSettings = function() {
    console.log('ServerSettings.viewSettings %o', this);
    $('#kvwmapServerIdField').val(this.get('id'));
    $('#kvwmapServerNameField').val(this.get('name'));
    $('#kvwmapServerUrlField').val(this.get('url'));
    $('#kvwmapServerUsernameField').val(this.get('username'));
    $('#kvwmapServerPasswortField').val(this.get('passwort'));
    $('#kvwmapServerStelleIdField').val(this.get('Stelle_ID'));
  };

  /*
  * Return true if all settings exists
  *
  settingsExists: function() {
    console.log('ServerSettings.settingsExists');
    return !(
      !kvm.store.getItem('kvwmapServerName') ||
      !kvm.store.getItem('kvwmapServerUrl') ||
      !kvm.store.getItem('kvwmapServerUsername') ||
      !kvm.store.getItem('kvwmapServerPasswort')
    );
  },*/

  this.saveToStore = function() {
    kvm.store.setItem('stelleSettings_' + this.get('id'), JSON.stringify(this.settings));
  };

  this.setActive = function() {
    kvm.activeStelle = this;
    kvm.store.setItem('activeStelleId', this.get('id'));
  };

  return this;
}
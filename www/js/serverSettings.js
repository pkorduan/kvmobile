ServerSettings = {

  load: function(id) {
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

  view: function() {
    console.log('ServerSettings.view');
    $('#kvwmapServerNameField').val(this.name);
    $('#kvwmapServerUrlField').val(this.url);
    $('#kvwmapServerUsernameField').val(this.username);
    $('#kvwmapServerPasswortField').val(this.passwort);
  },

  get: function() {
    console.log('ServerSettings.get');
    this.name = kvm.store.getItem('kvwmapServerName');
    this.url = kvm.store.getItem('kvwmapServerUrl');
    this.username = kvm.store.getItem('kvwmapServerUsername');
    this.passwort = kvm.store.getItem('kvwmapServerPasswort');
    return this;
  },

  save: function() {
    console.log('ServerSettings.save');
    kvm.store.setItem('kvwmapServerName', $('#kvwmapServerNameField').val());
    kvm.store.setItem('kvwmapServerUrl', $('#kvwmapServerUrlField').val());
    kvm.store.setItem('kvwmapServerUsername', $('#kvwmapServerUsernameField').val());
    kvm.store.setItem('kvwmapServerPasswort', $('#kvwmapServerPasswortField').val());

    $('#kvwmapServerName').val(kvm.store.getItem('kvwmapServerName'));
    $('#saveKvwmapServerDataButton').css('background', '#afffaf');

    kvm.log('Serverzugangsdaten erfolgreich gespeichert.');
  },

  /*
  * Return true if all settings exists
  */
  settingsExists: function() {
    console.log('ServerSettings.settingsExists');
    return !(
      !kvm.store.getItem('kvwmapServerName') ||
      !kvm.store.getItem('kvwmapServerUrl') ||
      !kvm.store.getItem('kvwmapServerUsername') ||
      !kvm.store.getItem('kvwmapServerPasswort')
    );
  }
}
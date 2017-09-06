LayerSettings = {

  load: function(id) {
    console.log('LayerSettings(' + id + ').load');
    this.id = id;
    this.store = kvm.store;

    if (this.settingsExists()) {
      kvm.log('Layereinstellungen ' + this.id + ' existieren bereits.');
      this.get();
    }
    else {
      console.log('setze layerSettings von config: %o', config);
      this.name = config.layerSettingsName;
      this.stelleId = config.layerSettingsStelleId;
      this.layerId = config.layerSettingsLayerId;
      kvm.log('Es wurden noch keine Einstellungen zum Layer ' + this.id + ' eingestellt. Es wurden die default-Werte gelesen.');
      kvm.msg('Geben Sie unter Menüpunkt Optionen im Abschnitt Layer einen Namen sowie die Stellen und Layer ID für den Zugriff auf den Layer ein.');
    }
    this.view();
    return this;
  },

  view: function() {
    console.log('LayerSettings(' + this.id + ').view');
    console.log('trage die Werte von this ein: %o', this);
    $('#layerSettingsNameField_' + this.id).val(this.name);
    $('#layerSettingsStelleIdField_' + this.id).val(this.stelleId);
    $('#layerSettingsLayerIdField_' + this.id).val(this.layerId);
  },

  get: function() {
    console.log('LayerSettings(' + this.id + ').get');
    this.name = this.store.getItem('layerSettingsName_' + this.id);
    this.stelleId = this.store.getItem('layerSettingsStelleId_' + this.id);
    this.layerId = this.store.getItem('layerSettingsLayerId_' + this.id);
    return this;
  },

  save: function() {
    var id = $(this).attr('layer_id');
    console.log('LayerSettings(' + id + ').saveSettings');
    kvm.store.setItem('layerSettingsName_' + id, $('#layerSettingsNameField_' + id).val());
    kvm.store.setItem('layerSettingsStelleId_' + id, $('#layerSettingsStelleIdField_' + id).val());
    kvm.store.setItem('layerSettingsLayerId_' + id, $('#layerSettingsLayerIdField_' + id).val());
    kvm.store.setItem('layer' + $('#layerSettingsLayerIdField_' + id).val() + 'SettingsId', id);
    kvm.store.setItem('activeLayerSetting', id);

    $('#layerSettingsName_0').val(kvm.store.getItem('layerSettingsName_' + id));
    $('#saveLayerSettingsButton_' + id).css('background', '#afffaf');

    kvm.log('Layerauswahl erfolgreich gespeichert.');
  },

  settingsExists: function() {
    console.log('LayerSettings(' + this.id + ').settingsExists');
    return !(
      !kvm.store.getItem('layerSettingsName_' + this.id) ||
      !kvm.store.getItem('layerSettingsLayerId_' + this.id) ||
      !kvm.store.getItem('layerSettingsStelleId_' + this.id)
    );
  },
}
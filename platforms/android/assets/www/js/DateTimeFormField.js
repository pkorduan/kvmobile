function DateTimeFormField(formId, settings) {
  //console.log('Erzeuge DateTimeFormField with settings %o', settings);
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']',

  this.element = $('\
    <input\
      type="datetime-local"\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"\
      value=""' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '\
    />'
  );

  this.setValue = function(val) {
    var val = kvm.coalesce(val, '');
    if (val != '') val = this.toISO(val);
    console.log('DateTimeFormField ' + this.get('name') + ' setValue with value: %o', val);
    this.element.val(val);
  };

  this.getValue = function(action = '') {
   // console.log('DateTimeFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = null;
    }

    // return current time if attribut type is Time and (action is empty or equal to option)
    console.log('name: ' + this.get('name') + ' formtype: ' + this.get('form_element_type') + ' action: ' + action + ' option: ' + this.get('options') + ' value: ' + this.element.val());
    if (
      this.get('form_element_type') == 'Time' &&
      (
        action == '' ||
        action.toLowerCase() == this.get('options').toLowerCase()
      ) &&
      this.get('name') != 'updated_at_server'
    ) {
      val = (new Date()).toISOString()
    }

    return this.fromISO(val);
  };

  this.bindEvents = function() {
    //console.log('DateTimeFormField.bindEvents');
    $('#featureFormular input[id=' + this.get('index') + ']').on(
      'change',
      function() {
        console.log('event on saveFeatureButton');
        if (!$('#saveFeatureButton').hasClass('active-button')) {
          $('#saveFeatureButton').toggleClass('active-button inactive-button');
        }
      }
    );
  };

  this.withLabel = function() {
    return $('<div class="form-field">').append(
      $('<label for="' + this.get('name') + '"/>')
        .html(
          (this.get('alias') ? this.get('alias') : this.get('name')) + '<br>' 
        )
        .append(
          this.element
        )
    )
  };

  this.toISO = function(datetime) {
    return datetime.replace(/\//g, '-').replace(' ', 'T');
  }

  this.fromISO = function(datetime) {
    console.log('konvert ' + this.get('name') + ' datetime: %o', datetime);
    return (typeof datetime == 'string' ? datetime.replace(/-/g, '/').replace('T', ' ') : null);
  }

  return this;
}
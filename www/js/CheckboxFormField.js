function CheckboxFormField(formId, settings) {
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']',

  this.element = $('\
    <input\
      type="checkbox"\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '\
    />' +
    this.get('alias')
  );

  this.setValue = function(val) {
    //console.log('CheckboxFormField.setValue with value: ' + val);
    if (!val && this.get('default')) {
      val = this.get('default');
    }

    this.element.val(val);
    this.element.prop('checked', false);
    if (val == 't') {
      this.element.prop('checked', true);
    }
  };

  this.getValue = function(action = '') {
   // console.log('CheckboxFormField.getValue');
    return (this.element.prop('checked') ? 't' : (this.element.val() == '' ? null : 'f'));
  };

  this.bindEvents = function() {
    //console.log('CheckboxFormField.bindEvents');
    $('#featureFormular input[id=' + this.get('index') + ']').on(
      'change',
      function() {
        if (!$('#saveFeatureButton').hasClass('active-button')) {
          $('#saveFeatureButton').toggleClass('active-button inactive-button');
        }
      }
    );
  };

  this.withLabel = function() {
    var label = $('<label for="' + this.get('name') + '"/>');

    label.append((this.get('alias') ? this.get('alias') : this.get('name')));

    if (this.get('tooltip')) {
      label.append('&nbsp;<i class="fa fa-exclamation-circle" style="color: #f57802" onclick="kvm.msg(\'' + this.get('tooltip') + '\');"></i>');
    }

    return $('<div class="form-field">').append(this.element).append('&nbsp;').append(label);
  };

  return this;
}
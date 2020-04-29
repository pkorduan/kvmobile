/*
* create a numeric form field in the structure
*   <div class="form-field">
*     <div class="form-label">
*       <label for="name"/>
*     </div>
*     <div class="form-value">
*       <input type="text" id="1" name="bezeichnung" value="Wert"/>
*     </div>
*   </div>
*/
function ZahlFormField(formId, settings) {
  //console.log('Erzeuge ZahlFormField with settings %o', settings);
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']';

  this.element = $('<div class="form-value">').append('\
    <input\
      type="number"\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"\
      value=""' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '\
    />'
  );

  this.setValue = function(val) {
    //console.log('ZahlFormField.setValue with value: ' + val);
    if (!val && this.get('default')) {
      val = this.get('default');
    }

    this.element.val(val == 'null' ? '' : val);
  };

  this.getValue = function(action = '') {
    //console.log('ZahlFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = null;
    }
    return val;
  };

  this.bindEvents = function() {
   // console.log('ZahlFormField.bindEvents');
    $('#featureFormular input[id=' + this.get('index') + ']').on(
      'keyup',
      function() {
        if (!$('#saveFeatureButton').hasClass('active-button')) {
          $('#saveFeatureButton').toggleClass('active-button inactive-button');
        }
      }
    );
  };

  this.withLabel = function() {
    var label = $('<div class="form-label">').append('<label for="' + this.get('name') + '"/>');

    label.append((this.get('alias') ? this.get('alias') : this.get('name')));

    if (this.get('tooltip')) {
      label.append('&nbsp;<i class="fa fa-exclamation-circle" style="color: #f57802" onclick="kvm.msg(\'' + this.get('tooltip') + '\');"></i>');
    }

    return $('<div class="form-field">').append(label).append('<br>').append(this.element);
  };

  return this;
}
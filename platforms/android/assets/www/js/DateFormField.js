/*
* create a date form field in the structure
*   <div class="form-field">
*     <div class="form-label">
*       <label for="name"/>
*     </div>
*     <div class="form-value">
*       <input type="date" id="1" name="bezeichnung" value="Wert"/>
*     </div>
*   </div>
*/
function DateFormField(formId, settings) {
  //console.log('Erzeuge DateFormField with settings %o', settings);
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']',

  this.element = $('\
    <input\
      type="date"\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"\
      value=""' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '\
    />'
  );

  this.setValue = function(val) {
    kvm.log('val: ' + val, 4);
    var val = kvm.coalesce(val, '');
    if (val != '') val = this.toISO(val);
    kvm.log('DateFormField ' + this.get('name') + ' setValue with value: ' + JSON.stringify(val), 4);
    this.element.val(val);
  };

  this.getValue = function(action = '') {
    kvm.log('DateFormField.getValue', 4);
    var val = this.element.val();
    if (typeof val === "undefined" || val == '') {
      val = null;
    }
    return val;
  };

  this.getAutoValue = function() {
    kvm.log('DateFormField.getAutoValue', 4);
    return kvm.today();
  };

  this.bindEvents = function() {
    //console.log('DateFormField.bindEvents');
    $('#featureFormular input[id=' + this.get('index') + ']').on(
      'change',
      function() {
        if (!$('#saveFeatureButton').hasClass('active-button')) {
          $('#saveFeatureButton').toggleClass('active-button inactive-button');
        }
      }
    );
  };

  this.toISO = function(date) {
    return date.replace(/\//g, '-');
  }

  this.fromISO = function(date) {
    kvm.log('konvert ' + this.get('name') + ' date: ' + date, 4);
    return (typeof date == 'string' ? date.replace(/-/g, '/').replace('T', ' ').replace('Z', '') : null);
  }

  return this;
}
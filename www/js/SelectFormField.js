/*
* create a select form field in the structure
*   <div class="form-field">
*     <div class="form-label">
*       <label for="name"/>
*     </div>
*     <div class="form-value">
*       <input type="text" id="1" name="bezeichnung" value="Wert"/>
*     </div>
*   </div>
*/
function SelectFormField(formId, settings) {
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']',

  this.element = $('\
    <select\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '>\
      <option value="">Bitte wählen</option>' +
      $.map(
        this.get('options'),
        function(option) {
//          option = option.replace(/(^')|('$)/g, '')
          return '<option value="' + option['value'] + '">' + option['output'] + '</option>';
        }
      ).join('\n') + '\
    </select>'
  );

  this.setValue = function(val) {
    //console.log('SelectFormField.setValue with value: ' + val);
    if (kvm.coalesce(val) == null && this.get('default')) {
      val = this.get('default');
    }
    this.element.val(val == 'null' ? '' : val);
  };

  this.getValue = function(action = '') {
    //console.log('SelectFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = null;
    }
    return val;
  };

  this.bindEvents = function() {
    //console.log('SelectFormField.bindEvents');
    $('#featureFormular select[id=' + this.get('index') + ']').on(
      'change',
      function() {
        if (!$('#saveFeatureButton').hasClass('active-button')) {
          $('#saveFeatureButton').toggleClass('active-button inactive-button');
        }
      }
    );
  };

  return this;
}
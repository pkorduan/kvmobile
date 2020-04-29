/*
* create a field in data view in the form
*   <div class="data-view-field">
*     <div class="data-view-label">
*       label
*     </div>
*     <div class="data-view-value">
*       value
*    </div>
*  </div>
*/
function DataViewField(divId, settings) {
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + divId + ' > #' + this.get('index'),

  this.element = $('<div id="' + this.get('index') + '" class="data-view-value">');

  this.setValue = function(val) {
    console.log('DataViewField.setValue with value: ' + val);
    this.element.html((val == 'null') ? '' : val);
  };

  this.withLabel = function() {
    var label = $('<div class="data-view-label">');

    label.append((this.get('alias') ? this.get('alias') : this.get('name')));

    if (this.get('tooltip')) {
      label.append('&nbsp;<i class="fa fa-exclamation-circle" style="color: #f57802" onclick="kvm.msg(\'' + this.get('tooltip') + '\');"></i>');
    }

    return $('<div class="data-view-field">').append(label).append(this.element);
  };

  return this;
}
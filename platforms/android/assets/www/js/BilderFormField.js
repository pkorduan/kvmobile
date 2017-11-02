function BilderFormField(formId, settings) {
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']',

  this.element = $('\
    <input\
      type="hidden"\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"\
      value=""' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '\
    />'
  );

  this.setValue = function(val) {
    var val = kvm.coalesce(val, '');
    console.log('BilderFormField.setValue with value: %o', val);
    this.element.val(val);
    console.log('Add images to previews div ' + val);

    // ToDo hier alle Bilder an element anhängen mit after wie in take Picture


    $('#large_image_1').attr("src", val).show();
    console.log('Add click handler on preview div' + val);
  };

  this.getValue = function() {
    console.log('BilderFormField.getValue');
    var val = this.element.val();

    return val;
  };

  this.bindEvents = function() {
    console.log('SelectFormField.bindEvents');
    $('#featureFormular input[id=' + this.get('index') + ']').on(
      'change',
      function() {
        console.log('event on saveFeatureButton');
        if (!$('#saveFeatureButton').hasClass('active-button')) {
          $('#saveFeatureButton').toggleClass('active-button inactive-button');
        }
      }
    );

    $('#takePictureButton_1').bind(
      'click',
      { context: this},
      this.takePicture,
    );

  };

  this.takePicture = function(evt) {
    console.log('BilderFormField.takePicture %o', evt);
    formField = evt.data.context;

    navigator.camera.getPicture(
      function(imageData) {
        console.log("BilderFormField.takePicture success with imageData %o", imageData);
        console.log('Get Element of BilderFormField %o', formField);
        var files = $('#featureFormular input[id=1]').val(); 

        formField.element.after($('\
          <img\
            src="' + imageData + '"\
            style="margin-bottom: 2px; width: 100%;"\
          />\
        '));

        if (files != '') {
          files += ',';
        }
        $('#featureFormular input[id=1]').val(files + imageData).trigger('change');
        $('#featureFormular input[id=2]').val((new Date()).toISOString().replace('Z', '')).show();
      },
      function(message) {
        alert('Failed because: ' + message);
      }, {
        quality: 25,
        destinationType: Camera.DestinationType.FILE_URI
      }
    );
  };

  this.withLabel = function() {
    return $('\
      <div class="form-field">\
        <i id="takePictureButton_' + this.get('index') + '" class="fa fa-camera fa-2x" style="color: rgb(38, 50, 134)"/>\
        <div id="previews"></div>\
      <div/>\
    ')
    .append(
      this.element
    );
  };

  return this;
}
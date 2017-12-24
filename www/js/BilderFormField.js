function BilderFormField(formId, settings) {
  this.settings = settings;
  this.images_div_id = 'images_' + settings['index'];

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
    console.log('BilderFormField.setValue with value: ' +  val);
    var val = kvm.coalesce(val, ''),
        images,
        i;

    val = this.removeBraces(val.trim());
    this.element.val(val);

    // remove images from preview div
    $('#' + this.images_div_id).html('');

    if (val == '') {
      $('#' + this.images_div_id).html('').hide();
      $('#dropAllPictureButton_' + this.get('index')).hide();
    }
    else {
      console.log('Add images to previews div: ' + val);
      images = val.split(',');
      for (i=0; i < images.length; i++) {
        // ToDo check if image exists, if not show placeholder and try to download it
        // else addImage in form
        this.addImage(
          this.removeOriginalName(
            this.serverToLocalPath(
              images[i].trim()
            )
          )
        );
      }
    }
    // ToDo hier alle Bilder an element anhängen mit after wie in take Picture
    

    $('#large_image_1').attr("src", val).show();
    //console.log('Add click handler on preview div' + val);
  };

  this.getValue = function(action = '') {
    //console.log('BilderFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = null;
    }
    else {
      val = this.addBraces(val);
    }

    return val;
  };

  /*
  * Remove the part with original name of image in val
  * Return the first part before & delimiter
  */
  this.removeOriginalName = function(val) {
    console.log('BilderFormField.removeOriginalName: ' + val);
    return val.split('&').shift();
  }

  /*
  * Remove first and last caracter from string
  * in this class used to remove the braces {...} from array values
  * but can be used also for all other enclosing character
  */
  this.removeBraces = function(val) {
    console.log('BilderFormField.removeBraces ' + val);
    var result = val.substring(1, val.length-1)
    console.log('result: ' + result);
    return result;
  }

  /*
  * Add braces around the value to make an array
  */
  this.addBraces = function(val) {
    console.log('BilderformField.addBraces ' + val);
    var result = '{' + val + '}';
    console.log('Result: ' + result);
    return result
  }

  /*
  * Replace server image path by local image path
  */
  this.serverToLocalPath = function(src) {
    console.log('BilderFormField.serverToLocalPath ' + src);
    var result = config.localImgPath + src.substring(src.lastIndexOf('/') + 1);
    console.log('Result: ' + result);
    return result
  };

  /*
  * Replace local image path by servers image path
  */
  this.localToServerPath = function(src) {
    console.log('BilerFormField.localToServerPath src: %o',  src);
    var result = kvm.activeLayer.get('document_path') + src.substring(src.lastIndexOf('/') + 1);
    console.log('Result: ' + result);
    return result
  };

  this.addImage = function(src) {
    console.log('BilderFormField: Add Image to FormField');
    var img_div = $('<div>');

    img_div.append($('<img src="' + src + '" field_id="' + this.get('index') + '" style="margin-bottom: 2px; width: 100%;"/>'));
    img_div.append($('<br>'));
    img_div.append($('<input type="text"\ name="' + src + '"/>'));
    $('#' + this.images_div_id).append(img_div).show();

    $('#dropAllPictureButton_' + this.get('index')).show();

    $('img[src$="' + src + '"]').on(
      'click',
      function(evt) {
        navigator.notification.confirm(
          'Bild Löschen?',
          function(buttonIndex) {
            if (buttonIndex == 1) { // ja
              var src = evt.target.src;
                  field = kvm.activeLayer.attributes[evt.target.getAttribute('field_id')].formField;

              field.dropImage(evt.target);
            }

            if (buttonIndex == 2) { // nein
              // Do nothing
            }
          },
          '',
          ['ja', 'nein']
        );
      }
    );

  };

  /*
  * Remove the image tag witch have this src and
  * the corresponding path from hidden formfield
  */
  this.dropImage = function(img) {
    console.log('BilderFormField.dropImage img: %o', img);
    debug_img = img;
    var imageField = this.element,
        activeLayer = kvm.activeLayer,
        sql = '';

    // ToDo implement this function and bind to delte choice of after dialog from image click
    // remove image string from field value
    imageField.val(
      $.map(
        imageField.val().split(','),
        function(path) {
          if (path.indexOf(img.src.substring(img.src.lastIndexOf('/') + 1)) < 0) {
            return path;
          }
        }
      ).join(',')
    );

    imageField.trigger('change');
    $(img).parent().remove();
  };

  this.bindEvents = function() {
    //console.log('SelectFormField.bindEvents');
    $('#featureFormular input[id=' + this.get('index') + ']').on(
      'change',
      function() {
       // console.log('event on saveFeatureButton');
        if (!$('#saveFeatureButton').hasClass('active-button')) {
          $('#saveFeatureButton').toggleClass('active-button inactive-button');
        }
      }
    );

    $('#takePictureButton_' + this.get('index')).bind(
      'click',
      { context: this},
      this.takePicture,
    );
/*
    $('#selectPictureButton_1').bind(
      'click',
      { context: this},
      this.selectPicture,
    );
*/
    $('#dropAllPictureButton_' + this.get('index')).bind(
      'click',
      { context: this},
      this.dropAllPictures,
    );

  };

  this.dropAllPictures = function(evt) {
    var context = evt.data.context;
    //console.log('BilderformField.dropAllPictures');
    context.setValue('');
    context.element.trigger('change');
  };

  this.takePicture = function(evt) {
   // console.log('BilderFormField.takePicture %o', evt);
    formField = evt.data.context;

    navigator.camera.getPicture(
      function(imageData) {
       // console.log("BilderFormField.takePicture success with imageData %o", imageData);
       // console.log('Get Element of BilderFormField %o', formField);
        var files = $('#featureFormular input[id=1]').val(),
            newImg = formField.localToServerPath(imageData);

        formField.addImage(
          imageData
        );

        if (files != '') {
          files += ',';
        }
        $('#featureFormular input[id=1]').val(files + newImg).trigger('change');
        $('#featureFormular input[id=2]').val((new Date()).toISOString().replace('Z', '')).show();
        formField.element.trigger('change');
      },
      function(message) {
        alert('Failed because: ' + message);
      },
      {
        quality: 25,
        correctOrientation: true,
        sourceType: Camera.PictureSourceType.CAMERA,
        destinationType: Camera.DestinationType.FILE_URI,
        saveToPhotoAlbum: true
      }
    );
  };
/*
  this.selectPicture = function(evt) {
    console.log('BilderFormField.takePicture %o', evt);
    formField = evt.data.context;

    navigator.camera.getPicture(
      function(imageData) {
        console.log("BilderFormField.takePicture success with imageData %o", imageData);
        console.log('Get Element of BilderFormField %o', formField);
        var files = $('#featureFormular input[id=1]').val(); 

        formField.addImage(imageData);

        if (files != '') {
          files += ',';
        }
        $('#featureFormular input[id=1]').val(files + imageData).trigger('change');
        $('#featureFormular input[id=2]').val((new Date()).toISOString().replace('Z', '')).show();
      },
      function(message) {
        alert('Failed because: ' + message);
      },
      {
        quality: 25,
        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
        destinationType: Camera.DestinationType.FILE_URI
      }
    );
  };

*/
  this.withLabel = function() {
    return $('\
      <div class="form-field">\
        <i id="takePictureButton_' + this.get('index') + '" class="fa fa-camera fa-2x" style="color: rgb(38, 50, 134)"/>\
        <!--i id="selectPictureButton_' + this.get('index') + '" class="fa fa-picture-o fa-2x" style="color: rgb(38, 50, 134)"/-->\
        <i id="dropAllPictureButton_' + this.get('index') + '" class="fa fa-trash fa-2x" style="color: rgb(238, 50, 50); float: right; display: none;"/>\
        <div id="' + this.images_div_id + '"></div>\
      <div/>\
    ')
    .append(
      this.element
    );
  };

  return this;
}
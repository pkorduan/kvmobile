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

  /* Assign the value of the feature to the form field as it is in the database and
  * create corresponding form and view elements.
  * @params any set to '' if val is undefined, null, 'null' or NAN 
  */
  this.setValue = function(val) {
    debug_val = val;
    console.log('BilderFormField.setValue with value: ' +  val);
    var val = kvm.coalesce(val, ''),
        images,
        image,
        local_image,
        i;

    this.element.val(val);

    // remove images from preview div
    $('#' + this.images_div_id).html('');

    // create new images if exists
    if (val == '') {
      $('#' + this.images_div_id).html('').hide();
      $('#dropAllPictureButton_' + this.get('index')).hide();
    }
    else {
      console.log('Add images to previews div: ' + val);
      images = this.removeBraces(val).split(',');
      console.log('images: %o', images);
      for (i = 0; i < images.length; i++) {
        image = images[i],
        local_image = this.removeOriginalName(this.serverToLocalPath(image))
        // ToDo check if image exists, if not show placeholder and try to download it
        // else addImage in form
        console.log('images[' + i + ']: ' + image);

        window.resolveLocalFileSystemURL(
          local_image,
          (function(fileEntry) {
            console.log('File ' + fileEntry.toURL() + ' exists');
            this.addImage(fileEntry.toURL());
          }).bind(this),
          (function() {
            console.log('File ' + this.image + ' existiert nicht.');
            this.context.addImage('img/no_image.png', this.image);
          }).bind({
            context : this,
            image : local_image
          })
        );
      }
    }
    $('#large_image_1').attr("src", val).show();
  };

  this.getValue = function(action = '') {
    //console.log('BilderFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = null;
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

  this.addImage = function(src, name = '') {
    console.log('BilderFormField: Add Image to FormField');
    var img_div = $('<div>'),
        width = (src == 'img/no_image.png' ? '25%' : '100%')
        name = (name == '' ? src : name);

    img_div.append($('<img src="' + src + '" field_id="' + this.get('index') + '" style="margin-bottom: 2px; width: ' + width + ';" name="' + name + '"/>'));
    img_div.append($('<br>'));
    img_div.append($('<input type="text"\ name="' + src + '"/>'));
    $('#' + this.images_div_id).append(img_div).show();

    $('#dropAllPictureButton_' + this.get('index')).show();

    $('img[name$="' + name + '"]').on(
      'click',
      function(evt) {
        debug_evt = evt;
        if (evt.target.src == 'file:///android_asset/www/img/no_image.png') {
          navigator.notification.confirm(
            'Bild herunterladen?',
            function(buttonIndex) {
              if (buttonIndex == 1) { // ja
                console.log('Download Image: ' + evt.target.name);
              }
              if (buttonIndex == 2) { // nein
                // Do nothing
              }
            },
            '',
            ['ja', 'nein']
          );
        }
        else {
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
      }
    );

  };

  this.addImgNameToVal = function(newImg) {
    var val = this.getValue();
    val = (
      val == null
        ? this.addBraces(newImg)
        : this.addBraces(this.removeBraces(val) + ',' + newImg)
    );
    this.element.val(val);
    this.element.trigger('change');
    return val;
  }

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
      this.addBraces($.map(
        this.removeBraces(imageField.val()).split(','),
        function(path) {
          if (path.indexOf(img.src.substring(img.src.lastIndexOf('/') + 1)) < 0) {
            return path;
          }
        }
      ).join(',')
    ));

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
    console.log('BilderFormField.takePicture %o', evt);

    navigator.camera.getPicture(
      (function(imageData) {
        this.addImage(imageData);
        this.addImgNameToVal(this.localToServerPath(imageData));
        $('#featureFormular input[id=2]').val((new Date()).toISOString().replace('Z', '')).show();
      }).bind(evt.data.context),
      function(message) {
        alert('Failed because: ' + message);
      },
      {
        quality: 25,
        correctOrientation: true,
        allowEdit: true,
        sourceType: Camera.PictureSourceType.CAMERA,
        destinationType: Camera.DestinationType.FILE_URI,
        saveToPhotoAlbum: false
      }
    );
  };

/*
function listDir(path){
  window.resolveLocalFileSystemURL(path,
    function (fileSystem) {
      var reader = fileSystem.createReader();
      reader.readEntries(
        function (entries) {
          console.log(entries);
        },
        function (err) {
          console.log(err);
        }
      );
    }, function (err) {
      console.log(err);
    }
  );
}
*/
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
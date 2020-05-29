kvm.controller.files = {
  readFile: function(fileEntry) {

    fileEntry.file(function (file) {
      var reader = new FileReader();

      reader.onloadend = function() {
        console.log("Successful file read: " + this.result);
        kvm.controller.files.displayFileData(fileEntry.nativeURL + ": " + this.result);
      };

      reader.readAsText(file);

    }, kvm.controller.files.onErrorReadFile);
  },

  writeFile: function(fileEntry, dataObj, isAppend) {
    // Create a FileWriter object for our FileEntry (log.txt).
    fileEntry.createWriter(function (fileWriter) {

      fileWriter.onwriteend = function() {
        console.log("Successful file write...");
        kvm.controller.files.readFile(fileEntry);
      };

      fileWriter.onerror = function (e) {
        console.log("Failed file read: " + e.toString());
      };

      // If we are appending data to file, go to the end of the file.
      if (isAppend) {
        try {
          fileWriter.seek(fileWriter.length);
        }
        catch (e) {
          console.log("file doesn't exist!");
        }
      }
      fileWriter.write(dataObj);
    });
  },

  displayFileData: function(fileData) {
    console.log(fileData);
  },

  onErrorReadFile: function(err) {
    console.log('Error on readFile: %o', err);
  },

  onFileSystemReady: function(fs, fileName, inhalt) {
  //  fileName = 'delta_1.json';
    kvm.log('file system open: ' + fs.name, 4);
//    fileName = 'delta_layer_' + kvm.activeLayer.getGlobalId() + '.json';

    console.log('fs.root in onFil: %o', fs.root);
    fs.root.getFile(
      fileName,
      { create:true, exclusive:false},
      function(fileEntry) {
        kvm.controller.files.writeFile(fileEntry, inhalt, true);
      },
      function(err) {
        console.log('error in getFile: %o', err);
      }
    )
  },

  writeTextToFile: function(fileName, content) {
    window.requestFileSystem(
      LocalFileSystem.TEMPORARY,
      0,
      (fs) => kvm.controller.files.onFileSystemReady(fs, fileName, content),
      function(err) {
        console.log(err);
      }
    )
  }
  

}
/*
window.requestFileSystem(
  LocalFileSystem.TEMPORARY,
  0,
  kvm.controller.files.onFileSystemReady,
  function(err) {
    console.log(err);
  }
)
kvm.controller.files.writeTextToFile('test.json', '\ntesteintrag')
*/


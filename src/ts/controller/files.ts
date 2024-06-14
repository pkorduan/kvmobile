import { kvm } from "../app";

// kvm.controller.files = {

export const FileUtils = {
  readFile: function (fileEntry) {
    fileEntry.file(function (file) {
      var reader = new FileReader();

      reader.onloadend = function () {
        // console.log("Successful file read: " + this.result);
        kvm.controller.files.displayFileData(
          fileEntry.nativeURL + ": " + this.result
        );
      };

      reader.readAsText(file);
    }, kvm.controller.files.onErrorReadFile);
  },

  writeFile: function (fileEntry, dataObj, isAppend) {
    // Create a FileWriter object for our FileEntry (log.txt).
    fileEntry.createWriter(function (fileWriter) {
      fileWriter.onwriteend = function () {
        console.log("Successful file write...");
        // kvm.controller.files.readFile(fileEntry);
      };

      fileWriter.onerror = function (e) {
        let msg = `Fehler beim Schreiben in die Logdatei: ${JSON.stringify(e)}`;
        console.error(msg);
      };

      // If we are appending data to file, go to the end of the file.
      if (isAppend) {
        try {
          fileWriter.seek(fileWriter.length);
        } catch (e) {
          let msg = `Logdatei existiert nicht!`;
          console.error(msg);
        }
      }
      fileWriter.write(dataObj);
    });
  },

  displayFileData: function (fileData) {
    console.log(fileData);
  },

  onErrorReadFile: function (err) {
    console.log("Error on readFile: %o", err);
  },

  onFileSystemReady: function (fs, fileName, inhalt) {
    //  fileName = 'delta_1.json';
    kvm.log("file system open: " + fs.name, 4);
    //    fileName = 'delta_layer_' + kvm.activeLayer.getGlobalId() + '.json';

    console.log("fs.root in onFil: %o", fs.root);
    fs.root.getFile(
      fileName,
      { create: true, exclusive: false },
      function (fileEntry) {
        kvm.controller.files.writeFile(fileEntry, inhalt, true);
      },
      function (err) {
        console.log("error in getFile: %o", err);
      }
    );
  },

  writeTextToFile: function (fileName, content) {
    window.requestFileSystem(
      LocalFileSystem.TEMPORARY,
      0,
      (fs) => kvm.controller.files.onFileSystemReady(fs, fileName, content),
      function (err) {
        console.log(err);
      }
    );
  },

  copyFile2: function (fs, srcFilePath, dstFile) {
    console.log("copyFile fs: %o", fs);
    /**
     * Function copy file in baseFileURI to dstPathName on the fileSystem
     */
    console.log("srcFilePath: %o", srcFilePath);
    window.resolveLocalFileSystemURL(
      srcFilePath,
      function (file) {
        // console.log("copy file: %o", file);
        var documentsPath = fs.root;
        console.log(documentsPath);
        file.copyTo(
          srcFilePath,
          dstFile,
          function (res) {
            // console.log("copying was successful to: " + res.nativeURL);
          },
          function () {
            console.log("unsuccessful copying");
          }
        );
      },
      function () {
        console.log("failure! file was not found");
      }
    );
  },

  /**
   * call it like:
   * kvm.controller.files.copyFile(
   *  cordova.file.applicationStorageDirectory + "databases/",
   *  "kvmobile.db",
   *  kvm.store.getItem("localBackupPath"),
   *  "sicherung.db"
   * )
   */
  copyFile: function (srcDir, srcFile, dstDir, dstFile, msg = "") {
    console.log(
      "Copy File: %s from Dir: %s to File: %s Dir: %s",
      srcFile,
      srcDir,
      dstFile,
      dstDir
    );
    var dstEntry;
    //resolve url for source
    window.resolveLocalFileSystemURL(dstDir, function (dstDirEntry) {
      dstEntry = dstDirEntry;
      // console.log("dstDirEntry: %o", dstDirEntry);
      window.resolveLocalFileSystemURL(
        srcDir + srcFile,
        function (srcFileEntry) {
          console.log("srcFileEntry %o", srcFileEntry);
          srcFileEntry.copyTo(
            dstEntry,
            dstFile,
            function (dstFileEntry) {
              // console.log("dstFileEntry: %o", dstFileEntry);
              if (msg) {
                kvm.msg(msg, "Sicherung");
              }
            },
            function (error) {
              console.log("copying FAILED %o", error);
            }
          );
        },
        function (e) {
          console.log(JSON.stringify(e));
        }
      );
    });
  },

  copyFiles(srcDir, dstDir) {
    window.resolveLocalFileSystemURL(
      srcDir,
      function (fileSystem) {
        let reader = (<any>fileSystem).createReader();
        reader.readEntries(
          function (entries) {
            let msg = "";
            console.log(
              `Anzahl Entries im Verzeichnis ${srcDir}: ${entries.length}`
            );
            entries.forEach((entry) => {
              let srcFile = entry.name;
              let dstFile = srcFile;
              //console.log(`Copy file: ${srcFile} nach: ${dstDir}`);
              kvm.controller.files.copyFile(srcDir, srcFile, dstDir, dstFile);
            });
            msg = `${entries.length} Datei${
              entries.length > 0 ? "en" : ""
            } nach ${dstDir} gesichert!`;
            console.log(msg);
            kvm.msg(msg, "Sicherung");
          },
          function (err) {
            console.log(err);
          }
        );
      },
      function (err) {
        console.log(err);
      }
    );
  },
};
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

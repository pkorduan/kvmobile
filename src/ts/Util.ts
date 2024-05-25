export function listFiles(dir: string) {
    // window.requestFileSystem(
    //     LocalFileSystem.PERSISTENT,
    //     0,
    //     function (fs) {
    //         fs.root.createReader().readEntries(
    //             (fileSystemEntries)=>{
    //                 for (let i=0; i<fileSystemEntries.length; i++) {
    //                     console.error("fileEntry"+i, fileSystemEntries[i]);
    //                 }
    //             },
    //             (err)=>{
    //                 console.error("Error in Listfiles.readEntries", err);
    //             }
    //         )
    //         console.error("file system open: " + fs.name);
    //     },
    //     function (err) {
    //         console.error("Error in Listfiles", err);
    //     }
    // );

    window.resolveLocalFileSystemURL(
        dir,
        function (entry) {
            console.error("listFiles: " + entry.name);
            if (entry.isDirectory) {
                (<DirectoryEntry>entry).createReader().readEntries(
                    (fileSystemEntries) => {
                        for (let i = 0; i < fileSystemEntries.length; i++) {
                            console.error("fileEntry" + i + "  " + fileSystemEntries[i].nativeURL);
                        }
                    },
                    (err) => {
                        console.error("Error in Listfiles.readEntries", err);
                    }
                );
            }
        },
        function (err) {
            console.error("Error in Listfiles", err);
        }
    );
}

export function executeSQL(db: SQLitePlugin.Database, statement: string, params: any[]): Promise<SQLitePlugin.Results> {
    return new Promise<SQLitePlugin.Results>((resove, reject) => {
        db.executeSql(
            statement,
            params,
            (results) => resove(results),
            (err) => reject(err)
        );
    });
}

# Cordova/PhoneGap sqlite storage - premium enterprise version with legacy support for memory improvements, ATTACH/DETACH (Android/iOS/macOS), and TBD other extra features
 
Native interface to sqlite in a Cordova/PhoneGap plugin for Android, iOS, macOS, and Windows 10 UWP (Universal Windows Platform), with API similar to HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/).

This version includes memory improvements and TBD other extra features.

This version is available under GPL v3 (http://www.gnu.org/licenses/gpl.txt) or a premium commercial license.

TBD: no Circle CI or Travis CI working in this version branch.

NOTE: Commercial licenses for Cordova-sqlite-enterprise-free purchased before July 2016 are valid for this version. Commercial licenses for Cordova-sqlite-evcore versions are *not* valid for this version.

## IMPORTANT: iCloud backup of SQLite database is NOT allowed

As documented in the "**A User’s iCloud Storage Is Limited**" section of [iCloudFundamentals in Mac Developer Library iCloud Design Guide](https://developer.apple.com/library/mac/documentation/General/Conceptual/iCloudDesignGuide/Chapters/iCloudFundametals.html) (near the beginning):

<blockquote>
<ul>
<li><b>DO</b> store the following in iCloud:
  <ul>
   <li>[<i>other items omitted</i>]</li>
   <li>Change log files for a SQLite database (a SQLite database’s store file must never be stored in iCloud)</li>
  </ul>
</li>
<li><b>DO NOT</b> store the following in iCloud:
  <ul>
   <li>[<i>items omitted</i>]</li>
  </ul>
</li>
</ul>
- <cite><a href="https://developer.apple.com/library/mac/documentation/General/Conceptual/iCloudDesignGuide/Chapters/iCloudFundametals.html">iCloudFundamentals in Mac Developer Library iCloud Design Guide</a>
</blockquote>

### How to disable iCloud backup

**Already fixed in this version:** ~~Use the `location` option in `sqlitePlugin.openDatabase()` to store the database in a subdirectory that is *NOT* backed up to iCloud, as described in the section below.~~

**NOTE:** Changing `BackupWebStorage` in `config.xml` has no effect on a database created by this plugin. `BackupWebStorage` applies only to local storage and/or Web SQL storage created in the WebView (*not* using this plugin). For reference: [phonegap/build#338 (comment)](https://github.com/phonegap/build/issues/338#issuecomment-113328140)

## Status

- A recent version of the Cordova CLI (such as `6.5.0`) is recommended. Cordova versions older than `6.0.0` are missing the `cordova-ios@4.0.0` security fixes. In addition it is *required* to use `cordova prepare` in case of cordova-ios older than `4.3.0` (Cordova CLI `6.4.0`).
- Default location for iOS is `Library/LocalDatabase`, will *not* be backed up to iCloud (may **not** be changed in this version)
- Free support is available in [litehelpers / Cordova-sqlite-evplus-legacy-attach-detach-free / issues](https://github.com/litehelpers/Cordova-sqlite-evplus-legacy-attach-detach-free/issues); premium commercial support is available by contacting: sales@litehelpers.net
- Patches patches will *NOT* be accepted on this project due to potential licensing issues.
- Status for the target platforms:
  - Android: now using [Android-sqlite-connector](https://github.com/liteglue/Android-sqlite-connector) (with sqlite `3.8.10.2`), with support for FTS3/FTS4 and R-Tree, and REGEXP support using PCRE 8.37 as built from [liteglue / Android-sqlite-native-driver-regexp-pcre](https://github.com/liteglue/Android-sqlite-native-driver-regexp-pcre)
  - iOS/macOS/Windows: sqlite `3.8.10.2` embedded
- Windows version is TBD:
  - Issue with UNICODE `\u0000` character (same as `\0`)
  - No background processing (for future consideration)
  - Visual Studio 2015 required. This version branch does not support Visual Studio 2017.
  - TBD other known issues
- FTS3 and FTS4 are tested working OK in this version branch (for all target platforms in this version branch Android/iOS/macOS)
- R-Tree is *not* tested or supported for Android in this version branch.
- Android is supported back to SDK 10 (a.k.a. Gingerbread, Android 2.3.3); support for older versions is available upon request.
- iOS versions supported: 8.x/9.x/10.x

<!-- END Status -->

## Announcements

- Resolved transaction problem after window.location (page) change with possible data loss ref: [litehelpers/Cordova-sqlite-storage#666](https://github.com/litehelpers/Cordova-sqlite-storage/issues/666)
- [brodybits / cordova-sqlite-test-app](https://github.com/brodybits/cordova-sqlite-test-app) project is a CC0 (public domain) starting point (NOTE that this plugin must be added) and may also be used to reproduce issues with this plugin.
- The Lawnchair adapter is now moved to [litehelpers / cordova-sqlite-lawnchair-adapter](https://github.com/litehelpers/cordova-sqlite-lawnchair-adapter).
- [brodybits / sql-promise-helper](https://github.com/brodybits/sql-promise-helper) provides a Promise-based API wrapper.
- [nolanlawson / pouchdb-adapter-cordova-sqlite](https://github.com/nolanlawson/pouchdb-adapter-cordova-sqlite) supports this plugin along with other implementations such as [nolanlawson / sqlite-plugin-2](https://github.com/nolanlawson/sqlite-plugin-2) and [Microsoft / cordova-plugin-websql](https://github.com/Microsoft/cordova-plugin-websql).
- macOS ("osx" platform) is now supported
- Published [brodybits / Cordova-quick-start-checklist](https://github.com/brodybits/Cordova-quick-start-checklist) and [brodybits / Avoiding-some-Cordova-pitfalls](https://github.com/brodybits/Avoiding-some-Cordova-pitfalls).
- Self-test functions to verify proper installation and operation of this plugin
- More explicit `openDatabase` and `deleteDatabase` `iosDatabaseLocation` option
- Added simple sql batch function
- Support for reading BLOB values (from pre-populated databases) for Android/iOS/macOS
- ATTACH/DETACH is now supported as described below.
- Windows 10 UWP is now supported by this version
- Added echo test function to verify installation of this plugin
- Pre-populated database support for Android, iOS, macOS, ~~and Windows (TBD BROKEN)~~, usage described below
- Published [brodybits / Cordova-quick-start-checklist](https://github.com/brodybits/Cordova-quick-start-checklist) and [brodybits / Cordova-troubleshooting-guide](https://github.com/brodybits/Cordova-troubleshooting-guide)
- REGEXP is now supported for Android/iOS/macOS platforms.
- This version has the following improvement(s):
  - iOS/macOS version can now handle all UNICODE characters, using URI encoding as a workaround for [Cordova bug CB-9435](https://issues.apache.org/jira/browse/CB-9435).
  - Multi-part transactions API (described below)
  - TBD *missing in this version*: ~~Error result with proper Web SQL `code` member and `sqliteCode` as reported by the SQLite C library (Android/iOS)~~
  - flat JSON interface between Javascript and native parts
  - *optional*: transaction sql chunking, which can be enabled by changing the `MAX_SQL_CHUNK` value in SQLitePlugin.js
- A version with support for web workers is available at: [litehelpers / Cordova-sqlite-evplus-legacy-workers-free](https://github.com/litehelpers/Cordova-sqlite-evplus-legacy-workers-free)
- Published [brodybits / Cordova-quick-start-checklist](https://github.com/brodybits/Cordova-quick-start-checklist) and [brodybits / Cordova-troubleshooting-guide](https://github.com/brodybits/Cordova-troubleshooting-guide)
- PhoneGap Build is now supported through the npm package: http://phonegap.com/blog/2015/05/26/npm-plugins-available/ (Android/iOS ONLY)
- [MetaMemoryT / websql-promise](https://github.com/MetaMemoryT/websql-promise) now provides a Promises-based interface to both Web SQL and this plugin
- [SQLCipher](https://www.zetetic.net/sqlcipher/) for Android/iOS/macOS/Windows is supported by [litehelpers / Cordova-sqlcipher-adapter](https://github.com/litehelpers/Cordova-sqlcipher-adapter)

<!-- END Announcements -->

## Highlights

- Drop-in replacement for HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/): the only change should be to replace the static `window.openDatabase()` factory call with `window.sqlitePlugin.openDatabase()`, with parameters as documented below.
- Failure-safe nested transactions with batch processing optimizations (according to HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/))
- API (based on HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/)) is designed to be as flexible as possible but does not allow the application to leave any transactions hanging open.
- Pre-populated openDatabase option (usage described below)
- As described in [this posting](http://brodyspark.blogspot.com/2012/12/cordovaphonegap-sqlite-plugins-offer.html):
  - Keeps sqlite database in a user data location that is known (TBD cannot be reconfigured in this version branch)
  - No 5MB maximum, more information at: http://www.sqlite.org/limits.html
- Also tested for multi-page applications with window location changes
- This project is self-contained: no dependencies on other plugins such as cordova-plugin-file
- Windows 10 UWP platform version available in [litehelpers / cordova-sqlite-ext](https://github.com/litehelpers/cordova-sqlite-ext) and Windows 8.1/Windows Phone 8.1/Windows 10 platform version available in [litehelpers / Cordova-sqlite-legacy](https://github.com/litehelpers/Cordova-sqlite-legacy) use the performant C++ [doo / SQLite3-WinRT](https://github.com/doo/SQLite3-WinRT) component.
- [SQLCipher](https://www.zetetic.net/sqlcipher/) support for Android/iOS/macOS/Windows is available in: [litehelpers / Cordova-sqlcipher-adapter](https://github.com/litehelpers/Cordova-sqlcipher-adapter)
- Intellectual property:
  - All source code is tracked to the original author in git
  - Major authors are tracked in AUTHORS.md
  - License of each component is tracked in LICENSE.md
  - History of this project is also described in HISTORY.md

**TIP:** It is possible to migrate from Cordova to a pure native solution and continue using the data stored by this plugin.

<!-- END Highlights -->

## Some apps using this plugin

TBD *your app here*

<!-- END Some apps using this plugin -->

## Security

### Security of sensitive data

According to [Web SQL Database API 7.2 Sensitivity of data](https://www.w3.org/TR/webdatabase/#sensitivity-of-data):
>User agents should treat persistently stored data as potentially sensitive; it's quite possible for e-mails, calendar appointments, health records, or other confidential documents to be stored in this mechanism.
>
>To this end, user agents should ensure that when deleting data, it is promptly deleted from the underlying storage.

Unfortunately this plugin will not actually overwrite the deleted content unless the [secure_delete PRAGMA](https://www.sqlite.org/pragma.html#pragma_secure_delete) is used.

### SQL injection

As "strongly recommended" by [Web SQL Database API 8.5 SQL injection](https://www.w3.org/TR/webdatabase/#sql-injection):
>Authors are strongly recommended to make use of the `?` placeholder feature of the `executeSql()` method, and to never construct SQL statements on the fly.

<!-- END Security -->

# Avoiding data loss

- Double-check that the application code follows the documented API for SQL statements, parameter values, success callbacks, and error callbacks.
- For standard Web SQL transactions include a transaction error callback with the proper logic that indicates to the user if data cannot be stored for any reason. In case of individual SQL error handlers be sure to indicate to the user if there is any issue with storing data.
- For single statement and batch transactions include an error callback with logic that indicates to the user if data cannot be stored for any reason.

<!-- Avoiding data loss -->

## Known issues

- iOS/macOS platform version does not support certain rapidly repeated open-and-close or open-and-delete test scenarios due to how the implementation handles background processing
- As described below, auto-vacuum is NOT enabled by default.
- It is possible to request a SQL statement list such as "SELECT 1; SELECT 2" within a single SQL statement string, however the plugin will only execute the first statement and silently ignore the others ref: [litehelpers/Cordova-sqlite-storage#551](https://github.com/litehelpers/Cordova-sqlite-storage/issues/551)
- INSERT statement that affects multiple rows (due to SELECT cause or using TRIGGER(s), for example) does not report proper rowsAffected on Android in case the built-in Android database used (using the `androidDatabaseImplementation` option in `window.sqlitePlugin.openDatabase`)
- Infinity (positive or negative) values are not supported on Android/iOS/macOS due to issues described above including a possible crash on iOS/macOS ref: [litehelpers/Cordova-sqlite-storage#405](https://github.com/litehelpers/Cordova-sqlite-storage/issues/405)
- A stability issue was reported on the iOS version when in use together with [SockJS](http://sockjs.org/) client such as [pusher-js](https://github.com/pusher/pusher-js) at the same time (see [litehelpers/Cordova-sqlite-storage#196](https://github.com/litehelpers/Cordova-sqlite-storage/issues/196)). The workaround is to call sqlite functions and [SockJS](http://sockjs.org/) client functions in separate ticks (using setTimeout with 0 timeout).
- If a sql statement fails for which there is no error handler or the error handler does not return `false` to signal transaction recovery, the plugin fires the remaining sql callbacks before aborting the transaction.
- FIXED in newer plugin versions such as [litehelpers / Cordova-sqlite-storage](https://github.com/litehelpers/Cordova-sqlite-storage), [litehelpers / cordova-sqlite-ext](https://github.com/litehelpers/cordova-sqlite-ext), [litehelpers / Cordova-sqlite-evcore-extbuild-free](https://github.com/litehelpers/Cordova-sqlite-evcore-extbuild-free): In case of an error, the error `code` member is bogus on Android and Windows.
- Possible crash on Android when using Unicode emoji and other 4-octet UTF-8 characters due to [Android bug 81341](https://code.google.com/p/android/issues/detail?id=81341), which *should* be fixed in Android 6.x
- Close/delete database bugs described below.
- When a database is opened and deleted without closing, the iOS/macOS platform version is known to leak resources.
- It is NOT possible to open multiple databases with the same name but in different locations (iOS/macOS platform version).
- Incorrect or missing insertId/rowsAffected in results for INSERT/UPDATE/DELETE SQL statements with extra semicolon(s) in the beginning for Android (android.database implementation _using the androidDatabaseImplementation: 2 setting_)
- Problems reported with PhoneGap Build in the past:
  - PhoneGap Build Hydration.
  - Apparently FIXED: ~~PhoneGap Build may fail to build the iOS version unless the name of the app starts with an uppercase and contains no spaces (see [litehelpers/Cordova-sqlite-storage#243](https://github.com/litehelpers/Cordova-sqlite-storage/issues/243); [Wizcorp/phonegap-facebook-plugin#830](https://github.com/Wizcorp/phonegap-facebook-plugin/issues/830); [phonegap/build#431](https://github.com/phonegap/build/issues/431)).~~

Issues fixed in some newer version branches:
- In case of an error, the error `code` member is bogus on Android
- iOS platform version generates extra logging in release version
- iOS platform version may crash if deleteDatabase is called with an object in place of the database name
- readTransaction does not reject ALTER, REINDEX, and REPLACE operations
- readTransaction does not reject modification statements with extra semicolon(s) in the beginning
- extra executeSql callbacks triggered in a transaction after a failure that was not recovered by an error callback that returns false
- does not signal an error in case of excess parameter argument values given on iOS/macOS

<!-- END Known issues -->

## Other limitations

- The db version, display name, and size parameter values are not supported and will be ignored.
- Absolute and relative subdirectory path(s) are not tested or supported.
- This plugin will not work before the callback for the 'deviceready' event has been fired, as described in **Usage**. (This is consistent with the other Cordova plugins.)
- Extremely large records are not supported by this plugin version. TBD: specify maximum record; FUTURE TBD: to be fixed in [litehelpers / Cordova-sqlite-evcore-extbuild-free](https://github.com/litehelpers/Cordova-sqlite-evcore-extbuild-free) (available with GPL or commercial license options)
- This plugin version will not work within a web worker (not properly supported by the Cordova framework). Use within a web worker is supported for Android/iOS in: [litehelpers / Cordova-sqlite-evplus-legacy-workers-free](https://github.com/litehelpers/Cordova-sqlite-evplus-legacy-workers-free) (available with GPL or premium commercial license options)
- In-memory database `db=window.sqlitePlugin.openDatabase({name: ':memory:', ...})` is currently not supported.
- The Android version cannot work with more than 100 open db files (due to the threading model used).
- UNICODE `\u2028` (line separator) and `\u2029` (paragraph separator) characters are currently not supported and known to be broken on Android version due to JSON issue reported in [cordova/cordova-discuss#57](https://github.com/cordova/cordova-discuss/issues/57) (workaround fix for iOS/macOS in this version branch). There *may* be a similar issue with certain other UNICODE characters on Android (needs further investigation).
- _The BLOB data type_ is not fully supported on Windows. SELECT BLOB in Base64 format is supported by [litehelpers / cordova-sqlite-ext](https://github.com/litehelpers/cordova-sqlite-ext) (permissive license terms) and [litehelpers / Cordova-sqlite-evcore-extbuild-free](https://github.com/litehelpers/Cordova-sqlite-evcore-extbuild-free) (GPL or commercial license options).
- Truncation in case of UNICODE `\u0000` (same as `\0`) character on Android (default Android-sqlite-connector database implementation) and Windows
- Case-insensitive matching and other string manipulations on Unicode characters, which is provided by optional ICU integration in the sqlite source and working with recent versions of Android, is not supported for any target platforms.
- iOS/macOS platform version uses a thread pool but with only one thread working at a time due to "synchronized" database access
- Some large query results may be slow, also due to the JSON implementation.
- UPDATE/DELETE with LIMIT or ORDER BY is not supported.
- WITH clause is not supported by some older Android/iOS versions.
- User-defined savepoints are not supported and not expected to be compatible with the transaction locking mechanism used by this plugin. In addition, the use of BEGIN/COMMIT/ROLLBACK statements is not supported.
- Problems have been reported when using this plugin with Crosswalk (for Android). It may help to install Crosswalk as a plugin instead of using Crosswalk to create the project.
- Does not work with [axemclion / react-native-cordova-plugin](https://github.com/axemclion/react-native-cordova-plugin) since the `window.sqlitePlugin` object is *not* properly exported (ES5 feature). It is recommended to use [andpor / react-native-sqlite-storage](https://github.com/andpor/react-native-sqlite-storage) for SQLite database access with React Native Android/iOS instead.

<!-- END Other limitations -->

## Further testing needed

- Integration with PhoneGap developer app
- Use within [InAppBrowser](http://docs.phonegap.com/en/edge/cordova_inappbrowser_inappbrowser.md.html)
- Use within an iframe (see [litehelpers/Cordova-sqlite-storage#368 (comment)](https://github.com/litehelpers/Cordova-sqlite-storage/issues/368#issuecomment-154046367))
- Date/time handling
- Maximum record size supported
- Actual behavior when using SAVEPOINT(s)
- R-Tree is not fully tested with Android
- UNICODE characters not fully tested
- Use with TRIGGER(s), JOIN and ORDER BY RANDOM
- TODO add some *more* REGEXP tests
- UPDATE/DELETE with LIMIT or ORDER BY (newer Android/iOS versions)
- Integration with JXCore for Cordova (must be built without sqlite(3) built-in)
- Delete an open database inside a statement or transaction callback.
- WITH clause (not supported by some older sqlite3 versions)
- Handling of invalid transaction and transaction.executeSql arguments
- Use of database locations on macOS
- Extremely large and small INTEGER and REAL values ref: [litehelpers/Cordova-sqlite-storage#627](https://github.com/litehelpers/Cordova-sqlite-storage/issues/627))
- More emojis and other 4-octet UTF-8 characters
- `?NNN`/`:AAA`/`@AAAA`/`$AAAA` parameter placeholders ref: <https://www.sqlite.org/lang_expr.html#varparam>, <https://www.sqlite.org/c3ref/bind_blob.html>)
- Single-statement and SQL batch transaction calls with invalid arguments (TBD behavior subject to change)

<!-- END Further testing needed -->

## Some tips and tricks

- If you run into problems and your code follows the asynchronous HTML5/[Web SQL](http://www.w3.org/TR/webdatabase/) transaction API, you can try opening a test database using `window.openDatabase` and see if you get the same problems.
- In case your database schema may change, it is recommended to keep a table with one row and one column to keep track of your own schema version number. It is possible to add it later. The recommended schema update procedure is described below.

<!-- END Some tips and tricks -->

## Pitfalls

### Some common pitfall(s)

- If a database is opened using the standard `window.openDatabase` call it will not have any of the benefits of this plugin and features such as the `sqlBatch` call would not be available.
- It is NOT allowed to execute sql statements on a transaction that has already finished, as described below. This is consistent with the HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/).
- The plugin class name starts with "SQL" in capital letters, but in Javascript the `sqlitePlugin` object name starts with "sql" in small letters.
- Attempting to open a database before receiving the 'deviceready' event callback.
- Inserting STRING into ID field
- Auto-vacuum is NOT enabled by default. It is recommended to periodically VACUUM the database.
- Transactions on a database are run sequentially. A large transaction could block smaller transactions requested afterwards.

### Some weird pitfall(s)

- intent whitelist: blocked intent such as external URL intent *may* cause this and perhaps certain Cordova plugin(s) to misbehave (see [litehelpers/Cordova-sqlite-storage#396](https://github.com/litehelpers/Cordova-sqlite-storage/issues/396))

### Angular/ngCordova/Ionic-related pitfalls

- Angular/ngCordova/Ionic controller/factory/service callbacks may be triggered before the 'deviceready' event is fired
- As discussed in [litehelpers/Cordova-sqlite-storage#355](https://github.com/litehelpers/Cordova-sqlite-storage/issues/355), it may be necessary to install ionic-plugin-keyboard
- Navigation items such as root page can be tricky on Ionic 2 ref: [litehelpers/Cordova-sqlite-storage#613](https://github.com/litehelpers/Cordova-sqlite-storage/issues/613)

### General Cordova pitfalls

Documented in: [brodybits / Avoiding-some-Cordova-pitfalls](https://github.com/brodybits/Avoiding-some-Cordova-pitfalls)

<!-- END pitfalls -->

## Major TODOs

- Integrate with IndexedDBShim and some other libraries such as Sequelize, Squel.js, WebSqlSync, Persistence.js, Knex, etc.
- Version with proper BLOB support

## For future considertion

- Auto-vacuum option
- Browser platform

## Alternatives

### Other versions

- [litehelpers / Cordova-sqlite-evplus-legacy-workers-free](https://github.com/litehelpers/Cordova-sqlite-evplus-legacy-workers-free) - _version with support for web workers, includes internal memory improvements (Android/iOS) and iOS Unicode character fixes from this project (GPL or premium commercial license options)_
- [litehelpers / Cordova-sqlite-evcore-extbuild-free](https://github.com/litehelpers/Cordova-sqlite-evcore-extbuild-free) - Enhancements for Android: JSON and SQL statement handling implemented in C, supports larger transactions and handles large SQL batches in less than half the time as this version. Supports arbitrary database location on Android. Support for build environments such as PhoneGap Build and Intel XDK. Available with GPL or commercial license options. Also includes REGEXP (Android/iOS/macOS) and SELECT BLOB in Base64 format (all platforms Android/iOS/macOS/Windows).
- [litehelpers / Cordova-sqlite-storage](https://github.com/litehelpers/Cordova-sqlite-storage) - Cordova sqlite storage plugin with _permissive license terms_
- [litehelpers / cordova-sqlite-ext](https://github.com/litehelpers/cordova-sqlite-ext) - version with REGEXP (Android/iOS/macOS), SELECT BLOB in Base64 format (all platforms Android/iOS/macOS/Windows), and pre-populated databases (all platforms Android/iOS/macOS/Windows) _with permissive license terms_
- [litehelpers / Cordova-sqlcipher-adapter](https://github.com/litehelpers/Cordova-sqlcipher-adapter) - supports [SQLCipher](https://www.zetetic.net/sqlcipher/) for Android/iOS/macOS/Windows _with permissive license terms_
- [litehelpers / Cordova-sqlite-legacy](https://github.com/litehelpers/Cordova-sqlite-legacy) - maintenance of WP(7/8) version-working with the other supported platforms Android/iOS/Windows 8.1(+)/Windows Phone 8.1(+) _with permissive license terms_
- Adaptation for React Native Android and iOS: [andpor / react-native-sqlite-storage](https://github.com/andpor/react-native-sqlite-storage)
- Original version for iOS (with a slightly different transaction API): [davibe / Phonegap-SQLitePlugin](https://github.com/davibe/Phonegap-SQLitePlugin)

<!-- END Other versions -->

### Other SQLite adapter projects

- [object-layer / AnySQL](https://github.com/object-layer/anysql) - Unified SQL API over multiple database engines
- [samikrc / CordovaSQLite](https://github.com/samikrc/CordovaSQLite) - Simpler sqlite plugin with a simpler API and browser platform
- [nolanlawson / sqlite-plugin-2](https://github.com/nolanlawson/sqlite-plugin-2) - Simpler fork/rewrite
- [nolanlawson / node-websql](https://github.com/nolanlawson/node-websql) - Web SQL API implementation for Node.js
- [an-rahulpandey / cordova-plugin-dbcopy](https://github.com/an-rahulpandey/cordova-plugin-dbcopy) - Alternative way to copy pre-populated database
- [EionRobb / phonegap-win8-sqlite](https://github.com/EionRobb/phonegap-win8-sqlite) - WebSQL add-on for Win8/Metro apps (perhaps with a different API), using an old version of the C++ library from [SQLite3-WinRT Component](https://github.com/doo/SQLite3-WinRT) (as referenced by [01org / cordova-win8](https://github.com/01org/cordova-win8))
- [SQLite3-WinRT Component](https://github.com/doo/SQLite3-WinRT) - C++ component that provides a nice SQLite API with promises for WinJS
- [01org / cordova-win8](https://github.com/01org/cordova-win8) - old, unofficial version of Cordova API support for Windows 8 Metro that includes an old version of the C++ [SQLite3-WinRT Component](https://github.com/doo/SQLite3-WinRT)
- [Microsoft / cordova-plugin-websql](https://github.com/Microsoft/cordova-plugin-websql) - Windows 8(+) and Windows Phone 8(+) WebSQL plugin versions in C#
- [Thinkwise / cordova-plugin-websql](https://github.com/Thinkwise/cordova-plugin-websql) - fork of [Microsoft / cordova-plugin-websql](https://github.com/Microsoft/cordova-plugin-websql) that supports asynchronous execution
- [MetaMemoryT / websql-client](https://github.com/MetaMemoryT/websql-client) - provides the same API and connects to [websql-server](https://github.com/MetaMemoryT/websql-server) through WebSockets.

<!-- END Other SQLite adapter projects -->

### Alternative solutions

- Use [phearme / cordova-ContentProviderPlugin](https://github.com/phearme/cordova-ContentProviderPlugin) to query content providers on Android devices
- [ABB-Austin / cordova-plugin-indexeddb-async](https://github.com/ABB-Austin/cordova-plugin-indexeddb-async) - Asynchronous IndexedDB plugin for Cordova that uses [axemclion / IndexedDBShim](https://github.com/axemclion/IndexedDBShim) (Browser/iOS/Android/Windows) and [Thinkwise / cordova-plugin-websql](https://github.com/Thinkwise/cordova-plugin-websql) - (Windows)
- Another sqlite binding for React-Native (iOS version): [almost/react-native-sqlite](https://github.com/almost/react-native-sqlite)
- Use [NativeScript](https://www.nativescript.org) with its web view and [NathanaelA / nativescript-sqlite](https://github.com/Natha
naelA/nativescript-sqlite) (Android and/or iOS)
- Standard HTML5 [local storage](https://en.wikipedia.org/wiki/Web_storage#localStorage)
- [Realm.io](https://realm.io/)

<!-- END Alternative solutions -->

# Usage

## Self-test functions

To verify that both the Javascript and native part of this plugin are installed in your application:

```js
window.sqlitePlugin.echoTest(successCallback, errorCallback);
```

To verify that this plugin is able to open, populate, read, update, and delete a test database (named `___$$$___litehelpers___$$$___test___$$$___.db`) properly:

```js
window.sqlitePlugin.selfTest(successCallback, errorCallback);
```

**IMPORTANT:** Please wait for the 'deviceready' event (see below for an example).

## General

- Drop-in replacement for HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/): the only change should be to replace the static `window.openDatabase()` factory call with `window.sqlitePlugin.openDatabase()`, with parameters as documented below. (Some known deviations are documented in newer version branches.)
- Single-page application design is recommended.
- In case of a multi-page application the JavaScript used by each page must use `sqlitePlugin.openDatabase` to open the database access handle object before it can access the data.

**NOTE:** If a sqlite statement in a transaction fails with an error, the error handler *must* return `false` in order to recover the transaction. This is correct according to the HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/) standard. This is different from the WebKit implementation of Web SQL in Android and iOS which recovers the transaction if a sql error hander returns a non-`true` value.

## Opening a database

There are two options to open a database access object:
- **Recommended:** `var db = window.sqlitePlugin.openDatabase({name: 'my.db', location: 'default'}, successcb, errorcb);`
- **Classical:** `var db = window.sqlitePlugin.openDatabase("myDatabase.db", "1.0", "Demo", -1);`

The `location` option is used to specify the database subdirectory location (iOS/macOS *only*):
- ~~`0`: `Documents` - visible to iTunes and backed up by iCloud~~ (disabled in this version)
- ~~`1`: `Library` - backed up by iCloud, *NOT* visible to iTunes~~ (disabled in this version)
- `2` *(default)*: `Library/LocalDatabase` - *NOT* visible to iTunes and *NOT* backed up by iCloud (same as using "default")

**WARNING:** The new "default" location value is *NOT* the same as the old default location _(in other version such as cordova-sqlite-storage and cordova-sqlite-ext)_ and would break an upgrade for an app that was using the old default value (0) on iOS.

_NOT SUPPORTED by this version (TBD):_ ~~To specify a different location (affects iOS/macOS *only*):~~

```js
var db = window.sqlitePlugin.openDatabase({name: 'my.db', iosDatabaseLocation: 'Library'}, successcb, errorcb);
```

where the `iosDatabaseLocation` option may be set to one of the following choices:
- `default`: `Library/LocalDatabase` subdirectory - *NOT* visible to iTunes and *NOT* backed up by iCloud
- ~~`Library`: `Library` subdirectory - backed up by iCloud, *NOT* visible to iTunes~~ _(disabled in this version)_
- ~~`Documents`: `Documents` subdirectory - visible to iTunes and backed up by iCloud~~ _(disabled in this version)_

**WARNING:** Again, the new "default" iosDatabaseLocation value is *NOT* the same as the old default location _(in other version such as cordova-sqlite-storage and cordova-sqlite-ext)_ and would break an upgrade for an app using the old default value (0) on iOS.

*ALTERNATIVE (deprecated):*
- `var db = window.sqlitePlugin.openDatabase({name: "my.db", location: 2}, successcb, errorcb);`

with the `location` option set to one the following choices (affects iOS *only*):
- ~~`0`~~ (default): `Documents` - visible to iTunes and backed up by iCloud~~ _(disabled in this version)_
- ~~`1`: `Library` - backed up by iCloud, *NOT* visible to iTunes~~ _(disabled in this version)_
- `2`: `Library/LocalDatabase` - *NOT* visible to iTunes and *NOT* backed up by iCloud (same as using "default")

**IMPORTANT:** Please wait for the 'deviceready' event, as in the following example:

```js
// Wait for Cordova to load
document.addEventListener('deviceready', onDeviceReady, false);

// Cordova is ready
function onDeviceReady() {
  var db = window.sqlitePlugin.openDatabase({name: 'my.db', location: 'default'});
  // ...
}
```

The successcb and errorcb callback parameters are optional but can be extremely helpful in case anything goes wrong. For example:

```js
window.sqlitePlugin.openDatabase({name: 'my.db', location: 'default'}, function(db) {
  db.transaction(function(tx) {
    // ...
  }, function(err) {
    console.log('Open database ERROR: ' + JSON.stringify(err));
  });
});
```

If any sql statements or transactions are attempted on a database object before the openDatabase result is known, they will be queued and will be aborted in case the database cannot be opened.

**DATABASE NAME NOTES:**

- Database file names with slash (`/`) character(s) are not supported and not expected to work.
- Database file names with ASCII control characters such as tab, vertical tab, carriage return, line feed, form feed, and backspace are not supported and do not work on Windows.
- Some other ASCII characters not supported and not working on Windows: `*` `<` `>` `?` `\` `"` `|`
- Database file names with emojis and other 4-octet UTF-8 characters are NOT RECOMMENDED.

**OTHER NOTES:**
- The database file name should include the extension, if desired.
- It is possible to open multiple database access handle objects for the same database.
- The database handle access object can be closed as described below.

**Web SQL replacement tip:**

To overwrite `window.openDatabase`:

```Javascript
window.openDatabase = function(dbname, ignored1, ignored2, ignored3) {
  return window.sqlitePlugin.openDatabase({name: dbname, location: 'default'});
};
```

### Pre-populated database(s)

Put the database file in the `www` directory and open the database like:

```js
var db = window.sqlitePlugin.openDatabase({name: "my.db", createFromLocation: 1});
```

**IMPORTANT NOTES:**

- Put the pre-populated database file in the `www` subdirectory.
- The pre-populated database file name must match **exactly** the file name given in `openDatabase`. This plugin does *not* use an automatic extension.
- The pre-populated database file is ignored if the database file with the same name already exists in the database file location.

**TIP:** If you don't see the data from the pre-populated database file, completely remove your app and try it again!

**Alternative:** You can also use [an-rahulpandey / cordova-plugin-dbcopy](https://github.com/an-rahulpandey/cordova-plugin-dbcopy) to install a pre-populated database

**Samples and tutorials:**
- http://redwanhilali.com/ionic-sqlite/
- Example by [@jdnichollsc](https://github.com/jdnichollsc) using Ionic Framework, ngCordova and promises: https://gist.github.com/jdnichollsc/9ac79aaa3407e92677ba
- Tutorial using *alternative solution at [an-rahulpandey / cordova-plugin-dbcopy](https://github.com/an-rahulpandey/cordova-plugin-dbcopy)* (Android/iOS): https://blog.nraboy.com/2015/01/deploy-ionic-framework-app-pre-filled-sqlite-db/
- https://github.com/brodybits/Cordova-pre-populated-db-example-android (based on Cordova 2.7)

### Android sqlite implementation

By default, this plugin uses [Android-sqlite-connector](https://github.com/liteglue/Android-sqlite-connector), which is lightweight and should be more efficient than the built-in Android database classes. To use the built-in Android database classes instead:

```js
var db = window.sqlitePlugin.openDatabase({name: "my.db", androidDatabaseImplementation: 2});
```

**NOTE:** The internal memory improvements do *not* apply to the use of the built-in Android database classes.

### Workaround for Android db locking issue

[litehelpers/Cordova-sqlite-storage#193](https://github.com/litehelpers/Cordova-sqlite-storage/issues/193) was reported (as observed by several app developers) that on some newer versions of the Android database classes, if the app is stopped or aborted without closing the database then:
- (sometimes) there is an unexpected database lock
- the data that was inserted is lost.

The cause of this issue remains unknown. Of interest: [android / platform_external_sqlite commit d4f30d0d15](https://github.com/android/platform_external_sqlite/commit/d4f30d0d1544f8967ee5763c4a1680cb0553039f) which references and includes the sqlite commit at: http://www.sqlite.org/src/info/6c4c2b7dba

There is an optional workaround that simply closes and reopens the database file at the end of every transaction that is committed. The workaround is enabled by opening the database with options as follows:

```js
var db = window.sqlitePlugin.openDatabase({
  name: 'my.db',
  location: 'default',
  androidDatabaseImplementation: 2,
  androidLockWorkaround: 1
});
```

**IMPORTANT NOTE:** This workaround is *only* applied when using `db.sqlBatch` or `db.transaction()`, *not* applied when running `executeSql()` on the database object.

<!-- END Workaround for Android db locking issue -->

## SQL transactions

The following types of SQL transactions are supported by this version:
- Single-statement transactions
- SQL batch transactions
- Standard asynchronous transactions
- Multi-part transactions

**NOTE:** Transaction requests are kept in one queue per database and executed in sequential order, according to the HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/).

**WARNING:** It is possible to request a SQL statement list such as "SELECT 1; SELECT 2" within a single SQL statement string, however the plugin will only execute the first statement and silently ignore the others. This could result in data loss if such a SQL statement list with any INSERT or UPDATE statement(s) are included. For reference: [litehelpers/Cordova-sqlite-storage#551](https://github.com/litehelpers/Cordova-sqlite-storage/issues/551)

### Single-statement transactions

Sample with INSERT:

```Javascript
db.executeSql('INSERT INTO MyTable VALUES (?)', ['test-value'], function (resultSet) {
  console.log('resultSet.insertId: ' + resultSet.insertId);
  console.log('resultSet.rowsAffected: ' + resultSet.rowsAffected);
}, function(error) {
  console.log('SELECT error: ' + error.message);
});
```

Sample with SELECT:

```Javascript
db.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (resultSet) {
  console.log('got stringlength: ' + resultSet.rows.item(0).stringlength);
}, function(error) {
  console.log('SELECT error: ' + error.message);
});
```

**NOTE/minor bug:** The object returned by `resultSet.rows.item(rowNumber)` is **not** immutable. In addition, multiple calls to `resultSet.rows.item(rowNumber)` with the same `rowNumber` on the same `resultSet` object return the same object. For example, the following code will show `Second uppertext result: ANOTHER`:

```Javascript
db.executeSql("SELECT UPPER('First') AS uppertext", [], function (resultSet) {
  var obj1 = resultSet.rows.item(0);
  obj1.uppertext = 'ANOTHER';
  console.log('Second uppertext result: ' + resultSet.rows.item(0).uppertext);
  console.log('SELECT error: ' + error.message);
});
```

<!-- END Single-statement transactions -->

### SQL batch transactions

Sample:

```Javascript
db.sqlBatch([
  'DROP TABLE IF EXISTS MyTable',
  'CREATE TABLE MyTable (SampleColumn)',
  [ 'INSERT INTO MyTable VALUES (?)', ['test-value'] ],
], function() {
  db.executeSql('SELECT * FROM MyTable', [], function (resultSet) {
    console.log('Sample column value: ' + resultSet.rows.item(0).SampleColumn);
  });
}, function(error) {
  console.log('Populate table error: ' + error.message);
});
```

In case of an error, all changes in a sql batch are automatically discarded using ROLLBACK.

<!-- END SQL batch transactions -->

### Standard asynchronous transactions

Standard asynchronous transactions follow the HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/) which is very well documented and uses BEGIN and COMMIT or ROLLBACK to keep the transactions failure-safe. Here is a simple example:

```Javascript
db.transaction(function(tx) {
  tx.executeSql('DROP TABLE IF EXISTS MyTable');
  tx.executeSql('CREATE TABLE MyTable (SampleColumn)');
  tx.executeSql('INSERT INTO MyTable VALUES (?)', ['test-value'], function(tx, resultSet) {
    console.log('resultSet.insertId: ' + resultSet.insertId);
    console.log('resultSet.rowsAffected: ' + resultSet.rowsAffected);
  }, function(tx, error) {
    console.log('INSERT error: ' + error.message);
  });
}, function(error) {
  console.log('transaction error: ' + error.message);
}, function() {
  console.log('transaction ok');
});
```

In case of a read-only transaction, it is possible to use `readTransaction` which will not use BEGIN, COMMIT, or ROLLBACK:

```Javascript
db.readTransaction(function(tx) {
  tx.executeSql("SELECT UPPER('Some US-ASCII text') AS uppertext", [], function(tx, resultSet) {
    console.log("resultSet.rows.item(0).uppertext: " + resultSet.rows.item(0).uppertext);
  }, function(tx, error) {
    console.log('SELECT error: ' + error.message);
  });
}, function(error) {
  console.log('transaction error: ' + error.message);
}, function() {
  console.log('transaction ok');
});
```

**WARNING:** It is NOT allowed to execute sql statements on a transaction after it has finished. Here is an example from the **Populating Cordova SQLite storage with the JQuery API post** at <http://www.brodybits.com/cordova/sqlite/api/jquery/2015/10/26/populating-cordova-sqlite-storage-with-the-jquery-api.html>:

```Javascript
  // BROKEN SAMPLE:
  var db = window.sqlitePlugin.openDatabase({name: "test.db"});
  db.executeSql("DROP TABLE IF EXISTS tt");
  db.executeSql("CREATE TABLE tt (data)");

  db.transaction(function(tx) {
    $.ajax({
      url: 'https://api.github.com/users/litehelpers/repos',
      dataType: 'json',
      success: function(res) {
        console.log('Got AJAX response: ' + JSON.stringify(res));
        $.each(res, function(i, item) {
          console.log('REPO NAME: ' + item.name);
          tx.executeSql("INSERT INTO tt values (?)", JSON.stringify(item.name));
        });
      }
    });
  }, function(e) {
    console.log('Transaction error: ' + e.message);
  }, function() {
    // Check results:
    db.executeSql('SELECT COUNT(*) FROM tt', [], function(res) {
      console.log('Check SELECT result: ' + JSON.stringify(res.rows.item(0)));
    });
  });
```

You can find more details and a step-by-step description how to do this right in the **Populating Cordova SQLite storage with the JQuery API** post at: <http://www.brodybits.com/cordova/sqlite/api/jquery/2015/10/26/populating-cordova-sqlite-storage-with-the-jquery-api.html>

**NOTE/minor bug:** Just like the single-statement transaction described above, the object returned by `resultSet.rows.item(rowNumber)` is **not** immutable. In addition, multiple calls to `resultSet.rows.item(rowNumber)` with the same `rowNumber` on the same `resultSet` object return the same object. For example, the following code will show `Second uppertext result: ANOTHER`:

```Javascript
db.readTransaction(function(tx) {
  tx.executeSql("SELECT UPPER('First') AS uppertext", [], function(tx, resultSet) {
    var obj1 = resultSet.rows.item(0);
    obj1.uppertext = 'ANOTHER';
    console.log('Second uppertext result: ' + resultSet.rows.item(0).uppertext);
    console.log('SELECT error: ' + error.message);
  });
});
```

**FUTURE TBD:** It should be possible to get a row result object using `resultSet.rows[rowNumber]`, also in case of a single-statement transaction. This is non-standard but is supported by the Chrome desktop browser.

### Multi-part transactions

Sample (with success and error callbacks):

```Javascript
var tx = db.beginTransaction();
tx.executeSql("DROP TABLE IF EXISTS mytable");
tx.executeSql("CREATE TABLE mytable (myfield)");

tx.executeSql("INSERT INTO mytable values(?)", ['test value']);
tx.executeSql("SELECT * from mytable", [], function(tx, res) {
  console.log("Got value: " + res.rows.item(0).myfield);
}, function(tx, e) {
  console.log("Ignore unexpected error callback with message: " + e.message);
  return false;
});

tx.end(function() {
  console.log('Optional success callback fired');
}, function(e) {
  console.log("Optional error callback fired with message: " + e.message);
});
```

Sample with abort:

```Javascript
var tx = db.beginTransaction();
tx.executeSql("INSERT INTO mytable values(?)", ['wrong data']);
tx.abort(function() {
  console.log('Optional callback');
});
```

IMPORTANT NOTES:
- In case a `tx.executeSql` call results in an error and it does not have an error callback or the error callback does NOT return `false`, the transaction will be aborted *immediately* with a ROLLBACK ~~upon the `tx.end` call~~.
- **BUG:** If a `tx.executeSql` call results in an error for which there is no error callback, the error callback does NOT return `false`, or the error callback throws an exception, the transaction is silently aborted and no `tx.end` callbacks will be fired.
- When a multi-part transaction is started by the `db.beginTransaction` call, all other transactions are blocked until the multi-part transaction is either completed successfully or aborted (with a ROLLBACK).

<!-- END Multi-part transactions -->

## Background processing

The threading model depends on which version is used:
- For Android, one background thread per db;
- for iOS/macOS, background processing using a very limited thread pool (only one thread working at a time);
- for Windows, no background processing (for future consideration).

<!-- END Background processing -->

## Sample with PRAGMA feature

Creates a table, adds a single entry, then queries the count to check if the item was inserted as expected. Note that a new transaction is created in the middle of the first callback.

```js
// Wait for Cordova to load
document.addEventListener('deviceready', onDeviceReady, false);

// Cordova is ready
function onDeviceReady() {
  var db = window.sqlitePlugin.openDatabase({name: 'my.db', location: 'default'});

  db.transaction(function(tx) {
    tx.executeSql('DROP TABLE IF EXISTS test_table');
    tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data text, data_num integer)');

    // demonstrate PRAGMA:
    db.executeSql("pragma table_info (test_table);", [], function(res) {
      console.log("PRAGMA res: " + JSON.stringify(res));
    });

    tx.executeSql("INSERT INTO test_table (data, data_num) VALUES (?,?)", ["test", 100], function(tx, res) {
      console.log("insertId: " + res.insertId + " -- probably 1");
      console.log("rowsAffected: " + res.rowsAffected + " -- should be 1");

      db.transaction(function(tx) {
        tx.executeSql("select count(id) as cnt from test_table;", [], function(tx, res) {
          console.log("res.rows.length: " + res.rows.length + " -- should be 1");
          console.log("res.rows.item(0).cnt: " + res.rows.item(0).cnt + " -- should be 1");
        });
      });

    }, function(e) {
      console.log("ERROR: " + e.message);
    });
  });
}
```

**NOTE:** PRAGMA statements must be executed in `executeSql()` on the database object (i.e. `db.executeSql()`) and NOT within a transaction.

<!-- END Sample with PRAGMA feature -->

## Sample with transaction-level nesting

In this case, the same transaction in the first executeSql() callback is being reused to run executeSql() again.

```js
// Wait for Cordova to load
document.addEventListener('deviceready', onDeviceReady, false);

// Cordova is ready
function onDeviceReady() {
  var db = window.sqlitePlugin.openDatabase({name: 'my.db', location: 'default'});

  db.transaction(function(tx) {
    tx.executeSql('DROP TABLE IF EXISTS test_table');
    tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data text, data_num integer)');

    tx.executeSql("INSERT INTO test_table (data, data_num) VALUES (?,?)", ["test", 100], function(tx, res) {
      console.log("insertId: " + res.insertId + " -- probably 1");
      console.log("rowsAffected: " + res.rowsAffected + " -- should be 1");

      tx.executeSql("select count(id) as cnt from test_table;", [], function(tx, res) {
        console.log("res.rows.length: " + res.rows.length + " -- should be 1");
        console.log("res.rows.item(0).cnt: " + res.rows.item(0).cnt + " -- should be 1");
      });

    }, function(tx, e) {
      console.log("ERROR: " + e.message);
    });
  });
}
```

This case will also works with Safari (WebKit), assuming you replace `window.sqlitePlugin.openDatabase` with `window.openDatabase`.

<!-- END Sample with transaction-level nesting -->

## Attach to another database

To attach to another database in the default location:

```Javascript
db.attach('alias_name', 'dbfilename', optionalSuccessCallback, optionalErrorCallback);
```

**NOTE:** For Android the database *must* be opened with the `androidDatabaseImplementation: 2` option (FUTURE TBD).

### Detach

```Javascript
db.detach('alias_name', optionalSuccessCallback, optionalErrorCallback);
```

### To list attached databases

```Javascript
db.executeSql('PRAGMA database_list', [], function(res) {
  console.log('alias: ' + res.rows.item(1).name);
  console.log('file: ' + res.rows.item(1).file);
});
```

For more information: http://www.sqlite.org/pragma.html#pragma_database_list

## Close a database object

This will invalidate **all** handle access handle objects for the database that is closed:

```js
db.close(successcb, errorcb);
```

It is OK to close the database within a transaction callback but *NOT* within a statement callback. The following example is OK:

```Javascript
db.transaction(function(tx) {
  tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function(tx, res) {
    console.log('got stringlength: ' + res.rows.item(0).stringlength);
  });
}, function(error) {
  // OK to close here:
  console.log('transaction error: ' + error.message);
  db.close();
}, function() {
  // OK to close here:
  console.log('transaction ok');
  db.close(function() {
    console.log('database is closed ok');
  });
});
```

The following example is NOT OK:

```Javascript
// BROKEN:
db.transaction(function(tx) {
  tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function(tx, res) {
    console.log('got stringlength: ' + res.rows.item(0).stringlength);
    // BROKEN - this will trigger the error callback:
    db.close(function() {
      console.log('database is closed ok');
    }, function(error) {
      console.log('ERROR closing database');
    });
  });
});
```

**BUG:** It is currently NOT possible to close a database in a `db.executeSql` callback. For example:

```Javascript
// BROKEN DUE TO BUG:
db.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (res) {
  var stringlength = res.rows.item(0).stringlength;
  console.log('got stringlength: ' + res.rows.item(0).stringlength);

  // BROKEN - this will trigger the error callback DUE TO BUG:
  db.close(function() {
    console.log('database is closed ok');
  }, function(error) {
    console.log('ERROR closing database');
  });
});
```

**SECOND BUG:** When a database connection is closed, any queued transactions are left hanging. All pending transactions should be errored when a database connection is closed.

**NOTE:** As described above, if multiple database access handle objects are opened for the same database and one database handle access object is closed, the database is no longer available for the other database handle objects. Possible workarounds:
- It is still possible to open one or more new database handle objects on a database that has been closed.
- It *should* be OK not to explicitly close a database handle since database transactions are [ACID](https://en.wikipedia.org/wiki/ACID) compliant and the app's memory resources are cleaned up by the system upon termination.

**FUTURE TBD:** `dispose` method on the database access handle object, such that a database is closed once **all** access handle objects are disposed.

<!-- END Close a database object -->

## Delete a database

```js
window.sqlitePlugin.deleteDatabase({name: 'my.db', location: 'default'}, successcb, errorcb);
```

with `location` or `iosDatabaseLocation` parameter *required* as described above for `openDatabase` (affects iOS/macOS *only*)

Alternative supported by this version:

```js
window.sqlitePlugin.deleteDatabase(name: 'my.db', successcb, errorcb);
```

**BUG:** When a database is deleted, any queued transactions for that database are left hanging. TODO: All pending transactions should be errored when a database is deleted.

<!-- END Delete a database -->

## Database schema versions

The transactional nature of the API makes it relatively straightforward to manage a database schema that may be upgraded over time (adding new columns or new tables, for example). Here is the recommended procedure to follow upon app startup:
- Check your database schema version number (you can use `db.executeSql` since it should be a very simple query)
- If your database needs to be upgraded, do the following *within a single transaction* to be failure-safe:
  - Create your database schema version table (single row single column) if it does not exist (you can check the `sqlite_master` table as described at: http://stackoverflow.com/questions/1601151/how-do-i-check-in-sqlite-whether-a-table-exists)
  - Add any missing columns and tables, and apply any other changes necessary

**IMPORTANT:** Since we cannot be certain when the users will actually update their apps, old schema versions will have to be supported for a very long time.

<!-- END Database schema versions -->

## Use with Ionic/ngCordova/Angular

### Ionic 2

Tutorials with Ionic 2:
- <https://www.thepolyglotdeveloper.com/2016/08/using-sqlstorage-instead-sqlite-ionic-2-app/> (title is somewhat misleading, "SQL storage" *does* use this sqlite plugin)
- <https://www.thepolyglotdeveloper.com/2015/12/use-sqlite-in-ionic-2-instead-of-local-storage/> (older tutorial)

Sample for Ionic 2 wanted ref: [litehelpers/Cordova-sqlite-storage#585](https://github.com/litehelpers/Cordova-sqlite-storage/issues/585)

### Ionic 1

Tutorial with Ionic 1: <https://blog.nraboy.com/2014/11/use-sqlite-instead-local-storage-ionic-framework/>

A sample for Ionic 1 is provided at: [litehelpers / Ionic-sqlite-database-example](https://github.com/litehelpers/Ionic-sqlite-database-example)

Documentation at: <http://ngcordova.com/docs/plugins/sqlite/>

Other resource (apparently for Ionic 1): <https://www.packtpub.com/books/content/how-use-sqlite-ionic-store-data>

**NOTE:** Some Ionic and other Angular pitfalls are described above.

<!-- END Use with Ionic/ngCordova/Angular -->

# Installing

## Easy install with Cordova CLI tool

    npm install -g cordova # (in case you don't have cordova)
    cordova create MyProjectFolder com.my.project MyProject && cd MyProjectFolder # if you are just starting
    cordova plugin add https://github.com/litehelpers/Cordova-sqlite-evplus-legacy-attach-detach-free
 
**IMPORTANT:** sometimes you have to update the version for a platform before you can build, like: `cordova prepare ios`

**CLI NOTES:**

- You *may* have to update the platform and plugin version(s) before you can build: `cordova prepare` (or for a specific platform such as iOS: `cordova prepare ios`)
- If you cannot build for a platform after `cordova prepare`, you may have to remove the platform and add it again, such as:

```shell
cordova platform rm ios
cordova platform add ios
```

or more drastically:

```shell
rm -rf platforms
cordova platform add ios
```

<!-- END Easy installation with Cordova CLI tool -->

## Plugin installation sources

- https://github.com/litehelpers/Cordova-sqlite-evplus-legacy-attach-detach-free - latest version

<!-- END Plugin installation sources -->

## Source tree

- `SQLitePlugin.coffee.md`: platform-independent (Literate coffee-script, can be read by recent coffee-script compiler)
- `www`: `SQLitePlugin.js` platform-independent Javascript as generated from `SQLitePlugin.coffee.md` (and checked in!)
- `src`: platform-specific source code
- `spec`: test suite using Jasmine (2.2.0)
- `tests`: very simple Jasmine test suite that is run on Circle CI (Android version) and Travis CI (iOS version) (used as a placeholder)

## Installation test

### Easy installation test

Use `window.sqlitePlugin.echoTest` and/or `window.sqlitePlugin.selfTest` as described above (please wait for the `deviceready` event).

### Quick installation test

Assuming your app has a recent template as used by the Cordova create script, add the following code to the `onDeviceReady` function, after `app.receivedEvent('deviceready');`:

```Javascript
  window.sqlitePlugin.openDatabase({ name: 'hello-world.db', location: 'default' }, function (db) {
    db.executeSql("select length('tenletters') as stringlength", [], function (res) {
      var stringlength = res.rows.item(0).stringlength;
      console.log('got stringlength: ' + stringlength);
      document.getElementById('deviceready').querySelector('.received').innerHTML = 'stringlength: ' + stringlength;
   });
  });
```

<!-- END Installation test -->

# Support

## Policy

Free support is provided on a best-effort basis and is only available in public forums. Please follow the steps below to be sure you have done your best before requesting help.

Commercial support is available by contacting: <sales@litehelpers.net>

## Before asking for help

First steps:
- Verify that you have followed the steps in [brodybits / Cordova-quick-start-checklist](https://github.com/brodybits/Cordova-quick-start-checklist)
- Try the new self-test functions as described above
- Check the troubleshooting steps and pitfalls in [brodybits / Cordova-troubleshooting-guide](https://github.com/brodybits/Cordova-troubleshooting-guide)

and check the following:
- You are using the latest version of the Plugin (Javascript and platform-specific part) from this repository.
- The plugin is installed correctly.
- You have included the correct version of `cordova.js`.
- You have registered the plugin properly in `config.xml`.

If you still cannot get something to work:
- create a fresh, clean Cordova project;
- add this plugin according to the instructions above;
- double-check that you follwed the steps in [brodybits / Cordova-quick-start-checklist](https://github.com/brodybits/Cordova-quick-start-checklist);
- try a simple test program;
- double-check the troubleshooting steps and pitfalls in [brodybits / Cordova-troubleshooting-guide](https://github.com/brodybits/Cordova-troubleshooting-guide)

If you continue to see the issue in the fresh, clean Cordova project:
- Make the simplest test program you can to demonstrate the issue, including the following characteristics:
  - it completely self-contained, i.e. it is using no extra libraries beyond cordova & SQLitePlugin.js;
  - if the issue is with *adding* data to a table, that the test program includes the statements you used to open the database and create the table;
  - if the issue is with *retrieving* data from a table, that the test program includes the statements you used to open the database, create the table, and enter the data you are trying to retrieve.

Then you can [raise the new issue](https://github.com/litehelpers/Cordova-sqlite-evplus-legacy-attach-detach-free/issues/new).

## What will be supported for free

Please make a small, self-contained test program that can demonstrate your problem and post it. Please do not use any other plugins or frameworks than are absolutely necessary to demonstrate your problem.

In case of a problem with a pre-populated database, please post your entire project.

## Support for issues with Angular/"ngCordova"/Ionic

Free support for issues with Angular/"ngCordova"/Ionic will only be provided if you can demonstrate that you can do the same thing without such a framework.
- Make a fresh, clean ngCordova or Ionic project with a test program that demonstrates the issue and post it. Please do not use any other plugins or frameworks unless absolutely necessary to demonstrate your issue.
- Make another project without any form of Angular including ngCordova or Ionic, with the same test program to show that it will work outside Angular/"ngCordova"/Ionic.

## What information is needed for help

Please include the following:
- Which platform(s) (Android/iOS/macOS/Windows)
- Clear description of the issue
- A small, complete, self-contained program that demonstrates the problem, preferably as a Github project. ZIP/TGZ/BZ2 archive available from a public link is OK. No RAR or other such formats please!
- A Cordova project is highly preferred. Intel, MS IDE, or similar project formats should be avoided.

## Please do NOT use any of these formats

- screen casts or videos
- RAR or similar archive formats
- Intel, MS IDE, or similar project formats unless absolutely necessary

## Where to ask for help

Once you have followed the directions above, you may request free support in the following location(s):
- [litehelpers / Cordova-sqlite-help](https://github.com/litehelpers/Cordova-sqlite-help)
- issues page [litehelpers / Cordova-sqlite-evplus-legacy-attach-detach-free / issues](https://github.com/litehelpers/Cordova-sqlite-evplus-legacy-attach-detach-free/issues)

Please include the information described above otherwise.

## Professional support

Professional support is available, please contact: <sales@litehelpers.net>

# Unit tests

Unit testing is done in `spec`.

## running tests from shell

To run the tests from \*nix shell, simply do either:

    ./bin/test.sh ios

or for Android:

    ./bin/test.sh android

To run from a windows powershell (here is a sample for android target):

    .\bin\test.ps1 android

<!-- END Unit tests -->

# Adapters

## Lawnchair Adapter

- [litehelpers / cordova-sqlite-lawnchair-adapter](https://github.com/litehelpers/cordova-sqlite-lawnchair-adapter)

## PouchDB

- [nolanlawson / pouchdb-adapter-cordova-sqlite](https://github.com/nolanlawson/pouchdb-adapter-cordova-sqlite)

# Contributing

## Community

- Testimonials of apps that are using this plugin would be especially helpful.
- Reporting issues can help improve the quality of this plugin.

**NOTE:** As stated above, patches will *NOT* be accepted on this project due to potential licensing issues. Issues with reproduction scenarios will help maintain and improve the quality of this plugin for future users. (It is also helpful if you have a pointer to the code that is causing the issue.)

**WARNING:** Please do NOT propose changes from your default branch. Contributions may be rebased using `git rebase` or `git cherry-pick` and not merged.

- Patches with bug fixes are helpful, especially when submitted with test code.
- Other enhancements welcome for consideration, when submitted with test code and are working for all supported platforms. Increase of complexity should be avoided.
- All contributions may be reused by [@brodybits](https://github.com/brodybits) under another license in the future. Efforts will be taken to give credit for major contributions but it will not be guaranteed.
- Project restructuring, i.e. moving files and/or directories around, should be avoided if possible.
- If you see a need for restructuring, it is better to first discuss it in new issue where alternatives can be discussed before reaching a conclusion. If you want to propose a change to the project structure:
  - Remember to make (and use) a special branch within your fork from which you can send the proposed restructuring;
  - Always use `git mv` to move files & directories;
  - Never mix a move/rename operation with any other changes in the same commit.

<!-- END Contributing -->

## Contact

<sales@litehelpers.net>

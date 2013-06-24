
/**
 * Module dependencies.
 */

var fs = require('fs')
  , ref = require('ref')
  , ffi = require('../')


/**
 * The filename of the sqlite3 database to use.
 */

var dbName = process.argv[2] || 'test.sqlite3'


/**
 * "ref" types that the sqlite3 functions will use.
 */
console.log(process.argv[0])
var sqlite3 = 'void' // `sqlite3` is an "opaque" type, so we don't know its layout
  , sqlite3Ptr = ref.refType(sqlite3)
  , sqlite3PtrPtr = ref.refType(sqlite3Ptr)
  , sqlite3_exec_callback = 'pointer' // TODO: use ffi.Callback when #76 is implemented
  , stringPtr = ref.refType('string') //Cstring *
  , stringPtrPtr = ref.refType(stringPtr) //Cstring **
  , stringPtrPtrPtr =ref.refType(stringPtrPtr) //Cstring ***
  , charPtr = ref.refType('char') //char *
  , charPtrPtr = ref.refType(charPtr) //char **
  , charPtrPtrPtr =ref.refType(charPtrPtr)// char ***
/*
  console.log(charPtr)
    console.log(charPtrPtr)
      console.log(charPtrPtrPtr)
*/

// create FFI'd versions of the libsqlite3 function we're interested in
var SQLite3 = ffi.Library('./sqlite3', {
  'sqlite3_libversion': [ 'string', [ ] ],
  'sqlite3_open': [ 'int', [ 'string', sqlite3PtrPtr ] ],
  'sqlite3_key': [ 'int', [ sqlite3Ptr,'string', 'int' ] ],
  'sqlite3_close': [ 'int', [ sqlite3Ptr ] ],
  'sqlite3_changes': [ 'int', [ sqlite3Ptr ]],
  'sqlite3_exec': [ 'int', [ sqlite3Ptr, 'string', sqlite3_exec_callback, 'void *', stringPtr ] ],
 // 'sqlite3_get_table':['int',[ sqlite3Ptr, 'string','char ***','int *','int *',stringPtr] ],
  //'sqlite3_free_table': [ 'int', [ 'char **' ] ],
})

// print out the "libsqlite3" version number
console.log('Using libsqlite3 version %j...', SQLite3.sqlite3_libversion())

// create a storage area for the db pointer SQLite3 gives us
var db = ref.alloc(sqlite3PtrPtr)

// open the database object
console.log('Opening %j...', dbName)
SQLite3.sqlite3_open(dbName, db)


// we don't care about the `sqlite **`, but rather the `sqlite *` that it's
// pointing to, so we must deref()
db = db.deref()
//SQLite3.sqlite3_key(db,'abcd',4)


// execute a couple SQL queries to create the table "foo" and ensure it's empty
console.log('Creating and/or clearing foo table...')
SQLite3.sqlite3_exec(db, 'CREATE TABLE foo (bar VARCHAR,val VARCHAR,age int);', null, null, null)
SQLite3.sqlite3_exec(db, 'DELETE FROM foo;', null, null, null)

// execute a few INSERT queries into the "foo" table
console.log('Inserting bar 5 times...')
for (var i = 0; i < 5; i++) {
    SQLite3.sqlite3_exec(db, 'INSERT INTO foo (bar,val,age) VALUES(\'baz' + i + '\',\'value'+ i +'\',1);', null, null, null)
    
}

// we can also run queries asynchronously on the thread pool. this is good for
// when you expect a query to take a long time. when running SELECT queries, you
// pass a callback function that gets invoked for each record found. since we're
// running asynchronously, you pass a second callback function that will be
// invoked when the query has completed.
var rowCount = 0

//the callback third parameter define charPtrPtr or  stringPtrPtr  or stringPtr ，how to get column‘s value without the ’bar‘ column
var callback = ffi.Callback('int', ['void *', 'int',stringPtrPtr , stringPtrPtr], function (tmp, cols, argv, colv) {
  var obj = {}
  //var pargv = ref.deref(argv)
  //var pargvnext = pargv.ref()+1
  for (var i = 0; i < cols; i++) {
    var colName = colv.deref()
    var colData = argv.deref()
    obj[colName] = colData
  }
  
  rowCount++

  return 0
})

var b = new Buffer('test')
SQLite3.sqlite3_exec.async(db, 'SELECT * FROM foo;', callback, b, null, function (err, ret) {

  if (err) throw err
  //console.log(b);
  console.log('Total Rows: %j', rowCount)
  console.log('Changes: %j', SQLite3.sqlite3_changes(db))
  console.log('Closing...')
  SQLite3.sqlite3_close(db)
  fs.unlinkSync(dbName)
  fin = true
})



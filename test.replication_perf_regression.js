'use strict';

var PouchDB = require('pouchdb');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();

app.use(bodyParser.json());
app.get('*', count_local_GET);
app.use(require('pouchdb-express-router')(PouchDB));

var _local_GET_count = 0;

function count_local_GET(req, res, next) {
    // undesired behaviour hits this endpoint more times than numDocs
    if (req.url.indexOf('/remote/_local/') === 0) {  
        _local_GET_count++;
    }
    next();
};

require('chai').should();

describe('test.replication_perf_regression.js', function () {
    var server;
    var dbs;

    before(function () {
        server = app.listen(0);
        dbs = { name: 'test', remote: 'http://127.0.0.1:' + server.address().port + '/remote' }
    });

    after(function () {
        return server.close();
    });

    it('#5199 fix excessively long replication loop', function () {

        this.timeout(10000); // mocha timeout increased for this test
        var numDocs = 59;    // uneven number ...  using smaller number for faster test ... feel free to increase
        var docs = [];
        for (var i = 0; i < numDocs; i++) {
            // mix of generation-1 and generation-2 docs
            if (i % 2 === 0) {
                docs.push({
                    //  _id: testUtils.uuid(),
                    _id: 'testdoc_' + i,
                    _rev: '1-x',
                    _revisions: { start: 1, ids: ['x'] }
                });
            } else {
                docs.push({
                    //  _id: testUtils.uuid(),
                    _id: 'testdoc_' + i,
                    _rev: '2-x',
                    _revisions: { start: 2, ids: ['x', 'y'] }
                });
            }
        }

        var db = new PouchDB(dbs.name);
        var remote = new PouchDB(dbs.remote);

        return remote.destroy().then(function () {  // init local & remote db (want both empty)
            return db.destroy()
        }).then(function () {
            db = new PouchDB(dbs.name);
            remote = new PouchDB(dbs.remote);
            return remote.bulkDocs({   // to repro issue: docs exist at remote...nothing at local
                docs: docs,
                new_edits: false
            })
        }).then(function () {
            function replicatePromise(fromDB, toDB) {
                var debouncePauseActiveThrash_TimeoutRef;
                return new Promise(function (resolve, reject) {
                    var replication = fromDB.replicate.to(toDB, {
                        live: true,
                        retry: true,
                        batches_limit: 10,
                        batch_size: 100
                    }).on('paused', function (err) {
                        clearTimeout(debouncePauseActiveThrash_TimeoutRef);
                        if (!err) {
                            // debounce pause -> active -> pause -> active -> pause etc
                            debouncePauseActiveThrash_TimeoutRef = setTimeout(function () {
                                resolve();
                            }, 1500);
                        }
                    }).on('active', function () {
                        clearTimeout(debouncePauseActiveThrash_TimeoutRef);
                    }).on('complete', resolve)
                        .on('error', reject);
                });
            }
            return Promise.all([
                replicatePromise(db, remote),
                replicatePromise(remote, db)
            ]);
        }).then(function () {
            return db.info();
        }).then(function (info) {
            info.doc_count.should.equal(numDocs);    // should have replicated to local db
            _local_GET_count.should.above(0);        // should have hit /remote/_local endpoint at least once
            _local_GET_count.should.below(numDocs);  // _local_GET_count should be significantly below numDocs (~9x)
        })
    });
});

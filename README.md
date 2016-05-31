# pouchdb-replication-perf-regres-test
PouchDB Replication Performance Regression Test #5199 See https://github.com/pouchdb/pouchdb/pull/5199

`npm install`
`npm test` will run a single test: `mocha test.replication_perf_regression.js`

 The first test should fail (with PouchDB 5.3.2)

`npm run toggleFix` (toggles the one line #5199 fix in /node_modules/pouchdb/lib/index.js)

`npm test` (this test should pass!)

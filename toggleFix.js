var fs = require('fs');
var pouchFile = './node_modules/pouchdb/lib/index.js';

fs.readFile(pouchFile, 'utf8', function (err, data) {
    if (err) {
        return console.log(err);
    }

    var oldFix = 'processPendingBatch(changesOpts.live);';
    var newFix = 'processPendingBatch(batches.length === 0 && changesOpts.live);'
    var result;

    if (data.indexOf(oldFix) > -1) {
        console.log('\n', 'Applying #5199 fix to ', pouchFile);
        console.log('\n', oldFix, '-->', '\n', newFix);
        result = data.replace(new RegExp(escapeRegExp(oldFix), 'g'), newFix);
    } else {
        console.log('\n', 'Removing #5199 fix to ', pouchFile);
        console.log('\n', newFix, '-->', '\n', oldFix);
        result = data.replace(new RegExp(escapeRegExp(newFix), 'g'), oldFix);
    }

    fs.writeFile(pouchFile, result, 'utf8', function (err) {
        if (err) return console.log(err);
    });
});

function escapeRegExp(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

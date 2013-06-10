#!/usr/bin/env node

var url = require('url');
var util = require('util');
var request = require('request');
var knox = require('knox');
var Henry = require('henry');
var rc = require('rc')('s3request-token', {
    authenticationBucket: null, // Authentication bucket
    awsMetadataEndpoint: null,  // For testing.
    awsKey: null,               // Leave blank if using STS
    awsSecret: null,            // Leave blank if using STS
    header: null,               // eg: x-foo-bar-token
    payload: null,              // JSON string.
    dryrun: false               // Optionally append a "dryrun" flag on the
                                // payload.
});

if (!rc.header) {
    console.error('Error: header is required');
    process.exit(1);
}
if (!rc.target) {
    console.error('Error: target is required');
    process.exit(1);
}
if (!rc.authenticationBucket) {
    console.error('Error: authenticationBucket is required');
    process.exit(1);
}

var payload;
try {
    payload = JSON.parse(rc.payload);
} catch(e) {
    console.error('Error: payload is not valid json');
    process.exit(1);
}

if (!payload) {
    console.error('Error: refusing to issue request with no payload');
    process.exit(1);
}

var s3 = {};

var _ready = false;
function ready(callback) {
    if (_ready) return callback();

    var creds = { key: rc.awsKey, secret: rc.awsSecret };

    // Populated at bootstrap. Requires henry/knox.
    henry = new Henry({ api: rc.awsMetadataEndpoint });
    henry.add(creds, function(err) {
        var ignorable = ['ETIMEDOUT', 'EHOSTUNREACH', 'ECONNREFUSED', 'Unknown system errno 64'];
        if (err && ignorable.indexOf(err.code) === -1) err = null;

        s3.auth = knox.createClient({
            bucket: rc.authenticationBucket,
            key: creds.key,
            secret: creds.secret,
            token: creds.token
        });

        henry.add(s3.statistics, function(err) {
            if (err && process.env.NODE_ENV != 'test') util.log('Henry error: ' + err);

            _ready = true;
            callback();
        });
    });
}

ready(function() {
    // Generate a signature for a HEAD request to s3 that the receiving server
    // can use to authenticate our requests.
    var path = url.parse(rc.target).path;
    var sig = s3.auth.signedUrl(path, new Date(Date.now() + 36e6), null, 'HEAD');
    sig = new Buffer(url.parse(sig).query).toString('base64');

    var headers = {};
    headers[rc.header] = sig;

    if (rc.dryrun)
        payload.dryrun = true;

    request.post({
         uri: rc.target,
         headers: headers,
         json: payload
    }, function(err, resp) {
        if (!resp)
            console.error('HTTP Error %s\tPayload %s', err.statusCode, JSON.stringify(payload));
        else if (resp.statusCode !== 200)
            console.error('HTTP Error %s\tPayload %s', resp.statusCode, JSON.stringify(payload));
        else
            console.log(resp.body);
    });
});

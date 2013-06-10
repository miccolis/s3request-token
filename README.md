s3 Request token
----------------

Issue a request with a header that can be used to access a resource on s3. This command assumes the path of the resource is the same on your application and in your s3 bucket. So if will attempt to sign a request against `https://example.com/foo/bar` with a token for `s3://exampe-auth/foo/bar`.

This command is essentially an example and only issues POST requests.

## Config

Create 'ini' format config file `.s3request-tokenrc` with a header field name for the token, and a s3 bucket to use for signing.  If you're not using STS you will also need to pass an `awsKey` and `awsSecret` to the command. A minimal config file would look like:

```
header=x-example-token
authenticationBucket=example-auth
```

## Usage

You would then invoke the command like:

`./index.js --target https://example.com/protected/resource --payload '{"foo": "bar"}'`

There is a `--dryrun` flag which appends `dryrun: true` to the json payload, and nothing more. It's up to the server to actually do something with that.

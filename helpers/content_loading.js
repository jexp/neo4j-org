var   http = require('http')
	, https = require('https')
    , request = require("request")
;

var github_personal_token=process.env.GITHUB_TOKEN
var github_client_id=process.env.GITHUB_CLIENT_ID
var github_client_secret=process.env.GITHUB_CLIENT_SECRET
/*
 wiki access: curl -i https://raw.githubusercontent.com/wiki/neo4j-contrib/graphgist/Syntax.asciidoc
 returns raw asciidoc
 content access: curl -u $personal_token:x-oauth-basic https://api.github.com/repos/neo4j-contrib/graphgist/contents/README.md
 content access returns json with base64
 curl -H accept:application/vnd.github.VERSION.raw https://api.github.com/repos/neo4j-contrib/graphgist/contents/README.md

 If you need to make unauthenticated calls but need to use a higher rate limit associated with your OAuth application, you can send over your client ID and secret in the query string.

 $ curl -i 'https://api.github.com/users/whatever?client_id=xxxx&client_secret=yyyy'

 curl -u $personal_token:x-oauth-basic https://api.github.com/rate_limit -> "limit": 5000,
 curl https://api.github.com/rate_limit -> "limit": 60
 */

function load_github_content(locals, name, path, host) {
    locals.content[name] = "Content for " + name + " not found";
    if (!host) host = "raw.githubusercontent.com";
    var url = "https://" + host + "/" + path;
    return load_content(locals, name, url);
}

function load_content(locals, name, url, cb) {
    locals.content[name] = "Content not found";
    try {
        var options = { headers: { 'User-Agent': 'neo4j.org'}, encoding: "UTF-8"};
        if (url.match("/github/")) {
            options.auth = {user: github_personal_token, pass: 'x-oauth-basic'};
            options.headers.accept = 'application/vnd.github.VERSION.raw';
        }
        request(url, options,
            function (err, res, data) {
                console.log("loading", url, "response.headers", res.headers);
                if (err && !cb) {
                    console.log("Error loading content for", name, url, e);
                    locals.content[name] = "Content " + name + " from " + url + " not loaded!";
                    return;
                }
                // todo store res.headers.etag for conditional requests to save rates
                locals.content[name] = data;
                if (cb) {
                    cb(err, data, name, url);
                }
            });
    } catch (e) {
        console.log("Error loading content for", name, url, e);
        locals.content[name] = "Content " + name + " from " + url + " not loaded!";
    }
}

exports.load_content = load_content;
exports.load_github_content = load_github_content;

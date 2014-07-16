var assert = require("assert");
var rewire = require("rewire");

var load_gist = rewire("../helpers/load_gist");
var request = rewire("request");

var buildGraphGistUrlInfo=load_gist.__get__('buildGraphGistUrlInfo');

describe('buildGraphGistUrlInfo', function() {
    beforeEach(function () {
//        load_gist.__set__("request", request);
    });
    describe("#buildGraphGistUrlInfo", function () {
        it('should resolve gist urls correctly', function () {
            var id = "8173017";
            var res = buildGraphGistUrlInfo("http://gist.neo4j.org/?" + id);
            assert.equal(id, res.source);
            assert.equal("github-gist", res.type);
            assert.equal("https://api.github.com/gists/"+id, res.apiUrl);
        });
        it('should resolve neo4j.org gist urls correctly', function () {
            var id = "8173017";
            var res = buildGraphGistUrlInfo("http://neo4j.org/graphgist?" + id);
            assert.equal(id, res.source);
            assert.equal("github-gist", res.type);
            assert.equal("https://api.github.com/gists/"+id, res.apiUrl);
        });
        it('should resolve neo4j.org/api/graphgist gist urls correctly', function () {
            var id = "8173017";
            var res = buildGraphGistUrlInfo("http://neo4j.org/api/graphgist?" + id);
            assert.equal(id, res.source);
            assert.equal("github-gist", res.type);
            assert.equal("https://api.github.com/gists/"+id, res.apiUrl);
        });
        it('should resolve neo4j.org/api/graphgist gist https urls correctly', function () {
            var id = "8173017";
            var res = buildGraphGistUrlInfo("https://neo4j.org/api/graphgist?" + id);
            assert.equal(id, res.source);
            assert.equal("github-gist", res.type);
            assert.equal("https://api.github.com/gists/"+id, res.apiUrl);
        });
        it('should resolve local urls correctly', function () {
            var id = "graphgist.adoc";
            var res = buildGraphGistUrlInfo("http://gist.neo4j.org/?" + id);
            assert.equal(id, res.source);
            assert.equal("graphgist", res.type);
            assert.equal("http://gist.neo4j.org/gists/"+id, res.url);
        });
        it('should resolve any urls correctly', function () {
            var id = "http://bar.com/foo-bar?answer=42&foo=bar";
            var res = buildGraphGistUrlInfo("http://gist.neo4j.org/?" + encodeURIComponent(id));
            assert.equal(id, res.source);
            assert.equal("url", res.type);
            assert.equal(id, res.url);
        });
        it('should resolve public dropbox urls correctly', function () {
            var id = "23428394";
            var res = buildGraphGistUrlInfo("http://gist.neo4j.org/?dropbox-"+ id);
            assert.equal("dropbox-"+id, res.source);
            assert.equal("dropbox-user", res.type);
            assert.equal("https://dl.dropboxusercontent.com/u/"+id, res.url);
        });
        it('should resolve public dropbox urls correctly', function () {
            var id = "23428394";
            var res = buildGraphGistUrlInfo("http://gist.neo4j.org/?dropboxs-"+ id);
            assert.equal("dropboxs-"+id, res.source);
            assert.equal("dropbox-shared", res.type);
            assert.equal("https://dl.dropboxusercontent.com/s/"+id, res.url);
        });
    });
});

/**
 * Licensed to Neo Technology under one or more contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership. Neo Technology licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You
 * may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

'use strict';

var request = require("request");
var content_loading = require("./content_loading");
var merge = require("./utils").merge;

var Base64 = require('js-base64').Base64;

var types = ['dropbox-user','dropbox-shared','github-gist','github-repo','graphgist','url'];

var GRAPHGIST_BASE_URL = 'http://gist.neo4j.org/gists/';
var DROPBOX_PUBLIC_BASE_URL = 'https://dl.dropboxusercontent.com/u/';
var DROPBOX_PRIVATE_BASE_URL = 'https://www.dropbox.com/s/';
var DROPBOX_PRIVATE_API_BASE_URL = 'https://dl.dropboxusercontent.com/s/';
var GITHUB_BASE_URL = 'https://github.com/';
var GITHUB_API_BASE_URL = 'https://api.github.com/repos/';
var GITHUB_GIST_BASE_URL = 'https://gist.github.com/';
var GITHUB_GIST_API_BASE_URL = 'https://api.github.com/gists/';

var DEFAULT_SOURCE = 'github-neo4j-contrib/gists/meta/Home.adoc';
var VALID_GIST = /^[0-9a-f]{5,32}\/?$/;

var github_personal_token=process.env.GITHUB_TOKEN;
var GITHUB_OPTIONS = {
    headers: {'User-Agent': 'neo4j.org'}, json: true,
    auth: {user: github_personal_token, pass: 'x-oauth-basic'},
    encoding: "UTF-8" };

function fetchGithubGist(gist, callback) {
    if (!VALID_GIST.test(gist)) {
        callback('The gist id is malformed: ' + gist);
        return;
    }
    var url = 'https://api.github.com/gists/' + gist.replace("/", "");
    request(url, GITHUB_OPTIONS ,
        function (err, resp, data) {
            if (err) {
                console.log("Could not load gist from " + url,err);
                return callback(err, "Could not load gist from " + url);
            }
            var file = data.files[Object.keys(data.files)[0]]; // todo check for content-type asciidoc or suffix
            var content = file.content;
            var link = data.html_url;
            callback(null, content, link);
        }
    );
}

function fetchGithubFile(id, callback) {
    var decoded = decodeURIComponent(id);

    decoded = decoded.replace(/\/contents\//, '//');
    var parts = decoded.split('/');
    var branch = 'master';
    var pathPartsIndex = 3;
    if (parts.length >= 4 && parts[3] === '') {
        branch = parts[2];
        pathPartsIndex++;
    }
    var url = 'https://api.github.com/repos/' + parts[0] + '/' + parts[1] + '/contents/' + parts.slice(pathPartsIndex).join('/');


    console.log("fetching", url);
    request(url, merge({qs: "ref=" + branch},GITHUB_OPTIONS),
        function (err, resp, data) {
            if (err) {
                console.log(err);
                callback("Could not load gist from " + url+ " "+err);
                return;
            }

            var content = Base64.decode(data.content);
            var link = data.html_url;
            var imagesdir = 'https://raw.github.com/' + parts[0] + '/' + parts[1]
                + '/' + branch + '/' + data.path.substring(0, -data.name.length);
            // console.log("got", content);

            callback(null, content, link, imagesdir); // todo images
        }
    );
}

function fetchDropboxFile(id, callback) {
    var url = DROPBOX_PUBLIC_BASE_URL + decodeURIComponent(id);
    fetchAnyUrl(url, callback);
}

function fetchAnyUrl(id, callback) {
    console.log('fetchAnyUrl', id);
    var url = decodeURIComponent(id);
    request(url, {Headers: {accept: "text/plain"}}, function (err, resp, data) {
        callback(err, data, id);
    });
}

function fetchLocalSnippet(id, callback) {
    var url = GRAPHGIST_BASE_URL + id + '.adoc';
    fetchAnyUrl(url, callback);
}

var CACHE_TTL = 1000*60*15;

exports.load_gist = function (id, cache, callback) {

    if (id.length < 2) {
        id = DEFAULT_SOURCE;
    }
    else {
        id = id.replace(/^\?/,"")
        var idCut = id.indexOf('&');
        if (idCut !== -1) {
            id = id.substring(0, idCut);
        }
    }
    var entry = cache[id];
    if (entry && entry.time > Date.now() - CACHE_TTL) {
        return callback(null,entry.content,entry.link);
    }
    var fetcher = fetchGithubGist;
    if (id.length > 8 && id.substr(0, 8) === 'dropbox-') {
        fetcher = fetchDropboxFile;
        id = id.substr(8);
    }
    else if (id.length > 7 && id.substr(0, 7) === 'github-') {
        fetcher = fetchGithubFile;
        id = id.substr(7);
    }
    else if (!VALID_GIST.test(id)) {
        if (id.indexOf('%3A%2F%2F') !== -1) {
            fetcher = fetchAnyUrl;
        }
        else {
            fetcher = fetchLocalSnippet;
        }
    }
    fetcher(id, function(err, content, link) {
        if (!err) {
            cache[id] = {content: content, link: link, time: Date.now()}
        }
        callback(err,content,link);
    });
};

function buildGithubRepoApiUrlInfo(source) {
    source = source.replace(/\/contents\//, '//');
    var parts = source.split('/');
    var user = parts[0];
    var repo = parts[1];
    var branch = 'master';
    var pathPartsIndex = 3;
    if (parts.length >= 4 && parts[3] === '') {
        branch = parts[2];
        pathPartsIndex++;
    }
    var apiUrl = GITHUB_API_BASE_URL + user + '/' + repo + '/contents/' + parts.slice(pathPartsIndex).join('/');
    return {apiUrl : apiUrl, user: user, repo:repo, branch:branch}
}
function buildGraphGistUrlInfo(url) {
    // http://gist.neo4j.org/?8173017
    // http://gist.neo4j.org/?github-HazardJ%2Fgists%2F%2FDoc_Source_Graph.adoc
    // http://gist.neo4j.org/?dropbox-14493611%2Fmovie_recommendation.adoc
    // should also work for neo4j.org/graphgist?
    // should also work for neo4j.org/graphgist/?
    // should also work for neo4j.org/api/graphgist/?
    var match = url.match(/^http.+?\?(.+)(&.+)?/);
    if (match) {
        var source = decodeURIComponent(match[1]);
        if (source.match(/:\/\//)) {
            return {source:source, url:source, type:"url"}; // any
        }
        if (VALID_GIST.test(source)) {
            return {source:source, url:GITHUB_GIST_BASE_URL + source,
                apiUrl: GITHUB_GIST_API_BASE_URL + source.replace("/", ""),
                type:"github-gist"};
        }
        if (source.match(/github-/i)) {
            var githubUrl = source.substring("github-".length);
            var info = buildGithubRepoApiUrlInfo(githubUrl);
            return {source:source, url: GITHUB_BASE_URL + githubUrl, type: "github-repo",
                apiUrl: info.apiUrl, user:info.user, repo:info.repo, branch:info.branch};
        }
        if (source.match(/dropbox-/i)) {
            return {source:source, url: DROPBOX_PUBLIC_BASE_URL + source.substring("dropbox-".length), type:"dropbox-user"};
        }
        if (source.match(/dropboxs-/i)) {
            return {source:source, url: DROPBOX_PRIVATE_API_BASE_URL + source.substring("dropboxs-".length), type:"dropbox-shared"};
        }
        return {source:source, url: GRAPHGIST_BASE_URL + source, type:"graphgist"}; // local
    }
    return {id:decoded, url:decoded, type:"any"};
}


exports.get_graphgist = function(locals,item,cb) {
    var info = buildGraphGistUrlInfo(item.url);
    var url = info.url;
    var content = locals.content[item.url];

    if (!content || content == "Content not found") {
        // todo dropbox
        content_loading.load_content(locals, item.url, url, cb);
    } else {
        if(cb) {
            cb(null, content, item.url, url);
        }
        return content;
    }
};

exports.findGist = function(locals, url) {
    var item;
    for (var k in locals.graphgists) {
        var gist = locals.graphgists[k];
        if (gist.url.indexOf(url) != -1) {
            item = gist;
        }
    }
    return item;
};

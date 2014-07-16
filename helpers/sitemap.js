exports.asCsv = function(pages,content) {
    function quote(value) {
        if (value == null || value == "") return "";
        return '"'+value.toString().replace(/"/g,'""')+'"';
    }
    function values(item) {
        if (!item) return [];
        return [item["id"]||item["key"],item["type"],item["path"]||item["url"]||item["src"],item["title"]||item["name"],item["author"]||item["authors"],quote(item["introText"]),quote(item["content"]||item["description"]),item["tags"]];
    }

    var delim = "§";
    var header = ["id", "type", "url", "title", "authors", "intro", "content","tags","child","c_id", "c_type", "c_url", "c_title", "c_authors", "c_intro", "c_content","c_tags"].join(delim);
    var result=[header];
    for (var id in pages) {
        if (!pages.hasOwnProperty(id)) continue;
        var page = pages[id];
        var pageStr = values(page).join(delim)+delim;
        //console.log(id,"related",typeof(page.related),"featured",typeof(page.featured));
        if (page.featured) page.featured.forEach(function (f) { var item = findItem(f); result.push(pageStr + "FEATURED§" + values(item).join("§"))});
        if (page.related) page.related.forEach(function (f) { var item = findItem(f); result.push(pageStr + "RELATED§" + values(item).join("§"))});
        if (!(page.related || page.featured)) result.push(pageStr);
    }
    return result.join("\n");
};

exports.asJson = function(pages,content) {
   return JSON.stringify({pages:pages, content:content});
};

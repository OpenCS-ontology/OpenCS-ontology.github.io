const DEBUG = false;
const IRIs = {
    "label": ["http://www.w3.org/2004/02/skos/core#prefLabel"],
    "related": ["http://www.w3.org/2004/02/skos/core#related"],
    "broader": ["http://www.w3.org/2004/02/skos/core#broader"],
    "narrower": ["http://www.w3.org/2004/02/skos/core#narrower"],
    "match": ["http://www.w3.org/2004/02/skos/core#closeMatch"],
}
const DBPEDIA_IRIs = {
    "abstract": ["http://dbpedia.org/ontology/abstract"],
    "redirects": ["http://dbpedia.org/ontology/wikiPageRedirects"]
}
const DEFAULT_ENTITY_PREFIX = "https://w3id.org/ocs/ont/C"

const Logger = {
    log: function(msg) {
        if (DEBUG) console.log("]", msg);
    },
};

class EntityCache {
    constructor(urlBase) {
        this.cache = {};
        this.urlBase = urlBase;
    }
    async get(entityId) {
        if(!(entityId in this.cache)) {
            Logger.log("Fetching entity "+entityId)
            try {
                this.cache[entityId] = $.get(`${this.urlBase}/${String(Math.floor(entityId/1000)).padStart(2, 0)}/C${entityId}.jsonld`);
                this.cache[entityId] = await this.cache[entityId];
            } catch(e) {
                this.cache[entityId] = {};
            }
        }
        return this.cache[entityId];
    }
}

function extractId(entityUrl) {
    if (entityUrl.indexOf(DEFAULT_ENTITY_PREFIX) != 0) throw `Invalid entity url '${entityUrl}'`;
    return entityUrl.substring(DEFAULT_ENTITY_PREFIX.length);
}
function Accessor(source) {
    return new Proxy(source[0], {
        get(target, prop) {
            if(prop == "id") return extractId(target["@id"]);
            if (!(prop in IRIs)) throw `Invalid property ${prop}`;
            let result = [];

            for(let iri of IRIs[prop]) {
                if(!(iri in target)) continue;
                for(let item of target[iri]) {
                    result.push(item["@value"] || item["@id"]);
                }
            }
            return result;
        },
    })
}

const escapeHtml = (unsafe) => {
    return (unsafe+"").replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

class Browser {
    constructor() {
        this.cache = new EntityCache(`/assets/data`);
        this.isRendering = false;
        this.retriggerRender = false;
    }
    overwriteUrl(url) {
        this.cache.urlBase = url;
        return this;
    }

    extractIdFromUrl() {
        let entity = window.location.hash;
        if(entity.length <= 2 || entity[0] != "#" || entity[1] != "C") {
            throw "Invalid entity!";
        }
        return entity.substring(2);
    }
    async renderEntityFromUrl() {
        if(this.isRendering) {
            this.retriggerRender = true;
            return;
        }
        this.isRendering = true;
        
        try {
            await this.renderEntity(this.extractIdFromUrl());
        } catch(e) {
            document.getElementById("titlebar").innerHTML = "Invalid entity";
            document.getElementById("abstractbar").innerHTML = "This entity does not exist.";
            document.getElementById("loading-message").innerHTML = "";
            document.getElementById("parent-container").classList.add("loading");
            console.error(e);
        } finally {
            if(this.retriggerRender) {
                this.retriggerRender = false;
                this.renderEntityFromUrl();
            }
            this.isRendering = false;
        }
    }
    initialize() {
        window.addEventListener('hashchange', this.renderEntityFromUrl.bind(this));
        new ResizeObserver(this.renderEdges).observe(document.getElementById("content-hierarchy"))
        this.renderEntityFromUrl();
    }

    async renderEntity(entityId) {
        let entity = Accessor(await this.cache.get(entityId));
        document.getElementById("titlebar").innerHTML = `${entity.label[0]} (C${entityId})`;
        document.getElementById("abstractbar").innerHTML = "";
        document.getElementById("parent-container").classList.add("loading");
        document.getElementById("loading-message").innerHTML = "Loading...";

        let relatedPromise = Promise.all(entity.related.map(extractId).map(this.cache.get.bind(this.cache))).then((entities) => {return entities.map(Accessor);});
        let narrowerPromise = Promise.all(entity.narrower.map(extractId).map(this.cache.get.bind(this.cache))).then((entities) => {return entities.map(Accessor);});
        let broaderPromise = this.traverseUp(entityId);
        let abstractPromise = this.getDbpediaAbstract(entity);

        await Promise.all([entity.match, relatedPromise, narrowerPromise, broaderPromise, abstractPromise]).then(async ([match, related, narrower, broader, abstract]) => {
            related.sort((a, b) => a.id - b.id);

            document.getElementById("abstractbar").innerHTML = abstract;
            document.getElementById("content-match").innerHTML = this.makeSection("Close match to", match.map(this.asExternalLink));
            document.getElementById("content-related").innerHTML = this.makeSection("Related to", related.map(this.asLink));
            document.getElementById("content-hierarchy").innerHTML = await this.renderHierarchy(broader, narrower.sort((a, b) => a.id - b.id), entityId);

            document.getElementById("parent-container").classList.remove("loading");
            this.renderEdges();
        });

    }
    async traverseUp(entityId) {
        let entity = Accessor(await this.cache.get(entityId));
        if (entity.broader.length == 0) return {};
        let broader = entity.broader.map(extractId);
        
        let result = {[entityId]: new Set(broader)};
        let broaderTraversal = await Promise.all(broader.map(this.traverseUp.bind(this)));
        for(let item of broaderTraversal) {
            for(let key in item) {
                if(!(key in result)) result[key] = new Set();
                result[key] = new Set([...result[key], ...item[key]])
            }
        }
        return result;
    }
    asLink(entity, id) {
        return `<a ${id?('id="'+escapeHtml(id)+'"'):""}href="#C${escapeHtml(entity.id)}">${escapeHtml(entity.label[0])} (C${escapeHtml(entity.id)})</a>`;
    }
    asExternalLink(url) {
        let name = url;
        let match = url.match(/:\/\/([^\.]+).+\/(.+)/);
        if(match) name = `${match[2].replace(/_/g, " ")} (${match[1]})`;
        
        return `<a target="_blank" href="${escapeHtml(url)}">${escapeHtml(name)}</a>`
    }
    makeSection(title, content) {
        if (content.length == 0) return "";

        let header = `<h4 class="text-center">${title}</h4>`
        content = content.join("<br>");
        return `${header}<div>${content}</div>`;
    }

    async getDbpediaAbstract(entity) {
        for(let url of entity.match) {
            if(url.indexOf("dbpedia.org/resource/") == -1) continue;
            try {
                let abstract = await this.getAbstractFromDbpediaUrl(url);
                if(abstract) return abstract;
            } catch(e) {}
        }
        return "";
    }
    async getAbstractFromDbpediaUrl(url) {
        if(url.indexOf("dbpedia.org/resource/") == -1) return
        let jsonUrl = url.replace("http://", "https://").replace("dbpedia.org/resource/", "dbpedia.org/data/") + ".json";
        let dbpediaData = await $.get(jsonUrl);
        if(!dbpediaData || !dbpediaData[url]) return

        let redirects = dbpediaData[url][DBPEDIA_IRIs.redirects];
        if (redirects && redirects.length > 0) {
            let abstract = await this.getAbstractFromDbpediaUrl(redirects[0]["value"]);
            if(abstract) return abstract;
        }
        
        if(!dbpediaData[url][DBPEDIA_IRIs.abstract]) return;
        for(let abstract of dbpediaData[url][DBPEDIA_IRIs.abstract]) {
            if(abstract["lang"] == "en") return this.formatDbpediaAbstract(abstract["value"], url);
        }
    }
    formatDbpediaAbstract(abstract, url) {
        if(!abstract) return "";
        return `${escapeHtml(abstract)} <a target="_blank" class="link-light" href="${escapeHtml(url)}">[DBpedia]</a>`
    }

    async renderHierarchy(broaderMapping, narrower, source) {
        if(broaderMapping.length == 0) return "";
        let rank = this.rankBroader(broaderMapping, source);
        let content = "";

        content += `<svg>`
        for(let child in broaderMapping) {
            for(let parent of broaderMapping[child]) {
                content += `<path id="${parent}:${child}"></path>`
            }
        }
        for(let child of narrower) {
            content += `<polyline id="^${source}:${child.id}"></polyline>`
        }
        content += `<polyline id="deepPath"></polyline>`
        content += `</svg>`

        for(let i = 0; i < rank.length-1; i++) {
            if(i>0 && rank[i-1][1] != rank[i][1]) content += "</div>";
            if(i==0 || rank[i-1][1] != rank[i][1]) content += `<div class="d-flex flex-row flex-wrap justify-content-center">`;
            let entity = Accessor(await this.cache.get(rank[i][0]))
            content += this.asLink(entity, `hierarchy-${entity.id}`);
        }
        let entity = Accessor(await this.cache.get(source))
        content += `</div><h2>${this.asLink(entity, `hierarchy-${entity.id}`)}</h2>`;
        content += `<div class="d-flex flex-row flex-wrap justify-content-center">`;
        for(let child of narrower) {
            content += this.asLink(child, `hierarchy-${child.id}`);
        }
        content += "</div>";

        return content;
    }
    rankBroader(mapping, source) {
        let result = {[source]: 0};
        function bump(entity, level) {
            result[entity] = Math.max(level, result[entity] || 0);
            for(let parent of (mapping[entity] || [])) {
                bump(parent, level+1);
            }
        }
        bump(source, 0);
        return Object.entries(result).sort((a, b) => a[0] - b[0]).sort((a, b) => b[1] - a[1]);
    }
    renderEdges() {
        let container = document.getElementById("content-hierarchy");
        let svg = container.getElementsByTagName("svg")[0];
        if (!svg) return;
        let lines = [...svg.getElementsByTagName("path"), ...svg.getElementsByTagName("polyline")];
        Logger.log("Rendering edges")

        svg.setAttribute("height", 0); // reset container height to content
        svg.setAttribute("width", container.clientWidth);
        svg.setAttribute("height", container.scrollHeight);

        let deepPath = {};
        for(let line of lines) {
            if (line.id == "deepPath") continue;
            let [parent, child] = line.id.split(":");
            let crooked = false;
            if(parent[0] == "^") {
                parent = parent.substring(1);
                crooked = true;
            }

            let parentElement = document.getElementById(`hierarchy-${parent}`);
            let childElement = document.getElementById(`hierarchy-${child}`);
            if(!parentElement || !childElement) continue;
            let parentRect = parentElement.getBoundingClientRect();
            let childRect = childElement.getBoundingClientRect();

            let parentX = parentElement.offsetLeft + parentRect.width/2;
            let parentY = parentElement.offsetTop + parentRect.height;
            let childX = childElement.offsetLeft + childRect.width/2;
            let childY = childElement.offsetTop;

            if(crooked) {
                let hoistedY = Math.round(childY - childRect.height/2);
                line.setAttribute("points", `${parentX},${hoistedY} ${childX},${hoistedY} ${childX},${childY}`);

                let leftEdge = childElement.offsetLeft
                let rightEdge = childElement.offsetLeft + childRect.width;

                if (deepPath[hoistedY] == undefined) deepPath[hoistedY] = {"parentY": parentY};
                if (rightEdge <= container.clientWidth/2) deepPath[hoistedY]["left"] = Math.max(deepPath[hoistedY]["left"] || 0, rightEdge);
                if (leftEdge >= container.clientWidth/2) deepPath[hoistedY]["right"] = Math.min(deepPath[hoistedY]["right"] || container.clientWidth, leftEdge);
                if (leftEdge < container.clientWidth/2 && rightEdge > container.clientWidth/2) {
                    deepPath[hoistedY]["center_left"] = leftEdge;
                    deepPath[hoistedY]["center_right"] = rightEdge;
                }
            } else {
                if (childX > parentX + parentRect.width/2) parentX += Math.min(parentRect.width/2 * (childX - parentX)/(container.clientWidth/2.5), parentRect.width/2 - childRect.height/4);
                else if (childX < parentX - parentRect.width/2) parentX -= Math.min(parentRect.width/2 * (parentX - childX)/(container.clientWidth/2.5), parentRect.width/2 - childRect.height/4);
                let hoistedY = Math.round(parentY + childRect.height/2);
                line.setAttribute("d", `M ${childX} ${childY} C ${childX} ${hoistedY}, ${parentX} ${hoistedY}, ${parentX} ${parentY}`)
            }
        }

        let deepPathElement = document.getElementById("deepPath")
        if (Object.keys(deepPath).length == 0) deepPathElement.setAttribute("points", "");
        else {
            let deepPathPlain = [];
            for(let y in deepPath) {
                if (deepPathPlain.length == 0) deepPathPlain.push([container.clientWidth/2, deepPath[y]["parentY"]]);
                if (deepPath[y]["center_left"] == undefined) deepPath[y]["center_left"] = deepPath[y]["right"];
                if (deepPath[y]["center_right"] == undefined) deepPath[y]["center_right"] = deepPath[y]["left"];
                let leftEdge = (deepPath[y]["left"] + deepPath[y]["center_left"])/2;
                let rightEdge = (deepPath[y]["right"] + deepPath[y]["center_right"])/2;

                let closerEdge = ((container.clientWidth/2 - leftEdge) < (rightEdge - container.clientWidth/2)) ? leftEdge : rightEdge;
                if (isNaN(closerEdge)) closerEdge = container.clientWidth/2;
                deepPathPlain.push([closerEdge, y]);
            }
            let points = `${deepPathPlain[0][0]},${deepPathPlain[0][1]}`;
            for(let i = 1; i < deepPathPlain.length; i++)
                points += ` ${deepPathPlain[i-1][0]},${deepPathPlain[i][1]} ${deepPathPlain[i][0]},${deepPathPlain[i][1]}`;
            deepPathElement.setAttribute("points", points);
        }
    }
}
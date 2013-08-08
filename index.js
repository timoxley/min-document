/*
* null
* |- Object
*    |- Node
*       |- DocumentFragment
*       |- Element             // skip
*       |  |- HTMLElement
*       |     |- HTML*Element  // skip
*       |- CharacterData       // skip
*       |  |- Text
*
*/



function extend(obj, _super, extras) {
    obj.prototype = Object.create(_super.prototype)
    for (var key in extras) {
        obj.prototype[key] = extras[key]
    }
}



/*
* http://dom.spec.whatwg.org/#node
*/
function Node(){}

extend(Node, Object, {
    nodeName:        null,
    parentNode:      null,
    childNodes:      null,
    firstChild:      null,
    lastChild:       null,
    previousSibling: null,
    nextSibling:     null,
    appendChild: function(el) {
        return this.insertBefore(el)
    },
    insertBefore: function(el, refChild) {
        var t = this
        , childs = t.childNodes
        , pos = childs.length

        // If el is a DocumentFragment object, all of its children are inserted, in the same order, before refChild.
        if (el.nodeType == 11) {
            el.childNodes.forEach(function(el) {
                t.insertBefore(el, refChild)
            })
        } else {

            // If the el is already in the tree, it is first removed.
            if (el.parentNode) el.parentNode.removeChild(el)

            el.parentNode = t
            // If ref is null, insert el at the end of the list of children.
            if (refChild) {
                pos = childs.indexOf(refChild)
            }
            
            childs.splice(pos, 0, el)
            t._updateLinks(el)
            refChild && t._updateLinks(refChild.nextSibling, refChild.previousSibling, refChild)
        }
        return el
    },
    removeChild: function(el) {
        var t = this
        , index = t.childNodes.indexOf(el)
        if (index == -1) throw new Error("NOT_FOUND_ERR")

        t.childNodes.splice(index, 1)
        el.parentNode = null
        t._updateLinks(el.previousSibling, el.nextSibling, el)
        return el
    },
    replaceChild: function(el, ref) {
        this.insertBefore(el, ref)
        this.removeChild(ref)
    },
    cloneNode: function(deep) {
        //TODO
    },
    hasChildNodes: function() {
        return this.childNodes && this.childNodes.length > 0
    },
    _updateLinks: function() {
        var el, index
        , t = this
        , childs = t.childNodes
        , len = arguments.length

        t.firstChild = childs[0] || null
        t.lastChild  = childs[ childs.length - 1 ] || null

        if (len) while (len--) {
            el = arguments[len]
            if (!el) continue
            childs = el.parentNode && el.parentNode.childNodes
            index = childs && childs.indexOf(el) || 0
            el.nextSibling = childs && childs[ index + 1 ] || null
            if (el.nextSibling) el.nextSibling.previousSibling = el
            el.previousSibling = index > 0 && childs[ index - 1 ] || null
            if (el.previousSibling) el.previousSibling.nextSibling = el
        }
    },
    toString: function() {
        var result = this.textContent || ""

        if (this.childNodes) return this.childNodes.reduce(function (memo, node) {
            return memo + node
        }, result)

        return result
    }
})


function DocumentFragment() {
    this.childNodes = []
}

extend(DocumentFragment, Node, {
    nodeType: 11,
    nodeName: "#document-fragment"
})


function HTMLElement(tag) {
    var t = this
    t.nodeName = t.tagName = tag.toUpperCase()
    t.dataset = {}
    t.childNodes = []
    t.style = {}
}

var el_re = /([.#:[])([-\w]+)(?:=([-\w]+)])?/g

extend(HTMLElement, Node, {
    nodeType: 1,
    tagName: null,
    style: null,
    className: "",
    textContent: "",
    /*
    * Void elements:
    * http://www.w3.org/html/wg/drafts/html/master/syntax.html#void-elements
    */
    _voidElements: { AREA:1, BASE:1, BR:1, COL:1, EMBED:1, HR:1, IMG:1,
                    INPUT:1, KEYGEN:1, LINK:1, MENUITEM:1, META:1, PARAM:1,
                    SOURCE:1, TRACK:1, WBR:1 },
    hasAttribute: function(name) {
        //HACK: we should figure out a better way
        if (name == "dataset") return false
        return this.hasOwnProperty(name) && !(name in HTMLElement.prototype)
    },
    getAttribute: function(name) {
        return this.hasAttribute(name) ? this[name] : null
    },
    setAttribute: function(name, value) {
        this[name] = value
    },
    removeAttribute: function(name) {
        delete this.name
    },
    getElementById: function(id) {
        var t = this
        if (""+t.id === ""+id) return t

        var arr = t.childNodes
        , result = null

        if (arr) {
            for (var i = 0, len = arr.length; !result && i < len; i++) {
                result = arr[i].nodeType == 1 ? arr[i].getElementById(id) : null
            }
        }
        return result
    },
    getElementsByTagName: function(tag) {
        var el, els = [], next = this.firstChild
        tag = tag === "*" ? 1 : tag.toUpperCase()
        for (var i = 0, key = tag === 1 ? "nodeType" : "nodeName"; (el = next); ) {
            if (el[key] === tag) els[i++] = el
            next = el.firstChild || el.nextSibling
            while (!next && (el = el.parentNode)) next = el.nextSibling
        }
        return els
    },
    querySelector: function(sel) {
        var el
        , i = 0
        , rules = ["_"]
        , tag = sel.replace(el_re, function(_, o, s, v) {
                rules.push(
                    o == "." ? "(' '+_.className+' ').indexOf(' "+s+" ')>-1" :
                    o == "#" ? "_.id=='"+s+"'" :
                    "_.getAttribute('"+s+"')"+(v?"=='"+v+"'":"")
                )
                return ""
            }) || "*"
        , els = this.getElementsByTagName(tag)
        , fn = Function("_", "return " + rules.join("&&"))

        for (; el = els[i++]; ) if (fn(el)) return el
        return null
    },
    toString: function() {
        var t = this, result = "<" + t.tagName + properties(t) + datasetify(t)

        if (t._voidElements[t.tagName]) {
            return result + "/>"
        }

        return result + ">" +
            Node.prototype.toString.call(t) +
            "</" + t.tagName + ">"
    }
})


function Text(value) {
    this.textContent = value
}

extend(DocumentFragment, Node, {
    nodeType: 3,
    nodeName: "#text"
})

function Document(){
    this.body = this.createElement("body")
}

extend(Document, Node, {
    nodeType: 9,
    nodeName: "#document",
    createElement: function(tag) {
        return new HTMLElement(tag)
    },
    createTextNode: function(value) {
        return new Text(value)
    },
    createDocumentFragment: function() {
        return new DocumentFragment()
    },
    getElementById: function(id) {
        return this.body.getElementById(id)
    },
    getElementsByTagName: function(tag) {
        return this.body.getElementsByTagName(tag)
    },
    querySelector: function(sel) {
        return this.body.querySelector(sel)
    }
})

var document = module.exports = new Document




function stylify(styles) {
    var attr = ""
    Object.keys(styles).forEach(function (key) {
        var value = styles[key]
        attr += key + ":" + value + ";"
    })
    return attr
}

function datasetify(el) {
    var ds = el.dataset
    var props = []

    for (var key in ds) {
        props.push({ name: "data-" + key, value: ds[key] })
    }

    return props.length ? stringify(props) : ""
}

function stringify(list) {
    var attributes = []
    list.forEach(function (tuple) {
        var name = tuple.name
        var value = tuple.value

        if (name === "style") {
            value = stylify(value)
        }

        attributes.push(name + "=" + "\"" + value + "\"")
    })

    return attributes.length ? " " + attributes.join(" ") : ""
}

function properties(el) {
    var props = []
    for (var key in el) {
        if (el.hasAttribute(key)) {
            props.push({ name: key, value: el[key] })
        }
    }

    if (el.className) {
        props.push({ name: "class", value: el.className })
    }

    return props.length ? stringify(props) : ""
}


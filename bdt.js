const EventEmitter = require("events");
const glob         = require("glob");
const path         = require("path");

const groups = {
    name    : "__ROOT__",
    type    : "group",
    path    : "",
    children: []
};

let currentGroup = groups;

/**
 * This function is called by tests. It creates new group and appends it to the
 * current group.
 * @param {String} name The group name
 * @param {Function} fn The function that will be called to build the group
 */
function describe(name, fn)
{
    let group = {
        name,
        type: "group",
        children: [],
        path: [
            currentGroup.path,
            currentGroup.children.length + ""
        ].filter(Boolean).join(".")
    };

    currentGroup.children.push(group);

    const parent = currentGroup;
    currentGroup = group;
    fn && fn(group);
    currentGroup = parent;
}

/**
 * The `it` function that will be made available to tests. It will simply
 * "remember" the test by appending it to the children structure of the parent
 * group element.
 */
function it(name, fn)
{
    let node = {
        type: "test",
        name,
        fn
    };

    if (name && typeof name == "object") {
        node = {
            ...name,
            type: "test",
            fn,
            name: name.name || name.toString()
        };
    }

    const index = currentGroup.children.push(node) - 1;
    node.path = currentGroup.path === "" ? index + "" : currentGroup.path + "." + index;
}

function toJSON(node = groups)
{
    const out = { name: node.name };
    if (node.type === "group") {
        out.children = node.children.map(toJSON);
    }
    return out;
}

/**
 * Given a glob pattern, finds all the files that match and executes them.
 */
function load(pattern)
{
    const paths = glob.sync(pattern);
    paths.forEach(file => {
        const fullPath = path.resolve(file);
        try {
            const suite = require(fullPath);
            if (typeof suite == "function") {
                suite(describe, it);
            }
        }
        catch (e) {
            console.log(`No tests could be loaded from ${fullPath}. ${e.message}`);
        }
    });
    return groups;
}

/**
 * Given a path (which is a dot-separated list of indexes), finds and returns
 * the node at that path. For example getPath("2.1.5") will return the sixth
 * child of the second child of the third child of the root node.
 */
function getPath(path = "")
{
    if (!path) {
        return groups;
    }
    return path.split(".").reduce(
        (out, i) => out && out.children ? out.children[i * 1] : undefined,
        groups
    );
}

/**
 * Tests if the argument is promise-like
 */
function isPromise(p)
{
    return (p && typeof p.catch == "function" && typeof p.then == "function");
}

/**
 * Creates and returns an API that will be passed to each test function
 * when that test is executed.
 */
function createTestAPI(testNode)
{
    return {

        /**
         * Sets the status of this test
         * @param {String} status Possible values are: "loading", "succeeded",
         * "failed", "not-supported", "not-implemented" and "warned" 
         */
        setStatus(status)
        {
            testNode.status = status;
        },

        warn(message)
        {
            testNode.warnings.push(message);
            this.setStatus("warned");
        },

        /**
         * Calling this method will mark the test as not supported.
         * @param {String} message 
         */
        setNotSupported(message = "This test was skipped because " +
            "the server does not support this functionality")
        {
            // testNode.notSupported = message;
            this.warn(message);
            this.setStatus("not-supported");
        },

        // setWarning(warning)
        // {
        //     testNode.warning = warning;
        //     this.setStatus("warned");
        // },

        decorate(name, value)
        {
            testNode.decorations[name] = value;
        },

        decorateHTML(name, value, className = "description")
        {
            testNode.decorations[name] = {
                __type: "html",
                html: value,
                className
            };
        },

        logRequest(req, label = "Request")
        {
            const headers = { ...req.headers };
            if (headers.authorization) {
                headers.authorization = headers.authorization.replace(
                    /^\s*(Bearer)\s+.*$/i,
                    "$1 ⏺⏺⏺⏺⏺⏺"
                );
            }
            testNode.decorations[label] = {
                __type: "request",
                method: req.method,
                url   : req.uri.href,
                headers,
                body: req.body || undefined
            };
        },

        logResponse(res, label = "Response")
        {
            testNode.decorations[label] = {
                __type: "response",
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                headers: res.headers,
                body: res.body
            };
        }
    };
}


class Runner extends EventEmitter
{
    constructor(settings = {})
    {
        super();
        this.settings = settings;
    }

    async run(node = groups)
    {
        const _node = { ...node };
        const isRoot = _node.name === "__ROOT__";

        _node.startedAt = Date.now();

        if (_node.type === "group") {

            if (isRoot) {
                this.emit("start");
            }

            this.emit("groupStart", _node);

            for (const child of _node.children) {
                await this.run(child);
            }

            _node.endedAt = Date.now();

            this.emit("groupEnd", _node);

            if (isRoot) {
                this.emit("end");
            }

        }
        else {
            _node.status      = "loading";
            _node.decorations = {};
            _node.warnings    = [];
            _node.error       = null;

            this.emit("testStart", _node);

            const api = createTestAPI(_node);
            const next = (error) => {
                _node.endedAt = Date.now();
                if (error) {
                    _node.status = "failed";
                    _node.error = {
                        ...error,
                        message: String(error)
                    };
                } else {
                    // _node.error = null;
                    if (_node.warnings.length) {
                        if (_node.status === "loading") {
                            _node.status = "warned";
                        }
                    } else {
                        _node.status = _node.fn ? "succeeded" : "not-implemented";
                    }
                    // if (_node.status === "loading") {
                    //     if (_node.decorations.notSupported) {
                    //         _node.status  = "not-supported";
                    //         _node.warning = "Not supported by this server";
                    //     } else {
                    //         _node.status = _node.fn ? "succeeded" : "not-implemented";
                    //     }
                    // }
                }
                this.emit("testEnd", _node);
            };

            

            try {
                if (typeof _node.fn == "function") {
                    const p = _node.fn.call(_node, this.settings, api);
                    if (isPromise(p)) {
                        return p.then(() => next()).catch(next);
                    }
                }
                else {
                    api.warn("This test is not implemented");
                    api.setStatus("not-implemented");
                    next();
                }
            } catch (ex) {
                next(ex);
            }
        }
    }
}

module.exports = {
    describe,
    it,
    groups,
    toJSON,
    load,
    getPath,
    Runner
};

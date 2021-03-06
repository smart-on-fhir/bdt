const { EventEmitter }      = require("events");
const glob                  = require("glob");
const path                  = require("path");
const { NotSupportedError } = require("./testSuite/lib");

/**
 * The root node of the tests structure. This will be augmented when the tests
 * are loaded.
 */
const groups = {
    name    : "__ROOT__",
    type    : "group",
    path    : "",
    children: []
};

/**
 * Reference to whatever the current group is. Initially, this is the root node,
 * meaning that it includes all tests.
 */
let currentGroup = groups;

/**
 * This function is called by tests. It creates new group and appends it to the
 * current group.
 * @param {String|object} name The group name or settings object
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

    if (name && typeof name == "object") {
        group = {
            ...group,
            ...name,
            name: name.name || name.toString()
        };
    } else {
        group.name = String(name);
    }

    currentGroup.children.push(group);

    const parent = currentGroup;
    currentGroup = group;
    fn && fn(group);
    currentGroup = parent;
}

/**
 * Register a function to be executed before a test group execution starts.
 * @param {Function} fn Can return a promise for async stuff
 */
function before(fn)
{
    currentGroup.before = fn;
}

/**
 * Register a function to be executed after a test group execution ends.
 * @param {Function} fn Can return a promise for async stuff
 */
function after(fn)
{
    currentGroup.after = fn;
}

/**
 * Register a function to be executed before a test execution starts.
 * @param {Function} fn Can return a promise for async stuff
 */
function beforeEach(fn)
{
    currentGroup.beforeEach = fn;
}

/**
 * Register a function to be executed after a test execution ends.
 * @param {Function} fn Can return a promise for async stuff
 */
function afterEach(fn)
{
    currentGroup.afterEach = fn;
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
        fn
    };

    if (name && typeof name == "object") {
        node = {
            ...node,
            ...name,
            name: name.name || name.toString()
        };
    } else {
        node.name = name;
    }

    const index = currentGroup.children.push(node) - 1;
    node.path = currentGroup.path === "" ? index + "" : currentGroup.path + "." + index;
}

/**
 * Creates and returns a JSON representation of the given branch of the tests
 * tree. When no node is specified returns a JSON representing the entire
 * structure.
 * @param {Object} node 
 */
function toJSON(node = groups)
{
    const out = { name: node.name };
    if (node.type === "group") {
        out.children = node.children.map(toJSON);
    }
    return out;
}

/**
 * Given a glob pattern, finds all the files that match and executes them. Those
 * files must be JS modules that export a function. 
 * @param {String} pattern A glob pattern to search for test files
 */
function load(pattern)
{
    const paths = glob.sync(pattern);
    paths.forEach(file => {
        const fullPath = path.resolve(file);
        try {
            const suite = require(fullPath);
            if (typeof suite == "function") {
                suite(describe, it, before, after, beforeEach, afterEach);
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
function getPath(path = "", version="1.0")
{
    if (!path) {
        return groups;
    }
    return path.split(".").reduce(
        (out, i) => {
            const node = out && out.children ? out.children[+i] : undefined;
            if (node) {
                if (!versionCheck(node.version, version)) {
                    return;
                }
    
                if (node.maxVersion && !versionCheck(version, node.maxVersion)) {
                    return;
                }
            }
            return node;
        },
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

function versionCheck(vA, vB)
{
    let a = String(vA || "1.0").trim().split(/\s*\.\s*/);
    let b = String(vB || "1.0").trim().split(/\s*\.\s*/);
    while(a.length && b.length) {
        if (+(a.shift()) > +(b.shift())) {
            return false;
        }
    }
    return true;
}

/**
 * Creates and returns an API that will be passed to each test function
 * when that test is executed.
 * @param {Object} testNode The test node to manipulate. Note that the node
 * remains private and the tests can only manipulate it through the API
 * returned by this function.
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

        /**
         * Append a warning to the test output
         * @param {String} message 
         */
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
            this.warn(message);
            this.setStatus("not-supported");
        },

        /**
         * Provide one or more conditions to check for. If `condition.assertion`
         * evaluates to false, then new `NotSupportedError` will be thrown with
         * `condition.message` as its message.
         * @param  {...{ assertion: *, message: string }} conditions 
         * @returns void
         * @throws NotSupportedError
         */
        prerequisite(...conditions)
        {
            for (const { assertion, message } of conditions) {
                const x = typeof assertion == "function" ? assertion() : assertion;
                if (!(x)) {
                    throw new NotSupportedError(message);
                }
            }
        },

        /**
         * Appends log entry to the test output.
         * @param {String} name The unique name of this log entry (multiple
         * entries with the same name override each other)
         * @param {String} value The text to render
         */
        decorate(name, value)
        {
            testNode.decorations[name] = value;
        },

        /**
         * Appends an HTML log entry to the test output.
         * @param {String} name The unique name of this log entry (multiple
         * entries with the same name override each other)
         * @param {String} value The HTML to render
         * @param {String} className The className of the wrapper in case you
         * need to set it
         */
        decorateHTML(name, value, className = "description")
        {
            testNode.decorations[name] = {
                __type: "html",
                html: value,
                className
            };
        },

        /**
         * Tests can call this to log an http request object. This will be
         * handled by dedicated request renderer on the frontend.
         * @param {Request} res The request to log
         * @param {String} label Give it a custom label if you want
         */
        logRequest(req, label = "Request")
        {
            testNode.decorations[label] = {
                __type : "request",
                method : req.method,
                url    : req.uri.href,
                headers: req.headers,
                body   : req.body || undefined
            };
        },

        /**
         * Tests can call this to log an http response object. This will be
         * handled by dedicated response renderer on the frontend.
         * @param {*} res The response to log
         * @param {String} label Give it a custom label if you want
         */
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

/**
 * JWKS is just an array of keys. We need to find the last private key that
 * also has a corresponding public key. The pair is recognized by having the
 * same "kid" property.
 * @param {Array} keys JWKS.keys 
 */
function findKeyPair(keys) {
    let out = null;

    keys.forEach(key => {
        if (!key.kid) return;
        if (!Array.isArray(key.key_ops)) return;
        if (key.key_ops.indexOf("sign") === -1) return;

        // If we are here, then key is a private key so look for its matching
        // public one
        let publicKey = keys.find(k => (
            k.kid === key.kid &&
            Array.isArray(k.key_ops) &&
            k.key_ops.indexOf("verify") > -1
        ));

        if (publicKey) {
            out = { privateKey: key, publicKey };
        }
    });

    return out;
}

/**
 * The test runner class is simple. It just knows its settings and executes the
 * given path (recursively) with those settings.
 */
class Runner extends EventEmitter
{
    /**
     * Create an instance of the Runner. Any settings passed here will be
     * remembered and later passed to each executed test.
     * @param {Object} settings The settings to use when the tests are executed.
     */
    constructor(settings = {})
    {
        super();

        this.canceled = false;

        const { jwks, ...rest } = settings;
        this.settings = { ...{ customHeaders: {} }, ...rest };

        // Keys can be provided separately in config as "privateKey" and
        // "publicKey" properties, or a "jwks" array can be provided. If
        // JWKS is used, find the privateKey and publicKey and set them
        // as top-level properties of the instance settings.
        if (jwks && Array.isArray(jwks.keys)) {
            const keys = findKeyPair(jwks.keys);
            if (keys) {
                Object.assign(this.settings, keys);
            }
        }
    }

    cancel()
    {
        this.canceled = true;
    }

    /**
     * 
     * @param {object} node 
     */
    async runInternal(node = groups)
    {
        const _node = {
            ...node,
            startedAt  : Date.now(),
            status     : "loading",
            decorations: {},
            warnings   : [],
            hookErrors : [],
            error      : null
        };

        const isRoot = _node.name === "__ROOT__";

        const api = createTestAPI(_node);

        const end = async (error) => {
            _node.endedAt = Date.now();

            if (_node.status === "loading") {
                _node.status = "succeeded";
            }

            if (_node.status === "not-supported" ||
                _node.status === "not-implemented") {
                return this.emit("testEnd", _node);
            }

            if (error) {
                if (error instanceof NotSupportedError) {
                    api.setNotSupported(error.message);
                } else {
                    _node.status = "failed";
                    _node.error = {
                        ...error,
                        message: String(error)
                    };
                    if (this.settings.bail) {
                        this.cancel();
                    }
                    // console.error(error);
                    // throw error;
                }
            }
            
            if (_node.type === "group") {

                // Invoke group after
                if (_node.after) {
                    try {
                        await _node.after(this.settings, api);
                    } catch (ex) {
                        _node.hookErrors.push(ex);
                    }
                }

                this.emit("groupEnd", _node);
                if (isRoot) {
                    this.emit("end");
                }
            }
            else {
                // Invoke test after
                if (_node.after) {
                    try {
                        await _node.after(this.settings, api);
                    } catch (ex) {
                        _node.hookErrors.push(ex);
                    }
                }

                // Invoke group afterEach
                if (currentGroup.afterEach) {
                    try {
                        await currentGroup.afterEach(this.settings, api);
                    } catch (ex) {
                        _node.hookErrors.push(ex);
                    }
                }

                this.emit("testEnd", _node);
            }
        };

        // GROUP NODE
        if (_node.type === "group") {

            currentGroup = _node;

            if (isRoot) {
                this.emit("start");
            }

            this.emit("groupStart", _node);

            if (_node.before) {
                try {
                    await _node.before(this.settings, api);
                } catch (ex) {
                    return await end(ex.message);
                }
            }

            for (const child of _node.children) {
                await this.runInternal(child);
                if (this.canceled) {
                    break;
                }
            }

            await end();
        }

        // TEST NODE
        else {
            
            if (!versionCheck(_node.version, this.settings.version || "1.0")) {
                _node.status = "skipped";
                return;
            }
    
            if (_node.maxVersion && !versionCheck(this.settings.version || "1.0", _node.maxVersion)) {
                _node.status = "skipped";
                return;
            }

            // Exit if no match
            if (this.settings.match) {
                const re = new RegExp(this.settings.match, "i");
                if (!re.test(_node.name)) {
                    _node.status = "skipped";
                    return;
                }
            }

            this.emit("testStart", _node);

            // Exit if not supported
            if (typeof _node.notSupported == "function") {
                const check = _node.notSupported(this.settings);
                if (check !== false) {
                    api.setNotSupported(check || "This test is not supported by this server");
                    return await end();
                }
            }

            // Exit if not implemented
            if (typeof _node.fn !== "function") {
                api.warn("This test is not implemented");
                api.setStatus("not-implemented");
                return await end();
            }

            // Invoke group beforeEach
            if (currentGroup.beforeEach) {
                try {
                    await currentGroup.beforeEach(this.settings, api);
                } catch (ex) {
                    return await end(ex);
                }
            }

            // Invoke test before
            if (_node.before) {
                try {
                    await _node.before(this.settings, api);
                } catch (ex) {
                    return await end(ex);
                }
            }

            // execute
            let execError;
            try {
                await _node.fn(this.settings, api);
            } catch (error) {
                execError = error;
            }

            await end(execError);
        }
    }

    /**
     * Execute the given node recursively. If no node is given executes the root
     * node (all the tests). If the node is a group, executes all it's children
     * recursively. If the node is a test (leaf) executes it and stops...
     * @param {Object} node 
     */
    run(node = groups)
    {
        // If run is called for a leaf node we don't know its parent so make
        // sure we find it manually and set it as `currentGroup`
        if (node.type !== "group") {
            let path = node.path.split(".");
            path.pop();
            path = path.join(".");
            currentGroup = getPath(path, this.settings.version);
        }
        return this.runInternal(node).catch(ex => console.error(ex));
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

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
    if (node.type == "group") {
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

function isPromise(p)
{
    return (p && typeof p.catch == "function" && typeof p.then == "function");
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
        const isRoot = node.name == "__ROOT__";

        node.startedAt = Date.now();

        if (node.type == "group") {

            if (isRoot) {
                this.emit("start");
            }

            this.emit("groupStart", node);

            for (const child of node.children) {
                await this.run(child);
            }

            node.endedAt = Date.now();

            this.emit("groupEnd", node);

            if (isRoot) {
                this.emit("end");
            }

        }
        else {
            node.status = "loading";
            this.emit("testStart", node);

            const decorations = {};

            const next = (error) => {
                node.decorations = decorations;
                node.endedAt = Date.now();
                if (error) {
                    node.status = "failed";
                    node.error = {
                        ...error,
                        message: String(error),
                        // stack: error.stack
                    };// console.log(error)
                    // node.error.message = String(error);
                    // this.emit("testFailure", error, node);
                } else {
                    node.status = node.fn ? "succeeded" : "not-implemented";
                    node.error = null;
                    // this.emit("testSuccess", node);
                }
                this.emit("testEnd", node);
            };

            node.error = null;

            try {
                if (typeof node.fn == "function") {
                    const p = node.fn.call(node, this.settings, decorations);
                    if (p && typeof p.catch == "function" && typeof p.then == "function") {
                        // p.then(() => next());
                        return p.then(() => next()).catch(next);
                        // await p;
                    }
                }
                else {
                    node.warning = "This test is not implemented";
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

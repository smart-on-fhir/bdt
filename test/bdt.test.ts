import * as Lab   from "@hapi/lab"
import { expect } from "@hapi/code"
import { bdt }    from "../src/lib/bdt"

// const { load, loadCode } = require("../build/index.js")
// const Group      = require("../build/Group").default
// const Test       = require("../build/Test").default
// const Runner     = require("../build/TestRunner").default
// const JSReporter = require("../build/reporters/js").default

// const { expect } = Code;
const lab = Lab.script();
const { describe, it } = lab;
export { lab };


describe.only("bdt", () => {

    it ("outputs proper JSON", async () => {
        // const tree = await bdt({
        //     pattern: "./fixtures/*.test.js",
        //     // reporter: "js"
        //     list: true,
        //     // apiVersion: "1",
        //     // authentication: {
        //     //     optional: true
        //     // }
        // });

        // console.log(JSON.stringify(tree, null, 4))
    })
})
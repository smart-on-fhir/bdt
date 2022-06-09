import {
    after,
    afterEach,
    before,
    beforeEach,
    suite,
    test
} from "../../../src/lib/bdt"


suite({
    // minVersion: "1.5",
    name: "suite 1",
    // description: "test",
    // maxVersion: "2.5",
    // path: "1.2.3"
}, () => {

    before(({ config, context }) => {
        console.log("before", config, context);
        context.log?.push("suite 1 - before");
    });

    after(({ config, context }) => {
        console.log("after", config, context);
        context.log?.push("suite 1 - after");
    });

    beforeEach(({ config, api, context }) => {
        console.log("beforeEach", config, api, context);
        context.log?.push("suite 1 - beforeEach");
    });

    afterEach(({ config, api, context }) => {
        console.log("afterEach", config, api, context);
        context.log?.push("suite 1 - afterEach");
    });

    test({
        id         : "id-1",
        name       : "test 1",
        description: "description 1",
        maxVersion : "3.2.1",
        minVersion : "1.2.3"
    }, async ({ api, config, context }) => {
        console.log("test", config, api, context);
        context.log?.push("suite 1 / test 1");
    });

    test("test-2", async ({ api, config, context }) => {
        console.log("test", config, api, context);
        context.log?.push("suite 1 / test 2");
    });
});

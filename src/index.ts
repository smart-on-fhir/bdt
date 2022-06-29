export * from "./lib"

if (require.main === module) { // called directly
    require("./lib/bin")
}

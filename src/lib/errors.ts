// import { expect } from "@hapi/code"

export class NotSupportedError extends Error {}

// const thrownRe = /\: Expected \[Function\] to not throw an error but got \[/g

// try {
//     expect(() => {
//         expect(() => {
//             expect(() => {
//                 expect(1, "'output' should equal 1").to.equal(2);
//             }, "The 'output' property of the response body is invalid").not.to.throw();
//         }, "The response body is invalid").not.to.throw();
//     }, "Request failed").not.to.throw();

// } catch (ex) {
//     const match = ex.message.match(thrownRe)
//     if (match) {
//         let i = 0
//         console.log(
//             ex.message
//             .replace(/Error\: /g, "")
//             .replace(thrownRe, () => `\n${++i === match.length ? "╰" : "├"}─ `)
//             .replace(/\]*$/, "")
//         )
//     } else {
//         throw ex
//     }
// }


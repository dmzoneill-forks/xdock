export default async function () {
    globalThis.logError = (...args) => console.error(...args);
    globalThis.log = (...args) => console.log(...args);
}

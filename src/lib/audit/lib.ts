
export function urlIsHttps(url = "") {
    return () => url && url.startsWith("https://")
}

export function urlHasNoUsername(url = "") {
    return () => {
        if (!url) return true
        const _url = new URL(url)
        return !_url.username
    }
}

export function urlHasNoPassword(url = "") {
    return () => {
        if (!url) return true
        const _url = new URL(url)
        return !_url.username
    }
}

export function merge(...args: Record<string, any>[]): Record<string, any> {
    let out: Record<string, any> = {}

    for (const obj of args) {
        for (const key in obj) {
            const val = obj[key]
            if (val && typeof val === "object") {
                out[key] = merge(out[key], val)
            } else if (val === undefined) {
                delete out[key]
            } else {
                out[key] = val
            }
        }
    }

    return out
}
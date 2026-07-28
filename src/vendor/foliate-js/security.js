// Applied both to EPUB source documents and at the renderer iframe boundary.
// Book resources are materialized as blob:/data: URLs. `self` is needed only
// for Owlry's injected, same-origin reader fonts.
export const CONTENT_SECURITY_POLICY = [
    "default-src 'none'",
    "img-src blob: data:",
    "media-src blob: data:",
    "font-src 'self' blob: data:",
    "style-src 'unsafe-inline' blob:",
    "connect-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
].join('; ')

export const injectContentSecurityPolicy = doc => {
    let head = doc.querySelector('head')
    if (!head && doc.documentElement) {
        head = doc.createElementNS(
            doc.documentElement.namespaceURI
                ?? 'http://www.w3.org/1999/xhtml', 'head')
        doc.documentElement.prepend(head)
    }
    if (!head) return
    const meta = doc.createElementNS(
        head.namespaceURI ?? 'http://www.w3.org/1999/xhtml', 'meta')
    meta.setAttribute('http-equiv', 'Content-Security-Policy')
    meta.setAttribute('content', CONTENT_SECURITY_POLICY)
    head.prepend(meta)
}

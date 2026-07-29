// Applied both to EPUB source documents and at the renderer iframe boundary.
// Book resources are materialized as blob:/data: URLs. `self` is needed only
// for Owlry's injected, same-origin reader fonts.
export const CONTENT_SECURITY_POLICY = [
    "default-src 'none'",
    "script-src 'none'",
    "script-src-attr 'none'",
    "worker-src 'none'",
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

// WebKit blocks parent-installed event callbacks inside a sandboxed iframe
// unless the frame also has allow-scripts (WebKit bug 218086). We must never
// grant that capability based on a file extension or a book-provided MIME
// value. Only URLs produced by one of our CSP-injected and sanitized document
// serializers are marked here; SVG and unknown document types remain
// script-sandboxed.
const eventSafeDocumentURLs = new Set()

export const markEventSafeDocumentURL = url => {
    if (typeof url === 'string' && url) eventSafeDocumentURLs.add(url)
    return url
}

export const unmarkEventSafeDocumentURL = url => {
    if (typeof url === 'string') eventSafeDocumentURLs.delete(url)
}

export const isEventSafeDocumentURL = url =>
    typeof url === 'string' && eventSafeDocumentURLs.has(url)

const ACTIVE_ELEMENTS =
    'script,iframe,frame,frameset,object,embed,applet,portal'
const URL_ATTRIBUTES = new Set([
    'href', 'src', 'action', 'formaction', 'poster', 'data',
])
const EXECUTABLE_URL = /^\s*(?:javascript|vbscript):/i

// CSP is the primary execution boundary. Removing executable markup as well
// gives the allow-scripts WebKit workaround a second, independent guard and
// ensures script resources are never even requested while rewriting a book.
export const sanitizeContentDocument = doc => {
    for (const element of doc.querySelectorAll(ACTIVE_ELEMENTS)) element.remove()
    for (const element of doc.querySelectorAll('*')) {
        for (const attribute of Array.from(element.attributes ?? [])) {
            const name = attribute.localName.toLowerCase()
            if (name.startsWith('on')
                || (URL_ATTRIBUTES.has(name) && EXECUTABLE_URL.test(attribute.value)))
                element.removeAttributeNode(attribute)
        }
    }
}

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

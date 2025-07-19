
/**
 * @typedef {Object} ElemOptions
 * @property {string} [id]
 * @property {string} [cls]
 * @property {string} [text]
 * @property {ElemAttrs} [attrs]
 * @property {HTMLElement} [parent]
 * 
 * @typedef {[string, any][]} ElemAttrs
 */


/**
 * Creates an element
 * @param {string} tag 
 * @param {ElemOptions} [options]
 */
export function elem(tag, options) {
    
    const elem = document.createElement(tag);
    
    if (!options) return elem;
    
    const { id, cls, text, attrs, parent } = options;
    elem.id = id;
    elem.className = cls;
    elem.textContent = text;
    if (attrs) {
        for (const [attr, val] of attrs) {
            elem.setAttribute(attr, val);
        }
    }
    if (parent) parent.appendChild(elem);
    
    return elem;
}
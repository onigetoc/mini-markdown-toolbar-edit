"use strict";
// ── Adapter ──
class TextareaAdapter {
    constructor(el) {
        this._el = el;
    }
    get value() { return this._el.value; }
    set value(v) { this._el.value = v; }
    get selectionStart() { return this._el.selectionStart; }
    set selectionStart(v) { this._el.selectionStart = v; }
    get selectionEnd() { return this._el.selectionEnd; }
    set selectionEnd(v) { this._el.selectionEnd = v; }
    focus() { this._el.focus(); }
    setSelectionRange(a, b) { this._el.setSelectionRange(a, b); }
    dispatchEvent(e) { this._el.dispatchEvent(e); }
    addEventListener(ev, fn, opts) { this._el.addEventListener(ev, fn, opts); }
    removeEventListener(ev, fn) { this._el.removeEventListener(ev, fn); }
    get contentEditable() { return this._el.contentEditable; }
    set contentEditable(v) { this._el.contentEditable = v; }
    get scrollTop() { return this._el.scrollTop; }
    set scrollTop(v) { this._el.scrollTop = v; }
}
// ── Editor setup ──
const textarea = document.querySelector('#textarea');
const editor = new TextareaAdapter(textarea);
const mdToolbar = document.querySelector('markdown-toolbar');
mdToolbar._editor = editor;
// ── History Manager ──
(function () {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const history = [editor.value];
    let index = 0;
    function updateButtons() {
        undoBtn.style.opacity = index > 0 ? '1' : '0.3';
        redoBtn.style.opacity = index < history.length - 1 ? '1' : '0.3';
    }
    function push() {
        if (editor.value === history[index])
            return;
        history.length = index + 1;
        history.push(editor.value);
        index++;
        updateButtons();
    }
    function undo() {
        if (index > 0) {
            index--;
            editor.value = history[index];
            editor.dispatchEvent(new Event('input', { bubbles: true }));
            updateButtons();
        }
    }
    function redo() {
        if (index < history.length - 1) {
            index++;
            editor.value = history[index];
            editor.dispatchEvent(new Event('input', { bubbles: true }));
            updateButtons();
        }
    }
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    let timeout;
    editor.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(push, 500);
    });
    updateButtons();
})();
// ── Responsive overflow ──
(function () {
    const wrap = document.getElementById('overflow-wrap');
    const btn = document.getElementById('overflow-btn');
    const drop = document.getElementById('overflow-drop');
    const SEL = [
        'md-bold', 'md-italic', 'md-strikethrough', 'md-underline', 'md-header',
        'md-link', 'md-image', 'md-quote', 'md-code', 'md-code-block',
        'md-unordered-list', 'md-ordered-list', 'md-task-list', 'md-table', 'md-highlight', 'md-tag', 'md-mention'
    ].join(',');
    const buttons = Array.from(mdToolbar.querySelectorAll(SEL));
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    buttons.push(undoBtn, redoBtn);
    let open = false;
    let ticking = false;
    wrap.style.display = 'none';
    function rebuild(hidden) {
        drop.innerHTML = '';
        for (const el of hidden) {
            const c = document.createElement('button');
            c.className = 'toolbar-btn';
            c.setAttribute('type', 'button');
            const t = el.getAttribute('title') || el.getAttribute('data-title') || '';
            const l = document.createElement('span');
            l.className = 'btn-label';
            l.textContent = t;
            const svg = el.querySelector('svg').cloneNode(true);
            c.appendChild(svg);
            c.appendChild(l);
            c.addEventListener('click', function (e) { e.stopPropagation(); el.click(); close(); });
            drop.appendChild(c);
        }
    }
    function totalWidth() {
        const children = mdToolbar.children;
        let w = 0;
        for (let i = 0; i < children.length; i++) {
            w += children[i].offsetWidth;
            if (i < children.length - 1)
                w += 4;
        }
        return w;
    }
    function layout() {
        if (ticking)
            return;
        ticking = true;
        for (let bi = 0; bi < buttons.length; bi++) {
            buttons[bi].style.display = '';
        }
        wrap.style.display = 'none';
        const tw = mdToolbar.offsetWidth;
        if (!tw) {
            ticking = false;
            return;
        }
        const availContent = tw - 16;
        const needed = totalWidth();
        if (needed <= availContent) {
            close();
            ticking = false;
            return;
        }
        wrap.style.display = '';
        const wrapW = wrap.offsetWidth;
        let stickyW = 0;
        const children = mdToolbar.children;
        for (let ci = 0; ci < children.length; ci++) {
            const el = children[ci];
            if (el.classList.contains('spacer') || el.classList.contains('sep') || el.id === 'undo-btn' || el.id === 'redo-btn') {
                stickyW += el.offsetWidth;
            }
        }
        const avail = availContent - stickyW - wrapW - 8;
        const hidden = [];
        for (let hi = buttons.length - 1; hi >= 0; hi--) {
            if (buttons[hi].id === 'undo-btn' || buttons[hi].id === 'redo-btn') continue;
            buttons[hi].style.display = 'none';
            hidden.push(buttons[hi]);
            let visW = 0;
            for (let vj = 0; vj < hi; vj++) {
                if (buttons[vj].id === 'undo-btn' || buttons[vj].id === 'redo-btn') continue;
                visW += buttons[vj].offsetWidth + 4;
            }
            if (visW <= avail)
                break;
        }
        hidden.reverse();
        // Hide trailing or orphaned separators
        for (let si = 0; si < children.length; si++) {
            const c = children[si];
            if (c.classList.contains('sep')) {
                let prevVisible = null, nextVisible = null;
                for (let pi = si - 1; pi >= 0; pi--) { if (children[pi].style.display !== 'none') { prevVisible = children[pi]; break; } }
                for (let ni = si + 1; ni < children.length; ni++) { if (children[ni].style.display !== 'none') { nextVisible = children[ni]; break; } }
                if (!nextVisible || (prevVisible && prevVisible.classList.contains('sep'))) {
                    c.style.display = 'none';
                }
            }
        }
        rebuild(hidden);
        if (!open)
            close();
        ticking = false;
    }
    function openD() {
        open = true;
        const r = btn.getBoundingClientRect();
        drop.style.top = (r.bottom + 15) + 'px';
        drop.style.right = (window.innerWidth - r.right) + 'px';
        drop.classList.add('open');
        btn.classList.add('active');
        document.body.appendChild(drop);
    }
    function close() {
        open = false;
        drop.classList.remove('open');
        btn.classList.remove('active');
        wrap.appendChild(drop);
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); open ? close() : openD(); });
    document.addEventListener('click', function (e) {
        if (open && !drop.contains(e.target) && e.target !== btn)
            close();
    });
    new ResizeObserver(layout).observe(mdToolbar);
    window.addEventListener('resize', layout);
    layout();
})();
// ── Smart hashtag (#) and mention (@) ──
(function () {
    if (customElements.get('md-tag'))
        return;
    function toggleTag(ta) {
        let s = ta.selectionStart, e = ta.selectionEnd;
        const v = ta.value;
        const wc = /[a-zA-Z0-9_\u00C0-\u024F]/;
        if (s === e) {
            while (s > 0 && v[s - 1] && wc.test(v[s - 1]))
                s--;
            while (e < v.length && v[e] && wc.test(v[e]))
                e++;
        }
        const word = v.substring(s, e);
        if (!word)
            return;
        ta.focus();
        if (s > 0 && v[s - 1] === '#') {
            ta.setSelectionRange(s - 1, e);
            try {
                document.execCommand('insertText', false, word);
            }
            catch (_) {
                const st = ta.scrollTop;
                ta.value = v.substring(0, s - 1) + word + v.substring(e);
                ta.scrollTop = st;
            }
            ta.setSelectionRange(s - 1, e - 1);
        }
        else {
            ta.setSelectionRange(s, e);
            try {
                document.execCommand('insertText', false, '#' + word);
            }
            catch (_) {
                const st = ta.scrollTop;
                ta.value = v.substring(0, s) + '#' + word + v.substring(e);
                ta.scrollTop = st;
            }
            ta.setSelectionRange(s + 1, e + 1);
        }
        ta.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }
    class SmartTag extends HTMLElement {
        connectedCallback() {
            if (this._tagged)
                return;
            this._tagged = true;
            if (!this.hasAttribute('role'))
                this.setAttribute('role', 'button');
            this.addEventListener('click', (e) => {
                e.preventDefault();
                const tb = this.closest('markdown-toolbar');
                if (tb)
                    toggleTag(tb.field);
            });
            this.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    const tb = this.closest('markdown-toolbar');
                    if (tb)
                        toggleTag(tb.field);
                }
            });
        }
    }
    customElements.define('md-tag', SmartTag);
    if (!customElements.get('md-mention')) {
        function toggleMention(ta) {
            let s = ta.selectionStart, e = ta.selectionEnd;
            const v = ta.value;
            const wc = /[a-zA-Z0-9_\u00C0-\u024F]/;
            if (s === e) {
                while (s > 0 && v[s - 1] && wc.test(v[s - 1]))
                    s--;
                while (e < v.length && v[e] && wc.test(v[e]))
                    e++;
            }
            const word = v.substring(s, e);
            if (!word)
                return;
            ta.focus();
            if (s > 0 && v[s - 1] === '@') {
                ta.setSelectionRange(s - 1, e);
                try {
                    document.execCommand('insertText', false, word);
                }
                catch (_) {
                    const st = ta.scrollTop;
                    ta.value = v.substring(0, s - 1) + word + v.substring(e);
                    ta.scrollTop = st;
                }
                ta.setSelectionRange(s - 1, e - 1);
            }
            else {
                ta.setSelectionRange(s, e);
                try {
                    document.execCommand('insertText', false, '@' + word);
                }
                catch (_) {
                    const st = ta.scrollTop;
                    ta.value = v.substring(0, s) + '@' + word + v.substring(e);
                    ta.scrollTop = st;
                }
                ta.setSelectionRange(s + 1, e + 1);
            }
            ta.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        }
        class SmartMention extends HTMLElement {
            connectedCallback() {
                if (this._tagged)
                    return;
                this._tagged = true;
                if (!this.hasAttribute('role'))
                    this.setAttribute('role', 'button');
                this.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tb = this.closest('markdown-toolbar');
                    if (tb)
                        toggleMention(tb.field);
                });
                this.addEventListener('keydown', (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        const tb = this.closest('markdown-toolbar');
                        if (tb)
                            toggleMention(tb.field);
                    }
                });
            }
        }
        customElements.define('md-mention', SmartMention);
    }
})();
// ── markdown-toolbar-element (from GitHub) - typed ──
(function () {
    function getButtons(toolbar) {
        const els = [];
        for (const button of toolbar.querySelectorAll('[data-md-button],md-header,md-bold,md-italic,md-quote,md-code,md-code-block,md-link,md-image,md-unordered-list,md-ordered-list,md-task-list,md-tag,md-highlight,md-underline,md-ref,md-strikethrough,md-table,md-mention')) {
            if (button.hidden || (button.offsetWidth <= 0 && button.offsetHeight <= 0))
                continue;
            if (button.closest('markdown-toolbar') === toolbar)
                els.push(button);
        }
        return els;
    }
    function keydown(fn) {
        return function (event) { if (event.key === ' ' || event.key === 'Enter')
            fn(event); };
    }
    const styles = new WeakMap();
    const manualStyles = {
        bold: { prefix: '**', suffix: '**', trimFirst: true },
        italic: { prefix: '_', suffix: '_', trimFirst: true },
        quote: { prefix: '> ', multiline: true, surroundWithNewlines: true },
        code: { prefix: '`', suffix: '`', blockPrefix: '```', blockSuffix: '```' },
        'code-block': { prefix: '```\n', suffix: '\n```', multiline: true },
        link: { prefix: '[', suffix: '](url)', replaceNext: 'url', scanFor: 'https?://' },
        image: { prefix: '![', suffix: '](url)', replaceNext: 'url', scanFor: 'https?://' },
        'unordered-list': { prefix: '- ', multiline: true, unorderedList: true },
        'ordered-list': { prefix: '1. ', multiline: true, orderedList: true },
        'task-list': { prefix: '- [ ] ', multiline: true, taskList: true },
        tag: { prefix: '#', prefixSpace: true },
        mention: { prefix: '@', prefixSpace: true },
        highlight: { prefix: '==', suffix: '==', trimFirst: true },
        ref: { prefix: '#', prefixSpace: true },
        strikethrough: { prefix: '~~', suffix: '~~', trimFirst: true },
        underline: { prefix: '<u>', suffix: '</u>', trimFirst: true },
        table: { prefix: '| Header | Header | Header |\n| --- | --- | --- |\n| Cell | Cell | Cell |', multiline: true, surroundWithNewlines: true }
    };
    class MarkdownButtonElement extends HTMLElement {
        constructor() {
            super();
            const apply = (event) => {
                const style = styles.get(this);
                if (!style)
                    return;
                event.preventDefault();
                applyStyle(this, style);
            };
            this.addEventListener('keydown', keydown(apply));
            this.addEventListener('click', apply);
        }
        connectedCallback() { if (!this.hasAttribute('role'))
            this.setAttribute('role', 'button'); }
        click() { const style = styles.get(this); if (style)
            applyStyle(this, style); }
    }
    class MarkdownHeaderButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { isHeader: true }); }
    }
    if (!customElements.get('md-header'))
        customElements.define('md-header', MarkdownHeaderButtonElement);
    class MarkdownBoldButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { prefix: '**', suffix: '**', trimFirst: true }); }
    }
    if (!customElements.get('md-bold'))
        customElements.define('md-bold', MarkdownBoldButtonElement);
    class MarkdownItalicButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { prefix: '_', suffix: '_', trimFirst: true }); }
    }
    if (!customElements.get('md-italic'))
        customElements.define('md-italic', MarkdownItalicButtonElement);
    class MarkdownQuoteButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { prefix: '> ', multiline: true, surroundWithNewlines: true }); }
    }
    if (!customElements.get('md-quote'))
        customElements.define('md-quote', MarkdownQuoteButtonElement);
    class MarkdownCodeButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { prefix: '`', suffix: '`', blockPrefix: '```', blockSuffix: '```' }); }
    }
    if (!customElements.get('md-code'))
        customElements.define('md-code', MarkdownCodeButtonElement);
    class MarkdownLinkButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { prefix: '[', suffix: '](url)', replaceNext: 'url', scanFor: 'https?://' }); }
    }
    if (!customElements.get('md-link'))
        customElements.define('md-link', MarkdownLinkButtonElement);
    class MarkdownImageButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { prefix: '![', suffix: '](url)', replaceNext: 'url', scanFor: 'https?://' }); }
    }
    if (!customElements.get('md-image'))
        customElements.define('md-image', MarkdownImageButtonElement);
    class MarkdownUnorderedListButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { prefix: '- ', multiline: true, unorderedList: true }); }
    }
    if (!customElements.get('md-unordered-list'))
        customElements.define('md-unordered-list', MarkdownUnorderedListButtonElement);
    class MarkdownOrderedListButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { prefix: '1. ', multiline: true, orderedList: true }); }
    }
    if (!customElements.get('md-ordered-list'))
        customElements.define('md-ordered-list', MarkdownOrderedListButtonElement);
    class MarkdownTaskListButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { prefix: '- [ ] ', multiline: true, taskList: true }); }
    }
    if (!customElements.get('md-task-list'))
        customElements.define('md-task-list', MarkdownTaskListButtonElement);
    class MarkdownTagButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { prefix: '#', prefixSpace: true }); }
    }
    if (!customElements.get('md-tag'))
        customElements.define('md-tag', MarkdownTagButtonElement);
    class MarkdownHighlightButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { prefix: '==', suffix: '==', trimFirst: true }); }
    }
    if (!customElements.get('md-highlight'))
        customElements.define('md-highlight', MarkdownHighlightButtonElement);
    class MarkdownStrikethroughButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { prefix: '~~', suffix: '~~', trimFirst: true }); }
    }
    if (!customElements.get('md-strikethrough'))
        customElements.define('md-strikethrough', MarkdownStrikethroughButtonElement);
    class MarkdownUnderlineButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { prefix: '<u>', suffix: '</u>', trimFirst: true }); }
    }
    if (!customElements.get('md-underline'))
        customElements.define('md-underline', MarkdownUnderlineButtonElement);
    class MarkdownRefButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { prefix: '#', prefixSpace: true }); }
    }
    if (!customElements.get('md-ref'))
        customElements.define('md-ref', MarkdownRefButtonElement);
    class MarkdownMentionButtonElement extends MarkdownButtonElement {
        connectedCallback() { styles.set(this, { prefix: '@', prefixSpace: true }); }
    }
    if (!customElements.get('md-mention'))
        customElements.define('md-mention', MarkdownMentionButtonElement);
    class MarkdownToolbarElement extends HTMLElement {
        connectedCallback() {
            if (!this.hasAttribute('role'))
                this.setAttribute('role', 'toolbar');
            if (!this.hasAttribute('data-no-focus'))
                setFocusManagement(this);
            this.addEventListener('keydown', keydown(applyFromToolbar));
            this.addEventListener('click', applyFromToolbar);
        }
        attributeChangedCallback(name, _oldValue, newValue) {
            if (name !== 'data-no-focus')
                return;
            if (newValue === null)
                setFocusManagement(this);
            else
                unsetFocusManagement(this);
        }
        disconnectedCallback() { unsetFocusManagement(this); }
        get field() {
            const id = this.getAttribute('for');
            if (!id)
                return null;
            const root = 'getRootNode' in this ? this.getRootNode() : document;
            let field = null;
            if (root instanceof Document || root instanceof ShadowRoot)
                field = root.getElementById(id);
            return field instanceof HTMLTextAreaElement ? field : null;
        }
    }
    MarkdownToolbarElement.observedAttributes = ['data-no-focus'];
    if (!customElements.get('markdown-toolbar'))
        customElements.define('markdown-toolbar', MarkdownToolbarElement);
    function onToolbarFocus({ target }) {
        if (!(target instanceof Element))
            return;
        target.removeAttribute('tabindex');
        let tabindex = '0';
        for (const button of getButtons(target)) {
            button.setAttribute('tabindex', tabindex);
            if (tabindex === '0') {
                button.focus();
                tabindex = '-1';
            }
        }
    }
    function focusKeydown(event) {
        const key = event.key;
        if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End')
            return;
        const toolbar = event.currentTarget;
        if (!toolbar)
            return;
        const buttons = getButtons(toolbar);
        const index = buttons.indexOf(event.target);
        const length = buttons.length;
        if (index === -1)
            return;
        let n = index;
        if (key === 'ArrowLeft')
            n = index - 1;
        else if (key === 'ArrowRight')
            n = index + 1;
        else if (key === 'End')
            n = length - 1;
        if (n < 0)
            n = length - 1;
        if (n > length - 1)
            n = 0;
        for (let i = 0; i < length; i += 1)
            buttons[i].setAttribute('tabindex', i === n ? '0' : '-1');
        event.preventDefault();
        buttons[n].focus();
    }
    function setFocusManagement(toolbar) {
        toolbar.addEventListener('keydown', focusKeydown);
        toolbar.setAttribute('tabindex', '0');
        toolbar.addEventListener('focus', onToolbarFocus, { once: true });
    }
    function unsetFocusManagement(toolbar) {
        toolbar.removeEventListener('keydown', focusKeydown);
        toolbar.removeAttribute('tabindex');
        toolbar.removeEventListener('focus', onToolbarFocus);
    }
    function applyFromToolbar(event) {
        const target = event.target;
        const currentTarget = event.currentTarget;
        if (!target)
            return;
        const mdButton = target.closest('[data-md-button]');
        if (!mdButton || mdButton.closest('markdown-toolbar') !== currentTarget)
            return;
        const mdButtonStyle = mdButton.getAttribute('data-md-button');
        const style = manualStyles[mdButtonStyle];
        if (!style)
            return;
        event.preventDefault();
        applyStyle(mdButton, style);
    }
    function isMultipleLines(string) { return string.trim().split('\n').length > 1; }
    function repeat(string, n) { return Array(n + 1).join(string); }
    function wordSelectionStart(text, i) {
        let index = i;
        while (text[index] && text[index - 1] != null && !text[index - 1].match(/\s/))
            index--;
        return index;
    }
    function wordSelectionEnd(text, i, multiline) {
        let index = i;
        const breakpoint = multiline ? /\n/ : /\s/;
        while (text[index] && !text[index].match(breakpoint))
            index++;
        return index;
    }
    let canInsertText = null;
    function insertText(textarea, { text, selectionStart, selectionEnd }) {
        const originalSelectionStart = textarea.selectionStart;
        const before = textarea.value.slice(0, originalSelectionStart);
        const after = textarea.value.slice(textarea.selectionEnd);
        if (canInsertText === null || canInsertText === true) {
            textarea.contentEditable = 'true';
            try {
                canInsertText = document.execCommand('insertText', false, text);
            }
            catch (_e) {
                canInsertText = false;
            }
            textarea.contentEditable = 'false';
        }
        if (canInsertText && !textarea.value.slice(0, textarea.selectionStart).endsWith(text))
            canInsertText = false;
        if (!canInsertText) {
            try {
                document.execCommand('ms-beginUndoUnit');
            }
            catch (_e) { /* noop */ }
            textarea.value = before + text + after;
            try {
                document.execCommand('ms-endUndoUnit');
            }
            catch (_e) { /* noop */ }
            textarea.dispatchEvent(new CustomEvent('input', { bubbles: true, cancelable: true }));
        }
        if (selectionStart != null && selectionEnd != null)
            textarea.setSelectionRange(selectionStart, selectionEnd);
        else
            textarea.setSelectionRange(originalSelectionStart, textarea.selectionEnd);
    }
    function styleSelectedText(textarea, styleArgs) {
        const text = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
        let result;
        if (styleArgs.orderedList || styleArgs.unorderedList || styleArgs.taskList)
            result = listStyle(textarea, styleArgs);
        else if (styleArgs.multiline && isMultipleLines(text))
            result = multilineStyle(textarea, styleArgs);
        else
            result = blockStyle(textarea, styleArgs);
        insertText(textarea, result);
    }
    function expandSelectionToLine(textarea) {
        const lines = textarea.value.split('\n');
        let counter = 0;
        for (let index = 0; index < lines.length; index++) {
            const lineLength = lines[index].length + 1;
            if (textarea.selectionStart >= counter && textarea.selectionStart < counter + lineLength)
                textarea.selectionStart = counter;
            if (textarea.selectionEnd >= counter && textarea.selectionEnd < counter + lineLength)
                textarea.selectionEnd = counter + lineLength - 1;
            counter += lineLength;
        }
    }
    function expandSelectedText(textarea, prefixToUse, suffixToUse, multiline) {
        if (textarea.selectionStart === textarea.selectionEnd) {
            textarea.selectionStart = wordSelectionStart(textarea.value, textarea.selectionStart);
            textarea.selectionEnd = wordSelectionEnd(textarea.value, textarea.selectionEnd, multiline);
        }
        else {
            const expandedSelectionStart = textarea.selectionStart - prefixToUse.length;
            const expandedSelectionEnd = textarea.selectionEnd + suffixToUse.length;
            const beginsWithPrefix = textarea.value.slice(expandedSelectionStart, textarea.selectionStart) === prefixToUse;
            const endsWithSuffix = textarea.value.slice(textarea.selectionEnd, expandedSelectionEnd) === suffixToUse;
            if (beginsWithPrefix && endsWithSuffix) {
                textarea.selectionStart = expandedSelectionStart;
                textarea.selectionEnd = expandedSelectionEnd;
            }
        }
        return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
    }
    function newlinesToSurroundSelectedText(textarea) {
        const beforeSelection = textarea.value.slice(0, textarea.selectionStart);
        const afterSelection = textarea.value.slice(textarea.selectionEnd);
        const breaksBefore = beforeSelection.match(/\n*$/);
        const breaksAfter = afterSelection.match(/^\n*/);
        const newlinesBeforeSelection = breaksBefore ? breaksBefore[0].length : 0;
        const newlinesAfterSelection = breaksAfter ? breaksAfter[0].length : 0;
        let newlinesToAppend = '', newlinesToPrepend = '';
        if (beforeSelection.match(/\S/) && newlinesBeforeSelection < 2)
            newlinesToAppend = repeat('\n', 2 - newlinesBeforeSelection);
        if (afterSelection.match(/\S/) && newlinesAfterSelection < 2)
            newlinesToPrepend = repeat('\n', 2 - newlinesAfterSelection);
        return { newlinesToAppend, newlinesToPrepend };
    }
    function blockStyle(textarea, arg) {
        const { prefix = '', suffix = '', blockPrefix = '', blockSuffix = '', replaceNext = '', prefixSpace = false, scanFor = '', surroundWithNewlines = false } = arg;
        const originalSelectionStart = textarea.selectionStart, originalSelectionEnd = textarea.selectionEnd;
        let selectedText = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
        let prefixToUse = isMultipleLines(selectedText) && blockPrefix.length > 0 ? `${blockPrefix}\n` : prefix;
        let suffixToUse = isMultipleLines(selectedText) && blockSuffix.length > 0 ? `\n${blockSuffix}` : suffix;
        if (prefixSpace) {
            const beforeSelection = textarea.value[textarea.selectionStart - 1];
            if (textarea.selectionStart !== 0 && beforeSelection != null && !beforeSelection.match(/\s/))
                prefixToUse = ` ${prefixToUse}`;
        }
        selectedText = expandSelectedText(textarea, prefixToUse, suffixToUse, arg.multiline);
        let selectionStart = textarea.selectionStart, selectionEnd = textarea.selectionEnd;
        const hasReplaceNext = replaceNext.length > 0 && suffixToUse.indexOf(replaceNext) > -1 && selectedText.length > 0;
        if (surroundWithNewlines) {
            const ref = newlinesToSurroundSelectedText(textarea);
            prefixToUse = ref.newlinesToAppend + prefix;
            suffixToUse += ref.newlinesToPrepend;
        }
        if (selectedText.startsWith(prefixToUse) && selectedText.endsWith(suffixToUse)) {
            const replacementText = selectedText.slice(prefixToUse.length, selectedText.length - suffixToUse.length);
            if (originalSelectionStart === originalSelectionEnd) {
                let position = originalSelectionStart - prefixToUse.length;
                position = Math.max(position, selectionStart);
                position = Math.min(position, selectionStart + replacementText.length);
                selectionStart = selectionEnd = position;
            }
            else
                selectionEnd = selectionStart + replacementText.length;
            return { text: replacementText, selectionStart, selectionEnd };
        }
        else if (!hasReplaceNext) {
            let replacementText = prefixToUse + selectedText + suffixToUse;
            selectionStart = originalSelectionStart + prefixToUse.length;
            selectionEnd = originalSelectionEnd + prefixToUse.length;
            const whitespaceEdges = selectedText.match(/^\s*|\s*$/g);
            if (arg.trimFirst && whitespaceEdges) {
                const leadingWhitespace = whitespaceEdges[0] || '', trailingWhitespace = whitespaceEdges[1] || '';
                replacementText = leadingWhitespace + prefixToUse + selectedText.trim() + suffixToUse + trailingWhitespace;
                selectionStart += leadingWhitespace.length;
                selectionEnd -= trailingWhitespace.length;
            }
            return { text: replacementText, selectionStart, selectionEnd };
        }
        else if (scanFor.length > 0 && selectedText.match(scanFor)) {
            suffixToUse = suffixToUse.replace(replaceNext, selectedText);
            selectionStart = selectionEnd = selectionStart + prefixToUse.length;
            return { text: prefixToUse + suffixToUse, selectionStart, selectionEnd };
        }
        else {
            const replacementText = prefixToUse + selectedText + suffixToUse;
            selectionStart = selectionStart + prefixToUse.length + selectedText.length + suffixToUse.indexOf(replaceNext);
            selectionEnd = selectionStart + replaceNext.length;
            return { text: replacementText, selectionStart, selectionEnd };
        }
    }
    function multilineStyle(textarea, arg) {
        const { prefix = '', suffix = '', surroundWithNewlines = false } = arg;
        let text = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
        let selectionStart = textarea.selectionStart, selectionEnd = textarea.selectionEnd;
        const lines = text.split('\n');
        const undoStyle = lines.every(line => line.startsWith(prefix) && line.endsWith(suffix));
        if (undoStyle) {
            text = lines.map(line => line.slice(prefix.length, line.length - suffix.length)).join('\n');
            selectionEnd = selectionStart + text.length;
        }
        else {
            text = lines.map(line => prefix + line + suffix).join('\n');
            if (surroundWithNewlines) {
                const { newlinesToAppend, newlinesToPrepend } = newlinesToSurroundSelectedText(textarea);
                selectionStart += newlinesToAppend.length;
                selectionEnd = selectionStart + text.length;
                text = newlinesToAppend + text + newlinesToPrepend;
            }
        }
        return { text, selectionStart, selectionEnd };
    }
    function unorderedListStyle(text) {
        const lines = text.split('\n');
        const unorderedListPrefix = '- ';
        const shouldUndoUnorderedList = lines.every(line => line.startsWith(unorderedListPrefix));
        let result = lines;
        if (shouldUndoUnorderedList)
            result = lines.map(line => line.slice(unorderedListPrefix.length, line.length));
        return { text: result.join('\n'), processed: shouldUndoUnorderedList };
    }
    function orderedListStyle(text) {
        const lines = text.split('\n');
        const orderedListRegex = /^\d+\.\s+/;
        const shouldUndoOrderedList = lines.every(line => orderedListRegex.test(line));
        let result = lines;
        if (shouldUndoOrderedList)
            result = lines.map(line => line.replace(orderedListRegex, ''));
        return { text: result.join('\n'), processed: shouldUndoOrderedList };
    }
    function makePrefix(index, unorderedList, taskList) {
        if (taskList)
            return '- [ ] ';
        return unorderedList ? '- ' : `${index + 1}. `;
    }
    function taskListStyle(text) {
        const lines = text.split('\n');
        const taskListPrefix = '- [ ] ';
        const shouldUndo = lines.every(line => line.startsWith(taskListPrefix));
        let result = lines;
        if (shouldUndo)
            result = lines.map(line => line.slice(taskListPrefix.length));
        return { text: result.join('\n'), processed: shouldUndo };
    }
    function clearExistingListStyle(style, selectedText) {
        let undoResult, undoResultOpositeList, pristineText;
        if (style.taskList) {
            undoResult = taskListStyle(selectedText);
            undoResultOpositeList = { text: undoResult.text, processed: false };
            pristineText = undoResult.text;
        }
        else if (style.orderedList) {
            undoResult = orderedListStyle(selectedText);
            undoResultOpositeList = unorderedListStyle(undoResult.text);
            pristineText = undoResultOpositeList.text;
        }
        else {
            undoResult = unorderedListStyle(selectedText);
            undoResultOpositeList = orderedListStyle(undoResult.text);
            pristineText = undoResultOpositeList.text;
        }
        return [undoResult, undoResultOpositeList, pristineText];
    }
    function listStyle(textarea, style) {
        const noInitialSelection = textarea.selectionStart === textarea.selectionEnd;
        let selectionStart = textarea.selectionStart, selectionEnd = textarea.selectionEnd;
        expandSelectionToLine(textarea);
        const selectedText = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
        const [undoResult, undoResultOpositeList, pristineText] = clearExistingListStyle(style, selectedText);
        const prefixedLines = pristineText.split('\n').map((value, idx) => `${makePrefix(idx, style.unorderedList, style.taskList)}${value}`);
        const totalPrefixLength = prefixedLines.reduce((prev, _, idx) => prev + makePrefix(idx, style.unorderedList, style.taskList).length, 0);
        const totalPrefixLengthOpositeList = prefixedLines.reduce((prev, _, idx) => prev + makePrefix(idx, !style.unorderedList, false).length, 0);
        if (undoResult.processed) {
            if (noInitialSelection) {
                selectionStart = Math.max(selectionStart - makePrefix(0, style.unorderedList, style.taskList).length, 0);
                selectionEnd = selectionStart;
            }
            else {
                selectionStart = textarea.selectionStart;
                selectionEnd = textarea.selectionEnd - totalPrefixLength;
            }
            return { text: pristineText, selectionStart, selectionEnd };
        }
        const text = prefixedLines.join('\n');
        if (noInitialSelection) {
            selectionStart = Math.max(selectionStart + makePrefix(0, style.unorderedList, style.taskList).length, 0);
            selectionEnd = selectionStart;
        }
        else {
            if (undoResultOpositeList.processed) {
                selectionStart = textarea.selectionStart;
                selectionEnd = textarea.selectionEnd + totalPrefixLength - totalPrefixLengthOpositeList;
            }
            else {
                selectionStart = textarea.selectionStart;
                selectionEnd = textarea.selectionEnd + totalPrefixLength;
            }
        }
        return { text, selectionStart, selectionEnd };
    }
    function getCurrentHeaderLevel(line) {
        const match = line.match(/^(#{1,6})\s+/);
        return match ? match[1].length : 0;
    }
    function cycleHeader(textarea) {
        const start = textarea.selectionStart;
        const lines = textarea.value.split('\n');
        let lineIndex = 0, charCount = 0;
        for (let i = 0; i < lines.length; i++) {
            if (charCount + lines[i].length >= start) {
                lineIndex = i;
                break;
            }
            charCount += lines[i].length + 1;
        }
        const currentLine = lines[lineIndex];
        const currentLevel = getCurrentHeaderLevel(currentLine);
        let newLevel = currentLevel + 1;
        if (newLevel > 6)
            newLevel = 0;
        let newLine;
        if (newLevel === 0)
            newLine = currentLine.replace(/^#{1,6}\s+/, '');
        else
            newLine = '#'.repeat(newLevel) + ' ' + currentLine.replace(/^#{1,6}\s+/, '');
        lines[lineIndex] = newLine;
        const newValue = lines.join('\n');
        const newCursorPos = charCount + newLine.length - (currentLine.length - (start - charCount));
        textarea.value = newValue;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.dispatchEvent(new CustomEvent('input', { bubbles: true }));
    }
    function cycleCodeBlock(textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        const selectedText = value.slice(start, end);
        if (start !== end) {
            const before = value.slice(0, start);
            const after = value.slice(end);
            const fullBefore = before.trimEnd();
            const fullAfter = after.trimStart();
            if (fullBefore.endsWith('```') && fullAfter.startsWith('```')) {
                const newBefore = fullBefore.slice(0, fullBefore.length - 3).replace(/\n$/, '');
                const newAfter = fullAfter.slice(3).replace(/^\n/, '');
                const newValue = newBefore + '\n' + selectedText + '\n' + newAfter;
                textarea.value = newValue;
                const newStart = newBefore.length + 1;
                textarea.setSelectionRange(newStart, newStart + selectedText.length);
            }
            else {
                const wrappedText = '```\n' + selectedText + '\n```';
                textarea.value = before + wrappedText + after;
                textarea.setSelectionRange(start + 4, start + 4 + selectedText.length);
            }
            textarea.dispatchEvent(new CustomEvent('input', { bubbles: true }));
            return;
        }
        const lines = value.split('\n');
        let lineIndex = 0, charCount = 0;
        for (let i = 0; i < lines.length; i++) {
            if (charCount + lines[i].length >= start) {
                lineIndex = i;
                break;
            }
            charCount += lines[i].length + 1;
        }
        const currentLine = lines[lineIndex].replace('\r', '');
        let newLine;
        if (currentLine.startsWith('```') && currentLine.endsWith('```')) {
            newLine = currentLine.substring(3, currentLine.length - 3);
        }
        else {
            newLine = '```' + currentLine + '```';
        }
        lines[lineIndex] = newLine;
        const newValue = lines.join('\n');
        const newCursorPos = charCount + (start - charCount) + (newLine.length - currentLine.length);
        textarea.value = newValue;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.dispatchEvent(new CustomEvent('input', { bubbles: true }));
    }
    function cycleQuote(textarea) {
        const start = textarea.selectionStart;
        const lines = textarea.value.split('\n');
        let lineIndex = 0, charCount = 0;
        for (let i = 0; i < lines.length; i++) {
            if (charCount + lines[i].length >= start) {
                lineIndex = i;
                break;
            }
            charCount += lines[i].length + 1;
        }
        const currentLine = lines[lineIndex].replace('\r', '');
        let newLine;
        if (currentLine.startsWith('> ')) {
            newLine = currentLine.substring(2);
        }
        else {
            newLine = '> ' + currentLine;
        }
        lines[lineIndex] = newLine;
        const newValue = lines.join('\n');
        const newCursorPos = charCount + (start - charCount) + (newLine.length - currentLine.length);
        textarea.value = newValue;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.dispatchEvent(new CustomEvent('input', { bubbles: true }));
    }
    function applyStyle(button, stylesToApply) {
        const toolbar = button.closest('markdown-toolbar');
        if (!toolbar)
            return;
        const field = toolbar._editor || toolbar.field;
        if (!field)
            return;
        field.focus();
        if (button.tagName.toLowerCase() === 'md-header') {
            cycleHeader(field);
            return;
        }
        if (button.tagName.toLowerCase() === 'md-code-block') {
            cycleCodeBlock(field);
            return;
        }
        if (button.tagName.toLowerCase() === 'md-quote') {
            cycleQuote(field);
            return;
        }
        const defaults = { prefix: '', suffix: '', blockPrefix: '', blockSuffix: '', multiline: false, replaceNext: '', prefixSpace: false, scanFor: '', surroundWithNewlines: false, orderedList: false, unorderedList: false, trimFirst: false };
        const style = { ...defaults, ...stylesToApply };
        styleSelectedText(field, style);
    }
})();

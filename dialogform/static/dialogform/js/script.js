"use strict";

class BaseDialog {
    
    constructor(a) {
        this.anchor = a;
        this.log = false;
        this.listeners = [];
    }

    hook_listener_fn() {}
    unhook_listener_fn() {}
    remove_listeners() {}
    
    // Utility function to fetch response header *and* body:
    async fetchall(url, options) {
        const response = await fetch(url, options);
        if (!response.ok || response.status != 200) {
            throw new Error(`fetch: ${options.method} ${url} failed with response.status ${response.status}`)
        }
        response.contentType = response.headers.get('Content-Type').split(';')[0];
        switch (response.contentType) {
        case 'application/json':
            response.data = await response.json();
            break;
        case 'text/html':
        case 'text/javascript':
        case 'application/javascript':
            /* case 'module':  how to handle? */
            response.data = await response.text();
            break;
        default:
            // response.ok = false;
            throw new Error(`Unhandled fetch response content type: ${response.contentType}`);
        }             
        return response;
    }

    console_log(s) {
        if (this.log) console.log(s);
    }
    
    get_container() {
        const dialog_container = document.createElement('div');
        document.body.insertAdjacentElement('beforeend', dialog_container);
        return dialog_container;
    }

    clear_container(container) {
        for (let child of container.querySelectorAll('*')) child.remove();
    }
    
    remove_container(container) {
        container.remove();
    }
    
    maxHeight = 0;
    maxWidth = 0;
    topElement = null;
    resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            let t = entry.target,
                h = (entry.borderBoxSize) ? entry.borderBoxSize[0].blockSize: 0,
                w = (entry.borderBoxSize) ? entry.borderBoxSize[0].inlineSize: 0;
            if (h > this.maxHeight) this.maxHeight = h;
            if (w > this.maxWidth)  this.maxWidth  = w;
            this.console_log(`resizeObserver entry.target:${t.tagName}.${t.classList} (${w} x ${h})`);
            if (t === this.topElement) {
                if (!h || !w) {
                    this.console_log(`resizeObserver at topElement, not visible, disconnecting.`);
                    this.resizeObserver.disconnect();
                    this.maxHeight = this.maxWidth = 0; // in case this gets reopened
                    this.topElement = null;
                } else {
                    var maxWidth =  Math.ceil(this.maxWidth),
                        maxHeight = Math.ceil(this.maxHeight);
                    this.console_log(`resizeobserver at topElement, ${maxWidth} x ${maxHeight}`);
                    if ('iframe' in this) {
                        this.iframe.style.height = `${maxHeight}px`; // inner doc no border/padding
                        this.iframe.style.width  = `${maxWidth}px`;
                    }
                    maxHeight += 8+2*16+1;
                    maxWidth +=  1+2*16+1;

                    const vp_rect = document.documentElement.getBoundingClientRect();
                    if (maxHeight > vp_rect.height) {
                        maxHeight = vp_rect.height;
                        this.console_log(`resizeObserver: reduce height to ${maxHeight} to fit visualViewPort`);
                    }
                    if (maxWidth > vp_rect.width) {
                        maxWidth = vp_rect.width;
                        this.console_log(`resizeObserver: reduce width to ${maxWidth} to fit visualViewPort`);
                    }
                    this.dialog.style.height = `${maxHeight}px`;
                    this.dialog.style.width =  `${maxWidth}px`;
                    this.console_log(`resize dialog: ${maxWidth} x ${maxHeight} including padding and borders.`);
                    this.place_dialog();
                }
            }
        }
    });

    okButtonSelector = '.dialogform-buttons button[value=confirm]';
    
    setup_resize_form() {
        let button = this.form.querySelector(this.okButtonSelector);
        for (let el = button; !(el === this.form); el = el.parentElement) {
            this.resizeObserver.observe(el);
        }
    }

    setup_resize_dialog() {
        this.setup_resize_form();
        for (let el = this.form; !(el === this.dialog); el = el.parentElement) {
            this.resizeObserver.observe(el);
            this.topElement = el;
        }
    }
    
    place_dialog() {
        const anchor_rect = this.anchor.getBoundingClientRect();
        var dialog_rect = this.dialog.getBoundingClientRect();
        const vp_rect = document.documentElement.getBoundingClientRect();
        // Center vertically relative to anchor
        let top =  Math.max(10, anchor_rect.top - dialog_rect.height / 2);
        // Leave anchor somewhat uncovered, 40px to the right if possible
        let left = Math.max(0, Math.min(anchor_rect.right + 40, vp_rect.right - dialog_rect.width));
        // Constrain...  "10" is the hardcoded 'padding' for placement inside the viewport rect
        top = Math.round(
            Math.max(0,top + Math.min(0, vp_rect.bottom - top - dialog_rect.height - 10)));
        left = Math.round(
            Math.max(0,left + Math.min(0, vp_rect.right - left - dialog_rect.width - 10)));
        this.console_log(`place_dialog: top: ${top}, left: ${left}, w x h: ${dialog_rect.width} x ${dialog_rect.height}`);
        this.dialog.style.top  = `${top}px`;
        this.dialog.style.left = `${left}px`;
    }
    
    setup_drag(dragged) {
        dragged.setAttribute("draggable","true");
        var startX = 0, startY = 0;
        dragged.addEventListener("dragstart", (event) => {
            event.stopPropagation();
            startX = event.screenX; startY = event.screenY;
        }, { 'capture': true });
        
        dragged.addEventListener("dragend", (event) => {
            event.stopPropagation();
            let deltaX = event.screenX - startX,
                deltaY = event.screenY - startY,
                drgd = event.target,
                rect = drgd.getBoundingClientRect();
            drgd.style.left = Math.round(rect.left + deltaX) + "px";
            drgd.style.top  = Math.round(rect.top + deltaY) + "px";
        }, { 'capture': true });
    }
    
    autofocus(form) {
        let el = form.querySelector('[autofocus]');
        if (!el) {
            // If no other, set OK/confirm button as default autofocus
            el = form.querySelector(this.okButtonSelector);
            if (!el) {
                throw new Error(`${form} does not contain ${this.okButtonSelector}`);
            }
            el.setAttribute("autofocus","");
        }
        return el;
    }

    async process() {
        const anchor = this.anchor;
        const url = anchor.dataset.url;
        const dialog_container = this.get_container();
        this.response = null;
        
        for (let done = false; !done ;) {

            this.clear_container(dialog_container);
            this.hook_listener_fn();
            await this.create_dialog(dialog_container);
            this.setup_resize_dialog();
            let el = this.autofocus(this.form);
            await new Promise((focused) => {
                el.addEventListener('focus', () => focused(true),{ once: true });
                this.dialog.show();
                el.focus();         // in case it's alredy presented
            });
            this.form_method = this.form.getAttribute("method");
            this.form.setAttribute("method","dialog");
            let formClose = await new Promise((finished) => {
                const buttons = this.form.querySelectorAll(".dialogform-buttons button");
                for (const button of buttons) {
                    button.addEventListener('click', event => {
                        event.preventDefault();
                        finished({ value: event.target['value'],
                                   target: event.target })
                    },{ once: true });
                }
                // Clicking any links must open in a new context, leave this one alone
                const anchor_container = (typeof this.iframe == "undefined") ?
                       dialog_container : this.iframe.contentDocument;
                const anchors = anchor_container.querySelectorAll('a');
                for (const anchor of anchors) {
                    anchor.target = '_blank';
                }
                // This works for dialog.show() (non-modal)
                this.form.addEventListener('keydown', (event) => {
                    if (event.code == "Escape")
                        finished({ value: 'cancel', target: event.target });
                }, { 'capture': true });
                // Any submit confirms
                this.form.addEventListener('submit', event => {
                    finished({ value: 'confirm', target: event.target});
                });
            });
            this.dialog.close();
            this.unhook_listener_fn();
            this.remove_listeners();
            
            // Restore form method
            this.form.setAttribute("method", this.form_method);
            
            done = true;        // most likely
            if (formClose.value == 'confirm') {
                const form_data = new FormData(this.form);
                if (this.form_method.toUpperCase() != "GET") {
                    const response = await this.fetchall(url, { method: 'POST', body: form_data }); // presume POST.
                    if (response.ok) {
                        if (response.data.status == 302) {
                            window.location.assign(response.data.url); // json response.data
                        } else {
                            // Form submission returned as text/html with new form
                            done = false; // fumbled, redo...
                            this.response = response; // to create_dialog with returned form + errors
                        }
                    } else {
                        console.error(`Dialogform POST failed with status ${response.status}\n`);
                    }
                } else {
                    // form method GET: request form action path with form_data query
                    let formAction = new URL(this.form.action);
                    let search = new URLSearchParams(form_data);
                    window.location.assign(formAction.pathname + '?' + search.toString());
                }
            }
        }
        this.clear_container(dialog_container);
        this.remove_container(dialog_container);
        // if provided invoke dialog cleanup function
        if ('cleanup' in anchor.dataset && anchor.dataset.cleanup in globalThis) {
            globalThis[anchor.dataset.cleanup]();
        }
    }
}

class IFrameDialog extends BaseDialog {

    setup_resize_dialog() {
        this.setup_resize_form();
        for (let el = this.form; el; el = el.parentElement) {
            this.resizeObserver.observe(el);
            this.topElement = el;
        }
    }
    
    async create_dialog(dialog_container) {
        const dialog = document.createElement('dialog');
        this.dialog = dialog;
        dialog.classList = 'dialogform-iframe';
        const iframe = document.createElement('iframe');
        this.iframe = iframe;   // save (e.g for drag ops)
        dialog.appendChild(iframe);
        dialog_container.appendChild(dialog);
        dialog.style.top =  "0px";
        dialog.style.left = "0px";
        // Load...
        var result = await new Promise((loaded) => {
            // Chrome (as of20230208) does not produce load events on iframe.contentWindow
            iframe.addEventListener('load', (event) => {loaded(true);});
            if (this.response) {
                // we have a previous response (e.g. a rejected form)
                iframe.srcdoc = this.response.data;
            } else {
                iframe.src = this.anchor.dataset.url; 	// get a new dialogform
            }
        });
        // Basic integrity checks
        const div = iframe.contentDocument.querySelector('.dialogform-dialog');
        const dialogButton = iframe.contentDocument.querySelector(this.okButtonSelector);
        this.form = dialogButton.form;
        if (!div || typeof this.form == "undefined") {
            dialog_container.remove(); // clean up and complain
            throw new Error('django dialogform not extended from dialogform template(s)?');
        }
        // this.setup_drag(dialog);
        return dialog;
    }
}

class LocalDialog extends BaseDialog {

    clear_container(container) {
        // do nothing here
    }
    remove_container(container) {
        // do nothing here
    }
    
    get_container() {
        const dialog = document.querySelector(this.anchor.dataset.url);
        if (dialog) 
            return dialog.parentElement;
        throw new Error(`django dialogform - could not locate LocalDialog in document at ${this.anchor.dataset.url}`);
    }
    
    async create_dialog(dialog_container) {
        const dialog = document.querySelector(this.anchor.dataset.url);
        let button;
        // Basic checks
        if (dialog) {
            this.dialog = dialog;
            this.form = dialog.querySelector('form.dialogform');
        }
        if (!dialog || !this.form ||
            !(button = dialog.querySelector(this.okButtonSelector))) {
            throw new Error(`django dialogform LocalDialog malformed: dialog:${dialog},` +
                            `form:${this.form} button: ${button}`);
        }
        if (this.form.method.toLowerCase() != "get") {
            throw new Error(`django dialogform LocalDialog method must be "get", others not supported`);
        }
        // this.setup_drag(dialog);
        return dialog;
    }
}

class DialogDialog extends BaseDialog {

    constructor(a) {
        super(a);
    }
    
    static urlpathname(src) {
        return (src.indexOf(':') < 0) ? src : new URL(src).pathname;
    }
    
    hook_listener_fn() {
        const listeners = this.listeners;
        EventTarget.prototype.originalAddEventListener = EventTarget.prototype.addEventListener;
        
        const newAddEventListener = function (event, fn, ...args) {
            this.originalAddEventListener(event, fn, ...args);
            listeners.push({obj: this, event: event, fn: fn, args: args});
        };
        EventTarget.prototype.addEventListener = newAddEventListener;
    }

    unhook_listener_fn() {
        EventTarget.prototype.addEventListener = EventTarget.prototype.originalAddEventListener;
    }
    
    remove_listeners() {
        if (this.listeners.length > 0) {
            for (const l of this.listeners) {
                l.obj.removeEventListener(l.event, l.fn, ...l.args);
            }
        }
        delete this.listeners;
        this.listeners = [];
    }
    
    async create_dialog(dialog_container) {
        const error = (message) => {
            dialog_container.remove();
            throw new Error(message);
        }
        // If there's no previous response (rejected form), get it at the
        // dialogform url
        const response = this.response ? this.response :
              await this.fetchall(this.anchor.dataset.url, { method: 'GET' });

        // Create DOM dialog
        dialog_container.insertAdjacentHTML('afterbegin', response.data);

        //  Basic dialogform verification
        const dialog = dialog_container.children[0];
        if (dialog.tagName !== "DIALOG") {
            error(`django template not extended from dialogform/dialog.html?`);
        }
        if (!(this.form = dialog.querySelector('.dialogform'))) {
            error(`django dialogform not extended from dialogform/include/form.html?`);
        }
        this.dialog = dialog;
        
        // load media scripts needed by this form
        const media_container = dialog.querySelector('.dialogform-media');
        const documentScripts = Array.from(document.head.querySelectorAll("script"));
        const media = Array.from(media_container.children).filter(m => m.tagName === "SCRIPT");

        for (const medium of media) {
            let m = documentScripts.find(s => s.src === medium.src);
            if (m) m.remove();
        }
        
        // Load media in a synchronous sequence preserving list order
        for (const medium of media) {
            await new Promise((loaded) => {
                const newscript = document.createElement("script");
                let type = medium.getAttribute("type");
                if (type) newscript.type = type;
                newscript.addEventListener('error', (e) => {
                    console.log(`${newscript.src} load failed!\n`);
                    loaded(true);});
                newscript.addEventListener('load',  (e) => {
                    console.log(`${newscript.src} loaded.\n`);
                    loaded(true);});
                document.head.appendChild(newscript);
                newscript.src = DialogDialog.urlpathname(medium.src);
            });
        }
        window.document.dispatchEvent(new Event('DOMContentLoaded'));
        window.dispatchEvent(new Event('load'));
        // this.setup_drag(dialog);
        return dialog;
    }
}

class DialogFactory {
    static create(event) {
        let a = event.target;   // Find anchor
        while (a && !a.classList.contains('dialog-anchor')) a = a.parentElement;
        if (!a) {
            throw new Error(`Something's terribly wrong: no .dialog-anchor for ${event} on ${event.target}`);
        }
        if (typeof jQuery === "undefined" && 'django' in globalThis) {
            $ = jQuery = django.jQuery;
        }
        const type = ('type' in a.dataset) ? a.dataset.type : 'dialog';
        if (type == 'dialog') {
            return a.dataset.url.startsWith("#") ? new LocalDialog(a) : new DialogDialog(a);
        } else if (type == 'iframe') {
            return new IFrameDialog(a);
        } else {
            throw new Error(`Invalid data-type: ${type} on dialog_anchor (url:${a.dataset.url})`);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const anchors = document.getElementsByClassName('dialog-anchor');
    for (let anchor of anchors) {
        anchor.addEventListener("click", async (event) => {
            event.stopImmediatePropagation();
            event.preventDefault();
            await DialogFactory.create(event).process();
        });
    }
});

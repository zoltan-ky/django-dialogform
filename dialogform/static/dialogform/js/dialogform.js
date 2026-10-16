/*
  This file is part of a program "django-dialogform", a django app to load and open form views
  within <dialog> html element popups.

  Copyright (C) 2023, Zoltan Kemenczy

  This program comes with ABSOLUTELY NO WARRANTY; This is free software, and you are welcome
  to redistribute it under conditions of the GPLv3 LICENSE included in this package
  To use it, refer to the included README.rst
*/

"use strict";

/*
  Records event listeners added while dialogs are open, so that those added by
  the dialog and its media scripts can be removed when it closes.
  addEventListener is wrapped only while at least one dialog is open; listeners
  are recorded for the most recently opened one.
*/
const listenerRecorder = {
    dialogs: [],
    original: null,

    start(dlg) {
        if (this.dialogs.length === 0) {
            const original = this.original = EventTarget.prototype.addEventListener;
            const dialogs = this.dialogs;
            EventTarget.prototype.addEventListener = function (event, fn, ...args) {
                original.call(this, event, fn, ...args);
                dialogs[dialogs.length - 1].listeners.push(
                    {obj: this, event: event, fn: fn, args: args});
            };
            dlg.console_log('addEventListener hooked');
        }
        this.dialogs.push(dlg);
    },

    stop(dlg) {
        const i = this.dialogs.lastIndexOf(dlg);
        if (i < 0) return;
        this.dialogs.splice(i, 1);
        if (this.dialogs.length === 0) {
            EventTarget.prototype.addEventListener = this.original;
            this.original = null;
            dlg.console_log('addEventListener: original restored');
        }
    }
};

class BaseDialog {
    
    constructor(a) {
        this.anchor = a;
        this.log = false;
        this.listeners = [];
    }

    dialogTagName = "DIALOG";
    dialogButtonsSelector = '.dialogform-buttons button';
    okButtonSelector = this.dialogButtonsSelector + '[value=confirm]';

    error(message, dialog = null) {
        alert(message);
        if (dialog) {
            this.destroy_dialog(dialog);
        }
        if ('anchor' in this &&
            'cleanup' in this.anchor.dataset &&
            this.anchor.dataset.cleanup in globalThis) {
            globalThis[this.anchor.dataset.cleanup]();
        }
        throw new Error(message);
    }
    
    // Utility function to fetch response header *and* body.
    // Returns {ok, status, contentType, data, message}; ok only for a 200
    // response of a handled content type.
    async fetchall(url, options) {
        const result = {ok: false, status: 0, contentType: null, data: null, message: ''};
        let response;
        try {
            response = await fetch(url, options);
        } catch (e) {
            result.message = `${e.message}`;
            return result;
        }
        result.status = response.status;
        result.message = `status: ${response.status} ${response.statusText}`;
        if (response.status != 200) return result;
        result.contentType = (response.headers.get('Content-Type') || '').split(';')[0].trim();
        switch (result.contentType) {
        case 'application/json':
            result.data = await response.json();
            result.ok = true;
            break;
        case 'text/html':
        case 'text/javascript':
        case 'application/javascript':
            /* case 'module':  how to handle? */
            result.data = await response.text();
            result.ok = true;
            break;
        default:
            result.message = `Unhandled fetch response content type: ${result.contentType || 'none'}`;
        }
        return result;
    }

    console_log(s) {
        if (this.log) console.log(s);
    }

    get_container() {
        const container = document.createElement('div');
        document.body.insertAdjacentElement('beforeend', container);
        return container;
    }
    
    destroy_dialog(dialog) {
        const container = dialog.parentElement;
        for (let child of container.querySelectorAll('*')) child.remove();
        container.remove();
    }
    
    check_dialog(dialog) {
        //  Basic dialogform verification. Sets this.form if successful
        if (dialog.tagName !== this.dialogTagName) {
            
            this.error(`django template not extended from dialogform/dialog.html?`, dialog);
        }
        if (!(this.form = dialog.querySelector('form')) ||
            !(dialog.querySelector(this.okButtonSelector))) {
            this.error(`django dialogform not extended from dialogform/include/form.html; missing required button(s)?`, dialog);
        }
    }

    async load_form_media(dialog) {}

    remove_listeners() {
        if (this.listeners.length > 0) {
            for (const l of this.listeners) {
                l.obj.removeEventListener(l.event, l.fn, ...l.args);
            }
        }
        this.console_log(`${this.listeners.length} listeners removed.`);
        delete this.listeners;
        this.listeners = [];
    }

    resizeObserver = new ResizeObserver((entries) => {
        let topElement = null;
        for (const entry of entries) {
            topElement = entry.target;
        }
        if (topElement.parentElement) {
            this.place_dialog(topElement.parentElement); // dialog
        } else {
            this.resizeObserver.disconnect(); // dialog done
        }
    });

    setup_resize_dialog(dialog) {
        let topElement = dialog.querySelector('div.dialogform-content');
        this.resizeObserver.observe(topElement);
    }
    
    place_dialog(dialog) {
        const anchor_rect = this.anchor.getBoundingClientRect();
        var dialog_rect = dialog.getBoundingClientRect();
        // The viewport (not the document, which may be larger or scrolled)
        const vp_right  = document.documentElement.clientWidth;
        const vp_bottom = document.documentElement.clientHeight;
        // Center vertically relative to anchor
        let top =  Math.max(10, anchor_rect.top - dialog_rect.height / 2);
        // Leave anchor somewhat uncovered, 40px to the right if possible
        let left = Math.max(0, Math.min(anchor_rect.right + 40, vp_right - dialog_rect.width));
        // Constrain...  "10" is the hardcoded 'padding' for placement inside the viewport rect
        top = Math.round(
            Math.max(0,top + Math.min(0, vp_bottom - top - dialog_rect.height - 10)));
        left = Math.round(
            Math.max(0,left + Math.min(0, vp_right - left - dialog_rect.width - 10)));
        this.console_log(`place_dialog: top: ${top}, left: ${left}, w x h: ${dialog_rect.width} x ${dialog_rect.height}`);
        dialog.style.top  = `${top}px`;
        dialog.style.left = `${left}px`;
        dialog.style.opacity = 1;
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
            el.setAttribute("autofocus","");
        }
        return el;
    }

    async process() {
        const anchor = this.anchor;
        const url = anchor.dataset.url;
        this.response = null;

        try {
            for (let done = false; !done ;) {
                listenerRecorder.start(this);
                done = await this.open_and_submit(url);
                listenerRecorder.stop(this);
                this.remove_listeners();
            }
        } finally {
            // Also after errors: never leave addEventListener wrapped
            listenerRecorder.stop(this);
            this.remove_listeners();
        }
        if ('cleanup' in anchor.dataset && anchor.dataset.cleanup in globalThis) {
            globalThis[anchor.dataset.cleanup]();
        }
    }

    // Open the dialog, wait for it to be closed and submit its form if
    // confirmed. Returns false if the dialog needs to be reopened with the
    // returned (invalid) form.
    async open_and_submit(url) {
        const dialog = await this.create_dialog();
        this.check_dialog(dialog);
        await this.load_form_media(dialog);
        this.setup_resize_dialog(dialog);
        // Not waiting for a focus event: none fires if el is already focused
        // (e.g. by autofocus within an iframe)
        let el = this.autofocus(this.form);
        dialog.show();
        this.place_dialog(dialog);  // now, not only once the resizeObserver runs
        el.focus();
        this.form_method = this.form.getAttribute("method");
        this.form.setAttribute("method","dialog");

        let formClose = await new Promise((finished) => {
            const buttons = this.form.querySelectorAll(this.dialogButtonsSelector);
            for (const button of buttons) {
                button.addEventListener('click', event => {
                    finished({ value: event.target['value'],
                               target: event.target })
                },{ once: true });
            }
            // Clicking any links must open in a new context, leave this one alone
            const anchor_container = (typeof this.iframe == "undefined") ?
                   dialog : this.iframe.contentDocument;
            const anchors = anchor_container.querySelectorAll('a');
            for (const anchor of anchors) {
                anchor.target = '_blank';
            }
            // This works for dialog.show() (non-modal)
            this.form.addEventListener('keydown', (event) => {
                if (event.code == "Escape") {
                    event.preventDefault();
                    finished({ value: 'cancel', target: event.target });
                }
            }, { 'capture': true });
            // Any submit confirms
            this.form.addEventListener('submit', event => {
                event.preventDefault();
                finished({ value: 'confirm', target: event.target});
            });
        });
        dialog.close();

        let done = true;        // most likely
        if (formClose.value == 'confirm') {
            const form_data = new FormData(this.form);
            if (this.form_method.toUpperCase() != "GET") {
                const response = await this.fetchall(url, { method: 'POST', body: form_data });
                if (!response.ok) {
                    this.error(`Dialogform POST to url:${url} failed: ${response.message}`, dialog);
                }
                if (response.contentType == 'application/json') {
                    // Valid form: {url, status} of the redirect returned by the view
                    if (!response.data.url) {
                        this.error(`Dialogform POST to url:${url} returned no redirect url`, dialog);
                    }
                    window.location.assign(response.data.url);
                } else {
                    // Invalid form submission returned as text/html
                    this.response = response; // create_dialog with returned form + errors
                    done = false; // fumbled, redo...
                }
            } else {
                // form method GET: request form action path with form_data query,
                // replacing any of the form's fields already in the query
                let formAction = new URL(this.form.action);
                for (const key of new Set(form_data.keys())) {
                    formAction.searchParams.delete(key);
                }
                for (const [key, value] of form_data) {
                    formAction.searchParams.append(key, value);
                }
                this.console_log(`Location assigned: ${formAction}`);
                window.location.assign(formAction);
            }
        }
        this.destroy_dialog(dialog);
        return done;
    }
}


class IFrameDialog extends BaseDialog {

    dialogTagName = "DIV";
    maxHeight = 0;
    maxWidth = 0;
    topElement = null;
    resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            let h = (entry.borderBoxSize) ? entry.borderBoxSize[0].blockSize: 0,
                w = (entry.borderBoxSize) ? entry.borderBoxSize[0].inlineSize: 0;
            if (h > this.maxHeight) this.maxHeight = h;
            if (w > this.maxWidth)  this.maxWidth  = w;
            this.console_log(`resizeObserver entry.target:${entry.target.tagName}.${entry.target.classList} (${w} x ${h})`);
            if (entry.target === this.topElement) {
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
                        this.iframe.style.minHeight = `${maxHeight}px`; // inner doc no border/padding
                        this.iframe.style.minWidth  = `${maxWidth}px`;
                    }
                    this.place_dialog(this.topElement.parentElement); // dialog
                }
            }
        }
    });

    check_dialog(dialog) {
        const div = this.iframe.contentDocument.querySelector('div.dialogform-dialog'); // dialogform/page.html
        super.check_dialog(div);
    }

    destroy_dialog(dialog) {
        let iframe = dialog.querySelector('iframe');
        if (iframe) iframe.remove();
        super.destroy_dialog(dialog);
    }
    
    setup_resize_form() {
        this.resizeObserver.observe(this.form);
    }

    setup_resize_dialog(dialog) {
        this.setup_resize_form();
        for (let el = this.form; el; el = el.parentElement) {
            this.resizeObserver.observe(el);
        }
        let iframe = dialog.querySelector('iframe');
        this.resizeObserver.observe(iframe);
        this.topElement = iframe;
    }
    
    async create_dialog() {
        const dialog = document.createElement('dialog');
        dialog.classList = 'dialogform-iframe';
        const iframe = document.createElement('iframe');
        this.iframe = iframe;   // save (e.g for drag ops)
        dialog.appendChild(iframe);
        let container = this.get_container();
        dialog.style.opacity = 0;
        container.appendChild(dialog);

        // Load...
        var result = await new Promise((loaded) => {
            // Chrome (as of20230208) does not produce load events on iframe.contentWindow/Document
            iframe.addEventListener('load', event => loaded(true));
            if (this.response) {
                // we have a previous response (e.g. a rejected form)
                iframe.srcdoc = this.response.data;
            } else {
                iframe.src = this.anchor.dataset.url; 	// get a new dialogform
            }
        });
        this.console_log(`iframe.contentDocument.readyState: ${iframe.contentDocument.readyState}`);
        // One second delay - to avoid selenium tests race condition - seems to work
        // result = await new Promise((done) => setTimeout(() => done(true), 1000));
        return dialog;
    }
}

class LocalDialog extends BaseDialog {

    destroy_dialog(dialog) {
        if (this.form_method) {
            this.form.setAttribute("method", this.form_method); // Restore form method
        }
        let container = dialog.parentElement;
        this.originalParent.appendChild(dialog);
        container.remove();
        delete this.originalParent;
    }
    
    check_dialog(dialog) {
        super.check_dialog(dialog);
        if (this.form.method.toLowerCase() != "get") {
            this.error('django-dialogform LocalDialog method must be "get",' +
                       'others not supported', dialog);
        }
        // Save original method so it could be restored by destroy_dialog
    }
    
    async create_dialog() {
        let dialog = document.querySelector(this.anchor.dataset.url);
        if (!dialog) {
            this.error(`django dialogform LocalDialog can't find url: ${this.anchor.dataset.url}`);
        }
        this.originalParent = dialog.parentElement;
        let container = this.get_container();
        dialog.style.opacity = 0;
        container.appendChild(dialog);
        return dialog;
    }
}

class DialogDialog extends BaseDialog {

    constructor(a) {
        super(a);
    }
    
    async create_dialog() {
        // If there's no previous response (rejected form), get it at the
        // dialogform url
        let response = this.response ? this.response :
            await this.fetchall(this.anchor.dataset.url, { method: 'GET' });
        if (!response.ok) {
            this.error(`django-dialogform Dialog could not fetch anchor ` +
                       `url: ${this.anchor.dataset.url}: ${response.message}`);
        }
        // Create DOM dialog
        let container = this.get_container();
        container.insertAdjacentHTML('afterbegin', response.data);
        let dialog = container.children[0];
        dialog.style.opacity = 0;
        return dialog;
    }

    check_dialog(dialog) {
        super.check_dialog(dialog);
        let media_container = dialog.querySelector('.dialogform-media');
        if (!media_container) {
            this.error('django dialogform missing div.dialogform-media - ' +
                       'template not extended from dialogform/dialog.html?',
                      dialog);
        }
    }
    
    async load_form_media(dialog) {
        // load media scripts needed by this form
        const media_container = dialog.querySelector('.dialogform-media');
        const documentScripts = Array.from(document.head.querySelectorAll("script"));
        const media = Array.from(media_container.children).filter(m => m.tagName === "SCRIPT");

        for (const medium of media) {
            if (!medium.src) continue;
            let m = documentScripts.find(s => s.src === medium.src);
            if (m) m.remove();
        }
        // Scripts inserted with the dialog html don't run: (re)load media in a
        // synchronous sequence preserving list order. Scripts are rerun even if
        // the document already has them, so they initialize the dialog's widgets.
        for (const medium of media) {
            const newscript = document.createElement("script");
            let type = medium.getAttribute("type");
            if (type) newscript.type = type;
            if (!medium.src) {
                newscript.textContent = medium.textContent; // runs when appended
                document.head.appendChild(newscript);
                continue;
            }
            await new Promise((loaded) => {
                newscript.addEventListener('error', (e) => {
                    this.console_log(`${newscript.src} load failed!\n`);
                    loaded(true);});
                newscript.addEventListener('load',  (e) => {
                    this.console_log(`${newscript.src} loaded.\n`);
                    loaded(true);});
                newscript.src = medium.src;     // full url, incl. host and query
                document.head.appendChild(newscript);
            });
        }
        // The document has loaded already, so DOMContentLoaded and load
        // handlers added by the media scripts would never run: run just those.
        for (const l of this.listeners) {
            if (!((l.obj === document || l.obj === window) && l.event === 'DOMContentLoaded') &&
                !(l.obj === window && l.event === 'load')) continue;
            try {
                const event = new Event(l.event);
                if (typeof l.fn === 'function') {
                    l.fn.call(l.obj, event);
                } else if (l.fn && typeof l.fn.handleEvent === 'function') {
                    l.fn.handleEvent(event);
                }
            } catch (e) {
                console.error(e);   // as for a dispatched event: report and go on
            }
        }
    }
}

class DialogFactory {
    static create(a) {
        if (typeof jQuery === "undefined" && 'django' in globalThis) {
            $ = jQuery = django.jQuery;
        }
        const type = ('type' in a.dataset) ? a.dataset.type : 'dialog';
        if (type == 'dialog') {
            return a.dataset.url.startsWith("#") ? new LocalDialog(a) : new DialogDialog(a);
        } else if (type == 'iframe') {
            return new IFrameDialog(a);
        } else {
            BaseDialog.prototype.error(`Invalid data-type: ${type} on dialog_anchor (url:${a.dataset.url})`);
        }
    }
}

// One listener for all anchors, including those added later, e.g. within dialogs
document.addEventListener("click", async (event) => {
    const anchor = (event.target instanceof Element) ?
          event.target.closest('.dialog-anchor') : null;
    if (!anchor) return;
    event.stopPropagation();
    event.preventDefault();
    await DialogFactory.create(anchor).process();
}, { capture: true });

/*
  This file is part of a program "django-dialogform", a django app to load and open form views
  within <dialog> html element popups.

  Copyright (C) 2023, Zoltan Kemenczy

  This program comes with ABSOLUTELY NO WARRANTY; This is free software, and you are welcome
  to redistribute it under conditions of the GPLv3 LICENSE included in this package
  To use it, refer to the included README.rst
*/

"use strict";

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
    
    // Utility function to fetch response header *and* body:
    async fetchall(url, options) {
        const response = await fetch(url, options);
        if (response.ok && response.status == 200) {
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
                response.ok = false;
                response.message = `Unhandled fetch response content type: ${response.contentType}`;
            }
        }
        return response;
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

    load_form_media(dialog) {}
    
    hook_add_listener_fn() {
        const listeners = this.listeners;
        const newAddEventListener = function (event, fn, ...args) {
            this.originalAddEventListener(event, fn, ...args);
            listeners.push({obj: this, event: event, fn: fn, args: args});
        };
        if (!('originalAddEventListener' in EventTarget.prototype)) {
            EventTarget.prototype.originalAddEventListener = EventTarget.prototype.addEventListener;
            EventTarget.prototype.addEventListener = newAddEventListener;
            this.console_log('newAddEventListener hooked');
        }
    }

    unhook_add_listener_fn() {
        if ('originalAddEventListener' in EventTarget.prototype &&
            EventTarget.prototype.addEventListener !== EventTarget.prototype.originalAddEventListener) {
            EventTarget.prototype.addEventListener = EventTarget.prototype.originalAddEventListener;
            delete EventTarget.prototype.originalAddEventListener;
            this.console_log('newAddEventListener: original restored');
        }
    }
    
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
        var dialog = null;
        this.response = null;
        
        for (let done = false; !done ;) {

            this.hook_add_listener_fn();
            dialog = await this.create_dialog();
            this.check_dialog(dialog);
            this.load_form_media(dialog);
            this.setup_resize_dialog(dialog);
            let el = this.autofocus(this.form);
            await new Promise((focused) => {
                el.addEventListener('focus', () => focused(true),{ once: true });
                dialog.show();
                el.focus();         // in case it's alredy presented
            });
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
                }, { 'capture': true }, true);
                // Any submit confirms
                this.form.addEventListener('submit', event => {
                    event.preventDefault();
                    finished({ value: 'confirm', target: event.target});
                });
            });
            dialog.close();
            this.unhook_add_listener_fn();
            this.remove_listeners();
            
            done = true;        // most likely
            if (formClose.value == 'confirm') {
                const form_data = new FormData(this.form);
                if (this.form_method.toUpperCase() != "GET") {
                    const response = await this.fetchall(url, { method: 'POST', body: form_data });
                    if (response.ok) {
                        if (response.data.status == 302) {
                            window.location.assign(response.data.url); // json response.data
                        } else {
                            // Invalid form submission returned as text/html
                            this.response = response; // create_dialog with returned form + errors
                            done = false; // fumbled, redo...
                        }
                    } else {
                        this.error(`Dialogform POST to url:${url} failed with ` +
                                   `status: ${response.status}`, dialog);
                    }
                } else {
                    // form method GET: request form action path with form_data query
                    let formAction = new URL(this.form.action);
                    new URLSearchParams(form_data).forEach((value,key) => {
                        formAction.searchParams.set(key, value)
                    });
                    console.log(`Location assigned: ${formAction}`);
                    window.location.assign(formAction);
                }
            }
            this.destroy_dialog(dialog);
        }
        if ('cleanup' in anchor.dataset && anchor.dataset.cleanup in globalThis) {
            globalThis[anchor.dataset.cleanup]();
        }
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
        console.log(`iframe.contentDocument.readyState: ${iframe.contentDocument.readyState}`);
        // One second delay - to avoid selenium tests race condition - seems to work
        // result = await new Promise((done) => setTimeout(() => done(true), 1000));
        return dialog;
    }
}

class LocalDialog extends BaseDialog {

    destroy_dialog(dialog) {
        this.form.setAttribute("method", this.form_method); // Restore form method
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
    
    static urlpathname(src) {
        return (src.indexOf(':') < 0) ? src : new URL(src).pathname;
    }
    
    async create_dialog() {
        // If there's no previous response (rejected form), get it at the
        // dialogform url
        let response = this.response ? this.response :
            await this.fetchall(this.anchor.dataset.url, { method: 'GET' });
        if (!response.ok) {
            this.error(`django-dialogform Dialog could not fetch anchor ` +
                       `url: ${this.anchor.dataset.url}`);
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
                    this.console_log(`${newscript.src} load failed!\n`);
                    loaded(true);});
                newscript.addEventListener('load',  (e) => {
                    this.console_log(`${newscript.src} loaded.\n`);
                    loaded(true);});
                document.head.appendChild(newscript);
                newscript.src = DialogDialog.urlpathname(medium.src);
            });
        }
        window.document.dispatchEvent(new Event('DOMContentLoaded', {bubbles: true}));
        window.dispatchEvent(new Event('load'));
    }
}

class DialogFactory {
    static create(event) {
        let a = event.target;   // Find anchor
        while (a && !a.classList.contains('dialog-anchor')) a = a.parentElement;
        if (!a) {
            BaseDialog.prototype.error(`Something's terribly wrong: no .dialog-anchor for ${event} on ${event.target}`);
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
            BaseDialog.prototype.error(`Invalid data-type: ${type} on dialog_anchor (url:${a.dataset.url})`);
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

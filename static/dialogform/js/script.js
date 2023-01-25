

class IFrameDDialog {

    constructor(a) {
        this.anchor = a;
    }

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

    clear_container(container) {
        for (let child of container.children) {
            child.removeNode(); // Clear any previous c
        }
    }
    
    async create_dialog(htmlText, dialog_container) {
        const dialog = document.createElement('dialog');
        dialog.classList = 'dialogform-iframe';
        this.iframe = document.createElement('iframe');
        this.iframe.srcdoc = htmlText;
        dialog.appendChild(this.iframe);
        dialog_container.appendChild(dialog);
        return dialog;
    }
    
    async show(dialog) {
        const iframe = this.iframe;
        var result = await new Promise((laid_out) => {
            iframe.addEventListener(
                'load', event => laid_out(true),{ once: true });
            dialog.show();
        });
        const div = iframe.contentDocument.querySelector('.dialogform-dialog');
        if (div) {
            iframe.style.height = div.scrollHeight + 'px';        
            iframe.style.width =  div.scrollWidth + 'px';
        }
        // Safari seems to sometimes change the widgets layout even after this point, so:
        iframe.contentWindow.visualViewport.addEventListener(
            'resize', (event) => {
                iframe.style.height = div.scrollHeight + 'px';        
                iframe.style.width =  div.scrollWidth + 'px';
            });
        if (!(this.form = iframe.contentDocument.querySelector('.dialogform'))) {
            throw new Error(`django dialogform not extended from dialogform/include/form.html?`);
        }
        IFrameDDialog.autofocus(this.form);
    }

    async process() {
        const anchor = this.anchor;
        const url = anchor.dataset.url;
        const dialog_container = document.createElement('div');
        document.body.insertAdjacentElement('beforeend', dialog_container);

        var response = await this.fetchall(url, { method: 'GET' });
        for (let done = false; !done ;) {

            this.clear_container(dialog_container);
            const dialog = await this.create_dialog(response.data, dialog_container);
            await this.show(dialog);

            // Now calculate where to place it...
            const anchor_rect = anchor.getBoundingClientRect();
            const dialog_rect = dialog.getBoundingClientRect();
            const vpRect = document.documentElement.getBoundingClientRect();
            let top =  Math.max(10, anchor_rect.top - dialog_rect.height / 2); // Center vertically with anchor
            // leave anchor somewhat uncovered, 40px to the right if possible
            let left = Math.max(0, Math.min(anchor_rect.right + 40, vpRect.right - dialog_rect.width));
            // Constrain...  "10" is the hardcoded 'padding' for placement inside the dialog rect
            dialog.style.top =  Math.round(
                top + Math.max(0,Math.min(0, vpRect.bottom - top - dialog_rect.height - 10))) + "px";
            dialog.style.left = Math.round(
                left + Math.max(0,Math.min(0, vpRect.right - left - dialog_rect.width - 10))) + "px";
            
            let formAction = await new Promise((buttonClick) => {
                const buttons = this.form.querySelectorAll(".dialogform-buttons button");
                for (const button of buttons) {
                    button.addEventListener(
                        'click',
                        event => buttonClick(event.target['value']),
                        { once: true });
                }
                this.form.addEventListener(
                    'keydown', (event) => {
                        if (event.code == "Escape") buttonClick('cancel');
                    });
            });
            dialog.close();
            done = true;        // most likely
            if (formAction == 'confirm') {
                const form_data = new FormData(this.form);
                response = await this.fetchall( url, { method: 'POST', body: form_data });
                if (response.ok && response.contentType == 'application/json') {
                    if (response.data.status == 302) {
                        window.location.assign(response.data.url);
                    } else {
                        window.location.reload();
                    }
                } else if (response.ok && response.contentType == 'text/html') {
                    // Form submission returned with new form/errors
                    done = false; // fumbled, redo...
                } else {
                    console.error(`Dialogform POST failed with status ${response.status}\n`);
                }
            }
            dialog.remove();
        }
        dialog_container.remove();
    }

    static create(event) {
        let a = event.target;   // Find anchor
        while (a && (a.tagName != "DIV" || !a.classList.contains('dialog-anchor'))) a = a.parentElement;
        if (!a) {
            throw new Error(`Something's terribly wrong: no div.dialog-anchor for ${event} on ${event.target}`);
        }
        const type = ('type' in a.dataset) ? a.dataset.type : 'dialog';
        if (type == 'dialog') {
            return new DDialog(a);
        } else if (type == 'iframe') {
            return new IFrameDDialog(a);
        } else {
            throw new Error(`Invalid data-type: ${type} on dialog_anchor (url:${a.dataset.url})`);
        }
    }

    static autofocus(form) {
        let el = form.querySelector('[autofocus]');
        if (!el) {
            el = form.querySelector('.dialogform-buttons button');
            if (!el) {
                throw new Error(`${form} does not contain .dialogform-buttons!`);
            }
            el.autofocus = true;
        }
        el.focus();         // in case it's alredy presented
        return el;
    }
}


class DDialog extends IFrameDDialog {

    static LoadedScripts =
        new Set(Array.from(document.scripts).map((x) => x.getAttribute("src")));

    static urlpathname(src) {
        return (src.indexOf(':') < 0) ? src : new URL(src).pathname;
    }
    
    constructor(a) {
        super(a);
        // Update array of already loaded scripts
        if (document.scripts.length > DDialog.LoadedScripts.size) {
            for (let script of document.scripts) {
                DDialog.LoadedScripts.add(DDialog.urlpathname(script.src));
            }
        }
    }
    
    async create_dialog(htmlText, dialog_container) {
        const error = (message) => {
            dialog_container.remove();
            throw new Error(message);
        }
        // In this case htmlText contains div.dialogform-dialog,
        // div.dialogform-media (at least css), and if no js was included with
        // media, then a JSON script#dialogform-media-js if any js should be loaded
        dialog_container.insertAdjacentHTML('afterbegin', htmlText);
        
        const dialog = dialog_container.children[0];
        if (dialog.tagName != "DIALOG") {
            error(`django template not extended from dialogform/dialog.html?`);
        }
        if (!(this.form = dialog.querySelector('.dialogform'))) {
            error(`django dialogform not extended from dialogform/include/form.html?`);
        }
        // Extract/collect scripts for evaluation
        const temp_media_container = document.createElement('div');
        const dialogform_media = dialog.querySelectorAll('.dialogform-media *');
        for (const medium of dialogform_media) {
            if (medium.tagName == "SCRIPT") {
                temp_media_container.insertAdjacentElement('beforeend', medium);
            }
        }
        const media_scripts = dialog.querySelector('#dialogform-media-js');
        if (media_scripts) {
            temp_media_container.insertAdjacentHTML(
                'beforeend', JSON.parse(media_scripts.textContent));
        }
        for (const medium of Array.from(temp_media_container.children)) {
            // Load, remember and evaluate each script, same origin only, via urlpathname
            const medium_src = DDialog.urlpathname(medium.src);
            if (!DDialog.LoadedScripts.has(medium_src)) {
                let type = medium.getAttribute("type");
                if (!type) type = "text/javascript";
                const script = await this.fetchall(medium.src, {
                    method: 'GET',
                    headers: { 'Content-Type' : type }
                });
                if (!script.ok) {
                    error(`media GET ${medium.src} failed with unexpected status: ${script.status}`);
                };
                DDialog.LoadedScripts.add(medium_src);
                
                // Evaluate the downloaded script and leave it to save any
                // subsequent dialogs on the same page from loading it again
                const newscript = document.createElement("script");
                newscript.text = script.data;
                document.head.appendChild(newscript); //.parentNode.removeChild(newscript);
                console.log(`${medium.src} eval completed.\n`);
            } else {
                console.log(`${medium.src} already loaded.\n`);
            }
        }
        return dialog;
    }

    async show(dialog) {
        var result = await new Promise((laid_out) => {
            let el = DDialog.autofocus(dialog);
            el.addEventListener('focus', event => laid_out(true),{ once: true });
            dialog.show();
        });

        // Kick the mutant as any/all scripts need to become aware of the mutation
        // (**TODO**: this should be refined further... it works for now)
        for (name of ['DOMContentLoaded', 'load']) {
            let event = new Event(name);
            window.document.dispatchEvent(event);
            window.dispatchEvent(event);
        }
    }
}


window.addEventListener('DOMContentLoaded', () => {
    const anchors = document.getElementsByClassName('dialog-anchor');
    for (let anchor of anchors) {
        anchor.addEventListener("click", async (event) => {
            event.stopImmediatePropagation();
            event.preventDefault();
            await DDialog.create(event).process()
        });
    }
});

document.addEventListener("DOMContentLoaded", (event) => {
    let input = document.querySelector('#local_note_dialog input#id_search');
    if (input) {
        input.addEventListener('change', (e) => {
            let ok = e.target.form.querySelector('.dialogform-buttons button[value=confirm]');
            e.target.form.requestSubmit(ok);
            console.log('search: form submit requested.');
        });
        console.log('search: added eventlistener');
    }
});

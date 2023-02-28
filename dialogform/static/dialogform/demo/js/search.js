/*
  This file is part of a program "django-dialogform", a django app to load and open form views
  within <dialog> html element popups.

  Copyright (C) 2023, Zoltan Kemenczy

  This program comes with ABSOLUTELY NO WARRANTY; This is free software, and you are welcome
  to redistribute it under conditions of the GPLv3 LICENSE included in this package
  To use it, refer to the included README.rst
*/

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

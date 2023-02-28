/*
  This file is part of a program "django-dialogform", a django app to load and open form views
  within <dialog> html element popups.

  Copyright (C) 2023, Zoltan Kemenczy

  This program comes with ABSOLUTELY NO WARRANTY; This is free software, and you are welcome
  to redistribute it under conditions of the GPLv3 LICENSE included in this package
  To use it, refer to the included README.rst
*/

function admin_cleanup() {
    let elements = Array.from(document.querySelectorAll('.calendarbox.module')).concat(
        Array.from(document.querySelectorAll('.clockbox.module'))).concat(
            Array.from(document.querySelectorAll('body > span.select2-container')));
    for (let element of elements) {
        for (let child of element.querySelectorAll('*')) child.remove();
        element.remove();
    }
}

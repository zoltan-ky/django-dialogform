/*
  This file is part of a program "django-dialogform", a django app to load and open form views
  within <dialog> html element popups.

  Copyright (C) 2023, Zoltan Kemenczy

  This program comes with ABSOLUTELY NO WARRANTY; This is free software, and you are welcome
  to redistribute it under conditions of the GPLv3 LICENSE included in this package
  To use it, refer to the included README.rst
*/

function zeropad(v,nz) {
    return "0".repeat((n = nz-v.toString().length) > 0 ? n : 0) + v;
}

function roundTime(date, n_minutes) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    minutes = Math.round(minutes / n_minutes) * n_minutes;
    if (minutes >= 60) {
        minutes -= 60;
        hours += 1;
    }
    if (hours >= 24) {
        hours -= 24;
        // TODO (low): Handle date increment...
    }
    return zeropad(hours,2)+':'+zeropad(minutes,2)
}

// To test script evaluation...
document.addEventListener("DOMContentLoaded", (event) => {
    // Color all present .dialogform dialog buttongs
    let buttons = document.querySelectorAll('.dialogform button[value=cancel]');
    for (let button of buttons) {
        button.style.setProperty("background-color","#C09090");
    }
    buttons = document.querySelectorAll('.dialogform button[value=confirm]');
    for (let button of buttons) {
        button.style.setProperty("background-color","#00A000");
    }
});



function admin_cleanup() {
    let elements = Array.from(document.querySelectorAll('.calendarbox.module')).concat(
        Array.from(document.querySelectorAll('.clockbox.module'))).concat(
            Array.from(document.querySelectorAll('body > span.select2-container')));
    for (let element of elements) {
        for (let child of element.querySelectorAll('*')) child.remove();
        element.remove();
    }
}

function admin_cleanup() {
    let boxes = document.querySelectorAll('.calendarbox.module');
    for (let b of boxes) {
        for (let child of b.querySelectorAll('*')) child.remove();
        b.remove();
    }
    boxes = document.querySelectorAll('.clockbox.module');
    for (let b of boxes) {
        for (let child of b.querySelectorAll('*')) child.remove();
        b.remove();
    }
}

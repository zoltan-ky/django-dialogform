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
    let button = document.querySelector('.dialogform button[value="cancel"]');
    if (button)
        button.style['background-color'] = "#C09090";
    button = document.querySelector('.dialogform button[value="confirm"]');
    if (button)
        button.style['background-color'] = "#00A000";
});

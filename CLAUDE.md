# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`django-dialogform` is a reusable Django app (published to PyPI as `django-dialogform`, Django >= 5.0, Python >= 3.10) that opens Django form views inside HTML `<dialog>` popups. The reusable app is `dialogform/`; `dialogform/demo/` is a demo project that also serves as the project for running the dev server and the tests (`manage.py` sets `DJANGO_SETTINGS_MODULE=dialogform.demo.settings`). README.rst is the user-facing documentation and should be kept in sync with behavior changes.

## Commands

```bash
pip install -r requirements                 # django only
pip install -r testing_requirements         # selenium + webdriver-manager for browser tests
./manage.py runserver 8000                  # demo at localhost:8000; admin login admin/admin (committed demo db.sqlite3)

./manage.py test dialogform.demo.tests.Basic     # non-browser tests
./manage.py test dialogform.demo.tests.Chrome    # selenium tests in Chrome
./manage.py test dialogform.demo.tests.Firefox   # selenium tests in Firefox
./manage.py test dialogform.demo.tests.Chrome.test_note_search_cancel   # single test
./manage.py test                                 # everything
```

Browser test classes are skipped when selenium isn't installed. webdriver-manager downloads drivers on first run; a first run may time out on slow browser startup — rerun. There is no linter or build step configured; packaging is setuptools via `pyproject.toml`.

## Architecture

The Python side is thin; almost all behavior lives in `dialogform/static/dialogform/js/dialogform.js`.

**Python (`forms.py`, `views.py`)**
- `DialogMixin` (form): adds `method` (default `"post"`; `"get"` for query forms) and `render_as` (`div`/`table`/`p`/`ul`) with `as_render_as()`. `DialogForm` = `DialogMixin + forms.Form`.
- `DialogFormMixin` (view): sets `is_dialog` in context, defaults the template to `dialogform/dialog.html`, and on `form_valid` converts the redirect into a `JsonResponse({'url', 'status'})`. An invalid form re-renders as HTML. This JSON-vs-HTML split is the contract the JS relies on to decide "done, navigate to url" vs "reopen dialog with errors".

**Templates (`templates/dialogform/`)**
- `dialog.html`: a `<dialog>` fragment with `.dialogform-content` (includes `form.html`) and `.dialogform-media` (form media). Blocks: `dialog-content`, `dialog-media`.
- `page.html`: full HTML document for iframe dialogs; wraps the form in `div.dialogform-dialog` and includes `anchor_media.html` so nested anchors work inside the iframe.
- `form.html`: the `<form>` plus `.dialogform-buttons` with `button.dialogform` values `cancel`/`confirm`. The JS validates these selectors (`check_dialog`), so templates must keep them. Admin templates used in iframes must add the same buttons (see `templates/dialogform/demo/admin_note_change.html`).
- `anchor_media.html`: the CSS/JS a page must include to enable anchors.

**JavaScript (`dialogform.js`)**
- One capturing `click` listener on `document` catches any `.dialog-anchor` (including ones added later inside dialogs). `DialogFactory` picks the class from `data-type` / `data-url`:
  - `DialogDialog`: `data-url` is a URL; fetches the `dialog.html` fragment and inserts it into the current document.
  - `IFrameDialog` (`data-type="iframe"`): loads a `page.html` document into an `<iframe>` inside a `<dialog>`; a rejected form is redisplayed via `srcdoc`.
  - `LocalDialog`: `data-url="#id"` of a `<dialog>` already in the page; only GET forms are supported. It is moved into a temporary container and put back afterwards.
- `BaseDialog.process()` loops `open_and_submit()`: it shows the dialog non-modally (`dialog.show()`, which allows nesting), switches the form method to `dialog`, waits for a button/Esc/submit, then either POSTs via `fetch` (JSON means navigate to `url`, HTML means reopen with the returned form and errors) or, for GET forms, navigates to the form action with the query.
- `listenerRecorder` temporarily wraps `EventTarget.prototype.addEventListener` while any dialog is open, so the listeners added by the dialog and its media can be removed on close. It must always be restored (see the `finally` in `process()`). The selenium tests `test_listener_hook_removed*` cover this.
- `DialogDialog.load_form_media` re-executes the media `<script>`s in order (scripts inserted via `innerHTML` don't run), even ones the page already loaded, and then manually calls the recorded `DOMContentLoaded`/`load` handlers, because those events have already fired.
- Sizing and placement use `ResizeObserver` plus `place_dialog`, relative to the anchor and within the viewport. Optional `data-cleanup` names a global function called after close (e.g. demo `admin_cleanup.js` removes `AdminSplitDateTime` leftovers).
- When Django admin is present and jQuery is not, `DialogFactory` aliases `$`/`jQuery` to `django.jQuery`.

**Demo (`dialogform/demo/`)**: `Note`/`Tag` models. `urls.py` maps the same views (`NoteChange`, `NoteChangeIframe`, `NoteSelectTags`) to several URLs, using an `admin` kwarg that chooses `NoteForm` vs `Note4AdminForm` (admin widgets outside the admin) and the success URL. Views pass `dialogform_template` so `demo/note_form.html` can extend either `dialog.html` or `page.html`. `NoteAdmin` uses an iframe-adapted `change_form_template`. Selenium tests count `.dialog-anchor` elements on the list pages (`check_note_list_view`), so adding or removing demo anchors requires updating those counts.

## Notes

- CI (`.github/workflows/django.yml`) runs `Basic`, `Chrome` and `Firefox` (headless, enabled by the `CI` env var in their `setUpClass`; `GH_TOKEN` is set so webdriver-manager's geckodriver lookup isn't rate-limited), on Python 3.10 (the `requires-python` minimum, which gets Django 5.2) and 3.12 (which gets Django 6, since Django 6 needs Python 3.12 or later). Keep the versions quoted in the YAML (`"3.10"`), because an unquoted `3.10` is read as the number 3.1.
- The version is set in `pyproject.toml`.

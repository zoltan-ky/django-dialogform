django-dialogform
=================

Overview
--------
Django app to open your forms and views in dialog popups. The idea is to allow smaller forms that would typically not fill entire screens, but maybe only modify some attributes of a model or create new relations between models, or even simple messages with a single OK button to be created, opened and closed using `<dialog>` elements. They can also be used for filling search/query forms without loosing track or moving away from the data page filling the screen.

Two different dialog view/template options are provided:

1) dialog - that displays your form immediately within a `<dialog>` element in the same html document context where the link to it is, and

2) dialog/iframe - that creates an `<iframe>` element under the `<dialog>` and loads the form and all its associated media into a separate `iframe.contentWindow/Document`.

The dialogs are non-modal, so they allow for simple actions, like a "X" with a dialog opening another confirmation dialog, or to create an intermediate model if necessary for completing the initating dialog.

The dialog views are regular django form views annotated by mixins and thus opened as dialogs. `div.dialog-anchor` elements, with text or img icons, that may be inserted into other view templates for opening dialog-anchor `url`s (that point to a dialog view).

Basic Form and View templates integrate the two types of dialogforms into Django's Admin, so that they can be opened from admin actions.

A simple demo app for all these variants is included in a demo subdirectory included with dialogform.


Requirements
-------------

Familiarity with setting up django4/python3 project deveiopment environment.


Installation and Demo
---------------------

Install the dialogform directory as an app directory within your project or symbolic-link to it.

If you wish to run the demo, after installing the dialogform packages, set up a python3 environment for a project, e.g (using bash):

    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt

This will install the only requirement, django 4.1.  Then run:

    ./manage.py runserver 8000

that starts up a localhost debug server. Now browse to ``localhost:8000``.
```
Clicking on the various links will open tag assignment and note editing dialogs.  At the bottom there is a link to go a similar Admin page after logging in with ``admin``, ``admin``.


Using Dialogform
----------------

As usual, add ``'dialogform',`` to ``INSTALLED_APPS`` in your project's ``settings.py``.

Forms
^^^^^

``dialogform.forms`` provides ``DialogMixin``,``DialogAdminFormMixin`` to extend your forms to appear as dialogforms. E.g.:


    from dialogform.forms import DialogMixin
    ...
    class SomeForm(DialogMixin,...)

``DialogMixin`` is currently just a "marker" as the media required get loaded by dialog-anchors that refer to Views containing ``DialogMixin`` forms.

``DialogForm`` is ``(DialogMixin,django.forms.Form)`` as a shorthand.


Forms for Admin
'''''''''''''''

``DialogAdminFormMixin`` is a Form mixin that collects the admin media necessary for the Form it is extending - necessary only if the Form is referring to Admin fields/widgets. An example from dialogform/demo:

     class Note4AdminForm(DialogAdminFormMixin, forms.ModelForm):
         class Meta:
             model = Note
             fields = ('content', 'date', 'published')
             field_classes = {
                 'date' : forms.SplitDateTimeField
             }
             widgets = {
                 'date': admin.widgets.AdminSplitDateTime
             }

refers to the AdminSplitDateTime widget requiring admin media to be loaded when the view referring to ``Note4AdminForm`` is opened.

Views
^^^^^

``dialogform.views.DialogFormMixin`` extends django's view ``FormMixin`` to add the ``is_popup`` template context variable so that templates can be conditioned not to display page headers/sidebars/etc when rendered inside a ``<dialog>``

Templates
^^^^^^^^^

To convert a view to a dialog view:

    from dialogform.views import DialogFormMixin
    ...
    class NoteChange(DialogFormMixin, UpdateView):
        template_name = "sometemplate.html"
        form_class = SomeDialogForm
        success_url = reverse_lazy("someviewname")

The important parts are that your template (e.g ``sometemplate.html``) extends one of the following templates depending on the View (Admin or not) and dialog type required (same-document / iframe-document):

+---------------+-----------------+-----------------+                             
|View/dia-type  |  Gen. Views     |    Admin Views  |
+===============+=================+=================+
|dialog         |           dialog.html             |
+---------------+-----------------+-----------------+
|dialog/iframe  |  page.html      |  admin_base.html|
+---------------+-----------------+-----------------+

CSS Layering
^^^^^^^^^^^^

If your document layouts use 'z-index' add the following to your CSS:

    .dialogform-dialog { z-index: <maximum-z-index-of-your-pages> };

to have dialogs appear on top of any layers they may end up overlapping with.


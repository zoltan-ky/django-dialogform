django-dialogform
=================

Overview
--------
Django app to open your forms and views in dialog popups. The idea is to allow smaller forms that would typically not fill entire screens, but maybe only modify some attributes of a model or create new relations between models, or even simple messages with a single OK button to be created, opened and closed using ``<dialog>`` elements. They can also be used for filling search/query forms without loosing track or moving away from the data page filling the screen.

Two different dialog view/template options are provided:

1) ``dialog`` - that displays your form immediately within a ``<dialog>`` element in the same html document context where the link/anchor to it is; and

2) ``dialog/iframe`` - that creates an ``<iframe>`` element under the ``<dialog>`` and loads the form and all its associated media into a separate iframe contentWindow/document.

The dialogs are non-modal, so they allow for simple dialog nesting actions, like an "X" that opens another delete-confirmation dialog, or some other link to create an intermediate model, if necessary for completing the initating dialog.  This is also userful if you're using additional django packages like django-autocomplete-light or others that open their own dialogs that could be blocked by modal dialogs.

The dialog views are regular django form views annotated by mixins and thus opened as dialogs. ``dialog-anchor`` elements, containing descriptive text or img icons, are inserted into other view templates for opening `url`s (that point to a dialog view).

Dialogform form and view templates integrate the two types of dialogforms into Django's Admin, so that they can be used from ModelAdmin views.

A simple demo app for all these variants is included in a demo subdirectory included with dialogform.


Requirements
-------------

Familiarity with setting up django4/python3 project development environment.


Installation and Demo
---------------------

In an empty directory do:

    git clone https://github.com/zoltan-ky/django-dialogform.git .

If you wish to run the demo, after installing the above, check for manage.py and in the same directory set up a python3 environment e.g (using bash):

::
   
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt

This will install the only requirement, django 4.1.  Then run:

    ./manage.py runserver 8000

that starts up a localhost debug server. Now browse to ``localhost:8000``.

Clicking on the various links will open tag assignment and note editing dialogs.  At the bottom there is a link to go a similar Admin page after logging in with ``admin``, ``admin``.


Using Dialogform
----------------

As usual, add ``'dialogform',`` to ``INSTALLED_APPS`` in your project's ``settings.py``.

Forms
^^^^^

``dialogform.forms`` provides ``DialogMixin``, ``DialogAdminFormMixin`` to extend forms to appear as dialogforms. E.g.:

::
   
    from dialogform.forms import DialogMixin
    ...
    class SomeForm(DialogMixin,...)

``DialogMixin`` is currently just a "marker" as the media required get loaded by dialog-anchors that refer to Views containing ``DialogMixin`` forms.

``DialogForm`` is a ``DialogForm(DialogMixin, forms.Form)`` shorthand.

The two buttons controlling the ``<dialog>`` forms, ``Cancel`` and ``OK``, are added by the dialogform form template (see also Templates below).  If saving the form fails, the dialog remains open with the form and errors displayed for correction and either ``Cancel`` or successful ``OK`` saves the form and closes the dialog.


Forms for Admin
'''''''''''''''

``DialogAdminFormMixin`` is a Form mixin that collects the admin media necessary for the Form it is extending - necessary only if the Form is referring to Admin fields/widgets. An example from dialogform/demo:

::
   
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

::
   
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

The dialog templates required for ``dialog/iframe`` have a complete document ``<html><head.../><body..../>`` that could also be used to render a non-dialog app view page.  The ``is_popup`` template context varible can be used to differentiate if necessary so that the same template could be rendered differently in a standard view vs in a ``dialog/iframe`` view.

Templates derived from ``dialog.html`` are designed to render a document fragment containing a single ``<form>`` element as described under Forms above.

``success_url`` represents the next view that the dialog view will be redirected to after the ``OK`` button has been pressed and the form had been successfully saved (just like with regular Django views).

Anchors
^^^^^^^
Views that want to be able to open dialogs (dialog views) have to populate ``dialog-anchors`` that serve the role ``<a>`` link elements:

::
   
    <div class="dialog-anchor" data-url="{% url 'someapp:some-dialog-view-name' %}" title="helpful-popup if needed">
        <span>Some Anchor Text</span>   **or**:  <img src="some url to an anchor icon" ...>
    </div>

For ``dialog/iframe`` dialog type just add the ``data-type`` attribute:

::
   
    <div class="dialog-anchor" data-url="{% url 'someapp:some-dialog-view-name' %}" title="some-helpful-popup"
         data-type="iframe">
         ...

CSS Styling
^^^^^^^^^^^^

Basic dialogform styling is supported by for root media light/dark-color-scheme-aware variables:

::
   
    --dialog-background
    --dialog-color

These allow to make the dialog form somewhat different from the page over which it appears if desired.

::
   
    --dialog-anchor-bg-hover

affects the background of dialog-anchor text spans when hovered over.

::
   
    --icon-size

determines the size of the icons displayed by dialog-anchors. To make the dialog-anchor image icon disappear until hovered over, add ``class="hide"`` to the <img> element. dialog-anchor text span is shown underlined when hovered over.

If your document layouts use 'z-index' add the following to your CSS:

    .dialogform-dialog { z-index: <maximum-z-index-of-your-pages> };

to have dialogs appear on top of any layers they may end up overlapping with.


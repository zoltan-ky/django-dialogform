django-dialogform
=================

Overview
--------
Django app to open forms within ``<dialog>`` html element popups. These popups are auto-placed relative to their anchor and auto-sized to their content, placed within the referring page viewport area and have no menus or borders for resizing/moving.

The general idea is to display django forms that would typically not need to fill entire screens, but maybe only modify some attributes of a model or create new relations between models, or run queries, etc, without leaving the referring page.

Two different dialog template options are included:

1) ``dialog`` - that displays a form directly within a ``<dialog>`` element in the same html document context where the anchor to it is found; and

2) ``dialog/iframe`` - that creates an ``<iframe>`` element within the ``<dialog>`` and loads the form and all its associated media as a complete content window/document.

The dialogs are non-modal, so they allow for simple dialog nesting actions, like an "X" that opens another delete-confirmation dialog, or some other link to create an intermediate model, if necessary for completing the initiating dialog.  This is also useful if you're using additional django packages in your forms that may use dialogs that could be blocked by a modal dialog.

The dialog views are regular django form views annotated by mixins and thus opened as dialogs. ``dialog-anchor`` elements, containing descriptive text or img icons, are inserted into other view templates for opening dialog view urls.

Dialogform form and view templates can also be used within the Admin and contain Admin widgets.

A simple demo app for all these variants is included in a demo subdirectory included with dialogform.

Known Limitations
-----------------

Dialogforms are auto-positioning and sizing within the viewport. Dialogform media assets are restricted to sameorigin.

Installation and Demo
---------------------

In an empty directory do:

::

    git clone https://github.com/zoltan-ky/django-dialogform.git .

If you wish to run the demo, after installing the above, check for manage.py and in the same directory set up a python3 environment e.g (using bash):

::
   
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt

This will install the only requirement, django 4.1.  Then run:

::

    ./manage.py runserver 8000

that starts up a localhost debug server. Now browse to ``localhost:8000``.

Clicking on the various links will open tag assignment and note editing dialogs.  At the bottom there is a link to go a similar Admin page after logging in with ``admin``, ``admin``.


Using Dialogform
----------------

As usual, add ``'dialogform',`` to ``INSTALLED_APPS`` in your project's ``settings.py``.

For ``dialog/iframe`` type dialogs, if the jsi18n catalog is not already loaded by other means, add:

::

   path('dialogform/', include('dialogform.urls')),

to your project ``urls.py``, and extend your template from ``dialogform/page_catalog.html`` instead of ``dialogform/page.html`` (see Views below).

Forms
^^^^^

``dialogform.forms`` provides ``DialogMixin`` for forms that are to be used as dialogforms. For example:

::
   
    from dialogform.forms import DialogMixin
    ...
    class SomeForm(DialogMixin,...)

``DialogMixin`` is currently just a "marker". ``dialog-anchors`` that refer to views containing ``DialogMixin`` forms load the views and form media required.

``DialogForm`` is a ``DialogForm(DialogMixin, forms.Form)`` shorthand.

Two buttons controlling the ``<dialog>`` forms, ``Cancel`` and ``OK``, are added by the dialogform form template (see also Templates below).  If saving the form fails, the dialog remains open with the form and errors displayed for correction and either ``Cancel`` or successful ``OK`` saves the form and closes the dialog.  The ``Cancel`` button is only added if the template gets a ``form`` variable, otherwise only the ``OK`` will show to close the dialog.

If there's no 'autofocus` field in the form, the ``OK`` button gets the focus. The dialogs can also be closed by ``Esc``.


Forms for Admin
'''''''''''''''

The included demo app ``DialogAdminFormMixin`` is a Form mixin that collects the admin media necessary for the Form it is extending - necessary only if the Form is referring to Admin fields/widgets. An example from dialogform/demo:

::
   
    class Note4AdminForm(DialogAdminFormMixin, NoteForm):
        parents = forms.ModelMultipleChoiceField(
            required=False, queryset=Note.objects.all(),
        )
        class Meta(NoteForm.Meta):
            fields = ('content', 'date', 'parents', 'published')
            widgets = {
                'date': admin.widgets.AdminSplitDateTime(
                    attrs={'format':['%Y-%m-%d','%H:%M']})
            }

refers to the AdminSplitDateTime widget requiring admin media to be loaded when the view referring to ``Note4AdminForm`` is opened.

Views
^^^^^

To convert a view to a dialog view:

::
   
    from dialogform.views import DialogFormMixin
    ...
    class SomeModelUpdate(DialogFormMixin, UpdateView):
        template_name = "sometemplate.html"
        form_class = SomeDialogForm
        success_url = reverse_lazy("someviewname")

``success_url`` represents the view that the dialog view will be redirected to after the form had been successfully saved.

The template (e.g ``sometemplate.html``) extends one of the following templates depending on the View (Admin or not) and dialog type required:

+---------------+-----------------+-----------------+                             
|View/dialog-type  |  Gen. Views     |    Admin Views  |
+===============+=================+=================+
|dialog         |           dialog.html             |
+---------------+-----------------+-----------------+
|dialog/iframe  |  page.html      |  admin_base.html|
+---------------+-----------------+-----------------+

Templates derived from ``dialog.html`` are designed to render a document fragment within a ``<dialog>`` containing a single ``<form>`` element as described under Forms above.

The dialog templates required for ``dialog/iframe`` should be complete html documents that, if needed, could also be used to render a non-dialog, regular view. The ``is_dialog`` template context variable can be used within the template to differentiate.

Dialog Template Extension Blocks
''''''''''''''''''''''''''''''''

The dialog templates listed in the table above may be extended. By default they contain the dialog view form only.

dialog-content
..............

This extension example assumes extending dialog.html:

::

   {% extends "dialogform/dialog.html" %}
   {% block dialog-content %}
      ...some content before the form...
      {{ block.super }}
      ...any content after the form...
   {% endblock %}

dialog-media
............

If some additional media, not captured by the form/widgets media, are required:

::

   {% extends "dialogform/dialog.html" %}
   {% block dialog-media %}
      load additional media before the form media
      {{ block.super }}
      and after 
   {% endblock %}

Admin Dialog Templates
''''''''''''''''''''''
See the included demo app ``dialogform/demo/admin.py`` and ``templates/dialogform/demo/admin_note_change.html``.

   
Anchors
^^^^^^^
Dialogform javascript media processes ``dialog-anchors`` that serve the role of ``<a>`` link elements within referring views:

::
   
    <div class="dialog-anchor" data-url="{% url 'someapp:some-dialog-view-name' %}" title="some help text">
        <span>Some Anchor Text</span>   **or**:  <img src="some url to an anchor icon" ...>
    </div>

For ``dialog/iframe`` dialogs add the ``data-type`` attribute:

::
   
    <div class="dialog-anchor" data-url="{% url 'someapp:some-dialog-view-name' %}" title="some help text"
         data-type="iframe">
         ...

CSS Styling
^^^^^^^^^^^^

Basic dialogform styling is supported by light/dark color-scheme-aware variables:

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


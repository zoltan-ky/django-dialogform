django-dialogform
=================

Overview
--------
Django app to open forms within ``<dialog>`` html element popups. These popups are auto-placed relative to their anchor and auto-sized to their content, placed within the referring page viewport area and have no menus or borders for resizing/moving.  This is meant for django forms that wouldn't have a large amount of data, but maybe only present a few fields to modify some attributes of a model, create new relations between models, or run queries, etc., with the referring page in the background waiting for the dialog form to be closed.

Three different dialog template options are included:

1) ``dialog`` - that displays a form directly within a ``<dialog>`` element in the same html document context where the anchor to it is found;

2) ``iframe`` - that creates an ``<iframe>`` element within the ``<dialog>`` and loads the form and all its associated media as a complete content window/document;

3) ``local`` - this option handles the presentation of a ``<dialog>`` element with a form already loaded and present in the document.

Dialog elements and their content forms are created and destroyed dynamically for the first two options.

The dialogs are non-modal, so they allow for occasional dialog nesting actions (e.g a model-editing dialog that contains an "X" icon that opens another delete-confirmation dialog), or some other link to create an intermediate or new model to be referred to), if such links are present in the dialog.

The dialog views are regular django _form_ views annotated by dialogform mixins. ``dialog-anchor`` elements take the role of anchor (<a>) elements that are inserted into view templates to open dialog view urls.

Dialogform form and view templates may also be used within the Admin and contain Admin widgets.

A simple demo app with all these variations is included in the dialogform/demo subdirectory.



Known Limitations
-----------------

Dialogforms are auto-positioning and -sizing within the viewport. Dialogform media assets are restricted to sameorigin.


Installation and Demo
---------------------

In an empty directory do:

::

    git clone https://github.com/zoltan-ky/django-dialogform.git .

If you wish to run the demo, after installing the above, check for ``manage.py`` and in the same directory set up a python3 environment e.g (using bash):

::
   
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt

This will install the only requirement, django 4.1 or greater.  Then run:

::

    ./manage.py runserver 8000

that starts up a localhost debug server. Now browse to ``localhost:8000``.

Clicking on the various links within the list of notes will open tag assignment and note editing dialogs. The third and fourth columns that demo the use of Admin widgets outside of the admin require prior login to admin. At the bottom there is a link to log in with ``admin``, ``admin``.

There is a 'search' dialog above the list of notes that demonstrates local dialogs.


Using Dialogform
----------------

Add ``'dialogform',`` to ``INSTALLED_APPS`` in your project's ``settings.py``.


Forms
^^^^^

``dialogform.forms`` provides ``DialogMixin`` for forms that are to be used as dialogforms. For example:

::
   
    from dialogform.forms import DialogMixin
    ...
    class SomeForm(DialogMixin,...)

``DialogMixin`` is currently just a marker. 

``DialogForm`` is a ``DialogForm(DialogMixin, forms.Form)`` shorthand.

Two buttons controlling the ``<dialog>`` forms, ``Cancel`` and ``OK``, are added by the dialogform form template (see also Templates below).  If saving the form fails, the dialog remains open with the form and errors displayed for correction and either ``Cancel`` or successful ``OK`` saves the form and closes the dialog.  The ``Cancel`` button is only added if the template gets a ``form`` variable, otherwise only the ``OK`` will show to close the dialog.

If there's no 'autofocus` field in the form, the ``OK`` button gets the focus. The dialogs can also be cancelled and closed by ``Esc``.


Views and Templates
^^^^^^^^^^^^^^^^^^^

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
|iframe         |  page.html      | std admin templates|
+---------------+-----------------+-----------------+

Templates derived from ``dialog.html`` are designed to render a document fragment within a ``<dialog>`` element containing a single ``<form>`` element as described under Forms above.  These views/urls should be invoked by ``dialog`` anchor types.

Templates for ``iframe``-type dialogs should be derived from ``page.html``.  These are complete html documents that could also be used to render a non-dialog, regular view. The ``is_dialog`` template context variable is set by DialogFormMixin for template use.


Dialog Template Extension Blocks
''''''''''''''''''''''''''''''''

The dialog templates listed in the table above may be extended. By default they contain the dialog view form only.

dialog-content
..............

::

   {% extends "dialogform/dialog.html" %}{# or "dialogform/page.html" #}
   {% block dialog-content %}
      ...some content before the form...
      {{ block.super }}
      ...any content after the form...
   {% endblock %}

dialog-media
............

If some additional media, not captured by the form/widgets media, are required:

::

   {% extends "dialogform/dialog.html" %}{# or "dialogform/page.html" #}
   {% block dialog-media %}
      ...additional media before the form media...
      {{ block.super }}
      ...and after...
   {% endblock %}


Anchors
^^^^^^^

Dialogform javascript processes ``dialog-anchors`` that serve the role of ``<a>`` link elements within referring views:

::
   
    <div class="dialog-anchor" data-url="{% url 'someapp:some-dialog-view-name' %}" title="some help text">
        <span>Some Anchor Text</span>   **or**:  <img src="some url to an anchor icon" ...>
    </div>

For ``iframe``-type dialogs add the ``data-type`` attribute:

::
   
    <div class="dialog-anchor" data-url="{% url 'someapp:some-dialog-view-name' %}" title="some help text"
         data-type="iframe">
         ...

Sometimes forms or widgets leave behind artefacts generated during form/widget instantiation. An example of this is ``AdminSplitDateTime`` widget that leaves behind #calendarbox and #clockbox divs in the document body.  Normally this is not a problem since after a valid form is submitted a new document will be loaded.  However, if the dialogform is cancelled, it's anchor may have an optional ``data-cleanup`` attribute that names a global javascript function, loaded with the document or dialogform media that is invoked without parameters after closing the dialog. An example from ``note_list.html``:

::

   <div class="dialog-anchor" data-url="{% url 'note-iframe-admin' pk=note.pk %}"
                 title="Iframe Edit with admin widgets"
                 data-type="iframe"
                 data-cleanup="admin_cleanup">
              <span>{{ note.content }}</span></div>


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

::
   
    .dialogform-dialog { z-index: <maximum-z-index-of-your-pages> };

to have dialogs appear on top of any layers they may end up overlapping with.



Demo App
--------

The demo app is included to provide at least one example for the possible combinations of dialogform dialog types without and within the admin.

Models
^^^^^^

The following simple models are used:

::

    class Note(models.Model):
        content = models.CharField(max_length=200) 
        date = models.DateTimeField('date written')
        published = models.BooleanField(default=False)
        parents = models.ManyToManyField('self', blank=True, symmetrical=False,
                                         related_name='children')

    class Tag(models.Model):
        name = models.CharField(max_length=32, unique=True)
        notes = models.ManyToManyField('Note', blank=True, related_name='tags')


Views, Forms, Templates
^^^^^^^^^^^^^^^^^^^^^^^

The demo app has two Note list views, one without admin and the other within admin.

The demo app ``Notes`` list view contains ``NoteChange`` and ``NoteChangeIframe`` views invoked by ``dialog``- and ``iframe``-type dialogs respectively.  It also includes a ``local`` dialog for a Note search query.

Both of these views have an optional ``admin`` boolean keyword argument indicating the form (``NoteForm`` or ``Note4AdminForm``) to be used by the dialog view.  This ``admin`` argument is set by the request url (``demo/urls.py``).

These views also select the base template that ``dialogform/demo/note_form.html`` extends by setting the ``dialogform_template`` template context variable. This is pure convenience to minimize code duplication and view reuse within and without admin.


Admin-widgets Used in the Demo 
''''''''''''''''''''''''''''''

The admin widgets within ``Note4AdminForm`` are ``AdminSplitDateTime``, ``AutocompleteSelectMultiple`` and ``RelatedFieldWidgetWrapper``, representative of more 'complex' admin widgets.

These are the same widgets that are used within the auto-generated admin form for NoteAdmin - invoked through a ``iframe``-type dialog anchor that targets the admin (auto-named) ``admin:demo_note_change`` view.


Admin Dialog Templates
''''''''''''''''''''''

These need to be modified to be used with ``iframe``-type dialogs as these types load complete admin form documents into <iframe> contentDocuments within the dialog.

The modification involves eliminating non-form related admin blocks within the standard admin templates and adding the dialog-required 'Cancel' and 'OK' buttons. The included ``dialogform/templates/dialogform/demo/admin_note_change.html`` is an example, it extends the standard ``admin/change_form.html`` template:

::
    {% extends "admin/change_form.html" %}

    {# Eliminate non-form page elements #}
    {% block header %}{% endblock %}
    {% block nav-breadcrumbs %}{% endblock %}
    {% block nav-sidebar %}{% endblock %}

    {% block content %}
      <div class="dialogform-dialog">
        {{ block.super }}
      </div>
    {% endblock %}

    {% block submit_buttons_top %}
      <div class="dialogform-buttons">
        <button class="dialogform" value="cancel">Cancel</button>
        <button class="dialogform" value="confirm">OK</button>
      </div>
    {% endblock %}
    {% block submit_buttons_bottom %}
      <div class="dialogform-buttons">
        <button class="dialogform" value="cancel">Cancel</button>
        <button class="dialogform" value="confirm">OK</button>
      </div>
    {% endblock %}

and is referred to from ``NoteAdmin`` (``demo/admin.py``) as:

::
   ...
   add_form_template = "admin/change_form.html"
   change_form_template = "dialogform/demo/admin_note_change.html"
   ...

For adding new Note objects via the ``+`` RelatedFieldWidgetWrapper  ``add_form_template`` in ``demo/admin.py`` is set to the standard admin change_form.

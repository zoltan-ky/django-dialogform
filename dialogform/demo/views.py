from django.shortcuts import render
from django.views.generic import ListView
from django.views.generic.edit import FormMixin, UpdateView
from django.urls import reverse, reverse_lazy


from dialogform.views import DialogFormMixin
from .models import Note, Tag
from .forms import NoteForm, NoteTagsSelectForm, Note4AdminForm

class Notes(ListView):
    model = Note
    template_name = "dialogform/demo/note_list.html"

class NoteChange(DialogFormMixin, UpdateView):
    # View referred to by dialog-anchor url
    model = Note
    template_name = "dialogform/demo/note_form.html"
    extends = "dialogform/dialog.html"
    

    def get_form_class(self):
        return NoteForm if 'admin' not in self.kwargs \
            else Note4AdminForm

    def get_success_url(self):
        return reverse("notes") if 'admin' not in self.kwargs \
            else reverse("admin:demo_note_changelist")
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["dialogform_template"] = self.extends # used by iframe (next) view as well
        return context

    
class NoteChangeIframe(NoteChange):
    # Everything same as above, but using an iframe in the dialog that loads all of admin
    # media into the dialog iframe document
    extends = "dialogform/page.html"
    
    def setup(self, request, *args, **kwargs):
        if 'admin' in kwargs:
            self.extends = "dialogform/admin_base.html"
        super().setup(request, *args, **kwargs)
    

class NoteSelectTags(DialogFormMixin, UpdateView):
    model = Note
    form_class = NoteTagsSelectForm
    # In this case the Update model class is Note but our form deals with
    # "tags", not a field on Note, so we need to override the default UpdateView
    # "note_form.html". For this simple case "dialogform/dialog.html" template's
    # handling of the form is sufficient.
    template_name = "dialogform/dialog.html"

    def get_success_url(self):
        return reverse("notes") if 'admin' not in self.kwargs \
            else reverse("admin:demo_note_changelist")

    def get_initial(self):
        return {'tags':list(self.object.tags.values_list('id',flat=True))}

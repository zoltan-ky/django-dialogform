from django.shortcuts import render
from django.views.generic import ListView
from django.views.generic.edit import FormMixin, UpdateView
from django.urls import reverse, reverse_lazy


from dialogform.views import DialogFormMixin
from .models import Note, Tag
from .forms import NoteForm, NoteTagsSelectForm, SearchForm, Note4AdminForm

class Notes(ListView):
    model = Note
    template_name = "dialogform/demo/note_list.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        print(f'request.GET: {self.request.GET}\n')
        queryform = \
            queryform = SearchForm(self.request.GET) if 'search' in self.request.GET \
                else SearchForm({'search':''})
        context["queryform"] = queryform
        queryform.full_clean()
        qd = queryform.cleaned_data
        if qd["search"]:
            context['note_list'] = context['note_list'].filter(content__icontains=qd["search"])
        return context

class NoteChange(DialogFormMixin, UpdateView):
    model = Note
    template_name = "dialogform/demo/note_form.html"
    extends = "dialogform/dialog.html"
    
    def get_form_class(self):
        return NoteForm if 'admin' not in self.kwargs else Note4AdminForm

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
            self.extends = "dialogform/demo/page_catalog.html"
        super().setup(request, *args, **kwargs)


class NoteSelectTags(DialogFormMixin, UpdateView):
    model = Note
    form_class = NoteTagsSelectForm
    template_name = "dialogform/dialog.html"

    def get_success_url(self):
        return reverse("notes") if 'admin' not in self.kwargs \
            else reverse("admin:demo_note_changelist")

    def get_initial(self):
        return {'tags':list(self.object.tags.values_list('id',flat=True))}


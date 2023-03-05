# This file is part of a program "django-dialogform", a django app to load and open form views
# within <dialog> html element popups.

# Copyright (C) 2023, Zoltan Kemenczy

# This program comes with ABSOLUTELY NO WARRANTY; This is free software, and you are welcome
# to redistribute it under conditions of the GPLv3 LICENSE included in this package
# To use it, refer to the included README.rst

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
        if 'admin' in self.kwargs and self.kwargs['admin']:
            return reverse("admin:demo_note_changelist")
        else:
            return reverse("notes")
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if 'admin' in self.kwargs:
            context["has_admin"] = True
        context["dialogform_template"] = self.extends
        return context

class NoteChangeIframe(NoteChange):
    extends = "dialogform/page.html"


class NoteSelectTags(DialogFormMixin, UpdateView):
    model = Note
    form_class = NoteTagsSelectForm
    template_name = "dialogform/dialog.html"

    def get_success_url(self):
        return reverse("notes") if 'admin' not in self.kwargs \
            else reverse("admin:demo_note_changelist")

    def get_initial(self):
        return {'tags':list(self.object.tags.values_list('id',flat=True))}


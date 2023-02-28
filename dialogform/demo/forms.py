# This file is part of a program "django-dialogform", a django app to load and open form views
# within <dialog> html element popups.

# Copyright (C) 2023, Zoltan Kemenczy

# This program comes with ABSOLUTELY NO WARRANTY; This is free software, and you are welcome
# to redistribute it under conditions of the GPLv3 LICENSE included in this package
# To use it, refer to the included README.rst

from django.db import models
from django import forms
from django.forms.widgets import SplitDateTimeWidget
from django.contrib import admin
from django.contrib.admin.widgets import AdminSplitDateTime, AutocompleteSelectMultiple,\
    RelatedFieldWidgetWrapper

from dialogform.forms import DialogMixin
from .models import Note, Tag

class NoteForm(DialogMixin, forms.ModelForm):
    class Meta:
        model = Note
        fields = ('content', 'date', 'published', 'parents')
        field_classes = {
            'date' : forms.SplitDateTimeField
        }
        widgets = {
            'date': SplitDateTimeWidget(
                date_format = '%Y-%m-%d',
                time_format = '%H:%M',
                date_attrs = {'type':'date',
                              'class':'datetime-date'},
                time_attrs = {'type':'time',
                              'class':'datetime-time',
                              'min':'00:00',
                              'max':'23:59'})
        }
    class Media:
        js = ['dialogform/demo/js/additional.js']
        css = {'all': ['dialogform/demo/css/style.css',
                       'dialogform/demo/css/additional.css']}

    def clean_content(self):
        value = self.cleaned_data['content']
        unwanted_str = "!@#$%^&*()|\\~`'\""
        unwanted_set = set(unwanted_str)
        if not set(value).isdisjoint(unwanted_set):
            raise forms.ValidationError(
                f'content field should not contain any of: "{unwanted_str}".')
        return value

# A reverse ManyToMany relation editing (dialog) form
class NoteTagsSelectForm(DialogMixin, forms.ModelForm):
    tags = forms.ModelMultipleChoiceField(queryset=Tag.objects.all(),
                                          required=False, widget=forms.CheckboxSelectMultiple)
    class Meta:
        model = Note
        fields = ('tags',)

    # tags are not defined on Note but on Tag. So override the m2m save method
    # called from ModelForm.save() to save submitted tags relations to note (the
    # 'public' m2m_save() method is not called from ModelForm.save() in Django
    # 4.1)
    def _save_m2m(self):
        self.instance.tags.set(self.cleaned_data['tags'])


class SearchForm(DialogMixin, forms.Form):
    method = "GET"
    search = forms.CharField(required=False, initial="", widget=forms.TextInput(attrs={'size':15}))
    class Media:
        js=('dialogform/demo/js/search.js',)


# There's no django 'AdminForm' to provide the media necessary for admin except
# through ModelAdmin, so here's a utility mixin to be used for dialog forms with
# Admin widgets.
class MetaModel(models.Model): pass

class DialogAdminFormMixin(DialogMixin):
    class Media:
        js = admin.ModelAdmin(MetaModel,admin.sites.site).media._js
        # Todo: merge css dict from ModelAdmin if/when it becomes non-empty


class Note4AdminForm(DialogAdminFormMixin, NoteForm):
    parents = forms.ModelMultipleChoiceField(
        required=False, queryset=Note.objects.all(),
        widget = RelatedFieldWidgetWrapper(
            AutocompleteSelectMultiple(
                Note.parents.field,
                admin.sites.site
            ),
            Note.parents.rel,
            admin.sites.site,
            can_add_related=True)
    )
    class Media:
        js = ['dialogform/demo/js/admin_cleanup.js']  # to clean up admin
                                                      # datetime shortcuts from
                                                      # document after closing
        
    class Meta(NoteForm.Meta):
        model = Note
        fields = ('content', 'date', 'parents', 'published')
        widgets = {
            'date': AdminSplitDateTime(
                attrs={'format':['%Y-%m-%d','%H:%M']})
        }

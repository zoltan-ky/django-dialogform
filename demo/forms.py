from django import forms
from django.contrib import admin
from dialogform.forms import DialogMixin, DialogAdminFormMixin
from .models import Note, Tag

from django.forms.widgets import SplitDateTimeWidget

class Note4AdminForm(DialogAdminFormMixin, forms.ModelForm):
    class Meta:
        model = Note
        fields = ('content', 'date', 'published')
        field_classes = {
            'date' : forms.SplitDateTimeField
        }
        # Use AdminSplitDateTime as a more complex field with media to test
        # DDialog dynamic script loading
        widgets = {
            'date': admin.widgets.AdminSplitDateTime
        }
    class Media:
        css = {'all': ['dialogform/css/style.css']}


class NoteForm(DialogAdminFormMixin, forms.ModelForm):
    class Meta:
        model = Note
        fields = ('content', 'date', 'published')
        field_classes = {
            'date' : forms.SplitDateTimeField
        }
        widgets = {
            'date': SplitDateTimeWidget(
                date_attrs = {'type':'date',
                              'class':'datetime-date'},
                time_attrs = {'type':'time',
                              'class':'datetime-time',
                              'step':'300',
                              'min':'00:00',
                              'max':'23:55'})
        }
    class Media:
        js = ['dialogform/demo/js/additional.js']
        css = {'all': ['dialogform/demo/css/additional.css']}


# A reverse ManyToMany relation editing (dialog) form
class NoteTagsSelectForm(DialogMixin, forms.ModelForm):
    tags = forms.ModelMultipleChoiceField(queryset=Tag.objects.all(),
                                          required=False, widget=forms.CheckboxSelectMultiple)
    class Meta:
        model = Note
        fields = ('tags',)

    # tags are not defined on Note but on Tag. So we override the m2m save
    # method called from ModelForm.save() to save submitted tags relations to
    # note (the 'public' m2m_save() method is not called from ModelForm.save()
    # in Dj.4.1)
    def _save_m2m(self):
        self.instance.tags.set(self.cleaned_data['tags'])


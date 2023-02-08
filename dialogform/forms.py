from django.db import models
from django import forms
from django.forms.utils import RenderableFormMixin

class DialogMixin(RenderableFormMixin, metaclass = forms.MediaDefiningClass):
    pass

class DialogForm(DialogMixin, forms.Form):
    pass


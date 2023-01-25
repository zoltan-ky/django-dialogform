from django.db import models
from django import forms
from django.forms.utils import RenderableFormMixin
from django.contrib import admin

class DialogMixin(RenderableFormMixin, metaclass = forms.MediaDefiningClass):
    pass

class DialogForm(DialogMixin, forms.Form):
    pass

# There's no django 'AdminForm' to provide the media necessary for admin except
# through ModelAdmin, so here's a utility mixin to be used for dialog forms with
# Admin widgets. This mixin definition needs a dummy model with a _meta
# attribute too.
class MetaModel(models.Model): pass

class DialogAdminFormMixin(DialogMixin):
    class Media:
        js =  admin.ModelAdmin(MetaModel,admin.sites.site).media._js
        css = {'all':['admin/css/forms.css']}
        # Todo: merge css dict from ModelAdmin if/when it becomes non-empty


# This file is part of a program "django-dialogform", a django app to load and open form views
# within <dialog> html element popups.

# Copyright (C) 2023, Zoltan Kemenczy

# This program comes with ABSOLUTELY NO WARRANTY; This is free software, and you are welcome
# to redistribute it under conditions of the GPLv3 LICENSE included in this package
# To use it, refer to the included README.rst

from django.db import models
from django import forms
from django.forms.utils import RenderableFormMixin

class DialogMixin(RenderableFormMixin, metaclass = forms.MediaDefiningClass):
    method = "post"
    render_as = "div"
    def as_render_as(self):
        if self.render_as.lower() not in ('div','table','p','ul'):
            raise Exception(f"{self.__class__}: unrecognized form render_as attribute: {self.render_as}")
        return eval(f"self.as_{self.render_as.lower()}()")
    
class DialogForm(DialogMixin, forms.Form):
    pass


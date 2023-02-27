from django.db import models
from django import forms
from django.forms.utils import RenderableFormMixin

class DialogMixin(RenderableFormMixin, metaclass = forms.MediaDefiningClass):
    method = "POST"
    render_as = "div"
    def as_render_as(self):
        if self.render_as.lower() not in ('div','table','p','ul'):
            raise Exception(f"{self.__class__}: unrecognized form render_as attribute: {self.render_as}")
        return eval(f"self.as_{self.render_as.lower()}()")
    
class DialogForm(DialogMixin, forms.Form):
    pass


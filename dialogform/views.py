# This file is part of a program "django-dialogform", a django app to load and open form views
# within <dialog> html element popups.

# Copyright (C) 2023, Zoltan Kemenczy

# This program comes with ABSOLUTELY NO WARRANTY; This is free software, and you are welcome
# to redistribute it under conditions of the GPLv3 LICENSE included in this package
# To use it, refer to the included README.rst

from django.views.generic.edit  import FormMixin, FormView
from django.http 		import JsonResponse
from django.core.exceptions	import ImproperlyConfigured

from .forms import *

class DialogFormMixin(FormMixin):
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["is_dialog"] = True
        return context
    
    def get_template_names(self):
        try:
            return super().get_template_names()
        except ImproperlyConfigured:
            # Default for simple DialogViews:
            return ["dialogform/dialog.html"]

    def form_valid(self, form):
        response = super().form_valid(form)
        # response should be a url with status 302 (redirect)
        json_response = JsonResponse({'url':    response.url,
                                      'status': response.status_code})
        return json_response

class DialogFormView(DialogFormMixin, FormView):
    pass

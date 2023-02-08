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

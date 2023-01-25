from django.views.generic       import TemplateView
from django.views.generic.edit  import FormMixin, FormView
from django.http 		import JsonResponse
from django.core.exceptions	import ImproperlyConfigured
from django.utils.html		import json_script
from django.utils.safestring	import mark_safe as _ms

from .forms import *

_form_tags = { 'table': { 'table': [_ms('<table>'),_ms('</table>')],
                          'row':   [_ms('<tr>'), _ms('</tr>')],
                          'field': [_ms('<td>'), _ms('</td>')] },
               'div'  : { 'table': ['',''],
                          'row':   [_ms('<div>'),_ms('</div>')],
                          'field': ['',''] }}

class DialogFormMixin(FormMixin):
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # For a dialog with iframe we set the "is_popup" context variable (like
        # Django Admin) so that form template pages could check "is_popup" to
        # render the form only and not the rest of the page (visible headers,
        # footers, page query buttons, etc)
        context["is_popup"] = True

        # It would be nice if there'd be were a tags-type setting in django per
        # form/view/template and/or if that could be queried from form/view/templates
        form_tags_type = context.get('form_tags_type')
        if not form_tags_type: form_tags_type = kwargs.get('form_tags_type')
        if not form_tags_type: form_tags_type = 'table'
        if form_tags_type not in ['table', 'div']:
            raise Exception("supported 'form_tags_type's are 'table' and 'div'")
        context["dlgfrm_tags"] = _form_tags[form_tags_type]
            
        #form = context["form"]
        # These template context variables are provided to optionally allow
        # finer-grain control over media loading in templates extended from
        # dialogform/dialog.html. ('iframe'-type dialogs can simply use {{
        # form.media }} in templates)
        #context["dialogform_media_css"] = _ms("\n".join(form.media.render_css()));
        #context["dialogform_media_js"] = \
        #    json_script(form.media.render_js(), element_id="dialogform-media-js")
        return context
    
    def get_template_names(self):
        try:
            return super().get_template_names()
        except ImproperlyConfigured:
            # Default for simple DialogViews:
            return ["dialogform/dialog.html"]

    def form_valid(self, form):
        response = super().form_valid(form)
        # response should be a redirect (302) return url with status
        json_response = JsonResponse({'url':    response.url,
                                      'status': response.status_code})
        return json_response
    

class DialogFormView(DialogFormMixin, FormView):
    pass

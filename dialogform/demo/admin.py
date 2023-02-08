from django.db import models
from django    import forms
from django.contrib     import admin
from django.http        import JsonResponse
from django.utils.html  import format_html
from django.urls        import reverse_lazy

from .models import Note, Tag
from .forms  import *

@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ('noteandtags', 'dialogedit', 'iframeedit', 'date', 'published')
    list_editable = ('published',)
    
    class Media:
        js = ["dialogform/js/script.js"]
        css = {"all": [
            "dialogform/css/style.css",
            "dialogform/demo/css/style.css"
        ]}
    fields = ('content', 'date', 'parents', 'published')
    search_fields = ('content',)
    autocomplete_fields = ('parents',)
    
    add_form_template = "admin/change_form.html"
    change_form_template = "dialogform/demo/admin_note_change.html"
    
    def change_view(self, request, object_id, form_url='', extra_context=None):
        response = super().change_view(request, object_id, form_url, extra_context)
        if request.method == 'POST' and response.status_code == 302:
            response = JsonResponse(
                {'url':response.url, 'status': response.status_code})
        # else return response as is
        return response

    # Provides a dialog/form popup
    @admin.display(description='Dialog')
    def dialogedit(self, note):
        url = reverse_lazy("note-edit-admin", args=(note.pk,))
        return format_html(
            '<div class="dialog-anchor"' +
            '  data-type="dialog"' + # also default if omitted
            f' data-url="{url}" title="{url}"><span>Dialog</span></div>')

    # Provides a dialog/iframe/form popup
    @admin.display
    def iframeedit(self, note):
        url = reverse_lazy("admin:demo_note_change", args=(note.pk,))
        return format_html(
            '<div class="dialog-anchor"' +
            '  data-type="iframe"' +
            f' data-url="{url}" title="{url}"><span>Iframe</span></div>')

    # Admin function that display the note content field annotated with any tags
    # and a popup tags dialog.  Not a standard Admin view, so demo.views/urls provide
    @admin.display
    def noteandtags(self, note):
        tags = note.tags.all()
        tags_html = ','.join([f'{tag.name}' for tag in tags])
        tags_html = f'<span>{tags_html}</span>' if tags \
            else '<img class="hide" src="/static/dialogform/demo/img/icon-tag.svg">'
        url = reverse_lazy("note-selecttags-admin", args=(note.pk,))
        return format_html(
            '<div class="noteandtags">' +
            f'{note.content}' +
            f'<sup><div class="dialog-anchor" data-url="{url}" title="{url}">{tags_html}' +
            '</div></sup></div>') 
 
@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    pass

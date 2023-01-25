from django.db import models
from django import forms
from django.contrib import admin
from .models import Note, Tag
from .forms  import *
from django.utils.html import format_html
from django.urls import reverse_lazy

@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ('pk', 'dialogedit', 'iframeedit', 'noteandtags', 'date', 'published')
    list_editable = ('published',)
    form = Note4AdminForm

    class Media:
        js = ["dialogform/js/script.js"]
        css = {"all": [
            "dialogform/css/style.css",
            "dialogform/demo/css/style.css"
        ]}

    # Provides a dialog/form popup
    @admin.display
    def dialogedit(self, note):
        return format_html(
            f'<div class="dialog-anchor"' +
            '  data-type="dialog"' + # also default if omitted
            ' data-url=' + reverse_lazy("admin-note-edit", kwargs={'pk':note.pk}) + '>' +
            '<span>Dialog</span></div>')

    # Provides a dialog/iframe/form popup
    @admin.display
    def iframeedit(self, note):
        return format_html(
            f'<div class="dialog-anchor"' +
            '  data-type="iframe"' +
            f' data-url=' + reverse_lazy("admin-note-iframe", kwargs={'pk':note.pk}) +  '>' +
            '<span>Iframe</span></div>')

    # Admin function that display the note content field annotated with any tags
    # and a popup tags dialog
    @admin.display
    def noteandtags(self, note):
        tags = note.tags.all()
        tags_html = ','.join([f'{tag.name}' for tag in tags])
        tags_html = f'<span>{tags_html}</span>' if tags \
            else '<img class="hide" src="/static/dialogform/demo/img/icon-tag.svg">'
        return format_html(
            '<div class="noteandtags">' +
              f'{note.content}' +
              '<sup><div class="dialog-anchor"' +
                 ' data-url=' + reverse_lazy("admin-note-selecttags", kwargs={'pk':note.pk}) + '>' +
                    f'{tags_html}'+
              '</div></sup></div>')

        
@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    pass

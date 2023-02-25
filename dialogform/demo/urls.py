from pathlib import Path
from django.contrib import admin
from django.urls import include, path, re_path
from django.views import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.i18n import JavaScriptCatalog

from .settings import BASE_DIR
from .views import Notes, NoteChange, NoteChangeIframe, NoteSelectTags

urlpatterns = [
    path('',                          Notes.as_view(),            name = 'notes'),
    path('note/<int:pk>/change/',     NoteChange.as_view(),       name = 'note-edit'),
    path('note/<int:pk>/iframe/',     NoteChangeIframe.as_view(), name = 'note-iframe'),
    path('note/<int:pk>/selecttags/', NoteSelectTags.as_view(),   name = 'note-selecttags'),

    # Urls for dialog-anchors in demo.admin.ModelAdmin notes listing
    path('note/<int:pk>/change-admin/',    NoteChange.as_view(),     {'admin':True},
                                                                  name = 'note-edit-admin'),
    path('note/<int:pk>/iframe-admin/',    NoteChangeIframe.as_view(),{'admin':True},
                                                                  name = 'note-iframe-admin'),
    path('note/<int:pk>/selecttags-admin/',NoteSelectTags.as_view(), {'admin':True},
                                                                  name = 'note-selecttags-admin'),

    re_path('.*admin/jsi18n/', JavaScriptCatalog.as_view(),            name = 'javascript-catalog'),
    path('admin/', admin.site.urls),
    re_path('^(?P<path>favicon.ico)$', static.serve, {'document_root': Path(BASE_DIR,'dialogform/static/dialogform/demo/img')}),

] + staticfiles_urlpatterns()


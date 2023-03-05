# This file is part of a program "django-dialogform", a django app to load and open form views
# within <dialog> html element popups.

# Copyright (C) 2023, Zoltan Kemenczy

# This program comes with ABSOLUTELY NO WARRANTY; This is free software, and you are welcome
# to redistribute it under conditions of the GPLv3 LICENSE included in this package
# To use it, refer to the included README.rst

from pathlib import Path
from django.contrib import admin
from django.urls import include, path, re_path
from django.views import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.i18n import JavaScriptCatalog

from .settings import BASE_DIR
from .views import Notes, NoteChange, NoteChangeIframe, NoteSelectTags

urlpatterns = [
    path('',                            Notes.as_view(),            name = 'notes'),
    path('note/<int:pk>/selecttags/',   NoteSelectTags.as_view(),   name = 'note-selecttags'),
    path('note/<int:pk>/change/',       NoteChange.as_view(),       name = 'note-change'),
    path('note/<int:pk>/iframe/',       NoteChangeIframe.as_view(), name = 'note-iframe'),
    path('note/<int:pk>/change-admin/', NoteChange.as_view(),       {'admin': False},
                                                                    name = 'note-change-admin'),
    path('note/<int:pk>/iframe-admin/', NoteChangeIframe.as_view(), {'admin': False},
                                                                    name = 'note-iframe-admin'),

    # Urls for dialog-anchors in demo.admin.ModelAdmin notes listing
    path('note/<int:pk>/selecttags-admin/',NoteSelectTags.as_view(),{'admin': True},
                                                                    name = 'admin-note-selecttags'),
    path('note/<int:pk>/admin-change/', NoteChange.as_view(),       {'admin': True},
                                                                    name = 'admin-note-change'),

    re_path('.*admin/jsi18n/', JavaScriptCatalog.as_view(),         name = 'javascript-catalog'),
    path('admin/', admin.site.urls),
    re_path('^(?P<path>favicon.ico)$', static.serve, {'document_root': Path(BASE_DIR,'dialogform/static/dialogform/demo/img')}),

] + staticfiles_urlpatterns()


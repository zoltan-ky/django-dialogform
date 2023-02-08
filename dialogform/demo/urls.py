from django.contrib import admin
from django.urls import include, path, reverse
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.i18n import JavaScriptCatalog

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

    path('admin/jsi18n/', JavaScriptCatalog.as_view(),            name = 'javascript-catalog'),
    path('admin/', admin.site.urls),

] + staticfiles_urlpatterns()


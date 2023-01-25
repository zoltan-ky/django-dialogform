from django.contrib import admin
from django.urls import include, path, reverse
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.i18n import JavaScriptCatalog
from .views import Notes, NoteChange, NoteChangeIframe, NoteSelectTags

urlpatterns = [
    # Override jsi18n from admin to avoid its url
    # `/admin/login/?next=/admin/jsi18n` that prevents
    # <script src="{% url 'admin:jsi18n' %}">... from loading.
    path('admin/jsi18n/', JavaScriptCatalog.as_view(), name='javascript-catalog'),
    
    path('admin/', admin.site.urls),
    path('',                          Notes.as_view(),            name = 'notes'),
    path('note/<int:pk>/change/',     NoteChange.as_view(),       name = 'note-edit'),
    path('note/<int:pk>/iframe/',     NoteChangeIframe.as_view(), name = 'note-iframe'),
    path('note/<int:pk>/selecttags/', NoteSelectTags.as_view(),   name = 'note-selecttags'),

    # Admin page dialog views produce forms with AdminSplitDateTimeWidgets just for fun
    path('admin_note/<int:pk>/change/',     NoteChange.as_view(),       {'admin':True}, name = 'admin-note-edit'),
    path('admin_note/<int:pk>/iframe/',     NoteChangeIframe.as_view(), {'admin':True}, name = 'admin-note-iframe'),
    path('admin_note/<int:pk>/selecttags/', NoteSelectTags.as_view(),   {'admin':True}, name = 'admin-note-selecttags'),
] + staticfiles_urlpatterns()


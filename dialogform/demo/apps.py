# This file is part of a program "django-dialogform", a django app to load and open form views
# within <dialog> html element popups.

# Copyright (C) 2023, Zoltan Kemenczy

# This program comes with ABSOLUTELY NO WARRANTY; This is free software, and you are welcome
# to redistribute it under conditions of the GPLv3 LICENSE included in this package
# To use it, refer to the included README.rst
from django.apps import AppConfig

class DialogdemoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'dialogform.demo'

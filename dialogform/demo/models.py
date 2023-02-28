# This file is part of a program "django-dialogform", a django app to load and open form views
# within <dialog> html element popups.

# Copyright (C) 2023, Zoltan Kemenczy

# This program comes with ABSOLUTELY NO WARRANTY; This is free software, and you are welcome
# to redistribute it under conditions of the GPLv3 LICENSE included in this package
# To use it, refer to the included README.rst

from django.db import models
from django.contrib import admin
from django.utils.html import format_html

class Note(models.Model):
    content = models.CharField(max_length=200) 
    date = models.DateTimeField('date written')
    published = models.BooleanField(default=False)
    parents = models.ManyToManyField('self', blank=True, symmetrical=False,
                                     related_name='children')
    def __str__(self): return f'Note({self.pk}): {self.content}'


class Tag(models.Model):
    name = models.CharField(max_length=32, unique=True)
    notes = models.ManyToManyField('Note', blank=True, related_name='tags')

    def __str__(self): return self.name

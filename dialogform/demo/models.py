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

# This file is part of a program "django-dialogform", a django app to load and open form views
# within <dialog> html element popups.

# Copyright (C) 2023, Zoltan Kemenczy

# This program comes with ABSOLUTELY NO WARRANTY; This is free software, and you are welcome
# to redistribute it under conditions of the GPLv3 LICENSE included in this package
# To use it, refer to the included README.rst

from django.test import TestCase, Client
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.utils import timezone
from django.db.models import QuerySet
from django.contrib.auth.models import User
from dialogform.demo.models import *
from django.conf import settings

from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager

def setUpDatabase(obj):
    # test database setup:
    note1 = Note.objects.create(pk=1, content="First Note", date = timezone.now(),
                                published=False)
    note1.parents.set([])
        
    note2 = Note.objects.create(pk=2, content="Second Note", date = timezone.now(),
                                published=False)
    note2.parents.set([note1])
    
    note3 = Note.objects.create(pk=3, content="Third Note", date = timezone.now(),
                                published=False)
    note3.parents.set([note1,note2])
    
    tag1 = Tag.objects.create(pk=1, name="one")
    tag1.notes.set([note1, note2])
    
    tag2 = Tag.objects.create(pk=2, name="two")
    tag2.notes.set([note2])

    dummy1 = Note.objects.count()
    dummy2 = Tag.objects.count()

class Basic(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.driver = Client()
        
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        setUpDatabase(cls)
        
    def test_note_and_tags_load(self):
        """Test notes and tags load correctly"""
        note1 = Note.objects.get(pk=1)
        note2 = Note.objects.get(pk=2)
        note3 = Note.objects.get(pk=3)
        self.assertEqual(set(note1.parents.all()), set())
        self.assertEqual(set(note2.parents.all()), set([note1]))
        self.assertEqual(set(note3.parents.all()), set([note1, note2]))
        tag1 = Tag.objects.get(pk=1)
        tag2 = Tag.objects.get(pk=2)
        self.assertEqual(set(note1.tags.all()), set([tag1]))
        self.assertEqual(set(note2.tags.all()), set([tag1,tag2]))

    def test_note_list(self):
        response = self.driver.get('/')
        self.assertEqual(response.context['note_list'].count(), 3)


class LiveServerTests:
    def setUp(self):
        setUpDatabase(self)
        
    def test_note_list(self):
        """Test note list loads"""
        self.driver.get(f'{self.live_server_url}/')
        anchors = self.driver.find_elements(By.CSS_SELECTOR, '.dialog-anchor')
        self.assertEqual(len(anchors), 4*3+3+1) # Notes, Tags, Search

    def test_note_anchor(self):
        '''dialog with django.forms.widgets'''
        self.driver.get(f'{self.live_server_url}/')
        self.driver.find_element(
            By.CSS_SELECTOR, '.dialog-anchor[data-url="/note/1/change/"]').click()
        self.driver.find_element(
            By.CSS_SELECTOR, 'form[method="dialog"] button[value="confirm"]').click()

    def test_note_anchor_iframe(self):
        '''dialog/iframe with django.forms.widgets'''
        self.driver.get(f'{self.live_server_url}/')
        self.driver.find_element(
            By.CSS_SELECTOR, '.dialog-anchor[data-url="/note/1/iframe/"]').click()
        iframe = self.driver.find_element(By.CSS_SELECTOR, 'dialog > iframe')
        self.driver.switch_to.frame(iframe)
        self.driver.find_element(
            By.CSS_SELECTOR, 'form[method="dialog"] button[value="confirm"]').click()

    def test_note_anchor_admin(self):
        '''dialog with admin widgets'''
        self.driver.get(f'{self.live_server_url}/')
        self.driver.find_element(
            By.CSS_SELECTOR, '.dialog-anchor[data-url="/note/1/change-admin/"]').click()
        self.driver.find_element(
            By.CSS_SELECTOR, 'form[method="dialog"] button[value="confirm"]').click()

    def test_note_anchor_iframe_admin(self):
        '''dialog/iframe with Admin widgets'''
        self.driver.get(f'{self.live_server_url}/')
        self.driver.find_element(
            By.CSS_SELECTOR, '.dialog-anchor[data-url="/note/1/iframe-admin/"]').click()
        iframe = self.driver.find_element(By.CSS_SELECTOR, 'dialog > iframe')
        self.driver.switch_to.frame(iframe)
        self.driver.find_element(
            By.CSS_SELECTOR, 'form[method="dialog"] button[value="confirm"]').click()

    def test_note_search_anchor(self):
        '''Local "search" dialog '''
        self.driver.get(f'{self.live_server_url}/')
        self.driver.find_element(
            By.CSS_SELECTOR, '.dialog-anchor[data-url="#local_note_dialog"]').click()
        self.driver.find_element(
            By.CSS_SELECTOR, 'form[method="dialog"] input#id_search').send_keys("First")
        self.driver.find_element(
            By.CSS_SELECTOR, 'form[method="dialog"] button[value="confirm"]').click()
        notes = self.driver.find_elements(
            By.CSS_SELECTOR, 'div.noteandtags > div.dialog-anchor')
        self.assertEqual(len(notes), 1)

    def test_note_search_cancel(self):
        '''Local "search" dialog '''
        self.driver.get(f'{self.live_server_url}/')
        self.driver.find_element(
            By.CSS_SELECTOR, '.dialog-anchor[data-url="#local_note_dialog"]').click()
        self.driver.find_element(
            By.CSS_SELECTOR, 'form[method="dialog"] input#id_search').click()
        self.driver.find_element(
            By.CSS_SELECTOR, 'form[method="dialog"] button[value="cancel"]').click()
        notes = self.driver.find_elements(
            By.CSS_SELECTOR, 'div.noteandtags > div.dialog-anchor')
        self.assertEqual(len(notes), 3)
        WebDriverWait(self.driver, timeout=5).until(
            expected_conditions.none_of(
                expected_conditions.url_matches(r'http.*/?.*=')),
            f"Url:{self.driver.current_url} - query should be empty after search query cancel!")

    def admin_login(self):
        User.objects.create_superuser(username="admin", email=None, password="admin")
        self.driver.get(f'{self.live_server_url}/admin/demo/note/')
        username = self.driver.find_element(By.NAME, "username")
        if username:
            username.send_keys('admin')
            self.driver.find_element(By.NAME, "password").send_keys('admin')
            self.driver.find_element(
                By.CSS_SELECTOR, 'input[type="submit"]').click()
        self.driver.find_element(By.CSS_SELECTOR, 'th[class="column-noteandtags"]')
        
    def test_note_admin_change_form(self):
        '''Test admin view dialog/iframe'''
        self.admin_login()
        self.driver.find_element(
            By.CSS_SELECTOR, '.dialog-anchor[data-url="/admin/demo/note/1/change/"]').click()
        iframe = self.driver.find_element(By.CSS_SELECTOR, 'dialog > iframe')
        self.driver.switch_to.frame(iframe)
        self.driver.find_element(
            By.CSS_SELECTOR,'form[method="dialog"] button[value="confirm"]').click()

    def test_note_admin_non_view(self):
        ''' Test non-admin view dialog within admin'''
        self.admin_login()
        self.driver.find_element(
            By.CSS_SELECTOR, '.dialog-anchor[data-url="/note/1/change-admin/"]').click()
        self.driver.find_element(
            By.CSS_SELECTOR,'form[method="dialog"] button[value="confirm"]').click()


class Chrome(LiveServerTests, StaticLiveServerTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()))
        cls.driver.implicitly_wait(10)

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()     # Leave during test development
        super().tearDownClass()


class Firefox(LiveServerTests, StaticLiveServerTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.driver = webdriver.Firefox(service=FirefoxService(GeckoDriverManager().install()))
        cls.driver.implicitly_wait(10)

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()     # Leave during test development
        super().tearDownClass()

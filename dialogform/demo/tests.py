# This file is part of a program "django-dialogform", a django app to load and open form views
# within <dialog> html element popups.

# Copyright (C) 2023, Zoltan Kemenczy

# This program comes with ABSOLUTELY NO WARRANTY; This is free software, and you are welcome
# to redistribute it under conditions of the GPLv3 LICENSE included in this package
# To use it, refer to the included README.rst

import os
from django.test import TestCase, Client
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.utils import timezone
from django.db.models import QuerySet
from django.contrib.auth.models import User
from dialogform.demo.models import *
from django.conf import settings
from unittest import skipIf

# Browser tests need testing_requirements; Basic tests run without them
try:
    from selenium import webdriver
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.common.by import By
    from selenium.webdriver.chrome.service import Service as ChromeService
    from selenium.webdriver.chrome.options import Options as ChromeOptions
    from selenium.webdriver.firefox.service import Service as FirefoxService
    from selenium.webdriver.firefox.options import Options as FirefoxOptions
    from selenium.webdriver.support.wait import WebDriverWait
    from selenium.webdriver.support import expected_conditions as condition
    from selenium.webdriver.support.relative_locator import locate_with
    from webdriver_manager.chrome import ChromeDriverManager
    from webdriver_manager.firefox import GeckoDriverManager
except ImportError:
    webdriver = None

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
        self.check_note_list_view(n_anchors=9) # admin note list page has 2*3(note) + 3(tag) anchors
        
    def check_note_list_view(self, n_anchors = 16):
        # Default note_list page anchors = 4*3(tag)+3(tag)+1(search)
        anchors = self.driver.find_elements(By.CSS_SELECTOR, '.dialog-anchor')
        self.assertEqual(len(anchors), n_anchors) 
   
    def open_dialog(self, selector):
        self.driver.find_element(By.CSS_SELECTOR, selector).click()
        self.dialog_container = self.driver.find_element(By.CSS_SELECTOR, 'div > dialog')

    def wait_until_still(self, element):
        # until a (resizing, being placed) element stops moving
        last = [None]
        def still(driver):
            rect, last[0] = last[0], element.rect
            return rect == last[0]
        WebDriverWait(self.driver, timeout=3, poll_frequency=0.2).until(still)

    def close_dialog(self, value, iframe=None):
        selector = f'form[method="dialog"] button[value="{value}"]'
        if iframe:
            self.driver.switch_to.frame(iframe)
            self.driver.find_element(By.CSS_SELECTOR, selector) # dialog is ready
            self.driver.switch_to.default_content()
            self.wait_until_still(iframe)
            self.driver.switch_to.frame(iframe)
        button = self.driver.find_element(By.CSS_SELECTOR, selector)
        self.wait_until_still(button)
        # A dialog taller than the window scrolls; webdriver does not scroll
        # within it to an element in an iframe by itself
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'nearest'})", button)
        button.click()
        if iframe: self.driver.switch_to.default_content();
        WebDriverWait(self.driver, timeout=3).until(
            condition.any_of(
                condition.staleness_of(self.dialog_container),
                condition.invisibility_of_element(self.dialog_container)))

    # Tests:
    # ------
    def test_note_list(self):
        """Test note list loads"""
        self.driver.get(f'{self.live_server_url}/')
        self.check_note_list_view()
        
    def test_note_anchor(self):
        '''dialog with django.forms.widgets'''
        self.driver.get(f'{self.live_server_url}/')
        self.open_dialog('.dialog-anchor[data-url="/note/1/change/"]')
        self.close_dialog('confirm')
        self.check_note_list_view()

    def test_note_anchor_iframe(self):
        '''dialog/iframe with django.forms.widgets'''
        self.driver.get(f'{self.live_server_url}/')
        self.open_dialog('.dialog-anchor[data-url="/note/1/iframe/"]')
        iframe = self.driver.find_element(By.CSS_SELECTOR, 'dialog > iframe')
        self.close_dialog('confirm', iframe)
        self.check_note_list_view()

    def test_note_anchor_admin(self):
        '''dialog with admin widgets'''
        self.driver.get(f'{self.live_server_url}/')
        self.open_dialog('.dialog-anchor[data-url="/note/1/change-admin/"]') 
        # make sure 'artefact is there prior to closing
        box = self.driver.find_element(By.CSS_SELECTOR, '#calendarbox0')
        self.close_dialog('confirm')
        self.check_note_list_view()
        # make sure artefact "box" above is gone (cleaned by demo/js/admin_cleanup.js)
        WebDriverWait(self.driver, timeout=5).until(condition.staleness_of(box))

    def test_note_anchor_iframe_admin(self):
        '''dialog/iframe with Admin widgets'''
        self.driver.get(f'{self.live_server_url}/')
        self.open_dialog('.dialog-anchor[data-url="/note/1/iframe-admin/"]')
        iframe = self.driver.find_element(By.CSS_SELECTOR, 'dialog > iframe')
        self.close_dialog('confirm', iframe)
        self.check_note_list_view()

    def test_note_search_anchor(self):
        '''Local "search" dialog '''
        self.driver.get(f'{self.live_server_url}/')
        self.open_dialog('.dialog-anchor[data-url="#local_note_dialog"]')
        self.driver.find_element(
            By.CSS_SELECTOR, 'form[method="dialog"] input#id_search').send_keys("First")
        self.close_dialog('confirm')
        self.check_note_list_view(n_anchors=4+1+1)

    def test_note_search_cancel(self):
        '''Local "search" dialog '''
        self.driver.get(f'{self.live_server_url}/')
        self.open_dialog('.dialog-anchor[data-url="#local_note_dialog"]')
        self.driver.find_element(
            By.CSS_SELECTOR, 'form[method="dialog"] input#id_search').click()
        self.close_dialog('cancel')
        notes = self.driver.find_elements(By.CSS_SELECTOR, 'div.noteandtags > div.dialog-anchor')
        self.assertEqual(len(notes), 3)
        WebDriverWait(self.driver, timeout=5).until(
            condition.none_of(condition.url_matches(r'http.*/?.*=')),
            f"Url:{self.driver.current_url} - query should be empty after search query cancel!")
        self.check_note_list_view()

    def add_event_listener_is_native(self):
        return self.driver.execute_script(
            "return EventTarget.prototype.addEventListener.toString().includes('[native code]')")

    def test_listener_hook_removed(self):
        '''addEventListener is restored after a dialog closes'''
        self.driver.get(f'{self.live_server_url}/')
        self.open_dialog('.dialog-anchor[data-url="/note/1/change/"]')
        self.assertFalse(self.add_event_listener_is_native())
        self.close_dialog('cancel')
        self.assertTrue(self.add_event_listener_is_native())

    def test_listener_hook_removed_after_error(self):
        '''A dialog that fails to open restores addEventListener;
        anchors added after the page loaded work'''
        self.driver.get(f'{self.live_server_url}/')
        self.driver.execute_script("""
            const a = document.createElement('div');
            a.className = 'dialog-anchor';
            a.id = 'added-anchor';
            a.dataset.url = '/no-such-dialog/';
            a.textContent = 'added';
            document.body.prepend(a);""")
        self.driver.find_element(By.ID, 'added-anchor').click()
        alert = WebDriverWait(self.driver, timeout=3).until(condition.alert_is_present())
        self.assertIn('/no-such-dialog/', alert.text)
        alert.accept()
        WebDriverWait(self.driver, timeout=3).until(
            lambda driver: self.add_event_listener_is_native())

    def test_note_admin_change_form(self):
        '''Test admin view dialog/iframe'''
        self.admin_login()
        self.open_dialog('.dialog-anchor[data-url="/admin/demo/note/1/change/"]')
        iframe = self.driver.find_element(By.CSS_SELECTOR, 'dialog > iframe')
        self.close_dialog('confirm', iframe)
        self.check_note_list_view(n_anchors=9)
        

    def test_note_admin_non_view(self):
        ''' Test non-admin view dialog within admin'''
        self.admin_login()
        self.open_dialog('.dialog-anchor[data-url="/note/1/admin-change/"]')
        box = self.driver.find_element(By.CSS_SELECTOR, '#calendarbox0')
        self.close_dialog('confirm')
        self.check_note_list_view(n_anchors=9)
        # make sure artefact "box" above is gone (cleaned by demo/js/admin_cleanup.js)
        WebDriverWait(self.driver, timeout=5).until(condition.staleness_of(box))


@skipIf(webdriver is None, "selenium (testing_requirements) not installed")
class Chrome(LiveServerTests, StaticLiveServerTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        options = ChromeOptions()
        # options.add_experimental_option("detach", True)
        if os.environ.get("CI"):        # e.g. GitHub Actions: no display
            options.add_argument("--headless=new")
            options.add_argument("--window-size=1920,1080")
        cls.driver = webdriver.Chrome(
            service=ChromeService(ChromeDriverManager().install()),
            options=options,
        )
        cls.driver.implicitly_wait(10)

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()     # Leave during test development
        super().tearDownClass()


@skipIf(webdriver is None, "selenium (testing_requirements) not installed")
class Firefox(LiveServerTests, StaticLiveServerTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        options = FirefoxOptions()
        if os.environ.get("CI"):        # e.g. GitHub Actions: no display
            options.add_argument("-headless")
            options.add_argument("--width=1920")
            options.add_argument("--height=1080")
        cls.driver = webdriver.Firefox(
            service=FirefoxService(GeckoDriverManager().install()),
            options=options,
        )
        cls.driver.implicitly_wait(10)

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()     # Leave during test development
        super().tearDownClass()

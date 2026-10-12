"""Launch the release APK on a disposable CI emulator and check native settings loading."""
import json
import os
import uuid
import urllib.error
import urllib.parse
import urllib.request
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE = 'tech.shreeswayam.sangam'


def adb(*args):
    return subprocess.check_output(['adb', *args], text=True, timeout=30, stderr=subprocess.STDOUT)


def launch(apk, version=None):
    adb('install', '-r', apk)
    adb('shell', 'pm', 'clear', PACKAGE)
    adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
    output = adb('shell', 'wm', 'size')
    width, height = map(int, re.search(r'(\d+)x(\d+)', output).groups())
    deadline = time.monotonic() + 90
    saw_login = False
    while time.monotonic() < deadline:
        try:
            adb('shell', 'uiautomator', 'dump', '/sdcard/sangam-startup.xml')
            xml = adb('shell', 'cat', '/sdcard/sangam-startup.xml')
            root = ET.fromstring(xml)
            text = ' '.join(n.attrib.get('text', '') + ' ' + n.attrib.get('content-desc', '') for n in root.iter('node'))
            if any(message in text for message in ('sign-in is temporarily unavailable', 'settings could not be loaded', 'latest Sangam update')):
                if not version:
                    print('Previous APK reproduced the account-configuration startup error.')
                    return False
                raise RuntimeError('Updated APK could not load native account settings')
            saw_login = saw_login or 'Welcome back' in text or 'Create your account' in text
            if saw_login and (not version or 'Version ' + version in text):
                print(('Updated' if version else 'Previous') + ' APK reached the login screen with no configuration error.')
                if version: print('Android native configuration response and installed version verified: ' + version)
                return True
            if saw_login and version:
                adb('shell', 'input', 'swipe', str(width // 2), str(int(height * .8)), str(width // 2), str(int(height * .25)), '500')
        except ET.ParseError:
            pass
        time.sleep(2)
    if not version:
        print('Previous APK startup result was inconclusive on the emulator.')
        return False
    raise RuntimeError('Updated APK did not show its native version on the account screen')


def screen():
    adb('shell', 'uiautomator', 'dump', '/sdcard/sangam-startup.xml')
    return ET.fromstring(adb('shell', 'cat', '/sdcard/sangam-startup.xml'))


def visible_label(root, label, editor=False):
    for node in root.iter('node'):
        if editor and not node.attrib.get('class', '').endswith('EditText'):
            continue
        if label in (node.attrib.get('text', ''), node.attrib.get('content-desc', '')):
            bounds = list(map(int, re.findall(r'\d+', node.attrib.get('bounds', ''))))
            if len(bounds) == 4 and bounds[2] > bounds[0] and bounds[3] > bounds[1]:
                return bounds
    return None


def interact(label, value=None):
    width, height = map(int, re.search(r'(\d+)x(\d+)', adb('shell', 'wm', 'size')).groups())
    for attempt in range(15):
        root = screen()
        bounds = visible_label(root, label, editor=value is not None)
        if bounds:
            adb('shell', 'input', 'tap', str((bounds[0] + bounds[2]) // 2), str((bounds[1] + bounds[3]) // 2))
            if value is not None:
                # Generated test credentials only; never print them or the UI XML.
                adb('shell', 'input', 'text', value)
                adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
            time.sleep(1)
            return
        if attempt < 3:
            adb('shell', 'input', 'swipe', str(width // 2), str(int(height * .25)), str(width // 2), str(int(height * .8)), '400')
        else:
            adb('shell', 'input', 'swipe', str(width // 2), str(int(height * .8)), str(width // 2), str(int(height * .25)), '400')
        time.sleep(1)
    raise RuntimeError('Account test could not locate the ' + label + ' control')


def wait_for_registration():
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        root = screen()
        text = ' '.join(n.attrib.get('text', '') + ' ' + n.attrib.get('content-desc', '') for n in root.iter('node'))
        if 'Family Registration Portal' in text and 'Sign out' in text:
            return
        if any(message in text for message in ('settings could not be loaded', 'temporarily unavailable', 'Could not securely', 'could not be saved')):
            raise RuntimeError('The Android account flow failed before family registration opened')
        time.sleep(2)
    raise RuntimeError('The Android account flow did not open family registration')


def cleanup_account(email, password):
    query = urllib.parse.urlencode({'key': os.environ['GOOGLE_CLOUD_API_KEY']})
    base = 'https://identitytoolkit.googleapis.com/v1/accounts:'
    def request(action, body):
        req = urllib.request.Request(base + action + '?' + query, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'}, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as error:
            return error.code, json.load(error)
    status, account = request('signInWithPassword', {'email': email, 'password': password, 'returnSecureToken': True})
    if status == 400 and account.get('error', {}).get('message') in ('EMAIL_NOT_FOUND', 'INVALID_LOGIN_CREDENTIALS'):
        print('No temporary account remains after the Android test.')
        return
    if status != 200 or not account.get('idToken'):
        raise RuntimeError('Could not retrieve the temporary test account for cleanup')
    status, _ = request('delete', {'idToken': account['idToken']})
    if status != 200:
        raise RuntimeError('Could not remove the temporary Android test account')
    print('Temporary Android verification account removed successfully.')


def verify_registration():
    email = 'android-verification-' + uuid.uuid4().hex + '@example.invalid'
    password = 'Aa1!' + uuid.uuid4().hex
    try:
        interact('Register')
        interact('Email address', email)
        interact('Password', password)
        interact('Confirm password', password)
        interact('Create account')
        wait_for_registration()
        print('Actual release APK registration and encrypted session save passed on Android.')
        adb('shell', 'am', 'force-stop', PACKAGE)
        adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
        wait_for_registration()
        print('Actual release APK restored its account and reopened registration after restart.')
    finally:
        cleanup_account(email, password)
        adb('shell', 'pm', 'clear', PACKAGE)


if __name__ == '__main__':
    if len(sys.argv) == 4:
        if Path(sys.argv[1]).exists():
            launch(sys.argv[1])
        else:
            print('Previous APK comparison skipped; baseline artifact is unavailable.')
        launch(sys.argv[2], sys.argv[3])
        verify_registration()
    else:
        launch(sys.argv[1], sys.argv[2])
        verify_registration()

"""Launch the release APK on a disposable CI emulator and check native settings loading."""
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


if __name__ == '__main__':
    if len(sys.argv) == 4:
        if Path(sys.argv[1]).exists():
            launch(sys.argv[1])
        else:
            print('Previous APK comparison skipped; baseline artifact is unavailable.')
        launch(sys.argv[2], sys.argv[3])
    else:
        launch(sys.argv[1], sys.argv[2])

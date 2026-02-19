import json
import urllib.request
import urllib.error
import traceback

url = 'http://127.0.0.1:8000/users/'
payload = {"username": "test_frontend_user", "age_group": "7-8", "hearing_level": "normal"}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')

try:
    with urllib.request.urlopen(req, timeout=5) as resp:
        body = resp.read().decode('utf-8')
        print('STATUS:', resp.status)
        print('RESPONSE:', body)
except urllib.error.HTTPError as e:
    print('HTTPError:', e.code)
    try:
        print(e.read().decode('utf-8'))
    except Exception:
        pass
    traceback.print_exc()
except Exception as e:
    print('Error:', str(e))
    traceback.print_exc()

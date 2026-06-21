import urllib.request
req = urllib.request.Request(
    'https://www.pythonanywhere.com/api/v0/user/roashcorp/webapps/roashcorp.pythonanywhere.com/reload/',
    method='POST',
    headers={'Authorization': 'Token 237150fcada1cb466dd01689475bf044fbf4f75a'}
)
try:
    with urllib.request.urlopen(req) as response:
        print('Reload success:', response.status)
except Exception as e:
    print('Reload failed:', e)

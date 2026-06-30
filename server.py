#!/usr/bin/env python3
"""
Local dev server for the Gainsight CC demo.
Serves static files + proxies community API writes server-side
so CORS doesn't block the reply POST from the browser.
"""
import http.server, urllib.request, urllib.error, json, base64, os, sys

PORT      = 8765
API_BASE  = 'https://api2-us-west-2.insided.com'
CLIENT_ID = 'e589e037-8e98-4472-887a-8bb9fbf34bca'
CLIENT_SECRET = 'e5747200f2e241222aab33276c2235c893258e93fb4664607d6796fc3d119af5'
CONV_ID   = '2'

def get_token():
    basic = base64.b64encode(f'{CLIENT_ID}:{CLIENT_SECRET}'.encode()).decode()
    req = urllib.request.Request(
        f'{API_BASE}/oauth2/token',
        data=b'grant_type=client_credentials&scope=write',
        headers={'Authorization': f'Basic {basic}',
                 'Content-Type': 'application/x-www-form-urlencoded'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())['access_token']

class Handler(http.server.SimpleHTTPRequestHandler):

    def do_OPTIONS(self):
        self._cors(200)

    def do_POST(self):
        if self.path == '/proxy/reply':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length)
                token = get_token()
                req = urllib.request.Request(
                    f'{API_BASE}/v2/conversations/{CONV_ID}/replies',
                    data=body,
                    headers={'Authorization': f'Bearer {token}',
                             'Content-Type': 'application/json',
                             'Accept': 'application/json'},
                    method='POST'
                )
                with urllib.request.urlopen(req, timeout=10) as r:
                    resp_body = r.read()
                self._cors(200, 'application/json')
                self.wfile.write(resp_body)
            except urllib.error.HTTPError as e:
                err = e.read()
                self._cors(e.code, 'application/json')
                self.wfile.write(err)
            except Exception as e:
                self._cors(500, 'application/json')
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            self.send_error(404)

    def _cors(self, code, content_type=None):
        self.send_response(code)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        if content_type:
            self.send_header('Content-Type', content_type)
        self.end_headers()

    def log_message(self, fmt, *args):
        print(f'  {args[0]} {args[1]}')

os.chdir(os.path.dirname(os.path.abspath(__file__)))
print(f'Demo server → http://localhost:{PORT}/article-comments-live.html')
http.server.HTTPServer(('', PORT), Handler).serve_forever()

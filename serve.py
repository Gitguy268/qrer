#!/usr/bin/env python3
# Copyright (c) 2026 Lucas Van De Weerd. MIT.
"""Static localhost server with Qrer's original 404 page, including subdirectories."""
import argparse
import html
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

class Handler(SimpleHTTPRequestHandler):
    def send_error(self, code, message=None, explain=None):
        if code == 404:
            root = Path(self.directory).resolve()
            target = (root / unquote(urlsplit(self.path).path).lstrip('/')).resolve()
            if target.is_relative_to(root):
                for parent in [target.parent, *target.parent.parents]:
                    if not parent.is_relative_to(root):
                        break
                    page = parent / '404.html'
                    if page.is_file():
                        home = '/' + parent.relative_to(root).as_posix().strip('.')
                        home = home.rstrip('/') + '/'
                        data = page.read_text().replace('href="./" id="homeLink"', f'href="{html.escape(home, quote=True)}" id="homeLink"').encode()
                        self.send_response(404)
                        self.send_header('Content-Type', 'text/html; charset=utf-8')
                        self.send_header('Content-Length', str(len(data)))
                        self.end_headers()
                        if self.command != 'HEAD':
                            self.wfile.write(data)
                        return
        super().send_error(code, message, explain)

if __name__ == '__main__':
    from functools import partial
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=4317)
    parser.add_argument('--bind', default='127.0.0.1')
    parser.add_argument('--directory', default='.')
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.bind, args.port), partial(Handler, directory=args.directory))
    print(f'Qrer: http://{args.bind}:{server.server_port}/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

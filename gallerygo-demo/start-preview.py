"""Static files only: no AI backend, upload endpoint or third-party dependency."""
import argparse
import functools
import http.server
import pathlib
import socket
import webbrowser

parser = argparse.ArgumentParser(description="Open the static GalleryGo demo")
parser.add_argument("--host", default="0.0.0.0")
parser.add_argument("--port", default=8787, type=int)
parser.add_argument("--no-browser", action="store_true")
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parent
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
try:
    server = http.server.ThreadingHTTPServer((args.host, args.port), handler)
except OSError as error:
    raise SystemExit(f"Cannot use port {args.port}: {error}. Try --port 8788.")
url = f"http://127.0.0.1:{server.server_port}/"
print(f"GalleryGo: {url}", flush=True)
if args.host == "0.0.0.0":
    try:
        addresses = sorted(set(socket.gethostbyname_ex(socket.gethostname())[2]))
        for address in addresses:
            if not address.startswith("127."):
                print(f"Phone on the same network: http://{address}:{server.server_port}/", flush=True)
    except OSError:
        pass
print("Keep this process running. Ctrl+C stops preview. No files are uploaded.", flush=True)
if not args.no_browser:
    webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()

"""
Sirve la carpeta dist/ (build de Vite) con Flask — mismo patrón SPA que server.js.
Uso: npm run build && ./run
"""
import os
import sys

from flask import Flask, send_from_directory

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "dist")

app = Flask(__name__)


@app.route("/")
def index():
    if not os.path.isdir(DIST):
        return (
            "<p>No existe <code>dist/</code>. Ejecuta antes: <code>npm run build</code></p>",
            503,
        )
    return send_from_directory(DIST, "index.html")


@app.route("/<path:path>")
def static_or_spa(path):
    if not os.path.isdir(DIST):
        return (
            "<p>No existe <code>dist/</code>. Ejecuta antes: <code>npm run build</code></p>",
            503,
        )
    candidate = os.path.join(DIST, path)
    if os.path.isfile(candidate):
        return send_from_directory(DIST, path)
    return send_from_directory(DIST, "index.html")


def main():
    port = int(os.environ.get("PORT", "5000"))
    if not os.path.isdir(DIST):
        print("Aviso: dist/ no existe. Ejecuta: npm run build", file=sys.stderr)
    print(f"Flask → http://127.0.0.1:{port}/  (dist={DIST})")
    app.run(host="127.0.0.1", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")


if __name__ == "__main__":
    main()

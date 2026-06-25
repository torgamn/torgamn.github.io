import http.server
import socketserver
import mimetypes

# Define a porta
PORT = 8000

# Garante que os tipos MIME estejam corretos
mimetypes.init()
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('text/css', '.css')

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Evita cache durante o desenvolvimento
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

# Atualiza o mapa de extensões do Handler
Handler = CustomHandler
Handler.extensions_map.update({
    '.js': 'application/javascript',
    '.json': 'application/json',
})

print(f"Servidor rodando em http://localhost:{PORT}")
print("Pressione Ctrl+C para parar.")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass

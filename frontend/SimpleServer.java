import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.io.OutputStream;

public class SimpleServer {
    public static void main(String[] args) throws Exception {
        int port = 80;
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/", exchange -> {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/")) path = "/index.html";
            Path file = Path.of("." + path);
            try {
                if (Files.exists(file) && !Files.isDirectory(file)) {
                    String contentType = "text/plain";
                    if (path.endsWith(".html")) contentType = "text/html";
                    else if (path.endsWith(".css")) contentType = "text/css";
                    else if (path.endsWith(".js")) contentType = "application/javascript";
                    else if (path.endsWith(".png")) contentType = "image/png";
                    
                    exchange.getResponseHeaders().set("Content-Type", contentType);
                    exchange.sendResponseHeaders(200, Files.size(file));
                    try (OutputStream os = exchange.getResponseBody()) {
                        Files.copy(file, os);
                    }
                } else {
                    String response = "404 Not Found";
                    exchange.sendResponseHeaders(404, response.length());
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(response.getBytes());
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
        server.setExecutor(null);
        server.start();
        System.out.println("Server started on http://localhost:" + port);
    }
}

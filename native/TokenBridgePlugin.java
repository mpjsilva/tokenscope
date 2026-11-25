package com.tokenscope.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.view.Window;
import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Enumeration;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Ponte nativa do TokenScope:
 *  - request(): HTTP direto (sem CORS) para consultar APIs de uso.
 *  - startProxy()/stopProxy(): servidor HTTP local que repassa chamadas
 *    OpenAI-compatible e contabiliza tokens do campo "usage" da resposta.
 *  - getStats()/clearStats(): contadores persistidos em SharedPreferences.
 */
@CapacitorPlugin(name = "TokenBridge")
public class TokenBridgePlugin extends Plugin {
    private static final String TAG = "TokenBridge";
    private static final String PREFS = "tokenscope_proxy";
    private static final String CORS =
            "Access-Control-Allow-Origin: *\r\n" +
            "Access-Control-Allow-Headers: *\r\n" +
            "Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS\r\n";

    private final ExecutorService pool = Executors.newCachedThreadPool();
    private final Map<String, ProxyRule> proxies = new ConcurrentHashMap<>();
    private final Object statsLock = new Object();

    static class ProxyRule {
        String id, upstream, apiKey;
        int port;
        ServerSocket server;
        Thread thread;
        ProxyRule(String id, int port, String upstream, String apiKey) {
            this.id = id; this.port = port; this.upstream = upstream; this.apiKey = apiKey;
        }
    }

    /* ------------------------------- request ------------------------------ */
    @PluginMethod
    public void request(PluginCall call) {
        final String url = call.getString("url");
        final String method = call.getString("method", "GET");
        final JSObject headers = call.getObject("headers");
        final String body = call.getString("body");
        final int timeout = call.getInt("timeout", 25000);
        if (url == null) { call.reject("URL não informada."); return; }

        pool.execute(() -> {
            HttpURLConnection conn = null;
            try {
                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setRequestMethod(method.toUpperCase(Locale.ROOT));
                conn.setConnectTimeout(timeout);
                conn.setReadTimeout(timeout);
                conn.setInstanceFollowRedirects(true);
                if (headers != null) {
                    Iterator<String> it = headers.keys();
                    while (it.hasNext()) {
                        String k = it.next();
                        conn.setRequestProperty(k, headers.optString(k, ""));
                    }
                }
                if (body != null) {
                    conn.setDoOutput(true);
                    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                    conn.setRequestProperty("Content-Length", String.valueOf(bytes.length));
                    try (OutputStream os = conn.getOutputStream()) { os.write(bytes); }
                }
                int status = conn.getResponseCode();
                InputStream in = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
                String text = in == null ? "" : new String(readAll(in), StandardCharsets.UTF_8);
                JSObject ret = new JSObject();
                ret.put("status", status);
                ret.put("body", text);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("request falhou: " + e.getMessage());
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }

    /* ------------------------------- proxy -------------------------------- */
    @PluginMethod
    public void startProxy(PluginCall call) {
        String id = call.getString("id");
        int port = call.getInt("port", 8080);
        String upstream = call.getString("upstream");
        String key = call.getString("apiKey", "");
        if (id == null || upstream == null || upstream.isEmpty()) {
            call.reject("id e upstream são obrigatórios."); return;
        }
        stopRule(id);
        try {
            ServerSocket server = new ServerSocket();
            server.setReuseAddress(true);
            server.bind(new InetSocketAddress("0.0.0.0", port));
            ProxyRule rule = new ProxyRule(id, port, upstream.replaceAll("/+$", ""), key);
            rule.server = server;
            proxies.put(id, rule);
            rule.thread = new Thread(() -> acceptLoop(rule), "tokenscope-proxy-" + id);
            rule.thread.start();
            JSObject ret = new JSObject();
            ret.put("id", id); ret.put("port", port);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Não foi possível iniciar o proxy na porta " + port + ": " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopProxy(PluginCall call) {
        String id = call.getString("id");
        if (id == null) { call.reject("id não informado."); return; }
        stopRule(id);
        call.resolve(new JSObject().put("stopped", true));
    }

    @PluginMethod
    public void getStats(PluginCall call) {
        JSObject running = new JSObject();
        JSObject stats = new JSObject();
        for (String id : proxies.keySet()) {
            running.put(id, true);
            stats.put(id, parseStats(readStats(id)));
        }
        JSObject ret = new JSObject();
        ret.put("running", running);
        ret.put("stats", stats);
        ret.put("localIp", localIp());
        call.resolve(ret);
    }

    @PluginMethod
    public void clearStats(PluginCall call) {
        String id = call.getString("id");
        if (id == null) { call.reject("id não informado."); return; }
        synchronized (statsLock) {
            prefs().edit().remove("stats_" + id).apply();
        }
        call.resolve(new JSObject().put("cleared", true));
    }

    @PluginMethod
    public void getLocalIp(PluginCall call) {
        call.resolve(new JSObject().put("ip", localIp()));
    }

    /** Mantem a tela ligada no modo AMOLED (evita o bloqueio automatico). */
    @PluginMethod
    public void keepAwake(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", true);
        getBridge().getActivity().runOnUiThread(() -> {
            Window w = getBridge().getActivity().getWindow();
            if (enabled) w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else w.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });
        call.resolve(new JSObject().put("enabled", enabled));
    }

    /** Ajusta o brilho: 0..1, ou -1 para voltar ao padrao do sistema. */
    @PluginMethod
    public void setBrightness(PluginCall call) {
        float value = call.getFloat("value", -1f);
        getBridge().getActivity().runOnUiThread(() -> {
            Window w = getBridge().getActivity().getWindow();
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.screenBrightness = value;
            w.setAttributes(lp);
        });
        call.resolve(new JSObject().put("value", value));
    }

    private void stopRule(String id) {
        ProxyRule rule = proxies.remove(id);
        if (rule != null && rule.server != null) {
            try { rule.server.close(); } catch (IOException ignored) {}
            if (rule.thread != null) rule.thread.interrupt();
        }
    }

    private void acceptLoop(ProxyRule rule) {
        while (!rule.server.isClosed()) {
            try {
                Socket client = rule.server.accept();
                pool.execute(() -> handle(client, rule));
            } catch (Exception e) {
                if (!rule.server.isClosed()) Log.w(TAG, "accept: " + e.getMessage());
            }
        }
    }

    private void handle(Socket client, ProxyRule rule) {
        HttpURLConnection conn = null;
        try {
            client.setSoTimeout(30000);
            InputStream in = client.getInputStream();
            String head = readHeaderBlock(in);
            if (head.isEmpty()) return;
            String[] lines = head.split("\r\n");
            String[] first = lines[0].split(" ");
            if (first.length < 2) return;
            String method = first[0], path = first[1];
            Map<String, String> headers = new LinkedHashMap<>();
            for (int i = 1; i < lines.length; i++) {
                int c = lines[i].indexOf(':');
                if (c > 0) headers.put(lines[i].substring(0, c).trim().toLowerCase(Locale.ROOT),
                                       lines[i].substring(c + 1).trim());
            }
            int len = 0;
            try { len = Integer.parseInt(headers.getOrDefault("content-length", "0")); } catch (Exception ignored) {}
            String reqBody = len > 0 ? new String(readFully(in, len), StandardCharsets.UTF_8) : "";

            if ("OPTIONS".equalsIgnoreCase(method)) {
                send(client, 204, "", "text/plain");
                return;
            }

            String target = joinUrl(rule.upstream, path);
            conn = (HttpURLConnection) new URL(target).openConnection();
            conn.setRequestMethod(method.toUpperCase(Locale.ROOT));
            conn.setConnectTimeout(30000);
            conn.setReadTimeout(120000);
            conn.setInstanceFollowRedirects(false);
            for (Map.Entry<String, String> h : headers.entrySet()) {
                String k = h.getKey();
                if (k.equals("host") || k.equals("content-length") || k.equals("connection") ||
                    k.equals("transfer-encoding") || k.equals("accept-encoding") || k.equals("upgrade") ||
                    k.equals("proxy-authorization")) continue;
                conn.setRequestProperty(k, h.getValue());
            }
            if (rule.apiKey != null && !rule.apiKey.isEmpty() && !headers.containsKey("authorization")) {
                conn.setRequestProperty("Authorization", "Bearer " + rule.apiKey);
            }
            if (!reqBody.isEmpty()) {
                conn.setDoOutput(true);
                byte[] bytes = reqBody.getBytes(StandardCharsets.UTF_8);
                conn.setRequestProperty("Content-Length", String.valueOf(bytes.length));
                try (OutputStream os = conn.getOutputStream()) { os.write(bytes); }
            }
            int status = conn.getResponseCode();
            InputStream resp = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
            byte[] respBytes = resp == null ? new byte[0] : readAll(resp);
            String respText = new String(respBytes, StandardCharsets.UTF_8);

            try {
                JSONObject jo = new JSONObject(respText);
                JSONObject usage = jo.optJSONObject("usage");
                if (usage == null && jo.optJSONObject("data") != null) usage = jo.optJSONObject("data").optJSONObject("usage");
                if (usage != null) {
                    int input = usage.optInt("prompt_tokens", usage.optInt("input_tokens", 0));
                    int output = usage.optInt("completion_tokens", usage.optInt("output_tokens", 0));
                    int total = usage.optInt("total_tokens", input + output);
                    String model = "";
                    try { model = new JSONObject(reqBody).optString("model", ""); } catch (Exception ignored) {}
                    addStats(rule.id, input, output, total, model);
                    JSObject event = new JSObject();
                    event.put("id", rule.id); event.put("total", total);
                    notifyListeners("proxyUsage", event);
                }
            } catch (Exception ignored) {
                // resposta não-JSON: apenas repassa
            }
            String type = conn.getContentType();
            send(client, status, respText, type == null ? "application/json" : type);
        } catch (Exception e) {
            Log.w(TAG, "handle: " + e.getMessage());
            try { send(client, 502, "{\"error\":\"" + safe(e.getMessage()) + "\"}", "application/json"); }
            catch (Exception ignored) {}
        } finally {
            if (conn != null) conn.disconnect();
            try { client.close(); } catch (IOException ignored) {}
        }
    }

    private void send(Socket client, int status, String body, String contentType) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        StringBuilder sb = new StringBuilder();
        sb.append("HTTP/1.1 ").append(status).append(' ').append(reason(status)).append("\r\n");
        sb.append("Content-Type: ").append(contentType).append("\r\n");
        sb.append("Content-Length: ").append(bytes.length).append("\r\n");
        sb.append("Cache-Control: no-store\r\n");
        sb.append(CORS);
        sb.append("Connection: close\r\n\r\n");
        OutputStream os = client.getOutputStream();
        os.write(sb.toString().getBytes(StandardCharsets.UTF_8));
        os.write(bytes);
        os.flush();
    }

    private String joinUrl(String upstream, String path) {
        if (path.startsWith("http://") || path.startsWith("https://")) return path;
        if (!path.startsWith("/")) path = "/" + path;
        return upstream + path;
    }

    /* ------------------------------- stats -------------------------------- */
    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private JSONObject parseStats(String raw) {
        JSObject o = new JSObject();
        o.put("requests", 0); o.put("input", 0); o.put("output", 0);
        o.put("total", 0); o.put("lastAt", JSONObject.NULL); o.put("models", new JSObject());
        if (raw == null || raw.isEmpty()) return o;
        try {
            JSONObject j = new JSONObject(raw);
            Iterator<String> it = j.keys();
            while (it.hasNext()) {
                String k = it.next();
                o.put(k, j.get(k));
            }
        } catch (Exception ignored) {}
        return o;
    }

    private String readStats(String id) {
        synchronized (statsLock) { return prefs().getString("stats_" + id, ""); }
    }

    private void addStats(String id, int input, int output, int total, String model) {
        synchronized (statsLock) {
            JSONObject j;
            try {
                String raw = prefs().getString("stats_" + id, "");
                j = raw.isEmpty() ? new JSONObject() : new JSONObject(raw);
            } catch (Exception e) { j = new JSONObject(); }
            try {
                j.put("requests", j.optInt("requests", 0) + 1);
                j.put("input", j.optInt("input", 0) + input);
                j.put("output", j.optInt("output", 0) + output);
                j.put("total", j.optInt("total", 0) + total);
                SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.ROOT);
                f.setTimeZone(TimeZone.getTimeZone("UTC"));
                j.put("lastAt", f.format(new Date()));
                if (model != null && !model.isEmpty()) {
                    JSONObject models = j.optJSONObject("models");
                    if (models == null) { models = new JSONObject(); j.put("models", models); }
                    models.put(model, models.optInt(model, 0) + 1);
                }
                prefs().edit().putString("stats_" + id, j.toString()).apply();
            } catch (Exception e) { Log.w(TAG, "addStats: " + e.getMessage()); }
        }
    }

    /* ------------------------------ utilitários --------------------------- */
    private static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int r;
        while ((r = in.read(buf)) != -1) out.write(buf, 0, r);
        return out.toByteArray();
    }

    private static byte[] readFully(InputStream in, int len) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream(len);
        int remaining = len;
        byte[] buf = new byte[Math.min(8192, Math.max(1, len))];
        while (remaining > 0) {
            int r = in.read(buf, 0, Math.min(buf.length, remaining));
            if (r < 0) break;
            out.write(buf, 0, r);
            remaining -= r;
        }
        return out.toByteArray();
    }

    private static String readHeaderBlock(InputStream in) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        int prev = 0;
        while (baos.size() < 65536) {
            int b = in.read();
            if (b < 0) break;
            baos.write(b);
            if (prev == '\r' && b == '\n') {
                byte[] a = baos.toByteArray();
                int l = a.length;
                if (l >= 4 && a[l-4] == '\r' && a[l-3] == '\n' && a[l-2] == '\r' && a[l-1] == '\n') break;
            }
            prev = b;
        }
        return baos.toString("UTF-8");
    }

    private static String reason(int status) {
        switch (status) {
            case 200: return "OK";
            case 201: return "Created";
            case 204: return "No Content";
            case 400: return "Bad Request";
            case 401: return "Unauthorized";
            case 403: return "Forbidden";
            case 404: return "Not Found";
            case 429: return "Too Many Requests";
            case 500: return "Internal Server Error";
            case 502: return "Bad Gateway";
            default: return "Response";
        }
    }

    private static String safe(String s) {
        return s == null ? "erro" : s.replace("\\", "\\\\").replace("\"", "\\'").replace("\n", " ");
    }

    private static String localIp() {
        try {
            Enumeration<NetworkInterface> nets = NetworkInterface.getNetworkInterfaces();
            while (nets.hasMoreElements()) {
                NetworkInterface ni = nets.nextElement();
                Enumeration<InetAddress> addrs = ni.getInetAddresses();
                while (addrs.hasMoreElements()) {
                    InetAddress a = addrs.nextElement();
                    String ip = a.getHostAddress();
                    if (!a.isLoopbackAddress() && ip.contains(".") && !ip.startsWith("169.254")) return ip;
                }
            }
        } catch (Exception ignored) {}
        return "127.0.0.1";
    }
}

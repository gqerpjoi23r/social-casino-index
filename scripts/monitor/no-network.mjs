import net from "node:net";
import http from "node:http";
import https from "node:https";
import tls from "node:tls";
const disabled = () => { throw new Error("network_disabled_for_replay"); };
globalThis.fetch = disabled;
net.connect = net.createConnection = tls.connect = disabled;
net.Socket.prototype.connect = disabled;
http.request = http.get = https.request = https.get = disabled;

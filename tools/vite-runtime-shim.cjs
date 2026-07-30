// Some sandboxed Linux runtimes do not expose /proc network metadata. Vite
// reads os.networkInterfaces only to print friendly URLs, so provide a loopback
// description when that optional query is unavailable.
const os = require("node:os");

try {
  os.networkInterfaces();
} catch {
  os.networkInterfaces = () => ({
    lo: [
      {
        address: "127.0.0.1",
        family: "IPv4",
        internal: true,
        netmask: "255.0.0.0",
        cidr: "127.0.0.1/8",
        mac: "00:00:00:00:00:00",
      },
    ],
  });
}

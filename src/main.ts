import "./style.css";

type DeviceType = "PC" | "Router" | "Switch" | "Server";

interface Device {
  id: number;

  type: DeviceType;

  x: number;

  y: number;

  ip: string;

  subnet: string;

  gateway: string;

  interfaces?: {
    lan1: string;

    lan2: string;
  };
}

interface Connection {
  from: number;

  to: number;
}

let devices: Device[] = [];

let connections: Connection[] = [];

let nextId = 1;

let selectedDevice: number | null = null;

let connecting = false;

let dragging = false;

const icons: Record<DeviceType, string> = {
  PC: "💻",

  Router: "📡",

  Switch: "🔀",

  Server: "🖥️",
};

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `

  <header class="header">

    <h1>🌐 Network Topology Simulator</h1>

    <span>Interactive Network Design & Simulation</span>

  </header>



  <div class="layout">

    <aside class="sidebar">

      <h2>Network Devices</h2>

      <button data-device="PC">💻 Add Computer</button>

      <button data-device="Router">📡 Add Router</button>

      <button data-device="Switch">🔀 Add Switch</button>

      <button data-device="Server">🖥️ Add Server</button>



      <h2>Network Tools</h2>

      <button id="connect">🔗 Connect Devices</button>

      <button id="configure">⚙️ Configure IP</button>

      <button id="dhcp">🌐 Obtain IP Automatically (DHCP)</button>

      <button id="ping">📶 Ping Test</button>

      <button id="cli">💻 Command Prompt</button>

      <button id="delete">🗑️ Delete Selected</button>

      <button id="clear">🧹 Clear Network</button>

      <button id="save">💾 Save Network</button>

      <button id="load">📂 Load Network</button>

    </aside>



    <main class="workspace">

      <svg id="cables"></svg>

      <div id="canvas"></div>

    </main>

  </div>



  <footer id="status">Ready — Add a device to begin.</footer>



  <div id="modal" class="modal hidden">

    <div class="modal-content">

      <h2>⚙️ Device Configuration</h2>

      <p id="device-name"></p>



      <label>IP Address</label>

      <input id="ip-input" placeholder="192.168.1.10">



      <label>Subnet Mask</label>

      <input id="subnet-input" value="255.255.255.0">



      <label>Default Gateway</label>

      <input id="gateway-input" placeholder="192.168.1.1">



      <div class="modal-buttons">

        <button id="save-ip">Save</button>

        <button id="cancel-ip">Cancel</button>

      </div>

    </div>

  </div>



  <div id="ping-modal" class="modal hidden">

    <div class="modal-content">

      <h2>📶 Network Ping Test</h2>

      <p>Enter the destination IP address:</p>

      <input id="ping-ip" placeholder="192.168.1.20">

      <button id="run-ping">Run Ping</button>

      <button id="close-ping">Close</button>

      <pre id="ping-result"></pre>

    </div>

  </div>

`;

const canvas = document.querySelector<HTMLDivElement>("#canvas")!;

const cables = document.querySelector<SVGSVGElement>("#cables")!;

const status = document.querySelector<HTMLElement>("#status")!;

const modal = document.querySelector<HTMLElement>("#modal")!;

const pingModal = document.querySelector<HTMLElement>("#ping-modal")!;

const routerModal = document.createElement("div");

routerModal.className = "modal hidden";

routerModal.innerHTML = `

  <div class="modal-content">

    <h2>📡 Router Configuration</h2>



    <label>LAN 1 IP Address</label>

    <input id="router-lan1" placeholder="192.168.1.1">



    <label>LAN 2 IP Address</label>

    <input id="router-lan2" placeholder="192.168.2.1">



    <div class="modal-buttons">

      <button id="save-router">Save Router</button>

      <button id="cancel-router">Cancel</button>

    </div>

  </div>

`;

document.body.appendChild(routerModal);

function openRouterConfiguration(device: Device) {
  selectedDevice = device.id;

  document.querySelector<HTMLInputElement>("#router-lan1")!.value =
    device.interfaces?.lan1 || "";

  document.querySelector<HTMLInputElement>("#router-lan2")!.value =
    device.interfaces?.lan2 || "";

  routerModal.classList.remove("hidden");
}

document.querySelector("#save-router")!.addEventListener("click", () => {
  const router = devices.find((d) => d.id === selectedDevice);

  if (!router || router.type !== "Router") return;

  const lan1 = document

    .querySelector<HTMLInputElement>("#router-lan1")!
    .value.trim();

  const lan2 = document

    .querySelector<HTMLInputElement>("#router-lan2")!
    .value.trim();

  if (ipToNumber(lan1) === null || ipToNumber(lan2) === null) {
    status.textContent = "Enter valid IPv4 addresses.";

    return;
  }

  router.interfaces = { lan1, lan2 };

  routerModal.classList.add("hidden");

  status.textContent = "Router configuration saved.";

  render();
});

document.querySelector("#cancel-router")!.addEventListener("click", () => {
  routerModal.classList.add("hidden");
});

function addDevice(type: DeviceType) {
  const id = nextId++;

  devices.push({
    id,

    type,

    x: 80 + (devices.length % 5) * 125,

    y: 80 + Math.floor(devices.length / 5) * 125,

    ip: type === "Server" ? "192.168.1.2" : "",

    subnet: "255.255.255.0",

    gateway: "",

    interfaces:
      type === "Router"
        ? { lan1: "192.168.1.1", lan2: "192.168.2.1" }
        : undefined,
  });

  render();

  status.textContent = `${type} added successfully.`;
}

function drawCables() {
  cables.innerHTML = "";

  connections.forEach((connection) => {
    const a = devices.find((d) => d.id === connection.from);

    const b = devices.find((d) => d.id === connection.to);

    if (!a || !b) return;

    const line = document.createElementNS(
      "http\://www.w3.org/2000/svg",
      "line",
    );

    line.setAttribute("x1", String(a.x + 45));

    line.setAttribute("y1", String(a.y + 35));

    line.setAttribute("x2", String(b.x + 45));

    line.setAttribute("y2", String(b.y + 35));

    line.setAttribute("stroke", "#38bdf8");

    line.setAttribute("stroke-width", "3");

    cables.appendChild(line);
  });
}

function render() {
  canvas.innerHTML = "";

  drawCables();

  devices.forEach((device) => {
    const el = document.createElement("div");

    el.className = "device";

    if (selectedDevice === device.id) {
      el.classList.add("selected");
    }

    el.style.left = `${device.x}px`;

    el.style.top = `${device.y}px`;

    el.innerHTML = `

      <div class="device-icon">${icons[device.type]}</div>

      <div>${device.type} ${device.id}</div>

      <small>${device.ip || "No IP"}</small>

    `;

    el.addEventListener("click", () => {
      if (dragging) return;

      if (connecting && selectedDevice !== null) {
        if (
          selectedDevice !== device.id &&
          !connections.some(
            (c) =>
              (c.from === selectedDevice && c.to === device.id) ||
              (c.to === selectedDevice && c.from === device.id),
          )
        ) {
          connections.push({
            from: selectedDevice,

            to: device.id,
          });
        }

        connecting = false;

        selectedDevice = null;

        status.textContent = "Connection completed.";
      } else {
        selectedDevice = device.id;

        status.textContent = `${device.type} ${device.id} selected.`;
      }

      render();
    });

    el.addEventListener("dblclick", () => {
      selectedDevice = device.id;

      if (device.type === "Router") {
        openRouterConfiguration(device);

        return;
      }

      openConfiguration();
    });

    el.addEventListener("pointerdown", (e) => {
      if (connecting || e.button !== 0) return;

      const startX = e.clientX;

      const startY = e.clientY;

      const originalX = device.x;

      const originalY = device.y;

      let moved = false;

      el.setPointerCapture(e.pointerId);

      const move = (event: PointerEvent) => {
        const dx = event.clientX - startX;

        const dy = event.clientY - startY;

        if (Math.abs(dx) + Math.abs(dy) > 5) {
          moved = true;

          dragging = true;
        }

        device.x = Math.max(0, originalX + dx);

        device.y = Math.max(0, originalY + dy);

        el.style.left = `${device.x}px`;

        el.style.top = `${device.y}px`;

        drawCables();
      };

      el.addEventListener("pointermove", move);

      el.addEventListener(
        "pointerup",

        () => {
          el.removeEventListener("pointermove", move);

          if (moved) {
            setTimeout(() => {
              dragging = false;
            }, 100);
          }
        },

        { once: true },
      );
    });

    canvas.appendChild(el);
  });
}

const loadInput = document.createElement("input");

loadInput.type = "file";

loadInput.accept = ".json,application/json";

loadInput.style.display = "none";

document.body.appendChild(loadInput);

document.querySelector("#load")!.addEventListener("click", () => {
  loadInput.value = "";

  loadInput.click();
});

loadInput.addEventListener("change", async () => {
  const file = loadInput.files?.[0];

  if (!file) return;

  try {
    const content = await file.text();

    const data: unknown = JSON.parse(content);

    if (
      typeof data !== "object" ||
      data === null ||
      !("devices" in data) ||
      !("connections" in data) ||
      !Array.isArray(data.devices) ||
      !Array.isArray(data.connections)
    ) {
      throw new Error("Invalid network file.");
    }

    const validTypes = ["PC", "Router", "Switch", "Server"];

    const validDevices = data.devices.every(
      (d: any) =>
        d !== null &&
        typeof d === "object" &&
        Number.isSafeInteger(d.id) &&
        d.id > 0 &&
        validTypes.includes(d.type) &&
        Number.isFinite(d.x) &&
        Number.isFinite(d.y) &&
        d.x >= 0 &&
        d.y >= 0 &&
        typeof d.ip === "string" &&
        typeof d.subnet === "string" &&
        typeof d.gateway === "string" &&
        (d.interfaces === undefined ||
          (d.interfaces !== null &&
            typeof d.interfaces.lan1 === "string" &&
            typeof d.interfaces.lan2 === "string")),
    );

    const ids = new Set<number>(data.devices.map((d: any) => d.id));

    const validConnections = data.connections.every(
      (c: any) =>
        c !== null &&
        typeof c === "object" &&
        Number.isSafeInteger(c.from) &&
        Number.isSafeInteger(c.to) &&
        ids.has(c.from) &&
        ids.has(c.to) &&
        c.from !== c.to,
    );

    if (
      !validDevices ||
      !validConnections ||
      ids.size !== data.devices.length
    ) {
      throw new Error("Invalid devices or connections.");
    }

    devices = data.devices as Device[];

    connections = data.connections as Connection[];

    nextId = Math.max(0, ...devices.map((d) => d.id)) + 1;

    selectedDevice = null;

    connecting = false;

    render();

    status.textContent = "Network loaded successfully.";
  } catch (error) {
    status.textContent = "Failed to load network file.";

    alert("Invalid or unsupported network JSON file.");
  }
});

function openConfiguration() {
  const device = devices.find((d) => d.id === selectedDevice);

  if (!device) {
    status.textContent = "Select a device first.";

    return;
  }

  document.querySelector<HTMLElement>("#device-name")!.textContent =
    `${device.type} ${device.id}`;

  document.querySelector<HTMLInputElement>("#ip-input")!.value = device.ip;

  document.querySelector<HTMLInputElement>("#subnet-input")!.value =
    device.subnet;

  document.querySelector<HTMLInputElement>("#gateway-input")!.value =
    device.gateway;

  modal.classList.remove("hidden");
}

document.querySelector("#save-ip")!.addEventListener("click", () => {
  const device = devices.find((d) => d.id === selectedDevice);

  if (!device) return;

  device.ip = document

    .querySelector<HTMLInputElement>("#ip-input")!
    .value.trim();

  device.subnet = document

    .querySelector<HTMLInputElement>("#subnet-input")!
    .value.trim();

  device.gateway = document

    .querySelector<HTMLInputElement>("#gateway-input")!
    .value.trim();

  modal.classList.add("hidden");

  render();

  status.textContent = `IP configuration saved for ${device.type} ${device.id}.`;
});

document.querySelector("#cancel-ip")!.addEventListener("click", () => {
  modal.classList.add("hidden");
});

function isReachable(from: number, to: number): boolean {
  const visited = new Set<number>();

  const queue = [from];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === to) return true;

    if (visited.has(current)) continue;

    visited.add(current);

    connections.forEach((c) => {
      if (c.from === current && !visited.has(c.to)) queue.push(c.to);

      if (c.to === current && !visited.has(c.from)) queue.push(c.from);
    });
  }

  return false;
}

function ipToNumber(ip: string): number | null {
  const parts = ip.split(".");

  if (parts.length !== 4) return null;

  const nums = parts.map(Number);

  if (parts.some((p) => !/^\d+$/.test(p)) || nums.some((n) => n < 0 || n > 255))
    return null;

  return nums.reduce((n, part) => ((n << 8) | part) >>> 0, 0);
}

function sameSubnet(a: Device, b: Device): boolean {
  const ipA = ipToNumber(a.ip);

  const ipB = ipToNumber(b.ip);

  const mask = ipToNumber(a.subnet);

  if (ipA === null || ipB === null || mask === null) return false;

  return (ipA & mask) === (ipB & mask);
}

function canRoute(source: Device, target: Device): boolean {
  const sourceIP = ipToNumber(source.ip);

  const targetIP = ipToNumber(target.ip);

  const sourceMask = ipToNumber(source.subnet);

  const targetMask = ipToNumber(target.subnet);

  if (
    sourceIP === null ||
    targetIP === null ||
    sourceMask === null ||
    targetMask === null
  )
    return false;

  return devices.some((router) => {
    if (router.type !== "Router" || !router.interfaces) return false;

    const lan1 = ipToNumber(router.interfaces.lan1);

    const lan2 = ipToNumber(router.interfaces.lan2);

    if (lan1 === null || lan2 === null) return false;

    const interfaces = [lan1, lan2];

    const sourceGateway = ipToNumber(source.gateway);

    const targetGateway = ipToNumber(target.gateway);

    if (sourceGateway === null || targetGateway === null) return false;

    const sourceInterface = interfaces.find(
      (ip) =>
        ip === sourceGateway && (ip & sourceMask) === (sourceIP & sourceMask),
    );

    const targetInterface = interfaces.find(
      (ip) =>
        ip === targetGateway && (ip & targetMask) === (targetIP & targetMask),
    );

    if (
      sourceInterface === undefined ||
      targetInterface === undefined ||
      sourceInterface === targetInterface
    )
      return false;

    return (
      isReachable(source.id, router.id) && isReachable(target.id, router.id)
    );
  });
}

function findNetworkPath(from: number, to: number): number[] {
  const queue: number[][] = [[from]];

  const visited = new Set<number>([from]);

  while (queue.length > 0) {
    const path = queue.shift()!;

    const current = path[path.length - 1];

    if (current === to) return path;

    for (const connection of connections) {
      let neighbor: number | null = null;

      if (connection.from === current) {
        neighbor = connection.to;
      } else if (connection.to === current) {
        neighbor = connection.from;
      }

      if (neighbor !== null && !visited.has(neighbor)) {
        visited.add(neighbor);

        queue.push([...path, neighbor]);
      }
    }
  }

  return [];
}

function animatePacket(from: number, to: number) {
  const path = findNetworkPath(from, to);

  if (path.length < 2) return;

  const points = path

    .map((id) => devices.find((d) => d.id === id))

    .filter((d): d is Device => d !== undefined)

    .map((d) => ({
      x: d.x + 45,

      y: d.y + 35,
    }));

  if (points.length < 2) return;

  const packet = document.createElementNS(
    "http\://www.w3.org/2000/svg",

    "circle",
  );

  packet.setAttribute("r", "7");

  packet.setAttribute("fill", "#facc15");

  packet.setAttribute("stroke", "#ffffff");

  packet.setAttribute("stroke-width", "2");

  cables.appendChild(packet);

  const duration = 700 * (points.length - 1);

  const start = performance.now();

  function frame(now: number) {
    if (!packet.isConnected) return;

    const progress = Math.min((now - start) / duration, 1);

    const segmentPosition = progress * (points.length - 1);

    const index = Math.min(Math.floor(segmentPosition), points.length - 2);

    const t = segmentPosition - index;

    const a = points[index];

    const b = points[index + 1];

    packet.setAttribute("cx", String(a.x + (b.x - a.x) * t));

    packet.setAttribute("cy", String(a.y + (b.y - a.y) * t));

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      packet.remove();
    }
  }

  requestAnimationFrame(frame);
}

const cliModal = document.createElement("div");

cliModal.className = "modal hidden";

cliModal.innerHTML = `

  <div class="modal-content cli-window">

    <div class="cli-header">

      <h2>💻 Command Prompt</h2>

      <button id="cli-close">✕</button>

    </div>



    <pre id="cli-output"></pre>



    <div class="cli-input-row">

      <span>PC&gt;</span>

      <input

        id="cli-input"

        type="text"

        placeholder="Type a command..."

        autocomplete="off"

      >

    </div>

  </div>

`;

document.body.appendChild(cliModal);

const cliOutput = document.querySelector<HTMLElement>("#cli-output")!;

const cliInput = document.querySelector<HTMLInputElement>("#cli-input")!;

let cliDeviceId: number | null = null;

function writeCLI(message: string) {
  cliOutput.textContent += message + "\n";

  cliOutput.scrollTop = cliOutput.scrollHeight;
}

function openCLI() {
  const device = devices.find((d) => d.id === selectedDevice);

  if (!device) {
    status.textContent = "Select a computer first.";

    return;
  }

  if (device.type !== "PC" && device.type !== "Server") {
    status.textContent = "CLI is available for PC and Server.";

    return;
  }

  cliDeviceId = device.id;

  cliOutput.textContent = "";

  writeCLI("Network Topology Simulator");

  writeCLI(`Command Prompt — ${device.type} ${device.id}`);

  writeCLI('Type "help" to see available commands.\n');

  cliModal.classList.remove("hidden");

  cliInput.value = "";

  cliInput.focus();
}

function executeCLI(command: string) {
  const device = devices.find((d) => d.id === cliDeviceId);

  if (!device) return;

  const input = command.trim();

  if (!input) return;

  writeCLI(`PC> ${input}`);

  const parts = input.split(/\s+/);

  const cmd = parts[0].toLowerCase();

  switch (cmd) {
    case "help":
      writeCLI(
        "Available commands:\n" +
          "help       Show commands\n" +
          "ipconfig   Show IP configuration\n" +
          "ping <IP>  Test network connection\n" +
          "clear      Clear terminal\n" +
          "exit       Close terminal\n",
      );

      break;

    case "ipconfig":
      writeCLI(
        "\nIP Configuration\n\n" +
          `IP Address      : ${device.ip || "Not configured"}\n` +
          `Subnet Mask     : ${device.subnet}\n` +
          `Default Gateway : ${device.gateway || "Not configured"}\n`,
      );

      break;

    case "ping": {
      const targetIP = parts[1];

      if (!targetIP || ipToNumber(targetIP) === null) {
        writeCLI("Usage: ping <valid IPv4 address>\n");

        break;
      }

      const target = devices.find((d) => d.ip === targetIP && targetIP !== "");

      if (!device.ip || ipToNumber(device.ip) === null) {
        writeCLI("Source IP is not configured.\n");

        break;
      }

      if (!target) {
        writeCLI(`Pinging ${targetIP}...\n` + "Request timed out.\n");

        break;
      }

      const success =
        device.id === target.id ||
        (isReachable(device.id, target.id) &&
          (sameSubnet(device, target) || canRoute(device, target)));

      if (success) {
        if (device.id !== target.id) {
          animatePacket(device.id, target.id);

          setTimeout(() => {
            animatePacket(target.id, device.id);
          }, 1800);
        }

        writeCLI(
          `Pinging ${targetIP} with 32 bytes of data:\n\n` +
            `Reply from ${targetIP}: bytes=32 time<1ms TTL=64\n`.repeat(4) +
            "\nPackets: Sent = 4, Received = 4, Lost = 0 (0% loss)\n",
        );
      } else {
        writeCLI(
          `Pinging ${targetIP}...\n\n` +
            "Request timed out.\n".repeat(4) +
            "\nPackets: Sent = 4, Received = 0, Lost = 4 (100% loss)\n",
        );
      }

      break;
    }

    case "clear":
      cliOutput.textContent = "";

      break;

    case "exit":
      cliModal.classList.add("hidden");

      cliDeviceId = null;

      break;

    default:
      writeCLI(
        `'${cmd}' is not recognized as a command.\n` +
          'Type "help" for available commands.\n',
      );
  }
}

cliInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    executeCLI(cliInput.value);

    cliInput.value = "";
  }
});

document.querySelector("#cli")!.addEventListener("click", openCLI);

document.querySelector("#cli-close")!.addEventListener("click", () => {
  cliModal.classList.add("hidden");

  cliDeviceId = null;
});

function obtainDHCP() {
  const device = devices.find((d) => d.id === selectedDevice);
  if (!device || device.type !== "PC") {
    status.textContent = "Select a PC first to obtain an IP address.";
    return;
  }

  // Simulated DHCP: find a reachable, configured server on the same
  // physical LAN (directly or through switches, not through routers).
  const reachableOverLAN = (start: number, destination: number): boolean => {
    const visited = new Set<number>();
    const queue = [start];
    while (queue.length) {
      const current = queue.shift()!;
      if (current === destination) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const connection of connections) {
        const neighbor =
          connection.from === current
            ? connection.to
            : connection.to === current
              ? connection.from
              : null;
        if (neighbor === null || visited.has(neighbor)) continue;
        const node = devices.find((d) => d.id === neighbor);
        if (node && node.type !== "Router") queue.push(neighbor);
      }
    }
    return false;
  };

  const server = devices.find(
    (d) =>
      d.type === "Server" &&
      ipToNumber(d.ip) !== null &&
      reachableOverLAN(device.id, d.id),
  );

  if (!server) {
    status.textContent =
      "DHCP failed: Add a Server and connect it to the PC (directly or through a Switch).";
    return;
  }

  const serverIP = ipToNumber(server.ip)!;
  const mask = ipToNumber(server.subnet);
  if (mask === null || mask !== 0xffffff00) {
    status.textContent =
      "DHCP failed: Configure the Server with a /24 mask (255.255.255.0).";
    return;
  }

  const networkPrefix = server.ip.split(".").slice(0, 3).join(".");
  const usedIPs = new Set<string>();
  for (const node of devices) {
    if (node.id !== device.id && node.ip) usedIPs.add(node.ip);
    if (node.type === "Router") {
      if (node.interfaces?.lan1) usedIPs.add(node.interfaces.lan1);
      if (node.interfaces?.lan2) usedIPs.add(node.interfaces.lan2);
    }
  }

  // Reserve .1-.99 and .201-.254 for manually configured devices.
  // Keep an existing lease when the same PC renews DHCP.
  let assignedIP =
    device.ip.startsWith(`${networkPrefix}.`) &&
    Number(device.ip.split(".")[3]) >= 100 &&
    Number(device.ip.split(".")[3]) <= 200 &&
    !usedIPs.has(device.ip)
      ? device.ip
      : "";
  for (let last = 100; last <= 200 && !assignedIP; last++) {
    const candidate = `${networkPrefix}.${last}`;
    if (!usedIPs.has(candidate)) assignedIP = candidate;
  }
  if (!assignedIP) {
    status.textContent =
      "DHCP failed: No free IP addresses in the pool (.100–.200).";
    return;
  }

  // Use a router LAN address in this subnet as the gateway, if available.
  const routerGateway = devices
    .filter((d) => d.type === "Router" && isReachable(device.id, d.id))
    .flatMap((d) => [d.interfaces?.lan1, d.interfaces?.lan2])
    .find(
      (ip): ip is string =>
        !!ip &&
        ipToNumber(ip) !== null &&
        (ipToNumber(ip)! & mask) >>> 0 === (serverIP & mask) >>> 0,
    );
  // Routing is optional. A local LAN without a router has no default gateway.
  device.ip = assignedIP;
  device.subnet = server.subnet;
  device.gateway = routerGateway || "";
  render();
  status.textContent = `DHCP Success: PC ${device.id} received ${assignedIP} from Server ${server.id}.`;
}

document.querySelector("#dhcp")!.addEventListener("click", obtainDHCP);

function runPing() {
  const source = devices.find((d) => d.id === selectedDevice);

  const targetIP = document

    .querySelector<HTMLInputElement>("#ping-ip")!
    .value.trim();

  const target = devices.find((d) => d.ip === targetIP && targetIP !== "");

  const result = document.querySelector<HTMLElement>("#ping-result")!;

  if (!source || !source.ip) {
    result.textContent = "Error: Select a device with an IP address.";

    return;
  }

  if (ipToNumber(targetIP) === null) {
    result.textContent = "Error: Invalid destination IP address.";

    return;
  }

  if (!target) {
    result.textContent = `Pinging ${targetIP}...\nRequest timed out.`;

    return;
  }

  if (source.id === target.id) {
    result.textContent = `Reply from ${targetIP}: Local host reachable.`;

    return;
  }

  if (
    isReachable(source.id, target.id) &&
    (sameSubnet(source, target) || canRoute(source, target))
  ) {
    animatePacket(source.id, target.id);

    setTimeout(() => {
      animatePacket(target.id, source.id);
    }, 1800);

    result.textContent =
      `Pinging ${targetIP} with 32 bytes of data:\n\n` +
      `Reply from ${targetIP}: bytes=32 time<1ms TTL=64\n`.repeat(4) +
      `\nPackets: Sent = 4, Received = 4, Lost = 0 (0% loss)`;
  } else {
    result.textContent =
      `Pinging ${targetIP}...\n\n` +
      `Request timed out.\n`.repeat(4) +
      `\nPackets: Sent = 4, Received = 0, Lost = 4 (100% loss)`;
  }
}

document

  .querySelectorAll<HTMLButtonElement>("[data-device]")

  .forEach((button) => {
    button.addEventListener("click", () => {
      addDevice(button.dataset.device as DeviceType);
    });
  });

document.querySelector("#connect")!.addEventListener("click", () => {
  if (selectedDevice === null) {
    status.textContent = "Select the first device.";

    return;
  }

  connecting = true;

  status.textContent = "Click the second device to connect.";
});

document

  .querySelector("#configure")!
  .addEventListener("click", openConfiguration);

document.querySelector("#ping")!.addEventListener("click", () => {
  if (selectedDevice === null) {
    status.textContent = "Select a source device first.";

    return;
  }

  pingModal.classList.remove("hidden");

  document.querySelector<HTMLElement>("#ping-result")!.textContent = "";
});

document.querySelector("#run-ping")!.addEventListener("click", runPing);

document.querySelector("#close-ping")!.addEventListener("click", () => {
  pingModal.classList.add("hidden");
});

document.querySelector("#delete")!.addEventListener("click", () => {
  if (selectedDevice === null) return;

  devices = devices.filter((d) => d.id !== selectedDevice);

  connections = connections.filter(
    (c) => c.from !== selectedDevice && c.to !== selectedDevice,
  );

  selectedDevice = null;

  connecting = false;

  render();
});

document.querySelector("#clear")!.addEventListener("click", () => {
  devices = [];

  connections = [];

  selectedDevice = null;

  connecting = false;

  render();

  status.textContent = "Network cleared.";
});

document.querySelector("#save")!.addEventListener("click", () => {
  const data = JSON.stringify({ devices, connections }, null, 2);

  const blob = new Blob([data], { type: "application/json" });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = "network-topology.json";

  link.click();

  URL.revokeObjectURL(url);

  status.textContent = "Network saved.";
});

render();

const cytoContainer = document.querySelector("#cytoContainer");
const canvasContainer = document.querySelector("#canvasContainer");
let cy = cytoscape({
  container: document.getElementById("cyto"),
  elements: [
    {
      group: "nodes",
      data: { id: "a" },
      position: { x: 100, y: 100 },
    },
    {
      group: "nodes",
      data: { id: "b" },
      position: { x: 150, y: 200 },
    },
    {
      group: "edges",
      data: { id: "ab", source: "a", target: "b" },
    },
  ],
  style: [
    // the stylesheet for the graph
    {
      selector: "node",
      style: {
        "background-color": "#003153",
        label: "data(id)",
      },
    },

    {
      selector: "edge",
      style: {
        width: 3,
        "line-color": "#ccc",
        "target-arrow-color": "#ccc",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
  ],
  layout: {
    name: "preset",
  },
});

const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

canvas.width = 700;
canvas.height = 700;
const offset = 100;

const startSimBtn = document.querySelector("#startSimBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const graphBtn = document.querySelector("#graphBtn");
const stopBtn = document.querySelector("#stopBtn");
const routingSelect = document.querySelector("#routingSelect");
const numOfSimsLabel = document.querySelector("#numOfSimsLabel");

graphBtn.addEventListener("click", () => {
  cytoContainer.classList.toggle("hiddenEl");
  canvasContainer.classList.toggle("hiddenEl");
});
stopBtn.addEventListener("click", () => {
  stopSim = true;
});

const modalEl = document.querySelector("#modalEl");
const timeEl = document.querySelector("#timeEl");

const handleCheckChange = (event) => {
  numOfSims.classList.toggle("hiddenEl");
  numOfSimsLabel.classList.toggle("hiddenEl");
};
const convertMetersToPixels = (meters) => meters / 16;

class Message {
  constructor(id, source, destination, text, limit = null, count = 0) {
    this.id = id;
    this.source = source;
    this.destination = destination;
    this.text = text;
    this.limit = limit;
    this.count = count;
    this.hops = [];
  }
  addHop(id) {
    this.hops.push(id);
  }
}
class Node {
  constructor(x, y, radius, color, velocity, path, id, message = null) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
    this.path = path;
    this.id = id;
    this.currentPoint = 0;
    this.nextPoint = 1;
    this.reverse = false;
    this.currConnectedNodes = [];
    this.message = message;
  }
  draw() {
    this.path?.forEach((point) => {
      c.beginPath();
      c.arc(point[0], point[1], 2, 0, Math.PI * 2);
      c.strokeStyle = "blue";
      c.stroke();
      c.closePath();
    });
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    c.strokeStyle = this.color;
    c.stroke();
    c.closePath();
    c.fillStyle = this.color;
    c.fillText(
      `Node ${this.id}`,
      this.x - this.radius,
      this.y - this.radius - 5
    );
    c.beginPath();
    c.fillStyle = "black";
    c.arc(this.x, this.y, 2, 0, 2 * Math.PI);
    c.fill();
    c.closePath();
  }

  update() {
    this.draw();
    // if reached the point
    const dist = Math.hypot(
      this.x - this.path[this.nextPoint][0],
      this.y - this.path[this.nextPoint][1]
    );

    if (dist < 5) {
      this.currentPoint = this.nextPoint;
      if (this.reverse) {
        this.nextPoint--;
      } else {
        this.nextPoint++;
      }
      if (this.nextPoint > 2) {
        this.nextPoint = 1;
        this.reverse = true;
      } else if (this.nextPoint < 0) {
        this.nextPoint = 1;
        this.reverse = false;
      }
      this.velocity = calculateVelocity(
        this.path[this.currentPoint],
        this.path[this.nextPoint]
      );
    }

    this.x += this.velocity.x;
    this.y += this.velocity.y;
  }
}

let nodes = [];
let logArray = [];
let currentTime = 0;
let numOfNodes,
  simTime,
  routing,
  stopSim = false,
  curSim = 0;

function calculateVelocity(source, destination) {
  const angle = Math.atan2(
    destination[1] - source[1],
    destination[0] - source[0]
  );

  const velocity = {
    x: convertMetersToPixels(23) * Math.cos(angle),
    y: convertMetersToPixels(23) * Math.sin(angle),
  };

  return velocity;
}

function getRandomPath() {
  const path = [
    [
      Math.random() * (canvas.width - offset) + 50,
      Math.random() * (canvas.width - offset) + 50,
    ],
    [
      Math.random() * (canvas.width - offset) + 50,
      Math.random() * (canvas.width - offset) + 50,
    ],
    [
      Math.random() * (canvas.width - offset) + 50,
      Math.random() * (canvas.width - offset) + 50,
    ],
  ];
  return path;
}
let animationId;

function init() {
  animationId = 0;
  stopSim = false;
  nodes = [];
  currentTime = 0;

  nodes.push(
    new Node(
      canvas.width / 2,
      offset,
      convertMetersToPixels(900),
      "green",
      { x: 0, y: 0 },
      getRandomPath(),
      0,
      new Message(
        0,
        0,
        1,
        routing == "epidemic" ? "Hello from epidemic!" : "Hello from SNW!",
        routing == "epidemic" ? null : Math.floor((numOfNodes * 3) / 4)
      )
    ),
    new Node(
      canvas.width / 2,
      canvas.height - offset,
      convertMetersToPixels(900),
      "green",
      { x: 0, y: 0 },
      getRandomPath(),
      1
    )
  );

  for (let i = 0; i < numOfNodes; i++) {
    const path = getRandomPath();
    nodes.push(
      new Node(
        path[0][0],
        path[0][1],
        convertMetersToPixels(500),
        "red",
        calculateVelocity(path[0], path[1]),
        path,
        i + 2
      )
    );
  }
}

const copyMessageObj = (obj) => {
  const copy = JSON.parse(JSON.stringify(obj));
  copy.id = copy.id + 1;
  Object.setPrototypeOf(copy, Message.prototype);
  return copy;
};

let deliveredSim = 0;
let numOfHops = 0;

const getTransmissionProb = () => {
  return Math.random();
};

const animate = async () => {
  return new Promise((resolve, reject) => {
    timeEl.innerHTML = currentTime;

    if (currentTime < simTime && !stopSim) {
      c.fillStyle = "white";
      c.fillRect(0, 0, canvas.width, canvas.height);

      nodes.forEach((node) => {
        node.update();

        nodes.forEach((otherNode) => {
          const dist = Math.hypot(node.x - otherNode.x, node.y - otherNode.y);
          // Detect the intersection of two coverage areas of nodes
          if (dist <= node.radius && node.id !== otherNode.id) {
            if (getTransmissionProb() > 0.9) {
              node.currConnectedNodes.push(otherNode.id);
            }

            // check if the node has been already connected or it's a new connection
            if (!node.currConnectedNodes.includes(otherNode.id)) {
              // check the type of routing
              if (
                node.message &&
                !otherNode.message &&
                routing == "epidemic" &&
                !node.currConnectedNodes.includes(otherNode.id)
              ) {
                otherNode.message = copyMessageObj(node.message); // this is done in order to copy the Message and increment id
                otherNode.message.addHop(
                  `Message ID: ${otherNode.message.id}. Hop: ${node.id} --> ${otherNode.id}`
                );
                console.log(
                  `Successfully transmitted from Node ${node.id} to Node ${otherNode.id} with Epidemic`
                );
                if (otherNode.id === otherNode.message?.destination) {
                  console.log("Delivered!");
                  deliveredSim++;
                  curSim++;

                  console.log("Hops: ", otherNode.message.hops);
                  stopSim = true;
                  resolve();
                }
              }
              if (
                node.message &&
                !otherNode.message &&
                routing == "snw" &&
                !node.currConnectedNodes.includes(otherNode.id)
              ) {
                // send the message from source node to the first relay node found
                if (node.id === 0 && node.message.count === 0) {
                  otherNode.message = copyMessageObj(node.message);
                  otherNode.relaySource = true;
                  otherNode.message.addHop(
                    `Message ID: ${otherNode.message.id}. Hop: ${node.id} --> ${otherNode.id}`
                  );
                  node.message.count = node.message.count + 1;
                  console.log(
                    `Successfully transmitted from Node ${node.id} to Node ${otherNode.id} with SnW routing`
                  );
                }
                // checks if it's not the source node, if the count is less than limit, if it's the first relay source, if the
                // receiving node does not have any message
                if (
                  node.message.id !== 0 &&
                  node.message?.count < node.message?.limit &&
                  node.relaySource &&
                  !otherNode.message
                ) {
                  otherNode.message = copyMessageObj(node.message);
                  otherNode.message.addHop(
                    `Message ID: ${otherNode.message.id}. Hop: ${node.id} --> ${otherNode.id}`
                  );

                  console.log(
                    `(${
                      otherNode.message.count + 1
                    }) Successfully transmitted from Node ${node.id} to Node ${
                      otherNode.id
                    } with SnW routing`
                  );
                  node.message.count = node.message.count + 1; // increase the coutner for relay node so that we could limit num of messages
                }
                if (otherNode.id === node.message?.destination) {
                  otherNode.message = copyMessageObj(node.message);
                  otherNode.message.addHop(
                    `Message ID: ${otherNode.message.id}. Hop: ${node.id} --> ${otherNode.id}`
                  );
                  console.log("Delivered!");
                  console.log("Hops: ", otherNode.message.hops);
                  deliveredSim++;
                  stopSim = true;
                }
              }
              node.currConnectedNodes.push(otherNode.id);
              const temp = [...logArray[node.id][otherNode.id]];
              temp.push(currentTime);
              logArray[node.id][otherNode.id] = [...temp];
            }
          } else if (
            dist > node.radius &&
            node.currConnectedNodes.includes(otherNode.id) &&
            node.id !== otherNode.id
          ) {
            const temp = [...logArray[node.id][otherNode.id]];
            temp.push(currentTime);
            logArray[node.id][otherNode.id] = [...temp];
            node.currConnectedNodes = node.currConnectedNodes.filter(
              (id) => id !== otherNode.id
            );
          }
        });
      });
      animationId = requestAnimationFrame(animate);
    } else {
      curSim++;
      resolve();

      cancelAnimationFrame(animationId);
      startSimBtn.disabled = false;
      routingSelect.disabled = false;
      downloadBtn.disabled = false;
      stopBtn.disabled = true;
      downloadBtn.onclick = exportToCsv;
    }
    currentTime++;
  });
};

const drawGraph = () => {};

const exportToCsv = () => {
  let CsvString = "";
  logArray.forEach((RowItem, RowItemIndex) => {
    RowItem.forEach((ColItem) => {
      CsvString += ColItem + ";";
    });
    CsvString += "\r\n";
  });
  CsvString = "data:application/csv," + encodeURIComponent(CsvString);
  let x = document.createElement("A");
  x.setAttribute("href", CsvString);
  x.setAttribute("download", "simData.csv");
  document.body.appendChild(x);
  x.click();

  drawGraph();
};

startSimBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  numOfSims = document.querySelector("#numOfSims").value * 1;
  numOfNodes = document.querySelector("#numOfNodes").value * 1;
  simTime = document.querySelector("#simTime").value * 1;
  routing = routingSelect.value;

  if (numOfNodes && simTime && routing) {
    console.clear();
    logArray = [...Array(numOfNodes + 2)].map((e) =>
      Array(numOfNodes + 2).fill(Array(0))
    );
    init();
    startSimBtn.disabled = true;
    routingSelect.disabled = true;
    downloadBtn.disabled = true;
    stopBtn.disabled = false;
    await animate();
  }
});

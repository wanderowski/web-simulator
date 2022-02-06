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
const routingSelect = document.querySelector("#routingSelect");

graphBtn.addEventListener("click", () => {
  cytoContainer.classList.toggle("hiddenEl");
  canvasContainer.classList.toggle("hiddenEl");
});

const modalEl = document.querySelector("#modalEl");
const timeEl = document.querySelector("#timeEl");

let numOfNodes,
  simTime,
  routing,
  stopSim = false;

class Message {
  constructor(id, source, destination, text, limit = null, count = 0) {
    this.id = id;
    this.source = source;
    this.destination = destination;
    this.text = text;
    this.limit = limit;
    this.count = count;
  }

  incrementCount() {
    this.count++;
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

function calculateVelocity(source, destination) {
  const angle = Math.atan2(
    destination[1] - source[1],
    destination[0] - source[0]
  );

  const velocity = {
    x: 3 * Math.cos(angle),
    y: 3 * Math.sin(angle),
  };

  return velocity;
}

function getRandomPath() {
  const path = [
    [
      Math.random() * (canvas.width - 100) + 50,
      Math.random() * (canvas.width - 100) + 50,
    ],
    [
      Math.random() * (canvas.width - 100) + 50,
      Math.random() * (canvas.width - 100) + 50,
    ],
    [
      Math.random() * (canvas.width - 100) + 50,
      Math.random() * (canvas.width - 100) + 50,
    ],
  ];
  return path;
}

function init() {
  stopSim = false;
  nodes = [];
  currentTime = 0;
  nodes.push(
    new Node(
      canvas.width / 2,
      75,
      75,
      "green",
      { x: 0, y: 0 },
      getRandomPath(),
      0,
      new Message(
        0,
        0,
        1,
        routing == "epidemic" ? "Hello from epidemic!" : "Hello from SNW!",
        routing == "epidemic" ? null : Math.floor(numOfNodes / 2)
      )
    ),
    new Node(
      canvas.width / 2,
      canvas.height - 75,
      75,
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
        25,
        "red",
        calculateVelocity(path[0], path[1]),
        path,
        i + 2
      )
    );
  }
}

let animationId;

function animate() {
  timeEl.innerHTML = currentTime;

  if (currentTime < simTime && !stopSim) {
    c.fillStyle = "white";
    c.fillRect(0, 0, canvas.width, canvas.height);

    nodes.forEach((node, nodeIndex) => {
      node.update();

      nodes.forEach((otherNode, otherNodeIndex) => {
        const dist = Math.hypot(node.x - otherNode.x, node.y - otherNode.y);
        // Detect the intersection of two coverage areas of nodes
        if (dist <= node.radius && node.id !== otherNode.id) {
          // check if the node has been connected or it's a new connection
          if (!node.currConnectedNodes.includes(otherNode.id)) {
            if (node.message && !otherNode.message && routing == "epidemic") {
              otherNode.message = { ...node.message };
              console.log(
                `Successfully transmitted from Node ${node.id} to Node ${otherNode.id}`
              );
              if (otherNode.id === otherNode.message?.destination) {
                console.log("Delivered!");
                stopSim = true;
              }
            }
            if (node.message && !otherNode.message && routing == "snw") {
              if (node.id === 0 && node.message?.count === 0) {
                const cloneMessage = Object.assign({}, node.message);
                Object.setPrototypeOf(cloneMessage, Message.prototype);
                cloneMessage.id = node.message.id + 1;
                otherNode.message = cloneMessage;
                otherNode.relaySource = true;
                node.message?.incrementCount();
                console.log(
                  `Successfully transmitted from Node ${node.id} to Node ${otherNode.id} with SnW routing`
                );
              } else if (
                node.message.id !== 0 &&
                node.message?.count < node.message?.limit &&
                node.relaySource &&
                !otherNode.message
              ) {
                otherNode.message = node.message;

                console.log(
                  `(${
                    node.message.count + 1
                  }) Successfully transmitted from Node ${node.id} to Node ${
                    otherNode.id
                  } with SnW routing`
                );
                otherNode.message?.incrementCount();
              } else if (otherNode.id === node.message?.destination) {
                console.log("Delivered!");
                stopSim = true;
              }
            }
            // console.log(`Node ${node.id} connected to Node ${otherNode.id}`);
            node.currConnectedNodes.push(otherNode.id);
            const temp = [...logArray[node.id][otherNode.id]];
            temp.push(currentTime);
            logArray[node.id][otherNode.id] = [...temp];

            // console.log(
            //   `After pushing in Node ${node.id} connected: `,
            //   logArray
            // );
          }
        } else if (
          dist > node.radius &&
          node.currConnectedNodes.includes(otherNode.id) &&
          node.id !== otherNode.id
        ) {
          // console.log(`Node ${node.id} disconnected from Node ${otherNode.id}`);
          const temp = [...logArray[node.id][otherNode.id]];
          temp.push(currentTime);
          logArray[node.id][otherNode.id] = [...temp];

          // console.log(
          //   `After pushing in Node ${node.id} disconnected: `,
          //   logArray
          // );
          node.currConnectedNodes = node.currConnectedNodes.filter(
            (id) => id !== otherNode.id
          );
        }
      });
    });
    animationId = requestAnimationFrame(animate);
  } else {
    setTimeout(() => {
      cancelAnimationFrame(animationId);
      startSimBtn.disabled = false;
      routingSelect.disabled = false;
      exportToCsv();
    }, 0);
  }
  currentTime++;
}

const exportToCsv = () => {
  var CsvString = "";
  logArray.forEach((RowItem, RowItemIndex) => {
    RowItem.forEach((ColItem) => {
      CsvString += ColItem + ";";
    });
    CsvString += "\r\n";
  });
  CsvString = "data:application/csv," + encodeURIComponent(CsvString);
  var x = document.createElement("A");
  x.setAttribute("href", CsvString);
  x.setAttribute("download", "simData.csv");
  document.body.appendChild(x);
  x.click();
};

startSimBtn.addEventListener("click", (e) => {
  e.preventDefault();
  numOfNodes = document.querySelector("#numOfNodes").value * 1;
  simTime = document.querySelector("#simTime").value * 1;
  routing = routingSelect.value;
  if (numOfNodes && simTime && routing) {
    logArray = [...Array(numOfNodes + 2)].map((e) =>
      Array(numOfNodes + 2).fill(Array(0))
    );
    init();
    startSimBtn.disabled = true;
    routingSelect.disabled = true;

    animate();
  }
});

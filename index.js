const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

canvas.width = 700;
canvas.height = 700;

const startSimBtn = document.querySelector("#startSimBtn");
const modalEl = document.querySelector("#modalEl");
const timeEl = document.querySelector("#timeEl");

let numOfNodes, simTime;

class Node {
  constructor(x, y, radius, color, velocity, path, id = 0) {
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
  }
  draw() {
    this.path.forEach((point) => {
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
    c.fillStyle = this.color;
    c.fillText(
      `Node ${this.id}`,
      this.x - this.radius,
      this.y - this.radius - 5
    );
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
  nodes = [];
  currentTime = 0;

  for (let i = 0; i < numOfNodes; i++) {
    const path = getRandomPath();
    nodes.push(
      new Node(
        path[0][0],
        path[0][1],
        20,
        "red",
        calculateVelocity(path[0], path[1]),
        path,
        i
      )
    );
  }
}

let animationId;

function animate() {
  timeEl.innerHTML = currentTime;
  if (currentTime < simTime * 1) {
    currentTime++;
    animationId = requestAnimationFrame(animate);
    c.fillStyle = "white";
    c.fillRect(0, 0, canvas.width, canvas.height);

    nodes.forEach((node, nodeIndex) => {
      node.update();

      nodes.forEach((otherNode, otherNodeIndex) => {
        const dist = Math.hypot(node.x - otherNode.x, node.y - otherNode.y);
        if (dist < node.radius && node.id !== otherNode.id) {
          console.log(
            `Node ${node.id} connected to Node ${otherNode.id} at ${currentTime} sec.`
          );
          if (
            !(
              logArray[node.id][otherNode.id] || logArray[otherNode.id][node.id]
            )
          ) {
            logArray[node.id][otherNode.id] = currentTime;
            logArray[otherNode.id][node.id] = currentTime;
          }
        }
      });
    });
  } else {
    setTimeout(() => {
      cancelAnimationFrame(animationId);
      startSimBtn.disabled = false;
      console.log("Log Array: ", logArray);
      exportToCsv();
    }, 0);
  }
}

const exportToCsv = () => {
  var CsvString = "";
  logArray.forEach((RowItem) => {
    RowItem.forEach((ColItem) => {
      CsvString += ColItem + ",";
    });
    CsvString += "\r\n";
  });
  CsvString = "data:application/csv," + encodeURIComponent(CsvString);
  var x = document.createElement("A");
  x.setAttribute("href", CsvString);
  x.setAttribute("download", "somedata.csv");
  document.body.appendChild(x);
  x.click();
};

startSimBtn.addEventListener("click", (e) => {
  e.preventDefault();
  numOfNodes = document.querySelector("#numOfNodes").value * 1;
  simTime = document.querySelector("#simTime").value * 1;
  if (numOfNodes || simTime) {
    logArray = [...Array(numOfNodes)].map((e) =>
      Array(numOfNodes).fill(undefined)
    );
    init();
    startSimBtn.disabled = true;

    animate();
  }
});

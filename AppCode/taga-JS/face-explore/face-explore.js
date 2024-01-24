const default_image = PATH.join(__dirname, '..', 'test4.png');
const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);

const yTopRow = 0; // Y-coordinate for the top row
const yBottomRow = 150; // Y-coordinate for the bottom row
const xSpacing = 100; // Spacing between nodes

// Add only parent nodes initially
for (let i = 0; i < 10; i++) {
  nodes.add({ id: i, shape: 'image', image: default_image, x: i * xSpacing, y: yTopRow });
}

const container = document.getElementById('d3-view');
const containerWidth = container.offsetWidth;
const containerHeight = container.offsetHeight;
const springLength = containerWidth * 0.05; // 5% of the container's width

const data = { nodes, edges };
const options = {
  // Basic options; layout is not hierarchical
  nodes: {
    shape: 'image',
    size: 30,
  },
  edges: {
    arrows: 'to',
  },
  interaction: {
    dragNodes: true,
    zoomView: true,
  },
  physics: {
    enabled: true,
    barnesHut: {
      gravitationalConstant: -2000,
      centralGravity: 0.2,
      springLength: springLength,
      springConstant: 0.04,
      damping: 0.25,
      avoidOverlap: 0.6,
    },
    solver: 'barnesHut',
  },
};
const network = new vis.Network(container, data, options);

// Event listener for node clicks
network.on('click', function (params) {
  if (params.nodes.length > 0) {
    const nodeId = params.nodes[0];
    loadChildren(nodeId);
  }
});

function loadChildren(parentNodeId) {
  const parentNodePosition = network.getPositions([parentNodeId])[parentNodeId];
  const parentNode = data.nodes.get(parentNodeId);
  const parentDepth = parentNode.depth !== undefined ? parentNode.depth : 0;
  const childNodes = fetchChildNodesFromDatabase(parentNodeId, parentNodePosition, parentDepth + 1);

  // Add child nodes and edges to the network
  childNodes.forEach((childNode) => {
    if (!data.nodes.get(childNode.id)) {
      data.nodes.add(childNode);
      data.edges.add({ from: parentNodeId, to: childNode.id });
    }
  });
}

function fetchChildNodesFromDatabase(parentNodeId, parentNodePosition, depth) {
  const childNodes = [];
  const numberOfChildren = 3; // Assuming each parent has 3 children
  const xOffset = 80; // Horizontal spacing between child nodes

  console.log(parentNodeId, parentNodePosition);
  for (let i = 0; i < numberOfChildren; i++) {
    const childId = `${parentNodeId}-child-${i}`;
    childNodes.push({
      id: childId,
      shape: 'image',
      image: default_image,
      label: `Depth: ${depth}`,
      x: parentNodePosition.x + (i - Math.floor(numberOfChildren / 2)) * xOffset,
      y: 100 + parentNodePosition.y * 1.2, // 20% downwards
    });
  }
  return childNodes;
}

window.addEventListener('resize', function () {
  const newWidth = container.offsetWidth;
  const newSpringLength = newWidth * 0.05; // 5% of the new width

  // Update the network's options
  network.setOptions({
    physics: {
      barnesHut: {
        springLength: newSpringLength,
      },
    },
  });
});

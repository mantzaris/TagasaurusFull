const { GENERAL_HELPER_FNS } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js'));

const default_filename = 'fr2.jpg';
const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const container = document.getElementById('d3-view');
const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);

let containerWidth = container.offsetWidth;
let containerHeight = container.offsetHeight;
let springLength = containerWidth * 0.05;
let network_data;
let network_options;
let id2filename_map = new Map();

const init_radius = Math.min(containerHeight, containerWidth) * 0.3;
const spawn_num = 8;

function Initialize_FirstView() {
  for (let i = 0; i < spawn_num; i++) {
    const angle = (2 * Math.PI * i) / spawn_num; // Angle for each node
    const x = init_radius * Math.cos(angle);
    const y = init_radius * Math.sin(angle);

    // DOES NOT WORK widthConstraint: { minimum: 5, maximum: 5 },
    // DOES NOT WORK heightConstraint: { minimum: 5, maximum: 5 },
    const childId = Rand_Node_ID();
    id2filename_map.set(childId, default_filename);
    nodes.add({
      id: childId,
      shape: 'image',
      image: GENERAL_HELPER_FNS.Full_Path_From_File_Name(default_filename),
      x: x,
      y: y,
    });
  }

  network_options = {
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
        springConstant: 0.06,
        damping: 0.3,
        avoidOverlap: 0.6,
      },
      solver: 'barnesHut',
    },
  };

  network_data = { nodes, edges };
}

Initialize_FirstView();

const network = new vis.Network(container, network_data, network_options);

////////////////////////////////////////////////////////////
// now the dynamic functions
////////////////////////////////////////////////////////////
// Event listener for node clicks
network.on('click', function (params) {
  if (params.nodes.length > 0) {
    const nodeId = params.nodes[0];

    const connectedEdges = network_data.edges.get({
      filter: (edge) => {
        return edge.from === nodeId;
      },
    });

    if (connectedEdges.length === 0) {
      Spawn_Children(nodeId);
    }
  }
});

function Spawn_Children(parentNodeId) {
  const parentNodePosition = network.getPositions([parentNodeId])[parentNodeId];
  const child_IDs = fetchChildNodesFromDatabase(parentNodeId);

  for (let i = 0; i < spawn_num; i++) {
    const childId = child_IDs[i];
    id2filename_map.set(childId, default_filename);

    const childNode = {
      id: childId,
      shape: 'image',
      image: GENERAL_HELPER_FNS.Full_Path_From_File_Name(default_filename),
      label: ``,
      x: parentNodePosition.x + (Math.random() - 0.5),
      y: parentNodePosition.y + (Math.random() - 0.5),
    };

    // Add child node and edge to the network if it doesn't already exist
    if (!network_data.nodes.get(childNode.id)) {
      network_data.nodes.add(childNode);
      network_data.edges.add({ from: parentNodeId, to: childNode.id });
    }
  }
}

function fetchChildNodesFromDatabase(parentNodeId) {
  return Array.from({ length: spawn_num }, Rand_Node_ID);
}

window.addEventListener('resize', function () {
  const newWidth = container.offsetWidth;
  const newSpringLength = newWidth * 0.05; // 5% of the new width

  containerWidth = container.offsetWidth;
  containerHeight = container.offsetHeight;

  network.setOptions({
    physics: {
      barnesHut: {
        springLength: newSpringLength,
      },
    },
  });
});

function Rand_Node_ID(length = 7) {
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

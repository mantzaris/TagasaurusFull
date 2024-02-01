const { ipcRenderer } = require('electron');
const mlKmeans = require('ml-kmeans');
const { GENERAL_HELPER_FNS } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js'));

const default_filename = 'friendsCropped.jpg';
const alpha_numeric_chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const play_icon_path = PATH.join(__dirname, '..', 'Assets', 'various-icons', 'videoplay512.png');

const container = document.getElementById('network-view');
const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);

let network_data;
let network_options;
let id2filename_map = new Map();
let containerWidth = container.offsetWidth;
let containerHeight = container.offsetHeight;
let springLength = containerWidth * 0.05;

const init_radius = Math.min(containerHeight, containerWidth) * 0.3;
let spawn_num = 8;
let candidate_num = 25;

async function Initial_Node_Selection() {
  Show_Loading_Spinner();

  const init_records = await Centroid_Face_Sample_Records(); //records with faces from centroids of samples

  if (!init_records) {
    return;
  }

  for (const [index, record] of init_records.entries()) {
    const imagePath = GENERAL_HELPER_FNS.Full_Path_From_File_Name(record.fileName);
    const childId = Rand_Node_ID();

    const angle = (2 * Math.PI * index) / init_records.length; //angle for each node
    const node_x = init_radius * Math.cos(angle);
    const node_y = init_radius * Math.sin(angle);

    if (record.fileType == 'video') {
      //select random face descriptor from the available
      const selected_face_descriptor = record.faceDescriptors[Math.floor(Math.random() * record.faceDescriptors.length)];
      Add_Node_To_Network(childId, play_icon_path, node_x, node_y);

      id2filename_map.set(childId, { fileName: record.fileName, descriptor: selected_face_descriptor });
      continue;
    }

    //IMAGE or GIF
    const faces = await Get_Image_Face_Descriptors_From_File(imagePath); //needs to run face api fresh to get the detection box coordinates which the DB does not store
    let face;

    if (!faces || faces.length == 0) {
      //gif where frame 1 has no face
      const selected_face_descriptor = record.faceDescriptors[Math.floor(Math.random() * record.faceDescriptors.length)];
      Add_Node_To_Network(childId, play_icon_path, node_x, node_y);

      id2filename_map.set(childId, { fileName: record.fileName, descriptor: selected_face_descriptor });
      continue;
    } else if (faces.length == 1) {
      face = faces[0];
    } else {
      face = faces[Math.floor(Math.random() * faces.length)];
    }

    const { x, y, width, height } = face.detection.box;
    const faceThumbnailUrl = await Detection_Face_URL(x, y, width, height, imagePath);

    Add_Node_To_Network(childId, faceThumbnailUrl, node_x, node_y);
    // nodes.add({
    //   id: childId,
    //   shape: 'image',
    //   image: faceThumbnailUrl,
    //   x: node_x,
    //   y: node_y,
    // });

    //mapping later on helps us know details about the image from the node id
    id2filename_map.set(childId, { fileName: record.fileName, descriptor: face.descriptor });
  }

  Set_Network_Options();

  network_data = { nodes, edges };
  network = new vis.Network(container, network_data, network_options);
  network.on('click', (params) => {
    Network_OnClick_Handler(params);
  });
  Hide_Loading_Spinner();
}

////////////////////////////////////////////////////////////
// now the dynamic functions
////////////////////////////////////////////////////////////
function Network_OnClick_Handler(params) {
  const nodeId = params.nodes[0];

  if (nodeId) {
    //if one or more nodes selected
    const connectedEdges = network_data.edges.get({
      filter: (edge) => {
        return edge.from === nodeId;
      },
    });

    //it is a leaf node without connections outwards
    if (connectedEdges.length === 0) {
      Spawn_Children(nodeId);
    }

    //display the clicked node image/video etc separately
    Present_Node_Locality(nodeId);
  }
}

function Spawn_Children(parentNodeId) {
  const parentNodePosition = network.getPositions([parentNodeId])[parentNodeId];
  const child_IDs = fetchChildNodesFromDatabase(parentNodeId);

  console.log(child_IDs);

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

////////////////////////////////////////////
//UI interactivity
////////////////////////////////////////////

async function Present_Node_Locality(nodeId) {
  const { fileName, descriptor } = id2filename_map.get(nodeId);
  let fileName_Set = new Set([fileName]);

  const { rowids } = await ipcRenderer.invoke('faiss-search', descriptor, candidate_num);

  for (const rowid of rowids) {
    const fileName_tmp = DB_MODULE.Get_Tagging_Records_From_ROWIDs_BigInt(rowid)[0].fileName;
    fileName_Set.add(fileName_tmp);
  }

  let search_results_output = document.getElementById('media-container');
  search_results_output.innerHTML = '';

  for (const fn of fileName_Set) {
    const file_type = DB_MODULE.Get_Tagging_Record_From_DB(fn).fileType;

    if (file_type == 'image' || file_type == 'gif') {
      const image = document.createElement('img');
      image.src = GENERAL_HELPER_FNS.Full_Path_From_File_Name(fn);
      image.classList.add('media-style');
      image.id = `candidate-${fn}`;
      image.alt = 'image';
      image.onclick = () => {
        GENERAL_HELPER_FNS.Goto_Tagging_Entry(fn);
      };
      document.getElementById('media-container').appendChild(image);
    } else if (file_type == 'video') {
      const video = document.createElement('video');
      video.src = GENERAL_HELPER_FNS.Full_Path_From_File_Name(fn);
      video.classList.add('media-style');
      video.id = `candidate-${fn}`;
      video.alt = 'video';
      video.controls = true; // Add controls to the video player
      video.muted = true; // Mute the video by default (you can change this)
      video.onclick = () => {
        GENERAL_HELPER_FNS.Goto_Tagging_Entry(fn);
      };
      document.getElementById('media-container').appendChild(video);
    }
  }

  document.getElementById('media-container').scrollTop = 0;
}

/////////////////////////////////////////////
//Initialization controller
/////////////////////////////////////////////
async function Initialize() {
  try {
    if (window.faceapi_loaded) {
      Initial_Node_Selection();
    } else {
      //models are not loaded yet, retry after a delay
      setTimeout(Initialize, 100);
    }
  } catch (error) {
    console.error('Data is not ready yet:', error);
    setTimeout(Initialize, 100); // Retry on error
  }
}

document.getElementById('restart-btn').onclick = () => {
  nodes.clear();
  edges.clear();
  id2filename_map.clear();

  let search_results_output = document.getElementById('media-container');
  search_results_output.innerHTML = '';

  Initial_Node_Selection();
};

Initialize();

//////////////////////////////////////////////
//helper function for small tasks
//////////////////////////////////////////////
function Add_Node_To_Network(childId, image_url = play_icon_path, node_x, node_y) {
  nodes.add({
    id: childId,
    shape: 'image',
    image: image_url,
    x: node_x,
    y: node_y,
  });
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

document.addEventListener('DOMContentLoaded', function () {
  const spawn_slider = document.getElementById('branching-slider');
  const spawn_slider_value = document.getElementById('branching-value');
  const preview_slider = document.getElementById('preview-slider');
  const preview_slider_value = document.getElementById('preview-value');

  spawn_slider.oninput = function () {
    spawn_slider_value.textContent = this.value;
    spawn_num = parseInt(this.value);
  };

  preview_slider.oninput = function () {
    //the html calls the 'candidate number' the 'preview number'
    preview_slider_value.textContent = this.value;
    candidate_num = parseInt(this.value);
  };
});

function Make_IMG_El(src) {
  return new Promise((resolve, reject) => {
    const image_tmp = new Image();
    image_tmp.onload = () => resolve(image_tmp);
    image_tmp.onerror = reject;
    image_tmp.src = src;
  });
}

async function Detection_Face_URL(x, y, width, height, imagePath) {
  const originalImage = await Make_IMG_El(imagePath);

  const scaleFactor = 1.5;
  const newWidth = width * scaleFactor;
  const newHeight = height * scaleFactor;
  const deltaX = (newWidth - width) / 2;
  const deltaY = (newHeight - height) / 2;
  let newX = x - deltaX;
  let newY = y - deltaY;
  newX = Math.max(0, Math.min(newX, originalImage.width - newWidth));
  newY = Math.max(0, Math.min(newY, originalImage.height - newHeight));

  const detection_canvas = document.createElement('canvas');
  const ctx2 = detection_canvas.getContext('2d');
  detection_canvas.width = newWidth;
  detection_canvas.height = newHeight;
  ctx2.drawImage(originalImage, newX, newY, newWidth, newHeight, 0, 0, newWidth, newHeight);
  return detection_canvas.toDataURL('image/jpeg');
}

function Set_Network_Options() {
  network_options = {
    nodes: {
      shape: 'image',
      size: 50,
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
}

function Rand_Node_ID(length = 7) {
  let result = '';
  const charactersLength = alpha_numeric_chars.length;
  for (let i = 0; i < length; i++) {
    result += alpha_numeric_chars.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

async function Centroid_Face_Sample_Records() {
  const sample_size = 2000;
  const K = spawn_num;
  const options = {
    maxIterations: 40,
  };

  const sample_records = DB_MODULE.Tagging_Random_DB_Records_With_Faces(sample_size);

  if (!sample_records || sample_records.length < 1) {
    alert('add and save images with people, currently empty');
    return null;
  }

  if (sample_records.length <= K) return sample_records;

  const sample_embeddings = sample_records.flatMap((record) => record.faceDescriptors);
  const clustering = mlKmeans.kmeans(sample_embeddings, K, options);
  const sample_rowids = new Set();

  for (const centroid of clustering.centroids) {
    const { rowids } = await ipcRenderer.invoke('faiss-search', centroid, 3);

    for (const rowid of rowids) {
      if (sample_rowids.has(rowid) == false) {
        sample_rowids.add(rowid);
        break;
      }
    }
  }

  return DB_MODULE.Get_Tagging_Records_From_ROWIDs_BigInt([...sample_rowids]);
}

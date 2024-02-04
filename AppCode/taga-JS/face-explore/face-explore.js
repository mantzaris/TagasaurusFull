const { ipcRenderer } = require('electron');
const mlKmeans = require('ml-kmeans');
const { GENERAL_HELPER_FNS } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js'));

const alpha_numeric_chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const play_icon_path = PATH.join(__dirname, '..', 'Assets', 'various-icons', 'videoplay512.png');

const container = document.getElementById('network-view');
const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);

const fileNamesSet = new Set();

let network_data;
let network_options;
let id2filename_map = new Map();
let containerWidth = container.offsetWidth;
let containerHeight = container.offsetHeight;
let springLength = containerWidth * 0.4;

const init_radius = Math.min(containerHeight, containerWidth) * 0.5;
const bias = 1.0;
let spawn_num = 8;
let candidate_num = 25;
let FAISS_SEARCH_SIZE = 100;

async function Initial_Node_Selection() {
  Show_Loading_Spinner();

  const init_records = await Centroid_Face_Sample_Records(); //records with faces from centroids of samples

  if (!init_records) {
    return;
  }

  let rand_node_ids = Array.from({ length: init_records.length }, () => Rand_Node_ID());

  for (const [index, record] of init_records.entries()) {
    const imagePath = GENERAL_HELPER_FNS.Full_Path_From_File_Name(record.fileName);
    const nodeId = rand_node_ids[index];
    const sibling_ids = rand_node_ids.filter((id) => id !== nodeId);

    const angle = (2 * Math.PI * index) / init_records.length; //angle for each node
    const node_x = init_radius * Math.cos(angle);
    const node_y = init_radius * Math.sin(angle);

    fileNamesSet.add(record.fileName);

    if (record.fileType == 'video') {
      //select random face descriptor from the available
      const selected_face_descriptor = record.faceDescriptors[Math.floor(Math.random() * record.faceDescriptors.length)];
      Add_Node_To_Network(nodeId, play_icon_path, node_x, node_y);

      id2filename_map.set(nodeId, { fileName: record.fileName, descriptor: selected_face_descriptor, parent: undefined, siblings: sibling_ids });
      continue;
    }

    //IMAGE or GIF
    const faces = await Get_Image_Face_Descriptors_From_File(imagePath); //needs to run face api fresh to get the detection box coordinates which the DB does not store
    let face;

    if (!faces || faces.length == 0) {
      //gif where frame 1 has no face
      const selected_face_descriptor = record.faceDescriptors[Math.floor(Math.random() * record.faceDescriptors.length)];
      Add_Node_To_Network(nodeId, play_icon_path, node_x, node_y);

      id2filename_map.set(nodeId, { fileName: record.fileName, descriptor: selected_face_descriptor, parent: undefined, siblings: sibling_ids });
      continue;
    } else if (faces.length == 1) {
      face = faces[0];
    } else {
      face = faces[Math.floor(Math.random() * faces.length)];
    }

    const { x, y, width, height } = face.detection.box; //make a face from the detection box
    const faceThumbnailUrl = await Detection_Face_URL(x, y, width, height, imagePath);

    Add_Node_To_Network(nodeId, faceThumbnailUrl, node_x, node_y);

    id2filename_map.set(nodeId, { fileName: record.fileName, descriptor: face.descriptor, parent: undefined, siblings: sibling_ids });
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
async function Network_OnClick_Handler(params) {
  const nodeId = params.nodes[0];

  if (nodeId) {
    //if one or more nodes selected
    const connectedEdges = network_data.edges.get({
      filter: (edge) => {
        return edge.from === nodeId;
      },
    });

    //it is a leaf node without connections outwards, then spawn leaf
    if (connectedEdges.length === 0) {
      await Spawn_Children(nodeId);
    }

    //display the clicked node image/video etc separately
    Present_Node_Locality(nodeId);
  }
}

//
async function Spawn_Children(parentNodeId) {
  const parentNodePosition = network.getPositions([parentNodeId])[parentNodeId];
  const parent_data = id2filename_map.get(parentNodeId);
  const parent_node = nodes.get(parentNodeId);

  const mid_pnt_embeddings = [];
  const mid_pnt_records = [];
  const childIds = [];

  ////////////////////////////////////////////////////////////////////////////////////////////
  //parent-parent, grandparent, midpoint, produces a single child, most important child
  //it is the difference between the node and the parent to produce a new node: Child_1
  ////////////////////////////////////////////////////////////////////////////////////////////
  if (parent_data.parent) {
    const grand_parent_data = id2filename_map.get(parent_data.parent);
    const grand_parent_embedding = grand_parent_data.descriptor;

    const mid_pnt_embedding = Normalized_Embedding_Midpoint(parent_data.descriptor, grand_parent_embedding);

    const { rowids, distances } = await ipcRenderer.invoke('faiss-search', mid_pnt_embedding, FAISS_SEARCH_SIZE);
    let rowids_sorted = GENERAL_HELPER_FNS.Sort_Based_On_Scores_DES(distances, rowids); //TODO: test if this makes it better or not!!!

    for (const rowid of rowids) {
      const mid_pnt_record = DB_MODULE.Get_Tagging_Records_From_ROWIDs_BigInt(rowid)[0];
      //skip repetitions that are not direct clones
      if (mid_pnt_record.fileName != parent_data.fileName && !fileNamesSet.has(mid_pnt_record.fileName)) {
        //console.log(mid_pnt_record);
        //mid_pnt_embeddings.push(mid_pnt_embedding);
        const ind = Closest_Embedding_Index(mid_pnt_embedding, mid_pnt_record.faceDescriptors);
        mid_pnt_embeddings.push(mid_pnt_record.faceDescriptors[ind]);
        mid_pnt_records.push(mid_pnt_record);
        childIds.push(Rand_Node_ID());
        fileNamesSet.add(mid_pnt_record.fileName);
        break;
      }
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////
  //sibling midpoint candidates, siblings of Child_1, midpoints from parent to its siblings
  //make the seed points for the new
  ////////////////////////////////////////////////////////////////////////////////////////////
  for (const sibling_id of parent_data.siblings) {
    const parent_sibling_embedding = id2filename_map.get(sibling_id).descriptor;
    const mid_pnt_embedding = Normalized_Embedding_Midpoint(parent_data.descriptor, parent_sibling_embedding);
    const { rowids, distances } = await ipcRenderer.invoke('faiss-search', mid_pnt_embedding, FAISS_SEARCH_SIZE);
    let rowids_sorted = GENERAL_HELPER_FNS.Sort_Based_On_Scores_DES(distances, rowids); //TODO: test if this makes it better or not!!!

    for (const rowid of rowids) {
      const mid_pnt_record = DB_MODULE.Get_Tagging_Records_From_ROWIDs_BigInt(rowid)[0];
      //skip repetitions that are not direct clones

      if (
        mid_pnt_record.fileName == parent_data.fileName ||
        mid_pnt_records.some((r) => r.fileName === mid_pnt_record.fileName) ||
        fileNamesSet.has(mid_pnt_record.fileName)
      ) {
        continue;
      }

      //mid_pnt_embeddings.push(mid_pnt_embedding);
      const ind = Closest_Embedding_Index(mid_pnt_embedding, mid_pnt_record.faceDescriptors);
      mid_pnt_embeddings.push(mid_pnt_record.faceDescriptors[ind]);
      mid_pnt_records.push(mid_pnt_record);
      childIds.push(Rand_Node_ID());
      fileNamesSet.add(mid_pnt_record.fileName);
      //child_distances.push(distances[index]);
      break;
    }
  }

  //clone parent, see siblings but siblings don't see it for midpoints
  const node_x = parentNodePosition.x + Rand_Axis_Dim(); //(Math.random() - 0.5);
  const node_y = parentNodePosition.y + Rand_Axis_Dim(); //(Math.random() - 0.5);
  const self_clone_Id = Rand_Node_ID();
  Add_Node_To_Network(self_clone_Id, parent_node.image, node_x, node_y, true, parentNodeId);
  id2filename_map.set(self_clone_Id, { fileName: parent_data.fileName, descriptor: parent_data.descriptor, parent: undefined, siblings: childIds, label: '0' });
  //fileNamesSet.add(parent_data.fileName);

  //add the non-cloned children
  for (let i = 0; i < childIds.length; i++) {
    const childId = childIds[i];
    const child_sibling_ids = childIds.filter((id) => id !== childId);
    const midpoint_record = mid_pnt_records[i];
    const mid_pnt_embedding = mid_pnt_embeddings[i];

    const node_x = parentNodePosition.x + Rand_Axis_Dim(); //(Math.random() - 0.5);
    const node_y = parentNodePosition.y + Rand_Axis_Dim(); //(Math.random() - 0.5);

    if (midpoint_record.fileType == 'video') {
      //const mid_pnt_descriptor = midpoint_record.faceDescriptors[Math.floor(Math.random() * midpoint_record.faceDescriptors.length)];

      Add_Node_To_Network(childId, play_icon_path, node_x, node_y, true, parentNodeId);
      id2filename_map.set(childId, { fileName: midpoint_record.fileName, descriptor: mid_pnt_embedding, parent: parentNodeId, siblings: child_sibling_ids });
      continue;
    }

    const imagePath = GENERAL_HELPER_FNS.Full_Path_From_File_Name(midpoint_record.fileName);

    //IMAGE or GIF
    const faces = await Get_Image_Face_Descriptors_From_File(imagePath); //needs to run face api fresh to get the detection box coordinates which the DB does not store
    let face;

    if (!faces || faces.length == 0) {
      //const mid_pnt_descriptor = midpoint_record.faceDescriptors[Math.floor(Math.random() * midpoint_record.faceDescriptors.length)];

      Add_Node_To_Network(childId, play_icon_path, node_x, node_y, true, parentNodeId);
      id2filename_map.set(childId, { fileName: midpoint_record.fileName, descriptor: mid_pnt_embedding, parent: parentNodeId, siblings: child_sibling_ids });
      continue;
    } else if (faces.length == 1) {
      face = faces[0];
    } else {
      let minDistance = Infinity;
      for (const faceTmp of faces) {
        const embedding_distance_tmp = L2_Distance(faceTmp.descriptor, mid_pnt_embedding);
        if (embedding_distance_tmp < minDistance) {
          minDistance = embedding_distance_tmp;
          face = faceTmp;
        }
      }
      //face = faces[Math.floor(Math.random() * faces.length)];
    }

    const { x, y, width, height } = face.detection.box; //make a face from the detection box
    const faceThumbnailUrl = await Detection_Face_URL(x, y, width, height, imagePath);

    Add_Node_To_Network(childId, faceThumbnailUrl, node_x, node_y, true, parentNodeId);
    id2filename_map.set(childId, { fileName: midpoint_record.fileName, descriptor: mid_pnt_embedding, parent: parentNodeId, siblings: child_sibling_ids });
  }
}

function L2_Distance(vecA, vecB) {
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += (vecA[i] - vecB[i]) ** 2;
  }
  return Math.sqrt(sum);
}

function Raw_Embedding_Midpoint(embedding1, embedding2) {
  // Find the raw midpoint
  const bias = 1.5;
  const midpoint = embedding1.map((element, index) => (bias * element + embedding2[index]) / 2);
  return midpoint;
}

function Normalized_Embedding_Midpoint(embedding1, embedding2) {
  //find the midpoint
  const midpoint = embedding1.map((element, index) => (bias * element + embedding2[index]) / 2);
  //magnitude (length) of the midpoint vector
  const magnitude = Math.sqrt(midpoint.reduce((acc, val) => acc + val * val, 0));
  //normalize the midpoint vector to turn it into a unit vector
  return midpoint.map((element) => element / magnitude);
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
function Add_Node_To_Network(childId, image_url = play_icon_path, node_x, node_y, isUpdate = false, parentNodeId = undefined, label = undefined) {
  const newNode = {
    id: childId,
    shape: 'image',
    image: image_url,
    x: node_x,
    y: node_y,
    label: '',
  };

  if (isUpdate) {
    network_data.nodes.add(newNode);
    if (parentNodeId !== undefined) {
      network_data.edges.add({ from: parentNodeId, to: childId });
    }
  } else {
    nodes.add(newNode);
  }
}

window.addEventListener('resize', () => {
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

document.addEventListener('DOMContentLoaded', () => {
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
        springConstant: 0.5,
        damping: 0.4,
        avoidOverlap: 0.9,
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

function Closest_Embedding_Index(mid_pnt_embedding, descriptors) {
  let minDistance = Infinity;
  let minIndex = -1;

  for (let i = 0; i < descriptors.length; i++) {
    const distance = L2_Distance(mid_pnt_embedding, descriptors[i]);

    if (distance < minDistance) {
      minDistance = distance;
      minIndex = i;
    }
  }

  return minIndex;
}

function Rand_Axis_Dim() {
  let random = Math.random();
  if (random < 0.5) {
    return random * 0.5 - 0.7;
  } else {
    return random * 0.5 + 0.2;
  }
}

const { GENERAL_HELPER_FNS } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js'));
const { ipcRenderer } = require('electron');

const default_filename = 'friendsCropped.jpg';
const alpha_numeric_chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

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
const spawn_num = 8;
const candidate_num = 25;

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

async function Initial_Node_Selection() {
  Show_Loading_Spinner();
  const sample_records = DB_MODULE.Tagging_Random_DB_Records_With_Faces(spawn_num);

  for (const [index, record] of sample_records.entries()) {
    const angle = (2 * Math.PI * index) / sample_records.length; //angle for each node
    const node_x = init_radius * Math.cos(angle);
    const node_y = init_radius * Math.sin(angle);

    const childId = Rand_Node_ID();

    if (record.fileType != 'image') {
      const label_tmp = record.fileType;
      nodes.add({
        id: childId,
        shape: 'box',
        label: label_tmp,
        x: node_x,
        y: node_y,
      });

      const descriptors = JSON.parse(record.faceDescriptors);
      const desciptor = descriptors[Math.floor(Math.random() * descriptors.length)];

      id2filename_map.set(childId, { fileName: record.fileName, descriptor: desciptor });
    } else {
      const imagePath = GENERAL_HELPER_FNS.Full_Path_From_File_Name(record.fileName);
      const faces = await Get_Image_Face_Descriptors_From_File(imagePath); //needs to run face api fresh to get the detection box coordinates which the DB does not store
      let face;

      if (!faces) {
        continue;
      } else if (faces.length == 1) {
        face = faces[0];
      } else {
        face = faces[Math.floor(Math.random() * faces.length)];
      }

      const { x, y, width, height } = face.detection.box;
      const faceThumbnailUrl = await Detection_Face_URL(x, y, width, height, imagePath);

      nodes.add({
        id: childId,
        shape: 'image',
        image: faceThumbnailUrl,
        x: node_x,
        y: node_y,
      });

      //mapping later on helps us know details about the image from the node id
      id2filename_map.set(childId, { fileName: record.fileName, descriptor: face.descriptor });
    }
  }

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

    console.log(id2filename_map.get(nodeId));

    //it is a leaf node without connections outwards
    if (connectedEdges.length === 0) {
      //Spawn_Children(nodeId);
    }

    //display the clicked node image/video etc separately
    Present_Node_Locality(nodeId);
  }
}

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
  const charactersLength = alpha_numeric_chars.length;
  for (let i = 0; i < length; i++) {
    result += alpha_numeric_chars.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

////////////////////////////////////////////
//UI interactivity
////////////////////////////////////////////
document.getElementById('restart-btn').onclick = () => {
  nodes.clear();
  edges.clear();
  id2filename_map.clear();

  Initial_Node_Selection();
};

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

  // search_results_output.innerHTML += search_display_inner_tmp;

  // search_results.forEach((file) => {
  //   if (FS.existsSync(`${TAGA_DATA_DIRECTORY}${PATH.sep}${file}`) == true) {
  //     document.getElementById(`modal-image-search-result-single-image-img-id-${file}`).onclick = async function () {
  //       const search_res_children = document.getElementById('modal-search-images-results-grid-div-area-id').children;
  //       const search_meme_res_children = document.getElementById('modal-search-meme-images-results-grid-div-area-id').children;
  //       const children_tmp = [...search_res_children, ...search_meme_res_children];
  //       GENERAL_HELPER_FNS.Pause_Media_From_Modals(children_tmp);
  //function Pause_Media_From_Modals() {
  //       current_image_annotation = DB_MODULE.Get_Tagging_Record_From_DB(file);
  //       Load_State_Of_Image_IDB();
  //       document.getElementById('search-modal-click-top-id').style.display = 'none';
  //     };
  //   }
  // });

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

Initialize();

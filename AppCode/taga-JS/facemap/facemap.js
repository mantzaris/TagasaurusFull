const PATH = require('path');
const { DB_MODULE, GENERAL_HELPER_FNS } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js'));
const { Full_Path_From_File_Name, Clamp } = require(PATH.join(__dirname, '..', 'AppCode', 'taga-JS', 'utilities', 'general-helper-fns.js'));

const toggle_element = document.getElementById('check1');
const size_element = document.getElementById('size');
const container = document.getElementById('mynetwork');

const settings = {
  show_selected_thumbnails: [],
  show_image_thumbnail: false,
  image_size: 10,
};

let network;

size_element.addEventListener('change', (ev) => {
  settings.image_size = Clamp(parseInt(size_element.value), size_element.min, size_element.max);
  size_element.value = settings.image_size;
  Generate_Face_Map(Object.assign(settings));
});

toggle_element.addEventListener('click', () => {
  const checked = toggle_element.checked;
  settings.show_image_thumbnail = checked;
  Generate_Face_Map(Object.assign(settings));
});

const id_map = new Map();

function Get_Node_Info_From_ID(id) {
  for (const val of id_map.values()) {
    if (val.id == id) return val;
  }
}

function Select_Cluster_Thumbnail(cluster) {
  return cluster.thumbnail ? cluster.thumbnail : Array.from(Object.keys(cluster.images))[0];
}

async function Generate_Face_Map(settings) {
  const all_face_clusters = await DB_MODULE.Get_All_FaceClusters();
  const all_images = [...new Set(all_face_clusters.flatMap((c) => Object.keys(c.images)))];

  for (const image of all_images) {
    const id = id_map.has(image) ? id_map.get(image).id : crypto.randomUUID();
    id_map.set(image, {
      id,
      image,
    });
  }

  for (const cluster of all_face_clusters) {
    const id = id_map.has(cluster.rowid) ? id_map.get(cluster.rowid).id : crypto.randomUUID();
    id_map.set(cluster.rowid, {
      id,
      cluster,
    });
  }

  const face_ids = new Set();
  const face_cluster_ids = all_face_clusters.map((fc) => fc.rowid);

  let face_cluster_nodes = [];
  let face_cluster_edges = [];

  for (const cluster of all_face_clusters) {
    const images = Object.keys(cluster.images);
    const image = images[Math.floor(Math.random() * images.length)];

    const node = {
      id: id_map.get(cluster.rowid).id,
      label: cluster.rowid,
      shape: 'image',
      size: 20,
      image: Full_Path_From_File_Name(Select_Cluster_Thumbnail(cluster)),
    };

    face_cluster_nodes.push(node);

    const available_edges = face_cluster_ids.filter((fc_id) => fc_id != cluster.rowid);
    const length = 250; // Math.ceil(Math.random() * 75) + 25;
    const from = id_map.get(cluster.rowid).id;

    for (const to of available_edges) {
      face_cluster_edges.push({ from, to: id_map.get(to).id, length });
    }

    for (const to of images) {
      face_cluster_edges.push({ from, to: id_map.get(to).id, length: 40 });
    }

    for (const image of images) {
      const node = {
        id: id_map.get(image).id,
        size: settings.image_size,
        shape: 'dot',
        color: '#000',
      };

      if (settings.show_image_thumbnail || settings.show_selected_thumbnails.includes(image)) {
        node.shape = 'image';
        node.image = Full_Path_From_File_Name(image);
      }

      if (!face_ids.has(image)) {
        face_cluster_nodes.push(node);
        face_ids.add(image);
      }
    }
  }

  const nodes = new vis.DataSet(face_cluster_nodes);

  let edges = new vis.DataSet(face_cluster_edges);

  let data = {
    nodes: nodes,
    edges: edges,
  };
  let options = {
    edges: {
      selectionWidth: 1,
      smooth: {
        enabled: false,
      },
    },
    nodes: {},
  };

  network = new vis.Network(container, data, options);

  network.on('selectNode', async (ev) => {
    const node_id = ev.nodes[0];
    const selected = Get_Node_Info_From_ID(node_id);
    console.log(selected);
    if (selected.image) {
      settings.show_selected_thumbnails = [];
      GENERAL_HELPER_FNS.Goto_Tagging_Entry(selected.image);
    }

    if (selected.cluster) {
      const child_nodes = Object.keys(selected.cluster.images);
      settings.show_selected_thumbnails = child_nodes;
      network.storePositions();
      //await Generate_Face_Map(Object.assign({}, settings));
      ShowClusterInfoModal(selected);
    }
  });
}

function ShowClusterInfoModal(selected) {
  const { cluster, id } = selected;
  const modal = document.getElementById('cluster-modal');
  document.getElementById('cluster-modal-id').innerText = cluster.rowid;
  modal.classList.remove('hidden');

  const pos = CanvasToWindowXY(network.getPosition(id), document.querySelector('canvas'));
  modal.style.left = `${pos.x}px`;
  modal.style.top = `${pos.y}px`;

  const images = Array.from(Object.keys(cluster.images));
  const thumbnail = Full_Path_From_File_Name(Select_Cluster_Thumbnail(cluster));
  document.getElementById('cluster-modal-img').src = thumbnail;

  const list = document.getElementById('cluster-modal-list');
  console.log(list);
  list.innerHTML = '';

  images.forEach((image, index) => {
    console.log(image, index);
    const is_thumbnail = cluster.thumbnail === image || (!cluster.thumbnail && index == 0);
    list.appendChild(CreateClusterRelatedThumbnail(selected, image, is_thumbnail));
  });
}

function CreateClusterRelatedThumbnail(selected, filename, is_thumbnail = false) {
  const li = document.createElement('div');
  const thumbnail_class = is_thumbnail ? ['favorite-thumbnail', 'filled-star'] : ['favorite-thumbnail'];
  const thumbnail = is_thumbnail ? '★' : '☆';
  li.classList.add(['row']);

  const col3 = document.createElement('div');
  col3.classList.add('col-3');
  const col9 = document.createElement('div');
  col9.classList.add(...['col-9', 'force-right']);

  const img = document.createElement('img');
  img.src = Full_Path_From_File_Name(filename);
  img.className = 'rounded img-thumbnail cluster-thumbnail-sm';

  const thumbnail_div = document.createElement('div');
  thumbnail_div.innerHTML = thumbnail;
  thumbnail_div.classList.add(...thumbnail_class);

  li.appendChild(col3);
  li.appendChild(col9);
  col3.appendChild(img);
  col9.appendChild(thumbnail_div);

  img.onclick = () => GENERAL_HELPER_FNS.Goto_Tagging_Entry(filename);

  thumbnail_div.onclick = async () => {
    await DB_MODULE.Update_FaceCluster_Thumbnail(selected.cluster.rowid, filename);
    selected.cluster.thumbnail = filename;
    ShowClusterInfoModal(selected);
  };

  return li;
}

function CanvasToWindowXY(pos, canvas) {
  const canvas_rect = canvas.getBoundingClientRect();
  const canvas_w = canvas_rect.width;
  const canvas_h = canvas_rect.height;

  //translate position into canvas position
  const cpos_x = Math.floor(canvas_w / 2) + pos.x;
  const cpos_y = Math.floor(canvas_h / 2) + pos.y;

  // translate into screen space positions
  const x = canvas_rect.x + cpos_x;
  const y = canvas_rect.y + cpos_y;

  return { x, y };
}

Generate_Face_Map(settings);

const PATH = require('path');
const { DB_MODULE } = require(PATH.join(__dirname, '..', 'constants', 'constants-code.js'));
const { Full_Path_From_File_Name, Clamp } = require(PATH.join(__dirname, '..', 'AppCode', 'taga-JS', 'utilities', 'general-helper-fns.js'));

const toggle_element = document.getElementById('check1');
const size_element = document.getElementById('size');
const container = document.getElementById('mynetwork');

const settings = {
  show_image_thumbnail: false,
  image_size: 10,
};

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

async function Generate_Face_Map(settings) {
  const all_face_clusters = await DB_MODULE.Get_All_FaceClusters();
  const face_ids = new Set();
  const face_cluster_ids = all_face_clusters.map((fc) => fc.rowid);

  let face_cluster_nodes = [];
  let face_cluster_edges = [];

  for (const cluster of all_face_clusters) {
    const images = Object.keys(cluster.images);
    const image = images[Math.floor(Math.random() * images.length)];
    const node = {
      id: cluster.rowid,
      label: cluster.rowid,
      shape: 'image',
      size: 20,
      image: Full_Path_From_File_Name(image),
    };

    face_cluster_nodes.push(node);

    const available_edges = face_cluster_ids.filter((fc_id) => fc_id != cluster.rowid);
    const length = 250; // Math.ceil(Math.random() * 75) + 25;
    const from = cluster.rowid;

    for (const to of available_edges) {
      face_cluster_edges.push({ from, to, length });
    }

    for (const to of images) {
      face_cluster_edges.push({ from, to, length: 40 });
    }

    for (const image of images) {
      const node = {
        id: image,
        size: settings.image_size,
        shape: 'dot',
        color: '#000',
      };

      if (settings.show_image_thumbnail) {
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

  let network = new vis.Network(container, data, options);
}

Generate_Face_Map(settings);

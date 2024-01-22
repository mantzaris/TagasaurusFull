const default_image = PATH.join(__dirname, '..', 'Taga.png');
// Sample tree data with multiple roots
const treeData = {
  name: 'invisibleRoot',
  children: Array.from({ length: 10 }, (_, i) => ({ name: `root${i + 1}`, children: [] })),
};

// Dimensions for the SVG container
const width = 800;
const height = 600;

// Function to position nodes horizontally
function positionNodes(nodes) {
  const nodeWidth = 100;
  const spacing = 20;
  nodes.forEach((node, index) => {
    node.x = 0;
    node.y = index * (nodeWidth + spacing);
  });
}

// Zoom behavior
function zoomed(event) {
  svgGroup.attr('transform', event.transform);
}

let zoom;

// Drag behavior
function dragged(event, d) {
  d3.select(this).attr('transform', `translate(${event.x},${event.y})`);
}

let drag;

// Initialize the chart
function Init_FaceExplore_D3() {
  const svgWidth = document.querySelector('#d3-view').clientWidth;
  const svgHeight = document.querySelector('#d3-view').clientHeight;
  const svg = d3.select('#d3-view').append('svg').attr('width', svgWidth).attr('height', svgHeight);

  const svgGroup = svg.append('g');

  // Zoom behavior
  const zoom = d3
    .zoom()
    .scaleExtent([0.5, 10])
    .on('zoom', (event) => {
      svgGroup.attr('transform', event.transform);
    });

  svg.call(zoom);

  // Drag behavior
  const drag = d3.drag().on('drag', (event, d) => {
    d3.select(this).attr('transform', `translate(${event.x},${event.y})`);
  });

  const root = d3.hierarchy(treeData);
  positionNodes(root.descendants());

  const node = svgGroup
    .selectAll('.node')
    .data(root.descendants().slice(1))
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', (d) => `translate(${d.y},${d.x})`)
    .call(drag);

  node.append('image').attr('xlink:href', default_image).attr('width', 20).attr('height', 20).attr('x', -25).attr('y', -25);
}

document.addEventListener('DOMContentLoaded', Init_FaceExplore_D3);

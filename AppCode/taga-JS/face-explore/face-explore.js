const default_image = PATH.join(__dirname, '..', 'fd2.jpg');
// Sample tree data with multiple roots
const treeData = {
  name: 'invisibleRoot',
  children: Array.from({ length: 10 }, (_, i) => ({ name: `root${i + 1}`, children: [] })),
};

function positionNodes(nodes, svgWidth, svgHeight, maxImageWidth, maxImageHeight) {
  const startY = svgHeight * 0.2; // Start at 20% of the SVG height
  const spacing = maxImageWidth * 0.5; // Half the width of an image as spacing

  nodes.forEach((node, index) => {
    node.x = startY;
    node.y = index * (maxImageWidth + spacing);
  });
}

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
  const container = document.querySelector('#d3-view');
  const svgWidth = container.clientWidth;
  const svgHeight = container.clientHeight;

  const maxImageWidth = svgWidth * 0.06; // 6% of the SVG's width
  const maxImageHeight = svgHeight * 0.08; // 8% of the SVG's height

  const svg = d3.select('#d3-view').append('svg').attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`).attr('width', '100%').attr('height', '100%');

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
  positionNodes(root.descendants(), svgWidth, svgHeight, maxImageWidth, maxImageHeight);

  const node = svgGroup
    .selectAll('.node')
    .data(root.descendants().slice(1))
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', (d) => `translate(${d.y},${d.x})`)
    .call(drag);

  node
    .append('image')
    .attr('xlink:href', default_image)
    .attr('width', maxImageWidth)
    .attr('height', maxImageHeight)
    .attr('x', -maxImageWidth / 2)
    .attr('y', -maxImageHeight / 2);
}

document.addEventListener('DOMContentLoaded', Init_FaceExplore_D3);

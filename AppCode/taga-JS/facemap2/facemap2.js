console.log('hi');

document.addEventListener('DOMContentLoaded', function () {
  // Sample data
  var data = [4, 8, 15, 16, 23, 42];

  // Create a linear scale for the y-axis
  var scale = d3
    .scaleLinear()
    .domain([0, d3.max(data)])
    .range([0, 420]);

  d3.select('.chart')
    .selectAll('div')
    .data(data)
    .enter()
    .append('div')
    .style('width', function (d) {
      return scale(d) + 'px';
    })
    .text(function (d) {
      return d;
    });
});

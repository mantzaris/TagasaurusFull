var slideIndexBS = 1;

const fs = require('fs');
const { Z_BLOCK } = require('zlib');
const dir = './images'
const files = fs.readdirSync(dir)

showDivsBS(slideIndexBS);

function plusDivsBS(n) {
    showDivsBS(slideIndexBS += n);
}

function showDivsBS(n) {
    var i;
    var x = document.getElementsByClassName("carousel-item");
    if (n > files.length) {slideIndexBS = 1}
    if (n < 1) {slideIndexBS = files.length} ;
     
    x[0].style.display = "block";
  
    document.getElementById('img1').src = `./images/${files[slideIndexBS - 1]}`;
        
}
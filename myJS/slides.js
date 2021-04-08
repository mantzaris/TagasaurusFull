var slideIndexBS = 1;

const fs = require('fs');
const dir = './images'
const files = fs.readdirSync(dir)

showDivsBS(slideIndexBS);

function plusDivsBS(n) {
    showDivsBS(slideIndexBS += n);
}

function showDivsBS(n) {    
    if (n > files.length) {slideIndexBS = 1}
    if (n < 1) {slideIndexBS = files.length} ;
          
    document.getElementById('img1').src = `./images/${files[slideIndexBS - 1]}`;
        
}

function processTags() {
    
    user_description = document.getElementById('descriptionInput').value
    console.log(user_description)
    document.getElementById('tagArea').value = user_description;
}

const keywords_only_description = "Displays keywords related to faces stored. Finds images/videos/gifs containing a similar face and displays the keywords from the description."
const keywords_images_description = "Displays keywords and images related to faces stored. Finds images/videos/gifs containing a similar face and displays the keywords from the description. Images containing the face with a match are also shown."
const keywords_images_memes_description = "Displays keywords, images and memes related to faces stored. Finds images/videos/gifs containing a similar face and displays the keywords from the description as well as images containing the face with a match. Connected memes will also be presented."


const continue_btn = document.getElementById("continue-btn")
const main_menu_btn = document.getElementById("main-menu-btn")
const selection_set = document.getElementById("search-type")
const selection_description = document.getElementById("stream-type-description")
selection_description.innerText = keywords_only_description
selection_set.onchange = () => {
    console.log("new selection")
    console.log(`new selection is = ${selection_set.value}`)
    if( selection_set.value == "keywords-only" ) {
        selection_description.innerText = keywords_only_description
    } else if( selection_set.value == "keywords-images" ) {
        selection_description.innerText = keywords_images_description
    } else if( selection_set.value == "keywords-images-memes" ) {
        selection_description.innerText = keywords_images_memes_description
    } 
}



continue_btn.onclick = () => {
    Init()
}
main_menu_btn.onclick = () => {
    location.href = "welcome-screen.html";
}


function Keywords_Only() {
}
function Keywords_Images() {
}
function Keywords_Images_Memes() {
}



function Init() {

    let selection = selection_set.value

    if( selection == "keywords-only" ) {
        Keywords_Only()
    } else if ( selection == "keywords-images" ) {
        Keywords_Images()
    } else {
        Keywords_Images_Memes()
    }

    document.getElementById("selection-screen").style.display = 'none'
    document.getElementById("stream-view").style.display = 'block'



}



async function testing() {

    let width
    let height
    let data
    let stream

    document.getElementById("stream-view").style.display = 'block'
    let video = document.getElementById("inputVideo")
    let canvas = document.getElementById("overlay")
    canvas.style.display = 'block'
    const ctx = canvas.getContext('2d');
    let photo = document.createElement('img')    

    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(function(s) {
        stream = s
        video.srcObject = stream;
        video.play();
    })
    .catch(function(err) {
        console.log("An error occurred in the navigator.mediaDevices.getUserMedia: " + err);
        alert('please connect webcam, then come back')
        location.href = "welcome-screen.html";
    });
    
    let streaming
    setTimeout(setInterval(Draw_Descriptors),3000)

    video.addEventListener('canplay', function(ev){
        if (!streaming) {
            height = video.videoHeight
            width = video.videoWidth;
            video.setAttribute('width', width);
            video.setAttribute('height', height);
            canvas.setAttribute('width', width);
            canvas.setAttribute('height', height);
            streaming = true;
        }
    }, false);

    function Take_Picture() {    
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(video, 0, 0, width, height);
        data = canvas.toDataURL('image/png');
        photo.setAttribute('src', data);
    }

    async function Draw_Descriptors() {
        if( canvas.width > 0 && canvas.height >0 ) {
            Take_Picture()
            const detections = await faceapi.detectAllFaces(photo)
            console.log(detections)

            for( const face of detections ){
                const {x,y,width,height} = face.box
                ctx.beginPath()
                ctx.rect(x,y,width*1.4,height*1.4)
                ctx.strokeStyle = 'red'
                ctx.lineWidth = '8'
                ctx.stroke()    

            }
            
        }
    }
}
testing()






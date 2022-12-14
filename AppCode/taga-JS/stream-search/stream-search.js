
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



continue_btn.onclick = async () => {
    Init()
    let stream_ok = await Set_Stream()
    if(!stream_ok) { return }
    testing()    
    
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



let stream
let video = document.getElementById("inputVideo")

async function Set_Stream() {
    let stream_ok = false
    try { 
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }) 
        video.srcObject = stream;
        video.play();
        stream_ok = true
    } catch (e) { 
        console.log("An error occurred in the navigator.mediaDevices.getUserMedia: " + err);
        alert('please connect webcam for this option')
        stream_ok = false
    }
    return stream_ok
}


async function testing() {

    let width
    let height
    let data    

    document.getElementById("stream-view").style.display = 'block'
    video.style.display = 'none'
    
    let canvas = document.getElementById("overlay")
    canvas.style.display = 'block'
    const ctx = canvas.getContext('2d');
    let photo = document.createElement('img')    

    let worker
    let streaming
    let interval
    let detections = []

    video.addEventListener('canplay', function(ev){
        if (!streaming) {
            height = video.videoHeight
            width = video.videoWidth;
            video.setAttribute('width', width);
            video.setAttribute('height', height);
            canvas.setAttribute('width', width);
            canvas.setAttribute('height', height);
            streaming = true;
            //worker = new Worker( './taga-JS/stream-search/stream-worker.js')
            //requestAnimationFrame(Draw_Descriptors)
            //interval = setInterval( Draw_Descriptors  )
            Draw_Descriptors()
            //interval = setInterval( Set_Detections_Interval )
        }
    }, false);
    // async function Set_Detections_Interval() {
    //     clearInterval(interval)
    //     detections = await faceapi.detectAllFaces(photo)//.withFaceLandmarks().withFaceDescriptors()
    //     setInterval(Set_Detections_Interval)
    // }

    function Take_Picture() {    
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(video, 0, 0, width, height);
        data = canvas.toDataURL('image/png');
        photo.setAttribute('src', data);
        //worker.postMessage(data)
    }

    const fps = 3
    const count_with_Descriptors = 4 // calculate the face descriptors every 3 detections to reduce the processing time
    let descriptor_count = 0
    let rect_face_array = []
    let rect_face = { x:0, y:0, width:0, height:0 }
    async function Detect_Faces() {
        let detectionsNEW
        if( descriptor_count == count_with_Descriptors ) {
            console.log('yes descriptors')
            detectionsNEW = await faceapi.detectAllFaces(photo).withFaceLandmarks().withFaceDescriptors()
            descriptor_count = 0
            rect_face_array = []
            for( const face of detectionsNEW ) {
                let {x,y,width,height} = face.detection.box // face.box
                let rect_face_tmp = JSON.parse(JSON.stringify(rect_face))
                rect_face_tmp.x = x - (width * 0.2)
                rect_face_tmp.y = y - (height * 0.2) 
                rect_face_tmp.width = width * 1.4
                rect_face_tmp.height = height * 1.4
                rect_face_array.push(rect_face_tmp)
            }
        } else {
            console.log('no descriptors')
            detectionsNEW = await faceapi.detectAllFaces(photo) //
            descriptor_count++
            rect_face_array = []
            for( const face of detectionsNEW ) {
                let {x,y,width,height} = face.box
                let rect_face_tmp = JSON.parse(JSON.stringify(rect_face))
                rect_face_tmp.x = x - (width * 0.2)
                rect_face_tmp.y = y - (height * 0.2) 
                rect_face_tmp.width = width * 1.4
                rect_face_tmp.height = height * 1.4
                rect_face_array.push(rect_face_tmp)
            }
        }        
    }
    setInterval( Detect_Faces , 1000/fps ) //ms = 1000/fps

    async function Draw_Descriptors() {        
        if( canvas.width > 0 && canvas.height > 0 ) {
            Take_Picture()
            for( const face_rect of rect_face_array ) {
                ctx.rect(face_rect.x,face_rect.y,face_rect.width,face_rect.height)
                ctx.strokeStyle = 'red'
                ctx.lineWidth = 5
                ctx.stroke()  
            }
        } else { }
        requestAnimationFrame(Draw_Descriptors)
    }
}







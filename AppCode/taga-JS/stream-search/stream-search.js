//const { max } = require("@tensorflow/tfjs-node")
const PATH = require('path');


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


const { DB_MODULE, TAGA_DATA_DIRECTORY, MAX_COUNT_SEARCH_RESULTS, SEARCH_MODULE, GENERAL_HELPER_FNS } = require(PATH.join(__dirname,'..','constants','constants-code.js')) // require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');
async function Tagging_Image_DB_Iterator() {
    return DB_MODULE.Tagging_Image_DB_Iterator();
}
async function Tagging_Random_DB_Images(num_of_records) {
    return DB_MODULE.Tagging_Random_DB_Images(num_of_records)
}
async function Get_Tagging_Annotation_From_DB(image_name) { //
    return await DB_MODULE.Get_Tagging_Record_From_DB(image_name);
}
async function Number_of_Tagging_Records() {
    return await DB_MODULE.Number_of_Tagging_Records()
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
    let rect_face_array = []
    let rect_face = { x:0, y:0, width:0, height:0, descriptor:[] }
    async function Detect_Faces() {
        let detectionsNEW
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
            rect_face_tmp.descriptor = face.descriptor
            rect_face_array.push(rect_face_tmp)
        }        
    }
    setInterval( Detect_Faces , 1000/fps ) //ms = 1000/fps

    let face_found = false
    let rect_face_selected = { x:0, y:0, width:0, height:0 }
    async function Draw_Descriptors() {        
        if( canvas.width > 0 && canvas.height > 0 ) {
            Take_Picture()
            //find the selected box by finding the closes x,y face to the selected face and update it as well
            let selected_face_ind = -1
            if( face_found == true && rect_face_array.length > 0 ) { //draw the selected box for which keywords exist
                dist_min = 10**6
                for( const [ind,face_rect] of rect_face_array.entries() ) { //get the index of the closest face rectangle to the selected face rectangle
                    let dist_tmp = Math.sqrt( (face_rect.x-rect_face_selected.x)**2 + (face_rect.y-rect_face_selected.y)**2 ) //find the min distance face and update the index for it
                    if( dist_tmp < dist_min ) {
                        dist_min = dist_tmp
                        selected_face_ind = ind
                    }
                }
                //update the position of the box for the face min rectangle
                rect_face_selected.x = rect_face_array[selected_face_ind].x
                rect_face_selected.y = rect_face_array[selected_face_ind].y
                rect_face_selected.width = rect_face_array[selected_face_ind].width
                rect_face_selected.height = rect_face_array[selected_face_ind].height
                
                ctx.beginPath()
                ctx.rect(rect_face_selected.x,rect_face_selected.y,rect_face_selected.width,rect_face_selected.height)
                ctx.setLineDash([])
                ctx.strokeStyle = 'red'
                ctx.lineWidth = 6
                ctx.stroke()
                
            }
            
            for( const [ind,face_rect] of rect_face_array.entries() ) { //draw rest of the faces not in selected
                if(selected_face_ind == ind) { continue }
                ctx.beginPath()
                ctx.rect(face_rect.x,face_rect.y,face_rect.width,face_rect.height)
                ctx.strokeStyle = 'red'
                ctx.setLineDash([16, 14]); //dashes are 5px and spaces are 3px
                ctx.lineWidth = 3
                ctx.stroke()  
            }
        } else { }
        requestAnimationFrame(Draw_Descriptors)
    }


    GenerateTable( )
    let db_search_delay = 2000 // in ms
    //let max_records = await Number_of_Tagging_Records() 
    let record_sample_num = 10 //Math.min( 1000 , Math.floor( 0.1 * max_records ) )
    let face_keywords = []
    async function face_db_search() { //will improve in next version !!!! XXX use tree based methods!!!
        face_keywords = []
        
        if( rect_face_array.length == 0 ) { return }
        let ref_face_tmp = rect_face_array[ Math.floor(Math.random()*rect_face_array.length) ]
        let ref_face_tmp_descriptor = ref_face_tmp.descriptor
        let sample_filenames = await Tagging_Random_DB_Images(record_sample_num)
        
        for( const filename_tmp of sample_filenames ) {

            let annotation_obj_tmp = await Get_Tagging_Annotation_From_DB(filename_tmp)
            let face_descriptors_tmp = annotation_obj_tmp["faceDescriptors"]
            if( face_descriptors_tmp.length == 0 ) continue 
            let score_tmp = await Get_Descriptors_DistanceScore( [ref_face_tmp_descriptor] , face_descriptors_tmp )
            console.log(`score_tmp = ${score_tmp}`)
            if( score_tmp  > 6 ) {
                face_keywords.push(...annotation_obj_tmp["taggingTags"])
                console.log(face_keywords)
            }
        
        }
        if( face_keywords.length > 0 ) { 
            console.log('in box position reset')
            face_found = true 
            rect_face_selected.x = ref_face_tmp.x
            rect_face_selected.y = ref_face_tmp.y
            rect_face_selected.width = ref_face_tmp.width
            rect_face_selected.height = ref_face_tmp.height
        }
        else { face_found = false }
        tableFiller( face_keywords ) 
        
        
    }
    setInterval( face_db_search , db_search_delay )

    function tableFiller( keywords = [] ) {
        const table = document.getElementById("tableK")
        for(let i=0;i<table.children.length;i++) {
            if(i<keywords.length) {
                table.children[i].firstChild.innerText = keywords[i]
            } else {
                table.children[i].firstChild.innerText = "*"
            }
        }
    }


}


function GenerateTable( countOfKeywords = 20 ) {
    const table = document.getElementById("tableK")
    for(let i=0;i<countOfKeywords;i++) {
        const td = document.createElement("td")
        const tr = document.createElement("tr")
        td.innerText = ""
        tr.appendChild(td)
        table.appendChild(tr)
    }
    
}




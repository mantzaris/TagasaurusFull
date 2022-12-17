//const { max } = require("@tensorflow/tfjs-node")
const PATH = require('path');


const keywords_only_description = "Displays keywords related to faces stored. Finds images/videos/gifs containing a similar face and displays the keywords from the description."
const keywords_images_description = "Displays keywords and images related to faces stored. Finds images/videos/gifs containing a similar face and displays the keywords from the description. Images containing the face with a match are also shown."
const keywords_images_memes_description = "Displays keywords, images and memes related to faces stored. Finds images/videos/gifs containing a similar face and displays the keywords from the description as well as images containing the face with a match. Connected memes will also be presented."

document.getElementById("stream-view1").style.display = 'none'
const continue_btn = document.getElementById("continue-btn")
const main_menu_btn = document.getElementById("main-menu-btn")
const selection_set = document.getElementById("search-type")
const selection_description = document.getElementById("stream-type-description")
const return_from_stream_btn = document.getElementById("return-stream-btn")
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


const { DB_MODULE, MAX_COUNT_SEARCH_RESULTS, SEARCH_MODULE, GENERAL_HELPER_FNS } = require(PATH.join(__dirname,'..','constants','constants-code.js')) // require(PATH.resolve()+PATH.sep+'constants'+PATH.sep+'constants-code.js');
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
    Stream_Search_Run()    
    
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
    document.getElementById("stream-view1").style.display = 'grid'
}
//user returns to stream search menu from the running search stream and needs to change the view and stop the stream
return_from_stream_btn.onclick = () => { 
    document.getElementById("stream-view1").style.display = 'none'
    document.getElementById("selection-screen").style.display = 'block'
    stream_ok = false
    clearInterval(face_keywords_interval)
    clearInterval(descriptors_interval)
    clearInterval(memory_loss_interval)
    stream.getTracks().forEach(function(track) {
        track.stop();
    });
}


let stream
let video = document.getElementById("inputVideo")
let stream_ok = false
let descriptors_interval
let face_keywords_interval


async function Set_Stream() {
    stream_ok = false
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

async function Stream_Search_Run() {

    let width
    let height
    let data    
    let keyword_div = document.getElementById("keyword-display1-div")

    video.style.display = 'none'
    
    let canvas = document.getElementById("overlay")
    // canvas.style.display = 'block'
    const ctx = canvas.getContext('2d');
    let photo = document.createElement('img')    

    let streaming

    video.addEventListener('canplay', function(ev){
        if (!streaming) {
            height = video.videoHeight
            width = video.videoWidth;
            video.setAttribute('width', width);
            video.setAttribute('height', height);
            canvas.setAttribute('width', width);
            canvas.setAttribute('height', height);
            streaming = true;
            Draw_Descriptors()
        }
    }, false);

    function Take_Picture() {    
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(video, 0, 0, width, height);
        data = canvas.toDataURL('image/png');
        photo.setAttribute('src', data);
    }

    //START: loop for the face detection and descriptors, runs in its own interval, supplies coordinates for the canvas drawing and descriptors for the db searching
    const fps = 3 //how often we run the face detection
    let rect_face_array = [] //storing the each face detected for that run of the face detection api (rewrites itself each time to be fresh)
    let rect_face = { x:0, y:0, width:0, height:0, descriptor:[] } //the outputs held from the faceapi run
    async function Detect_Faces() {
        let detections = await faceapi.detectAllFaces(photo).withFaceLandmarks().withFaceDescriptors() //array of faces detected, majority of the time is spent on detections of the faces (face box)
        rect_face_array = [] //reset the array for the new faces
        for( const face of detections ) {
            let {x,y,width,height} = face.detection.box //face.box if only face boxes are detected but with detection.box if landmarks and descriptors are taken
            let rect_face_tmp = JSON.parse(JSON.stringify(rect_face)) //clone object to make a new one
            rect_face_tmp.x = x - (width * 0.2) //shifting the box to be larger
            rect_face_tmp.y = y - (height * 0.2) //shifting the box to be larger
            rect_face_tmp.width = width * 1.4 //scaling the box to be larger
            rect_face_tmp.height = height * 1.4 //scaling the box to be larger
            rect_face_tmp.descriptor = face.descriptor
            rect_face_array.push(rect_face_tmp) //add this face to the array of faces to draw boxes over
        }
    }
    descriptors_interval = setInterval( Detect_Faces , 1000/fps ) //detect faces at a fixed interval, ms = 1000/fps
    //END: loop for the face detection and descriptors, runs in its own interval, supplies coordinates for the canvas drawing and descriptors for the db searching

    //START: loop for drawing the boxes of the face rectangles on the canvas, selected box has a different stroke style
    let face_found = false //if key
    let outline_face_not_in_focus = false //don't outline and highlight faces that are not being investigated
    let rect_face_selected = { x:0, y:0, width:0, height:0 } //holds the selected face which descriptors focus on in this cycle
    async function Draw_Descriptors() {        
        if( canvas.width > 0 && canvas.height > 0 ) {
            Take_Picture()
            //find the selected box by finding the closest x,y face to the selected face and update it as well (assuming closest box origin point belongs to the shifted face position since last update)
            let selected_face_ind = -1 //index for which face is that focused on with keywords
            if( face_found == true && rect_face_array.length > 0 ) { //draw the selected box for which keywords exist
                dist_min = 10**6
                for( const [ind,face_rect] of rect_face_array.entries() ) { //get the index of the closest face rectangle to the selected face rectangle
                    let dist_tmp = Math.sqrt( (face_rect.x-rect_face_selected.x)**2 + (face_rect.y-rect_face_selected.y)**2 ) //find the min distance face and update the index for it
                    if( dist_tmp < dist_min ) {
                        dist_min = dist_tmp
                        selected_face_ind = ind
                    }
                }
                //update the position of the box for the rect_face_selected which the DB was focused on
                [rect_face_selected.x, rect_face_selected.y, rect_face_selected.width, rect_face_selected.height] = [rect_face_array[selected_face_ind].x, rect_face_array[selected_face_ind].y, rect_face_array[selected_face_ind].width, rect_face_array[selected_face_ind].height]
                ctx.beginPath()
                ctx.rect(rect_face_selected.x,rect_face_selected.y,rect_face_selected.width,rect_face_selected.height)
                ctx.setLineDash([])
                ctx.strokeStyle = 'red'
                ctx.lineWidth = 6
                ctx.stroke()                
            }
            //draw boxes around the rest of the faces in dashes OPTIONAL can be turned off as well
            if( outline_face_not_in_focus ) {
                for( const [ind,face_rect] of rect_face_array.entries() ) { //draw rest of the faces not in selected
                    if(selected_face_ind == ind) { continue } //ignore the selected face so that it stays as solid stroke and the rest as dashed
                    ctx.beginPath()
                    ctx.rect(face_rect.x,face_rect.y,face_rect.width,face_rect.height)
                    ctx.strokeStyle = 'red'
                    ctx.setLineDash([16, 14]); //dashes are 5px and spaces are 3px
                    ctx.lineWidth = 3
                    ctx.stroke()  
                }
            }
        } else { }
        //place the keywords for the user to see
        if( face_keywords.length > 0 && face_found == true ) {
            Display_Keywords()
        }
        if(stream_ok) { requestAnimationFrame(Draw_Descriptors) }
    }
    function Display_Keywords() {
        keyword_div.innerHTML = ""
        keywords_html = "Keywords: <br>"
        for( const keyword of face_keywords ) {
            keywords_html += `
                            <div class="keyword">
                                ${keyword}
                            </div>
                            `
        }
        keyword_div.innerHTML = keywords_html
    }
    //END: loop for drawing the boxes of the face rectangles on the canvas, selected box has a different stroke style

    //START: in a separate loop, search and fill keywords for a randomly selected face in the faces array rect_face_array (next version should use tree based indexes on clusters)
    let db_search_delay = 2500 //amount of time the DB has to find data related to a face, in ms
    let max_records = await Number_of_Tagging_Records() 
    let record_sample_num = Math.min( 5000 , Math.floor( 1 * max_records ) ) //allow up to 4K records to be searched in each sweep since more may incur too much delay
    let face_keywords = [] //holds the keywords for the selected image in focus
    async function face_db_search() { //will improve in next version !!!! XXX use tree based methods!!!
        face_keywords = [] //reset the keywords
        if( rect_face_array.length == 0 ) { return } //if no faces present skip/exit
        let ref_face_tmp = rect_face_array[ Math.floor(Math.random()*rect_face_array.length) ] //get some random face to analyze
        let ref_face_tmp_descriptor = ref_face_tmp.descriptor //get the face descriptor array
        let sample_filenames = await Tagging_Random_DB_Images(record_sample_num) //get the array of random filenames stored
        for( const filename_tmp of sample_filenames ) { //test for similarity of face descriptors for each filename entry
            let annotation_obj_tmp = await Get_Tagging_Annotation_From_DB(filename_tmp)
            let face_descriptors_tmp = annotation_obj_tmp["faceDescriptors"]
            if( face_descriptors_tmp.length == 0 ) continue //no face
            let score_tmp = await Get_Descriptors_DistanceScore( [ref_face_tmp_descriptor] , face_descriptors_tmp ) //why is this not between 0 and 1 ??? !!!! xxx
            //console.log(`score_tmp = ${score_tmp}`)
            if( score_tmp > 5 ) { //why is this not between 0 and 1 ??? !!!! xxx
                face_keywords.push(...annotation_obj_tmp["taggingTags"]) //add to the keywords
                //console.log(face_keywords)
            }        
        }
        //check for the face being recently seen that can ADD to the new just discovered keywords (updates the keywords directly)
        await Face_Keywords_Short_Memory(ref_face_tmp_descriptor)

        console.log(face_keywords)
        if( face_keywords.length > 0 ) { //face matches were found
            face_found = true             
            rect_face_selected.x = ref_face_tmp.x
            rect_face_selected.y = ref_face_tmp.y
            rect_face_selected.width = ref_face_tmp.width
            rect_face_selected.height = ref_face_tmp.height
        }
        else { //face matches were not found but we still notify the user that it is not found
            face_found = true//false
            face_keywords.push(...['nothing found yet']) //notify the user that nothing was found yet
            rect_face_selected.x = ref_face_tmp.x
            rect_face_selected.y = ref_face_tmp.y
            rect_face_selected.width = ref_face_tmp.width
            rect_face_selected.height = ref_face_tmp.height
        }
    }
    face_keywords_interval = setInterval( face_db_search , db_search_delay )
    //END: in a separate loop, search and fill keywords for a random face in the face array (next version should use tree based indexes on clusters)

    //START: memory of the keywords so that if a face disappears and comes back the keywords are remembered for some time 
    //related to that face descriptor, also helpes when the face box is cycling through a set
    let faces_short_memories = [] //hold objects of face-descriptors-and-counters-keywords to remember face
    let memory_time = 1000*60*2
    let face_memory = {memory_time:memory_time, descriptor:[], keywords:[]}
    async function Face_Keywords_Short_Memory(ref_face_descriptor) {
        if( faces_short_memories.length == 0 ) { //keywords not updated since this is a first to be seen
            let new_face_memory = JSON.parse(JSON.stringify(face_memory))
            new_face_memory.descriptor = ref_face_descriptor
            new_face_memory.keywords = face_keywords
            faces_short_memories.push(new_face_memory)
            return //nothing left to do so exit
        }
        let found_face = false
        for( const [ind,memory] of faces_short_memories.entries() ) { //loop through memories to see if this descriptor is present or not
            let score_tmp = await Get_Descriptors_DistanceScore( [ref_face_descriptor] , [memory.descriptor] ) 
            if( score_tmp > 5 ) { //found a similar face so no new inclusion and accumulate keywords now and in memory
                found_face = true
                faces_short_memories[ind].memory_time = memory_time //refresh memory
                faces_short_memories[ind].keywords.push(...face_keywords) //merge the arrays
                faces_short_memories[ind].keywords = [...new Set(faces_short_memories[ind].keywords)] //get the unique of the merged
                face_keywords = faces_short_memories[ind].keywords //update the current keyword list
            }
        }
        if(found_face == false) { //face needs to be added to the seen set
            let new_face_memory = JSON.parse(JSON.stringify(face_memory))
            new_face_memory.memory_time = memory_time
            new_face_memory.keywords = face_keywords
            new_face_memory.descriptor = ref_face_descriptor
            faces_short_memories.push(new_face_memory)
        }
    }
    function Face_Short_Memory_Reduction() { //reduce the time for each memory on a loop and remove those out of time
        for( const [ind,memory] of faces_short_memories.entries() ) { 
            console.log({faces_short_memories})
            faces_short_memories[ind].memory_time -= 10000 //take time off of that memory
            console.log({faces_short_memories})
        }
        faces_short_memories = faces_short_memories.filter( (memory,i) => memory.memory_time > 0 ) //keep those with memory time
    }
    memory_loss_interval = setInterval( Face_Short_Memory_Reduction, 15000)


}
//END of stream search functionality view



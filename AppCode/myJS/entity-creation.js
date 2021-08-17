//entities have:
//1 entity tag name
//2 entity profile picture
//3 entity description
//4 entity photoset
//5 entity emotions
//6 entity memes

console.log("js for the creation of the entity")

var step_ind = 1;

dir_pics = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'
ipcRenderer_pics = require('electron').ipcRenderer
path = require('path');
entity_db_fns = require('./myJS/entity-db-fns.js');


var entity_tag_name = ""
var entity_file_name = ""
var entity_description = ""
var entity_image_set = ""
var emotion_values = ""
var meme_image_set = ""

function Entity_CreationPage_Previous() {

    console.log("clicked for previous page of creation process")
    if(step_ind > 1) {
        step_ind = step_ind - 1
    }
    console.log(step_ind)

    Pagination_page_item_activate()
    Entity_Fill_Delegation()

}


function Entity_CreationPage_Next() {

    console.log("clicked for next page of creation process")
    if(step_ind < 3) {
        step_ind = step_ind + 1
    } else {
        console.log("check to see if complete to finalize creation")
    }
    console.log(step_ind) 

    Pagination_page_item_activate() 
    Entity_Fill_Delegation()

}


function Pagination_page_item_activate() {
    document.getElementById(`step1`).classList.remove("active")
    console.log(document.getElementById(`step1`).classList)

    document.getElementById(`step2`).classList.remove("active")
    console.log(document.getElementById(`step2`).classList)

    document.getElementById(`step3`).classList.remove("active")
    console.log(document.getElementById(`step3`).classList)

    document.getElementById(`step${step_ind}`).className += " active";
}



function Entity_Fill_Delegation() {

    if(step_ind == 1) {

        html_part = Part1_HTML()

        document.getElementById('partBody').innerHTML = html_part

    } else if(step_ind == 2) {

        html_part = Part2_HTML()

        document.getElementById('partBody').innerHTML = html_part

    } else if(step_ind == 3) {

        html_part = Part3_HTML()

        document.getElementById('partBody').innerHTML = html_part

        document.getElementById('happy').value = 0
        document.getElementById('sad').value = 0
        document.getElementById('confused').value = 0

    }

}

//different pages for the entity creation process to cover
//entity tag name, entity profile picture, entity description, entity photoset, entity emotions, entity memes

function Part1_HTML() {
    
    htmlpart1 = /*html*/`
        <div>

            1) tag name
            <textarea class="form-control textareaCreate1" id="nameCreateEntity" ></textarea>
            <br>

            2) entity profile picture
            <button class="btn btn-primary btn-sm btn-block" type="button" onclick="Load_New_Entity_Image()">CHOOSE</button>
            <div class="row" id="newEntityProfilePic">

            </div>
            <br>
            3) entity description
            <textarea class="form-control textareaCreate2" id="descriptionCreateEntity" ></textarea>            
            
            <br>
            <button type="button" class="btn btn-primary btn-lg" onclick="Next_Btn_Step1()">
                Next
            </button>
        </div>
        `
    return htmlpart1
}

//entity photoset
function Part2_HTML() {

    htmlpart2 = /*html*/`
        <div>

            1) entity pictures selection
            <button class="btn btn-primary btn-sm btn-block" type="button" onclick="Load_New_Entity_ImageSet()">CHOOSE IMAGE SET</button>
            <div class="row" id="newEntityPictureSet">

            </div>
            <br>
            
            <button type="button" class="btn btn-primary btn-lg" onclick="Next_Btn_Step2()">
                Next
            </button>
        </div>
        `
    return htmlpart2

}

function Part3_HTML() {

    htmlpart3 = /*html*/`        
        entity emotions, entity memes <br>
        <div class="emotion-page">                    
            <label id="emotion-box-title" class="form-label">EMOTIONS (*)</label>
            <hr>    
            <label for="customRange1" class="form-label">happy range</label>
            <input type="range" class="form-range" id="happy">                        
            <label for="customRange1" class="form-label">sad range</label>
            <input type="range" class="form-range" id="sad">
            <label for="customRange1" class="form-label">confused range</label>
            <input type="range" class="form-range" id="confused">
        </div>
        
        <hr>


        <label id="meme-box-title" class="form-label">Memes Connections * &rarr;</label>
        <button class="btn btn-primary btn-sm btn-block" type="button" onclick="Load_New_Entity_MemeSet()">CHOOSE MEME SET</button>
        <div class="row" id="newEntityMemeSet">

        </div>
        <hr>
        <br>
        <button type="button" class="btn btn-primary btn-lg" onclick="Finish_Btn()">
            Finish
        </button>

        `        
    return htmlpart3
}


async function Load_New_Entity_Image() {
    const result = await ipcRenderer_pics.invoke('dialog:openEntity')
    console.log(dir_pics)
    if(result.canceled == false) {        
        filename = path.parse(result.filePaths[0]).base;
        entity_file_name = filename
        console.log(filename)
        document.getElementById("newEntityProfilePic").innerHTML  = `<img class="imgG" src="/home/resort/Documents/repos/Tagasaurus/images/${filename}">`;
    }
}

async function Load_New_Entity_ImageSet() {
    
    result = await ipcRenderer_pics.invoke('dialog:openEntityImageSet')
    files_tmp = result.filePaths
    files_tmp_base = files_tmp.map(function(filepath) {
        return path.parse(filepath).base
    })
    console.log(files_tmp_base)
    entity_image_set = files_tmp_base
    imgHTML_tmp = ""
    files_tmp_base.forEach(filename => {
        imgHTML_tmp += `<img class="imgG" src="/home/resort/Documents/repos/Tagasaurus/images/${filename}">`
    });
    console.log(imgHTML_tmp)
    htmlpart_imageset = /*html*/`
                    ${imgHTML_tmp}
                `

    document.getElementById("newEntityPictureSet").innerHTML  = htmlpart_imageset

}

async function Load_New_Entity_MemeSet() {
    
    result = await ipcRenderer_pics.invoke('dialog:openEntityImageSet')
    files_tmp = result.filePaths
    files_tmp_base = files_tmp.map(function(filepath) {
        return path.parse(filepath).base
    })
    console.log(files_tmp_base)
    meme_image_set = files_tmp_base
    imgHTML_tmp = ""
    files_tmp_base.forEach(filename => {
        imgHTML_tmp += `<img class="imgG" src="/home/resort/Documents/repos/Tagasaurus/images/${filename}">`
    });
    console.log(meme_image_set)
    htmlpart_imageset = /*html*/`
                    ${imgHTML_tmp}
                `

    document.getElementById("newEntityMemeSet").innerHTML  = htmlpart_imageset

}

function Next_Btn_Step1() {

    console.log("next step 1")
    console.log(entity_file_name)
    entity_tag_name = document.getElementById('nameCreateEntity').value
    console.log(entity_tag_name)
    entity_description = document.getElementById('descriptionCreateEntity').value
    console.log(entity_description)

    Entity_Fill_Delegation()
    Entity_CreationPage_Next()
}

function Next_Btn_Step2() {

    console.log("next step 2")    

    Entity_Fill_Delegation()
    Entity_CreationPage_Next()
}

function Finish_Btn() {

    //emotion_values = 
    happy_value = document.getElementById('happy').value
    sad_value = document.getElementById('sad').value
    confused_value = document.getElementById('confused').value

    console.log(entity_tag_name)
    console.log(entity_file_name)
    console.log(entity_description)
    console.log(entity_image_set)
    console.log([happy_value,sad_value,confused_value])
    console.log(meme_image_set)

    entities_entry = {
            "entityName": entity_tag_name,
            "entityImage": entity_file_name,
            "entityDescription": entity_description,
            "entityImageSet": entity_image_set,
            "entityEmotions": {happy:happy_value,sad:sad_value,confused:confused_value},            
            "entityMemes": meme_image_set
        }

    console.log(entities_entry)
    console.log('now going to insert entity data')
    console.log
    entity_db_fns.Insert_Record(entities_entry)

}

Pagination_page_item_activate()
Entity_Fill_Delegation()
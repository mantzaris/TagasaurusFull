


const COLLECTION_DB_MODULE = require('./myJS/entity-db-fns.js');


async function Create_Collection_DB_Instance() {
    await COLLECTION_DB_MODULE.Create_Db()
}
async function Get_Collection_Record_In_DB(entity_key) {
    return await COLLECTION_DB_MODULE.Get_Record(entity_key)
}


var creation_step_num = 1






function Navbar_ViewHandle() {
    step1_id = document.getElementById("creation-step1-div-id")
    step1_id.style.display = "none"
    step2_id = document.getElementById("creation-step2-div-id")
    step2_id.style.display = "none"
    step3_id = document.getElementById("creation-step3-div-id")
    step3_id.style.display = "none"
    step4_id = document.getElementById("creation-step4-div-id")
    step4_id.style.display = "none"
    step5_id = document.getElementById("creation-step5-div-id")
    step5_id.style.display = "none"

    nav_btn1 = document.getElementById("navbar-button1-id")
    nav_btn1.classList.add('nav-bar-off')
    nav_btn2 = document.getElementById("navbar-button2-id")
    nav_btn2.classList.add('nav-bar-off')
    nav_btn3 = document.getElementById("navbar-button3-id")
    nav_btn3.classList.add('nav-bar-off')
    nav_btn4 = document.getElementById("navbar-button4-id")
    nav_btn4.classList.add('nav-bar-off')
    nav_btn5 = document.getElementById("navbar-button5-id")
    nav_btn5.classList.add('nav-bar-off')

    if(creation_step_num == 1) {
        step1_id.style.display = "grid"
        nav_btn1.classList.remove('nav-bar-off')
        nav_btn1.classList.add('nav-bar-on')
    } else if(creation_step_num == 2) {
        step2_id.style.display = "grid"
        nav_btn2.classList.remove('nav-bar-off')
        nav_btn2.classList.add('nav-bar-on')
    } else if(creation_step_num == 3) {
        step3_id.style.display = "grid"
        nav_btn3.classList.remove('nav-bar-off')
        nav_btn3.classList.add('nav-bar-on')
    } else if(creation_step_num == 4) {
        step4_id.style.display = "grid"
        nav_btn4.classList.remove('nav-bar-off')
        nav_btn4.classList.add('nav-bar-on')
    } else if(creation_step_num == 5) {
        step5_id.style.display = "grid"
        nav_btn5.classList.remove('nav-bar-off')
        nav_btn5.classList.add('nav-bar-on')
    }
}
function Creation_Back_Btn() {
    if(creation_step_num > 1) {
        creation_step_num -= 1
    }
    if(creation_step_num == 1){
        button_back = document.getElementById("creation-back-button-id")
        button_back.style.display = "none"
    }
    if(creation_step_num == 4){
        button_back = document.getElementById("creation-next-button-id")
        button_back.innerHTML = "NEXT"
    }
    Navbar_ViewHandle()
}
async function Creation_Next_Btn() {
    //check to see if the user has completed the required components or not, if not return
    if(creation_step_num == 1) {
        collection_name_text_area = document.getElementById("collection-name-textarea-id").value
        collection_obj = await Get_Collection_Record_In_DB(collection_name_text_area)
        if(collection_obj != undefined) {
            return //exit without proceeding until unique name supplied
        }
    }
    //update the counter
    if(creation_step_num < 5) {
        creation_step_num += 1
    }
    //the invisible back button make visible cause now it is possible to go back from step 2
    if(creation_step_num == 2){
        button_back = document.getElementById("creation-back-button-id")
        button_back.style.display = "block"
    }
    //at the end and notify the user that they can now complete the creation steps
    if(creation_step_num == 5){
        button_back = document.getElementById("creation-next-button-id")
        button_back.innerHTML = "COMPLETE"
    }
    Navbar_ViewHandle()
}



async function Initialize_Collection_Creation_Page() {
    //set up the nav bar and bottom buttons
    Navbar_ViewHandle()
    

    document.getElementById("creation-back-button-id").addEventListener("click", function (event) {
        Creation_Back_Btn()
    })
    document.getElementById("creation-next-button-id").addEventListener("click", function (event) {
        Creation_Next_Btn()
    })
    //init the collection DB
    await Create_Collection_DB_Instance()



}
//the key starting point for the page>>>>>>>>>>>>
Initialize_Collection_Creation_Page()
//<<<<<<<<<<<<<<<<<<<<<<<<<<

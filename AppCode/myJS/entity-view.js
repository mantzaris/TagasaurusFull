

console.log('in entity view')

function Prev_Image() {
    console.log("previous image button clicked")
}

function Next_Image() {
    console.log("next image button clicked")
}

function Create_New_Entity() {
    console.log("create new entity button clicked")
}

function Alter_Entity() {
    console.log("alter entity button clicked")
}

function Entity_Emotion_Page() {
    console.log("entity emotion page button clicked")
}

function Entity_Description_Page() {
    console.log("entity description page button clicked")
}

function Entity_Memes_Page() {
    console.log("entity memes page button clicked")
}

function Set_Entity_Name_Label(){
    document.getElementById("entityName").textContent= '#' + "Taga";

}

function Load_First_Image(){
    default_img = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/Taga.png'
    console.log(default_img)
    document.getElementById("entityProfileImg").src = default_img;
}

Set_Entity_Name_Label()
Load_First_Image()
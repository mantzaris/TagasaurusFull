

console.log("js for the creation of the entity")

var part_ind = 1;

function Entity_CreationPage_Previous() {

    console.log("clicked for previous page of creation process")
    if(part_ind > 1) {
        part_ind = part_ind - 1
    }
    console.log(part_ind)

    Pagination_page_item_activate() 
    Entity_Fill_Delegation() 

}


function Entity_CreationPage_Next() {

    console.log("clicked for next page of creation process")
    if(part_ind < 3) {
        part_ind = part_ind + 1
    } else {
        console.log("check to see if complete to finalize creation")
    }
    console.log(part_ind) 

    Pagination_page_item_activate() 
    Entity_Fill_Delegation()

}


function Pagination_page_item_activate() {
    document.getElementById(`page1`).classList.remove("active")
    console.log(document.getElementById(`page1`).classList)

    document.getElementById(`page2`).classList.remove("active")
    console.log(document.getElementById(`page2`).classList)

    document.getElementById(`page3`).classList.remove("active")
    console.log(document.getElementById(`page3`).classList)

    document.getElementById(`page${part_ind}`).className += " active";
}



function Entity_Fill_Delegation() {

    if(part_ind == 1) {

        html_part = Part1_HTML()

        document.getElementById('partBody').innerHTML = html_part

    } else if(part_ind == 2) {

        html_part = Part2_HTML()

        document.getElementById('partBody').innerHTML = html_part

    } else if(part_ind == 3) {

        html_part = Part3_HTML()

        document.getElementById('partBody').innerHTML = html_part

    }

}


function Part1_HTML() {
    
    htmlpart1 = /*html*/`
        <div> 
            hello world! part1
            <br>
            <button type="button" class="btn btn-primary btn-lg">
                test button part1
            </button>
        </div>
        `
    return htmlpart1
}

function Part2_HTML() {

    return `hellow world! part2`
}

function Part3_HTML() {

    return `hellow world! part3`
}



Pagination_page_item_activate()
Entity_Fill_Delegation()
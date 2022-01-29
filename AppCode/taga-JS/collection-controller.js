const IPC_RENDERER_PICS = require('electron').ipcRenderer
const PATH = require('path');
const FSE = require('fs-extra');
const FS = require('fs');
const CRYPTO = require('crypto')


const ENTITY_DB_FNS = require('./myJS/entity-db-fns.js');
const MY_FILE_HELPER = require('./myJS/copy-new-file-helper.js')

//TAGGING_IDB_MODULE_COPY = require('./myJS/tagging-db-fns.js'); //for the hash refs of the individual images
const TAGGING_IDB_MODULE = require('./myJS/tagging-db-fns.js');


//<script src="./masonry.pkgd.min.js"></script>
const MASONRY = require('masonry-layout') // require('./masonry.pkgd.min.js')
console.log(MASONRY)

const DIR_PICS = PATH.resolve(PATH.resolve(), 'images') //PATH.resolve(__dirname, '..', 'images') //PATH.join(__dirname,'..','images')  //PATH.normalize(__dirname+PATH.sep+'..') + PATH.sep + 'images'     //__dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'__dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'
//the folder to store the taga images (with a commented set of alternative solutions that all appear to work)
const TAGA_IMAGE_DIRECTORY = PATH.resolve(PATH.resolve(), 'images') //PATH.resolve(__dirname, '..', 'images') //PATH.join(__dirname,'..','images')  //PATH.normalize(__dirname+PATH.sep+'..') + PATH.sep + 'images'     //__dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'

//to produce tags from the textual description
const DESCRIPTION_PROCESS_MODULE = require('./myJS/description-processing.js');


COLLECTION_DEFAULT_EMPTY_OBJECT = {
	"entityName": '',
	"entityImage": '',
	"entityDescription": '',
	"entityImageSet": [],
	"entityEmotions": {
		good: 0,
		bad: 0
	}, //{happy:happy_value,sad:sad_value,confused:confused_value},
	"entityMemes": []
}


var current_entity_obj; //it holds the object of the entity being in current context
var all_collection_keys; //holds all the keys to the entities in the DB
var current_key_index = 0; //which key index is currently in view for the current entity
var annotation_view_ind = 1 //which view should be shown to the user when they flip through entities

//gallery_image search_results
search_results = []

//meme search results
var search_meme_results = ''


//this function deletes the entity object currently in focus from var 'current_key_index', and calls for the refresh
//of the next entity to be in view
async function Delete_Entity() {
	entity_key = current_entity_obj.entityName
	await ENTITY_DB_FNS.Delete_Record(entity_key)
	await ENTITY_DB_FNS.Get_All_Keys_From_DB() //refresh the current key list
	all_collection_keys = ENTITY_DB_FNS.Read_All_Keys_From_DB() //retrieve that key list and set to the local global variable
	
	if (all_collection_keys.length == 0) {
		Handle_Empty_DB()
	}
	
	if (current_key_index >= all_collection_keys.length) {
		current_key_index = 0
	}
	Show_Entity_From_Key_Or_Current_Entity(all_collection_keys[current_key_index]) //current index for keys will be 1 ahead from before delete
}


//entity annotation page where the user describes the entity
function Entity_Description_Page() {
	annotation_view_ind = 1
	
	//colors the annotation menu buttons appropriately (highlights)
	desription_btn = document.getElementById("collection-image-annotation-navbar-description-button-id")
	emotion_btn = document.getElementById("collection-image-annotation-navbar-emotion-button-id")
	meme_btn = document.getElementById("collection-image-annotation-navbar-meme-button-id")
	desription_btn.classList.remove('nav-bar-off')
	desription_btn.classList.add('nav-bar-on')
	emotion_btn.classList.remove('nav-bar-on')
	emotion_btn.classList.add('nav-bar-off')
	meme_btn.classList.remove('nav-bar-on')
	meme_btn.classList.add('nav-bar-off')
	
	description_annotations_div = document.getElementById("collection-image-annotation-description-div-id")
	description_annotations_div.style.display = 'grid'
	emotions_annotations_div = document.getElementById("collection-image-annotation-emotions-div-id")
	emotions_annotations_div.style.display = "none";
	memes_annotations_div = document.getElementById("collection-image-annotation-memes-div-id")
	memes_annotations_div.style.display = "none";
	
	description_text_area_element = document.getElementById("collection-image-annotation-description-textarea-id")
	description_text_area_element.value = current_entity_obj.entityDescription
	
	hashtag_div = document.getElementById("collection-description-annotation-hashtags-div-id")
	if (current_entity_obj.taggingTags != undefined) {
		hashtag_div.innerHTML = (current_entity_obj.taggingTags).join(' ,')
	} else {
		hashtag_div.innerHTML = ""
	}
	console.log(`current_entity_obj.taggingTags = ${current_entity_obj.taggingTags}`)
}

//takes the current description and updates the entity object in the DB with it
function Save_Entity_Description() {
	current_entity_obj.entityDescription = document.getElementById("collection-image-annotation-description-textarea-id").value
	//now process  description text in order to have the tags
	current_entity_obj.taggingTags = DESCRIPTION_PROCESS_MODULE.process_description(current_entity_obj.entityDescription)
	ENTITY_DB_FNS.Update_Record(current_entity_obj)
	Entity_Description_Page()
}

//create the entity emotion HTML view for the entity annotation
function Entity_Emotion_Page() {
	annotation_view_ind = 2
	
	//colors the annotation menu buttons appropriately (highlights)
	desription_btn = document.getElementById("collection-image-annotation-navbar-description-button-id")
	emotion_btn = document.getElementById("collection-image-annotation-navbar-emotion-button-id")
	meme_btn = document.getElementById("collection-image-annotation-navbar-meme-button-id")
	desription_btn.classList.remove('nav-bar-on')
	desription_btn.classList.add('nav-bar-off')
	emotion_btn.classList.remove('nav-bar-off')
	emotion_btn.classList.add('nav-bar-on')
	meme_btn.classList.remove('nav-bar-on')
	meme_btn.classList.add('nav-bar-off')
	
	description_annotations_div = document.getElementById("collection-image-annotation-description-div-id")
	description_annotations_div.style.display = 'none'
	emotions_annotations_div = document.getElementById("collection-image-annotation-emotions-div-id")
	emotions_annotations_div.style.display = 'grid';
	memes_annotations_div = document.getElementById("collection-image-annotation-memes-div-id")
	memes_annotations_div.style.display = "none";
	
	console.log(`current_entity_obj["entityEmotions"] = ${JSON.stringify(current_entity_obj["entityEmotions"])}`)
	emotions_collection = current_entity_obj["entityEmotions"]
	emotion_HTML = ''
	for (let key in emotions_collection) {
		emotion_HTML += `
                        <div class="emotion-list-class" id="emotion-entry-div-id-${key}">
                        <div>
                            <img onclick="" class="emotion-delete-icon-class" id="emotion-delete-button-id-${key}" onmouseover="this.src='taga-ui-icons/CloseRed.png';" onmouseout="this.src='taga-ui-icons/CloseBlack.png';" src="taga-ui-icons/CloseBlack.png" alt="emotion-${key}" title="remove"/>
                            <span class="emotion-label-view-class" id="emotion-id-label-view-name-${key}">${key}</span>
                        </div>
                        <input class="emotion-range-slider-class" id="emotion-range-id-${key}" type="range" min="0" max="100" value="0">
                        </div>
                        `
	}
	
	emotions_show_div = document.getElementById("collection-image-annotation-emotions-labels-show-div-id")
	emotions_show_div.innerHTML = emotion_HTML
	
	//set up the delete operation per emotion AND set values of slider
	Object.keys(emotions_collection).forEach(key_tmp => {
		document.getElementById(`emotion-delete-button-id-${key_tmp}`).addEventListener("click", function () {
			Delete_Emotion(`${key_tmp}`);
		}, false);
		document.getElementById(`emotion-range-id-${key_tmp}`).value = current_entity_obj["entityEmotions"][key_tmp]
	})
}

//delete an emotion from the emotion set
async function Delete_Emotion(emotion_key) {
	console.log(`in Delete_Emotion(emotion_key) ,\n emotion_key = ${emotion_key}`)
	element_slider_delete_btn = document.getElementById('emotion-delete-button-id-' + emotion_key);
	element_slider_delete_btn.remove();
	element_slider_range = document.getElementById('emotion-range-id-' + emotion_key);
	element_slider_range.remove();
	element_emotion_label = document.getElementById('emotion-id-label-view-name-' + emotion_key);
	element_emotion_label.remove();
	delete current_entity_obj["entityEmotions"][emotion_key];
	console.log(`in delete emotion current_entity_obj = ${JSON.stringify(current_entity_obj)}, keys = ${Object.keys(current_entity_obj["entityEmotions"])}`)
	await ENTITY_DB_FNS.Update_Record(current_entity_obj)
	Entity_Emotion_Page()
}

//will take the current emotion values, and store it into an object to replace the current entity object's emotions
//then update the record in the Database
function Save_Entity_Emotions() {
	for (var key of Object.keys(current_entity_obj["entityEmotions"])) {
		console.log(`current_entity_obj["entityEmotions"][key] = ${current_entity_obj["entityEmotions"][key]}`)
		current_entity_obj["entityEmotions"][key] = document.getElementById('emotion-range-id-' + key).value
	}
	ENTITY_DB_FNS.Update_Record(current_entity_obj)
	Entity_Emotion_Page()
}

//add a new emotion to the emotion set
async function Add_New_Emotion() {
	new_emotion_text = document.getElementById("collection-image-annotation-emotions-new-entry-emotion-textarea-id").value
	console.log(` Add_New_Emotion() new_emotion_text = ${new_emotion_text}`)
	if (new_emotion_text) {
		keys_tmp = Object.keys(current_entity_obj["entityEmotions"])
		boolean_included = keys_tmp.includes(new_emotion_text)
		if (boolean_included == false) {
			new_emotion_value = document.getElementById("collection-image-annotation-emotions-new-entry-emotion-value-range-slider-id").value
			current_entity_obj["entityEmotions"][new_emotion_text] = new_emotion_value
			await ENTITY_DB_FNS.Update_Record(current_entity_obj)
			//do not save upon addition of a new emotion, the save button is necessary
			document.getElementById("collection-image-annotation-emotions-new-entry-emotion-textarea-id").value = ""
			document.getElementById("collection-image-annotation-emotions-new-entry-emotion-value-range-slider-id").value = "0"
			Entity_Emotion_Page()
		} else {
			document.getElementById("collection-image-annotation-emotions-new-entry-emotion-textarea-id").value = ""
		}
	}
}


//when the entity memes annotation page is select these page elements are present for the meme view
function Entity_Memes_Page() {
	annotation_view_ind = 3
	//make only the meme view pagination button active and the rest have active removed to not be highlighted
	//colors the annotation menu buttons appropriately (highlights)
	desription_btn = document.getElementById("collection-image-annotation-navbar-description-button-id")
	emotion_btn = document.getElementById("collection-image-annotation-navbar-emotion-button-id")
	meme_btn = document.getElementById("collection-image-annotation-navbar-meme-button-id")
	desription_btn.classList.remove('nav-bar-on')
	desription_btn.classList.add('nav-bar-off')
	emotion_btn.classList.remove('nav-bar-on')
	emotion_btn.classList.add('nav-bar-off')
	meme_btn.classList.remove('nav-bar-off')
	meme_btn.classList.add('nav-bar-on')
	
	description_annotations_div = document.getElementById("collection-image-annotation-description-div-id")
	description_annotations_div.style.display = 'none'
	emotions_annotations_div = document.getElementById("collection-image-annotation-emotions-div-id")
	emotions_annotations_div.style.display = 'none';
	memes_annotations_div = document.getElementById("collection-image-annotation-memes-div-id")
	memes_annotations_div.style.display = "grid";
	
	memes_array = current_entity_obj.entityMemes //get the memes of the current object
	console.log(`memes_array= ${memes_array}`)
	document.querySelectorAll(".collection-image-annotation-memes-grid-item-class").forEach(el => el.remove());
	gallery_html = ''
	if (memes_array != "" && memes_array.length > 0) {
		memes_array.forEach(meme_key => {
			image_path_tmp = DIR_PICS + '/' + meme_key
			if (FS.existsSync(image_path_tmp) == true) {
				gallery_html += `
                                    <div class="collection-image-annotation-memes-grid-item-class">
                                    <label class="memeswitch" title="deselect / keep">
                                        <input id="meme-toggle-id-${meme_key}" type="checkbox" checked="true">
                                        <span class="slider"></span>
                                    </label>
                                    <img src="${image_path_tmp}" id="collection-image-annotation-memes-grid-img-id-${meme_key}" class="collection-image-annotation-meme-grid-img-class"/>
                                    </div>
                                    `
			}
		});
	}
	document.getElementById("collection-image-annotation-memes-images-show-div-id").innerHTML += gallery_html
	
	//event listener to modal focus image upon click
	memes_array.forEach(function (meme_key) {
		image_path_tmp = DIR_PICS + '/' + meme_key
		if (FS.existsSync(image_path_tmp) == true) {
			document.getElementById(`collection-image-annotation-memes-grid-img-id-${meme_key}`).addEventListener("click", function (event) {
				Image_Clicked_Modal(meme_key)
			})
		}
	})
	
	var grid_gallery = document.querySelector(".collection-image-annotation-memes-images-grid-class");
	var msnry = new MASONRY(grid_gallery, {
		columnWidth: '.collection-image-annotation-memes-masonry-grid-sizer',
		itemSelector: '.collection-image-annotation-memes-grid-item-class',
		percentPosition: true,
		gutter: 5,
		transitionDuration: 0
	});
}

//to save the edits to the memes which is the deletions
async function Save_Meme_Changes() {
	console.log(`now saving the meme deletes`)
	current_memes = current_entity_obj.entityMemes //get the memes of the current object
	meme_switch_booleans = []
	for (var ii = 0; ii < current_memes.length; ii++) {
		image_path_tmp = DIR_PICS + '/' + current_memes[ii]
		if (FS.existsSync(image_path_tmp) == true) {
			meme_boolean_tmp = document.getElementById(`meme-toggle-id-${current_memes[ii]}`).checked
			if (meme_boolean_tmp == true) {
				meme_switch_booleans.push(current_memes[ii])
			}
		} else {
			meme_switch_booleans.push(current_memes[ii])
		}
	}
	current_entity_obj.entityMemes = meme_switch_booleans
	
	await ENTITY_DB_FNS.Update_Record(current_entity_obj)
	Entity_Memes_Page()
}


//called from the entity-main.html
async function New_Entity_Image() {
	console.log(`<<<<<<----------New_Entity_Image()----------->>>>>>>>>>>`)
	
	entity_profile_search_obj = {
		emotions: {},
		searchTags: [],
		searchMemeTags: []
	}
	
	var search_modal = document.getElementById("top-profile-image-choice-modal-id");
	search_modal.style.display = "block";
	var close_element = document.getElementById("search-entityprofile-close-modal-id");
	close_element.onclick = function () {
		search_modal.style.display = "none";
	}
	window.onclick = function (event) {
		if (event.target == search_modal) {
			search_modal.style.display = "none";
		}
	}
	
	search_tags_input = document.getElementById("search-tags-entity-profileimage-entry-form")
	search_tags_input.value = ""
	
	//populate the search modal with the fields to insert emotion tags and values
	Search_Entity_ProfileImage_Populate_Emotions()
	//populate the search modal with the fields to insert meme tags
	Search_Entity_ProfileImage_Populate_Memetic_Component()
	
	var select_image_search_order = document.getElementById("search-entity-profileimage-searchorder-btn")
	select_image_search_order.onclick = function () {
		Entity_Profile_Image_Search()
	}
	
	//populate the zone with images from the Gallery in the default order they are stored
	search_entity_profileimage_results_output = document.getElementById("search-modal-entityprofile-image-results")
	search_entity_profileimage_results_output.innerHTML = ""
	search_entity_profileimage_results_output.insertAdjacentHTML('beforeend', "<br>")
	gallery_files = current_entity_obj.entityImageSet
	gallery_files.forEach(file_key => {
		search_entity_profileimage_results_output.insertAdjacentHTML('beforeend', `<img class="imgMemeResult" id="entity-profile-image-candidate-id-${file_key}" src="${DIR_PICS}/${file_key}">`)//+= `<img class="imgMemeResult" src="${image_set_search}">`
	})
	
	//add an event listener to the images so that they emit an event to the user clicking on it
	gallery_files.forEach(filename => {
		document.getElementById(`entity-profile-image-candidate-id-${filename}`).addEventListener("click", function () {
			Entity_Profile_Candidate_Image_Clicked(filename);
		}, false);
	});
	
}

//assign a new set of images to the gallery which includes the entity image (replacement set)
async function Remove_Gallery_Images() {
	console.log(`<<<<<<----------Remove_Gallery_Images()----------->>>>>>>>>>>`)
	
	gallery_files = current_entity_obj.entityImageSet
	console.log(`gallery_files = ${gallery_files}`)
	new_gallery_files = []
	if (gallery_files.length != 0) {
		gallery_files.forEach(filename => {
			console.log(`filename = ${filename}`)
			if (document.getElementById(`gallery-view-image-choice-${filename}`).checked == true || filename == current_entity_obj.entityImage) {
				new_gallery_files.push(filename)
			}
		});
		current_entity_obj.entityImageSet = new_gallery_files
		await ENTITY_DB_FNS.Update_Record(current_entity_obj)
		Show_Entity_From_Key_Or_Current_Entity(all_collection_keys[current_key_index])
	}
	
}


//we use the key to pull the entity object from the DB, or if use_key=0 take the value
//from the existing entity object global variable. 
//also handles empty cases
async function Show_Entity_From_Key_Or_Current_Entity(entity_key_or_obj, use_key = 1) {
	
	//if using the key, the global object for the current entity shown is updated and this is
	//used, or else the current view from the data is presented.
	if (use_key == 1) {
		current_entity_obj = await ENTITY_DB_FNS.Get_Record(entity_key_or_obj)
	}
	console.log(`in Show Entity, current_entity_obj.entityImageSet = ${current_entity_obj.entityImageSet}`)
	
	//the Gallery image set for the entity
	image_set = current_entity_obj.entityImageSet
	//handle empty issues or
	if (image_set.length == 0) {
		current_entity_obj.entityImageSet = ['Taga.png']
		image_set = ['Taga.png']
		await ENTITY_DB_FNS.Update_Record(current_entity_obj)
	}
	any_images_present = image_set.some(fn => FS.existsSync(DIR_PICS + '/' + fn) == true)
	if (any_images_present == false) {
		current_entity_obj.entityImageSet.push('Taga.png')
		current_entity_obj.entityImage = 'Taga.png'
		await ENTITY_DB_FNS.Update_Record(current_entity_obj)
	}
	
	//clear gallery of gallery image objects
	document.querySelectorAll(".collection-images-gallery-grid-item-class").forEach(el => el.remove());
	//place the gallery images in the html and ignore the missing images (leave the lingering links)
	gallery_div = document.getElementById("collections-images-gallery-grid-images-div-id")
	gallery_html_tmp = ''
	image_set.forEach(function (image_filename) {
		image_path_tmp = DIR_PICS + '/' + image_filename
		if (FS.existsSync(image_path_tmp) == true) {
			gallery_html_tmp += `
                                <div class="collection-images-gallery-grid-item-class">
                                    <label class="memeswitch" title="deselect / keep">
                                        <input id="galleryimage-toggle-id-${image_filename}" type="checkbox" checked="true">
                                        <span class="slider"></span>
                                    </label>
                                    <img src="${image_path_tmp}" id="collection-image-annotation-memes-grid-img-id-${image_filename}" class="collection-images-gallery-grid-img-class"/>
                                </div>
                                `
		}
	})
	// FOR TESTING
	// for(let i = 0; i < 100; i++) gallery_div.innerHTML += gallery_html_tmp;
	
	gallery_div.innerHTML += gallery_html_tmp; //gallery_div.innerHTML = gallery_html_tmp
	
	//event listener to modal focus image upon click
	image_set.forEach(function (image_filename) {
		image_path_tmp = DIR_PICS + '/' + image_filename
		if (FS.existsSync(image_path_tmp) == true) {
			document.getElementById(`collection-image-annotation-memes-grid-img-id-${image_filename}`).addEventListener("click", function (event) {
				Image_Clicked_Modal(image_filename)
			})
		}
	})
	
	entity_profile_pic = current_entity_obj.entityImage
	image_path_tmp = DIR_PICS + '/' + entity_profile_pic
	//If entity profile image is not present select a random image from the gallery
	if (FS.existsSync(image_path_tmp) == false) {
		present_img_inds = image_set.map((image_filename, ind) => {
			path_tmp = DIR_PICS + '/' + image_filename
			if (FS.existsSync(path_tmp) == true) {
				return ind
			} else {
				return -1
			}
		}).filter((e) => e >= 0)
		rand_ind = Math.floor(Math.random() * present_img_inds.length)
		new_image_ind = present_img_inds[rand_ind]
		current_entity_obj.entityImage = image_set[new_image_ind]
		ENTITY_DB_FNS.Update_Record(current_entity_obj)
	}
	document.getElementById("collection-profile-image-img-id").src = DIR_PICS + '/' + current_entity_obj.entityImage;
	document.getElementById("collection-profile-image-img-id").addEventListener("click", function (event) {
		Image_Clicked_Modal(current_entity_obj.entityImage)
	})
	//display the entity hastag 'name'
	document.getElementById("collection-name-text-label-id").textContent = current_entity_obj.entityName;
	
	setTimeout(() => {
		var grid_gallery = document.querySelector(".collection-images-gallery-grid-class");
		var msnry = new MASONRY(grid_gallery, {
			columnWidth: '.collection-images-gallery-masonry-grid-sizer',
			itemSelector: '.collection-images-gallery-grid-item-class',
			percentPosition: true,
			gutter: 5,
			transitionDuration: 0
		});
	}, 300);
	
	//default present
	Entity_Description_Page()
}


function Prev_Image() {
	if (current_key_index > 0) {
		current_key_index += -1
	} else {
		current_key_index = all_collection_keys.length - 1
	}
	Show_Entity_From_Key_Or_Current_Entity(all_collection_keys[current_key_index])
}

async function Next_Image() {
	if (current_key_index < all_collection_keys.length - 1) {
		current_key_index += 1
	} else {
		current_key_index = 0
	}
	Show_Entity_From_Key_Or_Current_Entity(all_collection_keys[current_key_index])
	
}


//The missing image filtering is not done in the initial stage here like in the Tagging where all missing
//images are removed and the annotation objects removed
async function Initialize_Entity_Page() {
	await TAGGING_IDB_MODULE.Create_Db()
	
	desription_btn = document.getElementById("collection-image-annotation-navbar-description-button-id")
	emotion_btn = document.getElementById("collection-image-annotation-navbar-emotion-button-id")
	meme_btn = document.getElementById("collection-image-annotation-navbar-meme-button-id")
	desription_btn.classList.add('nav-bar-on')
	emotion_btn.classList.add('nav-bar-off')
	meme_btn.classList.add('nav-bar-off')
	
	desription_btn.addEventListener("click", function (event) {
		Entity_Description_Page()
	})
	emotion_btn.addEventListener("click", function (event) {
		Entity_Emotion_Page()
	})
	
	document.getElementById("collection-control-button-previous-id").addEventListener("click", function (event) {
		Prev_Image()
	})
	document.getElementById("collection-control-button-next-id").addEventListener("click", function (event) {
		Next_Image()
	})
	document.getElementById("collection-image-annotation-description-textarea-save-button-id").addEventListener("click", function (event) {
		Save_Entity_Description()
	})
	document.getElementById("collection-image-annotation-emotions-save-emotion-button-id").addEventListener("click", function (event) {
		Save_Entity_Emotions()
	})
	document.getElementById("collection-image-annotation-emotions-new-entry-add-emotion-button-id").addEventListener("click", function (event) {
		Add_New_Emotion()
	})
	document.getElementById("collection-image-annotation-navbar-meme-button-id").addEventListener("click", function (event) {
		Entity_Memes_Page()
	})
	document.getElementById("collection-control-button-delete-id").addEventListener("click", function (event) {
		Delete_Entity()
	})
	document.getElementById("collection-image-annotation-memes-save-changes-button-id").addEventListener("click", function (event) {
		Save_Meme_Changes()
	})
	
	await ENTITY_DB_FNS.Create_Db() //sets a global variable in the module to hold the DB for access
	await ENTITY_DB_FNS.Get_All_Keys_From_DB() //gets all entity keys, sets them as a variable available for access later on
	all_collection_keys = await ENTITY_DB_FNS.Read_All_Keys_From_DB() //retrieve the key set stored as a global within the module
	
	if (all_collection_keys.length == 0) {
		await Handle_Empty_DB()
	}
	
	await Show_Entity_From_Key_Or_Current_Entity(all_collection_keys[0]) //set the first entity to be seen, populate entity object data on view
	await Entity_Description_Page() //the Text Description annotation is the first page to see alternative is the text description
	
}

//the key starting point for the page
Initialize_Entity_Page()


async function Handle_Empty_DB() {
	new_default_obj = {...COLLECTION_DEFAULT_EMPTY_OBJECT}
	new_default_obj.entityName = 'Taga' + Math.floor(Math.random() * max);
	new_default_obj.entityImage = 'Taga.png'
	new_default_obj.entityImageSet = ['Taga.png']
	await ENTITY_DB_FNS.Insert_Record(new_default_obj)
	all_collection_keys = [new_default_obj.entityName]
}

//whenever an image is clicked to pop up a modal to give a big display of the image
//and list the tags and emotions
async function Image_Clicked_Modal(filename) {
	
	document.getElementById("modal-image-clicked-displayimg-id").src = DIR_PICS + '/' + filename
	
	// Show the modal
	var modal_meme_click = document.getElementById("modal-image-clicked-top-id");
	modal_meme_click.style.display = "block";
	// Get the button that opens the modal
	var meme_modal_close_btn = document.getElementById("modal-image-clicked-close-button-id");
	// When the user clicks on the button, close the modal
	meme_modal_close_btn.onclick = function () {
		modal_meme_click.style.display = "none";
	}
	// When the user clicks anywhere outside of the modal, close it
	window.onclick = function (event) {
		if (event.target == modal_meme_click) {
			modal_meme_click.style.display = "none";
		}
	}
	
	img_record_obj = await TAGGING_IDB_MODULE.Get_Record(filename)
	tag_array = img_record_obj["taggingTags"]
	modal_html_tmp = `Tags: `
	if (tag_array.length != 0 && !(tag_array.length == 1 && tag_array[0] == "")) {
		tag_array.forEach(function (tag, index) {
			modal_html_tmp += `#${tag} `
		})
	}
	document.getElementById("modal-image-clicked-tag-list-div-container-id").innerHTML = modal_html_tmp
	modal_html_tmp = `Emotions:`
	emotion_keys = Object.keys(img_record_obj["taggingEmotions"])
	if (emotion_keys.length > 0) {
		emotion_keys.forEach(function (key_tmp, index) {
			emotion_value = img_record_obj["taggingEmotions"][key_tmp]
			if (index === emotion_keys.length - 1) {
				modal_html_tmp += `(${key_tmp}: ${emotion_value})`
			} else {
				modal_html_tmp += `(${key_tmp}: ${emotion_value}), `
			}
		})
	}
	document.getElementById("modal-image-clicked-emotion-list-div-container-id").innerHTML = modal_html_tmp
}


/*
SEARCH STUFF ENTITY PROFILE IMAGES!!!
*/
entity_profile_search_obj = {
	emotions: {},
	searchTags: [],
	searchMemeTags: []
}

function Search_Entity_ProfileImage_Populate_Emotions() {
	
	search_emotion_input_div = document.getElementById("modal-entity-profileimage-search-emotion-input-div-id")
	search_emotion_input_div.innerHTML = ""
	//search_emotion_input_div.innerHTML += `<button class="btn btn-primary btn-lg btn-block" id="search-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>`
	search_emotion_input_div.innerHTML += `<div class="input-group mb-3">
                                                <button class="btn btn-primary btn-lg btn-block" id="search-entry-entity-profileimage-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>
                                                
                                                <input type="text" list="cars" id="emotion-entity-profileimage-selector" placeholder="enter emotion" />
                                                <datalist id="cars" >
                                                    <option>Good</option>
                                                    <option>Bad</option>
                                                    <option>Happy</option>
                                                    <option>Confused</option>
                                                </datalist>

                                                <input type="range" class="form-range w-25" id="search-entity-profileimage-emotion-value-entry-id">
                                            </div>
                                            `
	search_emotion_input_div.innerHTML += `<br>
                                            <div id="emotion-entity-profileimage-search-terms">
                                            
                                            </div>
                                            `
	
	document.getElementById("search-entry-entity-profileimage-emotion-add-btn").addEventListener("click", function () {
		
		current_emotion_keys = Object.keys(entity_profile_search_obj["emotions"])
		
		selected_emotion_value = document.getElementById("emotion-entity-profileimage-selector").value
		entered_emotion_label = document.getElementById("emotion-entity-profileimage-selector").value
		emotion_search_entry_value = document.getElementById("search-entity-profileimage-emotion-value-entry-id").value
		
		redundant_label_bool = current_emotion_keys.includes(entered_emotion_label)
		entity_profile_search_obj["emotions"][entered_emotion_label] = emotion_search_entry_value
		
		search_terms_output = ""
		Object.keys(entity_profile_search_obj["emotions"]).forEach(emotion_key => {
			search_terms_output += `<span id="emotion-entity-profileimage-text-search-${emotion_key}" style="white-space:nowrap">
                                    <button type="button" class="close" aria-label="Close" id="remove-emotion-entity-profileimage-search-${emotion_key}">
                                        &#10006
                                    </button>
                                    (emotion:${emotion_key}, value:${entity_profile_search_obj["emotions"][emotion_key]})</span>
                                    `
			
		})
		document.getElementById("emotion-entity-profileimage-search-terms").innerHTML = search_terms_output
		
		Object.keys(entity_profile_search_obj["emotions"]).forEach(emotion_key => {
			document.getElementById(`remove-emotion-entity-profileimage-search-${emotion_key}`).addEventListener("click", function () {
				search_emotion_search_span_html_obj = document.getElementById(`emotion-entity-profileimage-text-search-${emotion_key}`);
				search_emotion_search_span_html_obj.remove();
				delete entity_profile_search_obj["emotions"][emotion_key]
			})
		})
		
	})
}


function Search_Entity_ProfileImage_Populate_Memetic_Component() {
	
	meme_search_tags_div = document.getElementById(`modal-search-entity-profileimage-tags-input-div-id`)
	meme_search_tags_div.innerHTML = `<input type="text" class="form-control" id="search-entity-profileimage-tags-entry-form" placeholder="images that contain memes with theses tags">`
	
}


//entity_profile_search_obj = {
//emotions:{},
//searchTags:[],
//searchMemeTags:[]
//}
async function Entity_Profile_Image_Search() {
	
	console.log(`choose entity image search`)
	
	reg_exp_delims = /[#:,;| ]+/
	
	//annotation tags
	search_tags_input = document.getElementById("search-tags-entity-profileimage-entry-form").value
	split_search_string = search_tags_input.split(reg_exp_delims)
	search_unique_search_terms = [...new Set(split_search_string)]
	entity_profile_search_obj["searchTags"] = search_unique_search_terms
	
	//meme tags now
	search_meme_tags_input = document.getElementById("search-entity-profileimage-tags-entry-form").value
	split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
	search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
	entity_profile_search_obj["searchMemeTags"] = search_unique_meme_search_terms
	
	console.log(`entity_profile_search_obj = ${JSON.stringify(entity_profile_search_obj)}`)
	
	gallery_images = current_entity_obj.entityImageSet
	console.log(`gallery_images = ${gallery_images}`)
	
	search_description_tags = entity_profile_search_obj["searchTags"]
	search_emotions = entity_profile_search_obj["emotions"]
	search_meme_tags = entity_profile_search_obj["searchMemeTags"]
	
	//Get the annotation objects for the keys
	key_search_scores = Array(gallery_images.length).fill(0)
	for (key_ind = 0; key_ind < gallery_images.length; key_ind++) {
		await TAGGING_IDB_MODULE.Create_Db()
		gallery_image_tmp = gallery_images[key_ind]
		gallery_image_tagging_annotation_obj_tmp = await TAGGING_IDB_MODULE.Get_Record(gallery_image_tmp)
		console.log(`gallery_image_tagging_annotation_obj_tmp = ${JSON.stringify(gallery_image_tagging_annotation_obj_tmp)}`)
		
		record_tmp_tags = gallery_image_tagging_annotation_obj_tmp["taggingTags"]
		record_tmp_emotions = gallery_image_tagging_annotation_obj_tmp["taggingEmotions"]
		record_tmp_memes = gallery_image_tagging_annotation_obj_tmp["taggingMemeChoices"]
		
		//get the score of the overlap of the object with the search terms
		console.log(`record_tmp_tags = ${record_tmp_tags}`)
		tags_overlap_score = (record_tmp_tags.filter(x => search_description_tags.includes(x))).length
		console.log(`tags_overlap_score = ${tags_overlap_score}`)
		
		//get the score for the emotions
		emotion_overlap_score = 0
		record_tmp_emotion_keys = Object.keys(record_tmp_emotions)
		search_emotions_keys = Object.keys(search_emotions)
		search_emotions_keys.forEach(search_key_emotion_label => {
			record_tmp_emotion_keys.forEach(record_emotion_key_label => {
				if (search_key_emotion_label.toLowerCase() == record_emotion_key_label.toLowerCase()) {
					delta_tmp = (record_tmp_emotions[record_emotion_key_label] - search_emotions[search_key_emotion_label]) / 50
					emotion_overlap_score_tmp = 1 - Math.abs(delta_tmp)
					emotion_overlap_score += emotion_overlap_score_tmp
				}
			})
		})
		console.log(`emotion_overlap_score = ${emotion_overlap_score}`)
		
		//get the score for the memes
		meme_tag_overlap_score = 0
		console.log(`record_tmp tagging meme choices = ${record_tmp_memes}`)
		for (let rtm = 0; rtm < record_tmp_memes.length; rtm++) {
			meme_record_tmp = await TAGGING_IDB_MODULE.Get_Record(record_tmp_memes[rtm])
			meme_tmp_tags = meme_record_tmp["taggingTags"]
			console.log(`the meme's tags = ${meme_tmp_tags}`)
			console.log(`the search_meme_tags = ${search_meme_tags}`)
			meme_tag_overlap_score_tmp = (meme_tmp_tags.filter(x => search_meme_tags.includes(x))).length
			meme_tag_overlap_score += meme_tag_overlap_score_tmp
		}
		console.log(`meme_tag_overlap_score = ${meme_tag_overlap_score}`)
		
		//get the overlap score for this image ii
		total_image_match_score = tags_overlap_score + emotion_overlap_score + meme_tag_overlap_score //tags_overlap_score +  +
		console.log(`the total_image_match_score ${key_ind} = ${total_image_match_score}`)
		key_search_scores[key_ind] = total_image_match_score
	}
	
	console.log(`key_search_scores = ${key_search_scores}`)
	
	//now get the file sorted order via sort
	//for ranks where highest score is rank 1
	key_search_scores_sorted = key_search_scores.slice().sort(function (a, b) {
		return b - a
	})
	//for ranks where the highest score is rank N
	//key_search_scores_sorted = key_search_scores.slice().sort(function(a,b){return a-b})
	key_search_scores_sorted_ranks = key_search_scores.map(function (v) {
		return key_search_scores_sorted.indexOf(v) + 1
	});
	console.log(`key_search_scores_sorted_ranks = ${key_search_scores_sorted_ranks}`)
	sorted_score_file_keys = []
	while (key_search_scores_sorted_ranks.reduce((a, b) => a + b, 0) > 0) {
		max_rank_val = Math.max(...key_search_scores_sorted_ranks)
		index_max_val = key_search_scores_sorted_ranks.indexOf(max_rank_val)
		sorted_score_file_keys.unshift(gallery_images[index_max_val])
		key_search_scores_sorted_ranks[index_max_val] = 0
	}
	
	console.log(`drum role file sorted list sorted_score_file_keys = ${sorted_score_file_keys}`)
	
	//populate the zone with images from the Gallery in the default order they are stored
	search_entity_profileimage_results_output = document.getElementById("search-modal-entityprofile-image-results")
	search_entity_profileimage_results_output.innerHTML = ""
	search_entity_profileimage_results_output.insertAdjacentHTML('beforeend', "<br>")
	sorted_score_file_keys.forEach(file_key => {
		search_entity_profileimage_results_output.insertAdjacentHTML('beforeend', `<img class="imgMemeResult" id="entity-profile-image-candidate-id-${file_key}" src="${DIR_PICS}/${file_key}">`)//+= `<img class="imgMemeResult" src="${image_set_search}">`
	})
	//add an event listener to the images so that they emit an event to the user clicking on it
	sorted_score_file_keys.forEach(filename => {
		document.getElementById(`entity-profile-image-candidate-id-${filename}`).addEventListener("click", function () {
			Entity_Profile_Candidate_Image_Clicked(filename);
		}, false);
	});
	
	
}


//handle images being clicked by the user in choosing a new entity profile image
function Entity_Profile_Candidate_Image_Clicked(filename) {
	
	console.log(`filename=${filename}, of the image clicked by the user in choosing a new entityprofile image`)
	//set the current entity object profile image to the new file name, update the DB with the new assignment, redisplay
	current_entity_obj.entityImage = filename
	ENTITY_DB_FNS.Update_Record(current_entity_obj)
	Show_Entity_From_Key_Or_Current_Entity(all_collection_keys[current_key_index])
	//close modal
	var search_modal = document.getElementById("top-profile-image-choice-modal-id");
	search_modal.style.display = "none";
	
}


/******************************
MEME SEARCH STUFF!!!
 ******************************/
meme_tagging_search_obj = {
	meme_emotions: {},
	emotions: {},
	searchTags: [],
	searchMemeTags: []
}
search_complete = false

//called from the HTML button onclik
//add a new meme which is searched for by the user
function New_Entity_Memes() {
	
	meme_tagging_search_obj = {
		meme_emotions: {},
		emotions: {},
		searchTags: [],
		searchMemeTags: []
	}
	//clear the search form from previous entries
	search_tags_input = document.getElementById("search-meme-tags-entry-form")
	search_tags_input.value = ""
	search_tags_input = document.getElementById("search-meme-image-tags-entry-form")
	search_tags_input.value = ""
	//clear the previous search results
	document.getElementById("search-meme-image-results-box-label").innerHTML = ""
	document.getElementById("search-meme-modal-image-memes").innerHTML = ""
	
	console.log(`add meme button pressed`)
	
	var search_modal = document.getElementById("top-tagging-meme-search-modal-id");
	search_modal.style.display = "block";
	var close_element = document.getElementById("search-meme-close-modal-id");
	close_element.onclick = function () {
		search_modal.style.display = "none";
	}
	window.onclick = function (event) {
		if (event.target == search_modal) {
			search_modal.style.display = "none";
		}
	}
	var select_image_search_order = document.getElementById("search-meme-modal-load-image-order")
	select_image_search_order.onclick = function () {
		Meme_Choose_Search_Results()
	}
	
	// //populate the search meme modal with the fields to insert emotion tags and values
	Search_Meme_Populate_Emotions()
	// //and for the emotions of the images
	Search_Meme_Image_Populate_Emotions()
	
}


//
function Search_Meme_Populate_Emotions() {
	
	search_emotion_input_div = document.getElementById("modal-meme-search-emotion-input-div-id")
	search_emotion_input_div.innerHTML = ""
	//search_emotion_input_div.innerHTML += `<button class="btn btn-primary btn-lg btn-block" id="search-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>`
	search_emotion_input_div.innerHTML += `<div class="input-group mb-3">
                                                <button class="btn btn-primary btn-lg btn-block" id="search-meme-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>
                                                
                                                <input type="text" list="cars" id="emotion-meme-selector" placeholder="emotions of meme" />
                                                <datalist id="cars" >
                                                    <option>Good</option>
                                                    <option>Bad</option>
                                                    <option>Happy</option>
                                                    <option>Confused</option>
                                                </datalist>

                                                <input type="range" class="form-range w-25" id="search-meme-emotion-value-entry-id">
                                            </div>
                                            `
	search_emotion_input_div.innerHTML += `<br>
                                            <div id="emotion-meme-search-terms">
                                            
                                            </div>
                                            `
	
	document.getElementById("search-meme-entry-emotion-add-btn").addEventListener("click", function () {
		
		current_emotion_keys = Object.keys(meme_tagging_search_obj["meme_emotions"])
		selected_emotion_value = document.getElementById("emotion-meme-selector").value
		entered_emotion_label = document.getElementById("emotion-meme-selector").value
		emotion_search_entry_value = document.getElementById("search-meme-emotion-value-entry-id").value
		redundant_label_bool = current_emotion_keys.includes(entered_emotion_label)
		meme_tagging_search_obj["meme_emotions"][entered_emotion_label] = emotion_search_entry_value
		
		search_terms_output = ""
		Object.keys(meme_tagging_search_obj["meme_emotions"]).forEach(emotion_key => {
			search_terms_output += `<span id="emotion-meme-text-search-${emotion_key}" style="white-space:nowrap">
                                    <button type="button" class="close" aria-label="Close" id="remove-meme-emotion-search-${emotion_key}">
                                        &#10006
                                    </button>
                                    (emotion:${emotion_key}, value:${meme_tagging_search_obj["meme_emotions"][emotion_key]})</span>
                                    `
		})
		document.getElementById("emotion-meme-search-terms").innerHTML = search_terms_output
		Object.keys(meme_tagging_search_obj["meme_emotions"]).forEach(emotion_key => {
			document.getElementById(`remove-meme-emotion-search-${emotion_key}`).addEventListener("click", function () {
				search_emotion_search_span_html_obj = document.getElementById(`emotion-meme-text-search-${emotion_key}`);
				search_emotion_search_span_html_obj.remove();
				delete meme_tagging_search_obj["meme_emotions"][emotion_key]
			})
		})
	})
}


function Search_Meme_Image_Populate_Emotions() {
	search_emotion_input_div = document.getElementById("modal-meme-search-image-emotion-input-div-id")
	search_emotion_input_div.innerHTML = ""
	//search_emotion_input_div.innerHTML += `<button class="btn btn-primary btn-lg btn-block" id="search-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>`
	search_emotion_input_div.innerHTML += `<div class="input-group mb-3">
                                                <button class="btn btn-primary btn-lg btn-block" id="search-meme-image-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>
                                                
                                                <input type="text" list="cars" id="emotion-meme-image-selector" placeholder="emotions connected to meme" />
                                                <datalist id="cars" >
                                                    <option>Good</option>
                                                    <option>Bad</option>
                                                    <option>Happy</option>
                                                    <option>Confused</option>
                                                </datalist>

                                                <input type="range" class="form-range w-25" id="search-meme-image-emotion-value-entry-id">
                                            </div>
                                            `
	search_emotion_input_div.innerHTML += `<br>
                                            <div id="emotion-meme-image-search-terms">
                                            
                                            </div>
                                            `
	
	document.getElementById("search-meme-image-entry-emotion-add-btn").addEventListener("click", function () {
		
		current_emotion_keys = Object.keys(meme_tagging_search_obj["emotions"])
		selected_emotion_value = document.getElementById("emotion-meme-image-selector").value
		entered_emotion_label = document.getElementById("emotion-meme-image-selector").value
		emotion_search_entry_value = document.getElementById("search-meme-image-emotion-value-entry-id").value
		redundant_label_bool = current_emotion_keys.includes(entered_emotion_label)
		meme_tagging_search_obj["emotions"][entered_emotion_label] = emotion_search_entry_value
		search_terms_output = ""
		Object.keys(meme_tagging_search_obj["emotions"]).forEach(emotion_key => {
			search_terms_output += `<span id="emotion-meme-image-text-search-${emotion_key}" style="white-space:nowrap">
                                    <button type="button" class="close" aria-label="Close" id="remove-meme-image-emotion-search-${emotion_key}">
                                        &#10006
                                    </button>
                                    (emotion:${emotion_key}, value:${meme_tagging_search_obj["emotions"][emotion_key]})</span>
                                    `
		})
		document.getElementById("emotion-meme-image-search-terms").innerHTML = search_terms_output
		Object.keys(meme_tagging_search_obj["emotions"]).forEach(emotion_key => {
			document.getElementById(`remove-meme-image-emotion-search-${emotion_key}`).addEventListener("click", function () {
				search_emotion_search_span_html_obj = document.getElementById(`emotion-meme-image-text-search-${emotion_key}`);
				search_emotion_search_span_html_obj.remove();
				delete meme_tagging_search_obj["emotions"][emotion_key]
			})
		})
	})
}


//the functionality to use the object to
//search the DB for relevant memes
async function Modal_Meme_Search_Btn() {
	
	console.log(`search memes now!`)
	//after doing the search
	search_meme_complete = true
	
	reg_exp_delims = /[#:,;| ]+/
	
	//annotation tags
	search_tags_input = document.getElementById("search-meme-tags-entry-form").value
	split_search_string = search_tags_input.split(reg_exp_delims)
	search_unique_search_terms = [...new Set(split_search_string)]
	meme_tagging_search_obj["searchMemeTags"] = search_unique_search_terms
	
	//emotions, the key values should already be in the search object
	selected_emotion_value = document.getElementById("emotion-meme-selector").value
	entered_emotion_label = document.getElementById("emotion-meme-selector").value
	emotion_search_entry_value = document.getElementById("search-meme-emotion-value-entry-id").value
	
	//meme tags now
	search_meme_tags_input = document.getElementById("search-meme-image-tags-entry-form").value
	split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
	search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
	meme_tagging_search_obj["searchTags"] = search_unique_meme_search_terms
	
	console.log(`the meme search term object is = ${JSON.stringify(meme_tagging_search_obj)}`)
	
	//search the DB according to this set of criteria
	//look through the keys and find the overlapping set
	await TAGGING_IDB_MODULE.Create_Db()
	await TAGGING_IDB_MODULE.Get_All_Keys_From_DB()
	search_meme_results = await TAGGING_IDB_MODULE.Search_Meme_Images_Basic_Relevances(meme_tagging_search_obj)
	console.log(`search_meme_results = ${search_meme_results}`)
	
	search_sorted_meme_image_filename_keys = search_meme_results[0]
	search_sorted_image_filename_keys = search_meme_results[1]
	
	//>>SHOW SEARCH RESULTS<<
	//search images results annotations
	search_image_results_output = document.getElementById("search-meme-image-results-box-label")
	//get the record to know the memes that are present to not present any redundancy
	//(NOT NEEDED) record = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])//JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
	memes_current = current_entity_obj.entityMemes
	
	//search meme results
	search_meme_results_output = document.getElementById("search-meme-modal-image-memes")
	search_meme_results_output.innerHTML = `<label id="search-meme-modal-image-memes-label" class="form-label">associated images</label>`
	search_meme_results_output.insertAdjacentHTML('beforeend', "<br>")
	search_sorted_meme_image_filename_keys.forEach(file_key => {
		if (memes_current.includes(file_key) == false) {  //exclude memes already present
			search_meme_results_output.insertAdjacentHTML('beforeend', `
            <input class="custom-control custom-switch custom-control-input form-control-lg" type="checkbox" value="" id="meme-choice-${file_key}"> 
            <img class="imgSearchMemeResult" src="${TAGA_IMAGE_DIRECTORY}/${file_key}"> <br>`)//+= `<img class="imgMemeResult" src="${image_set_search}">`
		}
	})
	
	search_image_results_output.innerHTML = `<label id="search-meme-image-results-box-label" class="form-label">dominant memes</label>`
	search_image_results_output.insertAdjacentHTML('beforeend', "<br>")
	search_sorted_image_filename_keys.forEach(file_key => {
		console.log(`image file = ${TAGA_IMAGE_DIRECTORY}/${file_key}`)
		if (memes_current.includes(file_key) == false) {  //exclude memes already present
			search_image_results_output.insertAdjacentHTML('beforeend', `
            <input class="custom-control custom-switch custom-control-input form-control-lg" type="checkbox" value="" id="meme-image-choice-${file_key}">  
            <img class="imgSearchMemeResult" src="${TAGA_IMAGE_DIRECTORY}/${file_key}"> <br>`)   //innerHTML += `<img class="imgSearchResult" src="${image_set_search}">`
		}
	})
	
}


//after the search is done and
async function Meme_Choose_Search_Results() {
	//Now update the current file list with the new order of pics 'search_results' which comes from the
	//DB search function
	if (search_meme_complete == true) {
		console.log(`in choose image saerch resutls search_results = ${search_meme_results}, search length = ${search_meme_results.length}`)
		
		//record = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])//JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
		memes_current = current_entity_obj.entityMemes //memes_current = record.taggingMemeChoices
		
		current_file_list_IDB = TAGGING_IDB_MODULE.Read_All_Keys_From_DB()
		//meme selection switch check boxes
		meme_switch_booleans = []
		for (var ii = 0; ii < current_file_list_IDB.length; ii++) {
			if (memes_current.includes(current_file_list_IDB[ii]) == false) {  //exclude memes already present
				meme_boolean_tmp1 = document.getElementById(`meme-choice-${current_file_list_IDB[ii]}`).checked
				meme_boolean_tmp2 = document.getElementById(`meme-image-choice-${current_file_list_IDB[ii]}`).checked
				if (meme_boolean_tmp1 == true || meme_boolean_tmp2 == true) {
					meme_switch_booleans.push(current_file_list_IDB[ii])
				}
			}
		}
		console.log(`meme_switch_booleans = ${meme_switch_booleans}`)
		
		//the picture file name in context
		//image_name = `${image_files_in_dir[image_index - 1]}`
		//raw user entered text (prior to processing)
		//rawDescription = document.getElementById('descriptionInput').value
		
		meme_switch_booleans.push(...current_entity_obj.entityMemes)
		current_entity_obj.entityMemes = [...new Set(meme_switch_booleans)]
		//await TAGGING_IDB_MODULE.Update_Record(record)
		await ENTITY_DB_FNS.Update_Record(current_entity_obj)
		
		Entity_Memes_Page() //Load_State_Of_Image_IDB()
		
		search_modal = document.getElementById("top-tagging-meme-search-modal-id");
		search_modal.style.display = "none";
	}
	
}


//GALLERY IMAGE ADDITION
tagging_search_obj = {
	emotions: {},
	searchTags: [],
	searchMemeTags: []
}
search_complete = false

//include an extra set of images to the gallery (on top of the previous set)
async function Add_Gallery_Images() {
	console.log(`add more images to the Gallery`)
	//XXX
	tagging_search_obj = {
		emotions: {},
		searchTags: [],
		searchMemeTags: []
	}
	search_tags_input = document.getElementById("search-tags-entry-form")
	search_tags_input.value = ""
	
	var search_modal = document.getElementById("top-tagging-search-modal-id");
	search_modal.style.display = "block";
	var close_element = document.getElementById("search-close-modal-id");
	close_element.onclick = function () {
		search_modal.style.display = "none";
	}
	window.onclick = function (event) {
		if (event.target == search_modal) {
			search_modal.style.display = "none";
		}
	}
	var select_image_search_order = document.getElementById("search-modal-load-image-order")
	select_image_search_order.onclick = function () {
		Choose_Entity_Gallery_Image_Results()
	}
	
	//populate the search modal with the fields to insert emotion tags and values
	Search_Populate_Emotions()
	//populate the search modal with the fields to insert meme tags
	Search_Populate_Memetic_Component()
	
	Search_For_Entity_Gallery_Images()
	search_complete = true
	
}

async function Search_For_Entity_Gallery_Images() {
	
	console.log(`in function Add_Gallery_Images_Search_Entry()`)
	
	reg_exp_delims = /[#:,;| ]+/
	
	//annotation tags
	search_tags_input = document.getElementById("search-tags-entry-form").value
	split_search_string = search_tags_input.split(reg_exp_delims)
	search_unique_search_terms = [...new Set(split_search_string)]
	tagging_search_obj["searchTags"] = search_unique_search_terms
	
	//!!!REDUNDANT???!!!>>>
	//emotions, the key values should already be in the search object !!!NOT USED???!!!
	selected_emotion_value = document.getElementById("emotion-selector").value
	entered_emotion_label = document.getElementById("emotion-selector").value
	emotion_search_entry_value = document.getElementById("search-emotion-value-entry-id").value
	
	//meme tags now
	search_meme_tags_input = document.getElementById("search-meme-tags-entry-form").value
	split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
	search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
	tagging_search_obj["searchMemeTags"] = search_unique_meme_search_terms
	
	console.log(`the search term object is = ${JSON.stringify(tagging_search_obj)}`)
	
	
	//search the DB according to this set of criteria
	//look through the keys and find the overlapping set
	await TAGGING_IDB_MODULE.Create_Db()
	await TAGGING_IDB_MODULE.Get_All_Keys_From_DB()
	search_results = await TAGGING_IDB_MODULE.Search_Images_Basic_Relevances(tagging_search_obj)
	image_set = current_entity_obj.entityImageSet
	search_sorted_image_filename_keys = search_results[0]
	search_sorted_meme_image_filename_keys = search_results[1]
	console.log(`image_set_search done`)
	console.log(`search_sorted_image_filename_keys = ${search_sorted_image_filename_keys}`)
	//>>SHOW SEARCH RESULTS<<
	//search images results annotations
	search_image_results_output = document.getElementById("search-modal-image-results")
	
	search_image_results_output.innerHTML = `<label id="search-image-results-box-label" class="form-label">image matches</label>`
	search_image_results_output.insertAdjacentHTML('beforeend', "<br>")
	search_sorted_image_filename_keys.forEach(file_key => {
		console.log(`image file = ${TAGA_IMAGE_DIRECTORY}/${file_key}`)
		if (image_set.includes(file_key) == false) {
			search_image_results_output.insertAdjacentHTML('beforeend', `
            <input class="custom-control custom-switch custom-control-input form-control-lg" type="checkbox" value="" id="gallery-image-choice-${file_key}">  
            <img class="imgSearchResult" src="${TAGA_IMAGE_DIRECTORY}/${file_key}">`)   //innerHTML += `<img class="imgSearchResult" src="${image_set_search}">`
		}
	})
	
	//search meme results
	search_meme_results_output = document.getElementById("search-modal-image-memes")
	search_meme_results_output.innerHTML = `<label id="search-modal-image-memes-label" class="form-label">meme relevance</label>`
	search_meme_results_output.insertAdjacentHTML('beforeend', "<br>")
	search_sorted_meme_image_filename_keys.forEach(file_key => {
		if (image_set.includes(file_key) == false) {
			search_meme_results_output.insertAdjacentHTML('beforeend', `
            <input class="custom-control custom-switch custom-control-input form-control-lg" type="checkbox" value="" id="gallery-meme-image-choice-${file_key}">  
            <img class="imgMemeResult" src="${TAGA_IMAGE_DIRECTORY}/${file_key}">`)//+= `<img class="imgMemeResult" src="${image_set_search}">`
		}
	})
	
}


function Search_Populate_Emotions() {
	
	
	search_emotion_input_div = document.getElementById("modal-search-emotion-input-div-id")
	search_emotion_input_div.innerHTML = ""
	//search_emotion_input_div.innerHTML += `<button class="btn btn-primary btn-lg btn-block" id="search-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>`
	search_emotion_input_div.innerHTML += `<div class="input-group mb-3">
                                                <button class="btn btn-primary btn-lg btn-block" id="search-entry-emotion-add-btn" type="button" onclick=""> &#xFF0B; </button>
                                                
                                                <input type="text" list="cars" id="emotion-selector" placeholder="enter emotion" />
                                                <datalist id="cars" >
                                                    <option>Good</option>
                                                    <option>Bad</option>
                                                    <option>Happy</option>
                                                    <option>Confused</option>
                                                </datalist>

                                                <input type="range" class="form-range w-25" id="search-emotion-value-entry-id">
                                            </div>
                                            `
	search_emotion_input_div.innerHTML += `<br>
                                            <div id="emotion-search-terms">
                                            
                                            </div>
                                            `
	
	document.getElementById("search-entry-emotion-add-btn").addEventListener("click", function () {
		
		current_emotion_keys = Object.keys(tagging_search_obj["emotions"])
		
		selected_emotion_value = document.getElementById("emotion-selector").value
		entered_emotion_label = document.getElementById("emotion-selector").value
		emotion_search_entry_value = document.getElementById("search-emotion-value-entry-id").value
		
		redundant_label_bool = current_emotion_keys.includes(entered_emotion_label)
		tagging_search_obj["emotions"][entered_emotion_label] = emotion_search_entry_value
		
		search_terms_output = ""
		Object.keys(tagging_search_obj["emotions"]).forEach(emotion_key => {
			search_terms_output += `<span id="emotion-text-search-${emotion_key}" style="white-space:nowrap">
                                    <button type="button" class="close" aria-label="Close" id="remove-emotion-search-${emotion_key}">
                                        &#10006
                                    </button>
                                    (emotion:${emotion_key}, value:${tagging_search_obj["emotions"][emotion_key]})</span>
                                    `
			
		})
		document.getElementById("emotion-search-terms").innerHTML = search_terms_output
		
		Object.keys(tagging_search_obj["emotions"]).forEach(emotion_key => {
			document.getElementById(`remove-emotion-search-${emotion_key}`).addEventListener("click", function () {
				search_emotion_search_span_html_obj = document.getElementById(`emotion-text-search-${emotion_key}`);
				search_emotion_search_span_html_obj.remove();
				delete tagging_search_obj["emotions"][emotion_key]
			})
		})
		
	})
}

function Search_Populate_Memetic_Component() {
	
	meme_search_tags_div = document.getElementById(`modal-search-meme-tags-input-div-id`)
	meme_search_tags_div.innerHTML = `<input type="text" class="form-control" id="search-meme-tags-entry-form" placeholder="images that contain memes with theses tags">`
	
}


async function Choose_Entity_Gallery_Image_Results() {
	
	console.log(`in Choose_Entity_Gallery_Image_Results = ${search_results}, search length = ${search_results.length}`)
	
	if (search_complete == true) {
		image_set = current_entity_obj.entityImageSet
		search_sorted_image_filename_keys = search_results[0]
		search_sorted_image_filename_keys.forEach(filename => {
			if (image_set.includes(filename) == false) {
				image_checked = document.getElementById(`gallery-image-choice-${filename}`).checked
				meme_checked = document.getElementById(`gallery-meme-image-choice-${filename}`).checked
				if (image_checked == true || meme_checked == true) {
					image_set.push(filename)
				}
			}
		})
		current_entity_obj.entityImageSet = image_set
		await ENTITY_DB_FNS.Update_Record(current_entity_obj)
		await Show_Entity_From_Key_Or_Current_Entity(all_collection_keys[current_key_index])
		search_modal = document.getElementById("top-tagging-search-modal-id");
		search_modal.style.display = "none";
	}
	
	// if( search_complete == true ){
	//     console.log(`in choose image saerch resutls search_results = ${search_meme_results}, search length = ${search_meme_results.length}`)
	
	//     //record = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])//JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
	//     memes_current = current_entity_obj.entityMemes //memes_current = record.taggingMemeChoices
	
	//     current_file_list_IDB = TAGGING_IDB_MODULE.Read_All_Keys_From_DB()
	//     //meme selection switch check boxes
	//     meme_switch_booleans = []
	//     for (var ii = 0; ii < current_file_list_IDB.length; ii++) {
	//         if(memes_current.includes(current_file_list_IDB[ii]) == false){  //exclude memes already present
	//             meme_boolean_tmp1 = document.getElementById(`meme-choice-${current_file_list_IDB[ii]}`).checked
	//             meme_boolean_tmp2 = document.getElementById(`meme-image-choice-${current_file_list_IDB[ii]}`).checked
	//             if(meme_boolean_tmp1 == true || meme_boolean_tmp2 == true){
	//                 meme_switch_booleans.push(current_file_list_IDB[ii])
	//             }
	//         }
	//     }
	//     console.log(`meme_switch_booleans = ${meme_switch_booleans}`)
	
	//     //the picture file name in context
	//     //image_name = `${image_files_in_dir[image_index - 1]}`
	//     //raw user entered text (prior to processing)
	//     //rawDescription = document.getElementById('descriptionInput').value
	
	//     meme_switch_booleans.push(...current_entity_obj.entityMemes)
	//     current_entity_obj.entityMemes = [...new Set(meme_switch_booleans)]
	//     //await TAGGING_IDB_MODULE.Update_Record(record)
	//     await ENTITY_DB_FNS.Update_Record(current_entity_obj)
	
	//     Entity_Memes_Page() //Load_State_Of_Image_IDB()
	
	//     search_modal = document.getElementById("top-tagging-meme-search-modal-id");
	//     search_modal.style.display = "none";
	// }
	
	// search_sorted_image_filename_keys = search_results[0]
	// search_results_selected = search_sorted_image_filename_keys
	// image_files_in_dir = search_results_selected
	// image_index = 1;
	// Load_State_Of_Image_IDB()
	// search_modal = document.getElementById("top-tagging-search-modal-id");
	// search_modal.style.display = "none";
	
	
}


//OLD CODE NO LONGER USED BUT WAS OK WORKING CODE
/*
//choose a new entity meme set from an already built entity (replace the previous meme set)
async function New_Entity_Memes_OLD(){
    result = await IPC_RENDERER_PICS.invoke('dialog:openEntityImageSet')
    files_tmp = result.filePaths
    files_tmp_base = files_tmp.map(function(filePATH) { //get an array of the base file paths chosen
        return PATH.parse(filePATH).base
    })
    //handle images that may not be in the app's local image directory yet and copy over if needed
    if(files_tmp_base.length == 0){
        //console.log('empty meme array chosen')
    } else {
        directory_of_image = PATH.dirname(result.filePaths[0]) //get the directory of the images selected
        if(directory_of_image != DIR_PICS){ //user did not select the taga image store
            //this custom copy handles filename collisions by adding random salt to the file name before adding it if needed
            files_tmp_base = MY_FILE_HELPER.Copy_Non_Taga_Files(result,DIR_PICS) //returns the new file names in local dir space
        } else{
            //console.log('files are in the taga images directory')
        }
    }

    current_entity_obj.entityMemes = files_tmp_base
    ENTITY_DB_FNS.Update_Record(current_entity_obj) //update the DB with the new meme file names
    Entity_Memes_Page() //update the meme annotation subview with the new updated entity meme records
}
*/

/*
    gallery_html = `<div class="row">`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="Add_Gallery_Images()">add more images</button><br>`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="New_Gallery_Images()">new images</button><br>`
    default_PATH = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' 
    image_set = current_entity_obj.entityImageSet
    image_set.forEach(element => {
        gallery_html += `
        <img class="imgG" src="${default_PATH + element}">
        `
    });    
    gallery_html += `</div>`
    document.getElementById("entityGallery").innerHTML  = gallery_html;
*/

/*
    gallery_html = `<div class="row">`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="Add_Gallery_Images()">add more images</button><br>`
    gallery_html += `<button type="button" class="btn btn-primary btn-lg" onclick="New_Gallery_Images()">new images</button><br>`
    default_PATH = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' 
    image_set = current_entity_obj.entityImageSet
    image_set.forEach(element => {
        gallery_html += `
        <img class="imgG" src="${default_PATH + element}">
        `
    });    
    gallery_html += `</div>`
    document.getElementById("entityGallery").innerHTML  = gallery_html;
    ENTITY_DB_FNS.Update_Record(current_entity_obj)
*/

/*
    gallery_html = `<div class="row" id="meme_page_view">`
    memes_array = current_entity_obj.entityMemes
    if(memes_array != ""){
        memes_array.forEach(element => {
            gallery_html += `
            <img class="imgG" src="${DIR_PICS + '/' + element}">
            `
        });    
    }
    gallery_html += `<br><button type="button" class="btn btn-primary btn-lg" onclick="New_Entity_Memes()">Choose new memes</button>`
    document.getElementById("annotationPages").innerHTML  = gallery_html;
    */

/*
Load_First_Image()

function Load_First_Image(){
    default_img = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/Taga.png'
    console.log(default_img)
    document.getElementById("entityProfileImg").src = default_img;
}

async function Load_Entity_Gallery(){
    console.log('entity gallery')
    default_img = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/Taga.png'
    gallery_html = `<div class="row">    
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    <img class="imgG" src="${default_img}">
    `    
    gallery_html += `</div>`
    document.getElementById("entityGallery").innerHTML  = gallery_html;    
} */

//const controller = require('./myJS/controller-main.js');
const fns_DB = require('./myJS/db-access-module.js');
db_name = 'mydb'
table_name = 'table9'
const database = fns_DB.DB_Open(db_name)


console.log('about to get all data')
all_data = fns_DB.Return_All_DB_Data().then(function(results){console.log(results)})

console.log('after asking for all data')
//console.log(all_data)


console.log(all_data.rows)

document.getElementById('tagged_percentage').innerHTML = "12%"
document.getElementById('tagged_percentage').style.width = "12%";

document.getElementById('emotion_stamped_percentage').innerHTML = "22%"
document.getElementById('emotion_stamped_percentage').style.width = "22%";

document.getElementById('meme_connected_images').innerHTML = "55%"
document.getElementById('meme_connected_images').style.width = "55%";

document.getElementById('awesomeness_score').innerHTML = "55%"
document.getElementById('awesomeness_score').style.width = "55%";

console.log("in db analytics js")
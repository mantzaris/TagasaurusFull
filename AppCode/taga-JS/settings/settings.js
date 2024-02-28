const fs = require('fs');
const path = require('path');

const font_family_select_el = document.getElementById('font-family-selection');

font_family_select_el.value = Load_Font_Family();
font_family_select_el.addEventListener('change', Update_Font_Family);

function Update_Font_Family(event) {
  const family = font_family_select_el.value;
  localStorage.setItem('font-family', family);
  document.body.style.fontFamily = `var(--${family})`;
}

////////////////////////////////////////
//for the language settings
////////////////////////////////////////
function Get_StopWord_Language_List() {
  const filePath = path.join(__dirname, '..', 'Assets', 'languages', 'language-list.json');
  const jsonData = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(jsonData);
}

function Populate_StopWords_Langs() {
  const languages = Get_StopWord_Language_List();
  const dropdownMenu = document.querySelector('.stopword-dropdown-menu');
  const selectedLanguages = JSON.parse(localStorage.getItem('selected-stopword-languages')) || [];

  languages.forEach((lang) => {
    const checkboxDiv = document.createElement('div');
    checkboxDiv.className = 'form-check';

    const checkbox = document.createElement('input');
    checkbox.className = 'form-check-input stopword-lang-checkbox';
    checkbox.type = 'checkbox';
    checkbox.value = lang.code;
    checkbox.id = `stopword-lang-${lang.code}`;

    if (selectedLanguages.includes(lang.code) || lang.stop_word_default) {
      checkbox.checked = true;
    }
    checkbox.disabled = lang.stop_word_default;

    const label = document.createElement('label');
    label.className = 'form-check-label';
    label.htmlFor = `stopword-lang-${lang.code}`;
    label.textContent = lang.name;

    checkboxDiv.appendChild(checkbox);
    checkboxDiv.appendChild(label);

    dropdownMenu.appendChild(checkboxDiv);
  });
}

document.querySelectorAll('.stopword-dropdown-menu').forEach(function (menu) {
  menu.addEventListener('click', function (event) {
    event.stopPropagation();
  });
});

document.querySelector('.stopword-dropdown-menu').addEventListener('click', function (event) {
  if (event.target.classList.contains('stopword-lang-checkbox')) {
    Update_Stopword_Languages();
  }
});

function Update_Stopword_Languages() {
  const selectedLanguages = Array.from(document.querySelectorAll('.stopword-lang-checkbox:checked')).map((cb) => cb.value);
  localStorage.setItem('selected-stopword-languages', JSON.stringify(selectedLanguages));
}

window.addEventListener('DOMContentLoaded', Populate_StopWords_Langs);

////////////////////
//for FPS selection
////////////////////
let current_fps = parseFloat(localStorage.getItem('face-api-FPS'));
document.getElementById('fps-selection').value = current_fps ? current_fps : 0.5;
document.getElementById('fps-selection').addEventListener('change', Update_faceapi_FPS);

function Update_faceapi_FPS(event) {
  const fps = document.getElementById('fps-selection').value;
  localStorage.setItem('face-api-FPS', fps);
}

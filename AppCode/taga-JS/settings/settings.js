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
function updateLanguageSettings() {
  const langCheckboxes = document.querySelectorAll('.lang-checkbox');
  const selectedLanguages = Array.from(langCheckboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

  localStorage.setItem('selected-languages', JSON.stringify(selectedLanguages));
}

document.querySelectorAll('.lang-checkbox').forEach((checkbox) => {
  checkbox.addEventListener('change', updateLanguageSettings);
});

function populateLanguageSettings() {
  const selectedLanguages = JSON.parse(localStorage.getItem('selected-languages')) || ['eng', 'ell'];

  selectedLanguages.forEach((langCode) => {
    const checkbox = document.getElementById(`lang-${langCode}`);
    if (checkbox) {
      checkbox.checked = true;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  populateLanguageSettings();
});

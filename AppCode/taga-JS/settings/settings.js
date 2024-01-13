const font_family_select_el = document.getElementById('font-family-selection');

font_family_select_el.value = Load_Font_Family();
font_family_select_el.addEventListener('change', Update_Font_Family);

function Update_Font_Family(event) {
  const family = font_family_select_el.value;
  localStorage.setItem('font-family', family);
  document.body.style.fontFamily = `var(--${family})`;
}

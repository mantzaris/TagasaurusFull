function Update_Font_Family(event) {
  const family = font_family_select_el.value;
  localStorage.setItem('font-family', family);
  document.body.style.fontFamily = `var(--${family})`;
}

function Load_Font_Family() {
  const family = localStorage.getItem('font-family') ?? 'sans-serif-family';
  document.body.style.fontFamily = `var(--${family})`;
  return family;
}

window.Load_Font_Family = Load_Font_Family;

function Load_Settings() {
  Load_Font_Family();
}

window.onload = Load_Settings;

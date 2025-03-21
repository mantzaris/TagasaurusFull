function Load_Font_Family() {
  const family = localStorage.getItem('font-family') ?? 'sans-serif-family';
  document.body.style.fontFamily = `var(--${family})`;
  return family;
}

window.Load_Font_Family = Load_Font_Family;

function Load_Settings() {
  Load_Font_Family();
}

//window.onload = Load_Settings;
window.addEventListener('load', Load_Settings);

import React,{useEffect,useState} from 'react';
export default function ThemeToggle() {
  const [theme,setTheme]=useState(()=>localStorage.getItem('adm-quiz-theme')==='dark'?'dark':'light');
  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('adm-quiz-theme',theme);},[theme]);
  return <button className="theme-toggle" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label={theme==='light'?'Ativar tema escuro':'Ativar tema claro'} title="Alterar aparência">{theme==='light'?'☾':'☀'} <span>{theme==='light'?'Escuro':'Claro'}</span></button>;
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { resetSandbox, isSandbox } from '@backend'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isSandbox && <div className="bg-amber-200 text-amber-950 p-3 text-center text-sm">
      <strong>Prévia local V1.5</strong> · Perfil fictício · Dados apenas neste navegador
      <button className="underline ml-4" onClick={()=>{if(confirm('Apagar somente os dados deste teste local?')) resetSandbox();}}>Reiniciar teste</button>
    </div>}
    <App />
  </StrictMode>,
)

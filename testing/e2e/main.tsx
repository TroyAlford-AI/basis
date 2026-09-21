import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { Application } from './components/Application'

createRoot(document.getElementById('root') as HTMLElement)
  .render(<Application />)

import { Buffer } from 'buffer'
import process from 'process'

declare global {
  interface Window {
	global: Window
	Buffer: typeof Buffer
	process: typeof process
  }
}

window.global = window
window.Buffer = Buffer
window.process = process
// Loaded on demand by MotionFeatures. domAnimation covers animate, exit,
// hover, tap, focus and in-view; switch to domMax only when a component
// genuinely needs layout animation or drag, since it is larger and every
// page that animates downloads it.
export { domAnimation as default } from 'motion/react'

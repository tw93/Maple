// Icons from Tabler Icons (https://tabler.io/icons), MIT License,
// Copyright (c) 2020-2026 Paweł Kuna. See tabler-icons-LICENSE.txt in this folder.
// A category gets one icon from its name: "Music" -> music, "Travel" -> plane.
// Names in some other languages match too. Without a match, the folder icon shows.

const PATHS = {
  ai: `<path d="M8 16v-6a2 2 0 1 1 4 0v6"/><path d="M8 13h4"/><path d="M16 8v8"/>`,
  api: `<path d="M4 13h5"/><path d="M12 16v-8h3a2 2 0 0 1 2 2v1a2 2 0 0 1 -2 2h-3"/><path d="M20 8v8"/><path d="M9 16v-5.5a2.5 2.5 0 0 0 -5 0v5.5"/>`,
  droplet: `<path d="M7.502 19.423c2.602 2.105 6.395 2.105 8.996 0c2.602 -2.105 3.262 -5.708 1.566 -8.546l-4.89 -7.26c-.42 -.625 -1.287 -.803 -1.936 -.397a1.376 1.376 0 0 0 -.41 .397l-4.893 7.26c-1.695 2.838 -1.035 6.441 1.567 8.546"/>`,
  "currency-bitcoin": `<path d="M6 6h8a3 3 0 0 1 0 6a3 3 0 0 1 0 6h-8"/><path d="M8 6l0 12"/><path d="M8 12l6 0"/><path d="M9 3l0 3"/><path d="M13 3l0 3"/><path d="M9 18l0 3"/><path d="M13 18l0 3"/>`,
  discount: `<path d="M9 15l6 -6"/><path d="M9 9.5a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0" fill="currentColor"/><path d="M14 14.5a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0" fill="currentColor"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/>`,
  "shopping-bag": `<path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304"/><path d="M9 11v-5a3 3 0 0 1 6 0v5"/>`,
  perfume: `<path d="M10 6v3"/><path d="M14 6v3"/><path d="M5 11a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -8"/><path d="M10 15a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M9 3h6v3h-6l0 -3"/>`,
  palette: `<path d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25"/><path d="M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M11.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M15.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>`,
  movie: `<path d="M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12"/><path d="M8 4l0 16"/><path d="M16 4l0 16"/><path d="M4 8l4 0"/><path d="M4 16l4 0"/><path d="M4 12l16 0"/><path d="M16 8l4 0"/><path d="M16 16l4 0"/>`,
  music: `<path d="M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><path d="M13 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><path d="M9 17v-13h10v13"/><path d="M9 8h10"/>`,
  "device-gamepad-2": `<path d="M12 5h3.5a5 5 0 0 1 0 10h-5.5l-4.015 4.227a2.3 2.3 0 0 1 -3.923 -2.035l1.634 -8.173a5 5 0 0 1 4.904 -4.019h3.4"/><path d="M14 15l4.07 4.284a2.3 2.3 0 0 0 3.925 -2.023l-1.6 -8.232"/><path d="M8 9v2"/><path d="M7 10h2"/><path d="M14 10h2"/>`,
  barbell: `<path d="M2 12h1"/><path d="M6 8h-2a1 1 0 0 0 -1 1v6a1 1 0 0 0 1 1h2"/><path d="M6 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-10a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1"/><path d="M9 12h6"/><path d="M15 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-10a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1"/><path d="M18 8h2a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-2"/><path d="M22 12h-1"/>`,
  "ball-football": `<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M12 7l4.76 3.45l-1.76 5.55h-6l-1.76 -5.55l4.76 -3.45"/><path d="M12 7v-4m3 13l2.5 3m-.74 -8.55l3.74 -1.45m-11.44 7.05l-2.56 2.95m.74 -8.55l-3.74 -1.45"/>`,
  "heart-rate-monitor": `<path d="M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1l0 -10"/><path d="M7 20h10"/><path d="M9 16v4"/><path d="M15 16v4"/><path d="M7 10h2l2 3l2 -6l1 3h3"/>`,
  article: `<path d="M3 6a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2l0 -12"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h10"/>`,
  news: `<path d="M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1 -4 0v-13a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1v12a3 3 0 0 0 3 3h11"/><path d="M8 8l4 0"/><path d="M8 12l4 0"/><path d="M8 16l4 0"/>`,
  book: `<path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6l0 13"/><path d="M12 6l0 13"/><path d="M21 6l0 13"/>`,
  books: `<path d="M5 5a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -14"/><path d="M9 5a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -14"/><path d="M5 8h4"/><path d="M9 16h4"/><path d="M13.803 4.56l2.184 -.53c.562 -.135 1.133 .19 1.282 .732l3.695 13.418a1.02 1.02 0 0 1 -.634 1.219l-.133 .041l-2.184 .53c-.562 .135 -1.133 -.19 -1.282 -.732l-3.695 -13.418a1.02 1.02 0 0 1 .634 -1.219l.133 -.041"/><path d="M14 9l4 -1"/><path d="M16 16l3.923 -.98"/>`,
  plane: `<path d="M16 10h4a2 2 0 0 1 0 4h-4l-4 7h-3l2 -7h-4l-2 2h-3l2 -4l-2 -4h3l2 2h4l-2 -7h3l4 7"/>`,
  "map-pin": `<path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0"/>`,
  "brand-github": `<path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"/>`,
  code: `<path d="M7 8l-4 4l4 4"/><path d="M17 8l4 4l-4 4"/><path d="M14 4l-4 16"/>`,
  "file-text": `<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2"/><path d="M9 9l1 0"/><path d="M9 13l6 0"/><path d="M9 17l6 0"/>`,
  briefcase: `<path d="M3 9a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2l0 -9"/><path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2"/><path d="M12 12l0 .01"/><path d="M3 13a20 20 0 0 0 18 0"/>`,
  school: `<path d="M22 9l-10 -4l-10 4l10 4l10 -4v6"/><path d="M6 10.6v5.4a6 3 0 0 0 12 0v-5.4"/>`,
  "building-bank": `<path d="M3 21l18 0"/><path d="M3 10l18 0"/><path d="M5 6l7 -3l7 3"/><path d="M4 10l0 11"/><path d="M20 10l0 11"/><path d="M8 14l0 3"/><path d="M12 14l0 3"/><path d="M16 14l0 3"/>`,
  "chart-line": `<path d="M4 19l16 0"/><path d="M4 15l4 -6l4 2l4 -5l4 4"/>`,
  wallet: `<path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12"/><path d="M20 12v4h-4a2 2 0 0 1 0 -4h4"/>`,
  users: `<path d="M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/>`,
  "message-circle": `<path d="M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1"/>`,
  mail: `<path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10"/><path d="M3 7l9 6l9 -6"/>`,
  cloud: `<path d="M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878"/>`,
  "shield-lock": `<path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3"/><path d="M11 11a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M12 12l0 2.5"/>`,
  photo: `<path d="M15 8h.01"/><path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12"/><path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5"/><path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3"/>`,
  "player-play": `<path d="M7 4v16l13 -8l-13 -8"/>`,
  "tools-kitchen-2": `<path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12m0 12v6h-1v-3m-10 -14v17m-3 -17v3a3 3 0 1 0 6 0v-3"/>`,
  home: `<path d="M5 12l-2 0l9 -9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/>`,
  car: `<path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/>`,
  "baby-carriage": `<path d="M6 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M16 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M2 5h2.5l1.632 4.897a6 6 0 0 0 5.693 4.103h2.675a5.5 5.5 0 0 0 0 -11h-.5v6"/><path d="M6 9h14"/><path d="M9 17l1 -3"/><path d="M16 14l1 3"/>`,
  paw: `<path d="M14.7 13.5c-1.1 -2 -1.441 -2.5 -2.7 -2.5c-1.259 0 -1.736 .755 -2.836 2.747c-.942 1.703 -2.846 1.845 -3.321 3.291c-.097 .265 -.145 .677 -.143 .962c0 1.176 .787 2 1.8 2c1.259 0 3 -1 4.5 -1s3.241 1 4.5 1c1.013 0 1.8 -.823 1.8 -2c0 -.285 -.049 -.697 -.146 -.962c-.475 -1.451 -2.512 -1.835 -3.454 -3.538"/><path d="M20.188 8.082a1.039 1.039 0 0 0 -.406 -.082h-.015c-.735 .012 -1.56 .75 -1.993 1.866c-.519 1.335 -.28 2.7 .538 3.052c.129 .055 .267 .082 .406 .082c.739 0 1.575 -.742 2.011 -1.866c.516 -1.335 .273 -2.7 -.54 -3.052l-.001 0"/><path d="M9.474 9c.055 0 .109 0 .163 -.011c.944 -.128 1.533 -1.346 1.32 -2.722c-.203 -1.297 -1.047 -2.267 -1.932 -2.267c-.055 0 -.109 0 -.163 .011c-.944 .128 -1.533 1.346 -1.32 2.722c.204 1.293 1.048 2.267 1.933 2.267"/><path d="M16.456 6.733c.214 -1.376 -.375 -2.594 -1.32 -2.722a1.164 1.164 0 0 0 -.162 -.011c-.885 0 -1.728 .97 -1.93 2.267c-.214 1.376 .375 2.594 1.32 2.722c.054 .007 .108 .011 .162 .011c.885 0 1.73 -.974 1.93 -2.267"/><path d="M5.69 12.918c.816 -.352 1.054 -1.719 .536 -3.052c-.436 -1.124 -1.271 -1.866 -2.009 -1.866c-.14 0 -.277 .027 -.407 .082c-.816 .352 -1.054 1.719 -.536 3.052c.436 1.124 1.271 1.866 2.009 1.866c.14 0 .277 -.027 .407 -.082"/>`,
  shirt: `<path d="M15 4l6 2v5h-3v8a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-8h-3v-5l6 -2a3 3 0 0 0 6 0"/>`,
  "device-laptop": `<path d="M3 19l18 0"/><path d="M5 7a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1l0 -8"/>`,
  rocket: `<path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3"/><path d="M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3"/><path d="M14 9a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>`,
  speakerphone: `<path d="M18 8a3 3 0 0 1 0 6"/><path d="M10 8v11a1 1 0 0 1 -1 1h-1a1 1 0 0 1 -1 -1v-5"/><path d="M12 8l4.524 -3.77a.9 .9 0 0 1 1.476 .692v12.156a.9 .9 0 0 1 -1.476 .692l-4.524 -3.77h-8a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h8"/>`,
  "chart-bar": `<path d="M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6"/><path d="M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10"/><path d="M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14"/><path d="M4 20h14"/>`,
  tool: `<path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5"/>`,
  bulb: `<path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7"/><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3"/><path d="M9.7 17l4.6 0"/>`,
  pencil: `<path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"/><path d="M13.5 6.5l4 4"/>`,
  "layout-dashboard": `<path d="M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1"/><path d="M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1"/><path d="M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1"/><path d="M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1"/>`,
  receipt: `<path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2m4 -14h6m-6 4h6m-2 4h2"/>`,
  sun: `<path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"/>`,
  world: `<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M3.6 9h16.8"/><path d="M3.6 15h16.8"/><path d="M11.5 3a17 17 0 0 0 0 18"/><path d="M12.5 3a17 17 0 0 1 0 18"/>`,
  folder: `<path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2"/>`,
};

// Folded like normalize() below. The first rule with a matching word wins.
const RULES = [
  ["ai", ["ai", "gpt", "llm", "chatbot", "chatbots", "yapay", "zeka", "人工智能", "智能"]],
  ["api", ["api", "apis", "rpc", "endpoint", "endpoints", "sdk", "webhook", "webhooks"]],
  ["droplet", ["faucet", "faucets", "testnet"]],
  [
    "currency-bitcoin",
    [
      "crypto",
      "kripto",
      "bitcoin",
      "btc",
      "eth",
      "ethereum",
      "solana",
      "defi",
      "web3",
      "nft",
      "nfts",
      "token",
      "tokens",
      "blockchain",
      "dex",
      "airdrop",
      "airdrops",
      "coin",
      "coins",
      "加密",
      "币",
    ],
  ],
  [
    "discount",
    [
      "cheap",
      "price",
      "prices",
      "deal",
      "deals",
      "discount",
      "discounts",
      "sale",
      "sales",
      "coupon",
      "coupons",
      "offer",
      "offers",
      "indirim",
      "indirimler",
      "ucuz",
      "fiyat",
      "fiyatlar",
      "kampanya",
      "firsat",
      "优惠",
      "折扣",
      "打折",
    ],
  ],
  ["shopping-bag", ["shop", "shopping", "store", "stores", "market", "alisveris", "magaza", "购物", "商店"]],
  ["perfume", ["perfume", "perfumes", "parfume", "parfum", "fragrance", "koku", "香水"]],
  ["palette", ["design", "designs", "ui", "ux", "figma", "inspiration", "art", "tasarim", "设计"]],
  [
    "movie",
    [
      "entertainment",
      "movie",
      "movies",
      "film",
      "films",
      "tv",
      "series",
      "anime",
      "watch",
      "stream",
      "streaming",
      "netflix",
      "eglence",
      "dizi",
      "diziler",
      "娱乐",
      "电影",
      "影视",
    ],
  ],
  ["music", ["music", "muzik", "spotify", "podcast", "podcasts", "音乐"]],
  ["device-gamepad-2", ["game", "games", "gaming", "oyun", "oyunlar", "游戏"]],
  ["barbell", ["fitness", "gym", "workout", "training", "spor", "antrenman", "健身"]],
  ["ball-football", ["sport", "sports", "football", "soccer", "basketball", "futbol", "体育"]],
  ["heart-rate-monitor", ["health", "medical", "doctor", "saglik", "健康", "医疗"]],
  [
    "article",
    [
      "blog",
      "blogs",
      "article",
      "articles",
      "medium",
      "substack",
      "newsletter",
      "newsletters",
      "makale",
      "makaleler",
      "博客",
      "文章",
    ],
  ],
  ["news", ["news", "haber", "haberler", "gundem", "新闻"]],
  ["book", ["read", "reading", "later", "okuma", "oku", "阅读", "稍后"]],
  ["books", ["book", "books", "kitap", "kitaplar", "library", "书", "图书"]],
  [
    "plane",
    [
      "trip",
      "trips",
      "travel",
      "flight",
      "flights",
      "hotel",
      "hotels",
      "vacation",
      "holiday",
      "seyahat",
      "gezi",
      "tatil",
      "otel",
      "ucak",
      "旅行",
      "旅游",
    ],
  ],
  ["map-pin", ["map", "maps", "place", "places", "location", "harita", "地图"]],
  ["brand-github", ["github"]],
  [
    "code",
    ["dev", "code", "coding", "programming", "developer", "developers", "kod", "yazilim", "开发", "编程", "代码"],
  ],
  ["file-text", ["doc", "docs", "documentation", "notes", "wiki", "belge", "dokuman", "文档"]],
  ["briefcase", ["work", "job", "jobs", "career", "office", "kariyer", "工作"]],
  [
    "school",
    [
      "learn",
      "learning",
      "course",
      "courses",
      "education",
      "school",
      "university",
      "tutorial",
      "tutorials",
      "egitim",
      "okul",
      "ders",
      "kurs",
      "学习",
      "教育",
    ],
  ],
  ["building-bank", ["bank", "banking", "finance", "money", "banka", "finans", "para", "金融", "银行"]],
  ["chart-line", ["stock", "stocks", "invest", "investing", "trading", "trade", "borsa", "yatirim", "股票", "投资"]],
  ["wallet", ["wallet", "wallets", "cuzdan", "钱包"]],
  ["users", ["social", "community", "friends", "sosyal", "topluluk", "社交"]],
  ["message-circle", ["chat", "messages", "messaging", "forum", "sohbet", "聊天"]],
  ["mail", ["mail", "email", "inbox", "posta", "邮件"]],
  ["cloud", ["cloud", "hosting", "server", "servers", "bulut", "sunucu", "云"]],
  ["shield-lock", ["security", "privacy", "password", "passwords", "guvenlik", "gizlilik", "安全", "隐私"]],
  [
    "photo",
    ["photo", "photos", "image", "images", "wallpaper", "wallpapers", "fotograf", "resim", "图片", "照片", "壁纸"],
  ],
  ["player-play", ["video", "videos", "youtube", "izle", "视频"]],
  [
    "tools-kitchen-2",
    ["food", "recipe", "recipes", "cooking", "restaurant", "restaurants", "yemek", "tarif", "tarifler", "美食", "食谱"],
  ],
  ["home", ["home", "house", "estate", "ev", "emlak"]],
  ["car", ["car", "cars", "auto", "araba", "otomobil", "汽车"]],
  ["baby-carriage", ["baby", "kids", "children", "bebek", "cocuk", "孩子"]],
  ["paw", ["pet", "pets", "dog", "dogs", "cat", "cats", "evcil", "kedi", "kopek", "宠物"]],
  ["shirt", ["fashion", "clothes", "clothing", "style", "moda", "giyim", "kiyafet", "时尚", "服装"]],
  ["device-laptop", ["tech", "technology", "gadgets", "teknoloji", "科技"]],
  ["rocket", ["startup", "startups", "launch", "product", "products", "girisim", "创业"]],
  ["speakerphone", ["marketing", "seo", "ads", "advertising", "pazarlama", "营销"]],
  ["chart-bar", ["analytics", "data", "stats", "statistics", "metrics", "analiz", "veri", "数据"]],
  ["tool", ["tool", "tools", "utility", "utilities", "arac", "araclar", "工具"]],
  ["bulb", ["idea", "ideas", "inspo", "fikir", "fikirler", "灵感"]],
  ["pencil", ["write", "writing", "yazi", "写作"]],
  ["layout-dashboard", ["dashboard", "dashboards", "admin", "panel"]],
  ["receipt", ["bill", "bills", "invoice", "invoices", "fatura", "账单"]],
  ["sun", ["weather", "hava", "天气"]],
  ["world", ["web", "website", "websites", "site", "sites", "internet", "网站"]],
];

// Lower case, without accents, and dotless i as i ("Café" -> "cafe")
function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i");
}

function wordsOf(text) {
  const words = text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  // Plurals: "APIs" -> "apis" and "api"
  for (const word of [...words]) {
    if (word.length > 3 && word.endsWith("s")) words.push(word.slice(0, -1));
  }
  return words;
}

// Chinese keywords match anywhere in the name; others match whole words
const HAN = /\p{Script=Han}/u;

export function pickCategoryIcon(name) {
  const text = normalize(name || "");
  const words = wordsOf(text);
  for (const [icon, keywords] of RULES) {
    if (keywords.some((keyword) => (HAN.test(keyword) ? text.includes(keyword) : words.includes(keyword)))) {
      return icon;
    }
  }
  return "folder";
}

const cache = new Map();

// The parsed <svg> element for a category name; clone it before use
export function getCategoryIcon(name) {
  const icon = pickCategoryIcon(name);
  if (!cache.has(icon)) {
    const template = document.createElement("template");
    template.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[icon]}</svg>`;
    cache.set(icon, template.content.firstElementChild);
  }
  return cache.get(icon);
}

var { remote } = require("electron");
var { isMac, app } = remote;

// for Google Analytics
const ua = require("universal-analytics");
const usr = ua("UA-148721366-1");
function trackEvent(category, action) {
  usr
    .event({
      ec: category,
      ea: action
    })
    .send();
}

const menuTemplate = [
  // { role: 'appMenu' }
  ...(process.platform === "darwin"
    ? [
        {
          label: "okadash",
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideothers" },
            { role: "unhide" },
            { type: "separator" },
            {
              label: "quit",
              accelerator: "CommandOrControl+Q",
              click() {
                trackEvent("main", "Close App");
                setTimeout(() => {
                  app.quit();
                }, 700);
              }
            }
          ]
        }
      ]
    : []),
  // { role: 'editMenu' }
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      ...(isMac
        ? [
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
            { type: "separator" },
            {
              label: "Speech",
              submenu: [{ role: "startspeaking" }, { role: "stopspeaking" }]
            }
          ]
        : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }])
    ]
  },
  // { role: 'viewMenu' }
  {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forcereload" },
      { role: "toggledevtools" },
      { type: "separator" },
      { role: "resetzoom" },
      { role: "zoomin" },
      { role: "zoomout" },
      { type: "separator" },
      { role: "togglefullscreen" }
    ]
  }
];

module.exports = {
  menuTemplate: menuTemplate
};

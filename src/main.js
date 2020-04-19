const { shell } = require("electron");
var { remote, ipcRenderer } = require("electron");
var { Menu, MenuItem, dialog } = remote;
const app = remote.app;
const fs = require("fs");
const path = require("path");
const Store = require("electron-store");
const store = new Store();
let json = loadSettings();
const menu = require("./menu");
const mainWidth = document.getElementById("main-content").clientWidth;
const mainHeight = document.getElementById("main-content").clientHeight;
let allWidth = json.contents[0].allWidth;
let configWidth = json.contents[0].width;
let configHeight = json.contents[1].height;

const VERSION = "1.6.1";

initialize();

var dragging_vertical = false;
var dragging_horizontal = false;
var dragging_vertical_small = false;
var draggingId = "";
$("#dragbar-vertical, .dragbar-vertical-small").mousedown(function (e) {
  e.preventDefault();
  $("#main-content").css("pointer-events", "none");
  if (this.id === "dragbar-vertical") {
    draggingId = "0";
    dragging_vertical = true;
  } else {
    dragging_vertical_small = true;
    draggingId = this.id.replace(/[^0-9]/g, "");
  }
  const main = $("#main-content");
  const ghostbar = $("<div>", {
    id: "ghostbar-vertical",
    css: {
      height: main.outerHeight(),
      top: main.offset().top,
      left: main.offset().left
    }
  }).appendTo("body");

  $(document).mousemove(function (e) {
    ghostbar.css("left", e.pageX + 2);
  });
});

window.onresize = function () {
  remote.getCurrentWindow().reload();
};

$("#dragbar-horizontal").mousedown(function (e) {
  e.preventDefault();
  $("#main-content").css("pointer-events", "none");

  draggingId = "0";
  dragging_horizontal = true;
  const main = $(".medium");
  const ghostbar = $("<div>", {
    id: "ghostbar-horizontal",
    css: {
      width: main.outerWidth(),
      top: main.offset().top,
      left: main.offset().left
    }
  }).appendTo("body");

  $(document).mousemove(function (e) {
    ghostbar.css("top", e.pageY + 2);
  });
});

$(document).mouseup(function (e) {
  if (dragging_vertical) {
    const largeWidth = document.getElementById("0").clientWidth;
    const smallPanes = Array.from(document.getElementsByClassName("small"));
    if (smallPanes.length !== 0) {
      let nextPaneLen = largeWidth;
      smallPanes.forEach(function (pane) {
        if (pane.id <= 2) nextPaneLen += pane.clientWidth;
      });
      if (e.pageX >= nextPaneLen) return;
      $("#2").css("width", nextPaneLen - e.pageX);
    }

    $("#0").css("width", e.pageX);
    $("#ghostbar-vertical").remove();
    $(document).unbind("mousemove");
    dragging_vertical = false;
    calcWindowSize();
  }
  if (dragging_horizontal) {
    $(".medium").css("height", e.pageY);
    $("#ghostbar-horizontal").remove();
    $(document).unbind("mousemove");
    dragging_horizontal = false;
    calcWindowSize();
  }
  if (dragging_vertical_small) {
    const largeWidth = document.getElementById("0").clientWidth;
    const smallPanes = Array.from(document.getElementsByClassName("small"));
    var otherPanesLen = largeWidth;
    var nextPaneLen = largeWidth;

    // drop可能な範囲を限定
    smallPanes.forEach(function (pane) {
      if (pane.id < draggingId) otherPanesLen += pane.clientWidth;
      if (pane.id <= Number(draggingId) + 1) nextPaneLen += pane.clientWidth;
    });
    if (e.pageX <= otherPanesLen || e.pageX >= nextPaneLen) return;
    $(`#${draggingId}`).css("width", e.pageX - otherPanesLen);
    $(`#${Number(draggingId) + 1}`).css("width", nextPaneLen - e.pageX);

    $("#ghostbar-vertical").remove();
    $(document).unbind("mousemove");
    dragging_vertical_small = false;
    calcWindowSize();
  }
});

$(document).keydown(function (e) {
  if (e.keyCode == 27 && document.getElementsByClassName("overlay").length !== 0) {
    const main = document.getElementById("main-content");
    main.removeChild(document.getElementsByClassName("overlay")[0]);
  }
});

function initialize() {
  if (store.size == 0) return;
  getLatestVersion();
  checkConfigVersion();

  initializeMenu(menu.menuTemplate);
  const contents = json.contents;
  contents.forEach(function (content) {
    if (content["size"] === undefined) content["size"] = "small";
    if (content["zoom"] === undefined) content["zoom"] = 1.0;
    createPane({
      size: content["size"],
      url: content["url"],
      zoom: content["zoom"],
      init: true
    });
  });

  getWebviews().forEach(function (webview, index) {
    webview.addEventListener("dom-ready", function () {
      initializeWebview(
        webview,
        json.contents[index]["url"],
        json.contents[index]["customCSS"]
      );
      if (
        webview.parentNode.classList.contains("small") &&
        !webview.previousSibling.hasChildNodes()
      ) {
        addButtons(webview.previousSibling, webview.parentNode.id);
      }
    });
  });
}

function getLatestVersion() {
  const request = new XMLHttpRequest();
  const query = {
    query: `{
      repository(owner: "konoyono", name: "okadash") {
        releases(last: 1) {
          nodes {
            tagName
          }
       }
      }
    }`
  };
  request.open("POST", "https://api.github.com/graphql");
  request.setRequestHeader("Content-Type", "application/json");
  request.setRequestHeader(
    "Authorization",
    "bearer fbae27fc9bbeb9f5fe396672eaf68ba22f492435"
  );
  request.onreadystatechange = function () {
    if (request.readyState != 4) {
      // requesting
    } else if (request.status != 200) {
      // request failed...
    } else {
      const res = JSON.parse(request.responseText);
      checkLatestVersion(res.data.repository.releases.nodes[0].tagName);
    }
  };
  request.send(JSON.stringify(query));
}

function checkLatestVersion(latest) {
  if (VERSION != latest) $("#alert-icon").css("display", "block");
}

function initializeMenu(template) {
  let menu = Menu.buildFromTemplate(template);

  const menuItemForSmallPane = createMenuItemForSmallPane();
  menu.append(menuItemForSmallPane);

  const menuItemForBoard = createMenuItemForBoard();
  menu.append(menuItemForBoard);

  Menu.setApplicationMenu(menu);
}

function createMenuItemForBoard() {
  const menuItem = new MenuItem({
    id: "board",
    label: "Board",
    submenu: []
  });
  const boardMenuItems = createBoardMenuItems();
  boardMenuItems.forEach(function (boardMenuItem, i) {
    menuItem.submenu.append(boardMenuItem);
    if (i === 0) menuItem.submenu.append(new MenuItem({ type: "separator" }));
  });
  menuItem.submenu.append(new MenuItem({ type: "separator" }));
  menuItem.submenu.append(
    new MenuItem({
      label: "Export Using Board",
      click() {
        exportUsingBoard();
      }
    })
  );
  menuItem.submenu.append(
    new MenuItem({
      label: "Preferences",
      accelerator: "CommandOrControl+,",
      click() {
        ipcRenderer.send("window-open");
      }
    })
  );
  return menuItem;
}

function createMenuItemForContextmenu(index) {
  const options = store.get("options.0.contents");
  const content = getAdditionalPaneInfo(options);

  return createContextMenuItems(content, index);
}

function createMenuItemForSmallPane() {
  const menuItem = new MenuItem({
    id: "smallPane",
    label: "Open",
    submenu: []
  });
  const options = store.get("options.0.contents");
  const content = getAdditionalPaneInfo(options);
  const additionalPaneMenuItems = createAdditionalPaneMenuItems(content);

  additionalPaneMenuItems.forEach(function (apMenuItem) {
    menuItem.submenu.append(apMenuItem);
  });
  menuItem.submenu.append(new MenuItem({ type: "separator" }));
  menuItem.submenu.append(createGoogleMenuItem());

  return menuItem;
}

function getBoardNum() {
  if (store.get("options") !== undefined) {
    return Object.keys(store.get("options")).length;
  }
  return undefined;
}

function exportUsingBoard() {
  const usingBoard = store.get("boards")[0];
  // jsonにしたものをファイルに吐き出す
  // allWidthとかとってこれる？
  delete usingBoard.name;
  const win = remote.getCurrentWindow();
  dialog.showSaveDialog(
    win,
    {
      properties: ["openFile"],
      filters: [
        {
          name: "Documents",
          extensions: ["json"]
        }
      ]
    },
    fileName => {
      if (fileName) {
        const data = JSON.stringify(usingBoard, null, 2);
        writeFile(fileName, data);
      }
    }
  );
}

function writeFile(path, data) {
  fs.writeFile(path, data, error => {
    if (error != null) {
      alert("save error.");
      return;
    }
  });
}

function deleteUsingBoard() {
  const allBoards = store.get("boards");
  const allOptions = store.get("options");
  if (!confirm(`Delete board name '${allBoards[0]["name"]}'. OK?`)) return;
  for (i in allOptions) {
    if (allOptions[Number(i) + 1] === undefined) break;
    allOptions[i] = allOptions[Number(i) + 1];
    allBoards[i] = allBoards[Number(i) + 1];
  }
  allOptions.pop();
  allBoards.pop();
  store.set("options", allOptions);
  store.set("boards", allBoards);
  remote.getCurrentWindow().reload();
}

function createBoardMenuItems() {
  const allOptions = store.get("options");
  const boardMenuItems = [];
  for (i in allOptions) {
    const clicked = i;
    if (i == 0) {
      boardMenuItems.push(
        new MenuItem({
          label: allOptions[i]["name"] + " [ in use ]",
          index: i
        })
      );
    } else {
      boardMenuItems.push(
        new MenuItem({
          label: allOptions[i]["name"],
          accelerator: `CommandOrControl+Option+${i}`,
          index: i,
          click() {
            moveClickedContentsToTop(clicked);
          }
        })
      );
    }
  }

  return boardMenuItems;
}

function moveClickedContentsToTop(clicked) {
  const allBoards = store.get("boards");
  const allOptions = store.get("options");
  const tmpOpt = allOptions[clicked];
  const tmpBrd = allBoards[clicked];
  for (i in allOptions) {
    const key = Object.keys(allOptions).length - i - 1;
    if (key < clicked) {
      allOptions[key + 1] = allOptions[key];
      allBoards[key + 1] = allBoards[key];
    }
  }
  allOptions[0] = tmpOpt;
  allBoards[0] = tmpBrd;
  store.set("options", allOptions);
  store.set("boards", allBoards);
  remote.getCurrentWindow().reload();
}

function createAdditionalPaneMenuItems(contents) {
  const additionalPaneMenuItems = contents.map(function (content) {
    return new MenuItem({
      label: content["name"],
      accelerator: `CommandOrControl+${content["index"] + 1}`,
      click() {
        loadAdditionalPage(content["url"], content["customCSS"]);
      }
    });
  });

  return additionalPaneMenuItems;
}

function createContextMenuItems(contents, index) {
  const contextMenuItems = contents.map(function (content) {
    return new MenuItem({
      label: content["name"],
      click() {
        recreateSelectedPane(content["url"], content["customCSS"], index);
      }
    });
  });

  return contextMenuItems;
}

function createGoogleMenuItem() {
  return new MenuItem({
    label: "Search in Google",
    accelerator: "CommandOrControl+l",
    click() {
      openGoogleInOverlay();
    }
  });
}

function openGoogleInOverlay() {
  const main = document.getElementById("main-content");
  const div = document.createElement("div");
  const label = document.createElement("label");
  div.className = "overlay";
  label.className = "overlay-message";
  label.innerHTML = "Press Esc to Close";
  div.appendChild(label);
  main.appendChild(div);
  const webview = createWebview("https://google.com");
  webview.addEventListener("dom-ready", function () {
    initializeWebview(webview, "https://google.com");
    webview.focus();
  });
  div.appendChild(webview);
}

function getAdditionalPaneInfo(contents) {
  const content = contents.map(function (content, index) {
    try {
      url = new URL(content["url"]);
    } catch {
      alert(
        "[Error] invalid URL format found in settings.  Maybe [workspace] in settings?"
      );
      ipcRenderer.send("window-open");
    }
    return {
      name: content["name"],
      url: url,
      customCSS: content["customCSS"],
      index: index
    };
  });
  return content;
}

function getWebviews() {
  let webviews = Array.from(document.getElementsByTagName("webview"));
  return webviews;
}

function initializeWebview(webview, url, customCSS = []) {
  registerToOpenUrl(webview, shell);
  webview.insertCSS(customCSS.join(" "));
  webview.autosize = "on";

  if (webview.src === "about:blank") {
    webview.loadURL(url.toString());
  } else {
    addKeyEvents(webview);
    if (!webview.parentNode.classList.contains("overlay")) {
      addMaximizeButton(webview.parentNode, webview.parentNode.id);
      addReloadButton(webview.parentNode, webview.parentNode.id);
    }
  }
}

function addKeyEvents(webview) {
  webview.getWebContents().on("before-input-event", (event, input) => {
    if (
      input.meta &&
      input.key === "w" &&
      webview.parentNode.classList.contains("small")
    ) {
      remove(webview.parentNode.id);
    }
    if (webview.parentNode.classList.contains("overlay")) {
      if (input.key === "Escape" || (input.meta && input.key === "w")) {
        const main = document.getElementById("main-content");
        main.removeChild(document.getElementsByClassName("overlay")[0]);
      }
      if (input.meta && input.key === "[") {
        webview.goBack();
      }
      if (input.meta && input.key === "]") {
        webview.goForward();
      }
    }
  });
}

function remove(index) {
  draggingId = "";
  const target = document.getElementById(index);
  const targetBar = document.getElementById(`dvs-${index}`);
  const parent = target.parentNode;
  const smallPanes = Array.from(document.getElementsByClassName("small"));
  const bars = Array.from(document.getElementsByClassName("dragbar-vertical-small"));
  store.delete(`boards.0.contents.${index}`);
  saveNewContents();

  smallPanes.forEach(function (pane) {
    if (pane.id > index) {
      pane.id = Number(pane.id) - 1;
      pane.style.order = Number(pane.id) - 1;
    }
  });
  bars.forEach(function (bar) {
    id = Number(bar.id.replace(/[^0-9]/g, ""));
    if (id > index) {
      bar.id = `dvs-${id - 1}`;
      bar.style = `grid-column: ${(id - 1) * 2} / ${(id - 1) * 2 + 1}`;
    }
  });
  parent.removeChild(target);
  parent.removeChild(targetBar);
  calcWindowSize();
  refreshButtons();
}

function move(index, next) {
  const json = loadSettings();
  const src = document.getElementById(index);
  const dst = document.getElementById(Number(index) + Number(next));
  const storeSrc = src.querySelector("webview");
  const storeDst = dst.querySelector("webview");
  storeUrl(dst.id, storeSrc.src);
  storeUrl(src.id, storeDst.src);
  const tmp = src.id;
  const tmpCSS = json.contents[index]["customCSS"];
  storeCustomCSS(src.id, json.contents[dst.id]["customCSS"]);
  src.id = src.style.order = dst.id;
  storeCustomCSS(dst.id, tmpCSS);
  dst.id = dst.style.order = tmp;

  refreshButtons();
}

function maximize(index) {
  const target = document.getElementById(index);
  const url = target.querySelector("webview").src;
  const main = document.getElementById("main-content");
  const div = document.createElement("div");
  const label = document.createElement("label");
  div.className = "overlay";
  label.className = "overlay-message";
  label.innerHTML = "Press Esc to Close";
  div.appendChild(label);
  main.appendChild(div);
  const webview = createWebview(url);
  webview.addEventListener("dom-ready", function () {
    initializeWebview(webview, url);
  });
  div.appendChild(webview);
}

function refreshButtons() {
  const main = document.getElementById("main-content");
  const children = Array.from(main.children);
  children.forEach(function (child) {
    const target = child.querySelector(".tool-buttons");
    if (child.classList.contains("small")) {
      while (target.firstChild) {
        target.removeChild(target.firstChild);
      }
      addButtons(target, target.parentNode.id);
      child.style.width = "100%";
      child.style.height = "100%";
    }

    const maxBtn = child.querySelector(".max-button");
    if (maxBtn !== null) $(".max-button").remove();
    const reloadBtn = child.querySelector(".reload-button");
    if (reloadBtn !== null) $(".reload-button").remove();
    if (target !== null) {
      addMaximizeButton(child, target.parentNode.id);
      addReloadButton(child, target.parentNode.id);
    }
  });
}

function addButtons(div, index) {
  if (index != 2)
    div.innerHTML += `<button onclick=move(${index},"-1") style="font-size: 12px";><</button>`;
  if (getPaneNum() !== 3)
    div.innerHTML += `<button onclick=remove(${index}) style="font-size: 12px";>Close</button>`;
  if (index != getPaneNum() - 1)
    div.innerHTML += `<button onclick=move(${index},"1") style="font-size: 12px";>></button>`;
}

function addReloadButton(div, index) {
  const btn = document.createElement("button");
  btn.className = "reload-button";
  btn.setAttribute("onclick", `openContextMenu(${index})`);
  btn.innerHTML = `<i class="fas fa-exchange-alt"></i>`;
  btn.style = `font-size: 14px;  margin-left: ${div.clientWidth - 20}px;`;
  div.insertBefore(btn, div.firstChild);
}

function addMaximizeButton(div, index) {
  const btn = document.createElement("button");
  btn.className = "max-button";
  btn.setAttribute("onclick", `maximize(${index})`);
  btn.innerHTML = `<i class="fas fa-arrows-alt-h fa-rotate-135"></i>`;
  btn.style = "font-size: 14px;";
  div.insertBefore(btn, div.firstChild);
}

function openContextMenu(index) {
  const remote = require("electron").remote;
  const Menu = remote.Menu;

  var menu = new Menu();
  const contextMenuItems = createMenuItemForContextmenu(index);
  contextMenuItems.forEach(function (contextMenuItem, i) {
    menu.append(contextMenuItem);
  });

  menu.popup(remote.getCurrentWindow());
}

function getPaneNum() {
  return $(".large").length + $(".medium").length + $(".small").length;
}

function loadAdditionalPage(additionalPage, customCSS = []) {
  resetWindowSize();
  const size = "small";
  createPane({ size });
  storeSize(getPaneNum() - 1, size);
  storeUrl(getPaneNum() - 1, additionalPage);
  storeCustomCSS(getPaneNum() - 1, customCSS);

  const webview = getWebviews()[getPaneNum() - 1];
  webview.addEventListener("dom-ready", function () {
    initializeWebview(webview, additionalPage, customCSS);
  });
  refreshButtons();
}

function recreateSelectedPane(url, customCSS, index) {
  const div = document.getElementById(`${index}`);
  div.querySelector("webview").remove();

  storeUrl(index, url);
  storeCustomCSS(index, customCSS);

  const webview = createWebview(url);
  webview.autosize = "on";
  webview.addEventListener("dom-ready", function () {
    if (webview.src === "about:blank") {
      webview.loadURL(url.toString());
    }
    webview.insertCSS(customCSS.join(" "));
  });
  webview.src = "about:blank";
  div.appendChild(webview);
}

function storeSize(index, size) {
  store.set(`boards.0.contents.${index}.size`, size);
}

function storeUrl(index, url) {
  store.set(`boards.0.contents.${index}.url`, url);
}

function storeCustomCSS(index, customCSS) {
  store.set(`boards.0.contents.${index}.customCSS`, customCSS);
}

function createPane({ size, url = "", zoom = 1.0, init = false }) {
  let divContainer = createContainerDiv(size);
  let divButtons = createButtonDiv();

  document.getElementById("main-content").appendChild(divContainer);
  divContainer.appendChild(divButtons);

  const webview = createWebview(url, { zoom });
  divContainer.appendChild(webview);

  createDraggableBar(size);
  calcWindowSize(init);
}

function createDraggableBar(size) {
  let div = document.createElement("div");
  if (size === "large") {
    div.id = "dragbar-vertical";
  } else if (size === "medium") {
    div.id = "dragbar-horizontal";
  } else {
    div.id = `dvs-${getPaneNum() - 1}`;
    div.className = "dragbar-vertical-small";
    div.style = `grid-column: ${(getPaneNum() - 1) * 2} /
      ${(getPaneNum() - 1) * 2 + 1}`;
  }
  document.getElementById("main-content").appendChild(div);
}

function createContainerDiv(size) {
  let div = document.createElement("div");
  div.id = getPaneNum();
  div.className = size;
  div.style.order = getPaneNum();
  return div;
}

function createButtonDiv() {
  let div = document.createElement("div");
  div.className = "tool-buttons";

  return div;
}

function createWebview(url = "", options = {}) {
  let webview = document.createElement("webview");
  webview.src = "about:blank";
  webview.id = "normal";
  webview.url = url;
  webview.addEventListener("dom-ready", () => {
    webview.setZoomFactor(Number(options.zoom) || 1.0);
  });
  return webview;
}

function registerToOpenUrl(webview) {
  webview.removeEventListener("new-window", openExternalUrl);
  webview.addEventListener("new-window", openExternalUrl);
}

function openExternalUrl(event) {
  const url = event.url;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("file://")
  ) {
    shell.openExternal(url);
  }
}

function saveJson(jsonPath, boardName) {
  const settings = JSON.parse(fs.readFileSync(jsonPath));
  if (!validateJson(settings)) {
    return null;
  }

  const newOption = { name: boardName, contents: settings["contents"] };
  let optList = store.get("options");
  let brdList = store.get("boards");
  if (optList) {
    optList.push(newOption);
    brdList.push(newOption);
    store.set(`options`, optList);
    store.set(`boards`, brdList);
  } else {
    store.set(`options`, [newOption]);
    store.set(`boards`, [newOption]);
  }
  let index = getBoardNum();
  if (index === undefined) index = 0;
  if (index === 0) {
    remote.getCurrentWindow().reload();
  } else {
    moveClickedContentsToTop(index);
  }
}

function validateJson(jsonObj) {
  if (!jsonObj.contents) {
    alert("Error in settings: contents is invalid");
    return false;
  }
  jsonObj.contents.forEach(function (content) {
    if (content["customCSS"] === undefined) content["customCSS"] = [];
  });

  return true;
}

function loadSettings() {
  if (store.size == 0) {
    ipcRenderer.send("initial-open");
    return;
  }

  return buildJsonObjectFromStoredData(store.get("boards")[0]);
}

function checkConfigVersion() {
  const version = store.get("version");
  if (version !== VERSION) {
    const config = path.join(app.getPath("userData"), "config.json");
    fs.unlink(config, () => {
      ipcRenderer.send("initial-open");
    });
  }
}

function showModalDialogElement(filePath) {
  return new Promise((resolve, reject) => {
    const dlg = document.querySelector("#input-dialog");
    dlg.addEventListener("cancel", event => {
      event.preventDefault();
    });
    dlg.showModal();
    function onClose() {
      if (dlg.returnValue === "ok") {
        const inputValue = document.querySelector("#input").value;
        resolve(saveJson(filePath, inputValue));
      } else {
        reject();
      }
    }
    dlg.addEventListener("close", onClose, { once: true });
  });
}

function openFileAndSave() {
  const win = remote.getCurrentWindow();
  remote.dialog.showOpenDialog(
    win,
    {
      properties: ["openFile"],
      filters: [
        {
          name: "settings",
          extensions: ["json"]
        }
      ]
    },
    filePath => {
      if (filePath) {
        showModalDialogElement(filePath[0]);
      }
    }
  );
}

function saveNewContents() {
  const contents = store.get("boards.0.contents");
  let newContents = [];
  contents.forEach(function (content) {
    if (content !== null) newContents.push(content);
  });
  store.set("boards.0.contents", newContents);
}

function buildJsonObjectFromStoredData(boards) {
  let newContents = [];
  if (boards === undefined) ipcRenderer.send("window-open");
  boards["contents"].forEach(function (content) {
    if (content !== null) newContents.push(content);
  });
  store.set("boards.0.contents", newContents);
  let jsonObj = {
    name: boards["name"],
    contents: newContents
  };

  return jsonObj;
}

function resetWindowSize() {
  const smallNum = document.getElementsByClassName("small").length;
  const main = document.getElementById("main-content");
  ratio =
    `${configWidth}% 0% ` + `${(100 - configWidth) / smallNum}% 0% `.repeat(smallNum);
  columns = `grid-template-columns: ${ratio} !important ;`;
  rows = `grid-template-rows: ${configHeight}% 0% ${100 - configHeight}% !important ;`;
  main.style = columns + rows;
  draggingId = "";
}

function calcWindowSize(init = false) {
  const smallNum = document.getElementsByClassName("small").length;
  const main = document.getElementById("main-content");
  const largeWidth = $(".large")[0].clientWidth;
  configWidth = (largeWidth / mainWidth) * 100;
  if ($(".medium")[0] !== undefined) {
    var mediumHheight = $(".medium")[0].clientHeight;
    configHeight = (mediumHheight / mainHeight) * 100;
  }
  let columns = "";
  let rows = "";
  if (draggingId !== undefined && draggingId !== "") {
    nextNum = draggingId === "0" ? Number(draggingId) + 2 : Number(draggingId) + 1;
    const target = document.getElementById(`${draggingId}`);
    const next = document.getElementById(`${nextNum}`);
    let arColumns = main.style["grid-template-columns"].split(" ");
    var newSmallWidth = (target.clientWidth / mainWidth) * 100;
    var nextWidth = Math.abs((next.clientWidth / mainWidth) * 100);
    // Largeペインだけ特別扱い（統合したい…）
    if (draggingId === "0") {
      arColumns[0] = `${newSmallWidth}% `;
      arColumns[2] = `${nextWidth}% `;
    } else {
      arColumns[Number(draggingId) * 2 - 2] = `${newSmallWidth}% `;
      arColumns[Number(draggingId) * 2] = `${nextWidth}% `;
    }
    ratio = arColumns.join(" ");
  } else {
    // リセット時の処理なので等分するだけ
    ratio =
      `${configWidth}% 0% ` + `${(100 - configWidth) / smallNum}% 0% `.repeat(smallNum);
  }
  columns = `grid-template-columns: ${ratio} !important ;`;
  rows = `grid-template-rows: ${configHeight}% 0% ${100 - configHeight}% !important ;`;
  if (init && allWidth !== undefined) columns = allWidth;
  main.style = columns + rows;
  refreshButtons();
  const panes = Array.from(document.getElementsByClassName("small"));
  panes.forEach(function (pane) {
    pane.style.width = "100%";
    pane.style.height = "100%";
  });
  if (configHeight !== undefined) {
    store.set("boards.0.contents.0.width", configWidth);
    store.set("boards.0.contents.0.allWidth", columns);
    store.set("boards.0.contents.1.height", configHeight);
  }
}

var savedLargeWidth = document.getElementById("0").clientWidth;
function foldLargePane() {
  const largeWidth = document.getElementById("0").clientWidth;
  const smallPanes = Array.from(document.getElementsByClassName("small"));
  let newWidth = 700;
  if (smallPanes.length !== 0) {
    var nextPaneLen = largeWidth;
    smallPanes.forEach(function (pane) {
      if (pane.id <= 2) nextPaneLen += pane.clientWidth;
    });
  }
  draggingId = "0";
  if (
    savedLargeWidth === 0 ||
    savedLargeWidth === nextPaneLen ||
    savedLargeWidth === 700
  ) {
    savedLargeWidth = largeWidth;
    $("#0").css("width", 160);
    $("#2").css("width", nextPaneLen - 160);
    savedLargeWidth = 160;
    calcWindowSize();
  } else if (savedLargeWidth === 160) {
    if (nextPaneLen <= 700) {
      newWidth = nextPaneLen;
    }
    $("#0").css("width", newWidth);
    $("#2").css("width", nextPaneLen - newWidth);
    calcWindowSize();
    savedLargeWidth = newWidth;
  } else {
    $("#0").css("width", savedLargeWidth);
    $("#2").css("width", nextPaneLen - savedLargeWidth);
    calcWindowSize();
    savedLargeWidth = 0;
  }
}

var { remote } = require("electron");
var { dialog } = remote;
const fs = require("fs");
const Store = require("electron-store");
const store = new Store();
const app = remote.app;
const path = require("path");

/**
 * アプリケーションのバージョン情報
 */
const VERSION = "1.6.1";

initialize();

/**
 * Preference画面の初期描画を行う
 */
function initialize() {
  const configFilePath = path.join(app.getPath("userData"), "config.json");
  fs.readFile(configFilePath, (_, data) => {
    createBoardList(data);
  });
}

/**
 * 定義ファイルの内容を元に、ボードの一覧を描画する
 * @param {Buffer} data 定義ファイルの内容
 */
function createBoardList(data) {
  const settings = JSON.parse(data);
  const definedBoardList = settings["options"];
  const container = document.getElementById("boards-container");

  definedBoardList.forEach(definedBoard => {
    const liElem = document.createElement("li");
    const aElem = document.createElement("a");
    aElem.onclick = function () {
      container.childNodes.forEach(node => node.classList.remove("active"));
      liElem.classList.add("active");
      showBoardContents(definedBoard);
    };
    aElem.innerHTML = definedBoard["name"];
    liElem.appendChild(aElem);
    container.appendChild(liElem);
  });
  if (container.firstChild === null) importNewBoard("default", "Default Board");
  container.firstChild.querySelector("a").click();
}

/**
 * 定義済みボードの内容を描画する
 * @param {any} definedBoard
 */
function showBoardContents(definedBoard) {
  const container = document.getElementById("items-container");

  window.scrollTo(0, 0);
  document.getElementById("board-name-textbox").innerText = definedBoard["name"];

  // 既に描画済みの内容を破棄
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  // ボード内のコンテンツの数だけフォームを繰り返し描画する
  definedBoard["contents"].forEach(content => {
    const divElem = document.createElement("div");
    divElem.className = "item-box";

    // name属性用のUI生成
    const nameElem = document.createElement("p");
    const nameTextElem = document.createElement("input");
    nameElem.innerHTML = "Name";
    nameTextElem.type = "textbox";
    nameTextElem.className = "content-textbox";
    nameTextElem.value = content["name"];
    nameElem.appendChild(nameTextElem);

    // URL属性用のUI生成
    const urlElem = document.createElement("p");
    const urlTextElem = document.createElement("input");
    urlElem.innerHTML = "URL";
    urlTextElem.type = "url";
    urlTextElem.className = "content-textbox";
    urlTextElem.value = content["url"];
    if (/workspace/.test(content["url"])) urlTextElem.style.background = "#fdd";
    urlElem.appendChild(urlTextElem);

    // Zoom属性用のUI生成
    const zoomElem = document.createElement("p");
    const zoomTextElem = document.createElement("input");
    zoomElem.innerHTML = "Zoom";
    zoomTextElem.type = "textbox";
    zoomTextElem.className = "content-textbox";
    zoomTextElem.value = content["zoom"] || 1.0;
    zoomElem.appendChild(zoomTextElem);

    // CustomCSS属性用のUI生成
    const cssElem = document.createElement("p");
    const tAreaElem = document.createElement("textarea");
    cssElem.innerHTML = "Custom CSS";
    tAreaElem.id = content["name"];
    tAreaElem.className = "textarea-ccss";
    tAreaElem.value = content["customCSS"].join("\n");
    cssElem.appendChild(tAreaElem);

    // コンテンツの削除ボタンの生成
    const btnElem = document.createElement("button");
    btnElem.className = "btn btn-outline-danger";
    btnElem.innerHTML = "Delete item [ " + content["name"] + " ]";
    btnElem.onclick = function () {
      if (!confirm("Sure?")) return;
      btnElem.parentElement.remove();
    };

    // コンテンツごとの境界線
    const hrElem = document.createElement("hr");
    hrElem.style = "margin: 30px;";

    // 生成した各要素をコンテンツ情報を表示する領域にぶっこむ
    divElem.appendChild(nameElem);
    divElem.appendChild(urlElem);
    divElem.appendChild(zoomElem);
    divElem.appendChild(cssElem);
    divElem.appendChild(btnElem);
    divElem.appendChild(hrElem);

    container.appendChild(divElem);
  });

  const addBtnElem = document.createElement("button");
  addBtnElem.className = "add-board-btn";
  addBtnElem.innerHTML = "+";
  addBtnElem.onclick = function () {
    addBtnElem.remove();
    createNewContent();
    container.appendChild(addBtnElem);
  };
  container.appendChild(addBtnElem);
}

/**
 * アイテム欄を新規生成する
 */
function createNewContent() {
  const container = document.getElementById("items-container");
  const divElem = document.createElement("div");
  divElem.className = "item-box";

  const nameElem = document.createElement("p");
  const nameTextElem = document.createElement("input");
  nameElem.innerHTML = "Name";
  nameTextElem.type = "textbox";
  nameTextElem.className = "content-textbox";
  nameElem.appendChild(nameTextElem);

  const urlElem = document.createElement("p");
  const urlTextElem = document.createElement("input");
  urlElem.innerHTML = "URL";
  urlTextElem.type = "textbox";
  urlTextElem.className = "content-textbox";
  urlElem.appendChild(urlTextElem);

  const zoomElem = document.createElement("p");
  const zoomTextElem = document.createElement("input");
  zoomElem.innerHTML = "Zoom";
  zoomTextElem.type = "textbox";
  zoomTextElem.className = "content-textbox";
  zoomElem.appendChild(zoomTextElem);

  const cssElem = document.createElement("p");
  const tAreaElem = document.createElement("textarea");
  cssElem.innerHTML = "Custom CSS";
  tAreaElem.className = "textarea-ccss";
  cssElem.appendChild(tAreaElem);

  const btnElem = document.createElement("button");
  btnElem.className = "btn btn-outline-danger";
  btnElem.innerHTML = "Delete this item";
  btnElem.onclick = function () {
    btnElem.parentElement.remove();
  };

  const hrElem = document.createElement("hr");
  hrElem.style = "margin: 30px;";

  divElem.appendChild(nameElem);
  divElem.appendChild(urlElem);
  divElem.appendChild(zoomElem);
  divElem.appendChild(cssElem);
  divElem.appendChild(btnElem);
  divElem.appendChild(hrElem);

  container.appendChild(divElem);
}

/**
 * JSONファイルを選択して新規ボードを作成する
 */
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

/**
 * 新規ボード名を入力するモーダルを表示する
 * モーダルのOKボタンが押下されたらインポート処理を行う
 * @param {string} filePath 選択されたファイルパス
 */
function showModalDialogElement(filePath) {
  return new Promise((resolve, reject) => {
    const filename = path.basename(filePath, ".json");
    const dlg = document.querySelector("#input-dialog");
    dlg.style.display = "block";
    dlg.querySelector("input").value = filename;
    dlg.addEventListener("cancel", event => {
      event.preventDefault();
    });
    dlg.showModal();
    function onClose() {
      if (dlg.returnValue === "ok") {
        const inputValue = document.querySelector("#input").value;
        if (checkDuplicateNameExists(inputValue)) {
          alert(`Board name '${inputValue}' is already in use`);
          remote.getCurrentWindow().reload();
        } else {
          resolve(importNewBoard(filePath, inputValue));
        }
      } else {
        reject();
        remote.getCurrentWindow().reload();
      }
    }
    dlg.addEventListener("close", onClose, { once: true });
  });
}

/**
 * 新規ボードを作成する
 * @param {string} source ファイルパスまたは "default"
 * @param {string} boardName
 */
function importNewBoard(source, boardName) {
  if (source === "default") {
    const workspaceName = document.getElementById("workspace-name").value;
    var settings = JSON.parse(`
    {
      "contents": [
        {
          "name": "Slack",
          "url": "https://${workspaceName}.slack.com",
          "size": "large",
          "zoom": 1.0,
          "customCSS": [
            ".p-channel_sidebar { width: 160px !important; }",
            ".p-classic_nav__team_header { display: none !important; }",
            ".p-workspace--context-pane-collapsed { grid-template-columns: 160px auto !important; }"
          ]
        },
        {
          "name": "Google News",
          "url": "https://news.google.com/",
          "size": "medium",
          "zoom": 1.0,
          "customCSS": []
        },
        {
          "name": "Slack(body)",
          "url": "https://${workspaceName}.slack.com",
          "zoom": 1.0,
          "customCSS": [
            ".p-workspace__sidebar { display: none !important; }",
            ".p-classic_nav__team_header { display: none !important;}",
            ".p-workspace--context-pane-collapsed { grid-template-columns: 0px auto !important;}",
            ".p-workspace--context-pane-expanded { grid-template-columns: 0px auto !important;}"
          ]
        },
        {
          "name": "twitter",
          "url": "https://twitter.com",
          "zoom": 1.0,
          "customCSS": ["header { display: none !important; }"]
        },
        {
          "name": "calendar",
          "zoom": 1.0,
          "url": "https://okadash-files.s3-ap-northeast-1.amazonaws.com/calendar.html"
        }
      ]
    }
  `);
  } else {
    var settings = JSON.parse(fs.readFileSync(source));
  }
  if (!validateJson(settings)) {
    return null;
  }

  const newOption = { name: boardName, contents: settings["contents"] };
  let optList = store.get("options");
  let brdList = store.get("boards");
  if (optList) {
    optList.push(newOption);
    brdList.push(newOption);
    store.set("options", optList);
    store.set("boards", brdList);
  } else {
    store.set("version", VERSION);
    store.set("options", [newOption]);
    store.set("boards", [newOption]);
  }
  if (source === "default") {
    const window = remote.getCurrentWindow();
    window.close();
  } else {
    remote.getCurrentWindow().reload();
  }
}

/**
 * 指定したボード名が既に存在するかを戻す
 * @param {string} boardName
 */
function checkDuplicateNameExists(boardName) {
  let found = false;
  const container = document.getElementById("boards-container");
  container.childNodes.forEach(function (node) {
    if (boardName == node.querySelector("a").innerText) found = true;
  });

  return found;
}

/**
 * @param {Object} jsonObj インポートした設定ファイル
 */
function validateJson(jsonObj) {
  if (!jsonObj.contents) {
    alert("Error in settings: contents is invalid");
    return false;
  }
  // FIXME: validateといいつつ、内容の改変まで行っているので分離するべき
  jsonObj.contents.forEach(function (content) {
    if (content["customCSS"] === undefined) content["customCSS"] = [];
  });

  return true;
}

/**
 * 現在開いているボードを削除する
 */
function deleteBoard() {
  const currentBoardName = $("#boards-container li.active").text();
  const allUsingBoards = store.get("boards");
  const allDefinedBoards = store.get("options");

  const confirmMessage = `Delete board name '${currentBoardName}'. OK?`;
  if (!confirm(confirmMessage)) return;

  for (i in allDefinedBoards) {
    if (currentBoardName == allDefinedBoards[i]["name"]) {
      allDefinedBoards.splice(i, 1);
      allUsingBoards.splice(i, 1);
    }
  }
  store.set("options", allDefinedBoards);
  store.set("boards", allUsingBoards);
  remote.getCurrentWindow().reload();
}

/**
 * 現在開いているボードの、定義済みバージョンをJSON形式でエクスポートする
 */
function exportDefinedBoard() {
  exportBoard("options");
}

/**
 * 現在開いているボードの、使用中バージョンをJSON形式でエクスポートする
 */
function exportUsingBoard() {
  exportBoard("boards");
}

/**
 * ボードの設定情報をJSON形式でエクスポートする
 * @params {string} baseKey "boards" or "options"
 */
function exportBoard(baseKey) {
  const targetBoard = document.getElementById("board-name-textbox").innerText;
  let board = {};
  for (i in store.get(baseKey)) {
    if (store.get(baseKey)[i]["name"] == targetBoard) {
      board = store.get(baseKey)[i];
    }
  }
  delete board.name;
  const win = remote.getCurrentWindow();
  dialog.showSaveDialog(
    win,
    {
      defaultPath: document.getElementById("board-name-textbox").innerText,
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
        const data = JSON.stringify(board, null, 2);
        writeFile(fileName, data);
      }
    }
  );
}

/**
 * テキストをファイル出力する
 * @param {string} path
 * @param {string} data
 */
function writeFile(path, data) {
  fs.writeFile(path, data, error => {
    if (error != null) {
      alert("save error.");
      return;
    }
  });
}

/**
 * ボードの設定をStoreに保存する
 */
function saveBoardSetting() {
  const targetBoard = document.getElementById("board-name-textbox").innerText;
  const container = document.getElementById("items-container");
  const items = [];
  let error = false;
  container.querySelectorAll(".item-box").forEach(function (node) {
    let item = {};
    node.querySelectorAll("p").forEach(function (elem) {
      switch (elem.innerText) {
        case "Name":
          item.name = elem.querySelector("input").value;
          if (items.length === 0) {
            item.size = "large";
          } else if (items.length === 1) {
            item.size = "medium";
          }
          if (
            !isValidName(elem.querySelector("input").value, elem.querySelector("input"))
          )
            error = true;
          break;
        case "URL":
          item.url = elem.querySelector("input").value;
          if (!isValidURL(elem.querySelector("input").value, elem.querySelector("input")))
            error = true;
          break;
        case "Zoom":
          item.zoom = elem.querySelector("input").value;
          if (!isValidZoom(item.zoom, elem.querySelector("input"))) {
            error = true;
          }
          break;
        case "Custom CSS":
          item.customCSS = elem.querySelector("textarea").value.split("\n");
          items.push(item);
          break;
      }
    });
  });

  if (!error) {
    let options = store.get("options");
    for (i in options) {
      if (targetBoard == options[i]["name"]) {
        options[i]["contents"] = items;
        break;
      }
    }
    store.set("options", options);
    store.set("boards", options);
    document.getElementById("save-btn").innerText = "Saved!";
    const reloadMessage = function () {
      document.getElementById("save-btn").innerText = "Save Board Setting";
    };
    setTimeout(reloadMessage, 2000);
  } else {
    document.getElementById("save-btn").innerText = "Save failed...";
    document.getElementById("save-btn").className = "btn btn-danger";
    const reloadMessage = function () {
      document.getElementById("save-btn").innerText = "Save Board Setting";
      document.getElementById("save-btn").className = "btn btn-primary";
    };
    setTimeout(reloadMessage, 2000);
  }
}

/**
 * 入力されたアイテム名の値を検証する
 * @param {string}  name
 * @param {Element} elem
 */
function isValidName(name, elem) {
  if (name == "") {
    alert("Item Name Needed");
    elem.style.background = "#fdd";
    return false;
  }
  if (/\"/.test(name)) {
    alert(`Cannot use " in Item (${name})`);
    elem.style.background = "#fdd";
    return false;
  }
  elem.style.background = "#fff";
  return true;
}

/**
 * 入力されたURLの値を検証する
 * @param {string}  url
 * @param {Element} elem
 */
function isValidURL(url, elem) {
  if (url == "") {
    alert("URL is Needed");
    elem.style.background = "#fdd";
    return false;
  }
  if (!url.match(/^(https?|file)(:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+)$/)) {
    alert(`Invalid URL: (${url})`);
    elem.style.background = "#fdd";
    return false;
  }
  if (/\"/.test(url)) {
    alert(`Cannot use " in Item (${url})`);
    elem.style.background = "#fdd";
    return false;
  }
  elem.style.background = "#fff";
  return true;
}

/**
 * 入力された拡大率の値を検証する
 * @param {string}  zoom
 * @param {Element} elem
 */
function isValidZoom(zoom, elem) {
  if (zoom == "") {
    alert("Zoom is Needed");
    elem.style.background = "#fdd";
    return false;
  }
  const zoomNum = Number(zoom);
  if (isNaN(zoomNum) || zoomNum < 0.25 || zoomNum > 5.0) {
    alert("Zoom must be a number between 0.25 and 5.0");
    elem.style.background = "#fdd";
    return false;
  }
  return true;
}

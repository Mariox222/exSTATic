(() => {
  // src/calculations.js
  var IGNORE = /[〔〕《》〖〗〘〙〚〛【】「」［］『』｛｝\[\]()（）｟｠〈〉≪≫。、.,※＊'：！?？‥…―─ｰ〽～→♪♪ ♫ ♬ ♩\"　\t\n]/g;
  function charsInLine(line2) {
    return line2.replaceAll(IGNORE, "").length;
  }
  function lineSplitCount(line2) {
    return line2.split("\n").split("\u3002").length;
  }

  // src/storage.js
  var MAX_TIME_AWAY = 60 * 1e3;
  async function previousGameEntry() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get("previously_hooked", function(game_entry2) {
        if (game_entry2 === void 0 || game_entry2["previously_hooked"] === void 0) {
          reject();
        }
        chrome.storage.local.get(game_entry2["previously_hooked"], function(game_entry3) {
          resolve(game_entry3);
        });
      });
    });
  }
  async function todayGameEntry() {
    rn = new Date();
    date = rn.getFullYear() + "/" + rn.getMonth() + "/" + rn.getDate();
    return new Promise((resolve, reject) => {
      chrome.storage.local.get("previously_hooked", function(game_entry2) {
        if (game_entry2 === void 0 || game_entry2["previously_hooked"] === void 0) {
          reject();
        }
        chrome.storage.local.get(game_entry2["previously_hooked"] + "_" + date, function(game_entry3) {
          resolve(game_entry3);
        });
      });
    });
  }
  function safeDeleteLine(process_path2, line_id2, line2) {
    line_key = JSON.stringify([process_path2, line_id2]);
    chrome.storage.local.remove(line_key);
    chrome.storage.local.get(process_path2, function(game_entry2) {
      last_read_date = game_entry2[process_path2]["dates_read_on"].at(-1);
      game_date_key = process_path2 + "_" + last_read_date;
      chrome.storage.local.get(game_date_key, function(game_entry3) {
        game_entry3[game_date_key]["lines_read"] -= lineSplitCount(line2);
        game_entry3[game_date_key]["chars_read"] -= charsInLine(line2);
        chrome.storage.local.set(game_entry3);
      });
    });
  }

  // src/check_entry_type.js
  function isGameEntry(key, new_value) {
    try {
      return typeof key === "string" && typeof new_value == "object" && "name" in new_value && "dates_read_on" in new_value && "last_line_added" in new_value;
    } catch {
    }
    return false;
  }
  function isGameDateEntry(key, new_value) {
    try {
      return typeof key === "string" && typeof new_value == "object" && "lines_read" in new_value && "chars_read" in new_value && "time_read" in new_value && "last_line_recieved" in new_value;
    } catch {
    }
    return false;
  }
  function isLineEntry(key, old_value, new_value) {
    try {
      parsed = JSON.parse(key);
      if (old_value == void 0 && typeof new_value == "string" && typeof key === "string" && parsed.length == 2 && typeof parsed[0] === "string" && Number.isInteger(parsed[1])) {
        return parsed;
      }
    } catch {
    }
    return false;
  }

  // src/inject.js
  console.log("Injected");
  var MAX_TIME_AWAY2 = 60 * 1e3;
  var previous_game;
  var previous_time;
  var chars_read;
  var time_read;
  var idle_time_added = true;
  function gameNameChanged(event) {
    chrome.storage.local.get(previous_game, function(game_entry2) {
      game_entry2[previous_game]["name"] = event["target"].value;
      chrome.storage.local.set(game_entry2);
    });
  }
  document.getElementById("game_name").onchange = gameNameChanged;
  async function showNameTitle(game_name) {
    game_name_heading = document.getElementById("game_name");
    game_name_heading.disabled = true;
    game_name_heading.value = game_name;
    game_name_heading.disabled = false;
    document.title = "CharTracker | " + game_name;
  }
  function deleteLine(event) {
    confirmed = confirm("Are you sure you'd like to delete this line?\nChar and line statistics will be modified accordingly however time read won't change...");
    if (confirmed) {
      element_div = event["target"].parentNode;
      line_id = Number.parseInt(element_div.dataset.line_id);
      line = element_div.querySelector(".sentence").textContent;
      safeDeleteLine(previous_game, line_id, line);
      element_div.remove();
    }
  }
  function newLineDiv(line2, line_id2) {
    container_div = document.createElement("div");
    new_svg = document.createElement("svg");
    new_p = document.createElement("p");
    new_button = document.createElement("button");
    container_div.classList.add("sentence-entry");
    new_svg.classList.add("circle-bullet-point");
    new_p.classList.add("sentence");
    new_button.classList.add("delete-button");
    new_button.classList.add("material-icons");
    container_div.dataset.line_id = line_id2;
    new_p.innerHTML = line2;
    new_button.innerHTML = "delete";
    new_button.onclick = deleteLine;
    container_div.appendChild(new_svg);
    container_div.appendChild(new_p);
    container_div.appendChild(new_button);
    return container_div;
  }
  function insertLine(line2, line_id2) {
    entry_holder = document.getElementById("entry_holder");
    new_div = newLineDiv(line2, line_id2);
    entry_holder.appendChild(new_div);
  }
  async function bulkLineAdd(game_entry2, game_name) {
    max_line_id = game_entry2["last_line_added"];
    id_queries = [...Array(max_line_id + 1).keys()].map((id) => JSON.stringify([game_name, id]));
    chrome.storage.local.get(id_queries, function(game_date_entries) {
      line_divs = [];
      for (let [key, line2] of Object.entries(game_date_entries)) {
        line_id = JSON.parse(key)[1];
        line_divs.push(newLineDiv(line2, line_id));
      }
      document.getElementById("entry_holder").replaceChildren(...line_divs);
    });
  }
  function setStats(chars_read2, time_read2) {
    document.getElementById("chars_read").innerHTML = chars_read2.toLocaleString();
    average = Math.round(chars_read2 / (time_read2 / (60 * 60 * 1e3)));
    document.getElementById("chars_per_hour").innerHTML = average.toLocaleString();
    date = new Date(0);
    date.setMilliseconds(time_read2);
    document.getElementById("elapsed_time").innerHTML = date.toISOString().substr(11, 8);
  }
  async function startup() {
    document.getElementById("entry_holder").replaceChildren();
    try {
      game_entry = await previousGameEntry();
      previous_game = Object.keys(game_entry)[0];
      bulkLineAdd(game_entry[previous_game], previous_game);
      showNameTitle(game_entry[previous_game]["name"]);
      today_previous_game = await todayGameEntry();
      today_previous_game = today_previous_game[Object.keys(today_previous_game)[0]];
      previous_time = today_previous_game["last_line_recieved"];
      chars_read = today_previous_game["chars_read"];
      time_read = today_previous_game["time_read"];
      setStats(chars_read, time_read);
    } catch {
    }
    setTimeout(function() {
      window.scrollTo(0, document.getElementById("entry_holder").scrollHeight);
    }, 200);
  }
  startup();
  setInterval(async function() {
    time_now = new Date().getTime();
    time_between_lines = time_now - previous_time;
    if (time_between_lines <= MAX_TIME_AWAY2) {
      idle_time_added = false;
      time_so_far = time_read + time_between_lines;
      setStats(chars_read, time_so_far);
    } else {
      if (!idle_time_added) {
        time_read += MAX_TIME_AWAY2;
        setStats(chars_read, time_read);
        game_entry = await todayGameEntry();
        game_entry[Object.keys(game_entry)[0]]["time_read"] = time_read;
        chrome.storage.local.set(game_entry);
        idle_time_added = true;
      }
    }
  }, 1e3);
  chrome.storage.local.onChanged.addListener(function(changes, _) {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
      if (isGameEntry(key, newValue)) {
        if (key != previous_game) {
          previous_game = key;
          showNameTitle(newValue["name"]);
          bulkLineAdd(newValue, key);
        }
      }
      if (isGameDateEntry(key, newValue)) {
        previous_time = newValue["last_line_recieved"];
        chars_read = newValue["chars_read"];
        time_read = newValue["time_read"];
      }
      key = isLineEntry(key, oldValue, newValue);
      if (key) {
        process_path = key[0];
        line_id = key[1];
        line = newValue;
        if (process_path == previous_game) {
          insertLine(line, line_id);
        }
      }
      window.scrollTo(0, document.getElementById("entry_holder").scrollHeight);
    }
  });
})();

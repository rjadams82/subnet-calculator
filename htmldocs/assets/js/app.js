var visibleColumns = {
  subnet: true,
  netmask: true,
  range: true,
  useable: true,
  hosts: true,
  divide: true,
  join: true,
};

var curNetwork = 0;
var curMask = 0;
var hasManualThemePreference = false;

function updateNetwork() {
  var newNetworkStr = document.forms["calc"].elements["network"].value;
  var maskValue = document.forms["calc"].elements["netbits"].value.trim();
  var newMask = Number(maskValue);

  var newNetwork = inet_aton(newNetworkStr);

  if (newNetwork === null) {
    alert("Invalid network address");
    return;
  }

  if (!/^\d+$/.test(maskValue) || !Number.isInteger(newMask) || newMask < 0 || newMask > 32) {
    alert("The network mask is invalid");
    return;
  }

  var tmpNetwork = network_address(newNetwork, newMask);
  if (newNetwork != tmpNetwork) {
    alert(
      "The network address is not on a network boundary.\nIt has been changed to " +
        inet_ntoa(tmpNetwork) +
        ".",
    );
    newNetwork = tmpNetwork;
    document.forms["calc"].elements["network"].value = inet_ntoa(tmpNetwork);
  }

  if (curMask == 0) {
    curMask = newMask;
    curNetwork = newNetwork;
    startOver();
  } else if (
    curMask != newMask &&
    confirm(
      "Changing the network from /" +
        curMask +
        " to /" +
        newMask +
        ". Ok to clear?",
    )
  ) {
    curMask = newMask;
    curNetwork = newNetwork;

    startOver();
  } else {
    document.forms["calc"].elements["netbits"].value = curMask;
    curNetwork = newNetwork;

    recreateTables();
  }

  updateNetworkSummary();
}

function startOver() {
  rootSubnet = [0, 0, null];

  recreateTables();
}

function recreateTables() {
  // Update header visibility
  for (const name in visibleColumns) {
    console.log(name);
    document.getElementById(name + "Header").style.display = visibleColumns[
      name
    ]
      ? "table-cell"
      : "none";
  }

  var calcbody = document.getElementById("calcbody");
  if (!calcbody) {
    alert("Body not found");
    return;
  }

  while (calcbody.hasChildNodes()) {
    calcbody.removeChild(calcbody.firstChild);
  }

  updateNumChildren(rootSubnet);
  updateDepthChildren(rootSubnet);

  createRow(
    calcbody,
    rootSubnet,
    curNetwork,
    curMask,
    [curMask, rootSubnet[1], rootSubnet],
    rootSubnet[0],
  );

  document.getElementById("joinHeader").colSpan =
    rootSubnet[0] > 0 ? rootSubnet[0] : 1;
  //  document.getElementById('col_join').span = (rootSubnet[0] > 0 ? rootSubnet[0] : 1);

  updateQuickSplitOptions();
}

function updateNetworkSummary() {
  var mask = subnet_netmask(curMask);
  var wildcard = ~mask;

  document.getElementById("summaryNetwork").textContent =
    inet_ntoa(curNetwork) + "/" + curMask;
  document.getElementById("summaryMask").textContent = inet_ntoa(mask);
  document.getElementById("summaryWildcard").textContent =
    inet_ntoa(wildcard);
  document.getElementById("summaryBroadcast").textContent = inet_ntoa(
    curNetwork | wildcard,
  );
}

function updateQuickSplitOptions() {
  var buttons = document.querySelector(".quick-split-buttons");
  var options = document.getElementById("quickSplitOptions");
  buttons.replaceChildren();

  [8, 16, 32, 64].forEach(function (count) {
    var additionalBits = Math.log2(count);
    var newMask = curMask + additionalBits;
    if (newMask > 32) {
      return;
    }

    var button = document.createElement("button");
    button.type = "button";
    button.className = "quick-split-button";
    button.dataset.subnetCount = count;
    button.textContent = count + " subnets · /" + newMask;
    buttons.appendChild(button);
  });

  options.hidden = buttons.childElementCount === 0;
}

function quickSplit(count) {
  var additionalBits = Math.log2(count);
  if (!Number.isInteger(additionalBits) || curMask + additionalBits > 32) {
    return;
  }

  rootSubnet = createSubnetTree(additionalBits);
  recreateTables();
}

function createSubnetTree(depth) {
  if (depth === 0) {
    return [0, 0, null];
  }

  return [0, 0, [createSubnetTree(depth - 1), createSubnetTree(depth - 1)]];
}

function getShareUrl() {
  var url = new URL(window.location.href);
  url.search = new URLSearchParams({
    network: inet_ntoa(curNetwork),
    mask: String(curMask),
    division: binToAscii(nodeToString(rootSubnet)),
  }).toString();
  url.hash = "";
  return url.toString();
}

async function shareCurrentSubnet() {
  var url = getShareUrl();
  var status = document.getElementById("shareStatus");

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: "Subnet Calculator",
        text: "Subnet plan",
        url: url,
      });
      status.textContent = "Subnet shared.";
      return;
    } catch (error) {
      if (error.name === "AbortError") {
        status.textContent = "Sharing canceled.";
        return;
      }
    }
  }

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(url);
    } else {
      copyTextFallback(url);
    }
    status.textContent = "Share link copied.";
  } catch (error) {
    status.textContent =
      "Unable to copy the share link. You can copy the page URL from the address bar.";
  }
}

function copyTextFallback(text) {
  var input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  var copied = document.execCommand("copy");
  input.remove();

  if (!copied) {
    throw new Error("Copy command failed.");
  }
}

function nodeToString(node) {
  if (node[2]) {
    return "1" + nodeToString(node[2][0]) + nodeToString(node[2][1]);
  } else {
    return "0";
  }
}

function binToAscii(str) {
  var curOut = "";
  var curBit = 0;
  var curChar = 0;

  for (var i = 0; i < str.length; i++) {
    if (str.charAt(i) == "1") {
      curChar |= 1 << curBit;
    }
    curBit++;
    if (curBit > 3) {
      curOut += curChar.toString(16);
      curChar = 0;
      curBit = 0;
    }
  }
  if (curBit > 0) {
    curOut += curChar.toString(16);
  }
  return str.length + "." + curOut;
}

function asciiToBin(str) {
  var re = /([0-9]+)\.([0-9a-f]+)/;
  var res = re.exec(str);
  var len = res[1];
  var encoded = res[2];
  var out = "";
  for (var i = 0; i < res[1]; i++) {
    var ch = parseInt(res[2].charAt(Math.floor(i / 4)), 16);
    var pos = i % 4;
    out += ch & (1 << pos) ? "1" : "0";
  }
  return out;
}

function createRow(calcbody, node, address, mask, labels, depth) {
  if (node[2]) {
    var newlabels = labels;
    newlabels.push(mask + 1);
    newlabels.push(node[2][0][1]);
    newlabels.push(node[2][0]);
    createRow(calcbody, node[2][0], address, mask + 1, newlabels, depth - 1);

    newlabels = new Array();
    newlabels.push(mask + 1);
    newlabels.push(node[2][1][1]);
    newlabels.push(node[2][1]);
    createRow(
      calcbody,
      node[2][1],
      address + subnet_addresses(mask + 1),
      mask + 1,
      newlabels,
      depth - 1,
    );
  } else {
    var newRow = document.createElement("TR");
    calcbody.appendChild(newRow);

    /* subnet address */
    if (visibleColumns.subnet) {
      var newCell = document.createElement("TD");
      newCell.appendChild(
        document.createTextNode(inet_ntoa(address) + "/" + mask),
      );
      newRow.appendChild(newCell);
    }

    var addressFirst = address;
    var addressLast = subnet_last_address(address, mask);
    var useableFirst = address + 1;
    var useableLast = addressLast - 1;
    var numHosts;
    var addressRange;
    var useableRange;

    if (mask == 32) {
      addressRange = inet_ntoa(addressFirst);
      useableRange = addressRange;
      numHosts = 1;
    } else {
      addressRange = inet_ntoa(addressFirst) + " - " + inet_ntoa(addressLast);
      if (mask == 31) {
        useableRange = addressRange;
        numHosts = 2;
      } else {
        useableRange = inet_ntoa(useableFirst) + " - " + inet_ntoa(useableLast);
        numHosts = 1 + useableLast - useableFirst;
      }
    }

    /* netmask */
    if (visibleColumns.netmask) {
      var newCell = document.createElement("TD");
      newCell.appendChild(
        document.createTextNode(inet_ntoa(subnet_netmask(mask))),
      );
      newRow.appendChild(newCell);
    }

    /* range of addresses */
    if (visibleColumns.range) {
      var newCell = document.createElement("TD");
      newCell.appendChild(document.createTextNode(addressRange));
      newRow.appendChild(newCell);
    }

    /* useable addresses */
    if (visibleColumns.useable) {
      var newCell = document.createElement("TD");
      newCell.appendChild(document.createTextNode(useableRange));
      newRow.appendChild(newCell);
    }

    /* Hosts */
    if (visibleColumns.hosts) {
      var newCell = document.createElement("TD");
      newCell.appendChild(document.createTextNode(numHosts));
      newRow.appendChild(newCell);
    }

    /* actions */
    if (visibleColumns.divide) {
      var newCell = document.createElement("TD");
      newCell.className = "action-column";
      newRow.appendChild(newCell);

      if (mask == 32) {
        var newLink = document.createElement("SPAN");
        newLink.className = "disabledAction";
        newLink.appendChild(document.createTextNode("Divide"));
        newCell.appendChild(newLink);
      } else {
        var newLink = document.createElement("A");
        newLink.href = "#";
        newLink.onclick = function () {
          divide(node);
          return false;
        };
        newLink.appendChild(document.createTextNode("Divide"));
        newCell.appendChild(newLink);
      }
    }

    if (visibleColumns.join) {
      var colspan = depth - node[0];

      for (var i = labels.length / 3 - 1; i >= 0; i--) {
        var mask = labels[i * 3];
        var rowspan = labels[i * 3 + 1];
        var joinnode = labels[i * 3 + 2];

        var newCell = document.createElement("TD");
        newCell.className = "join-column";
        newCell.rowSpan = rowspan > 1 ? rowspan : 1;
        newCell.colSpan = colspan > 1 ? colspan : 1;

        var isJoinable = i != labels.length / 3 - 1;
        if (!isJoinable) {
          newCell.className = "maskSpan";
        } else {
          newCell.className = "maskSpanJoinable";
          newCell.onclick = newJoin(joinnode);
          newCell.setAttribute("role", "button");
          newCell.tabIndex = 0;
          newCell.setAttribute(
            "aria-label",
            "Join subnets at prefix /" + mask,
          );
          newCell.addEventListener("keydown", newJoinOnKeydown(joinnode));
        }
        newCell.classList.add("join-column");

        var maskLabel = document.createElement("SPAN");
        maskLabel.className = "mask-label";
        maskLabel.textContent = "/" + mask;
        newCell.appendChild(maskLabel);
        newRow.appendChild(newCell);

        colspan = 1; // reset for subsequent cells
      }
    }
  }
}

/* This is necessary because 'joinnode' changes during the scope of the caller */
function newJoin(joinnode) {
  return function () {
    join(joinnode);
  };
}

function newJoinOnKeydown(joinnode) {
  return function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      join(joinnode);
    }
  };
}

function divide(node) {
  node[2] = new Array();
  node[2][0] = [0, 0, null];
  node[2][1] = [0, 0, null];
  recreateTables();
}

function join(node) {
  /* easy as pie */
  node[2] = null;
  recreateTables();
}

function updateNumChildren(node) {
  if (node[2] == null) {
    node[1] = 0;
    return 1;
  } else {
    node[1] = updateNumChildren(node[2][0]) + updateNumChildren(node[2][1]);
    return node[1];
  }
}

function updateDepthChildren(node) {
  if (node[2] == null) {
    node[0] = 0;
    return 1;
  } else {
    node[0] = updateDepthChildren(node[2][0]) + updateDepthChildren(node[2][1]);
    return node[1];
  }
}

var rootSubnet;

// each node is Array:
// [0] => depth of children, total number of visible children, children

function inet_ntoa(addrint) {
  return (
    ((addrint >> 24) & 0xff) +
    "." +
    ((addrint >> 16) & 0xff) +
    "." +
    ((addrint >> 8) & 0xff) +
    "." +
    (addrint & 0xff)
  );
}

function inet_aton(addrstr) {
  var re = /^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/;
  var res = re.exec(addrstr);

  if (res === null) {
    return null;
  }

  for (var i = 1; i <= 4; i++) {
    if (res[i] < 0 || res[i] > 255) {
      return null;
    }
  }

  return (res[1] << 24) | (res[2] << 16) | (res[3] << 8) | res[4];
}

function network_address(ip, mask) {
  var maskbits = 0;
  for (var i = 31 - mask; i >= 0; i--) {
    ip &= ~1 << i;
  }
  return ip;
}

function subnet_addresses(mask) {
  return 2 ** (32 - mask);
}

function subnet_last_address(subnet, mask) {
  return subnet + subnet_addresses(mask) - 1;
}

function subnet_netmask(mask) {
  return network_address(0xffffffff, mask);
}

function calcOnLoad() {
  initializeTheme();

  document.forms["calc"].addEventListener("submit", function (event) {
    event.preventDefault();
    updateNetwork();
  });

  document.getElementById("subnetReset").addEventListener("click", function () {
    if (
      confirm("Reset all subnets?")
    ) {
      startOver();
    }
  });

  document.querySelectorAll('input[id^="cb_"]').forEach(function (checkbox) {
    checkbox.addEventListener("click", function () {
      toggleColumn(this);
    });
  });

  document
    .getElementById("quickSplitOptions")
    .addEventListener("click", function (event) {
      var button = event.target.closest("button[data-subnet-count]");
      if (button) {
        quickSplit(parseInt(button.dataset.subnetCount, 10));
      }
    });

  document
    .getElementById("shareSubnet")
    .addEventListener("click", shareCurrentSubnet);

  document
    .getElementById("themeToggle")
    .addEventListener("click", toggleTheme);

  document.getElementById("printSubnet").addEventListener("click", function () {
    window.print();
  });

  args = parseQueryString();
  if (args["network"] && args["mask"] && args["division"]) {
    document.forms["calc"].elements["network"].value = args["network"];
    document.forms["calc"].elements["netbits"].value = args["mask"];
    updateNetwork();
    var division = asciiToBin(args["division"]);
    rootSubnet = [0, 0, null];
    if (division != "0") {
      loadNode(rootSubnet, division);
    }
    recreateTables();
  } else {
    updateNetwork();
  }
}

function initializeTheme() {
  var storedTheme = null;
  try {
    storedTheme = localStorage.getItem("subnet-calculator-theme");
  } catch (error) {
    // Theme still follows the system preference when storage is unavailable.
  }

  var systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  hasManualThemePreference =
    storedTheme === "light" || storedTheme === "dark";
  var theme =
    hasManualThemePreference
      ? storedTheme
      : systemPrefersDark
        ? "dark"
        : "light";

  applyTheme(theme);

  if (storedTheme !== "light" && storedTheme !== "dark") {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", function (event) {
        if (!hasManualThemePreference) {
          applyTheme(event.matches ? "dark" : "light");
        }
      });
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  var toggle = document.getElementById("themeToggle");
  var nextTheme = theme === "dark" ? "light" : "dark";
  var label = "Switch to " + nextTheme + " mode";
  toggle.setAttribute("aria-label", label);
  toggle.title = label;
  toggle.firstElementChild.textContent = theme === "dark" ? "☀" : "☾";
}

function toggleTheme() {
  var theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  hasManualThemePreference = true;
  applyTheme(theme);

  try {
    localStorage.setItem("subnet-calculator-theme", theme);
  } catch (error) {
    // The selected theme remains active until the page is reloaded.
  }
}

function loadNode(curNode, division) {
  if (division.charAt(0) == "0") {
    return division.substr(1);
  } else {
    curNode[2] = new Array();
    curNode[2][0] = [0, 0, null];
    curNode[2][1] = [0, 0, null];

    division = loadNode(curNode[2][0], division.substr(1));
    division = loadNode(curNode[2][1], division);
    return division;
  }
}

function parseQueryString(str) {
  str = str ? str : location.search;
  var query = str.charAt(0) == "?" ? str.substring(1) : str;
  var args = new Object();
  if (query) {
    var fields = query.split("&");
    for (var f = 0; f < fields.length; f++) {
      var field = fields[f].split("=");
      args[unescape(field[0].replace(/\+/g, " "))] = unescape(
        field[1].replace(/\+/g, " "),
      );
    }
  }
  return args;
}

window.onload = calcOnLoad;

function toggleColumn(cb) {
  var colName = "col_" + cb.id.substr(3);
  //  var col = document.getElementById(colName);

  visibleColumns[cb.id.substr(3)] = cb.checked;

  //  if (cb.checked) {
  //    col.style.display = 'table-column';
  //    col.style.visibility = 'visible';
  //  }
  //  else {
  //    col.style.display = 'none';
  //    col.style.visibility = 'collapse';
  //  }
  recreateTables(); /* because IE draws lines all over the place with border-collapse */
}

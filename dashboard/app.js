// Dashboard for the analog token radar. Renders window.BOARD_DATA (written
// by main.ts as data.js beside this page) with sorting, filtering, and a
// detail view per protocol. No network: all data is local to the output.
(function () {
  "use strict";
  var state = { rows: [], meta: null, selected: null, sortKey: "rank", sortDir: 1 };

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function formatMoney(n) {
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
    return "$" + Math.round(n);
  }
  function formatPct(x) {
    if (x === null || x === undefined) return "—";
    return (x >= 0 ? "+" : "") + x.toFixed(1) + "%";
  }
  function tierClass(tier) {
    if (tier === "Strong analogs") return "strong";
    if (tier === "Fair analogs") return "fair";
    return "thin";
  }
  function sortValue(row, key) {
    if (key === "rank") return row.rank;
    if (key === "name") return row.name.toLowerCase();
    if (key === "category") return row.category.toLowerCase();
    if (key === "tvl") return row.tvl_usd;
    if (key === "growth") return row.change_7d === null ? -999 : row.change_7d;
    if (key === "multiple") return row.analog_multiple;
    if (key === "implied") return row.implied_value_usd;
    if (key === "strength") return row.analog_strength;
    if (key === "age") return row.age_days;
    return row.rank;
  }
  function applyFilters() {
    var q = document.getElementById("q").value.trim().toLowerCase();
    var cat = document.getElementById("cat").value;
    var tier = document.getElementById("tier").value;
    var effort = document.getElementById("effort").value;
    var watch = document.getElementById("watch").checked;
    var out = state.rows.filter(function (r) {
      if (cat && r.category !== cat) return false;
      if (tier && r.analog_tier !== tier) return false;
      if (effort && r.effort_band !== effort) return false;
      if (watch && !r.watchlist) return false;
      if (q) {
        var hay = (r.name + " " + r.slug + " " + r.category + " " + r.chains.join(" ")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    return out;
  }
  function sortRows(rows) {
    var key = state.sortKey, dir = state.sortDir;
    return rows.slice().sort(function (a, b) {
      var va = sortValue(a, key), vb = sortValue(b, key);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return a.rank - b.rank;
    });
  }
  function renderBoard() {
    var rows = sortRows(applyFilters());
    var tbody = document.getElementById("rows");
    var html = "";
    rows.forEach(function (r) {
      var g = r.change_7d;
      var gcls = g === null ? "" : (g >= 0 ? "up" : "down");
      html += '<tr data-slug="' + escapeHtml(r.slug) + '"' + (state.selected === r.slug ? ' class="sel"' : "") + ">" +
        "<td>" + r.rank + "</td>" +
        "<td><strong>" + escapeHtml(r.name) + "</strong>" + (r.watchlist ? ' <span class="star" title="On the watchlist">★</span>' : "") + "<br><span class=\"fine\">" + escapeHtml(r.slug) + "</span></td>" +
        "<td>" + escapeHtml(r.category) + "</td>" +
        '<td class="num">' + formatMoney(r.tvl_usd) + "</td>" +
        '<td class="num ' + gcls + '">' + formatPct(g) + "</td>" +
        '<td class="num">' + r.analog_multiple.toFixed(2) + "×</td>" +
        '<td class="num"><strong>' + formatMoney(r.implied_value_usd) + "</strong></td>" +
        '<td><span class="pill ' + tierClass(r.analog_tier) + '">' + escapeHtml(r.analog_tier) + "</span></td></tr>";
    });
    tbody.innerHTML = html || '<tr><td colspan="8" class="fine">No protocols match these filters.</td></tr>';
    document.getElementById("count").textContent = rows.length + " of " + state.rows.length + " protocols";
    var trs = tbody.querySelectorAll("tr[data-slug]");
    trs.forEach(function (tr) {
      tr.addEventListener("click", function () { selectRow(tr.getAttribute("data-slug")); });
    });
  }
  function renderDetail(row) {
    var el = document.getElementById("detail");
    if (!row) { el.innerHTML = "<p class=\"fine\">Select a protocol to see its detail view.</p>"; return; }
    var lo = row.implied_low_usd, hi = row.implied_high_usd, mid = row.implied_value_usd;
    var span = Math.max(1, hi - lo);
    var left = Math.max(0, Math.min(100, ((mid - lo) / span) * 100));
    var steps = row.farm_steps.map(function (s) { return "<li>" + escapeHtml(s) + "</li>"; }).join("");
    var neigh = row.neighbors.map(function (n) {
      return "<tr><td>" + escapeHtml(n.name) + "</td><td class=\"num\">" + n.multiple.toFixed(2) + "×</td><td class=\"num\">" + n.distance.toFixed(2) + "</td></tr>";
    }).join("");
    el.innerHTML =
      "<h2>#" + row.rank + " " + escapeHtml(row.name) + "</h2>" +
      "<p class=\"fine\">" + escapeHtml(row.slug) + " · " + escapeHtml(row.category) + " · " + escapeHtml(row.chains.join(", ")) + (row.watchlist ? " · <span class=\"star\">★ Watchlist</span>" : "") + "</p>" +
      "<p class=\"verdict\">" + escapeHtml(row.verdict) + "</p>" +
      "<div class=\"grid\">" +
      "<div class=\"cell\"><span>Implied value</span><b>" + formatMoney(row.implied_value_usd) + "</b></div>" +
      "<div class=\"cell\"><span>TVL</span><b>" + formatMoney(row.tvl_usd) + "</b></div>" +
      "<div class=\"cell\"><span>Analog multiple</span><b>" + row.analog_multiple.toFixed(2) + "× TVL</b></div>" +
      "<div class=\"cell\"><span>7-day growth</span><b>" + formatPct(row.change_7d) + "</b></div>" +
      "<div class=\"cell\"><span>Age listed</span><b>" + row.age_days + " days</b></div>" +
      "<div class=\"cell\"><span>Analog strength</span><b>" + row.analog_strength + " / 100</b></div>" +
      "<div class=\"cell\"><span>Effort</span><b>" + escapeHtml(row.effort_band) + "</b></div>" +
      "<div class=\"cell\"><span>Time</span><b>" + row.setup_minutes + " min setup · " + row.weekly_minutes + " min/week</b></div>" +
      "</div>" +
      "<h3>Implied-value bracket</h3><div class=\"bar\"><i style=\"left:0%;width:100%\"></i><em style=\"left:" + left.toFixed(1) + "%\"></em></div>" +
      "<p class=\"bracket\">Low " + formatMoney(lo) + " · point " + formatMoney(mid) + " · high " + formatMoney(hi) + ". The bracket comes from the nearest analogs' spread, not from a confidence interval.</p>" +
      "<p class=\"fine\">" + escapeHtml(row.gas_band) + "</p>" +
      "<h3>Nearest launched analogs</h3><table><thead><tr><th>Protocol</th><th>mcap / TVL</th><th>Distance</th></tr></thead><tbody>" + neigh + "</tbody></table>" +
      "<p class=\"fine\">k-NN multiple " + row.knn_multiple.toFixed(2) + "× · category multiple " + row.category_multiple.toFixed(2) + "× · blend 65/35.</p>" +
      "<h3>How to farm it</h3><ol>" + steps + "</ol>";
  }
  function selectRow(slug) {
    state.selected = slug;
    var row = null;
    state.rows.forEach(function (r) { if (r.slug === slug) row = r; });
    renderBoard();
    renderDetail(row);
  }
  function renderStats() {
    var m = state.meta;
    if (!m) return;
    var oos = m.oos_leave_one_out;
    document.getElementById("stats").innerHTML =
      "<div class=\"stat\"><b>" + m.board_rows + "</b><span>on the board</span></div>" +
      "<div class=\"stat\"><b>" + m.watchlist_covered + "/" + m.watchlist_total + "</b><span>watchlist covered</span></div>" +
      "<div class=\"stat\"><b>" + m.launched_count + "</b><span>launched analogs</span></div>" +
      "<div class=\"stat\"><b>" + oos.median_abs_pct_error + "%</b><span>median leave-one-out error</span></div>";
  }
  function populateCategories() {
    var sel = document.getElementById("cat");
    var cats = [];
    state.rows.forEach(function (r) { if (cats.indexOf(r.category) === -1) cats.push(r.category); });
    cats.sort();
    cats.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
  }
  function init(data) {
    state.meta = data.meta;
    state.rows = data.rows;
    renderStats();
    populateCategories();
    renderBoard();
    if (state.rows.length) selectRow(state.rows[0].slug);
    ["q", "cat", "tier", "effort", "watch", "sort"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", function () {
        if (id === "sort") {
          var map = { rank: "rank", tvl: "tvl", multiple: "multiple", strength: "strength", growth: "growth", age: "age" };
          state.sortKey = map[document.getElementById("sort").value] || "rank";
          state.sortDir = state.sortKey === "rank" ? 1 : -1;
        }
        renderBoard();
      });
    });
    document.querySelectorAll("#board th[data-k]").forEach(function (th) {
      th.addEventListener("click", function () {
        var k = th.getAttribute("data-k");
        if (state.sortKey === k) state.sortDir = -state.sortDir;
        else { state.sortKey = k; state.sortDir = (k === "rank" || k === "name" || k === "category") ? 1 : -1; }
        renderBoard();
      });
    });
  }
  function boot() {
    if (window.BOARD_DATA && window.BOARD_DATA.rows) { init(window.BOARD_DATA); return; }
    fetch("../board.json").then(function (r) { return r.json(); }).then(init).catch(function () {
      document.getElementById("rows").innerHTML = '<tr><td colspan="8">Board data not found. Open this dashboard from the program output, where data.js sits beside the dashboard folder.</td></tr>';
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

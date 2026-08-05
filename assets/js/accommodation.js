(function () {
  "use strict";

  var picker = document.querySelector("[data-accommodation-picker]");
  if (!picker) return;

  var tallyFormId = picker.dataset.tallyFormId || "";
  var tallyFields = {
    claimKey: picker.dataset.tallyClaimKeyField || "claim_key",
    spotId: picker.dataset.tallySpotIdField || "spot_id",
    room: picker.dataset.tallyRoomField || "room",
    place: picker.dataset.tallyPlaceField || "place"
  };
  var rosterSheetId = picker.dataset.rosterSheetId || "";
  var rosterSheetName = picker.dataset.rosterSheetName || "Claims";
  var integrationReady = picker.dataset.rosterIntegrationReady === "true";
  var callbackName = picker.dataset.rosterCallback || "openBluesAccommodationRosterV1";
  var requestTimeout = positiveInteger(picker.dataset.rosterTimeout, 10000);
  var pollInterval = positiveInteger(picker.dataset.rosterPoll, 30000);

  var rooms = Array.prototype.slice.call(picker.querySelectorAll("[data-room]"));
  var mapLinks = Array.prototype.slice.call(picker.querySelectorAll("[data-map-room]"));
  var allSlots = Array.prototype.slice.call(picker.querySelectorAll("[data-slot]"));
  var rosterSlots = Array.prototype.slice.call(picker.querySelectorAll("[data-slot][data-roster-key]"));
  var claimableSlots = Array.prototype.slice.call(picker.querySelectorAll("[data-slot][data-claim-key]"));
  var slotByRosterKey = new Map();
  var slotByClaimKey = new Map();
  var slotBySpotId = new Map();
  var livePanel = picker.querySelector("[data-live-panel]");
  var liveMessage = picker.querySelector("[data-live-message]");
  var retryButton = picker.querySelector("[data-roster-retry]");
  var totalAvailable = picker.querySelector("[data-total-available]");
  var roomSearch = picker.querySelector("[data-room-search-input]");
  var buildingFilter = picker.querySelector("[data-building-filter]");
  var floorFilter = picker.querySelector("[data-floor-filter]");
  var availableFilter = picker.querySelector("[data-available-filter]");
  var filters = picker.querySelector("[data-filters]");
  var resultCount = picker.querySelector("[data-result-count]");
  var noResults = picker.querySelector("[data-no-results]");

  var requestScript = null;
  var requestTimer = null;
  var pollTimer = null;
  var requestInFlight = false;
  var rosterReady = false;
  var lastSuccessfulCheck = 0;

  allSlots.forEach(function (slot) {
    var spotId = cleanValue(slot.dataset.spotId);
    if (!spotId || slotBySpotId.has(spotId)) {
      setConfigurationError("Room data error. Claims are paused.");
      return;
    }
    slotBySpotId.set(spotId, slot);
  });

  rosterSlots.forEach(function (slot) {
    var rosterKey = cleanValue(slot.dataset.rosterKey);
    if (!rosterKey || slotByRosterKey.has(rosterKey)) {
      setConfigurationError("Room data error. Claims are paused.");
      return;
    }
    slotByRosterKey.set(rosterKey, slot);
  });

  claimableSlots.forEach(function (slot) {
    var claimKey = cleanValue(slot.dataset.claimKey);
    if (!claimKey || slotByClaimKey.has(claimKey) || claimKey !== cleanValue(slot.dataset.rosterKey)) {
      setConfigurationError("Room data error. Claims are paused.");
      return;
    }
    slotByClaimKey.set(claimKey, slot);
    disableClaim(slot, "Checking…");
  });

  wireFilters();
  wireMapLinks();
  wirePhotoFallbacks();
  updateRoomSummaries();
  applyFilters();

  if (retryButton) retryButton.addEventListener("click", loadRoster);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      window.clearTimeout(pollTimer);
      return;
    }
    if (!lastSuccessfulCheck || Date.now() - lastSuccessfulCheck >= pollInterval) loadRoster();
    else schedulePoll();
  });

  if (configurationLooksValid()) loadRoster();
  else setConfigurationError("Claims are paused.");

  function positiveInteger(value, fallback) {
    var parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function cleanValue(value) {
    return value == null ? "" : String(value).trim();
  }

  function normalise(value) {
    var text = cleanValue(value).toLocaleLowerCase();
    if (typeof text.normalize === "function") text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return text.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  function normaliseHeader(value) {
    return normalise(value).replace(/\s+/g, "");
  }

  function configurationLooksValid() {
    return /^[A-Za-z0-9_-]{4,32}$/.test(tallyFormId) &&
      tallyFields.claimKey === "claim_key" &&
      tallyFields.spotId === "spot_id" &&
      tallyFields.room === "room" &&
      tallyFields.place === "place" &&
      /^[A-Za-z0-9_-]{20,80}$/.test(rosterSheetId) &&
      /^[A-Za-z0-9 _$-]{1,80}$/.test(rosterSheetName) &&
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callbackName) &&
      slotBySpotId.size === allSlots.length &&
      slotByRosterKey.size === rosterSlots.length &&
      slotByClaimKey.size === claimableSlots.length;
  }

  function setConfigurationError(message) {
    rosterReady = false;
    disableAllClaims("Unavailable");
    setLiveState("error", message, false);
  }

  function wireFilters() {
    [roomSearch, buildingFilter, floorFilter, availableFilter].forEach(function (control) {
      if (!control) return;
      control.addEventListener(control === roomSearch ? "input" : "change", applyFilters);
    });

    if (filters) {
      filters.addEventListener("reset", function () {
        window.setTimeout(applyFilters, 0);
      });
    }
  }

  function wireMapLinks() {
    mapLinks.forEach(function (link) {
      link.addEventListener("click", function (event) {
        var room = document.getElementById("room-" + link.dataset.mapRoom);
        if (!room || room.hidden) {
          event.preventDefault();
          return;
        }
        window.setTimeout(function () {
          room.focus({ preventScroll: true });
        }, 0);
      });
    });
  }

  function wirePhotoFallbacks() {
    Array.prototype.slice.call(picker.querySelectorAll("[data-room-photo] img")).forEach(function (photo) {
      photo.addEventListener("error", function () {
        var picture = photo.closest("[data-room-photo]");
        var container = photo.closest(".ac-room-photo");
        if (!picture || !container) return;
        picture.hidden = true;

        var fallback = document.createElement("div");
        fallback.className = "ac-photo-fallback";
        fallback.setAttribute("aria-hidden", "true");
        var icon = document.createElement("span");
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "⌂";
        fallback.appendChild(icon);
        container.appendChild(fallback);
      }, { once: true });
    });
  }

  function applyFilters() {
    var query = normalise(roomSearch ? roomSearch.value : "");
    var building = buildingFilter ? buildingFilter.value : "all";
    var floor = floorFilter ? floorFilter.value : "all";
    var availableOnly = Boolean(availableFilter && availableFilter.checked);
    var filterActive = Boolean(query || building !== "all" || floor !== "all" || availableOnly);
    var shown = 0;

    rooms.forEach(function (room) {
      var roomMatch = normalise(room.dataset.roomSearch).indexOf(query) !== -1;
      var searchMatch = !query || roomMatch;
      var buildingMatch = building === "all" || room.dataset.building === building;
      var floorMatch = floor === "all" || room.dataset.floor === floor;
      var hasAvailable = Boolean(room.querySelector('[data-slot][data-status="available"]'));
      var visible = searchMatch && buildingMatch && floorMatch && (!availableOnly || hasAvailable);
      room.hidden = !visible;
      if (visible) shown += 1;
    });

    mapLinks.forEach(function (link) {
      var linkedRoom = document.getElementById("room-" + link.dataset.mapRoom);
      var matches = Boolean(linkedRoom && !linkedRoom.hidden);
      link.hidden = filterActive && !matches;
      link.classList.toggle("ac-map-match", filterActive && matches);
    });

    Array.prototype.slice.call(picker.querySelectorAll(".ac-map-floor")).forEach(function (mapFloor) {
      mapFloor.hidden = filterActive && !mapFloor.querySelector("[data-map-room]:not([hidden])");
    });
    Array.prototype.slice.call(picker.querySelectorAll(".ac-map-building")).forEach(function (mapBuilding) {
      mapBuilding.hidden = filterActive && !mapBuilding.querySelector("[data-map-room]:not([hidden])");
    });

    if (resultCount) {
      if (shown === rooms.length && !query && building === "all" && floor === "all" && !availableOnly) {
        resultCount.textContent = rooms.length + " rooms";
      } else {
        resultCount.textContent = shown + " of " + rooms.length + " rooms";
      }
    }
    if (noResults) noResults.hidden = shown !== 0;
  }

  function buildClaimUrl(slot) {
    var url = new URL("/r/" + encodeURIComponent(tallyFormId), "https://tally.so");
    url.searchParams.set(tallyFields.claimKey, slot.dataset.claimKey);
    url.searchParams.set(tallyFields.spotId, slot.dataset.spotId);
    url.searchParams.set(tallyFields.room, slot.dataset.roomLabel);
    url.searchParams.set(tallyFields.place, slot.dataset.placeLabel);
    return url.href;
  }

  function disableClaim(slot, label) {
    var action = slot.querySelector("[data-claim-action]");
    if (!action) return;
    action.removeAttribute("href");
    action.removeAttribute("target");
    action.removeAttribute("rel");
    action.setAttribute("aria-disabled", "true");
    action.setAttribute("tabindex", "-1");
    action.textContent = label;
  }

  function enableClaim(slot) {
    var action = slot.querySelector("[data-claim-action]");
    if (!action || !rosterReady || slot.dataset.status !== "available") return;
    action.href = buildClaimUrl(slot);
    action.target = "_blank";
    action.rel = "noopener noreferrer";
    action.setAttribute("aria-disabled", "false");
    action.removeAttribute("tabindex");
    action.textContent = "Claim";
  }

  function disableAllClaims(label) {
    claimableSlots.forEach(function (slot) { disableClaim(slot, label); });
  }

  function setSlotState(slot, status) {
    ["available", "occupied", "blocked", "reserved-unknown"].forEach(function (state) {
      slot.classList.remove("ac-slot-" + state);
    });
    slot.dataset.status = status;
    slot.classList.add("ac-slot-" + status);

    var statusText = slot.querySelector("[data-slot-status]");
    if (statusText) statusText.textContent = status === "occupied" ? "Claimed" : "Available";

    if (status === "available" && integrationReady) enableClaim(slot);
    else if (status === "available") disableClaim(slot, "Opening soon");
    else disableClaim(slot, "Claimed");
  }

  function updateRoomSummaries() {
    var openTotal = 0;
    rooms.forEach(function (room) {
      var available = room.querySelectorAll('[data-slot][data-status="available"]').length;
      var held = room.dataset.roomStatus === "held";
      var roomCount = room.querySelector("[data-room-availability]");
      var mapLink = picker.querySelector('[data-map-room="' + room.dataset.roomId + '"]');
      var mapCount = mapLink ? mapLink.querySelector("[data-map-availability]") : null;
      openTotal += available;

      if (roomCount) {
        roomCount.textContent = held ? "Held" : (available > 0 ? available + " available" : "Full");
        roomCount.classList.toggle("ac-room-count-full", !held && available === 0);
        roomCount.classList.toggle("ac-room-count-held", held);
      }
      if (mapCount) mapCount.textContent = held ? "Held" : (available > 0 ? available + " available" : "Full");
      if (mapLink) {
        mapLink.classList.toggle("ac-map-full", !held && available === 0);
        mapLink.classList.toggle("ac-map-held", held);
        mapLink.setAttribute("aria-label", room.dataset.roomSearch + " — " +
          (held ? "held" : (available > 0 ? available + " available" : "full")));
      }
    });
    if (totalAvailable) totalAvailable.textContent = String(openTotal);
  }

  function setLiveState(state, message, showRetry) {
    if (!livePanel || !liveMessage) return;
    livePanel.classList.remove("ac-live-checking", "ac-live-ready", "ac-live-error");
    livePanel.classList.add("ac-live-" + state);
    liveMessage.textContent = message;
    if (retryButton) retryButton.hidden = !showRetry;
  }

  function loadRoster() {
    if (requestInFlight || document.hidden) return;
    if (!configurationLooksValid()) {
      setConfigurationError("Claims are paused.");
      return;
    }

    requestInFlight = true;
    window.clearTimeout(pollTimer);
    cleanupRequest();
    // Availability is only trusted for a completed roster check. Disable every
    // claim while refreshing so a backgrounded tab cannot expose stale links.
    rosterReady = false;
    disableAllClaims("Checking…");
    setLiveState("checking", integrationReady ? "Checking availability…" : "Claims opening soon…", false);

    window[callbackName] = receiveRoster;
    var endpoint = new URL("https://docs.google.com/spreadsheets/d/" + encodeURIComponent(rosterSheetId) + "/gviz/tq");
    endpoint.searchParams.set("sheet", rosterSheetName);
    endpoint.searchParams.set("headers", "1");
    // Privacy invariant: request occupancy keys only. Never add Tally's name
    // column (E) to this public response; raw participant values must not reach
    // a visitor's browser.
    endpoint.searchParams.set("tq", "select A,B");
    endpoint.searchParams.set("tqx", "out:json;responseHandler:" + callbackName);
    endpoint.searchParams.set("_", String(Date.now()));

    requestScript = document.createElement("script");
    requestScript.async = true;
    requestScript.referrerPolicy = "no-referrer";
    requestScript.src = endpoint.href;
    requestScript.onerror = function () {
      failRoster("Can’t check availability. Claims are paused.");
    };
    document.head.appendChild(requestScript);

    requestTimer = window.setTimeout(function () {
      failRoster("Can’t check availability. Claims are paused.");
    }, requestTimeout);
  }

  function receiveRoster(payload) {
    if (!requestInFlight) return;
    try {
      var claims = parseRoster(payload);
      rosterReady = integrationReady;

      rosterSlots.forEach(function (slot) {
        var claimed = claims.has(slot.dataset.rosterKey);
        if (slot.dataset.initialStatus === "occupied") {
          setSlotState(slot, "occupied");
        } else {
          setSlotState(slot, claimed ? "occupied" : "available");
        }
      });

      lastSuccessfulCheck = Date.now();
      updateRoomSummaries();
      applyFilters();
      var available = picker.querySelectorAll('[data-slot][data-claim-key][data-status="available"]').length;
      var checkedTime = new Date(lastSuccessfulCheck).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (integrationReady) {
        setLiveState("ready", available + " available · checked " + checkedTime, false);
      } else {
        disableAllClaims("Opening soon");
        setLiveState("checking", "Availability checked · claims opening soon", false);
      }
      finishRequest();
      schedulePoll();
    } catch (error) {
      console.warn("Accommodation roster rejected:", error.message);
      failRoster("Can’t check availability. Claims are paused.");
    }
  }

  function parseRoster(payload) {
    if (!payload || payload.status === "error" || !payload.table || !Array.isArray(payload.table.cols) || !Array.isArray(payload.table.rows)) {
      throw new Error("Missing Google Visualization table");
    }

    // Before launch, the intentionally empty destination has no header row.
    // After launch, even an empty roster must expose the expected schema;
    // otherwise a wrong/cleared tab could make every place look available.
    if (payload.table.rows.length === 0 && !integrationReady) return new Map();

    var headers = payload.table.cols.map(function (column) {
      return normaliseHeader(column && (column.label || column.id));
    });
    var claimKeyIndex = findHeader(headers, function (header) {
      return header === "claimkey";
    });
    var statusIndex = findHeader(headers, function (header) {
      return header === "claimstatus" || header === "rosterstatus";
    });

    if (claimKeyIndex < 0) throw new Error("No claim_key column");

    var claims = new Map();
    payload.table.rows.forEach(function (row, rowIndex) {
      var cells = row && Array.isArray(row.c) ? row.c : [];
      var claimKey = cellValue(cells, claimKeyIndex);
      var claimStatus = normalise(cellValue(cells, statusIndex));
      if (!claimKey) return;

      // The roster key is the only authoritative binding. Claimable places use
      // their Tally claim_key and seeded occupants use non-claimable seed keys.
      // Participant-entered names are neither requested nor parsed.
      // Every descriptive hidden field is editable URL context and never binds
      // a row to a place. Unknown/rotated/QA keys cannot affect inventory.
      if (!claimKey || !slotByRosterKey.has(claimKey)) {
        console.warn("Ignoring unknown accommodation claim row", rowIndex + 2);
        return;
      }

      if (["cancelled", "canceled", "released", "rejected", "void", "available"].indexOf(claimStatus) !== -1) {
        claims.delete(claimKey);
        return;
      }

      if (claims.has(claimKey)) {
        console.warn("Ignoring duplicate accommodation claim row", rowIndex + 2);
        return;
      }
      claims.set(claimKey, true);
    });
    return claims;
  }

  function findHeader(headers, predicate) {
    for (var index = 0; index < headers.length; index += 1) {
      if (predicate(headers[index])) return index;
    }
    return -1;
  }

  function cellValue(cells, index) {
    if (index < 0 || !cells[index] || cells[index].v == null) return "";
    return cleanValue(cells[index].v);
  }

  function failRoster(message) {
    rosterReady = false;
    disableAllClaims("Unavailable");
    setLiveState("error", message, true);
    finishRequest();
  }

  function finishRequest() {
    requestInFlight = false;
    cleanupRequest();
  }

  function cleanupRequest() {
    window.clearTimeout(requestTimer);
    requestTimer = null;
    if (requestScript && requestScript.parentNode) requestScript.parentNode.removeChild(requestScript);
    requestScript = null;
  }

  function schedulePoll() {
    window.clearTimeout(pollTimer);
    if (document.hidden) return;
    pollTimer = window.setTimeout(loadRoster, pollInterval);
  }
}());

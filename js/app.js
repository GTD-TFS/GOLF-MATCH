document.addEventListener("DOMContentLoaded", () => {
  const { profile, matches, statuses, fields, players } = window.Store;
  const defaultAvatar = "https://i.pravatar.cc/300?img=12";
  const appBootTs = Date.now();
  let bootSplashClosed = false;

  if (!profile.photo) profile.photo = defaultAvatar;
  if (!profile.licenseNumber) profile.licenseNumber = "";

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").then(registration => {
        registration.update().catch(() => {});
        setTimeout(() => {
          registration.update().catch(() => {});
        }, 3000);
      }).catch(() => {});
    });
  }

  function dismissBootSplash(delayMs = 260) {
    if (bootSplashClosed) return;
    const splash = document.getElementById("bootSplash");
    if (!splash) {
      bootSplashClosed = true;
      return;
    }
    bootSplashClosed = true;
    window.setTimeout(() => {
      splash.classList.add("is-exiting");
      window.setTimeout(() => {
        splash.remove();
      }, 620);
    }, Math.max(0, delayMs));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function syncProfileDirectory() {
    if (!profile.name) return;
    players[profile.name] = {
      name: profile.name,
      zone: profile.zone || "Zona no especificada",
      handicap: profile.handicap || "-",
      licenseNumber: profile.licenseNumber || "",
      favCourse: profile.favCourse || "Sin campo favorito",
      photo: profile.photo || defaultAvatar,
      bio: players[profile.name]?.bio || "Jugador activo en Golf Match."
    };
  }

  function populateMatchCourseSelect() {
    const select = document.getElementById("matchCourse");
    select.innerHTML = '<option value="" selected disabled>Selecciona un campo de Tenerife</option>';

    fields.forEach(field => {
      const option = document.createElement("option");
      option.value = String(field.id);
      option.textContent = field.name;
      select.appendChild(option);
    });
  }

  function syncMatchBranding() {
    const fieldsById = new Map(fields.map(field => [field.id, field]));
    const fieldsByName = new Map(
      fields.map(field => [field.name.toLowerCase(), field])
    );

    matches.forEach(match => {
      const field =
        fieldsById.get(match.fieldId) ||
        fieldsByName.get((match.course || "").toLowerCase());
      if (!field) return;
      if (!match.fieldId) match.fieldId = field.id;
      if (field.logo) match.logo = field.logo;
    });
  }

  function parseHandicapValue(value) {
    const normalized = String(value ?? "").replace(",", ".").trim();
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatHandicapValue(value) {
    if (!Number.isFinite(value)) return "-";
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function syncMatchHcpRanges() {
    matches.forEach(match => {
      const handicaps = (Array.isArray(match.players) ? match.players : [])
        .map(name => parseHandicapValue(getPlayerInfo(name)?.handicap))
        .filter(value => Number.isFinite(value));

      if (!handicaps.length) {
        match.hcpRange = "Sin datos";
        return;
      }

      const min = Math.min(...handicaps);
      const max = Math.max(...handicaps);
      match.hcpRange = min === max
        ? formatHandicapValue(min)
        : `${formatHandicapValue(min)}-${formatHandicapValue(max)}`;
    });
  }

  function syncStatusAvatars() {
    statuses.forEach(status => {
      status.avatar = getPlayerInfo(status.author)?.photo || defaultAvatar;
    });
  }

  function getCurrentPlayerName() {
    return profile.name || "Usuario";
  }

  function ensureMatchOwnershipAndTimestamps() {
    matches.forEach(match => {
      if (!match.createdBy) {
        match.createdBy = match.players?.[0] || getCurrentPlayerName();
      }

      const parsedCreatedAt = Number(match.createdAt);
      if (!Number.isFinite(parsedCreatedAt) || parsedCreatedAt <= 0) {
        const matchId = Number(match.id);
        if (Number.isFinite(matchId) && matchId > 1e11) {
          match.createdAt = matchId;
        }
      }
    });

    statuses.forEach(status => {
      const parsedCreatedAt = Number(status.createdAt);
      if (!Number.isFinite(parsedCreatedAt) || parsedCreatedAt <= 0) {
        const statusId = Number(status.id);
        if (Number.isFinite(statusId) && statusId > 1e11) {
          status.createdAt = statusId;
        }
      }
    });

    let nextCreatedAt = appBootTs - (matches.length + statuses.length + 10);
    const sortedWithoutCreatedAt = [
      ...matches
        .filter(match => !Number.isFinite(Number(match.createdAt)) || Number(match.createdAt) <= 0)
        .map(match => ({ kind: "match", ref: match })),
      ...statuses
        .filter(status => !Number.isFinite(Number(status.createdAt)) || Number(status.createdAt) <= 0)
        .map(status => ({ kind: "status", ref: status }))
    ];

    sortedWithoutCreatedAt.forEach(item => {
      nextCreatedAt += 1;
      item.ref.createdAt = nextCreatedAt;
    });
  }

  function getNextStatusId() {
    const maxId = statuses.reduce((max, status) => {
      const id = Number(status?.id || 0);
      return id > max ? id : max;
    }, 0);
    return maxId + 1;
  }

  function ensureMatchThreads() {
    const statusById = new Map(
      statuses
        .map(status => [Number(status?.id || 0), status])
        .filter(([id]) => id > 0)
    );
    const statusByMatchId = new Map();
    statuses.forEach(status => {
      const linkedMatchId = Number(status?.linkedMatchId || 0);
      if (linkedMatchId) statusByMatchId.set(linkedMatchId, status);
    });

    matches.forEach(match => {
      const explicitThreadId = Number(match?.statusThreadId || 0);
      let thread = explicitThreadId ? statusById.get(explicitThreadId) : null;
      if (!thread) thread = statusByMatchId.get(match.id) || null;

      const commentText = String(match?.comment || "").trim();
      if (!thread) {
        thread = {
          id: getNextStatusId(),
          author: getCurrentPlayerName(),
          text: commentText,
          replies: [],
          linkedMatchId: match.id,
          createdAt: Number(match.createdAt) || Date.now()
        };
        statuses.push(thread);
        statusById.set(thread.id, thread);
        statusByMatchId.set(match.id, thread);
      }

      match.statusThreadId = thread.id;
      thread.linkedMatchId = match.id;
      if (!Array.isArray(thread.replies)) thread.replies = [];
      if (!thread.author) thread.author = getCurrentPlayerName();
      if (!thread.createdAt) thread.createdAt = Number(match.createdAt) || Date.now();
      if (!String(thread.text || "").trim() && commentText) thread.text = commentText;
    });
  }

  function getAllKnownPlayerNames() {
    const names = new Set();
    if (profile.name) names.add(profile.name);
    Object.keys(players || {}).forEach(name => names.add(name));
    matches.forEach(match => (match.players || []).forEach(name => names.add(name)));
    statuses.forEach(status => {
      if (status.author) names.add(status.author);
      (status.replies || []).forEach(reply => {
        if (reply.author) names.add(reply.author);
      });
    });
    return Array.from(names).filter(Boolean);
  }

  let activeAddPlayersMatchId = null;
  let activeAddPlayerName = "";

  function renderAll() {
    syncProfileDirectory();
    syncMatchBranding();
    ensureMatchOwnershipAndTimestamps();
    syncMatchHcpRanges();
    ensureMatchThreads();
    syncStatusAvatars();
    UI.renderMatches(matches, statuses, getCurrentPlayerName(), "matchList");
    UI.renderFields(fields);
    UI.fillProfile(profile);
    bindMatchCards();
    bindFieldCards();
    bindFieldSlotsButtons();
    bindFieldScorecardButtons();
    bindMatchActionButtons();
    bindMatchManageButtons();
    bindPlayerChips();
    bindStatusReplyForms();
    bindProposalReplyForms();
    bindStatusFocusButtons();
    bindStatusToMatchButtons();
    bindThreadToggleButtons();
    updateFloatingAction();
  }

  function switchView(viewId) {
    document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");
    document.querySelectorAll("[data-view]").forEach(btn => {
      btn.classList.toggle("is-active", btn.dataset.view === viewId);
    });
    updateFloatingAction(viewId);
  }

  function getActiveViewId() {
    return document.querySelector(".view.active")?.id || "matches";
  }

  function updateFloatingAction(viewId = getActiveViewId()) {
    const matchFab = document.getElementById("openCreateMatch");
    const statusFab = document.getElementById("openCreateStatus");
    if (!matchFab || !statusFab) return;

    if (document.body.classList.contains("modal-open")) {
      matchFab.classList.add("is-hidden");
      statusFab.classList.add("is-hidden");
      return;
    }

    if (viewId === "matches") {
      matchFab.classList.remove("is-hidden");
      statusFab.classList.remove("is-hidden");
      return;
    }

    matchFab.classList.add("is-hidden");
    statusFab.classList.add("is-hidden");
  }

  function openModal(id) {
    document.getElementById(id).classList.remove("hidden");
    document.body.classList.add("modal-open");
    document.body.classList.toggle("match-create-open", id === "matchModal");
    updateFloatingAction();
  }

  function closeModals() {
    document.querySelectorAll(".modal").forEach(modal => modal.classList.add("hidden"));
    document.body.classList.remove("modal-open");
    document.body.classList.remove("match-create-open");
    const matchForm = document.getElementById("createMatchForm");
    if (matchForm) matchForm.dataset.linkedStatusId = "";
    activeAddPlayersMatchId = null;
    activeAddPlayerName = "";
    const addPlayersSearchInput = document.getElementById("addPlayersSearchInput");
    if (addPlayersSearchInput) addPlayersSearchInput.value = "";
    const addPlayerSelected = document.getElementById("addPlayerSelected");
    if (addPlayerSelected) addPlayerSelected.value = "";
    updateFloatingAction();
  }

  function getFieldById(fieldId) {
    return fields.find(field => field.id === fieldId);
  }

  function getStatusById(statusId) {
    return statuses.find(status => status.id === statusId);
  }

  function openMatchModal(linkedStatusId = null) {
    const matchForm = document.getElementById("createMatchForm");
    if (!matchForm) return;
    matchForm.dataset.linkedStatusId = linkedStatusId ? String(linkedStatusId) : "";
    openModal("matchModal");
  }

  function openAddPlayersModal(matchId) {
    const match = matches.find(item => item.id === matchId);
    if (!match) return;

    activeAddPlayersMatchId = matchId;
    activeAddPlayerName = "";

    const availablePlayers = getAllKnownPlayerNames()
      .filter(name => !match.players.includes(name))
      .sort((a, b) => a.localeCompare(b, "es"));
    const selectedInput = document.getElementById("addPlayerSelected");
    if (selectedInput) selectedInput.value = "";
    const searchInput = document.getElementById("addPlayersSearchInput");
    if (searchInput) searchInput.value = "";

    if (!availablePlayers.length) {
      const list = document.getElementById("addPlayersList");
      if (list) list.innerHTML = '<li class="players-directory-empty">No hay perfiles disponibles.</li>';
      const submitBtn = document.querySelector('#addPlayersForm button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      openModal("addPlayersModal");
      return;
    }

    renderAddPlayersList();
    openModal("addPlayersModal");
  }

  function getPlayerInfo(name) {
    if (!name) return null;
    if (profile.name && name === profile.name) {
      return {
        name: profile.name,
        zone: profile.zone || "Zona no especificada",
        handicap: profile.handicap || "-",
        licenseNumber: profile.licenseNumber || "",
        favCourse: profile.favCourse || "Sin campo favorito",
        photo: profile.photo || defaultAvatar,
        bio: players[name]?.bio || "Jugador activo en Golf Match."
      };
    }

    const found = players[name];
    if (found) return found;

    return {
      name,
      zone: "Zona no disponible",
      handicap: "-",
      licenseNumber: "",
      favCourse: "Sin campo favorito",
      photo: defaultAvatar,
      bio: "Jugador sin ficha completa en este momento."
    };
  }

  function getDirectoryPlayers(searchTerm = "") {
    const query = String(searchTerm || "").trim().toLowerCase();
    return getAllKnownPlayerNames()
      .filter(name => name && name !== getCurrentPlayerName())
      .map(name => getPlayerInfo(name))
      .filter(Boolean)
      .filter(player => !query || player.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  function renderPlayersDirectory(searchTerm = "") {
    const list = document.getElementById("playersDirectoryList");
    if (!list) return;
    const directoryPlayers = getDirectoryPlayers(searchTerm);

    if (!directoryPlayers.length) {
      list.innerHTML = '<li class="players-directory-empty">No hay jugadores con ese nombre.</li>';
      return;
    }

    list.innerHTML = directoryPlayers.map(player => `
      <li>
        <button type="button" class="players-directory-item" data-player-name="${escapeHtml(player.name)}">
          <img src="${player.photo || defaultAvatar}" alt="Foto de ${escapeHtml(player.name)}" loading="lazy" />
          <span>${escapeHtml(player.name)}</span>
        </button>
      </li>
    `).join("");
  }

  function renderAddPlayersList(searchTerm = "") {
    const list = document.getElementById("addPlayersList");
    const submitBtn = document.querySelector('#addPlayersForm button[type="submit"]');
    const selectedInput = document.getElementById("addPlayerSelected");
    const match = matches.find(item => item.id === activeAddPlayersMatchId);
    if (!list || !match) return;

    const query = String(searchTerm || "").trim().toLowerCase();
    const available = getAllKnownPlayerNames()
      .filter(name => !match.players.includes(name))
      .map(name => getPlayerInfo(name))
      .filter(Boolean)
      .filter(player => !query || player.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));

    if (!available.some(player => player.name === activeAddPlayerName)) {
      activeAddPlayerName = "";
      if (selectedInput) selectedInput.value = "";
    }

    if (!available.length) {
      list.innerHTML = '<li class="players-directory-empty">No hay jugadores con ese nombre.</li>';
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    list.innerHTML = available.map(player => {
      const isSelected = player.name === activeAddPlayerName;
      return `
        <li>
          <button
            type="button"
            class="players-directory-item add-players-item${isSelected ? " is-selected" : ""}"
            data-player-name="${escapeHtml(player.name)}"
            aria-pressed="${isSelected ? "true" : "false"}"
          >
            <img src="${player.photo || defaultAvatar}" alt="Foto de ${escapeHtml(player.name)}" loading="lazy" />
            <span>${escapeHtml(player.name)}</span>
          </button>
        </li>
      `;
    }).join("");
    if (submitBtn) submitBtn.disabled = !activeAddPlayerName;
  }

  function openPlayerModal(playerName) {
    const player = getPlayerInfo(playerName);
    if (!player) return;

    document.getElementById("playerModalName").textContent = player.name;
    document.getElementById("playerModalPhoto").src = player.photo || defaultAvatar;
    document.getElementById("playerModalZone").textContent = player.zone || "Zona no especificada";
    document.getElementById("playerModalHcp").textContent = player.handicap || "-";
    const hasLicense = Boolean(String(player.licenseNumber || "").trim());
    document.getElementById("playerModalCourseLabel").textContent = hasLicense ? "Licencia" : "Campo favorito";
    document.getElementById("playerModalCourse").textContent = hasLicense
      ? player.licenseNumber
      : player.favCourse || "Sin campo favorito";
    document.getElementById("playerModalBio").textContent = player.bio || "Sin descripcion.";
    openModal("playerModal");
  }

  function openFieldInfo(fieldId) {
    const field = getFieldById(fieldId);
    if (!field) return;

    const heroMarkup = field.image
      ? `
      <div class="course-hero">
        <img src="${field.image}" alt="${field.name}" loading="lazy" />
      </div>
      `
      : "";

    document.getElementById("fieldInfoTitle").textContent = field.name;
    document.getElementById("fieldInfoBody").innerHTML = `
      ${heroMarkup}
      <div class="course-info-grid course-info-grid-compact">
        <div class="course-info-item"><span>Municipio</span><strong>${field.zone}</strong></div>
        <div class="course-info-item"><span>Hoyos</span><strong>${field.holes}</strong></div>
        <div class="course-info-item"><span>Par</span><strong>${field.par}</strong></div>
      </div>
      <p>${field.description}</p>
      <div class="course-services">
        ${field.services.map(service => `<span>${service}</span>`).join("")}
      </div>
      <p class="course-contact">Contacto: ${field.phone}</p>
    `;

    document.getElementById("openSlotsFromInfo").dataset.fieldSlotsId = field.id;
    document.getElementById("openScorecardFromInfo").dataset.fieldScorecardId = field.id;
    openModal("fieldInfoModal");
  }

  function openFieldSlots(fieldId) {
    const field = getFieldById(fieldId);
    if (!field) return;

    const teeoneUrl = field.teeoneUrl || "https://open.teeone.golf/es/amarilla/disponibilidad";
    const newWindow = window.open(teeoneUrl, "_blank", "noopener,noreferrer");
    if (!newWindow) window.location.href = teeoneUrl;
  }

  function openFieldScorecard(fieldId) {
    const field = getFieldById(fieldId);
    if (!field) return;

    const scorecard = field.scorecard || {};
    const type = scorecard.type || "";
    const holes = Array.isArray(scorecard.holes) ? scorecard.holes : [];
    const note = scorecard.note || "Datos orientativos del recorrido principal.";

    document.getElementById("fieldScorecardTitle").textContent = `Scorecard · ${field.name}`;

    if (type === "table" && holes.length >= 9) {
      const sumBy = (arr, key) => arr.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
      const unit = scorecard.unit || "m";
      const teeLabels = {
        w: scorecard.teeLabels?.w || "Blanco",
        y: scorecard.teeLabels?.y || "Amarillo",
        b: scorecard.teeLabels?.b || "Azul"
      };
      const renderRows = rows => rows.map(row => `
        <tr>
          <td>${row.hole}</td>
          <td class="tee-w">${row.w}</td>
          <td class="tee-y">${row.y}</td>
          <td class="tee-b">${row.b}</td>
          <td>${row.par}</td>
          <td>${row.si}</td>
        </tr>
      `).join("");

      let bodyRows = "";
      if (holes.length >= 18) {
        const front9 = holes.slice(0, 9);
        const back9 = holes.slice(9, 18);
        const out = {
          w: sumBy(front9, "w"),
          y: sumBy(front9, "y"),
          b: sumBy(front9, "b"),
          par: sumBy(front9, "par")
        };
        const inScore = {
          w: sumBy(back9, "w"),
          y: sumBy(back9, "y"),
          b: sumBy(back9, "b"),
          par: sumBy(back9, "par")
        };
        const total = {
          w: out.w + inScore.w,
          y: out.y + inScore.y,
          b: out.b + inScore.b,
          par: out.par + inScore.par
        };

        bodyRows = `
          ${renderRows(front9)}
          <tr class="summary-row">
            <td>Out</td>
            <td class="tee-w">${out.w}</td>
            <td class="tee-y">${out.y}</td>
            <td class="tee-b">${out.b}</td>
            <td>${out.par}</td>
            <td>-</td>
          </tr>
          ${renderRows(back9)}
          <tr class="summary-row">
            <td>In</td>
            <td class="tee-w">${inScore.w}</td>
            <td class="tee-y">${inScore.y}</td>
            <td class="tee-b">${inScore.b}</td>
            <td>${inScore.par}</td>
            <td>-</td>
          </tr>
          <tr class="summary-row total-row">
            <td>Total</td>
            <td class="tee-w">${total.w}</td>
            <td class="tee-y">${total.y}</td>
            <td class="tee-b">${total.b}</td>
            <td>${total.par}</td>
            <td>-</td>
          </tr>
        `;
      } else {
        const total = {
          w: sumBy(holes, "w"),
          y: sumBy(holes, "y"),
          b: sumBy(holes, "b"),
          par: sumBy(holes, "par")
        };

        bodyRows = `
          ${renderRows(holes)}
          <tr class="summary-row total-row">
            <td>Total</td>
            <td class="tee-w">${total.w}</td>
            <td class="tee-y">${total.y}</td>
            <td class="tee-b">${total.b}</td>
            <td>${total.par}</td>
            <td>-</td>
          </tr>
        `;
      }

      document.getElementById("fieldScorecardBody").innerHTML = `
        <div class="scorecard-sheet">
          <table class="scorecard-table scorecard-table-full" aria-label="Scorecard oficial">
            <thead>
              <tr>
                <th>Hoyo</th>
                <th class="tee-w">${teeLabels.w} (${unit})</th>
                <th class="tee-y">${teeLabels.y} (${unit})</th>
                <th class="tee-b">${teeLabels.b} (${unit})</th>
                <th>Par</th>
                <th>S.I</th>
              </tr>
            </thead>
            <tbody>
              ${bodyRows}
            </tbody>
          </table>
          <p class="scorecard-note">${note}${scorecard.sourceUrl ? ` · <a href="${scorecard.sourceUrl}" target="_blank" rel="noopener noreferrer">Ver fuente oficial</a>` : ""}</p>
        </div>
      `;
    } else if (type === "images" && Array.isArray(scorecard.images) && scorecard.images.length) {
      const imagesMarkup = scorecard.images.map((url, index) => (
        `<img src="${url}" alt="Scorecard oficial ${field.name} ${index + 1}" loading="lazy" />`
      )).join("");
      document.getElementById("fieldScorecardBody").innerHTML = `
        <div class="scorecard-images">
          ${imagesMarkup}
        </div>
        <p class="scorecard-note">${note}${scorecard.sourceUrl ? ` · <a href="${scorecard.sourceUrl}" target="_blank" rel="noopener noreferrer">Abrir PDF oficial</a>` : ""}</p>
      `;
    } else if (type === "pdf" && scorecard.pdfUrl) {
      document.getElementById("fieldScorecardBody").innerHTML = `
        <div class="scorecard-external">
          <p>Scorecard oficial disponible en PDF del campo.</p>
          <a class="scorecard-link-btn" href="${scorecard.pdfUrl}" target="_blank" rel="noopener noreferrer">Abrir PDF oficial</a>
        </div>
        <p class="scorecard-note">${note}</p>
      `;
    } else if (type === "external" && scorecard.sourceUrl) {
      document.getElementById("fieldScorecardBody").innerHTML = `
        <div class="scorecard-external">
          <p>El scorecard oficial se consulta en la web del campo.</p>
          <a class="scorecard-link-btn" href="${scorecard.sourceUrl}" target="_blank" rel="noopener noreferrer">Ver fuente oficial</a>
        </div>
        <p class="scorecard-note">${note}</p>
      `;
    } else {
      const totalValue = Number(field.par) || 72;

      document.getElementById("fieldScorecardBody").innerHTML = `
        <div class="scorecard-grid">
          <div class="scorecard-item"><span>Hoyos</span><strong>${field.holes}</strong></div>
          <div class="scorecard-item"><span>Par total</span><strong>${totalValue}</strong></div>
        </div>
        <p class="scorecard-note">${note}</p>
      `;
    }

    openModal("fieldScorecardModal");
  }

  function closeAllProposalReplyForms(exceptStatusId = null) {
    document.querySelectorAll("[data-proposal-thread-id]").forEach(panel => {
      const panelId = Number(panel.dataset.proposalThreadId);
      if (exceptStatusId && panelId === exceptStatusId) return;
      panel.classList.remove("is-open");
    });
  }

  function closeAllThreadPanels(exceptThreadId = null) {
    document.querySelectorAll("[data-thread-panel-id]").forEach(panel => {
      const panelId = Number(panel.dataset.threadPanelId);
      if (exceptThreadId && panelId === exceptThreadId) return;
      panel.classList.remove("is-open");
    });

    document.querySelectorAll("[data-thread-toggle-id]").forEach(btn => {
      const buttonId = Number(btn.dataset.threadToggleId);
      const isExpanded = Boolean(exceptThreadId && buttonId === exceptThreadId);
      btn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    });
  }

  function collapseAllMatchCards(exceptMatchId = null) {
    document.querySelectorAll("[data-match-card-id]").forEach(card => {
      const cardMatchId = Number(card.dataset.matchCardId);
      if (exceptMatchId && cardMatchId === exceptMatchId) return;
      card.classList.remove("is-expanded");
      card.classList.add("is-collapsed");
      card.setAttribute("aria-expanded", "false");
    });
  }

  function bindMatchCards() {
    document.querySelectorAll("[data-match-card-id]").forEach(card => {
      const cardMatchId = Number(card.dataset.matchCardId);
      const toggle = () => {
        const currentlyExpanded = card.classList.contains("is-expanded");
        if (currentlyExpanded) {
          card.classList.remove("is-expanded");
          card.classList.add("is-collapsed");
          card.setAttribute("aria-expanded", "false");
          closeAllThreadPanels();
          return;
        }

        closeAllProposalReplyForms();
        collapseAllMatchCards(cardMatchId);
        closeAllThreadPanels();
        card.classList.add("is-expanded");
        card.classList.remove("is-collapsed");
        card.setAttribute("aria-expanded", "true");
      };

      card.onclick = e => {
        if (
          e.target.closest("[data-match-action-id]") ||
          e.target.closest("[data-match-delete-id]") ||
          e.target.closest("[data-match-leave-id]") ||
          e.target.closest("[data-player-name]") ||
          e.target.closest(".player-chip") ||
          e.target.closest(".join-btn") ||
          e.target.closest("[data-thread-toggle-id]") ||
          e.target.closest("[data-status-reply-form]")
        ) return;
        toggle();
      };

      card.onkeydown = e => {
        if (e.key !== "Enter" && e.key !== " ") return;
        if (
          e.target.closest("[data-match-action-id]") ||
          e.target.closest("[data-match-delete-id]") ||
          e.target.closest("[data-match-leave-id]") ||
          e.target.closest("[data-player-name]") ||
          e.target.closest(".player-chip") ||
          e.target.closest(".join-btn") ||
          e.target.closest("[data-thread-toggle-id]") ||
          e.target.closest("[data-status-reply-form]")
        ) return;
        e.preventDefault();
        toggle();
      };
    });
  }

  function bindFieldCards() {
    document.querySelectorAll("[data-field-id]").forEach(card => {
      card.onclick = e => {
        if (e.target.closest("[data-field-slots-id]")) return;
        if (e.target.closest("[data-field-scorecard-id]")) return;
        openFieldInfo(Number(card.dataset.fieldId));
      };

      card.onkeydown = e => {
        if (e.key !== "Enter" && e.key !== " ") return;
        if (e.target.closest("[data-field-slots-id]")) return;
        if (e.target.closest("[data-field-scorecard-id]")) return;
        e.preventDefault();
        openFieldInfo(Number(card.dataset.fieldId));
      };
    });
  }

  function bindFieldSlotsButtons() {
    document.querySelectorAll("[data-field-slots-id]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        openFieldSlots(Number(btn.dataset.fieldSlotsId));
      };
    });
  }

  function bindFieldScorecardButtons() {
    document.querySelectorAll("[data-field-scorecard-id]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        openFieldScorecard(Number(btn.dataset.fieldScorecardId));
      };
    });
  }

  function bindMatchActionButtons() {
    document.querySelectorAll("[data-match-action-id]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const matchId = Number(btn.dataset.matchActionId);
        const actionType = btn.dataset.matchActionType || "join";
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        if (actionType === "add") {
          if (match.players.length >= match.maxPlayers) return;
          openAddPlayersModal(matchId);
          return;
        }

        if (match.players.length >= match.maxPlayers) return;

        const playerName = getCurrentPlayerName();
        if (!match.players.includes(playerName)) {
          match.players.push(playerName);
          if (match.players.length === match.maxPlayers) match.status = "completo";
          renderAll();
        }
      };
    });
  }

  function bindMatchManageButtons() {
    const removeMatchCompletely = matchId => {
      const matchIndex = matches.findIndex(match => match.id === matchId);
      if (matchIndex < 0) return;

      const match = matches[matchIndex];
      const linkedStatus = statuses.find(status =>
        Number(status.linkedMatchId || 0) === matchId ||
        Number(status.id || 0) === Number(match.statusThreadId || 0)
      );
      if (linkedStatus) {
        const statusIndex = statuses.findIndex(status => status.id === linkedStatus.id);
        if (statusIndex >= 0) statuses.splice(statusIndex, 1);
      }

      matches.splice(matchIndex, 1);
    };

    document.querySelectorAll("[data-match-delete-id]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const matchId = Number(btn.dataset.matchDeleteId);
        const shouldDelete = window.confirm("¿Seguro que quieres borrar este partido? Esta acción elimina la tarjeta y su conversación.");
        if (!shouldDelete) return;
        removeMatchCompletely(matchId);
        renderAll();
      };
    });

    document.querySelectorAll("[data-match-leave-id]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const matchId = Number(btn.dataset.matchLeaveId);
        const match = matches.find(item => item.id === matchId);
        if (!match) return;

        const playerName = getCurrentPlayerName();
        const playerIndex = match.players.findIndex(name => name === playerName);
        if (playerIndex < 0) return;

        if (match.players.length <= 1) {
          const confirmLastPlayerLeave = window.confirm("Eres el único jugador. Si sales, el partido se borrará. ¿Continuar?");
          if (!confirmLastPlayerLeave) return;
          removeMatchCompletely(matchId);
          renderAll();
          return;
        }

        const isCreator = String(match.createdBy || "").trim() === playerName;
        const leaveMessage = isCreator
          ? "Vas a abandonar este partido como creador. El partido seguirá activo con otro creador. ¿Continuar?"
          : "¿Seguro que quieres salir de este partido?";
        const shouldLeave = window.confirm(leaveMessage);
        if (!shouldLeave) return;

        match.players.splice(playerIndex, 1);
        if (isCreator) {
          match.createdBy = match.players[0] || "";
        }
        if (match.players.length < match.maxPlayers) match.status = "abierto";
        renderAll();
      };
    });
  }

  function bindPlayerChips() {
    document.querySelectorAll("[data-player-name]").forEach(chip => {
      chip.onclick = e => {
        e.stopPropagation();
        openPlayerModal(chip.dataset.playerName);
      };
    });
  }

  function bindStatusReplyForms() {
    document.querySelectorAll("[data-status-reply-form]").forEach(form => {
      form.onsubmit = e => {
        e.preventDefault();
        const statusId = Number(form.dataset.statusReplyForm);
        const input = form.querySelector("[data-status-reply-input]");
        const text = String(input?.value || "").trim();
        if (!text) return;

        const status = statuses.find(item => item.id === statusId);
        if (!status) return;

        if (!Array.isArray(status.replies)) status.replies = [];
        status.replies.push({
          id: Date.now(),
          author: getCurrentPlayerName(),
          text
        });
        renderAll();
      };
    });
  }

  function bindProposalReplyForms() {
    document.querySelectorAll("[data-proposal-reply-form]").forEach(form => {
      const statusId = Number(form.dataset.proposalReplyForm);
      const panel = document.querySelector(`[data-proposal-thread-id="${statusId}"]`);

      form.addEventListener("focusout", () => {
        window.setTimeout(() => {
          if (!form.contains(document.activeElement)) {
            if (panel) panel.classList.remove("is-open");
          }
        }, 0);
      });
    });
  }

  function bindStatusFocusButtons() {
    document.querySelectorAll("[data-status-focus-id]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const statusId = Number(btn.dataset.statusFocusId);
        closeAllProposalReplyForms(statusId);
        collapseAllMatchCards();
        closeAllThreadPanels();
        const proposalPanel = document.querySelector(`[data-proposal-thread-id="${statusId}"]`);
        if (proposalPanel) proposalPanel.classList.add("is-open");
        const input = proposalPanel
          ? proposalPanel.querySelector(`[data-status-reply-input="${statusId}"]`)
          : document.querySelector(`[data-status-reply-input="${statusId}"]`);
        if (input) input.focus();
      };
    });
  }

  function bindStatusToMatchButtons() {
    document.querySelectorAll("[data-status-to-match-id]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const statusId = Number(btn.dataset.statusToMatchId);
        if (!getStatusById(statusId)) return;
        openMatchModal(statusId);
      };
    });
  }

  function bindThreadToggleButtons() {
    document.querySelectorAll("[data-thread-toggle-id]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const threadId = Number(btn.dataset.threadToggleId);
        const matchId = Number(btn.dataset.threadMatchId);
        const card = document.querySelector(`[data-match-card-id="${matchId}"]`);
        const panel = card?.querySelector(`[data-thread-panel-id="${threadId}"]`);
        if (!card || !panel) return;

        closeAllProposalReplyForms();
        collapseAllMatchCards(matchId);
        const willOpen = !panel.classList.contains("is-open");
        closeAllThreadPanels(willOpen ? threadId : null);
        card.classList.add("is-expanded");
        card.classList.remove("is-collapsed");
        card.setAttribute("aria-expanded", "true");

        panel.classList.toggle("is-open", willOpen);
        btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
      };
    });
  }

  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  document.getElementById("openCreateMatch").addEventListener("click", () => {
    openMatchModal();
  });
  document.getElementById("openCreateStatus").addEventListener("click", () => {
    openModal("statusModal");
  });
  document.getElementById("openProfileEditor").addEventListener("click", () => {
    openModal("profileEditModal");
  });
  document.getElementById("openPlayersDirectory").addEventListener("click", () => {
    const searchInput = document.getElementById("playersSearchInput");
    if (searchInput) searchInput.value = "";
    renderPlayersDirectory();
    openModal("playersDirectoryModal");
  });
  document.getElementById("playersSearchInput").addEventListener("input", e => {
    renderPlayersDirectory(e.currentTarget.value);
  });
  document.getElementById("playersDirectoryList").addEventListener("click", e => {
    const row = e.target.closest(".players-directory-item");
    if (!row) return;
    const playerName = row.dataset.playerName;
    if (!playerName) return;
    closeModals();
    openPlayerModal(playerName);
  });
  document.getElementById("addPlayersSearchInput").addEventListener("input", e => {
    renderAddPlayersList(e.currentTarget.value);
  });
  document.getElementById("addPlayersList").addEventListener("click", e => {
    const row = e.target.closest(".add-players-item");
    if (!row) return;
    const playerName = String(row.dataset.playerName || "").trim();
    if (!playerName) return;
    activeAddPlayerName = playerName;
    const selectedInput = document.getElementById("addPlayerSelected");
    if (selectedInput) selectedInput.value = playerName;
    renderAddPlayersList(document.getElementById("addPlayersSearchInput")?.value || "");
  });
  document.getElementById("openSlotsFromInfo").addEventListener("click", e => {
    const fieldId = Number(e.currentTarget.dataset.fieldSlotsId);
    if (!fieldId) return;
    closeModals();
    openFieldSlots(fieldId);
  });
  document.getElementById("openScorecardFromInfo").addEventListener("click", e => {
    const fieldId = Number(e.currentTarget.dataset.fieldScorecardId);
    if (!fieldId) return;
    closeModals();
    openFieldScorecard(fieldId);
  });
  document.querySelectorAll(".closeModal").forEach(btn => btn.addEventListener("click", closeModals));
  document.getElementById("profilePhotoInput").addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result) return;
      profile.photo = result;
      document.getElementById("profileAvatarPreview").src = result;
      syncProfileDirectory();
      renderAll();
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("createMatchForm").addEventListener("submit", e => {
    e.preventDefault();
    const linkedStatusId = Number(e.currentTarget.dataset.linkedStatusId || 0);
    const fieldId = Number(document.getElementById("matchCourse").value);
    const selectedField = getFieldById(fieldId);
    if (!selectedField) return;
    const commentText = String(document.getElementById("matchComment").value || "").trim();

    const matchId = Date.now();
    const newMatch = {
      id: matchId,
      fieldId: selectedField.id,
      course: selectedField.name,
      date: document.getElementById("matchDate").value,
      time: document.getElementById("matchTime").value,
      comment: commentText,
      logo: selectedField.logo,
      players: [getCurrentPlayerName()],
      maxPlayers: 4,
      status: "abierto",
      statusThreadId: linkedStatusId || null,
      createdBy: getCurrentPlayerName(),
      createdAt: Date.now()
    };

    if (linkedStatusId) {
      const linkedStatus = getStatusById(linkedStatusId);
      if (linkedStatus) linkedStatus.linkedMatchId = matchId;
    }

    matches.push(newMatch);
    e.target.reset();
    closeModals();
    renderAll();
    switchView("matches");
  });

  document.getElementById("createStatusForm").addEventListener("submit", e => {
    e.preventDefault();
    const createdAt = Date.now();
    const statusText = String(document.getElementById("statusText").value || "").trim();
    if (!statusText) return;
    statuses.push({
      id: createdAt,
      author: getCurrentPlayerName(),
      text: statusText,
      replies: [],
      createdAt
    });
    e.target.reset();
    closeModals();
    renderAll();
    switchView("matches");
  });

  document.getElementById("addPlayersForm").addEventListener("submit", e => {
    e.preventDefault();
    if (!activeAddPlayersMatchId) return;
    const match = matches.find(item => item.id === activeAddPlayersMatchId);
    if (!match) return;

    const selectedPlayer = String(activeAddPlayerName || document.getElementById("addPlayerSelected").value || "").trim();
    if (!selectedPlayer) return;
    if (match.players.includes(selectedPlayer)) return;
    if (match.players.length >= match.maxPlayers) return;

    match.players.push(selectedPlayer);
    if (match.players.length === match.maxPlayers) match.status = "completo";
    closeModals();
    renderAll();
    switchView("matches");
  });

  document.getElementById("profileForm").addEventListener("submit", e => {
    e.preventDefault();
    const previousName = profile.name;
    const nextName = document.getElementById("profileName").value;
    profile.name = nextName;
    profile.zone = document.getElementById("profileZone").value;
    profile.handicap = document.getElementById("profileHandicap").value;
    profile.licenseNumber = document.getElementById("profileLicense").value;
    if (!profile.photo) profile.photo = defaultAvatar;
    if (previousName && previousName !== nextName) {
      matches.forEach(match => {
        match.players = (match.players || []).map(playerName => (playerName === previousName ? nextName : playerName));
        if (match.createdBy === previousName) match.createdBy = nextName;
      });
      statuses.forEach(status => {
        if (status.author === previousName) status.author = nextName;
        status.replies = (status.replies || []).map(reply => ({
          ...reply,
          author: reply.author === previousName ? nextName : reply.author
        }));
      });
    }
    if (previousName && previousName !== nextName && players[previousName]) {
      delete players[previousName];
    }
    syncProfileDirectory();
    closeModals();
    renderAll();
  });

  populateMatchCourseSelect();
  registerServiceWorker();
  renderAll();
  switchView("matches");
  dismissBootSplash(220);
  window.addEventListener("load", () => dismissBootSplash(0), { once: true });
});

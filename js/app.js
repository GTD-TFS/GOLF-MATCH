document.addEventListener("DOMContentLoaded", () => {
  const { profile, matches, statuses, fields, players } = window.Store;
  const defaultAvatar = "https://i.pravatar.cc/300?img=12";

  if (!profile.photo) profile.photo = defaultAvatar;

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  function syncProfileDirectory() {
    if (!profile.name) return;
    players[profile.name] = {
      name: profile.name,
      zone: profile.zone || "Zona no especificada",
      handicap: profile.handicap || "-",
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

  function renderAll() {
    syncProfileDirectory();
    syncMatchBranding();
    UI.renderMatches(matches, "matchList");
    UI.renderFields(fields);
    UI.renderStatuses(statuses);
    UI.fillProfile(profile);
    bindMatchCards();
    bindFieldCards();
    bindFieldSlotsButtons();
    bindFieldScorecardButtons();
    bindJoinButtons();
    bindPlayerChips();
    bindStatusReplyForms();
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
    const fab = document.getElementById("openCreateMatch");
    if (!fab) return;

    if (document.body.classList.contains("modal-open")) {
      fab.classList.add("is-hidden");
      return;
    }

    if (viewId === "matches") {
      fab.textContent = "Crear partido";
      fab.dataset.action = "match";
      fab.classList.remove("is-hidden");
      return;
    }

    if (viewId === "availability") {
      fab.textContent = "Publicar estado";
      fab.dataset.action = "status";
      fab.classList.remove("is-hidden");
      return;
    }

    fab.classList.add("is-hidden");
  }

  function openModal(id) {
    document.getElementById(id).classList.remove("hidden");
    document.body.classList.add("modal-open");
    updateFloatingAction();
  }

  function closeModals() {
    document.querySelectorAll(".modal").forEach(modal => modal.classList.add("hidden"));
    document.body.classList.remove("modal-open");
    updateFloatingAction();
  }

  function getFieldById(fieldId) {
    return fields.find(field => field.id === fieldId);
  }

  function getPlayerInfo(name) {
    if (!name) return null;
    if (profile.name && name === profile.name) {
      return {
        name: profile.name,
        zone: profile.zone || "Zona no especificada",
        handicap: profile.handicap || "-",
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
      favCourse: "Sin campo favorito",
      photo: defaultAvatar,
      bio: "Jugador sin ficha completa en este momento."
    };
  }

  function openPlayerModal(playerName) {
    const player = getPlayerInfo(playerName);
    if (!player) return;

    document.getElementById("playerModalName").textContent = player.name;
    document.getElementById("playerModalPhoto").src = player.photo || defaultAvatar;
    document.getElementById("playerModalZone").textContent = player.zone || "Zona no especificada";
    document.getElementById("playerModalHcp").textContent = player.handicap || "-";
    document.getElementById("playerModalCourse").textContent = player.favCourse || "Sin campo favorito";
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

    if (type === "table" && holes.length >= 18) {
      const front9 = holes.slice(0, 9);
      const back9 = holes.slice(9, 18);
      const sumBy = (arr, key) => arr.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
      const unit = scorecard.unit || "m";
      const teeLabels = {
        w: scorecard.teeLabels?.w || "Blanco",
        y: scorecard.teeLabels?.y || "Amarillo",
        b: scorecard.teeLabels?.b || "Azul"
      };

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

  function bindMatchCards() {
    document.querySelectorAll("[data-match-card-id]").forEach(card => {
      const toggle = () => {
        const isExpanded = card.classList.toggle("is-expanded");
        card.classList.toggle("is-collapsed", !isExpanded);
        card.setAttribute("aria-expanded", isExpanded ? "true" : "false");
      };

      card.onclick = e => {
        if (e.target.closest("[data-join-id], [data-player-name], .player-chip, .join-btn")) return;
        toggle();
      };

      card.onkeydown = e => {
        if (e.key !== "Enter" && e.key !== " ") return;
        if (e.target.closest("[data-join-id], [data-player-name], .player-chip, .join-btn")) return;
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

  function bindJoinButtons() {
    document.querySelectorAll("[data-join-id]").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const matchId = Number(btn.dataset.joinId);
        const match = matches.find(m => m.id === matchId);
        if (!match || match.players.length >= match.maxPlayers) return;

        const playerName = profile.name || "Usuario";
        if (!match.players.includes(playerName)) {
          match.players.push(playerName);
          if (match.players.length === match.maxPlayers) match.status = "completo";
          renderAll();
        }
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
          author: profile.name || "Usuario",
          text
        });
        renderAll();
      };
    });
  }

  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  document.getElementById("openCreateMatch").addEventListener("click", () => {
    const action = document.getElementById("openCreateMatch").dataset.action || "match";
    openModal(action === "status" ? "statusModal" : "matchModal");
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
    const fieldId = Number(document.getElementById("matchCourse").value);
    const selectedField = getFieldById(fieldId);
    if (!selectedField) return;

    matches.unshift({
      id: Date.now(),
      fieldId: selectedField.id,
      course: selectedField.name,
      date: document.getElementById("matchDate").value,
      time: document.getElementById("matchTime").value,
      level: document.getElementById("matchLevel").value,
      comment: document.getElementById("matchComment").value,
      logo: selectedField.logo,
      players: [profile.name || "Usuario"],
      maxPlayers: 4,
      status: "abierto"
    });
    e.target.reset();
    closeModals();
    renderAll();
    switchView("matches");
  });

  document.getElementById("createStatusForm").addEventListener("submit", e => {
    e.preventDefault();
    statuses.unshift({
      id: Date.now(),
      author: profile.name || "Usuario",
      text: document.getElementById("statusText").value,
      replies: []
    });
    e.target.reset();
    closeModals();
    renderAll();
    switchView("availability");
  });

  document.getElementById("profileForm").addEventListener("submit", e => {
    e.preventDefault();
    profile.name = document.getElementById("profileName").value;
    profile.zone = document.getElementById("profileZone").value;
    profile.handicap = document.getElementById("profileHandicap").value;
    profile.favCourse = document.getElementById("profileFavCourse").value;
    if (!profile.photo) profile.photo = defaultAvatar;
    syncProfileDirectory();
    renderAll();
  });

  populateMatchCourseSelect();
  registerServiceWorker();
  renderAll();
  switchView("matches");
});

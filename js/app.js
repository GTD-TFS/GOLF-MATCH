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

  function syncMatchImages() {
    const fieldsById = new Map(fields.map(field => [field.id, field]));
    const fieldsByName = new Map(
      fields.map(field => [field.name.toLowerCase(), field])
    );

    matches.forEach(match => {
      if (match.image) return;
      const field =
        fieldsById.get(match.fieldId) ||
        fieldsByName.get((match.course || "").toLowerCase());
      if (field) match.image = field.image;
    });
  }

  function renderAll() {
    syncProfileDirectory();
    syncMatchImages();
    UI.renderMatches(matches, "matchList");
    UI.renderFields(fields);
    UI.renderStatuses(statuses);
    UI.fillProfile(profile);
    bindFieldCards();
    bindFieldSlotsButtons();
    bindJoinButtons();
    bindPlayerChips();
  }

  function switchView(viewId) {
    document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");
    document.querySelectorAll("[data-view]").forEach(btn => {
      btn.classList.toggle("is-active", btn.dataset.view === viewId);
    });
    document.getElementById("openCreateMatch").classList.toggle("is-hidden", viewId !== "matches");
  }

  function openModal(id) {
    document.getElementById(id).classList.remove("hidden");
  }

  function closeModals() {
    document.querySelectorAll(".modal").forEach(modal => modal.classList.add("hidden"));
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

    document.getElementById("fieldInfoTitle").textContent = field.name;
    document.getElementById("fieldInfoBody").innerHTML = `
      <div class="course-info-grid">
        <div class="course-info-item"><span>Zona</span><strong>${field.zone}</strong></div>
        <div class="course-info-item"><span>Hoyos</span><strong>${field.holes}</strong></div>
        <div class="course-info-item"><span>Par</span><strong>${field.par}</strong></div>
        <div class="course-info-item"><span>Diseno</span><strong>${field.designer}</strong></div>
      </div>
      <p>${field.description}</p>
      <div class="course-services">
        ${field.services.map(service => `<span>${service}</span>`).join("")}
      </div>
      <p class="course-contact">Contacto: ${field.phone}</p>
    `;

    document.getElementById("openSlotsFromInfo").dataset.fieldSlotsId = field.id;
    openModal("fieldInfoModal");
  }

  function openFieldSlots(fieldId) {
    const field = getFieldById(fieldId);
    if (!field) return;

    document.getElementById("fieldSlotsTitle").textContent = `Horarios vacantes · ${field.name}`;
    document.getElementById("fieldSlotsBody").innerHTML = `
      <ul class="slots-list">
        ${field.vacantSlots.map(slot => `<li>${slot}</li>`).join("")}
      </ul>
    `;
    openModal("fieldSlotsModal");
  }

  function bindFieldCards() {
    document.querySelectorAll("[data-field-id]").forEach(card => {
      card.onclick = e => {
        if (e.target.closest("[data-field-slots-id]")) return;
        openFieldInfo(Number(card.dataset.fieldId));
      };

      card.onkeydown = e => {
        if (e.key !== "Enter" && e.key !== " ") return;
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

  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  document.getElementById("openCreateMatch").addEventListener("click", () => openModal("matchModal"));
  document.getElementById("openCreateStatus").addEventListener("click", () => openModal("statusModal"));
  document.getElementById("openSlotsFromInfo").addEventListener("click", e => {
    const fieldId = Number(e.currentTarget.dataset.fieldSlotsId);
    if (!fieldId) return;
    closeModals();
    openFieldSlots(fieldId);
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
      image: selectedField.image,
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
      text: document.getElementById("statusText").value
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

window.UI = {
  formatDate(dateValue) {
    const [year, month, day] = (dateValue || "").split("-");
    if (!year || !month || !day) return dateValue || "Fecha por confirmar";
    return `${day}/${month}/${year}`;
  },

  renderMatches(matches, targetId) {
    const target = document.getElementById(targetId);
    target.innerHTML = "";

    if (!matches.length) {
      target.innerHTML = '<div class="card">No hay partidos disponibles.</div>';
      return;
    }

    matches.forEach(match => {
      const card = document.createElement("div");
      const players = match.players.length ? match.players : ["Sin jugadores todavía"];
      const matchDate = this.formatDate(match.date);
      const matchCourseName = match.course || "Campo";
      const logoMarkup = match.logo
        ? `<img class="match-logo-img" src="${match.logo}" alt="Logo ${matchCourseName}" loading="lazy" />`
        : `<span class="match-logo-fallback">${matchCourseName.slice(0, 2).toUpperCase()}</span>`;
      const playersMarkup = players
        .map(player => (
          player === "Sin jugadores todavía"
            ? `<li class="player-empty">${player}</li>`
            : `<li><button type="button" class="player-chip" data-player-name="${player}">${player}</button></li>`
        ))
        .join("");

      card.className = "card match-card";
      card.innerHTML = `
        <div class="match-logo" aria-label="Logo del campo">
          ${logoMarkup}
        </div>
        <div class="match-header">
          <h3>${matchCourseName}</h3>
          <div class="match-date">${matchDate} · ${match.time}</div>
        </div>
        <div class="match-meta-grid">
          <div class="match-meta">
            <span class="match-meta-label">HCP</span>
            <strong>${match.level || "Sin especificar"}</strong>
          </div>
          <div class="match-meta">
            <span class="match-meta-label">Plazas</span>
            <strong>${match.players.length}/${match.maxPlayers}</strong>
          </div>
        </div>
        <div class="players-details">
          <strong>Jugadores actuales</strong>
          <ul class="players-list">
            ${playersMarkup}
          </ul>
        </div>
        <p class="match-comment">${match.comment || "Sin comentarios adicionales."}</p>
        <div class="actions">
          <button class="join-btn" data-join-id="${match.id}" ${match.players.length >= match.maxPlayers ? "disabled" : ""}>
            ${match.players.length >= match.maxPlayers ? "Completo" : "Unirme"}
          </button>
        </div>
      `;
      target.appendChild(card);
    });
  },

  renderFields(fields) {
    const target = document.getElementById("fieldList");
    target.innerHTML = "";

    if (!fields.length) {
      target.innerHTML = '<div class="card">No hay campos disponibles.</div>';
      return;
    }

    fields.forEach(field => {
      const card = document.createElement("div");
      card.className = "card field-card";
      card.dataset.fieldId = field.id;
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      if (field.image) {
        card.style.setProperty("--field-image", `url("${field.image}")`);
      }
      card.innerHTML = `
        <div class="field-bg" aria-hidden="true"></div>
        <div class="field-head">
          <h3>${field.name}</h3>
          <span class="field-zone">${field.zone}</span>
        </div>
        <div class="field-meta-grid">
          <div class="field-meta-item">${field.holes} hoyos</div>
          <div class="field-meta-item">Par ${field.par}</div>
        </div>
        <p>${field.description}</p>
        <div class="actions field-actions">
          <button class="field-slots-btn" data-field-slots-id="${field.id}">Consultar horarios vacantes</button>
          <button class="field-scorecard-btn" data-field-scorecard-id="${field.id}">Scorecard</button>
        </div>
      `;
      target.appendChild(card);
    });
  },

  renderStatuses(statuses) {
    const target = document.getElementById("statusList");
    target.innerHTML = "";

    if (!statuses.length) {
      target.innerHTML = '<div class="card">No hay estados publicados.</div>';
      return;
    }

    statuses.forEach(status => {
      const replies = Array.isArray(status.replies) ? status.replies : [];
      const repliesMarkup = replies.length
        ? replies.map(reply => (
          `<li class="status-reply-item"><strong>${reply.author}:</strong> ${reply.text}</li>`
        )).join("")
        : '<li class="status-reply-empty">Sin respuestas todavia.</li>';
      const card = document.createElement("div");
      card.className = "card status-card";
      card.innerHTML = `
        <h3>${status.author}</h3>
        <p>${status.text}</p>
        <div class="status-replies">
          <strong>Respuestas</strong>
          <ul class="status-replies-list">
            ${repliesMarkup}
          </ul>
        </div>
        <form class="status-reply-form" data-status-reply-form="${status.id}">
          <input
            type="text"
            maxlength="140"
            placeholder="Responder a este estado..."
            data-status-reply-input="${status.id}"
            required
          />
          <button type="submit">Responder</button>
        </form>
      `;
      target.appendChild(card);
    });
  },

  fillProfile(profile) {
    document.getElementById("profileName").value = profile.name;
    document.getElementById("profileZone").value = profile.zone;
    document.getElementById("profileHandicap").value = profile.handicap;
    document.getElementById("profileFavCourse").value = profile.favCourse;
    const avatar = document.getElementById("profileAvatarPreview");
    if (avatar && profile.photo) avatar.src = profile.photo;
  }
};

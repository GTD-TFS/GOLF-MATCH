window.UI = {
  formatDate(dateValue) {
    const [year, month, day] = (dateValue || "").split("-");
    if (!year || !month || !day) return dateValue || "Fecha por confirmar";
    return `${day}/${month}/${year}`;
  },

  renderMatches(matches, statuses, activePlayerName, targetId) {
    const target = document.getElementById(targetId);
    target.innerHTML = "";

    const listMatches = Array.isArray(matches) ? matches : [];
    const listStatuses = Array.isArray(statuses) ? statuses : [];
    const linkedByMatchId = new Map();
    const playerName = activePlayerName || "Usuario";

    const normalizeTimestamp = value => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 1e11 ? parsed : 0;
    };

    const getStatusSortTime = status => {
      return normalizeTimestamp(status?.createdAt) || normalizeTimestamp(status?.id) || Date.now();
    };

    const getMatchSortTime = match => {
      return normalizeTimestamp(match?.createdAt) || normalizeTimestamp(match?.id) || Date.now();
    };

    listStatuses.forEach(status => {
      const linkedMatchId = Number(status.linkedMatchId || 0);
      if (linkedMatchId) linkedByMatchId.set(linkedMatchId, status);
    });

    const openConversations = listStatuses.filter(status => !Number(status.linkedMatchId || 0));

    if (!openConversations.length && !listMatches.length) {
      target.innerHTML = '<div class="card">No hay partidos ni conversaciones activas.</div>';
      return;
    }

    let seq = 0;
    const timeline = [
      ...openConversations.map(status => ({
        type: "proposal",
        sortTime: getStatusSortTime(status),
        seq: seq++,
        data: status
      })),
      ...listMatches.map(match => ({
        type: "match",
        sortTime: getMatchSortTime(match),
        seq: seq++,
        data: match
      }))
    ].sort((a, b) => (b.sortTime - a.sortTime) || (b.seq - a.seq));

    timeline.forEach(item => {
      if (item.type === "proposal") {
        const status = item.data;
        const card = document.createElement("div");
        const replies = Array.isArray(status.replies) ? status.replies : [];
        const repliesMarkup = replies.map(reply => (
          `<li class="status-reply-item"><strong>${reply.author}:</strong> ${reply.text}</li>`
        )).join("");
        const repliesSection = replies.length
          ? `
            <div class="status-replies">
              <strong>Respuestas</strong>
              <ul class="status-replies-list">
                ${repliesMarkup}
              </ul>
            </div>
            `
          : "";
        const proposalPlaceholder = replies.length
          ? "Responder a esta conversación..."
          : "Escribe un comentario";
        const replyCountBadge = replies.length
          ? `<span class="status-reply-count">${replies.length}</span>`
          : "";

        card.className = "card status-card proposal-card";
        card.dataset.proposalCardId = String(status.id);
        card.innerHTML = `
          <div class="status-head">
            <img class="status-avatar" src="${status.avatar || "https://i.pravatar.cc/120?img=12"}" alt="${status.author}" loading="lazy" />
            <h3>${status.author}</h3>
          </div>
          <p>${status.text}</p>
          <div class="proposal-thread-panel" data-proposal-thread-id="${status.id}">
            ${repliesSection}
            <form
              class="status-reply-form proposal-reply-form"
              data-status-reply-form="${status.id}"
              data-proposal-reply-form="${status.id}"
            >
              <input
                type="text"
                maxlength="140"
                placeholder="${proposalPlaceholder}"
                data-status-reply-input="${status.id}"
                required
              />
              <button type="submit" class="status-reply-send" aria-label="Responder">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
                </svg>
              </button>
            </form>
          </div>
          <div class="status-actions">
            <button type="button" class="status-focus-btn" data-status-focus-id="${status.id}" aria-label="Responder en conversación">${replyCountBadge}💭</button>
            <button type="button" class="status-to-match-btn" data-status-to-match-id="${status.id}" aria-label="Crear partido desde conversación">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="17" rx="3"></rect>
                <path d="M8 2v4"></path>
                <path d="M16 2v4"></path>
                <path d="M3 10h18"></path>
                <path d="M12 13v5"></path>
                <path d="M9.5 15.5h5"></path>
              </svg>
            </button>
          </div>
        `;
        target.appendChild(card);
        return;
      }

      const match = item.data;
      const card = document.createElement("div");
      const players = match.players.length ? match.players : ["Sin jugadores todavía"];
      const matchDate = this.formatDate(match.date);
      const matchCourseName = match.course || "Campo";
      const linkedThread = linkedByMatchId.get(match.id) || null;
      const threadId = Number(linkedThread?.id || match.statusThreadId || 0);
      const threadReplies = linkedThread && Array.isArray(linkedThread.replies) ? linkedThread.replies : [];
      const threadRepliesMarkup = threadReplies.map(reply => (
        `<li class="status-reply-item"><strong>${reply.author}:</strong> ${reply.text}</li>`
      )).join("");
      const proposalText = String(linkedThread?.text || "").trim();
      const proposalMarkup = proposalText
        ? `<p class="thread-proposal"><strong>${linkedThread.author}:</strong> ${proposalText}</p>`
        : "";
      const repliesSection = threadReplies.length
        ? `
            <div class="status-replies">
              <strong>Conversación</strong>
              <ul class="status-replies-list">
                ${threadRepliesMarkup}
              </ul>
            </div>
          `
        : "";
      const threadInputPlaceholder = (proposalText || threadReplies.length)
        ? "Escribe una respuesta..."
        : "Escribe un comentario";
      const threadConversationMarkup = linkedThread
        ? `
          <div class="thread-panel" data-thread-panel-id="${threadId}">
            ${proposalMarkup}
            ${repliesSection}
            <form class="status-reply-form thread-reply-form" data-status-reply-form="${threadId}">
              <input
                type="text"
                maxlength="140"
                placeholder="${threadInputPlaceholder}"
                data-status-reply-input="${threadId}"
                required
              />
              <button type="submit" class="status-reply-send" aria-label="Responder">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
                </svg>
              </button>
            </form>
          </div>
        `
        : "";
      const commentText = String(match.comment || "").trim();
      const commentMarkup = commentText
        ? `<p class="match-comment">${commentText}</p>`
        : "";
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
      const isJoined = match.players.includes(playerName);
      const isFull = match.players.length >= match.maxPlayers;
      const isCreator = String(match.createdBy || "").trim() === playerName;
      const actionLabel = isJoined
        ? "Añadir Jugadores"
        : isFull
          ? "Completo"
          : "Unirme";
      const actionType = isJoined ? "add" : "join";
      const fullBadgeMarkup = isFull
        ? '<div class="match-full-overlay">COMPLETO</div>'
        : "";
      const sideControlMarkup = isCreator
        ? `
          <div class="match-meta-control">
            <button type="button" class="match-manage-btn match-delete-btn" data-match-delete-id="${match.id}" aria-label="Eliminar partido">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18"></path>
                <path d="M8 6V4h8v2"></path>
                <path d="M19 6l-1 14H6L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
              </svg>
            </button>
            <button type="button" class="match-manage-btn match-leave-btn" data-match-leave-id="${match.id}" aria-label="Salir del partido">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10 17l-5-5 5-5"></path>
                <path d="M5 12h11"></path>
                <path d="M14 5h4v14h-4"></path>
              </svg>
            </button>
          </div>
        `
        : isJoined
          ? `
          <div class="match-meta-control">
            <button type="button" class="match-manage-btn match-leave-btn" data-match-leave-id="${match.id}" aria-label="Desapuntarse del partido">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10 17l-5-5 5-5"></path>
                <path d="M5 12h11"></path>
                <path d="M14 5h4v14h-4"></path>
              </svg>
            </button>
          </div>
        `
          : "";
      const actionMarkup = isFull
        ? '<div class="match-complete-action">COMPLETO</div>'
        : `
            <button
              class="join-btn"
              data-match-action-id="${match.id}"
              data-match-action-type="${actionType}"
            >
              ${actionLabel}
            </button>
          `;

      const threadReplyBadge = threadReplies.length
        ? `<span class="status-reply-count">${threadReplies.length}</span>`
        : "";

      card.className = "card match-card is-collapsed";
      card.dataset.matchCardId = String(match.id);
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-expanded", "false");
      card.innerHTML = `
        <div class="match-logo" aria-label="Logo del campo">
          ${logoMarkup}
        </div>
        ${fullBadgeMarkup}
        <div class="match-header">
          <h3>${matchCourseName}</h3>
          <div class="match-date">${matchDate} · ${match.time}</div>
        </div>
        <div class="match-details">
          <div class="match-meta-grid">
            <div class="match-meta">
              <span class="match-meta-label">HCP</span>
              <strong>${match.hcpRange || "Sin datos"}</strong>
            </div>
            <div class="match-meta">
              <span class="match-meta-label">Plazas</span>
              <strong class="${isFull ? "match-meta-value-full" : ""}">${match.players.length}/${match.maxPlayers}</strong>
            </div>
            ${sideControlMarkup}
          </div>
          <div class="players-details">
            <strong>Jugadores actuales</strong>
            <ul class="players-list">
              ${playersMarkup}
            </ul>
          </div>
          ${commentMarkup}
          <div class="match-actions-row">
            <div class="match-thread-cell">
              <button
                type="button"
                class="thread-toggle-btn thread-toggle-btn-compact"
                data-thread-toggle-id="${threadId}"
                data-thread-match-id="${match.id}"
                aria-expanded="false"
              >${threadReplyBadge}💭</button>
            </div>
            ${actionMarkup}
          </div>
          ${threadConversationMarkup}
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

    let hasRenderedPpHeading = false;
    fields.forEach(field => {
      if (!hasRenderedPpHeading && field.category === "P&P") {
        const heading = document.createElement("div");
        heading.className = "field-group-title";
        heading.textContent = "9 Hoyos";
        target.appendChild(heading);
        hasRenderedPpHeading = true;
      }

      const card = document.createElement("div");
      const fieldName = field.name || "Campo";
      const logoMarkup = field.logo
        ? `<img class="field-logo-img" src="${field.logo}" alt="Logo ${fieldName}" loading="lazy" />`
        : `<span class="field-logo-fallback">${fieldName.slice(0, 2).toUpperCase()}</span>`;
      card.className = "card field-card";
      card.dataset.fieldId = field.id;
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      if (field.image) {
        card.style.setProperty("--field-image", `url("${field.image}")`);
      }
      card.innerHTML = `
        <div class="field-bg" aria-hidden="true"></div>
        <div class="field-logo" aria-label="Logo del campo">
          ${logoMarkup}
        </div>
        <div class="field-head">
          <h3>${fieldName}</h3>
          <p class="field-municipality">${field.zone}</p>
        </div>
        <div class="actions field-actions">
          <button class="field-slots-btn" data-field-slots-id="${field.id}">Salidas disponibles</button>
          <button class="field-scorecard-btn" data-field-scorecard-id="${field.id}">Scorecard</button>
        </div>
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

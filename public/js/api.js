/* =============================================
   api.js — Baserow API layer
   ============================================= */

   const API = (() => {
    const TOKEN    = '6o6jFrpbbUiBf8lgrbR7NMQyfoBq9ozQ';
    const BASE_URL = 'https://api.baserow.io/api';
    const TABLE_ARTICLES    = 995719;
  
    /* ---------- HTTP helpers ---------- */
    async function req(method, path, body) {
      const opts = {
        method,
        headers: {
          'Authorization': `Token ${TOKEN}`,
          'Content-Type': 'application/json',
        },
      };
      if (body !== undefined) opts.body = JSON.stringify(body);
      const res = await fetch(`${BASE_URL}${path}`, opts);
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`API ${method} ${path} → ${res.status}: ${err}`);
      }
      if (res.status === 204) return null;
      return res.json();
    }
  
    const get    = path        => req('GET',    path);
    const post   = (path, b)  => req('POST',   path, b);
    const patch  = (path, b)  => req('PATCH',  path, b);
    const del    = path        => req('DELETE', path);
  
    function rowToArticle(row) {
      return {
        id:          row.id,
        name:        row['Nom']         || '',
        ref:         row['Référence']   || '',
        category:    row['Catégorie']   || '',
        qty:         Number(row['Quantité'] || 0),
        threshold:   Number(row['Seuil'] || 3),
        location:    row['Emplacement'] || '',
        description: row['Description'] || '',
        image:       row['Image']       || '',
        catColor:    row['Cat_Couleur'] || '#6B7280',
        catEmoji:    row['Cat_Emoji']   || '📦',
      };
    }
  
    function articleToRow(a) {
      return {
        'Nom':         a.name        || '',
        'Référence':   a.ref         || '',
        'Catégorie':   a.category    || '',
        'Quantité':    Number(a.qty  || 0),
        'Seuil':       Number(a.threshold || 3),
        'Emplacement': a.location    || '',
        'Description': a.description || '',
        'Image':       a.image       || '',
        'Cat_Couleur': a.catColor    || '#6B7280',
        'Cat_Emoji':   a.catEmoji    || '📦',
      };
    }
  
    async function getArticles() {
      let articles = [];
      let nextUrl  = `/database/rows/table/${TABLE_ARTICLES}/?user_field_names=true&size=200`;
      while (nextUrl) {
        const data = await get(nextUrl.startsWith('http') ? nextUrl.replace(BASE_URL,'') : nextUrl);
        articles.push(...data.results.map(rowToArticle));
        nextUrl = data.next ? data.next.replace(BASE_URL, '') : null;
      }
      return articles;
    }
  
    async function createArticle(a) {
      const data = await post(`/database/rows/table/${TABLE_ARTICLES}/?user_field_names=true`, articleToRow(a));
      return rowToArticle(data);
    }
  
    async function updateArticle(id, a) {
      const data = await patch(`/database/rows/table/${TABLE_ARTICLES}/${id}/?user_field_names=true`, articleToRow(a));
      return rowToArticle(data);
    }
  
    async function deleteArticle(id) {
      return del(`/database/rows/table/${TABLE_ARTICLES}/${id}/`);
    }
  
    /* ---------- PRÊTS ---------- */
  const TABLE_LOANS = 1020899;

  function rowToLoan(row) {
    return {
      id:          row.id,
      borrower:    row['Emprunteur']  || '',
      articleName: row['Article_Nom'] || '',
      articleId:   Number(row['Article_Id'] || 0),
      qty:         Number(row['Quantite']   || 1),
      dateStart:   row['Date_Debut']  || '',
      dateEnd:     row['Date_Fin']    || '',
      note:        row['Note']        || '',
      returned:    row['Rendu']       || false,
      returnedAt:  row['Date_Retour'] || null,
    };
  }

  function loanToRow(l) {
    return {
      'Emprunteur':  l.borrower    || '',
      'Article_Nom': l.articleName || '',
      'Article_Id':  Number(l.articleId || 0),
      'Quantite':    Number(l.qty  || 1),
      'Date_Debut':  l.dateStart   || null,
      'Date_Fin':    l.dateEnd     || null,
      'Note':        l.note        || '',
      'Rendu':       l.returned    || false,
      'Date_Retour': l.returnedAt  || null,
    };
  }

  async function getLoans() {
    let loans = [];
    let nextUrl = `/database/rows/table/${TABLE_LOANS}/?user_field_names=true&size=200`;
    while (nextUrl) {
      const data = await get(nextUrl.startsWith('http') ? nextUrl.replace(BASE_URL,'') : nextUrl);
      loans.push(...data.results.map(rowToLoan));
      nextUrl = data.next ? data.next.replace(BASE_URL, '') : null;
    }
    return loans;
  }

  async function createLoan(l) {
    const data = await post(`/database/rows/table/${TABLE_LOANS}/?user_field_names=true`, loanToRow(l));
    return rowToLoan(data);
  }

  async function updateLoan(id, l) {
    const data = await patch(`/database/rows/table/${TABLE_LOANS}/${id}/?user_field_names=true`, loanToRow(l));
    return rowToLoan(data);
  }

  async function deleteLoan(id) {
    return del(`/database/rows/table/${TABLE_LOANS}/${id}/`);
  }

  /* ---------- GESTION DÉLÉGUÉE ---------- */
  const TABLE_DELEGATED = 1041913;

  function rowToDelegated(row) {
    let screens = [];
    try { screens = JSON.parse(row['Ecrans'] || '[]'); } catch { screens = []; }
    return {
      id:         row.id,
      team:       row['Equipe']        || '',
      brand:      row['Marque']        || '',
      model:      row['Modele']        || '',
      serial:     row['Numero_Serie']  || '',
      antitheft:  row['Antivol']       || false,
      user:       row['Utilisateur']   || '',
      note:       row['Note']          || '',
      dateAdded:  row['Date_Ajout']    || '',
      filtreConf: row['Filtre_Conf'] || false,
      token:      row['Token']       || '',
      screens,
    };
  }

  function delegatedToRow(d) {
    return {
      'Equipe':        d.team       || '',
      'Marque':        d.brand      || '',
      'Modele':        d.model      || '',
      'Numero_Serie':  d.serial     || '',
      'Antivol':       d.antitheft  || false,
      'Utilisateur':   d.user       || '',
      'Note':          d.note       || '',
      'Date_Ajout':    d.dateAdded  || null,
      'Ecrans':        JSON.stringify(d.screens || []),
      'Filtre_Conf':   d.filtreConf || false,
      'Token':         d.token      || '',
    };
  }

  async function getDelegated() {
    let items = [];
    let nextUrl = `/database/rows/table/${TABLE_DELEGATED}/?user_field_names=true&size=200`;
    while (nextUrl) {
      const data = await get(nextUrl.startsWith('http') ? nextUrl.replace(BASE_URL,'') : nextUrl);
      items.push(...data.results.map(rowToDelegated));
      nextUrl = data.next ? data.next.replace(BASE_URL, '') : null;
    }
    return items;
  }

  async function createDelegated(d) {
    const data = await post(`/database/rows/table/${TABLE_DELEGATED}/?user_field_names=true`, delegatedToRow(d));
    return rowToDelegated(data);
  }

  async function updateDelegated(id, d) {
    const data = await patch(`/database/rows/table/${TABLE_DELEGATED}/${id}/?user_field_names=true`, delegatedToRow(d));
    return rowToDelegated(data);
  }

  async function deleteDelegated(id) {
    return del(`/database/rows/table/${TABLE_DELEGATED}/${id}/`);
  }

  /* ---------- MOUVEMENTS ---------- */
  const TABLE_MOVEMENTS = 1025225;

  function rowToMovement(row) {
    return {
      id:          row.id,
      articleId:   Number(row['Article_Id'] || 0),
      articleName: row['Article_Nom'] || '',
      type:        row['Type']        || 'in',
      qty:         Number(row['Quantite'] || 0),
      date:        row['Date']        || '',
      reason:      row['Raison']      || '',
    };
  }

  function movementToRow(m) {
    return {
      'Article_Id':   Number(m.articleId || 0),
      'Article_Nom':  m.articleName || '',
      'Type':         m.type        || 'in',
      'Quantite':     Number(m.qty  || 0),
      'Date':         m.date        || null,
      'Raison':       m.reason      || '',
    };
  }

  async function getMovements() {
    let movs = [];
    let nextUrl = `/database/rows/table/${TABLE_MOVEMENTS}/?user_field_names=true&size=200`;
    while (nextUrl) {
      const data = await get(nextUrl.startsWith('http') ? nextUrl.replace(BASE_URL,'') : nextUrl);
      movs.push(...data.results.map(rowToMovement));
      nextUrl = data.next ? data.next.replace(BASE_URL, '') : null;
    }
    return movs;
  }

  async function createMovement(m) {
    const data = await post(`/database/rows/table/${TABLE_MOVEMENTS}/?user_field_names=true`, movementToRow(m));
    return rowToMovement(data);
  }

  async function deleteMovement(id) {
    return del(`/database/rows/table/${TABLE_MOVEMENTS}/${id}/`);
  }

  return { getArticles, createArticle, updateArticle, deleteArticle, getLoans, createLoan, updateLoan, deleteLoan, getDelegated, createDelegated, updateDelegated, deleteDelegated, getMovements, createMovement, deleteMovement };
  
})();

require('dotenv').config();
const express  = require('express');
const fetch    = require('node-fetch');
const path     = require('path');

const app  = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const BASEROW_URL   = process.env.BASEROW_URL;
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;

const TABLES = {
  articles:  process.env.TABLE_ARTICLES,
  loans:     process.env.TABLE_LOANS,
  movements: process.env.TABLE_MOVEMENTS,
  delegated: process.env.TABLE_DELEGATED,
};

/* ---- Proxy générique vers Baserow ---- */
async function baserowReq(method, path, body) {
  const opts = {
    method,
    headers: {
      'Authorization': `Token ${BASEROW_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASEROW_URL}${path}`, opts);
  if (res.status === 204) return null;
  return res.json();
}

/* ---- Routes pour chaque table ---- */
function makeRoutes(tableName) {
  const tableId = TABLES[tableName];
  const base    = `/api/${tableName}`;

  // GET tous les enregistrements (avec pagination auto)
  app.get(base, async (req, res) => {
    try {
      let items = [];
      let nextUrl = `/database/rows/table/${tableId}/?user_field_names=true&size=200${tableName === 'movements' ? '&order_by=-id' : ''}`;
      while (nextUrl) {
        const data = await baserowReq('GET', nextUrl.startsWith('http') ? nextUrl.replace(BASEROW_URL, '') : nextUrl);
        items.push(...data.results);
        nextUrl = data.next ? data.next.replace(BASEROW_URL, '') : null;
      }
      res.json(items);
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // POST créer un enregistrement
  app.post(base, async (req, res) => {
    try {
      const data = await baserowReq('POST', `/database/rows/table/${tableId}/?user_field_names=true`, req.body);
      res.json(data);
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });

  // PATCH modifier un enregistrement
  app.patch(`${base}/:id`, async (req, res) => {
    try {
      const data = await baserowReq('PATCH', `/database/rows/table/${tableId}/${req.params.id}/?user_field_names=true`, req.body);
      res.json(data);
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE supprimer un enregistrement
  app.delete(`${base}/:id`, async (req, res) => {
    try {
      await baserowReq('DELETE', `/database/rows/table/${tableId}/${req.params.id}/`);
      res.status(204).send();
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });
}

// Crée les routes pour chaque table
makeRoutes('articles');
makeRoutes('loans');
makeRoutes('movements');
makeRoutes('delegated');

// Toutes les autres routes → index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`StockPro démarré sur http://localhost:${PORT}`));
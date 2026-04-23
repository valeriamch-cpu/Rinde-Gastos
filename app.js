const STORAGE_KEY = 'rinde_gastos_db_v1';

const form = document.querySelector('#expense-form');
const table = document.querySelector('#expenses-table');
const tbody = table.querySelector('tbody');
const emptyState = document.querySelector('#empty-state');
const totals = document.querySelector('#totals');
const countElement = document.querySelector('#count');
const totalAmountElement = document.querySelector('#total-amount');
const databaseView = document.querySelector('#database-view');

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

let entries = loadEntries();

function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('No se pudo leer la base local:', error);
    return [];
  }
}

function persistEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: String(reader.result),
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function serializeBackups(fileList) {
  if (!fileList || fileList.length === 0) {
    return [];
  }

  const files = Array.from(fileList);
  return Promise.all(files.map((file) => readFileAsDataUrl(file)));
}

function renderBackups(backups) {
  if (!backups || backups.length === 0) {
    return '<span class="muted">Sin respaldos</span>';
  }

  return backups
    .map((backup) => {
      if (backup.type.startsWith('image/')) {
        return `
          <div class="backup-item">
            <div>${backup.name}</div>
            <img src="${backup.dataUrl}" alt="Respaldo ${backup.name}" class="backup-image" />
          </div>
        `;
      }

      return `<div class="backup-item"><a href="${backup.dataUrl}" download="${backup.name}">${backup.name}</a></div>`;
    })
    .join('');
}

function renderDatabaseView() {
  databaseView.textContent = JSON.stringify(entries, null, 2);
}

function render() {
  tbody.innerHTML = '';

  if (entries.length === 0) {
    emptyState.hidden = false;
    table.hidden = true;
    totals.hidden = true;
    renderDatabaseView();
    return;
  }

  emptyState.hidden = true;
  table.hidden = false;
  totals.hidden = false;

  let totalAmount = 0;

  entries.forEach((entry) => {
    totalAmount += entry.amount;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${entry.employee}</td>
      <td>${entry.expenseType}</td>
      <td>${entry.detail || '<span class="muted">Sin detalle</span>'}</td>
      <td>${currencyFormatter.format(entry.amount)}</td>
      <td>${renderBackups(entry.backups)}</td>
    `;
    tbody.appendChild(row);
  });

  countElement.textContent = String(entries.length);
  totalAmountElement.textContent = currencyFormatter.format(totalAmount);
  renderDatabaseView();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Guardando...';

  try {
    const formData = new FormData(form);
    const amount = Number(formData.get('amount'));
    const backups = await serializeBackups(form.querySelector('#backups').files);

    const newEntry = {
      id: crypto.randomUUID(),
      employee: String(formData.get('employee')).trim(),
      expenseType: String(formData.get('expenseType')).trim(),
      detail: String(formData.get('detail') || '').trim(),
      amount,
      backups,
      createdAt: new Date().toISOString(),
    };

    entries.push(newEntry);
    persistEntries();
    form.reset();
    render();
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Guardar rendición';
  }
});

render();

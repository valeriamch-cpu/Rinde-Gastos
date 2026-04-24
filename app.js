const STORAGE_KEY = 'rinde_gastos_shared';
const LEGACY_STORAGE_KEYS = ['rinde_gastos_db_v4', 'rinde_gastos_db_v3', 'rinde_gastos_db_v2'];
const BACKUP_KEY = 'rinde_gastos_backup_latest';

const renditionForm = document.querySelector('#rendition-form');
const expenseForm = document.querySelector('#expense-form');
const saveRenditionButton = document.querySelector('#save-rendition');

const draftTable = document.querySelector('#draft-table');
const draftBody = draftTable.querySelector('tbody');
const emptyDraft = document.querySelector('#empty-draft');
const draftTotalContainer = document.querySelector('#draft-total');
const draftTotalAmount = document.querySelector('#draft-total-amount');

const renditionsTable = document.querySelector('#renditions-table');
const renditionsBody = renditionsTable.querySelector('tbody');
const emptyRenditions = document.querySelector('#empty-renditions');
const globalTotals = document.querySelector('#global-totals');
const globalTotalElement = document.querySelector('#global-total');

const allDetailsContainer = document.querySelector('#all-details');
const emptyAllDetails = document.querySelector('#empty-all-details');
const installAppButton = document.querySelector('#install-app');
const detailSearchInput = document.querySelector('#detail-search-input');
const detailSearchButton = document.querySelector('#detail-search-button');
const clearFilterButton = document.querySelector('#clear-filter');
const exportDataButton = document.querySelector('#export-data');
const importDataInput = document.querySelector('#import-data');

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

let deferredInstallPrompt = null;

const defaultData = { renditions: [] };
let state = loadState();
let draftExpenses = [];
let detailsFilter = '';


function normalizeRendition(rendition) {
  const employee = String(rendition?.employee || 'Sin nombre');
  const renditionNumber = String(rendition?.renditionNumber || '').trim();
  const expenses = Array.isArray(rendition?.expenses) ? rendition.expenses : [];
  const totalFromExpenses = expenses.reduce((sum, expense) => sum + Number(expense?.amount || 0), 0);

  return {
    id: rendition?.id || crypto.randomUUID(),
    employee,
    renditionNumber,
    status: rendition?.status || 'Pendiente',
    total: Number(rendition?.total || totalFromExpenses),
    expenses: expenses.map((expense) => ({
      expenseType: String(expense?.expenseType || 'Sin tipo'),
      amount: Number(expense?.amount || 0),
      receipt: expense?.receipt || null,
    })),
    createdAt: rendition?.createdAt || new Date().toISOString(),
  };
}

function loadState() {
  const parseState = (raw) => {
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.renditions)) {
        return null;
      }

      return {
        renditions: parsed.renditions.map((rendition) => normalizeRendition(rendition)),
      };
    } catch (error) {
      return null;
    }
  };

  const currentState = parseState(localStorage.getItem(STORAGE_KEY));
  if (currentState) {
    return currentState;
  }

  for (const key of LEGACY_STORAGE_KEYS) {
    const legacyState = parseState(localStorage.getItem(key));
    if (legacyState) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyState));
      localStorage.setItem('rinde_gastos_db_v4', JSON.stringify(legacyState));
      return legacyState;
    }
  }

  const backupState = parseState(localStorage.getItem(BACKUP_KEY));
  if (backupState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backupState));
    localStorage.setItem('rinde_gastos_db_v4', JSON.stringify(backupState));
    return backupState;
  }

  return structuredClone(defaultData);
}

function persistState() {
  const payload = JSON.stringify(state);
  localStorage.setItem(STORAGE_KEY, payload);
  localStorage.setItem('rinde_gastos_db_v4', payload);
  localStorage.setItem(BACKUP_KEY, payload);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type || 'application/octet-stream',
        dataUrl: String(reader.result),
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function receiptHtml(receipt) {
  if (!receipt) {
    return '<span class="muted">Sin comprobante</span>';
  }

  if (receipt.type.startsWith('image/')) {
    return `
      <div class="backup-item">
        <div>${receipt.name}</div>
        <img src="${receipt.dataUrl}" alt="Comprobante ${receipt.name}" class="backup-image" />
      </div>
    `;
  }

  return `<a href="${receipt.dataUrl}" download="${receipt.name}">${receipt.name}</a>`;
}

function normalizedRenditionNumber(value) {
  return String(value).trim().toUpperCase();
}

function draftTotal() {
  return draftExpenses.reduce((sum, expense) => sum + expense.amount, 0);
}

function renderDraft() {
  draftBody.innerHTML = '';

  if (draftExpenses.length === 0) {
    emptyDraft.hidden = false;
    draftTable.hidden = true;
    draftTotalContainer.hidden = true;
    return;
  }

  emptyDraft.hidden = true;
  draftTable.hidden = false;
  draftTotalContainer.hidden = false;

  draftExpenses.forEach((expense) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${expense.expenseType}</td>
      <td>${currencyFormatter.format(expense.amount)}</td>
      <td>${receiptHtml(expense.receipt)}</td>
    `;
    draftBody.appendChild(row);
  });

  draftTotalAmount.textContent = currencyFormatter.format(draftTotal());
}

function renderSummary() {
  renditionsBody.innerHTML = '';

  const renditionsToShow = filteredRenditions();

  if (renditionsToShow.length === 0) {
    emptyRenditions.hidden = false;
    emptyRenditions.textContent = state.renditions.length === 0
      ? 'Aún no hay rendiciones guardadas.'
      : 'No hay rendiciones que coincidan con la búsqueda.';
    renditionsTable.hidden = true;
    globalTotals.hidden = true;
    return;
  }

  emptyRenditions.hidden = true;
  emptyRenditions.textContent = 'Aún no hay rendiciones guardadas.';
  renditionsTable.hidden = false;
  globalTotals.hidden = false;

  let globalTotal = 0;

  renditionsToShow.forEach((rendition) => {
    globalTotal += rendition.total;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rendition.renditionNumber}</td>
      <td>${rendition.employee}</td>
      <td>${currencyFormatter.format(rendition.total)}</td>
    `;

    renditionsBody.appendChild(row);
  });

  globalTotalElement.textContent = currencyFormatter.format(globalTotal);
}

function normalizeSearchText(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function renditionKey(employee, renditionNumber) {
  return `${normalizeSearchText(employee)}::${normalizeSearchText(renditionNumber)}`;
}

function filteredRenditions() {
  const query = normalizeSearchText(detailsFilter);
  if (!query) {
    return state.renditions;
  }

  return state.renditions.filter((rendition) => {
    const byNumber = normalizeSearchText(rendition.renditionNumber).includes(query);
    const byEmployee = normalizeSearchText(rendition.employee).includes(query);
    return byNumber || byEmployee;
  });
}

function renderAllDetails() {
  allDetailsContainer.innerHTML = '';

  if (state.renditions.length === 0) {
    emptyAllDetails.hidden = false;
    return;
  }

  const renditionsToShow = filteredRenditions();
  if (renditionsToShow.length === 0) {
    emptyAllDetails.hidden = false;
    emptyAllDetails.textContent = 'No hay rendiciones que coincidan con la búsqueda.';
    return;
  }

  emptyAllDetails.hidden = true;
  emptyAllDetails.textContent = 'Aún no hay detalles para mostrar.';

  renditionsToShow.forEach((rendition) => {
    const detailCard = document.createElement('article');
    detailCard.className = 'detail-card';

    const rows = rendition.expenses
      .map(
        (expense) => `
          <tr>
            <td>${expense.expenseType}</td>
            <td>${currencyFormatter.format(expense.amount)}</td>
            <td>${receiptHtml(expense.receipt)}</td>
          </tr>
        `,
      )
      .join('');

    detailCard.innerHTML = `
      <h3>Rendición ${rendition.renditionNumber}</h3>
      <p><strong>Trabajador:</strong> ${rendition.employee}</p>
      <p><strong>Total:</strong> ${currencyFormatter.format(rendition.total)}</p>
      <p>
        <strong>Estado:</strong>
        <select class="status-select" data-rendition-id="${rendition.id}">
          <option value="Pendiente" ${rendition.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
          <option value="Revisado" ${rendition.status === 'Revisado' ? 'selected' : ''}>Revisado</option>
          <option value="Pagado" ${rendition.status === 'Pagado' ? 'selected' : ''}>Pagado</option>
        </select>
      </p>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Tipo gasto</th>
              <th>Monto</th>
              <th>Comprobante</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    allDetailsContainer.appendChild(detailCard);
  });
}


function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    renditions: state.renditions,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rendiciones-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function mergeImportedRenditions(renditions) {
  const existingKeys = new Set(state.renditions.map((item) => renditionKey(item.employee, item.renditionNumber)));
  let added = 0;

  renditions.forEach((rendition) => {
    const key = renditionKey(rendition.employee || '', rendition.renditionNumber || '');
    if (!rendition?.renditionNumber || existingKeys.has(key)) {
      return;
    }

    const normalized = normalizeRendition(rendition);

    state.renditions.push(normalized);
    existingKeys.add(key);
    added += 1;
  });

  if (added > 0) {
    persistState();
    render();
  }

  alert(`Importación finalizada. Rendiciones agregadas: ${added}`);
}

async function importData(file) {
  if (!file) {
    return;
  }

  const text = await file.text();
  const parsed = JSON.parse(text);
  const renditions = Array.isArray(parsed) ? parsed : parsed.renditions;

  if (!Array.isArray(renditions)) {
    alert('El archivo no tiene formato válido de rendiciones.');
    return;
  }

  mergeImportedRenditions(renditions);
}

function setupPwaInstall() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => {
        console.error('No se pudo registrar service worker:', error);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    if (!installAppButton) {
      return;
    }

    event.preventDefault();
    deferredInstallPrompt = event;
    installAppButton.hidden = false;
  });

  if (!installAppButton) {
    return;
  }

  installAppButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      alert('Para instalar, abre esta app en navegador compatible (Chrome/Edge) y usa "Instalar app".');
      return;
    }

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installAppButton.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    if (installAppButton) {
      installAppButton.hidden = true;
    }
    deferredInstallPrompt = null;
  });
}

function render() {
  renderDraft();
  renderSummary();
  renderAllDetails();
}

allDetailsContainer.addEventListener('change', (event) => {
  const select = event.target.closest('select[data-rendition-id]');
  if (!select) {
    return;
  }

  const rendition = state.renditions.find((item) => item.id === select.dataset.renditionId);
  if (!rendition) {
    return;
  }

  rendition.status = select.value;
  persistState();
});

if (detailSearchButton && detailSearchInput) {
  detailSearchButton.addEventListener('click', () => {
    detailsFilter = detailSearchInput.value;
    renderSummary();
    renderAllDetails();
  });

  detailSearchInput.addEventListener('input', () => {
    detailsFilter = detailSearchInput.value;
    renderSummary();
    renderAllDetails();
  });
}

if (detailSearchInput && detailSearchButton) {
  detailSearchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    detailSearchButton.click();
  });
}

if (clearFilterButton) {
  clearFilterButton.addEventListener('click', () => {
    detailsFilter = '';
    if (detailSearchInput) {
      detailSearchInput.value = '';
    }
    render();
  });
}

if (exportDataButton) {
  exportDataButton.addEventListener('click', () => {
    exportData();
  });
}

if (importDataInput) {
  importDataInput.addEventListener('change', async (event) => {
    try {
      await importData(event.target.files[0]);
    } catch (error) {
      alert('No se pudo importar el archivo.');
    } finally {
      importDataInput.value = '';
    }
  });
}

expenseForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const renditionNumber = normalizedRenditionNumber(renditionForm.renditionNumber.value);
  const employee = String(renditionForm.employee.value).trim();

  if (!renditionNumber || !employee) {
    alert('Primero completa nombre trabajador y número de rendición.');
    return;
  }

  const formData = new FormData(expenseForm);
  const amount = Number(formData.get('amount'));
  const backupFile = expenseForm.querySelector('#backup').files[0];
  const cameraFile = expenseForm.querySelector('#cameraBackup').files[0];
  const receiptFile = cameraFile || backupFile;

  if (!receiptFile) {
    alert('Debes adjuntar un comprobante (archivo o cámara).');
    return;
  }

  const newExpense = {
    expenseType: String(formData.get('expenseType')).trim(),
    amount,
    receipt: await readFileAsDataUrl(receiptFile),
  };

  draftExpenses.push(newExpense);
  expenseForm.reset();
  renderDraft();
});

saveRenditionButton.addEventListener('click', () => {
  const renditionNumber = normalizedRenditionNumber(renditionForm.renditionNumber.value);
  const employee = String(renditionForm.employee.value).trim();

  if (!employee || !renditionNumber) {
    alert('Completa nombre trabajador y número de rendición.');
    return;
  }

  if (draftExpenses.length === 0) {
    alert('Debes agregar al menos un gasto antes de guardar la rendición.');
    return;
  }

  const newKey = renditionKey(employee, renditionNumber);
  const alreadyExists = state.renditions.some(
    (rendition) => renditionKey(rendition.employee, rendition.renditionNumber) === newKey,
  );
  if (alreadyExists) {
    alert('Ya existe una rendición con ese número para el mismo trabajador.');
    return;
  }

  const total = draftExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  state.renditions.push(
    normalizeRendition({
      id: crypto.randomUUID(),
      renditionNumber,
      employee,
      status: 'Pendiente',
      total,
      expenses: structuredClone(draftExpenses),
      createdAt: new Date().toISOString(),
    }),
  );

  persistState();

  draftExpenses = [];
  renditionForm.reset();
  expenseForm.reset();
  render();
});

setupPwaInstall();
render();

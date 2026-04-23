const STORAGE_KEY = 'rinde_gastos_db_v4';

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

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

let deferredInstallPrompt = null;

const defaultData = { renditions: [] };
let state = loadState();
let draftExpenses = [];

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(defaultData);
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      renditions: Array.isArray(parsed.renditions) ? parsed.renditions : [],
    };
  } catch (error) {
    console.error('No se pudo leer almacenamiento local:', error);
    return structuredClone(defaultData);
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

  if (state.renditions.length === 0) {
    emptyRenditions.hidden = false;
    renditionsTable.hidden = true;
    globalTotals.hidden = true;
    return;
  }

  emptyRenditions.hidden = true;
  renditionsTable.hidden = false;
  globalTotals.hidden = false;

  let globalTotal = 0;

  state.renditions.forEach((rendition) => {
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

function renderAllDetails() {
  allDetailsContainer.innerHTML = '';

  if (state.renditions.length === 0) {
    emptyAllDetails.hidden = false;
    return;
  }

  emptyAllDetails.hidden = true;

  state.renditions.forEach((rendition) => {
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


function setupPwaInstall() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => {
        console.error('No se pudo registrar service worker:', error);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installAppButton.hidden = false;
  });

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
    installAppButton.hidden = true;
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

  const alreadyExists = state.renditions.some((rendition) => rendition.renditionNumber === renditionNumber);
  if (alreadyExists) {
    alert('Ya existe una rendición con ese número. Usa otro número.');
    return;
  }

  const total = draftExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  state.renditions.push({
    id: crypto.randomUUID(),
    renditionNumber,
    employee,
    status: 'Pendiente',
    total,
    expenses: structuredClone(draftExpenses),
    createdAt: new Date().toISOString(),
  });

  persistState();

  draftExpenses = [];
  renditionForm.reset();
  expenseForm.reset();
  render();
});

setupPwaInstall();
render();

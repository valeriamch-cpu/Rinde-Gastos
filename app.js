const STORAGE_KEY = 'rinde_gastos_db_v3';

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

const detailPanel = document.querySelector('#detail-panel');
const detailEmployee = document.querySelector('#detail-employee');
const detailNumber = document.querySelector('#detail-number');
const detailStatus = document.querySelector('#detail-status');
const detailExpensesBody = document.querySelector('#detail-expenses-table tbody');
const detailSearchInput = document.querySelector('#detail-search-input');
const detailSearchButton = document.querySelector('#detail-search-button');

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const defaultData = { renditions: [] };
let state = loadState();
let draftExpenses = [];
let selectedRenditionId = null;

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

function normalizeSearchText(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findRenditionByQuery(query) {
  const normalized = normalizeSearchText(query);
  if (!normalized) {
    return null;
  }

  return (
    state.renditions.find((rendition) => {
      const renditionNumber = normalizeSearchText(rendition.renditionNumber);
      const employee = normalizeSearchText(rendition.employee);
      return renditionNumber.includes(normalized) || employee.includes(normalized);
    }) || null
  );
}

function renderDetail() {
  const rendition = state.renditions.find((item) => item.id === selectedRenditionId);

  if (!rendition) {
    detailPanel.hidden = true;
    detailExpensesBody.innerHTML = '';
    return;
  }

  detailPanel.hidden = false;
  detailEmployee.textContent = rendition.employee;
  detailNumber.textContent = rendition.renditionNumber;
  detailStatus.value = rendition.status || 'Pendiente';

  detailExpensesBody.innerHTML = '';
  rendition.expenses.forEach((expense) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${expense.expenseType}</td>
      <td>${currencyFormatter.format(expense.amount)}</td>
      <td>${receiptHtml(expense.receipt)}</td>
    `;
    detailExpensesBody.appendChild(row);
  });
}

function renderRenditions() {
  renditionsBody.innerHTML = '';

  if (state.renditions.length === 0) {
    emptyRenditions.hidden = false;
    renditionsTable.hidden = true;
    globalTotals.hidden = true;
    detailPanel.hidden = true;
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
      <td>${currencyFormatter.format(rendition.total)}</td>
      <td><button type="button" class="link-button" data-rendition-id="${rendition.id}">Ver detalle</button></td>
    `;
    renditionsBody.appendChild(row);
  });

  globalTotalElement.textContent = currencyFormatter.format(globalTotal);
  renderDetail();
}

function render() {
  renderDraft();
  renderRenditions();
}

renditionsBody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-rendition-id]');
  if (!button) {
    return;
  }

  selectedRenditionId = button.dataset.renditionId;
  renderDetail();
});

detailStatus.addEventListener('change', (event) => {
  const rendition = state.renditions.find((item) => item.id === selectedRenditionId);
  if (!rendition) {
    return;
  }

  rendition.status = event.target.value;
  persistState();
});


detailSearchButton.addEventListener('click', () => {
  const result = findRenditionByQuery(detailSearchInput.value);
  if (!result) {
    alert('No se encontró una rendición con ese nombre o número.');
    return;
  }

  selectedRenditionId = result.id;
  renderDetail();
});

detailSearchInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') {
    return;
  }

  event.preventDefault();
  detailSearchButton.click();
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

  const newRendition = {
    id: crypto.randomUUID(),
    renditionNumber,
    employee,
    status: 'Pendiente',
    total,
    expenses: structuredClone(draftExpenses),
    createdAt: new Date().toISOString(),
  };

  state.renditions.push(newRendition);
  persistState();

  selectedRenditionId = newRendition.id;
  draftExpenses = [];
  renditionForm.reset();
  expenseForm.reset();
  render();
});

render();

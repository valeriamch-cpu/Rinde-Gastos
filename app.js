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

const expensesTable = document.querySelector('#expenses-table');
const expensesBody = expensesTable.querySelector('tbody');
const emptyExpenses = document.querySelector('#empty-expenses');

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

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

function renderRenditions() {
  renditionsBody.innerHTML = '';
  expensesBody.innerHTML = '';

  if (state.renditions.length === 0) {
    emptyRenditions.hidden = false;
    renditionsTable.hidden = true;
    globalTotals.hidden = true;
    emptyExpenses.hidden = false;
    expensesTable.hidden = true;
    return;
  }

  emptyRenditions.hidden = true;
  renditionsTable.hidden = false;
  globalTotals.hidden = false;
  emptyExpenses.hidden = true;
  expensesTable.hidden = false;

  let globalTotal = 0;

  state.renditions.forEach((rendition) => {
    globalTotal += rendition.total;

    const renditionRow = document.createElement('tr');
    const statusSelect = document.createElement('select');
    statusSelect.className = 'status-select';

    ['Pendiente', 'Revisado', 'Pagado'].forEach((status) => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status;
      statusSelect.appendChild(option);
    });

    statusSelect.value = rendition.status || 'Pendiente';
    statusSelect.addEventListener('change', (event) => {
      rendition.status = event.target.value;
      persistState();
    });

    renditionRow.innerHTML = `
      <td>${rendition.renditionNumber}</td>
      <td>${rendition.employee}</td>
      <td>${currencyFormatter.format(rendition.total)}</td>
    `;

    const statusCell = document.createElement('td');
    statusCell.appendChild(statusSelect);
    renditionRow.appendChild(statusCell);
    renditionsBody.appendChild(renditionRow);

    rendition.expenses.forEach((expense) => {
      const expenseRow = document.createElement('tr');
      expenseRow.innerHTML = `
        <td>${rendition.renditionNumber}</td>
        <td>${rendition.employee}</td>
        <td>${expense.expenseType}</td>
        <td>${currencyFormatter.format(expense.amount)}</td>
        <td>${receiptHtml(expense.receipt)}</td>
      `;
      expensesBody.appendChild(expenseRow);
    });
  });

  globalTotalElement.textContent = currencyFormatter.format(globalTotal);
}

function render() {
  renderDraft();
  renderRenditions();
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
  const receiptFile = expenseForm.querySelector('#backup').files[0];

  const newExpense = {
    expenseType: String(formData.get('expenseType')).trim(),
    amount,
    receipt: receiptFile ? await readFileAsDataUrl(receiptFile) : null,
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

render();

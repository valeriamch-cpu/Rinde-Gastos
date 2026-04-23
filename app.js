const STORAGE_KEY = 'rinde_gastos_db_v2';

const form = document.querySelector('#expense-form');
const expensesTable = document.querySelector('#expenses-table');
const expensesBody = expensesTable.querySelector('tbody');
const summaryTable = document.querySelector('#summary-table');
const summaryBody = summaryTable.querySelector('tbody');
const emptyExpenses = document.querySelector('#empty-expenses');
const emptySummary = document.querySelector('#empty-summary');
const globalTotals = document.querySelector('#global-totals');
const globalTotalElement = document.querySelector('#global-total');

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const defaultData = {
  expenses: [],
  renditionStatuses: {},
};

let state = loadState();

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(defaultData);
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      renditionStatuses: parsed.renditionStatuses || {},
    };
  } catch (error) {
    console.error('No se pudo leer la base local:', error);
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

function expenseReceiptHtml(receipt) {
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

function getStatus(renditionNumber) {
  return state.renditionStatuses[renditionNumber] || 'Pendiente';
}

function setStatus(renditionNumber, status) {
  state.renditionStatuses[renditionNumber] = status;
  persistState();
  renderSummary();
}

function groupByRendition(expenses) {
  return expenses.reduce((groups, expense) => {
    if (!groups[expense.renditionNumber]) {
      groups[expense.renditionNumber] = {
        renditionNumber: expense.renditionNumber,
        employee: expense.employee,
        total: 0,
      };
    }

    groups[expense.renditionNumber].total += expense.amount;
    return groups;
  }, {});
}

function renderExpenses() {
  expensesBody.innerHTML = '';

  if (state.expenses.length === 0) {
    emptyExpenses.hidden = false;
    expensesTable.hidden = true;
    return;
  }

  emptyExpenses.hidden = true;
  expensesTable.hidden = false;

  state.expenses.forEach((expense) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${expense.renditionNumber}</td>
      <td>${expense.employee}</td>
      <td>${expense.expenseType}</td>
      <td>${currencyFormatter.format(expense.amount)}</td>
      <td>${expenseReceiptHtml(expense.receipt)}</td>
    `;

    expensesBody.appendChild(row);
  });
}

function renderSummary() {
  summaryBody.innerHTML = '';

  const grouped = Object.values(groupByRendition(state.expenses));

  if (grouped.length === 0) {
    emptySummary.hidden = false;
    summaryTable.hidden = true;
    globalTotals.hidden = true;
    return;
  }

  emptySummary.hidden = true;
  summaryTable.hidden = false;
  globalTotals.hidden = false;

  let globalTotal = 0;

  grouped.forEach((rendition) => {
    globalTotal += rendition.total;

    const row = document.createElement('tr');

    const statusSelect = document.createElement('select');
    statusSelect.className = 'status-select';

    ['Pendiente', 'Revisado', 'Pagado'].forEach((status) => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status;
      statusSelect.appendChild(option);
    });

    statusSelect.value = getStatus(rendition.renditionNumber);
    statusSelect.addEventListener('change', (event) => {
      setStatus(rendition.renditionNumber, event.target.value);
    });

    row.innerHTML = `
      <td>${rendition.renditionNumber}</td>
      <td>${rendition.employee}</td>
      <td>${currencyFormatter.format(rendition.total)}</td>
    `;

    const statusCell = document.createElement('td');
    statusCell.appendChild(statusSelect);
    row.appendChild(statusCell);

    summaryBody.appendChild(row);
  });

  globalTotalElement.textContent = currencyFormatter.format(globalTotal);
}

function render() {
  renderExpenses();
  renderSummary();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Guardando...';

  try {
    const formData = new FormData(form);
    const amount = Number(formData.get('amount'));
    const renditionNumber = normalizedRenditionNumber(formData.get('renditionNumber'));

    const receiptFile = form.querySelector('#backup').files[0];
    const receipt = receiptFile ? await readFileAsDataUrl(receiptFile) : null;

    const newExpense = {
      id: crypto.randomUUID(),
      employee: String(formData.get('employee')).trim(),
      renditionNumber,
      expenseType: String(formData.get('expenseType')).trim(),
      amount,
      receipt,
      createdAt: new Date().toISOString(),
    };

    state.expenses.push(newExpense);

    if (!state.renditionStatuses[renditionNumber]) {
      state.renditionStatuses[renditionNumber] = 'Pendiente';
    }

    persistState();
    form.reset();
    render();
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Agregar gasto';
  }
});

render();

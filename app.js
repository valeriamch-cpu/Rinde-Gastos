const form = document.querySelector('#expense-form');
const table = document.querySelector('#expenses-table');
const tbody = table.querySelector('tbody');
const emptyState = document.querySelector('#empty-state');
const totals = document.querySelector('#totals');
const countElement = document.querySelector('#count');
const totalAmountElement = document.querySelector('#total-amount');

const entries = [];
const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

function fileListToNames(fileList) {
  if (!fileList || fileList.length === 0) {
    return ['Sin respaldos adjuntos'];
  }

  return Array.from(fileList).map((file) => file.name);
}

function render() {
  tbody.innerHTML = '';

  if (entries.length === 0) {
    emptyState.hidden = false;
    table.hidden = true;
    totals.hidden = true;
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
      <td>${currencyFormatter.format(entry.amount)}</td>
      <td>${entry.backups.join('<br>')}</td>
    `;
    tbody.appendChild(row);
  });

  countElement.textContent = String(entries.length);
  totalAmountElement.textContent = currencyFormatter.format(totalAmount);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const amount = Number(formData.get('amount'));

  const newEntry = {
    employee: String(formData.get('employee')).trim(),
    expenseType: String(formData.get('expenseType')).trim(),
    amount,
    backups: fileListToNames(form.querySelector('#backups').files),
  };

  entries.push(newEntry);
  form.reset();
  render();
});

render();

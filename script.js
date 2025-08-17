// ======= State =======
let transactions = JSON.parse(localStorage.getItem("transactions_v2") || "[]");
let filterType = "all";     // all | income | expense
let filterCat  = "all";     // specific category or all

// ======= Elements =======
const el = (id) => document.getElementById(id);
const listEl        = el("transactionList");
const balanceEl     = el("balance");
const incomeEl      = el("income");
const expenseEl     = el("expense");

const descEl        = el("desc");
const amountEl      = el("amount");
const typeEl        = el("type");
const catEl         = el("category");
const dateEl        = el("date");

const addBtn        = el("addBtn");
const resetBtn      = el("resetBtn");
const clearAllBtn   = el("clearAll");
const toastEl       = el("toast");

const chipButtons   = Array.from(document.querySelectorAll(".chip"));
const filterCatEl   = el("filterCategory");

let pieChart, barChart;

// ======= Helpers =======
const save = () => localStorage.setItem("transactions_v2", JSON.stringify(transactions));
const showToast = (msg) => {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1600);
};
const formatMoney = (n) => "₹" + Number(n).toLocaleString("en-IN");

// Group by (generic)
function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item);
    acc[k] = acc[k] || [];
    acc[k].push(item);
    return acc;
  }, {});
}

// ======= Render =======
function render(){
  // Apply filters
  const filtered = transactions.filter(t => {
    const typeOk = filterType === "all" || t.type === filterType;
    const catOk  = filterCat === "all" || t.category === filterCat;
    return typeOk && catOk;
  });

  // Totals
  const income = transactions.filter(t => t.type === "income")
    .reduce((a,t) => a + t.amount, 0);
  const expense = transactions.filter(t => t.type === "expense")
    .reduce((a,t) => a + t.amount, 0);
  const balance = income - expense;

  balanceEl.textContent = formatMoney(balance);
  incomeEl.textContent  = formatMoney(income);
  expenseEl.textContent = formatMoney(expense);

  // List
  listEl.innerHTML = "";
  if(filtered.length === 0){
    const empty = document.createElement("div");
    empty.style.color = "#7c7f94";
    empty.style.padding = "6px 2px 4px";
    empty.textContent = "No transactions yet.";
    listEl.appendChild(empty);
  } else {
    filtered
      .sort((a,b) => new Date(b.date) - new Date(a.date))
      .forEach(t => listEl.appendChild(txItem(t)));
  }

  // Charts
  renderCharts();
  save();
}

function txItem(t){
  const li = document.createElement("li");
  li.className = `tx ${t.type}`;

  const left = document.createElement("div");
  const title = document.createElement("div");
  title.className = "tx-title";
  title.textContent = t.desc;

  const meta = document.createElement("div");
  meta.className = "tx-meta";

  const badgeType = document.createElement("span");
  badgeType.className = `badge ${t.type}`;
  badgeType.textContent = t.type === "income" ? "Income" : "Expense";

  const badgeCat = document.createElement("span");
  badgeCat.className = "badge";
  badgeCat.textContent = t.category;

  const badgeDate = document.createElement("span");
  badgeDate.className = "badge";
  badgeDate.textContent = new Date(t.date).toLocaleDateString("en-IN");

  meta.append(badgeType, badgeCat, badgeDate);
  left.append(title, meta);

  const right = document.createElement("div");
  right.className = "tx-actions";

  const amt = document.createElement("span");
  amt.className = "amount";
  amt.textContent = (t.type === "expense" ? "-" : "+") + formatMoney(t.amount);

  const editBtn = document.createElement("button");
  editBtn.className = "icon-btn";
  editBtn.title = "Edit";
  editBtn.innerText = "✏️";
  editBtn.onclick = () => editTx(t.id);

  const delBtn = document.createElement("button");
  delBtn.className = "icon-btn";
  delBtn.title = "Delete";
  delBtn.innerText = "🗑️";
  delBtn.onclick = () => deleteTx(t.id);

  right.append(amt, editBtn, delBtn);
  li.append(left, right);
  return li;
}

// ======= CRUD =======
function addTx(){
  const desc = descEl.value.trim();
  const amount = parseFloat(amountEl.value);
  const type = typeEl.value;
  const category = catEl.value;
  const date = dateEl.value || new Date().toISOString().slice(0,10);

  if(!desc || isNaN(amount) || amount <= 0){
    showToast("Enter valid description and amount");
    return;
  }

  transactions.push({
    id: Date.now(),
    desc, amount, type, category, date
  });

  animatePress(addBtn);
  clearForm(false);
  showToast("Transaction added");
  render();
}

function editTx(id){
  const t = transactions.find(x => x.id === id);
  if(!t) return;
  descEl.value   = t.desc;
  amountEl.value = t.amount;
  typeEl.value   = t.type;
  catEl.value    = t.category;
  dateEl.value   = t.date;
  // remove old – will be re-added on save
  transactions = transactions.filter(x => x.id !== id);
  render();
}

function deleteTx(id){
  transactions = transactions.filter(t => t.id !== id);
  showToast("Transaction deleted");
  render();
}

function clearAll(){
  if(!transactions.length) return;
  if(confirm("Delete all transactions?")){
    transactions = [];
    render();
    showToast("All cleared");
  }
}

function clearForm(notify=true){
  descEl.value = "";
  amountEl.value = "";
  // keep last selected type/category for faster entry
  dateEl.value = "";
  if(notify) showToast("Form reset");
}

function animatePress(btn){
  btn.style.transform = "scale(.96)";
  setTimeout(()=> btn.style.transform = "scale(1)", 120);
}

// ======= Charts =======
function renderCharts(){
  // Pie: expense by category
  const exp = transactions.filter(t => t.type === "expense");
  const byCat = groupBy(exp, t => t.category);
  const labels = Object.keys(byCat);
  const data = labels.map(l => byCat[l].reduce((a,t)=>a+t.amount,0));

  if(pieChart) pieChart.destroy();
  pieChart = new Chart(document.getElementById("pieChart"), {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          "#ff9a9e","#fad0c4","#fbc2eb","#a18cd1","#f6d365","#96e6a1","#84fab0"
        ]
      }]
    }
  });

  // Bar: monthly net (income - expense)
  const byMonth = groupBy(transactions, t => {
    const d = new Date(t.date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  });
  const months = Object.keys(byMonth).sort();
  const netData = months.map(m => {
    const list = byMonth[m];
    const inc = list.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0);
    const exp = list.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0);
    return inc - exp;
  });

  if(barChart) barChart.destroy();
  barChart = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: months,
      datasets: [{
        label: "Net",
        data: netData,
        backgroundColor: netData.map(v => v >= 0 ? "#81c784" : "#ff8a80")
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// ======= Events =======
addBtn.addEventListener("click", addTx);
resetBtn.addEventListener("click", () => clearForm(true));
clearAllBtn.addEventListener("click", clearAll);

chipButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    chipButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filterType = btn.dataset.type; // all | income | expense
    render();
  });
});

filterCatEl.addEventListener("change", () => {
  filterCat = filterCatEl.value;
  render();
});

// Set default date to today
dateEl.value = new Date().toISOString().slice(0,10);

// ======= Init =======
render();

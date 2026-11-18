const $ = id => document.getElementById(id);
const customer = () => $("customer").value.trim() || "guest";
let products = [];

async function json(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.status === 202 || response.status === 204 ? null : response.json();
}

async function loadProducts() {
  products = await json("/api/products");
  $("products").replaceChildren(...products.map(product => {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = product.name;
    const price = document.createElement("span");
    price.textContent = `$${product.price.toFixed(2)}`;
    const button = document.createElement("button");
    button.textContent = "Order";
    button.disabled = !product.inStock;
    button.onclick = () => placeOrder(product.id);
    item.append(name, price, button);
    return item;
  }));
}

async function placeOrder(productId) {
  await json("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customer: customer(), productId, quantity: 1 }),
  });
  await loadOrders();
}

async function loadOrders() {
  const orders = await json(`/api/orders?customer=${encodeURIComponent(customer())}`);
  $("orders").replaceChildren(...orders.map(order => {
    const row = document.createElement("tr");
    const name = products.find(p => p.id === order.productId)?.name ?? order.productId;
    for (const value of [order.number, name, order.quantity, order.status, new Date(order.placedAt).toLocaleString()]) {
      row.insertCell().textContent = value;
    }
    row.onclick = () => showOrder(order.number);
    return row;
  }));
}

async function showOrder(number) {
  const { order, tracking } = await json(`/api/orders/${encodeURIComponent(number)}`);
  $("detail").hidden = false;
  $("detail-number").textContent = order.number;
  $("detail-status").textContent = `Status: ${order.status}`;
  $("tracking").replaceChildren(...tracking.map(update => {
    const item = document.createElement("li");
    item.textContent = `${new Date(update.receivedAt).toLocaleString()}: ${update.status ?? "update"} ${update.location ?? ""}`;
    return item;
  }));
}

$("customer").onchange = loadOrders;
await loadProducts();
await loadOrders();
setInterval(loadOrders, 5000);

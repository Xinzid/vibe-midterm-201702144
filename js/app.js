// ===== 카페 메뉴 주문 및 확인 웹앱 =====

// ----- 기본 메뉴 데이터 (음료 5종) -----
const MENU_DEFAULT = [
  { id: "americano",      name: "아메리카노", price: 4000, stock: 10, img: "images/americano.svg" },
  { id: "latte",          name: "카페라떼",   price: 4500, stock: 10, img: "images/latte.svg" },
  { id: "vanilla-latte",  name: "바닐라라떼", price: 5000, stock: 10, img: "images/vanilla-latte.svg" },
  { id: "cappuccino",     name: "카푸치노",   price: 4800, stock: 10, img: "images/cappuccino.svg" },
  { id: "green-tea-latte", name: "녹차라떼",  price: 5200, stock: 10, img: "images/green-tea-latte.svg" },
];

const SHOT_PRICE = 500;   // 샷 추가 +500원
const SYRUP_PRICE = 0;    // 시럽 추가 +0원

// ----- localStorage 저장소 -----
const KEY_MENU = "cafe_menu";
const KEY_CART = "cafe_cart";
const KEY_ORDERS = "cafe_orders";

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let menu = load(KEY_MENU, MENU_DEFAULT);
let cart = load(KEY_CART, []);
let orders = load(KEY_ORDERS, []);

// 옵션 선택 상태 (메뉴별 샷/시럽)
const optionState = {};

function persist() {
  save(KEY_MENU, menu);
  save(KEY_CART, cart);
  save(KEY_ORDERS, orders);
}

// ----- 유틸 -----
function formatPrice(n) {
  return n.toLocaleString("ko-KR");
}
function getMenu(id) {
  return menu.find((m) => m.id === id);
}
function optionLabel(shot, syrup) {
  const parts = [];
  if (shot > 0) parts.push(`샷 ${shot}회`);
  if (syrup) parts.push("시럽 추가");
  return parts.length ? `(${parts.join(", ")})` : "";
}

// ===== 고객: 메뉴 렌더링 =====
function renderMenu() {
  const list = document.getElementById("menu-list");
  list.innerHTML = "";

  menu.forEach((item) => {
    if (!optionState[item.id]) {
      optionState[item.id] = { shot: 0, syrup: false };
    }
    const opt = optionState[item.id];
    const soldOut = item.stock <= 0;

    const card = document.createElement("div");
    card.className = "menu-card" + (soldOut ? " soldout" : "");
    card.dataset.id = item.id;
    card.innerHTML = `
      <img src="${item.img}" alt="${item.name}" />
      <div class="menu-name">${item.name}</div>
      <div class="menu-price">${formatPrice(item.price)}원</div>
      <div class="menu-stock">재고: ${item.stock}개 ${
        soldOut ? '<span class="soldout-badge">품절</span>' : ""
      }</div>
      <div class="option-row">
        <span class="option-label">샷 추가 (+${SHOT_PRICE}원)</span>
        <div class="stepper">
          <button type="button" data-action="shot-minus" ${opt.shot <= 0 ? "disabled" : ""}>−</button>
          <span class="count">${opt.shot}</span>
          <button type="button" data-action="shot-plus" ${opt.shot >= 3 ? "disabled" : ""}>+</button>
        </div>
      </div>
      <div class="option-row">
        <label class="option-label" for="syrup-${item.id}">시럽 추가 (+${SYRUP_PRICE}원)</label>
        <input type="checkbox" id="syrup-${item.id}" data-action="syrup" ${opt.syrup ? "checked" : ""} />
      </div>
      <button type="button" class="btn primary" data-action="add" ${soldOut ? "disabled" : ""}>
        ${soldOut ? "품절" : "장바구니 담기"}
      </button>
    `;
    list.appendChild(card);
  });
}

// ===== 고객: 장바구니 렌더링 =====
function renderCart() {
  const list = document.getElementById("cart-list");
  const totalEl = document.getElementById("cart-total");

  if (cart.length === 0) {
    list.innerHTML = '<li class="cart-empty">장바구니가 비어 있습니다.</li>';
    totalEl.textContent = "0";
    return;
  }

  list.innerHTML = "";
  cart.forEach((item, idx) => {
    const li = document.createElement("li");
    li.className = "cart-item";
    li.innerHTML = `
      <div class="cart-item-top">
        <span class="cart-item-name">${item.name}</span>
        <span>${formatPrice(item.unitPrice * item.qty)}원</span>
      </div>
      <div class="cart-item-opts">${optionLabel(item.shot, item.syrup)} · 단가 ${formatPrice(item.unitPrice)}원</div>
      <div class="cart-item-bottom">
        <div class="cart-qty">
          <button type="button" data-action="qty-minus" data-idx="${idx}">−</button>
          <span>${item.qty}</span>
          <button type="button" data-action="qty-plus" data-idx="${idx}">+</button>
        </div>
        <button type="button" class="btn small danger" data-action="remove" data-idx="${idx}">삭제</button>
      </div>
    `;
    list.appendChild(li);
  });

  totalEl.textContent = formatPrice(calcTotal());
}

function calcTotal() {
  return cart.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
}

// ===== 고객: 장바구니 담기 =====
function addToCart(menuId) {
  const item = getMenu(menuId);
  if (!item || item.stock <= 0) return;

  const opt = optionState[menuId];
  const shot = opt.shot;
  const syrup = opt.syrup;
  const unitPrice = item.price + shot * SHOT_PRICE + (syrup ? SYRUP_PRICE : 0);

  const existing = cart.find(
    (c) => c.menuId === menuId && c.shot === shot && c.syrup === syrup
  );
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ menuId, name: item.name, shot, syrup, unitPrice, qty: 1 });
  }
  persist();
  renderCart();
}

// ===== 고객: 주문하기 (재고 차감 + 품절 처리) =====
function placeOrder() {
  if (cart.length === 0) {
    alert("장바구니가 비어 있습니다.");
    return;
  }

  // 재고 확인
  for (const it of cart) {
    const m = getMenu(it.menuId);
    if (!m || m.stock < it.qty) {
      alert(`"${it.name}"의 재고가 부족합니다. (남은 재고: ${m ? m.stock : 0}개)`);
      return;
    }
  }

  // 재고 차감
  cart.forEach((it) => {
    const m = getMenu(it.menuId);
    m.stock -= it.qty;
    if (m.stock <= 0) m.stock = 0; // 품절
  });

  // 주문 생성
  const order = {
    id: "ORD-" + String(Date.now()).slice(-6),
    items: cart.map((it) => ({ ...it })),
    total: calcTotal(),
    time: new Date().toLocaleString("ko-KR"),
    status: "received", // received → done
  };
  orders.unshift(order);

  cart = [];
  persist();
  renderMenu();
  renderCart();
  alert(`주문이 접수되었습니다.\n주문번호: ${order.id}\n합계: ${formatPrice(order.total)}원`);
}

// ===== 이벤트 위임: 메뉴 목록 =====
document.getElementById("menu-list").addEventListener("click", (e) => {
  const card = e.target.closest(".menu-card");
  if (!card) return;
  const id = card.dataset.id;
  const action = e.target.dataset.action;
  const opt = optionState[id];

  if (action === "shot-plus") {
    opt.shot = Math.min(3, opt.shot + 1);
  } else if (action === "shot-minus") {
    opt.shot = Math.max(0, opt.shot - 1);
  } else if (action === "add") {
    addToCart(id);
    return;
  } else {
    return;
  }
  renderMenu();
});

// 시럽 체크박스
document.getElementById("menu-list").addEventListener("change", (e) => {
  if (e.target.dataset.action === "syrup") {
    const card = e.target.closest(".menu-card");
    optionState[card.dataset.id].syrup = e.target.checked;
  }
});

// ===== 이벤트 위임: 장바구니 =====
document.getElementById("cart-list").addEventListener("click", (e) => {
  const action = e.target.dataset.action;
  const idx = Number(e.target.dataset.idx);
  if (action === "qty-plus") {
    const it = cart[idx];
    const m = getMenu(it.menuId);
    if (m && it.qty + 1 > m.stock) {
      alert(`"${it.name}"의 재고가 부족합니다. (남은 재고: ${m.stock}개)`);
      return;
    }
    it.qty += 1;
  } else if (action === "qty-minus") {
    if (cart[idx].qty <= 1) {
      cart.splice(idx, 1);
    } else {
      cart[idx].qty -= 1;
    }
  } else if (action === "remove") {
    cart.splice(idx, 1);
  } else {
    return;
  }
  persist();
  renderCart();
});

// ===== 화면 전환: 고객 / 관리자 =====
const viewTabs = document.querySelectorAll(".main-tabs .tab");
viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    viewTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.getElementById("view-" + tab.dataset.view).classList.add("active");
  });
});

// ===== 관리자 탭 전환: 주문 현황 / 재고 현황 =====
const adminTabs = document.querySelectorAll(".admin-tabs .tab");
adminTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    adminTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".admin-panel").forEach((p) => p.classList.remove("active"));
    document.getElementById("admin-" + tab.dataset.admin).classList.add("active");
  });
});

// ===== 관리자: 주문 현황 렌더링 =====
function renderOrders() {
  const list = document.getElementById("order-list");
  if (orders.length === 0) {
    list.innerHTML = '<p class="empty-msg">접수된 주문이 없습니다.</p>';
    return;
  }

  list.innerHTML = "";
  orders.forEach((order, idx) => {
    const itemsText = order.items
      .map((it) => `${it.name}${optionLabel(it.shot, it.syrup)} × ${it.qty}`)
      .join(", ");
    const done = order.status === "done";

    const card = document.createElement("div");
    card.className = "order-card";
    card.innerHTML = `
      <div class="order-head">
        <span class="order-id">${order.id}</span>
        <span class="order-time">${order.time}</span>
        <span class="status ${done ? "done" : "received"}">${done ? "제조완료" : "접수"}</span>
      </div>
      <div class="order-items">${itemsText}</div>
      <div class="order-total">합계: ${formatPrice(order.total)}원</div>
      ${
        done
          ? ""
          : `<button type="button" class="btn outline small" data-action="done" data-idx="${idx}">제조 완료 처리</button>`
      }
    `;
    list.appendChild(card);
  });
}

document.getElementById("order-list").addEventListener("click", (e) => {
  if (e.target.dataset.action === "done") {
    orders[Number(e.target.dataset.idx)].status = "done";
    persist();
    renderOrders();
  }
});

// ===== 관리자: 재고 현황 렌더링 =====
function renderStock() {
  const tbody = document.getElementById("stock-list");
  tbody.innerHTML = "";

  menu.forEach((item) => {
    const soldOut = item.stock <= 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${formatPrice(item.price)}원</td>
      <td>${item.stock}개</td>
      <td class="${soldOut ? "soldout-text" : "instock-text"}">${soldOut ? "품절" : "판매중"}</td>
      <td><button type="button" class="btn small outline" data-action="restock" data-id="${item.id}">+1 보충</button></td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById("stock-list").addEventListener("click", (e) => {
  if (e.target.dataset.action === "restock") {
    const m = getMenu(e.target.dataset.id);
    m.stock += 1;
    persist();
    renderStock();
    renderMenu();
  }
});

document.getElementById("stock-reset").addEventListener("click", () => {
  if (confirm("모든 메뉴의 재고를 10개로 초기화할까요?")) {
    menu.forEach((m) => (m.stock = 10));
    persist();
    renderStock();
    renderMenu();
  }
});

document.getElementById("order-btn").addEventListener("click", placeOrder);

// ===== 초기 렌더링 =====
renderMenu();
renderCart();
renderOrders();
renderStock();

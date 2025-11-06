/* ============================================================
   app.js — Charity4 Compatible Version (Multi-Image + Category)
   ============================================================ */

let web3;
let contract;
let accounts;
let web3Modal;
let provider;
let readOnlyWeb3;
let kpgtToUsdRate = 0;

// -------------------------------------------------------------
// 🔗 Multiple RPC endpoints to try
// -------------------------------------------------------------
const RPC_ENDPOINTS = [
  "https://rpc1.paseo.mandalachain.io",
  "https://rpc2.paseo.mandalachain.io",
  "https://rpc.mandalachain.io",
];

// -------------------------------------------------------------
// 🔔 Notification helper
// -------------------------------------------------------------
function showNotification(message, type = "info", ttl = 5000) {
  const container = document.getElementById("toastContainer");
  if (!container) return console.log(message);
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="title">${message}</div><button class="close">✕</button>`;
  container.appendChild(toast);
  toast.querySelector(".close").addEventListener("click", () => toast.remove());
  setTimeout(() => toast.remove(), ttl);
}

// -------------------------------------------------------------
// 💱 Fetch KPGT/USD rate
// -------------------------------------------------------------
async function fetchKPGTtoUSD() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=kpg-token&vs_currencies=usd"
    );
    const data = await res.json();
    kpgtToUsdRate = data["kpg-token"]?.usd || 0;
  } catch (err) {
    kpgtToUsdRate = 0;
  }
}

// -------------------------------------------------------------
// 🌐 Create Web3 with fallback RPC
// -------------------------------------------------------------
async function createWeb3WithFallback() {
  for (const rpcUrl of RPC_ENDPOINTS) {
    try {
      console.log(`Trying RPC endpoint: ${rpcUrl}`);
      const testWeb3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
      await testWeb3.eth.getBlockNumber();
      console.log(`✅ Connected to ${rpcUrl}`);
      return testWeb3;
    } catch (err) {
      console.warn(`❌ Failed to connect: ${rpcUrl}`);
    }
  }
  throw new Error("Could not connect to any RPC endpoint");
}

// -------------------------------------------------------------
// 🔌 Wallet button helpers
// -------------------------------------------------------------
function setWalletButton(address) {
  const btn = document.getElementById("connectWallet");
  const disc = document.getElementById("disconnectWallet");
  if (!btn || !disc) return;
  btn.innerText = `${address.slice(0, 6)}...${address.slice(-4)}`;
  disc.style.display = "inline-block";
}
function clearWalletButtonUI() {
  const btn = document.getElementById("connectWallet");
  const disc = document.getElementById("disconnectWallet");
  if (!btn || !disc) return;
  btn.innerText = "Connect Wallet";
  disc.style.display = "none";
}

// -------------------------------------------------------------
// 🔌 Disconnect Wallet
// -------------------------------------------------------------
async function disconnectWallet() {
  try {
    if (provider?.disconnect) await provider.disconnect();
    if (web3Modal) await web3Modal.clearCachedProvider();
  } catch (err) {
    console.warn("Disconnect error:", err);
  }
  provider = null;
  accounts = null;
  contract = null;
  clearWalletButtonUI();
  showNotification("Wallet disconnected", "info");
  loadCampaigns();
}

// -------------------------------------------------------------
// 🧩 Initialize Read-only Web3
// -------------------------------------------------------------
async function initReadOnlyWeb3() {
  try {
    readOnlyWeb3 = await createWeb3WithFallback();
    console.log("✅ Read-only Web3 ready");
  } catch (err) {
    console.error("❌ Failed to init read-only Web3:", err);
    showNotification("Blockchain connection failed", "error");
  }
}

// -------------------------------------------------------------
// 🧱 Initialize Web3Modal
// -------------------------------------------------------------
function initWeb3Modal() {
  if (typeof window.Web3Modal === "undefined") {
    console.error("Web3Modal not loaded");
    return;
  }

  const providerOptions = {
    walletconnect: {
      package: window.WalletConnectProvider.default,
      options: { rpc: { 4818: RPC_ENDPOINTS[0] }, chainId: 4818 },
    },
    "custom-metamask": {
      display: {
        logo: "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg",
        name: "MetaMask",
        description: "Connect using MetaMask",
      },
      package: true,
      connector: async () => {
        if (!window.ethereum) throw new Error("No MetaMask Wallet found");
        await window.ethereum.request({ method: "eth_requestAccounts" });
        return window.ethereum;
      },
    },
  };

  web3Modal = new window.Web3Modal.default({
    network: "mandala",
    cacheProvider: true,
    providerOptions,
    theme: "dark",
  });
}

// -------------------------------------------------------------
// 🔗 Connect Wallet
// -------------------------------------------------------------
async function connectWallet() {
  try {
    provider = await web3Modal.connect();
    web3 = new Web3(provider);

    const chainId = await web3.eth.getChainId();
    if (chainId !== 4818) {
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x12D2" }],
        });
      } catch (err) {
        console.warn("Switch network failed", err);
      }
    }

    accounts = await web3.eth.getAccounts();
    setWalletButton(accounts[0]);
    contract = new web3.eth.Contract(contractABI, contractAddress);
    showNotification("✅ Wallet Connected", "success");
    loadCampaigns();

    provider.on("accountsChanged", (accs) =>
      accs.length ? setWalletButton(accs[0]) : disconnectWallet()
    );
    provider.on("chainChanged", () => window.location.reload());
    provider.on("disconnect", () => disconnectWallet());
  } catch (err) {
    console.error("Connection failed:", err);
    if (err.message !== "Modal closed by user") {
      showNotification("❌ Failed to connect wallet", "error");
    }
  }
}

// -------------------------------------------------------------
// 🔁 Auto reconnect wallet
// -------------------------------------------------------------
async function reconnectWallet() {
  if (web3Modal?.cachedProvider) {
    try {
      await connectWallet();
    } catch (err) {
      console.error("Auto reconnect failed:", err);
    }
  }
}

// -------------------------------------------------------------
// 📦 Load Campaigns (with categories + multi-images)
// -------------------------------------------------------------
async function loadCampaigns(page = 0, limit = 10) {
  const activeWeb3 = web3 || readOnlyWeb3;
  if (!activeWeb3) return;

  const list = document.getElementById("campaignList");
  if (!list) return;
  list.classList.add("loading");

  const categoryDisplayMap = {
    medical: "🏥 Medical",
    education: "🎓 Education",
    emergency: "🚨 Emergency",
    community: "🏘️ Community",
    other: "💡 Other",
    default: "💡 Other",
  };

  try {
    const offset = page * limit;
    const readContract = new activeWeb3.eth.Contract(contractABI, contractAddress);
    const result = await readContract.methods
      .getActiveCampaignsPaginated(offset, limit)
      .call();

    const campaigns = result[0] || [];
    list.innerHTML = "";

    if (!campaigns.length) {
      list.innerHTML = `<div style="text-align:center;padding:3rem;">No active campaigns yet.</div>`;
      return;
    }

    for (let i = 0; i < campaigns.length; i++) {
      const c = campaigns[i];
      const id = c.id;
      const images = c.imageURLs?.length ? c.imageURLs : ["placeholder.jpg"];
      const hasMultiple = images.length > 1;
      const category = c.category || "other";
      const categoryDisplay =
        categoryDisplayMap[category.toLowerCase()] || categoryDisplayMap.default;

      const raised = parseFloat(activeWeb3.utils.fromWei(c.totalRaised || "0", "ether"));
      const goal = parseFloat(activeWeb3.utils.fromWei(c.goal || "0", "ether"));
      const platformFee = parseFloat(activeWeb3.utils.fromWei(c.platformFee || "0", "ether"));

      const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
      const goalUSD = kpgtToUsdRate ? ` (~$${(goal * kpgtToUsdRate).toFixed(2)})` : "";
      const raisedUSD = kpgtToUsdRate ? ` (~$${(raised * kpgtToUsdRate).toFixed(2)})` : "";

      // Image HTML
      let imageHTML = "";
      if (hasMultiple) {
        imageHTML = `
          <div class="campaign-image-container">
            <img src="${images[0]}" class="campaign-main-image" onerror="this.src='placeholder.jpg'">
            <button class="carousel-arrow prev">‹</button>
            <button class="carousel-arrow next">›</button>
            <div class="image-dots">
              ${images.map((_, j) => `<div class="dot ${j === 0 ? "active" : ""}" data-index="${j}"></div>`).join("")}
            </div>
          </div>
        `;
      } else {
        imageHTML = `<img src="${images[0]}" onerror="this.src='placeholder.jpg'">`;
      }

      const card = document.createElement("div");
      card.className = "campaign-card";
      card.setAttribute("data-category", category);
      card.innerHTML = `
        ${imageHTML}
        <div class="category-badge">${categoryDisplay}</div>
        <h3>${c.title}</h3>
        <p>${(c.description || "").slice(0, 120)}...</p>
        <p class="owner-info"><strong>${c.ownerName || "Anonymous"}</strong><br><small>${c.ownerContact || ""}</small></p>
        <div class="progress-container">
          <div class="progress-bar-wrapper">
            <div class="progress-fill" style="width:${progress}%;"></div>
          </div>
          <div class="progress-text">${progress.toFixed(0)}%</div>
        </div>
        <p><strong>${raised.toFixed(2)}</strong>${raisedUSD} / ${goal.toFixed(2)}${goalUSD} KPGT</p>
        ${platformFee > 0 ? `<p class="fee-info">Fee: ${platformFee.toFixed(2)} KPGT</p>` : ""}
        <a href="donate.html?id=${id}" class="btn-primary" style="display:block;text-align:center;margin-top:0.75rem;">View Details</a>
      `;

      // Carousel handling
      if (hasMultiple) {
        const container = card.querySelector(".campaign-image-container");
        const mainImage = container.querySelector(".campaign-main-image");
        const prevBtn = container.querySelector(".prev");
        const nextBtn = container.querySelector(".next");
        const dots = container.querySelectorAll(".dot");
        let currentIndex = 0;

        const updateImage = (idx) => {
          mainImage.src = images[idx];
          dots.forEach((d, i) => d.classList.toggle("active", i === idx));
          currentIndex = idx;
        };

        prevBtn.addEventListener("click", () =>
          updateImage(currentIndex > 0 ? currentIndex - 1 : images.length - 1)
        );
        nextBtn.addEventListener("click", () =>
          updateImage(currentIndex < images.length - 1 ? currentIndex + 1 : 0)
        );
        dots.forEach((dot, idx) => dot.addEventListener("click", () => updateImage(idx)));
      }

      list.appendChild(card);
    }
  } catch (err) {
    console.error("Failed to load campaigns:", err);
    showNotification("Failed to load campaigns", "error");
  } finally {
    list.classList.remove("loading");
  }
}

// -------------------------------------------------------------
// 🧭 DOM Ready
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("disconnectWallet")?.addEventListener("click", disconnectWallet);
  document.getElementById("connectWallet")?.addEventListener("click", connectWallet);
  await initReadOnlyWeb3();
  initWeb3Modal();
  fetchKPGTtoUSD();
  await loadCampaigns();
  reconnectWallet();
});

// -------------------------------------------------------------
// 📜 Footer Loader
// -------------------------------------------------------------
fetch("Footer.html")
  .then((res) => res.text())
  .then((data) => (document.getElementById("footer").innerHTML = data));

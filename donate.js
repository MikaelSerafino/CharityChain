// donate.js – Enhanced with timestamps, fee preview, gallery, carousel, and WITHDRAW button

let web3;
let contract;
let accounts;
let readOnlyWeb3;
let platformFeePercent = 250; // Default 2.5%
const KPGT_SYMBOL = "KPGT";

// Global variables for image carousel
let campaignImages = [];
let currentImageIndex = 0;

// --- Toast notification ---
function showNotification(message, type = "info", ttl = 5000) {
  const container = document.getElementById("toastContainer");
  if (!container) return alert(message);
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="title">${message}</div><button class="close">✕</button>`;
  container.appendChild(toast);
  toast.querySelector(".close").addEventListener("click", () => toast.remove());
  setTimeout(() => toast.remove(), ttl);
}

// --- Loading overlay ---
function showLoading(show, message = "Processing...") {
  let overlay = document.getElementById("loadingOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.innerHTML = `<div class="spinner"></div><span id="loadingText">${message}</span>`;
    document.body.appendChild(overlay);
  }
  const loadingText = overlay.querySelector('#loadingText');
  if (loadingText) loadingText.textContent = message;
  overlay.style.display = show ? "flex" : "none";
}

// --- Initialize read-only Web3 ---
function initReadOnlyWeb3() {
  readOnlyWeb3 = new Web3("https://rpc1.paseo.mandalachain.io");
  const readContract = new readOnlyWeb3.eth.Contract(
    contractABI,
    contractAddress
  );
  return readContract;
}

// --- Connect wallet ---
async function connectWallet() {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    const stored = localStorage.getItem("connectedWallet");

    if (stored) {
      accounts = [stored];
      setWalletButton(stored);
      contract = new web3.eth.Contract(contractABI, contractAddress);
      loadCampaign();
    }

    const connectBtn = document.getElementById("connectWallet");
    if (connectBtn) {
      connectBtn.addEventListener("click", async () => {
        try {
          await window.ethereum.request({ method: "eth_requestAccounts" });
          accounts = await web3.eth.getAccounts();
          localStorage.setItem("connectedWallet", accounts[0]);
          setWalletButton(accounts[0]);
          contract = new web3.eth.Contract(contractABI, contractAddress);
          loadCampaign();
          showNotification("Wallet connected", "success");
        } catch {
          showNotification("Wallet connection failed", "error");
        }
      });
    }

    const disconnectBtn = document.getElementById("disconnectWallet");
    if (disconnectBtn) {
      disconnectBtn.addEventListener("click", () => {
        localStorage.removeItem("connectedWallet");
        accounts = null;
        contract = null;
        clearWalletButtonUI();
        showNotification("Wallet disconnected", "info");
        // Reload to hide withdraw button if visible
        loadCampaign();
      });
    }
  } else {
    showNotification("Please install MetaMask!", "error");
  }
}

function setWalletButton(address) {
  const btn = document.getElementById("connectWallet");
  if (!btn) return;
  btn.innerText = address.slice(0, 6) + "..." + address.slice(-4);
  const disc = document.getElementById("disconnectWallet");
  if (disc) disc.style.display = "inline-block";
}

function clearWalletButtonUI() {
  const btn = document.getElementById("connectWallet");
  if (btn) btn.innerText = "Connect Wallet";
  const disc = document.getElementById("disconnectWallet");
  if (disc) disc.style.display = "none";
}

// --- Calculate and display fee breakdown ---
function updateFeeBreakdown(amount) {
  const feeBreakdownEl = document.getElementById("feeBreakdown");
  if (!feeBreakdownEl || !amount || amount <= 0) {
    if (feeBreakdownEl) feeBreakdownEl.innerHTML = "";
    return;
  }

  const fee = (parseFloat(amount) * platformFeePercent) / 10000;
  const netAmount = parseFloat(amount) - fee;

  feeBreakdownEl.innerHTML = `
    <div class="fee-breakdown-box">
      <p><strong>Your Donation:</strong> ${parseFloat(amount).toFixed(4)} KPGT</p>
      <p><strong>Platform Fee (${(platformFeePercent / 100).toFixed(1)}%):</strong> ${fee.toFixed(4)} KPGT</p>
      <p><strong>Campaign Receives:</strong> ${netAmount.toFixed(4)} KPGT</p>
    </div>
  `;
}

// --- Format timestamp to readable date ---
function formatTimestamp(timestamp) {
  if (!timestamp || timestamp === "0") return "Unknown";
  const date = new Date(parseInt(timestamp) * 1000);
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleString("en-US", options);
}

// --- Image carousel functions ---
function changeDetailImage(direction) {
  if (!campaignImages.length) return;
  
  const totalImages = campaignImages.length;
  currentImageIndex = (currentImageIndex + direction + totalImages) % totalImages;
  setDetailImage(currentImageIndex);
}

function setDetailImage(index) {
  if (!campaignImages.length) return;
  
  const imgElement = document.getElementById('campaignImage');
  const dots = document.querySelectorAll('.campaign-hero .dot');
  
  if (imgElement) {
    imgElement.src = campaignImages[index];
    imgElement.onerror = () => {
      imgElement.src = 'placeholder.jpg';
    };
  }
  
  // Update dots
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
  
  currentImageIndex = index;
}

function createHeroCarousel(images) {
  const campaignImage = document.getElementById('campaignImage');
  if (!campaignImage || images.length <= 1) return;

  const heroSection = campaignImage.closest('.campaign-hero');
  if (!heroSection) return;

  // Remove existing carousel controls if any
  const existingControls = heroSection.querySelectorAll('.carousel-arrow, .image-dots');
  existingControls.forEach(el => el.remove());

  // Create carousel HTML
  const carouselHTML = `
    <button class="carousel-arrow prev" onclick="changeDetailImage(-1)">‹</button>
    <button class="carousel-arrow next" onclick="changeDetailImage(1)">›</button>
    <div class="image-dots">
      ${images.map((_, i) => `
        <div class="dot ${i === 0 ? 'active' : ''}" 
             onclick="setDetailImage(${i})" 
             data-index="${i}"></div>
      `).join('')}
    </div>
  `;

  heroSection.insertAdjacentHTML('beforeend', carouselHTML);
}

// ====== WITHDRAW FUNDS FUNCTION ======
async function withdrawFundsManually(campaignId) {
  try {
    if (!contract || !accounts || !accounts.length) {
      showNotification("⚠️ Please connect your wallet first", "error");
      return;
    }

    const confirmed = confirm("Are you sure you want to withdraw all available funds for this campaign?");
    if (!confirmed) return;

    showNotification("Processing withdrawal...", "info");
    showLoading(true, "Submitting withdrawal transaction...");

    const tx = await contract.methods
      .withdrawFunds(campaignId)
      .send({
        from: accounts[0],
      })
      .on("transactionHash", (hash) => {
        console.log("Withdraw transaction hash:", hash);
        showLoading(true, "Waiting for confirmation...");
      })
      .on("receipt", (receipt) => {
        console.log("Withdraw receipt:", receipt);
      });

    console.log("Withdraw transaction completed:", tx.transactionHash);
    showLoading(false);
    showNotification("✅ Funds withdrawn successfully!", "success");
    
    // Reload campaign to update display
    await loadCampaign();
  } catch (err) {
    showLoading(false);
    console.error("Withdraw failed:", err);
    
    let errorMessage = "Withdraw failed. ";
    if (err.message.includes("No funds to withdraw")) {
      errorMessage += "No funds available to withdraw.";
    } else if (err.message.includes("Not campaign owner")) {
      errorMessage += "You are not the campaign owner.";
    } else if (err.message.includes("Campaign not finished")) {
      errorMessage += "Campaign is not finished yet.";
    } else if (err.message.includes("User denied")) {
      errorMessage = "Transaction cancelled by user.";
    } else {
      errorMessage += "Check console for details.";
    }
    
    showNotification("❌ " + errorMessage, "error");
  }
}

// --- Load campaign info ---
async function loadCampaign() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const activeContract = contract || initReadOnlyWeb3();
  const activeWeb3 = web3 || readOnlyWeb3;

  if (!activeContract) return;

  try {
    const c = await activeContract.methods.getCampaign(id).call();

    document.getElementById("campaignTitle").innerText = c.title;
    document.getElementById("campaignDesc").innerText = c.description;

    const goalKPGT = parseFloat(activeWeb3.utils.fromWei(c.goal, "ether"));
    const raisedKPGT = parseFloat(
      activeWeb3.utils.fromWei(c.totalRaised, "ether")
    );
    const platformFeeKPGT = parseFloat(
      activeWeb3.utils.fromWei(c.platformFee, "ether")
    );

    document.getElementById("goal").innerText = goalKPGT.toFixed(4);
    document.getElementById("raised").innerText = raisedKPGT.toFixed(4);
    document.getElementById("ownerName").innerText = c.ownerName;
    document.getElementById("ownerContact").innerText = c.ownerContact;

    // --- Handle hero image and carousel ---
    const campaignImage = document.getElementById('campaignImage');
    if (campaignImage) {
      campaignImages = c.imageURLs && c.imageURLs.length > 0 ? c.imageURLs : [c.imageURL || 'placeholder.jpg'];
      currentImageIndex = 0;
      
      // Set initial image
      campaignImage.src = campaignImages[0];
      campaignImage.onerror = () => {
        campaignImage.src = 'placeholder.jpg';
      };

      // Create carousel if multiple images
      if (campaignImages.length > 1) {
        createHeroCarousel(campaignImages);
      }
    }

    // --- Progress bar with platform fee visualization ---
    const progressBar = document.getElementById("progressBar");
    const progressPercent = document.getElementById("progressPercent");
    const goalEl = document.getElementById("goal");
    const raisedEl = document.getElementById("raised");

    if (progressBar && progressPercent && goalEl && raisedEl) {
      const totalProgress =
        goalKPGT > 0 && !isNaN(raisedKPGT) && !isNaN(goalKPGT)
          ? Math.min((raisedKPGT / goalKPGT) * 100, 100)
          : 0;

      // Update progress bar with animation (using CSS custom property)
      progressBar.style.setProperty("--progress-width", `${totalProgress}%`);
      progressPercent.textContent = `${totalProgress.toFixed(1)}%`;

      // Update goal and raised amounts
      goalEl.textContent = goalKPGT.toFixed(4);
      raisedEl.textContent = raisedKPGT.toFixed(4);
    }

    // --- Gallery for multiple images ---
    const gallery = document.getElementById("campaignGallery");
    if (gallery) {
      gallery.innerHTML = "";
      const urls =
        c.imageURLs && c.imageURLs.length > 0 ? c.imageURLs : [c.imageURL];

      if (urls.length === 1) {
        const img = document.createElement("img");
        img.src = urls[0];
        img.className = "campaign-image-single";
        img.alt = "Campaign";
        img.onerror = function () {
          this.src = "placeholder.jpg";
        };
        gallery.appendChild(img);
      } else {
        gallery.className = "image-carousel";
        urls.forEach((url, index) => {
          const img = document.createElement("img");
          img.src = url;
          img.className = `gallery-img ${index === 0 ? "active" : ""}`;
          img.alt = `Campaign Image ${index + 1}`;
          img.onerror = function () {
            this.src = "placeholder.jpg";
          };
          img.onclick = () => {
            document
              .querySelectorAll(".gallery-img")
              .forEach((i) => i.classList.remove("active"));
            img.classList.add("active");
          };
          gallery.appendChild(img);
        });
      }
    }

    // --- Fetch and display platform fee ---
    platformFeePercent = await activeContract.methods
      .getPlatformFeePercent()
      .call();
    const feeInfoEl = document.getElementById("feeInfo");
    if (feeInfoEl) {
      feeInfoEl.innerText = `Platform Fee: ${(platformFeePercent / 100).toFixed(
        2
      )}% • Expected Fee: ${platformFeeKPGT.toFixed(4)} KPGT`;
    }

    // ====== ADD WITHDRAW BUTTON IF OWNER AND FINISHED ======
    const currentAddress = accounts && accounts[0] ? accounts[0].toLowerCase() : null;
    const ownerAddress = c.ownerWallet.toLowerCase();
    const isFinished = c.finished;
    const donateBox = document.querySelector(".donate-box");
    
    console.log("Campaign status check (donate page):");
    console.log("- Current address:", currentAddress);
    console.log("- Owner address:", ownerAddress);
    console.log("- Is finished:", isFinished);
    console.log("- Is owner:", currentAddress === ownerAddress);
    
    // Remove existing withdraw button if any
    const existingWithdrawBtn = document.getElementById("withdrawBtn");
    if (existingWithdrawBtn) {
      existingWithdrawBtn.remove();
    }

    // Check if current user is owner AND campaign is finished
    if (currentAddress && currentAddress === ownerAddress && isFinished && donateBox) {
      // Check if there are pending withdrawals
      const pendingAmount = await activeContract.methods.pendingWithdrawals(id).call();
      const pendingKPGT = parseFloat(activeWeb3.utils.fromWei(pendingAmount, "ether"));
      
      console.log("- Pending withdrawals:", pendingKPGT, "KPGT");
      
      if (pendingKPGT > 0) {
        const withdrawBtn = document.createElement("button");
        withdrawBtn.id = "withdrawBtn";
        withdrawBtn.className = "btn-primary full-width";
        withdrawBtn.style.marginTop = "1rem";
        withdrawBtn.style.background = "linear-gradient(135deg, #ff9800, #ff5722)";
        withdrawBtn.innerHTML = `💰 Withdraw Funds<br><small style="font-size: 0.85em; font-weight: normal;">(${pendingKPGT.toFixed(4)} KPGT available)</small>`;
        withdrawBtn.onclick = () => withdrawFundsManually(id);
        
        donateBox.appendChild(withdrawBtn);
        console.log("✅ Withdraw button added for campaign owner");
      } else if (pendingKPGT === 0) {
        console.log("ℹ️ No pending funds to withdraw (already withdrawn or auto-paid)");
        
        // Show info that funds were already withdrawn
        const infoDiv = document.createElement("div");
        infoDiv.style.cssText = `
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(0, 192, 119, 0.1);
          border: 1px solid rgba(0, 192, 119, 0.3);
          border-radius: 8px;
          text-align: center;
          font-size: 0.9rem;
        `;
        infoDiv.innerHTML = `<strong>✅ Funds Already Withdrawn</strong>`;
        donateBox.appendChild(infoDiv);
      }
    } else if (!isFinished) {
      console.log("ℹ️ Campaign is still active (not finished)");
    }

    loadDonations(id);
  } catch (err) {
    console.error("Error loading campaign:", err);
    showNotification("Failed to load campaign details", "error");
  }
}

// --- Donation history with timestamps ---
async function loadDonations(id) {
  const activeContract = contract || initReadOnlyWeb3();
  const activeWeb3 = web3 || readOnlyWeb3;

  try {
    const donations = await activeContract.methods.getDonations(id).call();
    const list = document.getElementById("donationList");

    if (!list) return;
    list.innerHTML = "";

    if (donations.length === 0) {
      list.innerHTML =
        "<li class='no-donations'>No donations yet. Be the first!</li>";
      return;
    }

    [...donations].reverse().forEach((d) => {
      const amountKPGT = parseFloat(
        activeWeb3.utils.fromWei(d.amount, "ether")
      );
      const dateTime = formatTimestamp(d.timestamp);

      const li = document.createElement("li");
      li.className = "donation-item";
      li.innerHTML = `
        <div class="donation-header">
          <strong class="donor-address">${d.donor.slice(
            0,
            8
          )}...${d.donor.slice(-6)}</strong>
          <span class="donation-amount">${amountKPGT.toFixed(4)} KPGT</span>
        </div>
        <div class="donation-date">${dateTime}</div>
      `;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading donations:", err);
  }
}

// --- Initialize on page load ---
document.addEventListener("DOMContentLoaded", () => {
  connectWallet();

  if (!contract) {
    loadCampaign();
  }

  const donateAmountInput = document.getElementById("donateAmount");
  if (donateAmountInput) {
    donateAmountInput.addEventListener("input", (e) => {
      updateFeeBreakdown(e.target.value);
    });
  }

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.innerText = new Date().getFullYear();
});

// --- Donation process ---
const donateBtn = document.getElementById("donateBtn");
if (donateBtn) {
  donateBtn.addEventListener("click", async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const amount = document.getElementById("donateAmount").value;

    if (!accounts || accounts.length === 0) {
      showNotification("Please connect your wallet first", "error");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      showNotification("Enter a valid amount", "info");
      return;
    }

    const amountWei = web3.utils.toWei(amount, "ether");
    const fee = (parseFloat(amount) * platformFeePercent) / 10000;

    try {
      showNotification(
        `Donating ${amount} KPGT (${fee.toFixed(4)} KPGT platform fee)...`,
        "info"
      );
      donateBtn.disabled = true;
      donateBtn.textContent = "Processing...";
      showLoading(true, "Submitting donation...");

      await contract.methods
        .donate(id)
        .send({ from: accounts[0], value: amountWei })
        .on("transactionHash", (hash) => {
          showLoading(true, "Transaction submitted...");
          console.log("Transaction hash:", hash);
        })
        .on("receipt", async (receipt) => {
          showLoading(false);
          showNotification("✅ Donation successful! Thank you!", "success");

          document.getElementById("donateAmount").value = "";
          updateFeeBreakdown(0);

          await loadCampaign();

          const c = await contract.methods.getCampaign(id).call();
          const raised = parseFloat(web3.utils.fromWei(c.totalRaised, "ether"));
          const goal = parseFloat(web3.utils.fromWei(c.goal, "ether"));

          if (raised >= goal) {
            showNotification("🎉 Campaign goal reached!", "success");
          }
        })
        .on("error", (err) => {
          showLoading(false);
          console.error(err);
          showNotification("❌ Transaction failed", "error");
        });
    } catch (err) {
      showLoading(false);
      console.error(err);
      showNotification("❌ Donation failed: " + err.message, "error");
    } finally {
      donateBtn.disabled = false;
      donateBtn.textContent = "Donate Now";
    }
  });
}

// Load Footer
fetch("Footer.html")
  .then((res) => res.text())
  .then((data) => {
    document.getElementById("footer").innerHTML = data;
  });
/* Complete create_campaign.js with all features:
   - Multiple image support (up to 5)
   - Platform fee preview
   - Real-time fee calculation
   - Live preview updates
   - Fee breakdown display
*/

(async function () {
  let platformFeePercent = 250; // Default 2.5% in basis points

  // === Utility: Notification ===
  function notify(msg, type = "info", ttl = 4000) {
    if (typeof showNotification === "function") {
      showNotification(msg, type, ttl);
    } else {
      console.log(`[${type}] ${msg}`);
      const container = document.getElementById("toastContainer");
      if (container) {
        const t = document.createElement("div");
        t.className = `toast ${type}`;
        t.innerHTML = `<div class="title">${msg}</div><button class="close">✕</button>`;
        container.appendChild(t);
        t.querySelector(".close").addEventListener("click", () => t.remove());
        setTimeout(() => t.remove(), ttl);
      }
    }
  }

  // === Loading Overlay ===
  function showLoading(show, text = "Processing...") {
    let o = document.getElementById("loadingOverlay");
    if (!o) {
      o = document.createElement("div");
      o.id = "loadingOverlay";
      o.innerHTML = `<div class="spinner"></div><span id="loadingText">${text}</span>`;
      document.body.appendChild(o);
    }
    const txt = document.getElementById("loadingText");
    if (txt) txt.innerText = text;
    o.style.display = show ? "flex" : "none";
  }

  // === DOM References ===
  const form = document.getElementById("createCampaignForm");
  const goalInput = document.getElementById("goal");
  const feePreviewEl = document.getElementById("feePreview");
  const imageContainer = document.getElementById("imageContainer");
  const previewTitle = document.getElementById("previewTitle");
  const previewDesc = document.getElementById("previewDesc");
  const previewGoal = document.getElementById("previewGoal");
  const previewImageContainer = document.getElementById(
    "previewImageContainer"
  );

  // === Fetch Platform Fee Percent ===
  async function fetchPlatformFeePercent() {
    try {
      const readOnly = new Web3("https://rpc1.paseo.mandalachain.io");
      const readContract = new readOnly.eth.Contract(
        contractABI,
        contractAddress
      );
      const pct = await readContract.methods.getPlatformFeePercent().call();
      platformFeePercent = parseInt(pct || platformFeePercent, 10);
      updateFeePreview();
    } catch (err) {
      console.warn("Could not fetch platform fee percent, using default", err);
      updateFeePreview();
    }
  }

  // === Calculate Platform Fee ===
  function calculatePlatformFee(goal) {
    const g = parseFloat(goal || 0);
    if (!g || isNaN(g)) return 0;
    return (g * platformFeePercent) / 10000;
  }

  // === Update Fee Preview ===
  function updateFeePreview() {
    if (!feePreviewEl) return;
    const goalVal = parseFloat(goalInput?.value || 0) || 0;
    const fee = calculatePlatformFee(goalVal);
    const net = Math.max(goalVal - fee, 0);

    feePreviewEl.innerHTML = `
      <div class="fee-breakdown">
        <p><strong>💰 Goal Amount:</strong> ${goalVal.toFixed(4)} KPGT</p>
        <p style="color: #ff9800;"><strong>🏛️ Platform Fee (${(
          platformFeePercent / 100
        ).toFixed(2)}%):</strong> ${fee.toFixed(4)} KPGT</p>
        <p style="color: #00c077;"><strong>✅ You'll Receive:</strong> ${net.toFixed(
          4
        )} KPGT</p>
        <p class="small" style="margin-top: 0.5rem; font-style: italic;">
          Note: The platform fee is deducted from donations and shown separately in the progress bar (orange portion).
        </p>
      </div>
    `;
  }

  // === Add Image Input Field ===
  window.addImageField = function addImageField() {
    if (!imageContainer) return;
    const count = imageContainer.querySelectorAll("input.image-url").length;
    if (count >= 5) {
      notify("Maximum 5 images allowed", "info");
      return;
    }
    const div = document.createElement("div");
    div.className = "image-input-group";
    div.innerHTML = `
      <input 
        type="text" 
        class="image-url" 
        placeholder="https://example.com/image${count + 1}.jpg" 
      />
      <button type="button" class="btn-remove">✕</button>
    `;
    const btnRemove = div.querySelector(".btn-remove");
    btnRemove.addEventListener("click", () => {
      div.remove();
      updateImagePreview();
    });
    imageContainer.appendChild(div);

    const inp = div.querySelector("input.image-url");
    inp.addEventListener("input", updateImagePreview);
  };

  // === Update Preview Images ===
  function updateImagePreview() {
    if (!previewImageContainer) return;
    const inputs = imageContainer.querySelectorAll("input.image-url");
    const urls = Array.from(inputs)
      .map((i) => i.value.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      previewImageContainer.innerHTML = `<img src="https://placehold.co/400x200/green/white?text=Campaign+Preview" alt="Preview" />`;
    } else if (urls.length === 1) {
      previewImageContainer.innerHTML = `<img src="${urls[0]}" alt="Preview" onerror="this.src='https://placehold.co/400x200/green/white?text=Image+Error'"/>`;
    } else {
      const gallery = urls
        .map(
          (u, idx) =>
            `<img src="${u}" class="gallery-img ${
              idx === 0 ? "active" : ""
            }" alt="Image ${
              idx + 1
            }" onerror="this.src='https://placehold.co/150x150/green/white?text=Error'"/>`
        )
        .join("");
      previewImageContainer.innerHTML = `<div class="image-carousel">${gallery}</div>`;

      // Add click handlers for gallery
      previewImageContainer.querySelectorAll(".gallery-img").forEach((img) => {
        img.addEventListener("click", () => {
          previewImageContainer
            .querySelectorAll(".gallery-img")
            .forEach((i) => i.classList.remove("active"));
          img.classList.add("active");
        });
      });
    }
  }

  // === Wire Live Preview ===
  function wireLivePreview() {
    document.getElementById("title")?.addEventListener("input", (e) => {
      if (previewTitle)
        previewTitle.innerText = e.target.value || "Your Campaign Title";
    });
    document.getElementById("description")?.addEventListener("input", (e) => {
      if (previewDesc)
        previewDesc.innerText =
          e.target.value || "Description will appear here...";
    });
    document.getElementById("goal")?.addEventListener("input", (e) => {
      if (previewGoal) previewGoal.innerText = e.target.value || "0";
      updateFeePreview();
    });
  }

  // === Form Submit Handler ===
  async function handleSubmit(e) {
    e.preventDefault();
    showLoading(true, "Creating campaign...");

    try {
      // Get web3 instance
      let localWeb3 = window.web3;
      let localAccounts = window.accounts;
      let localContract = window.contract;

      if (!localWeb3 || !localAccounts || !localContract) {
        if (!window.ethereum) {
          notify("Please install MetaMask or connect via wallet.", "error");
          showLoading(false);
          return;
        }
        localWeb3 = new Web3(window.ethereum);
        localAccounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        localContract = new localWeb3.eth.Contract(
          contractABI,
          contractAddress
        );
      }

      // Collect form values
      const title = (document.getElementById("title")?.value || "").trim();
      const description = (
        document.getElementById("description")?.value || ""
      ).trim();
      const goalStr = (document.getElementById("goal")?.value || "").trim();
      const ownerName = (
        document.getElementById("ownerName")?.value || ""
      ).trim();
      const ownerContact = (
        document.getElementById("ownerContact")?.value || ""
      ).trim();
      const category = (
        document.getElementById("category")?.value || "other"
      ).trim();
      const imageInputs = imageContainer.querySelectorAll("input.image-url");
      const images = Array.from(imageInputs)
        .map((i) => i.value.trim())
        .filter(Boolean);

      // Validation
      if (!title || !description || !goalStr || !ownerName || !ownerContact) {
        notify("Please fill all required fields", "error");
        showLoading(false);
        return;
      }

      if (images.length === 0) {
        notify("Please add at least one campaign image", "error");
        showLoading(false);
        return;
      }

      const goalValue = parseFloat(goalStr);
      if (isNaN(goalValue) || goalValue <= 0) {
        notify("Please enter a valid goal amount", "error");
        showLoading(false);
        return;
      }

      // Convert goal to wei
      const goalWei = localWeb3.utils.toWei(goalStr, "ether");

      // Calculate and show fee notice
      const feeKPGT = calculatePlatformFee(goalValue);
      notify(
        `Platform fee will be ${feeKPGT.toFixed(4)} KPGT (${(
          platformFeePercent / 100
        ).toFixed(2)}%)`,
        "info",
        6000
      );

      // Get sender address
      const from = localAccounts[0] || (await localWeb3.eth.getAccounts())[0];

      // Send transaction
      showLoading(true, "Submitting to blockchain...");
      const tx = await localContract.methods
        .createCampaign(
          title,
          description,
          images,
          goalWei,
          ownerName,
          ownerContact,
          category,
          from
        )
        .send({ from });

      // Success
      notify("✅ Campaign created successfully!", "success", 4000);

      // Extract campaign info
      let newCampaign = {
        title,
        description,
        imageURLs: images,
        goal: goalWei,
      };

      try {
        if (tx?.events?.CampaignCreated?.returnValues) {
          const rv = tx.events.CampaignCreated.returnValues;
          newCampaign.id = rv.campaignId ?? rv.id;
          newCampaign.platformFee = rv.platformFee ?? newCampaign.platformFee;
        }
      } catch (err) {
        console.warn("Could not extract event data", err);
      }

      // Dispatch event
      window.dispatchEvent(
        new CustomEvent("CampaignCreated", { detail: newCampaign })
      );

      // Set localStorage flag
      try {
        localStorage.setItem("newCampaignCreated", "true");
        setTimeout(() => localStorage.removeItem("newCampaignCreated"), 10000);
      } catch (err) {
        console.warn("localStorage set failed", err);
      }

      // Redirect
      setTimeout(() => {
        window.location.href = "home.html";
      }, 1200);
    } catch (err) {
      console.error("Create campaign error:", err);
      notify(
        "❌ Failed to create campaign: " + (err.message || err),
        "error",
        6000
      );
    } finally {
      showLoading(false);
    }
  }

  // === Initialize ===
  async function init() {
    // Fetch platform fee
    await fetchPlatformFeePercent();

    // Add first image input if none exist
    if (
      imageContainer &&
      imageContainer.querySelectorAll("input.image-url").length === 0
    ) {
      const first = document.createElement("div");
      first.className = "image-input-group";
      first.innerHTML = `
        <input 
          class="image-url" 
          type="text"
          placeholder="https://example.com/image1.jpg" 
          required
        />
      `;
      imageContainer.appendChild(first);
      first
        .querySelector("input")
        .addEventListener("input", updateImagePreview);
    } else {
      // Wire existing inputs
      imageContainer?.querySelectorAll("input.image-url")?.forEach((i) => {
        i.addEventListener("input", updateImagePreview);
      });
    }

    // Wire form
    form?.addEventListener("submit", handleSubmit);

    // Wire previews
    wireLivePreview();

    // Initial updates
    updateFeePreview();
    updateImagePreview();
  }

  // Run init on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// Load Footer
fetch("Footer.html")
  .then(res => res.text())
  .then(data => {
    document.getElementById("footer").innerHTML = data;
  });

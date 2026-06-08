// ==================== CONFIGURATION & STATE ====================
let state = {
    contracts: [],
    history: []
};

// Mode & Status
let isDemoMode = false;
let gasUrl = localStorage.getItem('pawnshop_gas_url') || "https://script.google.com/macros/s/AKfycbxSJ30EnzRb4O7QDkvhFqAWYOPWpoUI4St3cD3DvCF6DW9v-J_5sfLCheddzbmCDPdPCg/exec";

// Dummy/Demo Data to show when offline or first time
const dummyContracts = [
    {
        Ma_HD: "HD0001",
        Ten_Khach_Hang: "Nguyễn Văn A",
        So_Dien_Thoai: "0987654321",
        Loai_Tai_San: "Honda",
        Chi_Tiet_Tai_San: "29X1-12345",
        So_Tien_Cam: 10000000,
        Ngay_Cam: "2026-05-15",
        Trang_Thai: "Active",
        Ghi_Chu: "Xe Honda Wave màu xanh đen",
        Hinh_Anh: ""
    },
    {
        Ma_HD: "HD0002",
        Ten_Khach_Hang: "Trần Thị B",
        So_Dien_Thoai: "0961234567",
        Loai_Tai_San: "Điện thoại",
        Chi_Tiet_Tai_San: "iPhone 14 Pro Max 256GB",
        So_Tien_Cam: 15000000,
        Ngay_Cam: "2026-06-01",
        Trang_Thai: "Active",
        Ghi_Chu: "Máy trầy nhẹ viền, pin 88%",
        Hinh_Anh: ""
    }
];

const dummyHistory = [
    {
        Ma_Giao_Dich: "GD0001",
        Ma_HD: "HD0001",
        Ten_Khach_Hang: "Nguyễn Văn A",
        Ngay_Dong_Lai: "2026-06-01",
        So_Tien_Dong: 350000,
        Ghi_Chu: "Đóng lãi đợt 1 (15 ngày)"
    }
];

// ==================== LIFE CYCLE EVENTS ====================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Check Login
    checkLoginState();
    
    // 2. Setup input elements & forms
    if (document.getElementById('contract-date')) {
        document.getElementById('contract-date').value = new Date().toISOString().split('T')[0];
    }
    
    // Set initially active tab link style
    const initialTab = 'new-contract';
    updateTabUI(initialTab);
    
    // 3. Form input change listeners for Live Preview
    const formFields = ['customer-name', 'customer-phone', 'asset-type', 'asset-detail', 'loan-amount-input', 'contract-date'];
    formFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateReceiptPreview);
            el.addEventListener('change', updateReceiptPreview);
        }
    });
    
    // 4. Form Submit Handlers
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const newContractForm = document.getElementById('new-contract-form');
    if (newContractForm) {
        newContractForm.addEventListener('submit', handleCreateContract);
    }
    
    const payInterestForm = document.getElementById('pay-interest-form');
    if (payInterestForm) {
        payInterestForm.addEventListener('submit', handlePayInterest);
    }
    
    const closeContractForm = document.getElementById('close-contract-form');
    if (closeContractForm) {
        closeContractForm.addEventListener('submit', handleCloseContract);
    }
    
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSaveSettings);
    }
    
    // 5. Initialize settings fields
    if (document.getElementById('setting-gas-url')) {
        document.getElementById('setting-gas-url').value = gasUrl;
    }
    
    // 6. Load QR code thành base64 cache cho PDF export
    loadQRBase64();
    
    // 7. Refresh data
    syncData();
});

// Load QR image thành base64 và cache lại
function loadQRBase64() {
    // Thử load từ file qr_base64.txt trước
    fetch('qr_base64.txt')
        .then(res => res.text())
        .then(base64Text => {
            window._qrBase64Cache = base64Text.trim();
        })
        .catch(() => {
            // Fallback: convert qr.jpg sang base64
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                try {
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    window._qrBase64Cache = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
                } catch(e) {
                    window._qrBase64Cache = '';
                }
            };
            img.onerror = function() { window._qrBase64Cache = ''; };
            img.src = 'qr.jpg';
        });
}

// ==================== AUTHENTICATION ====================
function checkLoginState() {
    // TEMPORARILY BYPASS LOGIN FOR SMOOTH DEVELOPMENT
    sessionStorage.setItem('pawnshop_logged_in', 'true');
    const isLoggedIn = true;
    
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    
    if (isLoggedIn) {
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
    } else {
        loginScreen.classList.remove('hidden');
        appScreen.classList.add('hidden');
    }
}

function handleLogin(e) {
    e.preventDefault();
    const userVal = document.getElementById('username').value.trim();
    const passVal = document.getElementById('password').value;
    
    if (userVal === "camdo86" && passVal === "Tiemcamdo86@123") {
        sessionStorage.setItem('pawnshop_logged_in', 'true');
        showToast("Đăng nhập thành công!", "success");
        checkLoginState();
        syncData();
    } else {
        showToast("Sai tài khoản hoặc mật khẩu!", "error");
    }
}

function logout() {
    sessionStorage.removeItem('pawnshop_logged_in');
    showToast("Đã đăng xuất!", "info");
    window.location.reload();
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('password-eye-icon');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

// ==================== SETTINGS & STATUS ====================
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.classList.remove('hidden');
    if (document.getElementById('setting-gas-url')) {
        document.getElementById('setting-gas-url').value = gasUrl;
    }
}

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
}

function handleSaveSettings(e) {
    e.preventDefault();
    const urlVal = document.getElementById('setting-gas-url').value.trim();
    gasUrl = urlVal;
    localStorage.setItem('pawnshop_gas_url', urlVal);
    closeSettingsModal();
    showToast("Đã lưu cấu hình API Google Sheets!", "success");
    syncData();
}

function updateDatabaseStatus() {
    const badge = document.getElementById('mode-badge');
    const statusText = document.getElementById('db-status');
    
    if (gasUrl) {
        isDemoMode = false;
        if (badge) {
            badge.innerText = "Online";
            badge.className = "text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        }
        if (statusText) {
            statusText.innerText = "Google Sheets API";
            statusText.className = "font-semibold text-emerald-400";
        }
    } else {
        isDemoMode = true;
        if (badge) {
            badge.innerText = "Demo Mode";
            badge.className = "text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20";
        }
        if (statusText) {
            statusText.innerText = "Trình duyệt (Local)";
            statusText.className = "font-semibold text-amber-400";
        }
    }
}

// ==================== DATA SYNCING ====================
async function syncData() {
    updateDatabaseStatus();
    showLoading(true, "Đang tải dữ liệu...");
    
    if (isDemoMode) {
        let localContracts = localStorage.getItem('pawnshop_contracts');
        let localHistory = localStorage.getItem('pawnshop_history');
        
        if (localContracts) {
            state.contracts = JSON.parse(localContracts);
        } else {
            state.contracts = dummyContracts;
            localStorage.setItem('pawnshop_contracts', JSON.stringify(dummyContracts));
        }
        
        if (localHistory) {
            state.history = JSON.parse(localHistory);
        } else {
            state.history = dummyHistory;
            localStorage.setItem('pawnshop_history', JSON.stringify(dummyHistory));
        }
        
        showLoading(false);
        renderAll();
    } else {
        try {
            const response = await fetch(gasUrl);
            const resData = await response.json();
            
            if (resData.success) {
                state.contracts = resData.data.contracts || [];
                state.history = resData.data.history || [];
                
                localStorage.setItem('pawnshop_contracts', JSON.stringify(state.contracts));
                localStorage.setItem('pawnshop_history', JSON.stringify(state.history));
                
                showToast("Đồng bộ thành công!", "success");
            } else {
                throw new Error(resData.error || "Lỗi không xác định");
            }
        } catch (err) {
            console.error("Fetch API error:", err);
            showToast("Lỗi kết nối API Google Sheets. Đang dùng dữ liệu cache offline.", "error");
            
            let localContracts = localStorage.getItem('pawnshop_contracts') || "[]";
            let localHistory = localStorage.getItem('pawnshop_history') || "[]";
            state.contracts = JSON.parse(localContracts);
            state.history = JSON.parse(localHistory);
        } finally {
            showLoading(false);
            renderAll();
        }
    }
}

async function postToAPI(payload) {
    if (isDemoMode) return { success: true };
    try {
        const response = await fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        return { success: true };
    } catch (err) {
        console.error("POST API error:", err);
        return { success: false, error: err.toString() };
    }
}

// ==================== INTEREST CALCULATIONS ====================
function calculateInterest(principal, assetType, days) {
    if (days <= 0) return 0;
    
    if (assetType === 'Honda') {
        let rate10 = 0, rate20 = 0, rate30 = 0;
        
        if (principal <= 3000000) {
            rate10 = 0.10; rate20 = 0.15; rate30 = 0.20;
        } else if (principal <= 4000000) {
            rate10 = 0.08; rate20 = 0.12; rate30 = 0.15;
        } else if (principal <= 5000000) {
            rate10 = 0.04; rate20 = 0.08; rate30 = 0.10;
        } else if (principal <= 16000000) {
            rate10 = 0.03; rate20 = 0.05; rate30 = 0.07;
        } else {
            rate10 = 0.02; rate20 = 0.04; rate30 = 0.05;
        }
        
        if (days <= 30) {
            if (days <= 10) return principal * rate10;
            if (days <= 20) return principal * rate20;
            return principal * rate30;
        } else {
            const cycles = Math.floor(days / 30);
            const rem = days % 30;
            let interest = principal * rate30 * cycles;
            if (rem > 0) {
                if (rem <= 10) interest += principal * rate10;
                else if (rem <= 20) interest += principal * rate20;
                else interest += principal * rate30;
            }
            return interest;
        }
    } else {
        const weeks = Math.ceil(days / 7);
        return weeks * 0.02 * principal;
    }
}

function getContractStats(contract) {
    const loanDate = new Date(contract.Ngay_Cam);
    const currentDate = new Date();
    
    loanDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    
    const diffTime = Math.max(0, currentDate - loanDate);
    const elapsedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const principal = parseFloat(contract.So_Tien_Cam) || 0;
    const accrued = calculateInterest(principal, contract.Loai_Tai_San, elapsedDays);
    
    const collected = state.history
        .filter(item => item.Ma_HD === contract.Ma_HD && !item.Ghi_Chu.includes("Chuộc đồ"))
        .reduce((sum, item) => sum + (parseFloat(item.So_Tien_Dong) || 0), 0);
        
    return {
        days: elapsedDays,
        accrued: Math.round(accrued),
        collected: Math.round(collected)
    };
}

function getInterestFromTransaction(item) {
    const amount = parseFloat(item.So_Tien_Dong) || 0;
    if (item.Ghi_Chu.includes("Tất toán") || item.Ghi_Chu.includes("Chuộc đồ")) {
        const contract = state.contracts.find(c => c.Ma_HD === item.Ma_HD);
        if (contract) {
            const principal = parseFloat(contract.So_Tien_Cam) || 0;
            return Math.max(0, amount - principal);
        }
    }
    return amount;
}

function getStartOfWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
}

// Helper: Get start of current month (1st of month at 00:00:00)
function getStartOfMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    return start;
}

// ==================== RENDERING FRONTEND ====================
function renderAll() {
    renderDashboard();
    renderActiveContracts();
    renderPaymentHistory();
    renderStatistics();
}

function renderDashboard() {
    const active = state.contracts.filter(c => c.Trang_Thai === 'Active');
    
    let totalPrincipal = 0;
    let totalAccrued = 0;
    let totalCollected = 0;
    
    active.forEach(c => {
        totalPrincipal += parseFloat(c.So_Tien_Cam) || 0;
        const stats = getContractStats(c);
        totalAccrued += stats.accrued;
    });
    
    state.history.forEach(item => {
        totalCollected += parseFloat(item.So_Tien_Dong) || 0;
    });
    
    document.getElementById('stat-active-count').innerText = active.length;
    document.getElementById('stat-total-principal').innerText = formatVND(totalPrincipal);
    document.getElementById('stat-accrued-interest').innerText = formatVND(totalAccrued);
    document.getElementById('stat-total-collected').innerText = formatVND(totalCollected);
}

function renderActiveContracts() {
    const container = document.getElementById('active-contracts-grid');
    const emptyState = document.getElementById('active-empty-state');
    if (!container) return;
    
    container.innerHTML = "";
    const active = state.contracts.filter(c => c.Trang_Thai === 'Active');
    
    if (active.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    
    active.forEach(c => {
        const stats = getContractStats(c);
        const card = document.createElement('div');
        card.className = "glass-card p-6 rounded-3xl relative overflow-hidden border border-slate-800 bg-slate-800/40 hover:bg-slate-800/60 transition duration-300 flex flex-col justify-between cursor-pointer";
        card.setAttribute("onclick", `openContractDetailsModal('${c.Ma_HD}')`);
        
        let imgHtml = "";
        if (c.Hinh_Anh) {
            const displayUrl = formatImageUrl(c.Hinh_Anh);
            imgHtml = `
                <div class="mt-4 relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900/60 h-28 cursor-zoom-in" onclick="event.stopPropagation(); openLightbox('${displayUrl}')">
                    <img src="${displayUrl}" class="w-full h-full object-cover">
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <span class="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">${c.Ma_HD}</span>
                    <span class="text-xs px-2.5 py-0.5 rounded-full font-medium ${c.Loai_Tai_San === 'Honda' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-accent-500/10 text-accent-400 border border-accent-500/20'}">${c.Loai_Tai_San}</span>
                </div>
                
                <div>
                    <h4 class="text-lg font-bold text-white">${c.Ten_Khach_Hang}</h4>
                    <p class="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <i class="fa-solid fa-phone text-[10px]"></i> ${c.So_Dien_Thoai}
                    </p>
                </div>
                
                <div class="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div class="flex justify-between">
                        <span class="text-slate-400">Chi tiết:</span>
                        <span class="text-white font-semibold">${c.Chi_Tiet_Tai_San}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Ngày cầm:</span>
                        <span class="text-white font-semibold">${c.Ngay_Cam}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Số ngày đã cầm:</span>
                        <span class="text-brand-400 font-bold">${stats.days} ngày</span>
                    </div>
                    <div class="flex justify-between border-t border-slate-800 pt-2 text-sm">
                        <span class="text-slate-400 font-medium">Số tiền cầm:</span>
                        <span class="text-emerald-400 font-extrabold">${formatVND(c.So_Tien_Cam)}</span>
                    </div>
                </div>

                <div class="bg-accent-500/5 p-4 rounded-2xl border border-accent-500/10 space-y-1.5 text-xs">
                    <div class="flex justify-between">
                        <span class="text-slate-400">Lãi tích lũy:</span>
                        <span class="text-accent-400 font-extrabold">${formatVND(stats.accrued)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Đã đóng lãi:</span>
                        <span class="text-purple-400 font-bold">${formatVND(stats.collected)}</span>
                    </div>
                    <div class="flex justify-between border-t border-slate-800 pt-1.5 text-slate-200">
                        <span>Lãi còn nợ:</span>
                        <span class="font-bold text-amber-500">${formatVND(Math.max(0, stats.accrued - stats.collected))}</span>
                    </div>
                </div>

                ${imgHtml}

                ${c.Ghi_Chu ? `<p class="text-[11px] text-slate-500 italic mt-2"><span class="font-semibold not-italic">Ghi chú:</span> ${c.Ghi_Chu}</p>` : ""}
            </div>
            
            <div class="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-800/50">
                <button onclick="event.stopPropagation(); openPayInterestModal('${c.Ma_HD}', '${c.Ten_Khach_Hang}', ${stats.accrued - stats.collected})" 
                    class="py-2.5 bg-brand-500/10 text-brand-400 hover:bg-brand-500 hover:text-white font-bold rounded-xl text-xs transition duration-200 flex items-center justify-center gap-1.5 border border-brand-500/20">
                    <i class="fa-solid fa-hand-holding-dollar"></i> Đóng Lãi
                </button>
                <button onclick="event.stopPropagation(); openCloseContractModal('${c.Ma_HD}', '${c.Ten_Khach_Hang}', ${c.So_Tien_Cam}, ${stats.accrued - stats.collected})"
                    class="py-2.5 bg-accent-500/10 text-accent-400 hover:bg-accent-500 hover:text-white font-bold rounded-xl text-xs transition duration-200 flex items-center justify-center gap-1.5 border border-accent-500/20">
                    <i class="fa-solid fa-box-open"></i> Chuộc Đồ
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderPaymentHistory() {
    const tableBody = document.getElementById('history-table-body');
    const emptyState = document.getElementById('history-empty-state');
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    if (state.history.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    
    const sorted = [...state.history].sort((a, b) => b.Ma_Giao_Dich.localeCompare(a.Ma_Giao_Dich));
    
    sorted.forEach(item => {
        const row = document.createElement('tr');
        row.className = "hover:bg-slate-800/30 transition duration-150 border-b border-slate-800/80";
        row.innerHTML = `
            <td class="py-4 px-6 font-semibold text-slate-400 text-xs">${item.Ma_Giao_Dich}</td>
            <td class="py-4 px-6 text-brand-400 font-bold text-xs">${item.Ma_HD}</td>
            <td class="py-4 px-6 text-white font-medium">${item.Ten_Khach_Hang}</td>
            <td class="py-4 px-6 text-slate-400">${item.Ngay_Dong_Lai}</td>
            <td class="py-4 px-6 text-right font-extrabold text-emerald-400">${formatVND(item.So_Tien_Dong)}</td>
            <td class="py-4 px-6 text-xs text-slate-300">
                <span class="px-2.5 py-1 rounded-full ${item.Ghi_Chu.includes("Chuộc đồ") ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}">${item.Ghi_Chu}</span>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function renderStatistics() {
    const active = state.contracts.filter(c => c.Trang_Thai === 'Active');
    const activeCount = active.length;
    const totalCapital = active.reduce((sum, c) => sum + (parseFloat(c.So_Tien_Cam) || 0), 0);
    
    const startOfWeek = getStartOfWeek();
    const startOfMonth = getStartOfMonth();
    
    let weekInterest = 0;
    let monthInterest = 0;
    
    state.history.forEach(item => {
        if (!item.Ngay_Dong_Lai) return;
        const txDate = new Date(item.Ngay_Dong_Lai);
        txDate.setHours(0, 0, 0, 0);
        
        const interestAmount = getInterestFromTransaction(item);
        
        if (txDate >= startOfWeek) {
            weekInterest += interestAmount;
        }
        if (txDate >= startOfMonth) {
            monthInterest += interestAmount;
        }
    });
    
    const tabActiveCountEl = document.getElementById('stat-tab-active-count');
    const tabTotalCapitalEl = document.getElementById('stat-tab-total-capital');
    const tabWeekInterestEl = document.getElementById('stat-tab-week-interest');
    const tabMonthInterestEl = document.getElementById('stat-tab-month-interest');
    
    if (tabActiveCountEl) tabActiveCountEl.innerText = activeCount;
    if (tabTotalCapitalEl) tabTotalCapitalEl.innerText = formatVND(totalCapital);
    if (tabWeekInterestEl) tabWeekInterestEl.innerText = formatVND(weekInterest);
    if (tabMonthInterestEl) tabMonthInterestEl.innerText = formatVND(monthInterest);
    
    const assetBody = document.getElementById('stat-asset-table-body');
    if (assetBody) {
        assetBody.innerHTML = "";
        const categories = ["Honda", "Điện thoại", "Laptop", "iPad"];
        
        categories.forEach(cat => {
            const catContracts = active.filter(c => c.Loai_Tai_San === cat);
            const catCapital = catContracts.reduce((sum, c) => sum + (parseFloat(c.So_Tien_Cam) || 0), 0);
            
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-800/20 border-b border-slate-800/50 transition duration-150";
            tr.innerHTML = `
                <td class="py-3 font-semibold text-slate-100">${cat}</td>
                <td class="py-3 text-center font-bold text-brand-400">${catContracts.length} HĐ</td>
                <td class="py-3 text-right font-bold text-emerald-400">${formatVND(catCapital)}</td>
            `;
            assetBody.appendChild(tr);
        });
    }
    
    const recentPaymentsBody = document.getElementById('stat-recent-payments-body');
    if (recentPaymentsBody) {
        recentPaymentsBody.innerHTML = "";
        
        const currentMonthTxs = state.history.filter(item => {
            if (!item.Ngay_Dong_Lai) return false;
            const txDate = new Date(item.Ngay_Dong_Lai);
            txDate.setHours(0, 0, 0, 0);
            return txDate >= startOfMonth;
        }).sort((a, b) => b.Ngay_Dong_Lai.localeCompare(a.Ngay_Dong_Lai));
        
        if (currentMonthTxs.length === 0) {
            recentPaymentsBody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-4 text-center text-slate-500 italic">Chưa có lượt đóng lãi nào trong tháng này.</td>
                </tr>
            `;
        } else {
            currentMonthTxs.forEach(item => {
                const interestAmount = getInterestFromTransaction(item);
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-800/20 border-b border-slate-800/50 transition duration-150";
                tr.innerHTML = `
                    <td class="py-3 text-slate-400">${item.Ngay_Dong_Lai}</td>
                    <td class="py-3 text-brand-400 font-bold">${item.Ma_HD}</td>
                    <td class="py-3 text-slate-200 font-medium">${item.Ten_Khach_Hang}</td>
                    <td class="py-3 text-right font-extrabold text-emerald-400">${formatVND(interestAmount)}</td>
                    <td class="py-3 text-[10px] text-slate-400">
                        <span class="px-2 py-0.5 rounded-full ${item.Ghi_Chu.includes("Chuộc đồ") ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-300'}">${item.Ghi_Chu}</span>
                    </td>
                `;
                recentPaymentsBody.appendChild(tr);
            });
        }
    }
}

// ==================== LIVE RECEIPT PREVIEW ====================
function updateReceiptPreview() {
    const name = document.getElementById('customer-name').value.trim() || "Chưa nhập";
    const phone = document.getElementById('customer-phone').value.trim() || "Chưa nhập";
    const assetType = document.getElementById('asset-type').value;
    const assetDetail = document.getElementById('asset-detail').value.trim() || "Chưa nhập";
    const rawAmount = document.getElementById('loan-amount-input').value.replace(/,/g, '');
    const amountVal = parseFloat(rawAmount) || 0;
    const dateVal = document.getElementById('contract-date').value || new Date().toISOString().split('T')[0];
    
    const active = state.contracts;
    let nextId = "HD0001";
    if (active.length > 0) {
        const ids = active.map(c => parseInt(c.Ma_HD.replace("HD", "")) || 0);
        const maxId = Math.max(...ids);
        nextId = "HD" + String(maxId + 1).padStart(4, "0");
    }
    
    document.getElementById('preview-id').innerText = nextId;
    document.getElementById('preview-name').innerText = name;
    document.getElementById('preview-phone').innerText = phone;
    document.getElementById('preview-asset-type').innerText = assetType;
    document.getElementById('preview-asset-detail').innerText = assetDetail;
    document.getElementById('preview-date').innerText = dateVal;
    
    const previewDetailLabel = document.getElementById('preview-asset-detail-label');
    if (previewDetailLabel) {
        previewDetailLabel.innerText = assetType === 'Honda' ? "Biển số xe:" : "Chi tiết thiết bị:";
    }
    
    document.getElementById('preview-amount').innerText = formatVND(amountVal);
    document.getElementById('preview-amount-words').innerText = numberToWords(amountVal);
    document.getElementById('preview-signature-name').innerText = name !== "Chưa nhập" ? name : ".................";
    
    const noteEl = document.getElementById('preview-interest-note');
    if (noteEl) {
        if (assetType === 'Honda') {
            noteEl.innerText = "Chu kỳ 30 ngày (lũy tiến)";
        } else {
            noteEl.innerText = "Chu kỳ 7 ngày (2.0% / tuần)";
        }
    }
}

function updateAssetPlaceholders() {
    const type = document.getElementById('asset-type').value;
    const label = document.getElementById('asset-detail-label');
    const input = document.getElementById('asset-detail');
    
    if (type === 'Honda') {
        label.innerHTML = `Biển Số Xe <span class="text-red-500">*</span>`;
        input.placeholder = "Ví dụ: 29X1-12345";
    } else {
        label.innerHTML = `Chi Tiết Thiết Bị <span class="text-red-500">*</span>`;
        input.placeholder = "Ví dụ: Model máy, dung lượng, màu sắc...";
    }
    updateReceiptPreview();
}

// ==================== FILE / IMAGE HANDLING ====================
let uploadedImageBase64 = "";

function previewUploadImage(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const rawBase64 = e.target.result;
        
        const img = new Image();
        img.src = rawBase64;
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600;
            const MAX_HEIGHT = 600;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            uploadedImageBase64 = canvas.toDataURL('image/jpeg', 0.7);
            
            document.getElementById('upload-placeholder').classList.add('hidden');
            const previewContainer = document.getElementById('image-upload-preview-container');
            const previewImg = document.getElementById('image-upload-preview');
            
            previewImg.src = uploadedImageBase64;
            previewContainer.classList.remove('hidden');
            showToast("Hình ảnh đã tải lên và được tối ưu dung lượng!", "info");
        };
    };
    reader.readAsDataURL(file);
}

function clearUploadedImage(e) {
    if (e) e.stopPropagation();
    document.getElementById('asset-image').value = "";
    uploadedImageBase64 = "";
    document.getElementById('image-upload-preview').src = "";
    document.getElementById('image-upload-preview-container').classList.add('hidden');
    document.getElementById('upload-placeholder').classList.remove('hidden');
}

// ==================== TRANSACTION HANDLERS ====================
async function handleCreateContract(e) {
    e.preventDefault();
    
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const assetType = document.getElementById('asset-type').value;
    const assetDetail = document.getElementById('asset-detail').value.trim();
    const rawAmount = document.getElementById('loan-amount-input').value.replace(/,/g, '');
    const amountVal = parseFloat(rawAmount) || 0;
    const dateVal = document.getElementById('contract-date').value;
    const notes = document.getElementById('contract-notes').value.trim();
    
    if (amountVal <= 0) {
        showToast("Số tiền cầm phải lớn hơn 0!", "error");
        return;
    }
    
    showLoading(true, "Đang khởi tạo hợp đồng...");
    
    let newHdId = "HD0001";
    if (state.contracts.length > 0) {
        const ids = state.contracts.map(c => parseInt(c.Ma_HD.replace("HD", "")) || 0);
        newHdId = "HD" + String(Math.max(...ids) + 1).padStart(4, "0");
    }
    
    const payload = {
        action: "createContract",
        Ten_Khach_Hang: name,
        So_Dien_Thoai: phone,
        Loai_Tai_San: assetType,
        Chi_Tiet_Tai_San: assetDetail,
        So_Tien_Cam: amountVal,
        Ngay_Cam: dateVal,
        Ghi_Chu: notes,
        image_data: uploadedImageBase64,
        image_name: `pawn_${newHdId}.jpg`
    };
    
    const res = await postToAPI(payload);
    
    if (res.success) {
        const newContract = {
            Ma_HD: newHdId,
            Ten_Khach_Hang: name,
            So_Dien_Thoai: phone,
            Loai_Tai_San: assetType,
            Chi_Tiet_Tai_San: assetDetail,
            So_Tien_Cam: amountVal,
            Ngay_Cam: dateVal,
            Trang_Thai: "Active",
            Ghi_Chu: notes,
            Hinh_Anh: uploadedImageBase64
        };
        
        state.contracts.push(newContract);
        localStorage.setItem('pawnshop_contracts', JSON.stringify(state.contracts));
        
        document.getElementById('preview-id').innerText = newHdId;
        
        showToast("Đang tải hóa đơn PDF...", "info");
        
        // Chờ PDF render xong rồi mới reset form
        await exportReceiptToPDF(newHdId);
        
        const formEl = document.getElementById('new-contract-form');
        if (formEl) formEl.reset();
        document.getElementById('contract-date').value = new Date().toISOString().split('T')[0];
        clearUploadedImage();
        updateReceiptPreview();
        
        showToast("Tạo hợp đồng thành công!", "success");
        switchTab('active-contracts');
    } else {
        showToast("Gặp lỗi khi lưu hợp đồng: " + (res.error || "Lỗi API"), "error");
    }
    
    showLoading(false);
    syncData();
}

function openPayInterestModal(hdId, customerName, suggestedInterest) {
    document.getElementById('modal-pay-hd-id').value = hdId;
    document.getElementById('modal-pay-customer-name').value = customerName;
    document.getElementById('modal-pay-hd-display').innerText = hdId;
    document.getElementById('modal-pay-customer-display').innerText = customerName;
    
    const suggestedVal = Math.max(0, suggestedInterest);
    document.getElementById('modal-pay-suggested').innerText = formatVND(suggestedVal);
    document.getElementById('modal-pay-amount-input').value = formatNumber(suggestedVal);
    document.getElementById('modal-pay-notes').value = "Đóng lãi định kỳ";
    
    document.getElementById('pay-interest-modal').classList.remove('hidden');
}

function closePayInterestModal() {
    document.getElementById('pay-interest-modal').classList.add('hidden');
}

async function handlePayInterest(e) {
    e.preventDefault();
    const hdId = document.getElementById('modal-pay-hd-id').value;
    const name = document.getElementById('modal-pay-customer-name').value;
    const rawAmount = document.getElementById('modal-pay-amount-input').value.replace(/,/g, '');
    const amountVal = parseFloat(rawAmount) || 0;
    const notes = document.getElementById('modal-pay-notes').value.trim();
    
    if (amountVal <= 0) {
        showToast("Số tiền đóng phải lớn hơn 0!", "error");
        return;
    }
    
    showLoading(true, "Đang xử lý đóng lãi...");
    
    let newGdId = "GD0001";
    if (state.history.length > 0) {
        const ids = state.history.map(item => parseInt(item.Ma_Giao_Dich.replace("GD", "")) || 0);
        newGdId = "GD" + String(Math.max(...ids) + 1).padStart(4, "0");
    }
    
    const payload = {
        action: "addPayment",
        Ma_HD: hdId,
        Ten_Khach_Hang: name,
        Ngay_Dong_Lai: new Date().toISOString().split('T')[0],
        So_Tien_Dong: amountVal,
        Ghi_Chu: notes
    };
    
    const res = await postToAPI(payload);
    
    if (res.success) {
        const newPayment = {
            Ma_Giao_Dich: newGdId,
            Ma_HD: hdId,
            Ten_Khach_Hang: name,
            Ngay_Dong_Lai: payload.Ngay_Dong_Lai,
            So_Tien_Dong: amountVal,
            Ghi_Chu: notes
        };
        
        state.history.push(newPayment);
        localStorage.setItem('pawnshop_history', JSON.stringify(state.history));
        
        closePayInterestModal();
        showToast("Đã ghi nhận đóng lãi!", "success");
        switchTab('payment-history');
    } else {
        showToast("Lỗi khi ghi nhận đóng lãi: " + (res.error || "Lỗi API"), "error");
    }
    
    showLoading(false);
    syncData();
}

function openCloseContractModal(hdId, customerName, principal, suggestedInterest) {
    document.getElementById('modal-close-hd-id').value = hdId;
    document.getElementById('modal-close-customer-name').value = customerName;
    document.getElementById('modal-close-hd-display').innerText = hdId;
    document.getElementById('modal-close-customer-display').innerText = customerName;
    
    const principalVal = parseFloat(principal) || 0;
    const interestVal = Math.max(0, suggestedInterest);
    const totalVal = principalVal + interestVal;
    
    document.getElementById('modal-close-principal').innerText = formatVND(principalVal);
    document.getElementById('modal-close-interest').innerText = formatVND(interestVal);
    document.getElementById('modal-close-total').innerText = formatVND(totalVal);
    
    document.getElementById('modal-close-amount-input').value = formatNumber(totalVal);
    
    document.getElementById('close-contract-modal').classList.remove('hidden');
}

function closeCloseContractModal() {
    document.getElementById('close-contract-modal').classList.add('hidden');
}

async function handleCloseContract(e) {
    e.preventDefault();
    const hdId = document.getElementById('modal-close-hd-id').value;
    const name = document.getElementById('modal-close-customer-name').value;
    const rawAmount = document.getElementById('modal-close-amount-input').value.replace(/,/g, '');
    const amountVal = parseFloat(rawAmount) || 0;
    
    if (amountVal <= 0) {
        showToast("Số tiền đóng phải lớn hơn 0!", "error");
        return;
    }
    
    showLoading(true, "Đang tất toán hợp đồng...");
    
    const payload = {
        action: "closeContract",
        Ma_HD: hdId,
        Ten_Khach_Hang: name,
        So_Tien_Dong: amountVal
    };
    
    const res = await postToAPI(payload);
    
    if (res.success) {
        const contractIdx = state.contracts.findIndex(c => c.Ma_HD === hdId);
        if (contractIdx > -1) {
            state.contracts[contractIdx].Trang_Thai = "Closed";
        }
        
        let newGdId = "GD0001";
        if (state.history.length > 0) {
            const ids = state.history.map(item => parseInt(item.Ma_Giao_Dich.replace("GD", "")) || 0);
            newGdId = "GD" + String(Math.max(...ids) + 1).padStart(4, "0");
        }
        
        const newPayment = {
            Ma_Giao_Dich: newGdId,
            Ma_HD: hdId,
            Ten_Khach_Hang: name,
            Ngay_Dong_Lai: new Date().toISOString().split('T')[0],
            So_Tien_Dong: amountVal,
            Ghi_Chu: "Tất toán hợp đồng (Chuộc đồ)"
        };
        
        state.history.push(newPayment);
        
        localStorage.setItem('pawnshop_contracts', JSON.stringify(state.contracts));
        localStorage.setItem('pawnshop_history', JSON.stringify(state.history));
        
        closeCloseContractModal();
        showToast("Tất toán hợp đồng thành công!", "success");
        switchTab('payment-history');
    } else {
        showToast("Lỗi tất toán hợp đồng: " + (res.error || "Lỗi API"), "error");
    }
    
    showLoading(false);
    syncData();
}

// ==================== SEARCH & FILTERS ====================
function filterActiveContracts() {
    const query = document.getElementById('search-active').value.toLowerCase().trim();
    const filterAsset = document.getElementById('filter-asset').value;
    
    const cards = document.getElementById('active-contracts-grid').children;
    let visibleCount = 0;
    
    for (let card of cards) {
        const text = card.innerText.toLowerCase();
        
        let isAssetMatch = true;
        if (filterAsset !== 'All') {
            const html = card.innerHTML;
            if (filterAsset === 'Honda' && !html.includes('>Honda<')) isAssetMatch = false;
            if (filterAsset === 'Điện thoại' && !html.includes('>Điện thoại<')) isAssetMatch = false;
            if (filterAsset === 'Laptop' && !html.includes('>Laptop<')) isAssetMatch = false;
            if (filterAsset === 'iPad' && !html.includes('>iPad<')) isAssetMatch = false;
        }
        
        const isSearchMatch = text.includes(query);
        
        if (isSearchMatch && isAssetMatch) {
            card.classList.remove('hidden');
            visibleCount++;
        } else {
            card.classList.add('hidden');
        }
    }
    
    const emptyState = document.getElementById('active-empty-state');
    if (visibleCount === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }
}

function filterHistory() {
    const query = document.getElementById('search-history').value.toLowerCase().trim();
    const dateVal = document.getElementById('history-date-filter').value;
    
    const rows = document.getElementById('history-table-body').children;
    let visibleCount = 0;
    
    for (let row of rows) {
        const text = row.innerText.toLowerCase();
        const rowDate = row.children[3]?.innerText || "";
        
        let isDateMatch = true;
        if (dateVal && rowDate !== dateVal) {
            isDateMatch = false;
        }
        
        const isSearchMatch = text.includes(query);
        
        if (isSearchMatch && isDateMatch) {
            row.classList.remove('hidden');
            visibleCount++;
        } else {
            row.classList.add('hidden');
        }
    }
    
    const emptyState = document.getElementById('history-empty-state');
    if (visibleCount === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }
}

function clearHistoryDateFilter() {
    document.getElementById('history-date-filter').value = "";
    filterHistory();
}

// ==================== CONTRACT DETAILS MODAL ====================
function openContractDetailsModal(hdId) {
    const contract = state.contracts.find(c => c.Ma_HD === hdId);
    if (!contract) return;
    
    const stats = getContractStats(contract);
    
    document.getElementById('detail-modal-hd-id').innerText = contract.Ma_HD;
    document.getElementById('detail-modal-name').innerText = contract.Ten_Khach_Hang;
    document.getElementById('detail-modal-phone').innerText = contract.So_Dien_Thoai;
    document.getElementById('detail-modal-asset-type').innerText = contract.Loai_Tai_San;
    document.getElementById('detail-modal-asset-detail').innerText = contract.Chi_Tiet_Tai_San;
    document.getElementById('detail-modal-date').innerText = contract.Ngay_Cam;
    
    const statusEl = document.getElementById('detail-modal-status');
    statusEl.innerText = contract.Trang_Thai === 'Active' ? 'Đang cầm' : 'Đã tất toán';
    if (contract.Trang_Thai === 'Active') {
        statusEl.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    } else {
        statusEl.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700";
    }
    
    document.getElementById('detail-modal-principal').innerText = formatVND(contract.So_Tien_Cam);
    document.getElementById('detail-modal-days').innerText = `${stats.days} ngày`;
    document.getElementById('detail-modal-accrued').innerText = formatVND(stats.accrued);
    document.getElementById('detail-modal-collected').innerText = formatVND(stats.collected);
    document.getElementById('detail-modal-remaining').innerText = formatVND(Math.max(0, stats.accrued - stats.collected));
    
    const notesEl = document.getElementById('detail-modal-notes');
    notesEl.innerText = contract.Ghi_Chu ? contract.Ghi_Chu : "Chưa có ghi chú.";
    
    const imgContainer = document.getElementById('detail-modal-image-container');
    if (contract.Hinh_Anh) {
        const displayUrl = formatImageUrl(contract.Hinh_Anh);
        imgContainer.innerHTML = `<img src="${displayUrl}" class="max-h-full max-w-full object-cover cursor-zoom-in rounded-lg" onclick="openLightbox('${displayUrl}')">`;
    } else {
        imgContainer.innerHTML = `<span class="text-slate-500 italic text-[11px]">Không có ảnh đính kèm</span>`;
    }
    
    // Load transaction history for this contract
    const historyBody = document.getElementById('detail-modal-history-body');
    historyBody.innerHTML = "";
    const filteredHistory = state.history.filter(h => h.Ma_HD === hdId);
    
    if (filteredHistory.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-slate-500 italic text-xs">Chưa có giao dịch đóng lãi nào.</td></tr>`;
    } else {
        filteredHistory.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-800/30 transition border-b border-slate-800/80";
            tr.innerHTML = `
                <td class="py-2 px-4 font-semibold text-slate-400">${item.Ma_Giao_Dich}</td>
                <td class="py-2 px-4 text-slate-300">${item.Ngay_Dong_Lai}</td>
                <td class="py-2 px-4 text-right font-bold text-emerald-400">${formatVND(item.So_Tien_Dong)}</td>
                <td class="py-2 px-4 text-slate-400">${item.Ghi_Chu}</td>
            `;
            historyBody.appendChild(tr);
        });
    }
    
    // Setup footer button callbacks
    document.getElementById('detail-modal-print-btn').onclick = () => printContractReceipt(hdId);
    
    const payBtn = document.getElementById('detail-modal-pay-btn');
    const closeHdBtn = document.getElementById('detail-modal-close-contract-btn');
    
    if (contract.Trang_Thai === 'Active') {
        payBtn.classList.remove('hidden');
        payBtn.onclick = () => {
            closeContractDetailsModal();
            openPayInterestModal(hdId, contract.Ten_Khach_Hang, stats.accrued - stats.collected);
        };
        
        closeHdBtn.classList.remove('hidden');
        closeHdBtn.onclick = () => {
            closeContractDetailsModal();
            openCloseContractModal(hdId, contract.Ten_Khach_Hang, contract.So_Tien_Cam, stats.accrued - stats.collected);
        };
    } else {
        payBtn.classList.add('hidden');
        closeHdBtn.classList.add('hidden');
    }
    
    document.getElementById('contract-details-modal').classList.remove('hidden');
}

function closeContractDetailsModal() {
    document.getElementById('contract-details-modal').classList.add('hidden');
}

function printContractReceipt(contractId) {
    const contract = state.contracts.find(c => c.Ma_HD === contractId);
    if (!contract) return;
    
    // Temporarily overwrite receipt preview element
    document.getElementById('preview-id').innerText = contract.Ma_HD;
    document.getElementById('preview-name').innerText = contract.Ten_Khach_Hang;
    document.getElementById('preview-phone').innerText = contract.So_Dien_Thoai;
    document.getElementById('preview-asset-type').innerText = contract.Loai_Tai_San;
    document.getElementById('preview-asset-detail').innerText = contract.Chi_Tiet_Tai_San;
    document.getElementById('preview-date').innerText = contract.Ngay_Cam;
    
    const previewDetailLabel = document.getElementById('preview-asset-detail-label');
    if (previewDetailLabel) {
        previewDetailLabel.innerText = contract.Loai_Tai_San === 'Honda' ? "Biển số xe:" : "Chi tiết thiết bị:";
    }
    
    const amountVal = parseFloat(contract.So_Tien_Cam) || 0;
    document.getElementById('preview-amount').innerText = formatVND(amountVal);
    document.getElementById('preview-amount-words').innerText = numberToWords(amountVal);
    document.getElementById('preview-signature-name').innerText = contract.Ten_Khach_Hang;
    
    const noteEl = document.getElementById('preview-interest-note');
    if (noteEl) {
        if (contract.Loai_Tai_San === 'Honda') {
            noteEl.innerText = "Chu kỳ 30 ngày (lũy tiến)";
        } else {
            noteEl.innerText = "Chu kỳ 7 ngày (2.0% / tuần)";
        }
    }
    
    exportReceiptToPDF(contract.Ma_HD);
    showToast(`Đang xuất hóa đơn PDF cho hợp đồng ${contract.Ma_HD}...`, "success");
}

// ==================== UI HELPERS ====================
function switchTab(tabId) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(c => c.classList.add('hidden'));
    
    document.getElementById(`tab-${tabId}-content`).classList.remove('hidden');
    
    updateTabUI(tabId);
    
    if (tabId === 'active-contracts') {
        const searchInput = document.getElementById('search-active');
        const filterSelect = document.getElementById('filter-asset');
        if (searchInput) searchInput.value = "";
        if (filterSelect) filterSelect.value = "All";
        filterActiveContracts();
    }
    
    if (tabId === 'statistics') {
        renderStatistics();
    }
}

function updateTabUI(tabId) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.className = "tab-btn px-4 py-2.5 rounded-xl text-sm font-semibold transition duration-200 flex items-center gap-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50";
    });
    
    const activeBtn = document.getElementById(`nav-${tabId}`);
    if (activeBtn) {
        activeBtn.className = "tab-btn px-4 py-2.5 rounded-xl text-sm font-semibold transition duration-200 flex items-center gap-2 bg-brand-500 text-white shadow-lg shadow-brand-500/20";
    }
    
    const mobTabBtns = document.querySelectorAll('.mobile-tab-btn');
    mobTabBtns.forEach(btn => {
        btn.className = "mobile-tab-btn flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition duration-200";
    });
    
    const activeMobBtn = document.getElementById(`mobile-nav-${tabId}`);
    if (activeMobBtn) {
        activeMobBtn.className = "mobile-tab-btn flex flex-col items-center gap-1 text-brand-400 font-bold transition duration-200";
    }
}

function showLoading(show, text = "Đang xử lý...") {
    const overlay = document.getElementById('loading-overlay');
    const txt = document.getElementById('loading-text');
    if (overlay) {
        if (show) {
            if (txt) txt.innerText = text;
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}

function showToast(message, type = "info") {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-xl shadow-2xl flex items-center gap-3 text-sm text-white font-medium border animate-slide-in pointer-events-auto max-w-xs transition duration-300`;
    
    let icon = "fa-info-circle";
    if (type === "success") {
        toast.classList.add('bg-emerald-950', 'border-emerald-800', 'text-emerald-300');
        icon = "fa-check-circle";
    } else if (type === "error") {
        toast.classList.add('bg-red-950', 'border-red-800', 'text-red-300');
        icon = "fa-exclamation-circle";
    } else {
        toast.classList.add('bg-slate-900', 'border-slate-800', 'text-slate-300');
    }
    
    toast.innerHTML = `
        <i class="fa-solid ${icon} text-lg"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('opacity-0', 'scale-95');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function openLightbox(src) {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-image');
    if (modal && img) {
        img.src = src;
        modal.classList.remove('hidden');
    }
}

function formatImageUrl(url) {
    if (!url) return "";
    if (url.startsWith("data:")) return url;
    if (url.includes("drive.google.com")) {
        let id = "";
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            id = match[1];
            return `https://lh3.googleusercontent.com/d/${id}`;
        }
    }
    return url;
}

// Close Lightbox Image Modal
function closeLightbox() {
    document.getElementById('lightbox-modal').classList.add('hidden');
}

function formatCurrencyInput(input) {
    let value = input.value.replace(/,/g, '');
    if (isNaN(value)) {
        input.value = "";
        return;
    }
    if (value === "") return;
    input.value = formatNumber(parseFloat(value));
    updateReceiptPreview();
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatVND(amount) {
    return formatNumber(Math.round(amount)) + "đ";
}

function numberToWords(number) {
    if (number === 0) return "Không đồng";
    
    const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    const places = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
    
    function readThreeDigits(n, showZeroHundred) {
        let hundred = Math.floor(n / 100);
        let ten = Math.floor((n % 100) / 10);
        let unit = n % 10;
        let str = "";
        
        if (hundred > 0 || showZeroHundred) {
            str += units[hundred] + " trăm ";
        }
        
        if (ten > 0) {
            if (ten === 1) str += "mười ";
            else str += units[ten] + " mươi ";
        } else if (hundred > 0 && unit > 0) {
            str += "lẻ ";
        }
        
        if (unit > 0) {
            if (unit === 1 && ten > 1) str += "mốt";
            else if (unit === 5 && ten > 0) str += "lăm";
            else str += units[unit];
        }
        
        return str.trim();
    }
    
    let str = "";
    let placeIdx = 0;
    let temp = number;
    
    while (temp > 0) {
        let chunk = temp % 1000;
        if (chunk > 0) {
            let chunkStr = readThreeDigits(chunk, temp >= 1000);
            str = chunkStr + " " + places[placeIdx] + " " + str;
        }
        temp = Math.floor(temp / 1000);
        placeIdx++;
    }
    
    str = str.trim();
    str = str.charAt(0).toUpperCase() + str.slice(1) + " đồng";
    return str.replace(/\s+/g, ' ');
}

function exportReceiptToPDF(contractId) {
    // Lấy dữ liệu từ preview hiện tại
    const previewId = document.getElementById('preview-id')?.innerText || contractId;
    const previewName = document.getElementById('preview-name')?.innerText || '';
    const previewPhone = document.getElementById('preview-phone')?.innerText || '';
    const previewAssetType = document.getElementById('preview-asset-type')?.innerText || '';
    const previewAssetDetailLabel = document.getElementById('preview-asset-detail-label')?.innerText || 'Chi tiết:';
    const previewAssetDetail = document.getElementById('preview-asset-detail')?.innerText || '';
    const previewDate = document.getElementById('preview-date')?.innerText || '';
    const previewAmount = document.getElementById('preview-amount')?.innerText || '0đ';
    const previewAmountWords = document.getElementById('preview-amount-words')?.innerText || '';
    const previewInterestNote = document.getElementById('preview-interest-note')?.innerText || '';
    const previewSignatureName = document.getElementById('preview-signature-name')?.innerText || '.................';

    // QR code base64 (nhúng trực tiếp để tránh lỗi CORS/path)
    const qrBase64 = 'data:image/jpeg;base64,' + (window._qrBase64Cache || '');
    
    // Tạo element PDF riêng biệt với INLINE CSS hoàn toàn (không dùng Tailwind)
    const pdfContainer = document.createElement('div');
    pdfContainer.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
    document.body.appendChild(pdfContainer);
    
    pdfContainer.innerHTML = `
    <div id="pdf-render-area" style="width:480px;background:#fff;color:#111;font-family:'Segoe UI','Roboto','Helvetica Neue',Arial,sans-serif;font-size:11px;line-height:1.5;box-sizing:border-box;overflow:hidden;">
        
        <!-- Header cửa hàng -->
        <div style="text-align:center;margin-bottom:4px;">
            <div style="font-size:18px;font-weight:800;letter-spacing:2px;color:#111;margin-bottom:1px;">CẦM ĐỒ 60</div>
            <div style="font-size:9px;color:#555;">ĐC: Số 60 - đường phước thiện - p Long bình</div>
            <div style="font-size:9px;color:#555;">Hotline/Zalo: 0962772783 LONG</div>
        </div>
        
        <!-- Đường kẻ -->
        <div style="border-bottom:1.5px solid #333;margin:6px 0;"></div>
        
        <!-- Tiêu đề hợp đồng -->
        <div style="text-align:center;margin-bottom:8px;">
            <div style="font-size:15px;font-weight:700;letter-spacing:3px;color:#111;margin-bottom:1px;">HỢP ĐỒNG CẦM ĐỒ</div>
            <div style="font-size:9px;color:#777;">Mã HĐ: <span style="font-weight:700;color:#222;">${previewId}</span></div>
        </div>
        
        <!-- Thông tin khách hàng -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:4px;font-size:11px;">
            <tr>
                <td style="padding:2px 0;color:#555;width:40%;">Khách hàng:</td>
                <td style="padding:2px 0;text-align:right;font-weight:700;color:#111;">${previewName}</td>
            </tr>
            <tr>
                <td style="padding:2px 0;color:#555;">Số điện thoại:</td>
                <td style="padding:2px 0;text-align:right;font-weight:700;color:#111;">${previewPhone}</td>
            </tr>
            <tr>
                <td style="padding:2px 0;color:#555;">Loại tài sản:</td>
                <td style="padding:2px 0;text-align:right;font-weight:700;color:#111;">${previewAssetType}</td>
            </tr>
            <tr>
                <td style="padding:2px 0;color:#555;">${previewAssetDetailLabel}</td>
                <td style="padding:2px 0;text-align:right;font-weight:700;color:#111;">${previewAssetDetail}</td>
            </tr>
            <tr>
                <td style="padding:2px 0;color:#555;">Ngày cầm cố:</td>
                <td style="padding:2px 0;text-align:right;font-weight:700;color:#111;">${previewDate}</td>
            </tr>
        </table>
        
        <!-- Đường kẻ nét đứt -->
        <div style="border-bottom:1px dashed #bbb;margin:6px 0;"></div>
        
        <!-- Số tiền cầm -->
        <div style="margin-bottom:2px;">
            <table style="width:100%;border-collapse:collapse;">
                <tr>
                    <td style="font-size:12px;font-weight:700;color:#111;padding:3px 0;">SỐ TIỀN CẦM</td>
                    <td style="font-size:15px;font-weight:800;color:#0a7c42;text-align:right;padding:3px 0;">${previewAmount}</td>
                </tr>
            </table>
            <div style="text-align:right;font-size:9px;color:#555;font-style:italic;margin-top:1px;">
                (Bằng chữ: <span style="font-weight:600;color:#333;">${previewAmountWords}</span>)
            </div>
            <table style="width:100%;border-collapse:collapse;margin-top:3px;">
                <tr>
                    <td style="font-size:10px;color:#555;padding:2px 0;">Lãi suất thỏa thuận:</td>
                    <td style="font-size:10px;font-weight:600;color:#333;text-align:right;padding:2px 0;">${previewInterestNote}</td>
                </tr>
            </table>
        </div>
        
        <!-- Đường kẻ nét đứt -->
        <div style="border-bottom:1px dashed #bbb;margin:6px 0;"></div>
        
        <!-- Điều khoản -->
        <div style="margin-bottom:6px;">
            <div style="font-size:10px;font-weight:700;color:#333;margin-bottom:3px;">ĐIỀU KHOẢN THỎA THUẬN:</div>
            <div style="font-size:8.5px;color:#555;padding-left:4px;line-height:1.5;">
                1. Khách hàng cam kết tài sản cầm cố là tài sản hợp pháp.<br>
                2. Lãi suất được tính theo biểu phí công khai của cửa hàng.<br>
                3. Kỳ hạn đóng lãi định kỳ đúng ngày. Quá hạn 15 ngày không đóng lãi hoặc gia hạn hợp đồng, cửa hàng có toàn quyền thanh lý tài sản để thu hồi nợ.<br>
                4. Cửa hàng cam kết niêm phong, bảo quản tài sản an toàn tuyệt đối.
            </div>
        </div>
        
        <!-- QR Code -->
        <div style="text-align:center;margin:6px 0;">
            <div style="font-size:8px;color:#777;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">Quét mã Zalo liên hệ đóng lãi / tất toán:</div>
            <img src="${qrBase64}" style="width:80px;height:80px;object-fit:contain;border:1px solid #ddd;border-radius:4px;display:inline-block;" />
        </div>
        
        <!-- Chữ ký -->
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
            <tr>
                <td style="width:50%;text-align:center;vertical-align:top;">
                    <div style="font-size:10px;font-weight:600;color:#444;">ĐẠI DIỆN CỬA HÀNG</div>
                    <div style="font-size:8px;color:#999;margin-top:1px;">(Ký và ghi rõ họ tên)</div>
                    <div style="height:40px;"></div>
                    <div style="font-size:11px;font-weight:700;color:#111;">CẦM ĐỒ 60</div>
                </td>
                <td style="width:50%;text-align:center;vertical-align:top;">
                    <div style="font-size:10px;font-weight:600;color:#444;">KHÁCH HÀNG CẦM ĐỒ</div>
                    <div style="font-size:8px;color:#999;margin-top:1px;">(Ký và ghi rõ họ tên)</div>
                    <div style="height:40px;"></div>
                    <div style="font-size:11px;font-weight:700;color:#111;">${previewSignatureName}</div>
                </td>
            </tr>
        </table>
    </div>
    `;
    
    const renderEl = pdfContainer.querySelector('#pdf-render-area');
    
    const opt = {
        margin: [10, 10, 10, 10],
        filename: `HoaDon_${contractId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            allowTaint: true, 
            logging: false, 
            backgroundColor: '#ffffff',
            scrollY: 0,
            scrollX: 0
        },
        jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }
    };
    
    return html2pdf().set(opt).from(renderEl).toPdf().get('pdf').then(function(pdf) {
        // Lưu file PDF về máy
        pdf.save(`HoaDon_${contractId}.pdf`);
        
        // Dọn dẹp element tạm
        if (pdfContainer.parentNode) {
            pdfContainer.parentNode.removeChild(pdfContainer);
        }
        
        // Upload lên Google Drive (chạy ngầm)
        if (gasUrl && !isDemoMode) {
            // Tạo lại element để generate PDF data URI
            const pdfContainer2 = document.createElement('div');
            pdfContainer2.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
            pdfContainer2.innerHTML = pdfContainer.innerHTML; // clone lại HTML
            document.body.appendChild(pdfContainer2);
            const renderEl2 = pdfContainer2.querySelector('#pdf-render-area');
            
            html2pdf().set(opt).from(renderEl2).outputPdf('datauristring').then(function(pdfDataUri) {
                if (pdfContainer2.parentNode) pdfContainer2.parentNode.removeChild(pdfContainer2);
                const payload = {
                    action: "uploadPDF",
                    Ma_HD: contractId,
                    pdf_name: `HoaDon_${contractId}.pdf`,
                    pdf_data: pdfDataUri
                };
                postToAPI(payload).then(res => {
                    if (res && res.success) {
                        showToast(`Đã lưu hóa đơn ${contractId} lên Google Drive!`, "success");
                    }
                });
            }).catch(err => {
                if (pdfContainer2.parentNode) pdfContainer2.parentNode.removeChild(pdfContainer2);
                console.error("Lỗi upload PDF lên Drive:", err);
            });
        }
    }).catch(function(err) {
        // Dọn dẹp khi lỗi
        if (pdfContainer.parentNode) {
            pdfContainer.parentNode.removeChild(pdfContainer);
        }
        console.error("Lỗi xuất PDF:", err);
    });
}

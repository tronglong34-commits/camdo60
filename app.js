// ==================== CONFIGURATION & STATE ====================
let state = {
    contracts: [],
    history: []
};

// Mode & Status
let isDemoMode = false;
let isSubmitting = false;
let gasUrl = localStorage.getItem('pawnshop_gas_url') || "https://script.google.com/macros/s/AKfycbxSJ30EnzRb4O7QDkvhFqAWYOPWpoUI4St3cD3DvCF6DW9v-J_5sfLCheddzbmCDPdPCg/exec";

// Dummy/Demo Data to show when offline or first time
const dummyContracts = [
    {
        Ma_HD: "HD0001",
        Ten_Khach_Hang: "Nguyễn Văn A",
        So_Dien_Thoai: "0987654321",
        So_CCCD: "001090012345",
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
        So_CCCD: "002090054321",
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
    
    // Load saved theme
    const savedTheme = localStorage.getItem('pawnshop_theme');
    const root = document.documentElement;
    const icon = document.getElementById('theme-toggle-icon');
    const text = document.getElementById('theme-toggle-text');
    
    if (savedTheme === 'light') {
        root.classList.add('theme-light');
        if (icon) icon.className = "fa-solid fa-moon";
        if (text) text.innerText = "Giao diện tối";
    } else {
        root.classList.remove('theme-light');
        if (icon) icon.className = "fa-solid fa-sun";
        if (text) text.innerText = "Giao diện sáng";
    }
    
    // 2. Setup input elements & forms
    if (document.getElementById('contract-date')) {
        document.getElementById('contract-date').value = new Date().toISOString().split('T')[0];
    }
    
    // Set initially active tab link style
    const initialTab = 'new-contract';
    updateTabUI(initialTab);
    
    // 3. Form input change listeners for Live Preview
    const formFields = ['customer-name', 'customer-phone', 'customer-cccd', 'asset-type', 'asset-detail', 'loan-amount-input', 'contract-date'];
    formFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateReceiptPreview);
            el.addEventListener('change', updateReceiptPreview);
        }
    });
    
    // Format currency inputs on focus/blur to prevent Gboard duplication/IME issues entirely while keeping live preview updates
    const currencyInputs = ['loan-amount-input', 'modal-pay-amount-input', 'modal-close-amount-input', 'modal-liquidate-amount-input', 'modal-edit-amount-input'];
    currencyInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // On focus: strip all formatting commas so the user types a clean raw number
            el.addEventListener('focus', function() {
                this.value = this.value.replace(/\D/g, '');
            });

            // On input: clean non-digit chars if any (e.g. from copy-pasting)
            el.addEventListener('input', function() {
                const clean = this.value.replace(/\D/g, '');
                if (this.value !== clean) {
                    this.value = clean;
                }
                updateReceiptPreview();
            });

            // On blur: format with commas for a polished display
            el.addEventListener('blur', function() {
                const clean = this.value.replace(/\D/g, '');
                if (clean !== "") {
                    const parsed = parseInt(clean, 10);
                    this.value = isNaN(parsed) ? "" : formatNumber(parsed);
                } else {
                    this.value = "";
                }
                updateReceiptPreview();
            });
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
    
    const liquidateContractForm = document.getElementById('liquidate-contract-form');
    if (liquidateContractForm) {
        liquidateContractForm.addEventListener('submit', handleLiquidateContract);
    }
    
    const editContractForm = document.getElementById('edit-contract-form');
    if (editContractForm) {
        editContractForm.addEventListener('submit', handleEditContract);
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
    syncData(true);
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

function checkLoginState() {
    const isLoggedIn = sessionStorage.getItem('pawnshop_logged_in') === 'true';
    
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
async function syncData(isSilent = false) {
    updateDatabaseStatus();
    
    // Check if we have cached data locally
    let localContracts = localStorage.getItem('pawnshop_contracts');
    let localHistory = localStorage.getItem('pawnshop_history');
    let hasCache = !!(localContracts || localHistory);
    
    // If cache exists, load and render it immediately for perceived instant speed (SWR)
    if (hasCache) {
        state.contracts = localContracts ? JSON.parse(localContracts) : [];
        state.history = localHistory ? JSON.parse(localHistory) : [];
        renderAll();
    } else if (isDemoMode) {
        // Use dummy data if in demo mode and no cache exists
        state.contracts = dummyContracts;
        state.history = dummyHistory;
        localStorage.setItem('pawnshop_contracts', JSON.stringify(dummyContracts));
        localStorage.setItem('pawnshop_history', JSON.stringify(dummyHistory));
        renderAll();
    }
    
    // Show spinner if we want active feedback and there is no cache to show,
    // or if we specifically demand a foreground refresh (isSilent = false)
    if (!isSilent && !hasCache) {
        showLoading(true, "Đang tải dữ liệu...");
    } else if (!isSilent && hasCache) {
        // If it is manual sync and we already have cache rendered, show a friendly silent notification
        showToast("Đang đồng bộ dữ liệu mới...", "info");
    }
    
    if (isDemoMode) {
        if (!isSilent) showLoading(false);
        return;
    }
    
    try {
        // Nếu không phải tải ngầm (e.g. nhấn nút làm mới), thêm clean=true để xóa cache trên Apps Script
        const fetchUrl = isSilent ? gasUrl : (gasUrl.indexOf('?') > -1 ? gasUrl + '&clean=true' : gasUrl + '?clean=true');
        const response = await fetch(fetchUrl);
        const resData = await response.json();
        
        if (resData.success) {
            const newContracts = resData.data.contracts || [];
            const newHistory = resData.data.history || [];
            
            // Check if backend data differs from local cache
            const hasChanges = JSON.stringify(newContracts) !== JSON.stringify(state.contracts) ||
                               JSON.stringify(newHistory) !== JSON.stringify(state.history);
            
            if (hasChanges || !hasCache) {
                state.contracts = newContracts;
                state.history = newHistory;
                
                localStorage.setItem('pawnshop_contracts', JSON.stringify(state.contracts));
                localStorage.setItem('pawnshop_history', JSON.stringify(state.history));
                
                renderAll();
                if (!isSilent) showToast("Đồng bộ thành công!", "success");
            } else {
                if (!isSilent) showToast("Dữ liệu đã ở bản mới nhất!", "success");
            }
            
            console.log("=== DANH SÁCH HỢP ĐỒNG ĐÃ ĐỒNG BỘ ===");
            state.contracts.forEach(c => {
                console.log(`Mã HĐ: ${c.Ma_HD} | Khách: ${c.Ten_Khach_Hang} | Hinh_Anh:`, c.Hinh_Anh ? c.Hinh_Anh.substring(0, 100) + (c.Hinh_Anh.length > 100 ? "..." : "") : "Trống");
            });
        } else {
            throw new Error(resData.error || "Lỗi không xác định");
        }
    } catch (err) {
        console.error("Fetch API error:", err);
        if (!isSilent) {
            showToast("Lỗi kết nối API Google Sheets. Đang dùng dữ liệu cache offline.", "error");
        }
        
        // If fetch fails and we didn't have cache before, try loading whatever is there
        if (!hasCache) {
            let localContractsFallback = localStorage.getItem('pawnshop_contracts') || "[]";
            let localHistoryFallback = localStorage.getItem('pawnshop_history') || "[]";
            state.contracts = JSON.parse(localContractsFallback);
            state.history = JSON.parse(localHistoryFallback);
            renderAll();
        }
    } finally {
        if (!isSilent) showLoading(false);
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
    // Treat 0 days (or negative days) as 1 day so that the minimum interest rate tier is applied immediately.
    const calcDays = Math.max(1, days);
    
    if (assetType === 'Honda') {
        // Khung 1-3tr: Tính tiền lãi cố định
        if (principal <= 3000000) {
            const getFlatRate = (d) => {
                if (d <= 9) return 150000;
                if (d <= 14) return 200000;
                if (d <= 19) return 250000;
                return 300000;
            };
            if (calcDays <= 30) {
                return getFlatRate(calcDays);
            } else {
                const cycles = Math.floor(calcDays / 30);
                const rem = calcDays % 30;
                let interest = 300000 * cycles;
                if (rem > 0) {
                    interest += getFlatRate(rem);
                }
                return interest;
            }
        }
        
        // Các khung tính theo % gốc
        let rateSchedule = [];
        if (principal <= 4000000) {
            rateSchedule = [
                { days: 7, rate: 0.039 },
                { days: 14, rate: 0.045 },
                { days: 19, rate: 0.060 },
                { days: 30, rate: 0.090 }
            ];
        } else if (principal <= 5000000) {
            rateSchedule = [
                { days: 7, rate: 0.030 },
                { days: 14, rate: 0.040 },
                { days: 19, rate: 0.060 },
                { days: 30, rate: 0.080 }
            ];
        } else if (principal < 17000000) {
            rateSchedule = [
                { days: 7, rate: 0.020 },
                { days: 9, rate: 0.028 },
                { days: 10, rate: 0.035 },
                { days: 14, rate: 0.040 },
                { days: 19, rate: 0.050 },
                { days: 30, rate: 0.070 }
            ];
        } else {
            // >= 17tr
            rateSchedule = [
                { days: 7, rate: 0.020 },
                { days: 9, rate: 0.028 },
                { days: 10, rate: 0.030 },
                { days: 14, rate: 0.035 },
                { days: 19, rate: 0.045 },
                { days: 30, rate: 0.060 }
            ];
        }
        
        const getRate = (d) => {
            for (const tier of rateSchedule) {
                if (d <= tier.days) return tier.rate;
            }
            return rateSchedule[rateSchedule.length - 1].rate;
        };
        
        const maxRate = rateSchedule[rateSchedule.length - 1].rate;
        
        if (calcDays <= 30) {
            return principal * getRate(calcDays);
        } else {
            const cycles = Math.floor(calcDays / 30);
            const rem = calcDays % 30;
            let interest = principal * maxRate * cycles;
            if (rem > 0) {
                interest += principal * getRate(rem);
            }
            return interest;
        }
    } else {
        const cycles = Math.max(1, Math.ceil(calcDays / 14));
        return cycles * 0.04 * principal;
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

function getUnpaidDays(contract, stats) {
    if (contract.Trang_Thai === 'Closed') return 0;
    const principal = parseFloat(contract.So_Tien_Cam) || 0;
    const elapsedDays = stats.days;
    const collected = stats.collected;
    
    if (stats.accrued <= collected) {
        return 0;
    }
    
    let paidUpToDay = 0;
    for (let d = 0; d <= elapsedDays; d++) {
        const interestAtD = calculateInterest(principal, contract.Loai_Tai_San, d);
        if (interestAtD <= collected) {
            paidUpToDay = d;
        } else {
            break;
        }
    }
    return Math.max(0, elapsedDays - paidUpToDay);
}

function getInterestFromTransaction(item) {
    const amount = parseFloat(item.So_Tien_Dong) || 0;
    if (item.Ghi_Chu.includes("Tất toán") || item.Ghi_Chu.includes("Chuộc đồ") || item.Ghi_Chu.includes("Thanh lý")) {
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
    
    // Read status filter
    const filterStatus = document.getElementById('filter-status')?.value || 'Active';
    
    let filteredList = state.contracts;
    if (filterStatus === 'Active') {
        filteredList = state.contracts.filter(c => c.Trang_Thai === 'Active');
    } else if (filterStatus === 'Closed') {
        filteredList = state.contracts.filter(c => c.Trang_Thai === 'Closed');
    } else if (filterStatus === 'Liquidating') {
        filteredList = state.contracts.filter(c => c.Trang_Thai === 'Liquidating');
    } else if (filterStatus === 'Liquidated') {
        filteredList = state.contracts.filter(c => c.Trang_Thai === 'Liquidated');
    } else {
        // 'All' - no filter, shows all
    }
    
    if (filteredList.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    
    filteredList.forEach(c => {
        const stats = getContractStats(c);
        const card = document.createElement('div');
        
        const isClosed = c.Trang_Thai === 'Closed';
        const isLiquidating = c.Trang_Thai === 'Liquidating';
        const isLiquidated = c.Trang_Thai === 'Liquidated';
        const isTerminal = isClosed || isLiquidated;
        
        let statusBadge = "";
        if (isClosed) {
            statusBadge = `<span class="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-950/50 text-slate-500 border border-white/5">Đã Tất Toán</span>`;
        } else if (isLiquidating) {
            statusBadge = `<span class="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">Chờ Thanh Lý</span>`;
        } else if (isLiquidated) {
            statusBadge = `<span class="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">Đã Thanh Lý</span>`;
        } else {
            statusBadge = `<span class="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">${c.Ma_HD}</span>`;
        }
            
        card.className = `glass-card p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between cursor-pointer transition-all duration-300 ${isTerminal ? 'opacity-60 hover:opacity-100' : ''}`;
        card.setAttribute("onclick", `openContractDetailsModal('${c.Ma_HD}')`);
        card.dataset.assetType = c.Loai_Tai_San;
        card.dataset.searchText = `${c.Ten_Khach_Hang} ${c.Ma_HD} ${c.Ghi_Chu || ""} ${c.Chi_Tiet_Tai_San}`.toLowerCase();
        
        // Dynamic badge style based on Loai_Tai_San
        let assetBadgeClass = "bg-slate-500/15 text-slate-300 border border-slate-500/30";
        if (c.Loai_Tai_San === 'Honda') {
            assetBadgeClass = "bg-amber-500/15 text-amber-300 border border-amber-500/30";
        } else if (c.Loai_Tai_San === 'Điện thoại') {
            assetBadgeClass = "bg-sky-500/15 text-sky-300 border border-sky-500/30";
        } else if (c.Loai_Tai_San === 'Laptop') {
            assetBadgeClass = "bg-purple-500/15 text-purple-300 border border-purple-500/30";
        } else if (c.Loai_Tai_San === 'iPad' || c.Loai_Tai_San === 'IPad') {
            assetBadgeClass = "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
        } else {
            assetBadgeClass = "bg-pink-500/15 text-pink-300 border border-pink-500/30";
        }

        let paymentStatusBadge = "";
        let daysColorClass = "text-brand-400";
        let daysStatusSuffix = "";
        if (!isTerminal) {
            if (isLiquidating) {
                paymentStatusBadge = `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">Chờ thanh lý</span>`;
                daysColorClass = "text-orange-400";
                daysStatusSuffix = `(${stats.days} ngày - Chờ thanh lý)`;
            } else {
                const unpaidDays = getUnpaidDays(c, stats);
                const isHonda = c.Loai_Tai_San === 'Honda';
                const limitDue = isHonda ? 20 : 5;
                const limitOverdue = isHonda ? 30 : 7;
                
                if (unpaidDays === 0 || unpaidDays <= limitDue) {
                    paymentStatusBadge = `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Bình thường</span>`;
                    daysColorClass = "text-emerald-400";
                    daysStatusSuffix = `(${stats.days} ngày)`;
                } else if (unpaidDays <= limitOverdue) {
                    paymentStatusBadge = `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">Đến hạn</span>`;
                    daysColorClass = "text-amber-400";
                    daysStatusSuffix = `(${stats.days} ngày - Đến hạn)`;
                } else {
                    paymentStatusBadge = `<span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">Trễ hạn ${unpaidDays}n</span>`;
                    daysColorClass = "text-rose-400";
                    daysStatusSuffix = `(${stats.days} ngày - Trễ hạn)`;
                }
            }
        }

        let imgHtml = "";
        if (c.Hinh_Anh) {
            const thumbUrl = formatImageUrl(c.Hinh_Anh, 150);
            const zoomUrl = formatImageUrl(c.Hinh_Anh, 1200);
            if (thumbUrl.startsWith("http") || thumbUrl.startsWith("data:")) {
                imgHtml = `
                    <div class="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 bg-slate-950/40 group cursor-zoom-in transition-all duration-300 hover:border-white/20 shrink-0" onclick="event.stopPropagation(); openLightbox('${zoomUrl}')">
                        <img src="${thumbUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="handleImageLoadError(this)">
                        <div class="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <i class="fa-solid fa-magnifying-glass text-white text-xs"></i>
                        </div>
                    </div>
                `;
            } else if (c.Hinh_Anh.startsWith("Lỗi")) {
                let cleanErr = c.Hinh_Anh.replace("Lỗi lưu ảnh: ", "").replace("Exception: ", "").replace("Truy cập bị từ chối: DriveApp.", "Quyền Drive bị từ chối");
                imgHtml = `
                    <div class="w-16 h-16 rounded-xl border border-white/5 bg-slate-950/30 flex flex-col items-center justify-center text-slate-500 transition-all duration-300 hover:border-white/10 shrink-0" title="Chi tiết: ${cleanErr}">
                        <i class="fa-solid fa-image-slash text-base text-slate-600"></i>
                    </div>
                `;
            }
        }
        
        let buttonsHtml = "";
        if (isTerminal) {
            buttonsHtml = `
                <button onclick="event.stopPropagation(); handleRePawn('${c.Ma_HD}')" 
                    class="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-emerald-500/25 flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-rotate-right"></i> Cầm Lại Món Này
                </button>
            `;
        } else {
            buttonsHtml = `
                <button onclick="event.stopPropagation(); openPayInterestModal('${c.Ma_HD}', '${c.Ten_Khach_Hang}', ${stats.accrued - stats.collected})" 
                    class="py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white font-bold rounded-xl text-xs shadow-md shadow-brand-500/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-brand-500/25 flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-hand-holding-dollar"></i> Đóng Lãi
                </button>
                <button onclick="event.stopPropagation(); openCloseContractModal('${c.Ma_HD}', '${c.Ten_Khach_Hang}', ${c.So_Tien_Cam}, ${stats.accrued - stats.collected})"
                    class="py-3 bg-slate-900/60 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-box-open"></i> Chuộc Đồ
                </button>
            `;
        }
        
        let contractCodeDisplay = isTerminal ? `<span class="text-xs text-slate-500 font-semibold ml-1">${c.Ma_HD}</span>` : "";
        
        card.innerHTML = `
            <div class="space-y-4">
                <!-- Card Header & Customer Info -->
                <div class="pb-3 border-b border-white/5 flex gap-3 justify-between items-start">
                    <div class="space-y-2.5 flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            ${statusBadge}
                            ${paymentStatusBadge}
                            ${contractCodeDisplay}
                        </div>
                        <div class="space-y-1">
                            <h4 class="text-base font-bold tracking-tight truncate ${isClosed ? 'text-slate-500 line-through' : 'text-white'}">${c.Ten_Khach_Hang}</h4>
                            <p class="text-xs text-slate-400 flex items-center gap-2">
                                <span class="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-slate-950/45 text-[9px] text-slate-400 border border-white/5">
                                    <i class="fa-solid fa-phone"></i>
                                </span>
                                <span class="font-semibold tracking-wide text-slate-300">${c.So_Dien_Thoai}</span>
                            </p>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-2 shrink-0">
                        <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold ${assetBadgeClass}">${c.Loai_Tai_San}</span>
                        ${imgHtml}
                    </div>
                </div>
                
                <!-- Quick Financial Highlights (Gốc & Nợ Lãi) -->
                <div class="grid grid-cols-2 gap-2 bg-slate-950/50 p-3.5 rounded-2xl border border-white/5">
                    <div>
                        <p class="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Vốn Cầm Gốc</p>
                        <p class="text-base font-extrabold text-white mt-0.5">${formatVND(c.So_Tien_Cam)}</p>
                    </div>
                    <div class="border-l border-white/5 pl-3">
                        <p class="text-[9px] text-slate-500 uppercase tracking-wider font-bold">${isTerminal ? 'Trạng Thái' : 'Lãi Còn Nợ'}</p>
                        <p class="text-base font-extrabold ${isTerminal ? 'text-slate-500' : 'text-amber-500'} mt-0.5">
                            ${isClosed ? 'Tất Toán' : isLiquidated ? 'Đã Thanh Lý' : formatVND(Math.max(0, stats.accrued - stats.collected))}
                        </p>
                    </div>
                </div>
 
                <!-- Asset & Interest Breakdown Grid -->
                <div class="bg-slate-950/30 rounded-2xl border border-white/5 text-[11px] overflow-hidden">
                    <div class="grid grid-cols-2 divide-x divide-white/5 border-b border-white/5">
                        <div class="px-3.5 py-2.5 min-w-0">
                            <p class="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Chi tiết</p>
                            <p class="text-white font-semibold truncate mt-0.5" title="${c.Chi_Tiet_Tai_San}">${c.Chi_Tiet_Tai_San}</p>
                        </div>
                        <div class="px-3.5 py-2.5 min-w-0">
                            <p class="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Ngày cầm</p>
                            <p class="text-white font-semibold mt-0.5 flex items-center flex-wrap gap-1">
                                <span>${c.Ngay_Cam}</span>
                                ${isTerminal ? '' : `<span class="${daysColorClass} text-[9px] font-bold">${daysStatusSuffix}</span>`}
                            </p>
                        </div>
                    </div>
                    ${isTerminal ? '' : `
                    <div class="grid grid-cols-2 divide-x divide-white/5">
                        <div class="px-3.5 py-2.5 min-w-0">
                            <p class="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Lãi tích lũy</p>
                            <p class="text-slate-200 font-semibold mt-0.5">${formatVND(stats.accrued)}</p>
                        </div>
                        <div class="px-3.5 py-2.5 min-w-0">
                            <p class="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Đã đóng lãi</p>
                            <p class="text-purple-400 font-semibold mt-0.5">${formatVND(stats.collected)}</p>
                        </div>
                    </div>
                    `}
                </div>
 
                ${c.Ghi_Chu ? `
                <div class="bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-xl text-[11px] text-amber-200/90 leading-relaxed mt-2">
                    <span class="font-semibold text-amber-400">Ghi chú:</span> ${c.Ghi_Chu}
                </div>
                ` : ""}
            </div>
            
            <div class="${isTerminal ? 'mt-6 pt-4 border-t border-white/5' : 'grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5'}" onclick="event.stopPropagation();">
                ${buttonsHtml}
            </div>
        `;
        container.appendChild(card);
    });
    
    // Auto-apply search and asset filters
    filterActiveContracts();
}

function handleRePawn(hdId) {
    const contract = state.contracts.find(c => c.Ma_HD === hdId);
    if (!contract) return;
    
    // Switch to new contract tab
    switchTab('new-contract');
    
    // Prefill form values
    document.getElementById('customer-name').value = contract.Ten_Khach_Hang;
    document.getElementById('customer-phone').value = contract.So_Dien_Thoai;
    document.getElementById('customer-cccd').value = contract.So_CCCD || "";
    document.getElementById('asset-type').value = contract.Loai_Tai_San;
    
    // Run updateAssetPlaceholders to ensure correct placeholder is set
    updateAssetPlaceholders();
    
    document.getElementById('asset-detail').value = contract.Chi_Tiet_Tai_San;
    document.getElementById('loan-amount-input').value = formatNumber(contract.So_Tien_Cam);
    document.getElementById('contract-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('contract-notes').value = contract.Ghi_Chu || "";
    
    // Handle image copying
    if (contract.Hinh_Anh) {
        uploadedImageBase64 = contract.Hinh_Anh;
        document.getElementById('upload-placeholder').classList.add('hidden');
        
        const previewContainer = document.getElementById('image-upload-preview-container');
        const previewImg = document.getElementById('image-upload-preview');
        previewImg.src = formatImageUrl(contract.Hinh_Anh);
        previewContainer.classList.remove('hidden');
    } else {
        clearUploadedImage(null, 'asset');
    }

    if (contract.Hinh_CCCD_Truoc) {
        uploadedCccdFrontBase64 = contract.Hinh_CCCD_Truoc;
        const placeholder = document.getElementById('cccd-front-upload-placeholder');
        if (placeholder) placeholder.classList.add('hidden');
        
        const previewContainer = document.getElementById('cccd-front-image-upload-preview-container');
        const previewImg = document.getElementById('cccd-front-image-upload-preview');
        if (previewImg) previewImg.src = formatImageUrl(contract.Hinh_CCCD_Truoc);
        if (previewContainer) previewContainer.classList.remove('hidden');
        
        const receiptCccdImg = document.getElementById('preview-cccd-front-img');
        const receiptCccdIcon = document.getElementById('preview-cccd-front-icon');
        if (receiptCccdImg) {
            receiptCccdImg.src = formatImageUrl(contract.Hinh_CCCD_Truoc);
            receiptCccdImg.classList.remove('hidden');
        }
        if (receiptCccdIcon) receiptCccdIcon.classList.add('hidden');
    } else {
        clearUploadedImage(null, 'cccd-front');
    }

    if (contract.Hinh_CCCD_Sau) {
        uploadedCccdBackBase64 = contract.Hinh_CCCD_Sau;
        const placeholder = document.getElementById('cccd-back-upload-placeholder');
        if (placeholder) placeholder.classList.add('hidden');
        
        const previewContainer = document.getElementById('cccd-back-image-upload-preview-container');
        const previewImg = document.getElementById('cccd-back-image-upload-preview');
        if (previewImg) previewImg.src = formatImageUrl(contract.Hinh_CCCD_Sau);
        if (previewContainer) previewContainer.classList.remove('hidden');
        
        const receiptCccdImg = document.getElementById('preview-cccd-back-img');
        const receiptCccdIcon = document.getElementById('preview-cccd-back-icon');
        if (receiptCccdImg) {
            receiptCccdImg.src = formatImageUrl(contract.Hinh_CCCD_Sau);
            receiptCccdImg.classList.remove('hidden');
        }
        if (receiptCccdIcon) receiptCccdIcon.classList.add('hidden');
    } else {
        clearUploadedImage(null, 'cccd-back');
    }
    
    // Update live preview layout
    updateReceiptPreview();
    
    showToast(`Đã lấy thông tin từ HĐ cũ (${hdId})!`, "success");
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
        row.dataset.date = item.Ngay_Dong_Lai || "";
        row.dataset.searchText = `${item.Ma_Giao_Dich} ${item.Ma_HD} ${item.Ten_Khach_Hang} ${item.Ghi_Chu}`.toLowerCase();
        row.innerHTML = `
            <td data-label="Mã Giao Dịch" class="py-4 px-6 font-semibold text-slate-400 text-xs">${item.Ma_Giao_Dich}</td>
            <td data-label="Mã HĐ" class="py-4 px-6 text-brand-400 font-bold text-xs cursor-pointer hover:underline" onclick="openContractDetailsModal('${item.Ma_HD}')" title="Xem chi tiết hợp đồng">${item.Ma_HD}</td>
            <td data-label="Khách Hàng" class="py-4 px-6 text-white font-medium">${item.Ten_Khach_Hang}</td>
            <td data-label="Ngày Giao Dịch" class="py-4 px-6 text-slate-400">${item.Ngay_Dong_Lai}</td>
            <td data-label="Số Tiền Thu" class="py-4 px-6 text-right font-extrabold text-emerald-400">${formatVND(item.So_Tien_Dong)}</td>
            <td data-label="Loại/Ghi Chú" class="py-4 px-6 text-xs text-slate-300">
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
    
    // Liquidating calculations
    const liquidating = state.contracts.filter(c => c.Trang_Thai === 'Liquidating');
    const liquidatingCount = liquidating.length;
    const liquidatingCapital = liquidating.reduce((sum, c) => sum + (parseFloat(c.So_Tien_Cam) || 0), 0);
    
    // Liquidated / Capital recovered calculations
    const liquidated = state.contracts.filter(c => c.Trang_Thai === 'Liquidated');
    const liquidatedCount = liquidated.length;
    
    let totalRecovered = 0;
    state.history.forEach(item => {
        if (item.Ghi_Chu.includes("Thanh lý tài sản thu hồi vốn")) {
            totalRecovered += parseFloat(item.So_Tien_Dong) || 0;
        }
    });
    
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

    const monthAddedCount = state.contracts.filter(c => {
        if (!c.Ngay_Cam) return false;
        const addedDate = new Date(c.Ngay_Cam);
        addedDate.setHours(0, 0, 0, 0);
        return addedDate >= startOfMonth;
    }).length;

    const monthClosedCount = state.history.filter(item => {
        if (!item.Ngay_Dong_Lai) return false;
        const txDate = new Date(item.Ngay_Dong_Lai);
        txDate.setHours(0, 0, 0, 0);
        return txDate >= startOfMonth && (item.Ghi_Chu.includes("Tất toán") || item.Ghi_Chu.includes("Chuộc đồ"));
    }).length;
    
    const tabActiveCountEl = document.getElementById('stat-tab-active-count');
    const tabTotalCapitalEl = document.getElementById('stat-tab-total-capital');
    const tabWeekInterestEl = document.getElementById('stat-tab-week-interest');
    const tabMonthInterestEl = document.getElementById('stat-tab-month-interest');
    const tabMonthAddedEl = document.getElementById('stat-tab-month-added-count');
    const tabMonthClosedEl = document.getElementById('stat-tab-month-closed-count');
    const tabLiquidatingCapitalEl = document.getElementById('stat-tab-liquidating-capital');
    const tabLiquidatingCountEl = document.getElementById('stat-tab-liquidating-count');
    const tabRecoveredCapitalEl = document.getElementById('stat-tab-recovered-capital');
    const tabLiquidatedCountEl = document.getElementById('stat-tab-liquidated-count');
    
    if (tabActiveCountEl) tabActiveCountEl.innerText = activeCount;
    if (tabTotalCapitalEl) tabTotalCapitalEl.innerText = formatVND(totalCapital);
    if (tabWeekInterestEl) tabWeekInterestEl.innerText = formatVND(weekInterest);
    if (tabMonthInterestEl) tabMonthInterestEl.innerText = formatVND(monthInterest);
    if (tabMonthAddedEl) tabMonthAddedEl.innerText = monthAddedCount;
    if (tabMonthClosedEl) tabMonthClosedEl.innerText = monthClosedCount;
    if (tabLiquidatingCapitalEl) tabLiquidatingCapitalEl.innerText = formatVND(liquidatingCapital);
    if (tabLiquidatingCountEl) tabLiquidatingCountEl.innerText = `${liquidatingCount} hợp đồng chờ thanh lý (Click xem)`;
    if (tabRecoveredCapitalEl) tabRecoveredCapitalEl.innerText = formatVND(totalRecovered);
    if (tabLiquidatedCountEl) tabLiquidatedCountEl.innerText = `Từ ${liquidatedCount} hợp đồng đã thanh lý`;
    
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
                <td class="py-3 px-4 font-semibold text-slate-100">${cat}</td>
                <td class="py-3 px-4 text-center font-bold text-brand-400">${catContracts.length} HĐ</td>
                <td class="py-3 px-4 text-right font-bold text-emerald-400">${formatVND(catCapital)}</td>
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
                    <td colspan="5" class="py-10 text-center text-slate-400">
                        <div class="flex flex-col items-center justify-center space-y-2">
                            <i class="fa-solid fa-receipt text-3xl text-slate-600/50 mb-1"></i>
                            <p class="text-xs font-semibold text-slate-400">Chưa có lượt đóng lãi nào trong tháng này</p>
                            <p class="text-[10px] text-slate-500">Các giao dịch đóng lãi phát sinh sẽ được hiển thị tại đây.</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            currentMonthTxs.forEach(item => {
                const interestAmount = getInterestFromTransaction(item);
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-800/20 border-b border-slate-800/50 transition duration-150";
                tr.innerHTML = `
                    <td class="py-3 px-4 text-slate-400">${item.Ngay_Dong_Lai}</td>
                    <td class="py-3 px-4 text-brand-400 font-bold cursor-pointer hover:underline" onclick="openContractDetailsModal('${item.Ma_HD}')" title="Xem chi tiết hợp đồng">${item.Ma_HD}</td>
                    <td class="py-3 px-4 text-slate-200 font-medium">${item.Ten_Khach_Hang}</td>
                    <td class="py-3 px-4 text-right font-extrabold text-emerald-400">${formatVND(interestAmount)}</td>
                    <td class="py-3 px-4 text-[10px] text-slate-400">
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
    const cccd = document.getElementById('customer-cccd').value.trim() || "Chưa nhập";
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
    document.getElementById('preview-cccd').innerText = cccd.toUpperCase();
    document.getElementById('preview-asset-type').innerText = assetType;
    document.getElementById('preview-asset-detail').innerText = assetDetail;
    document.getElementById('preview-date').innerText = formatDateToDMY(dateVal);
    
    const previewDetailLabel = document.getElementById('preview-asset-detail-label');
    if (previewDetailLabel) {
        previewDetailLabel.innerText = assetType === 'Honda' ? "Biển số xe:" : "Chi tiết thiết bị:";
    }
    
    document.getElementById('preview-amount').innerText = formatNumber(amountVal);
    document.getElementById('preview-amount-words').innerText = numberToWords(amountVal).toUpperCase();
    document.getElementById('preview-signature-name').innerText = name !== "Chưa nhập" ? name : ".................";
    
    const noteEl = document.getElementById('preview-interest-note');
    if (noteEl) {
        if (assetType === 'Honda') {
            noteEl.innerText = "Chu kỳ 1 tháng";
        } else {
            noteEl.innerText = "Chu kỳ 14 ngày";
        }
    }
    
    const termsEl = document.getElementById('preview-terms-note');
    if (termsEl) {
        if (assetType === 'Honda') {
            termsEl.innerText = "Biên nhận này có giá trị 01 tháng. Nếu quá hạn 07 ngày, Quý khách không đến chuộc hoặc đóng lãi thì chúng tôi sẽ thanh lý món hàng cầm để thu hồi vốn. Mọi khiếu nại chúng tôi sẽ không giải quyết.";
        } else {
            termsEl.innerText = "Biên nhận này có giá trị 14 ngày. Nếu quá hạn 07 ngày, Quý khách không đến chuộc hoặc đóng lãi thì chúng tôi sẽ thanh lý món hàng cầm để thu hồi vốn. Mọi khiếu nại chúng tôi sẽ không giải quyết.";
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
let uploadedCccdFrontBase64 = "";
let uploadedCccdBackBase64 = "";

function previewUploadImage(input, type = 'asset') {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const rawBase64 = e.target.result;
        
        const img = new Image();
        img.src = rawBase64;
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 500;
            const MAX_HEIGHT = 500;
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
            
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
            
            if (type === 'cccd-front') {
                uploadedCccdFrontBase64 = compressedBase64;
                
                const placeholder = document.getElementById('cccd-front-upload-placeholder');
                if (placeholder) placeholder.classList.add('hidden');
                
                const previewContainer = document.getElementById('cccd-front-image-upload-preview-container');
                const previewImg = document.getElementById('cccd-front-image-upload-preview');
                if (previewImg) previewImg.src = uploadedCccdFrontBase64;
                if (previewContainer) previewContainer.classList.remove('hidden');
                
                // Update live preview
                const receiptCccdImg = document.getElementById('preview-cccd-front-img');
                const receiptCccdIcon = document.getElementById('preview-cccd-front-icon');
                if (receiptCccdImg) {
                    receiptCccdImg.src = uploadedCccdFrontBase64;
                    receiptCccdImg.classList.remove('hidden');
                }
                if (receiptCccdIcon) receiptCccdIcon.classList.add('hidden');
                
                showToast("Ảnh CCCD mặt trước tải lên thành công!", "info");
            } else if (type === 'cccd-back') {
                uploadedCccdBackBase64 = compressedBase64;
                
                const placeholder = document.getElementById('cccd-back-upload-placeholder');
                if (placeholder) placeholder.classList.add('hidden');
                
                const previewContainer = document.getElementById('cccd-back-image-upload-preview-container');
                const previewImg = document.getElementById('cccd-back-image-upload-preview');
                if (previewImg) previewImg.src = uploadedCccdBackBase64;
                if (previewContainer) previewContainer.classList.remove('hidden');
                
                // Update live preview
                const receiptCccdImg = document.getElementById('preview-cccd-back-img');
                const receiptCccdIcon = document.getElementById('preview-cccd-back-icon');
                if (receiptCccdImg) {
                    receiptCccdImg.src = uploadedCccdBackBase64;
                    receiptCccdImg.classList.remove('hidden');
                }
                if (receiptCccdIcon) receiptCccdIcon.classList.add('hidden');
                
                showToast("Ảnh CCCD mặt sau tải lên thành công!", "info");
            } else {
                uploadedImageBase64 = compressedBase64;
                
                const placeholder = document.getElementById('upload-placeholder');
                if (placeholder) placeholder.classList.add('hidden');
                
                const previewContainer = document.getElementById('image-upload-preview-container');
                const previewImg = document.getElementById('image-upload-preview');
                if (previewImg) previewImg.src = uploadedImageBase64;
                if (previewContainer) previewContainer.classList.remove('hidden');
                
                showToast("Hình ảnh tài sản đã tải lên thành công!", "info");
            }
        };
    };
    reader.readAsDataURL(file);
}

function clearUploadedImage(e, type = 'asset') {
    if (e) e.stopPropagation();
    
    if (type === 'cccd-front') {
        document.getElementById('cccd-front-image').value = "";
        uploadedCccdFrontBase64 = "";
        const previewImg = document.getElementById('cccd-front-image-upload-preview');
        if (previewImg) previewImg.src = "";
        const previewContainer = document.getElementById('cccd-front-image-upload-preview-container');
        if (previewContainer) previewContainer.classList.add('hidden');
        const placeholder = document.getElementById('cccd-front-upload-placeholder');
        if (placeholder) placeholder.classList.remove('hidden');
        
        // Update live preview
        const receiptCccdImg = document.getElementById('preview-cccd-front-img');
        const receiptCccdIcon = document.getElementById('preview-cccd-front-icon');
        if (receiptCccdImg) {
            receiptCccdImg.src = "";
            receiptCccdImg.classList.add('hidden');
        }
        if (receiptCccdIcon) receiptCccdIcon.classList.remove('hidden');
    } else if (type === 'cccd-back') {
        document.getElementById('cccd-back-image').value = "";
        uploadedCccdBackBase64 = "";
        const previewImg = document.getElementById('cccd-back-image-upload-preview');
        if (previewImg) previewImg.src = "";
        const previewContainer = document.getElementById('cccd-back-image-upload-preview-container');
        if (previewContainer) previewContainer.classList.add('hidden');
        const placeholder = document.getElementById('cccd-back-upload-placeholder');
        if (placeholder) placeholder.classList.remove('hidden');
        
        // Update live preview
        const receiptCccdImg = document.getElementById('preview-cccd-back-img');
        const receiptCccdIcon = document.getElementById('preview-cccd-back-icon');
        if (receiptCccdImg) {
            receiptCccdImg.src = "";
            receiptCccdImg.classList.add('hidden');
        }
        if (receiptCccdIcon) receiptCccdIcon.classList.remove('hidden');
    } else {
        document.getElementById('asset-image').value = "";
        uploadedImageBase64 = "";
        const previewImg = document.getElementById('image-upload-preview');
        if (previewImg) previewImg.src = "";
        const previewContainer = document.getElementById('image-upload-preview-container');
        if (previewContainer) previewContainer.classList.add('hidden');
        const placeholder = document.getElementById('upload-placeholder');
        if (placeholder) placeholder.classList.remove('hidden');
    }
}

// ==================== TRANSACTION HANDLERS ====================
async function handleCreateContract(e) {
    e.preventDefault();
    if (isSubmitting) return;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
    }
    isSubmitting = true;
    
    try {
        const name = document.getElementById('customer-name').value.trim();
        const phone = document.getElementById('customer-phone').value.trim();
        const cccd = document.getElementById('customer-cccd').value.trim();
        const assetType = document.getElementById('asset-type').value;
        const assetDetail = document.getElementById('asset-detail').value.trim();
        const rawAmount = document.getElementById('loan-amount-input').value.replace(/,/g, '');
        const amountVal = parseFloat(rawAmount) || 0;
        const dateVal = document.getElementById('contract-date').value;
        const notes = document.getElementById('contract-notes').value.trim();
        
        if (amountVal <= 0) {
            showToast("Số tiền cầm phải lớn hơn 0!", "error");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
            isSubmitting = false;
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
            So_CCCD: cccd,
            Loai_Tai_San: assetType,
            Chi_Tiet_Tai_San: assetDetail,
            So_Tien_Cam: amountVal,
            Ngay_Cam: dateVal,
            Ghi_Chu: notes
        };
        
        const res = await postToAPI(payload);
        
        if (res.success) {
            const newContract = {
                Ma_HD: newHdId,
                Ten_Khach_Hang: name,
                So_Dien_Thoai: phone,
                So_CCCD: cccd,
                Loai_Tai_San: assetType,
                Chi_Tiet_Tai_San: assetDetail,
                So_Tien_Cam: amountVal,
                Ngay_Cam: dateVal,
                Trang_Thai: "Active",
                Ghi_Chu: notes,
                Hinh_Anh: uploadedImageBase64,
                Hinh_CCCD_Truoc: uploadedCccdFrontBase64,
                Hinh_CCCD_Sau: uploadedCccdBackBase64
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
            
            // Save base64 variables for async upload before cleaning preview
            const imgBase64 = uploadedImageBase64;
            const cccdFrontBase64 = uploadedCccdFrontBase64;
            const cccdBackBase64 = uploadedCccdBackBase64;
            
            clearUploadedImage(null, 'asset');
            clearUploadedImage(null, 'cccd-front');
            clearUploadedImage(null, 'cccd-back');
            updateReceiptPreview();
            
            showToast("Tạo hợp đồng thành công!", "success");
            switchTab('active-contracts');
            
            // Background uploading
            if (imgBase64 || cccdFrontBase64 || cccdBackBase64) {
                showToast("Đang tải hình ảnh lên hệ thống chạy ngầm...", "info");
                uploadContractImagesBackground(newHdId, imgBase64, cccdFrontBase64, cccdBackBase64);
            }
        } else {
            showToast("Gặp lỗi khi lưu hợp đồng: " + (res.error || "Lỗi API"), "error");
        }
    } catch (error) {
        console.error("Lỗi trong handleCreateContract:", error);
        showToast("Đã xảy ra lỗi hệ thống khi lưu hợp đồng!", "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
        isSubmitting = false;
        showLoading(false);
        // Do not sync synchronously if uploading images in background
        if (!uploadedImageBase64 && !uploadedCccdFrontBase64 && !uploadedCccdBackBase64) {
            syncData();
        }
    }
}

function uploadContractImagesBackground(hdId, imageBase64, cccdFrontBase64, cccdBackBase64) {
    const payload = {
        action: "updateImages",
        Ma_HD: hdId,
        image_data: imageBase64 || "",
        image_name: `pawn_${hdId}.jpg`,
        cccd_front_image_data: cccdFrontBase64 || "",
        cccd_front_image_name: `cccd_front_${hdId}.jpg`,
        cccd_back_image_data: cccdBackBase64 || "",
        cccd_back_image_name: `cccd_back_${hdId}.jpg`
    };
    
    postToAPI(payload).then(res => {
        if (res && res.success) {
            console.log(`Đã tải hình ảnh cho HĐ ${hdId} chạy ngầm thành công.`);
            showToast(`Đã đồng bộ hình ảnh hợp đồng ${hdId}!`, "success");
            syncData(true); // silent sync
        } else {
            console.error(`Lỗi tải ảnh ngầm HĐ ${hdId}:`, res ? res.error : "Không phản hồi");
        }
    }).catch(err => {
        console.error(`Lỗi kết nối tải ảnh ngầm HĐ ${hdId}:`, err);
    });
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
    if (isSubmitting) return;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
    }
    isSubmitting = true;
    
    try {
        const hdId = document.getElementById('modal-pay-hd-id').value;
        const name = document.getElementById('modal-pay-customer-name').value;
        const rawAmount = document.getElementById('modal-pay-amount-input').value.replace(/,/g, '');
        const amountVal = parseFloat(rawAmount) || 0;
        const notes = document.getElementById('modal-pay-notes').value.trim();
        
        if (amountVal <= 0) {
            showToast("Số tiền đóng phải lớn hơn 0!", "error");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
            isSubmitting = false;
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
    } catch (error) {
        console.error("Lỗi trong handlePayInterest:", error);
        showToast("Đã xảy ra lỗi hệ thống khi đóng lãi!", "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
        isSubmitting = false;
        showLoading(false);
        syncData();
    }
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
    if (isSubmitting) return;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
    }
    isSubmitting = true;
    
    try {
        const hdId = document.getElementById('modal-close-hd-id').value;
        const name = document.getElementById('modal-close-customer-name').value;
        const rawAmount = document.getElementById('modal-close-amount-input').value.replace(/,/g, '');
        const amountVal = parseFloat(rawAmount) || 0;
        
        if (amountVal <= 0) {
            showToast("Số tiền đóng phải lớn hơn 0!", "error");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
            isSubmitting = false;
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
    } catch (error) {
        console.error("Lỗi trong handleCloseContract:", error);
        showToast("Đã xảy ra lỗi hệ thống khi tất toán!", "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
        isSubmitting = false;
        showLoading(false);
        syncData();
    }
}

// ==================== SEARCH & FILTERS ====================
function filterActiveContracts() {
    const query = document.getElementById('search-active').value.toLowerCase().trim();
    const filterAsset = document.getElementById('filter-asset').value;
    
    const cards = document.getElementById('active-contracts-grid').children;
    let visibleCount = 0;
    
    for (let card of cards) {
        const searchText = card.dataset.searchText || "";
        const assetType = card.dataset.assetType || "";
        
        const isAssetMatch = filterAsset === 'All' || assetType === filterAsset;
        const isSearchMatch = !query || searchText.includes(query);
        
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
        const searchText = row.dataset.searchText || "";
        const rowDate = row.dataset.date || "";
        
        const isDateMatch = !dateVal || rowDate === dateVal;
        const isSearchMatch = !query || searchText.includes(query);
        
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
    document.getElementById('detail-modal-cccd').innerText = contract.So_CCCD || 'Chưa có';
    document.getElementById('detail-modal-asset-type').innerText = contract.Loai_Tai_San;
    document.getElementById('detail-modal-asset-detail').innerText = contract.Chi_Tiet_Tai_San;
    document.getElementById('detail-modal-date').innerText = contract.Ngay_Cam;
    
    const statusEl = document.getElementById('detail-modal-status');
    if (contract.Trang_Thai === 'Active') {
        const unpaidDays = getUnpaidDays(contract, stats);
        const isHonda = contract.Loai_Tai_San === 'Honda';
        const limitDue = isHonda ? 20 : 5;
        const limitOverdue = isHonda ? 30 : 7;
        
        if (unpaidDays === 0 || unpaidDays <= limitDue) {
            statusEl.innerText = 'Bình thường';
            statusEl.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        } else if (unpaidDays <= limitOverdue) {
            statusEl.innerText = 'Đến hạn đóng lãi';
            statusEl.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20";
        } else {
            statusEl.innerText = `Trễ hạn ${unpaidDays} ngày`;
            statusEl.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20";
        }
    } else if (contract.Trang_Thai === 'Liquidating') {
        statusEl.innerText = 'Chờ thanh lý';
        statusEl.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20";
    } else if (contract.Trang_Thai === 'Liquidated') {
        statusEl.innerText = 'Đã thanh lý';
        statusEl.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20";
    } else {
        statusEl.innerText = 'Đã tất toán';
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
        const displayUrl = formatImageUrl(contract.Hinh_Anh, 400);
        const zoomUrl = formatImageUrl(contract.Hinh_Anh, 1200);
        if (displayUrl.startsWith("http") || displayUrl.startsWith("data:")) {
            imgContainer.innerHTML = `<img src="${displayUrl}" class="max-h-full max-w-full object-cover cursor-zoom-in rounded-lg" onclick="openLightbox('${zoomUrl}')" onerror="this.outerHTML='<div class=\'flex flex-col items-center justify-center text-slate-500 p-4 border border-white/5 bg-slate-950/20 rounded-xl\'><i class=\'fa-solid fa-image-slash text-2xl mb-2 text-slate-600\'></i><span class=\'text-xs font-semibold text-slate-500\'>Ảnh không khả dụng</span></div>';">`;
        } else {
            imgContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center text-slate-500 p-4 border border-white/5 bg-slate-950/20 rounded-xl" title="Chi tiết: ${contract.Hinh_Anh}">
                    <i class="fa-solid fa-image-slash text-2xl mb-2 text-slate-600"></i>
                    <span class="text-xs font-semibold text-slate-500">Ảnh không khả dụng</span>
                </div>
            `;
        }
    } else {
        imgContainer.innerHTML = `<span class="text-slate-500 italic text-[11px]">Không có ảnh đính kèm</span>`;
    }
    
    const cccdFrontImgContainer = document.getElementById('detail-modal-cccd-front-image-container');
    if (cccdFrontImgContainer) {
        if (contract.Hinh_CCCD_Truoc) {
            const displayUrl = formatImageUrl(contract.Hinh_CCCD_Truoc, 400);
            const zoomUrl = formatImageUrl(contract.Hinh_CCCD_Truoc, 1200);
            if (displayUrl.startsWith("http") || displayUrl.startsWith("data:")) {
                cccdFrontImgContainer.innerHTML = `<img src="${displayUrl}" class="max-h-full max-w-full object-cover cursor-zoom-in rounded-lg" onclick="openLightbox('${zoomUrl}')" onerror="this.outerHTML='<div class=\'flex flex-col items-center justify-center text-slate-500 p-2 border border-white/5 bg-slate-950/20 rounded-xl\'><i class=\'fa-solid fa-image-slash text-lg mb-1 text-slate-600\'></i><span class=\'text-[10px] font-semibold text-slate-500\'>Ảnh không khả dụng</span></div>';">`;
            } else {
                cccdFrontImgContainer.innerHTML = `
                    <div class="flex flex-col items-center justify-center text-slate-500 p-2 border border-white/5 bg-slate-950/20 rounded-xl" title="Chi tiết: ${contract.Hinh_CCCD_Truoc}">
                        <i class="fa-solid fa-image-slash text-lg mb-1 text-slate-600"></i>
                        <span class="text-[10px] font-semibold text-slate-500">Ảnh không khả dụng</span>
                    </div>
                `;
            }
        } else {
            cccdFrontImgContainer.innerHTML = `<span class="text-slate-500 italic text-[11px]">Không có ảnh mặt trước</span>`;
        }
    }

    const cccdBackImgContainer = document.getElementById('detail-modal-cccd-back-image-container');
    if (cccdBackImgContainer) {
        if (contract.Hinh_CCCD_Sau) {
            const displayUrl = formatImageUrl(contract.Hinh_CCCD_Sau, 400);
            const zoomUrl = formatImageUrl(contract.Hinh_CCCD_Sau, 1200);
            if (displayUrl.startsWith("http") || displayUrl.startsWith("data:")) {
                cccdBackImgContainer.innerHTML = `<img src="${displayUrl}" class="max-h-full max-w-full object-cover cursor-zoom-in rounded-lg" onclick="openLightbox('${zoomUrl}')" onerror="this.outerHTML='<div class=\'flex flex-col items-center justify-center text-slate-500 p-2 border border-white/5 bg-slate-950/20 rounded-xl\'><i class=\'fa-solid fa-image-slash text-lg mb-1 text-slate-600\'></i><span class=\'text-[10px] font-semibold text-slate-500\'>Ảnh không khả dụng</span></div>';">`;
            } else {
                cccdBackImgContainer.innerHTML = `
                    <div class="flex flex-col items-center justify-center text-slate-500 p-2 border border-white/5 bg-slate-950/20 rounded-xl" title="Chi tiết: ${contract.Hinh_CCCD_Sau}">
                        <i class="fa-solid fa-image-slash text-lg mb-1 text-slate-600"></i>
                        <span class="text-[10px] font-semibold text-slate-500">Ảnh không khả dụng</span>
                    </div>
                `;
            }
        } else {
            cccdBackImgContainer.innerHTML = `<span class="text-slate-500 italic text-[11px]">Không có ảnh mặt sau</span>`;
        }
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
    const repawnBtn = document.getElementById('detail-modal-repawn-btn');
    const liquidateBtn = document.getElementById('detail-modal-liquidate-btn');
    
    // Setup Edit button
    const editBtn = document.getElementById('detail-modal-edit-btn');
    
    if (contract.Trang_Thai === 'Active' || contract.Trang_Thai === 'Liquidating') {
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
        
        if (repawnBtn) repawnBtn.classList.add('hidden');
        
        if (editBtn) {
            editBtn.classList.remove('hidden');
            editBtn.onclick = () => {
                closeContractDetailsModal();
                openEditContractModal(hdId);
            };
        }
        
        if (liquidateBtn) {
            liquidateBtn.classList.remove('hidden');
            liquidateBtn.onclick = () => {
                closeContractDetailsModal();
                openLiquidateContractModal(hdId, contract.Ten_Khach_Hang, contract.So_Tien_Cam);
            };
        }
    } else {
        payBtn.classList.add('hidden');
        closeHdBtn.classList.add('hidden');
        if (liquidateBtn) liquidateBtn.classList.add('hidden');
        if (editBtn) editBtn.classList.add('hidden');
        
        if (repawnBtn) {
            repawnBtn.classList.remove('hidden');
            repawnBtn.onclick = () => {
                closeContractDetailsModal();
                handleRePawn(hdId);
            };
        }
    }
    
    document.getElementById('contract-details-modal').classList.remove('hidden');
}

function closeContractDetailsModal() {
    document.getElementById('contract-details-modal').classList.add('hidden');
}

async function printContractReceipt(contractId) {
    if (isSubmitting) return;
    const contract = state.contracts.find(c => c.Ma_HD === contractId);
    if (!contract) return;
    
    const printBtn = document.getElementById('detail-modal-print-btn');
    if (printBtn) {
        printBtn.disabled = true;
        printBtn.style.opacity = '0.5';
    }
    isSubmitting = true;
    
    try {
        // Temporarily overwrite receipt preview element
        document.getElementById('preview-id').innerText = contract.Ma_HD;
        document.getElementById('preview-name').innerText = contract.Ten_Khach_Hang;
        document.getElementById('preview-phone').innerText = contract.So_Dien_Thoai;
        document.getElementById('preview-cccd').innerText = contract.So_CCCD || 'CHƯA NHẬP';
        
        const frontCccdImg = document.getElementById('preview-cccd-front-img');
        const frontCccdIcon = document.getElementById('preview-cccd-front-icon');
        if (contract.Hinh_CCCD_Truoc) {
            if (frontCccdImg) {
                frontCccdImg.src = formatImageUrl(contract.Hinh_CCCD_Truoc, 600);
                frontCccdImg.classList.remove('hidden');
            }
            if (frontCccdIcon) frontCccdIcon.classList.add('hidden');
        } else {
            if (frontCccdImg) {
                frontCccdImg.src = "";
                frontCccdImg.classList.add('hidden');
            }
            if (frontCccdIcon) frontCccdIcon.classList.remove('hidden');
        }

        const backCccdImg = document.getElementById('preview-cccd-back-img');
        const backCccdIcon = document.getElementById('preview-cccd-back-icon');
        if (contract.Hinh_CCCD_Sau) {
            if (backCccdImg) {
                backCccdImg.src = formatImageUrl(contract.Hinh_CCCD_Sau, 600);
                backCccdImg.classList.remove('hidden');
            }
            if (backCccdIcon) backCccdIcon.classList.add('hidden');
        } else {
            if (backCccdImg) {
                backCccdImg.src = "";
                backCccdImg.classList.add('hidden');
            }
            if (backCccdIcon) backCccdIcon.classList.remove('hidden');
        }

        document.getElementById('preview-asset-type').innerText = contract.Loai_Tai_San;
        document.getElementById('preview-asset-detail').innerText = contract.Chi_Tiet_Tai_San;
        document.getElementById('preview-date').innerText = formatDateToDMY(contract.Ngay_Cam);
        
        const previewDetailLabel = document.getElementById('preview-asset-detail-label');
        if (previewDetailLabel) {
            previewDetailLabel.innerText = contract.Loai_Tai_San === 'Honda' ? "Biển số xe:" : "Chi tiết thiết bị:";
        }
        
        const amountVal = parseFloat(contract.So_Tien_Cam) || 0;
        document.getElementById('preview-amount').innerText = formatNumber(amountVal);
        document.getElementById('preview-amount-words').innerText = numberToWords(amountVal).toUpperCase();
        document.getElementById('preview-signature-name').innerText = contract.Ten_Khach_Hang;
        
        const noteEl = document.getElementById('preview-interest-note');
        if (noteEl) {
            if (contract.Loai_Tai_San === 'Honda') {
                noteEl.innerText = "Chu kỳ 1 tháng";
            } else {
                noteEl.innerText = "Chu kỳ 14 ngày";
            }
        }
        
        const termsEl = document.getElementById('preview-terms-note');
        if (termsEl) {
            if (contract.Loai_Tai_San === 'Honda') {
                termsEl.innerText = "Biên nhận này có giá trị 01 tháng. Nếu quá hạn 07 ngày, Quý khách không đến chuộc hoặc đóng lãi thì chúng tôi sẽ thanh lý món hàng cầm để thu hồi vốn. Mọi khiếu nại chúng tôi sẽ không giải quyết.";
            } else {
                termsEl.innerText = "Biên nhận này có giá trị 14 ngày. Nếu quá hạn 07 ngày, Quý khách không đến chuộc hoặc đóng lãi thì chúng tôi sẽ thanh lý món hàng cầm để thu hồi vốn. Mọi khiếu nại chúng tôi sẽ không giải quyết.";
            }
        }
        
        showToast(`Đang xuất hóa đơn PDF cho hợp đồng ${contract.Ma_HD}...`, "info");
        await exportReceiptToPDF(contract.Ma_HD);
    } catch (error) {
        console.error("Lỗi khi xuất PDF:", error);
        showToast("Không thể xuất hóa đơn PDF!", "error");
    } finally {
        if (printBtn) {
            printBtn.disabled = false;
            printBtn.style.opacity = '1';
        }
        isSubmitting = false;
    }
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

function formatImageUrl(url, size) {
    if (!url) return "";
    if (url.startsWith("data:")) return url;
    if (url.includes("drive.google.com")) {
        let id = "";
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            id = match[1];
            return `https://lh3.googleusercontent.com/d/${id}${size ? '=s' + size : ''}`;
        }
    }
    return url;
}

function handleImageLoadError(img) {
    const parent = img.parentElement;
    if (parent) {
        parent.innerHTML = `
            <div class="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-500 bg-slate-950/25 p-2 text-center gap-1">
                <i class="fa-solid fa-image-slash text-lg text-slate-600"></i>
                <span class="font-semibold tracking-wide">Ảnh không khả dụng</span>
            </div>
        `;
        parent.classList.remove('cursor-zoom-in', 'hover:border-white/10');
        parent.removeAttribute('onclick');
    }
}

// Close Lightbox Image Modal
function closeLightbox() {
    document.getElementById('lightbox-modal').classList.add('hidden');
}

function formatCurrencyInput(input) {
    const clean = input.value.replace(/\D/g, '');
    if (clean === "") {
        input.value = "";
    } else {
        const parsed = parseInt(clean, 10);
        input.value = isNaN(parsed) ? "" : formatNumber(parsed);
    }
    updateReceiptPreview();
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatVND(amount) {
    return formatNumber(Math.round(amount)) + "đ";
}

function formatDateToDMY(dateString) {
    if (!dateString) return "";
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
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
    const previewAssetDetail = document.getElementById('preview-asset-detail')?.innerText || '';
    const previewDate = document.getElementById('preview-date')?.innerText || '';
    const previewAmount = document.getElementById('preview-amount')?.innerText || '0đ';
    const previewAmountWords = document.getElementById('preview-amount-words')?.innerText || '';
    const previewInterestNote = document.getElementById('preview-interest-note')?.innerText || '';
    const previewSignatureName = document.getElementById('preview-signature-name')?.innerText || '.................';
    const previewTermsNote = document.getElementById('preview-terms-note')?.innerText || 'Biên nhận này có giá trị 01 tháng. Nếu quá hạn 07 ngày, Quý khách không đến chuộc hoặc đóng lãi thì chúng tôi sẽ thanh lý món hàng cầm để thu hồi vốn. Mọi khiếu nại chúng tôi sẽ không giải quyết.';
    const previewCccd = document.getElementById('preview-cccd')?.innerText || 'CHƯA NHẬP';

    const frontCccdImgEl = document.getElementById('preview-cccd-front-img');
    const hasFrontCccdImg = frontCccdImgEl && !frontCccdImgEl.classList.contains('hidden') && frontCccdImgEl.src;
    let frontCccdImgHtml = '';
    if (hasFrontCccdImg) {
        frontCccdImgHtml = `<img src="${frontCccdImgEl.src}" style="max-height:144px;max-width:100%;border-radius:4px;object-fit:contain;display:block;margin:0 auto;" />`;
    } else {
        frontCccdImgHtml = `<div style="text-align:center;font-size:24px;color:#aaa;line-height:144px;">💳</div>`;
    }

    const backCccdImgEl = document.getElementById('preview-cccd-back-img');
    const hasBackCccdImg = backCccdImgEl && !backCccdImgEl.classList.contains('hidden') && backCccdImgEl.src;
    let backCccdImgHtml = '';
    if (hasBackCccdImg) {
        backCccdImgHtml = `<img src="${backCccdImgEl.src}" style="max-height:144px;max-width:100%;border-radius:4px;object-fit:contain;display:block;margin:0 auto;" />`;
    } else {
        backCccdImgHtml = `<div style="text-align:center;font-size:24px;color:#aaa;line-height:144px;">💳</div>`;
    }

    const qrBase64 = 'data:image/jpeg;base64,' + (window._qrBase64Cache || '');
    
    const pdfContainer = document.createElement('div');
    pdfContainer.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
    document.body.appendChild(pdfContainer);
    
    pdfContainer.innerHTML = `
    <div id="pdf-render-area" style="width:540px;height:765px;background:#fff;color:#000;font-family:Arial, Helvetica, sans-serif;font-size:12px;line-height:1.6;box-sizing:border-box;overflow:hidden;padding:14px;display:flex;flex-direction:column;">
        <div style="border:2px solid #000;padding:18px;border-radius:12px;box-sizing:border-box;height:100%;display:flex;flex-direction:column;flex:1;">
        
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;border-bottom:1.5px dashed #000;padding-bottom:8px;">
            <tr>
                <td style="width:50%;vertical-align:top;text-align:left;padding-right:10px;">
                    <div style="font-size:14px;font-weight:700;letter-spacing:1px;color:#000;margin-bottom:2px;text-transform:uppercase;">DỊCH VỤ CẦM ĐỒ 60</div>
                    <div style="font-size:9.5px;color:#222;line-height:1.3;margin-bottom:1px;">ĐC: số 60_ Phước Thiện_ P. long Bình_ TP.HCM</div>
                    <div style="font-size:9.5px;color:#222;line-height:1.3;margin-bottom:1px;">THU MUA XE MÁY CŨ_ ĐIỆN THOẠI CŨ GIÁ CAO</div>
                    <div style="font-size:9.5px;color:#000;font-weight:700;line-height:1.3;margin-top:2px;">Cầm xe máy và ô tô lãi suất thấp nhất khu vực.</div>
                </td>
                <td style="width:50%;vertical-align:top;text-align:center;border-left:1px solid #ccc;padding-left:10px;">
                    <div style="font-size:9px;font-weight:700;color:#000;margin-bottom:1px;line-height:1.3;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div style="font-size:8px;font-weight:700;color:#222;margin-bottom:4px;border-bottom:1px solid #777;display:inline-block;padding-bottom:2px;">Độc lập - Tự do - Hạnh phúc</div>
                    <div style="font-size:14px;font-weight:700;color:#000;letter-spacing:2px;margin-top:4px;text-transform:uppercase;">HỢP ĐỒNG CẦM ĐỒ</div>
                    <div style="font-size:14px;font-weight:800;color:#000;margin-top:2px;text-transform:uppercase;">SỐ: </div>
                    <div style="font-size:10px;color:#222;margin-top:1px;">Hotline: 0962772783(ZALO) (Mr. Long)</div>
                </td>
            </tr>
        </table>
        
        <table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:11px;color:#000;">
            <tr>
                <td style="width:110px;font-weight:700;color:#333;padding:4px 0;">KHÁCH HÀNG</td>
                <td style="width:15px;font-weight:700;color:#333;padding:4px 0;">:</td>
                <td style="font-weight:700;color:#000;text-transform:uppercase;padding:4px 0;">${previewName}</td>
            </tr>
            <tr>
                <td style="font-weight:700;color:#333;padding:4px 0;">ĐIỆN THOẠI</td>
                <td style="font-weight:700;color:#333;padding:4px 0;">:</td>
                <td style="font-weight:700;color:#000;padding:4px 0;">${previewPhone}</td>
            </tr>
            <tr>
                <td style="font-weight:700;color:#333;padding:4px 0;">TÀI SẢN CẦM</td>
                <td style="font-weight:700;color:#333;padding:4px 0;">:</td>
                <td style="font-weight:700;color:#000;text-transform:uppercase;padding:4px 0;">${previewAssetType} - ${previewAssetDetail}</td>
            </tr>
            <tr>
                <td style="font-weight:700;color:#333;padding:4px 0;">SỐ TIỀN CẦM</td>
                <td style="font-weight:700;color:#333;padding:4px 0;">:</td>
                <td style="font-weight:700;color:#000;font-size:12px;padding:4px 0;">${previewAmount}</td>
            </tr>
            <tr>
                <td style="font-weight:700;color:#333;padding:4px 0;">BẰNG CHỮ</td>
                <td style="font-weight:700;color:#333;padding:4px 0;">:</td>
                <td style="font-weight:700;color:#000;text-transform:uppercase;padding:4px 0;">${previewAmountWords}</td>
            </tr>
            <tr>
                <td style="font-weight:700;color:#333;padding:4px 0;">NGÀY CẦM</td>
                <td style="font-weight:700;color:#333;padding:4px 0;">:</td>
                <td style="font-weight:700;color:#000;padding:4px 0;">${previewDate}</td>
            </tr>
            <tr>
                <td style="font-weight:700;color:#333;padding:4px 0;">LÃI THỎA THUẬN</td>
                <td style="font-weight:700;color:#333;padding:4px 0;">:</td>
                <td style="font-weight:700;color:#000;padding:4px 0;">${previewInterestNote}</td>
            </tr>
        </table>
        
        <div style="border-bottom:1px dashed #bbb;margin:8px 0;"></div>
        
        <div style="font-size:9.5px;color:#222;line-height:1.4;margin-bottom:8px;">
            <div style="font-weight:700;color:#000;margin-bottom:3px;text-transform:uppercase;">KHÁCH HÀNG LƯU Ý:</div>
            <div style="margin-bottom:2px;">Tài sản thế chấp trên thuộc quyền sở hữu của tôi. Tôi cam đoan Nếu sai tôi hoàn toàn chịu trách nhiệm trước pháp luật.</div>
            <div style="margin-bottom:2px;">${previewTermsNote}</div>
            <div>Nếu đánh mất Giấy mà Giấy đó đã có người đến chuộc đồ, đồ không còn chúng tôi không chịu trách nhiệm.</div>
        </div>
        
        <table style="width:100%;border-collapse:collapse;margin:6px 0;padding-top:6px;border-top:1.5px dashed #000;">
            <tr>
                <td style="width:50%;text-align:center;vertical-align:middle;padding-right:10px;">
                    <div style="font-size:8px;color:#555;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:3px;line-height:1.2;">CCCD MẶT TRƯỚC:</div>
                    <div style="min-height:148px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;">
                        ${frontCccdImgHtml}
                    </div>
                </td>
                <td style="width:50%;text-align:center;vertical-align:middle;border-left:1px dashed #bbb;padding-left:10px;">
                    <div style="font-size:8px;color:#555;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:3px;line-height:1.2;">CCCD MẶT SAU:</div>
                    <div style="min-height:148px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;">
                        ${backCccdImgHtml}
                    </div>
                </td>
            </tr>
        </table>
        
        <table style="width:100%;border-collapse:collapse;margin-top:auto;padding-top:10px;font-size:10px;font-weight:700;color:#000;">
            <tr>
                <td style="width:50%;text-align:center;vertical-align:top;">
                    <div style="text-transform:uppercase;margin-bottom:40px;">CHỦ TIỆM</div>
                    <div style="font-weight:600;color:#555;">CẦM ĐỒ 60</div>
                </td>
                <td style="width:50%;text-align:center;vertical-align:top;">
                    <div style="text-transform:uppercase;margin-bottom:40px;">KHÁCH HÀNG</div>
                    <div style="font-weight:700;color:#000;text-transform:uppercase;">${previewSignatureName}</div>
                </td>
            </tr>
        </table>
        </div>
    </div>
    `;
    
    const renderEl = pdfContainer.querySelector('#pdf-render-area');
    
    const opt = {
        margin: [0, 0, 0, 0],
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
    
    // Đợi layout và tải font để tránh lỗi diacritics fallback của trình duyệt
    return new Promise(function(resolve) {
        setTimeout(function() {
            document.fonts.ready.then(function() {
                html2pdf().set(opt).from(renderEl).toPdf().get('pdf').then(function(pdf) {
                    // Lưu file PDF về máy
                    pdf.save(`HoaDon_${contractId}.pdf`);
                    
                    // Dọn dẹp element tạm
                    if (pdfContainer.parentNode) {
                        pdfContainer.parentNode.removeChild(pdfContainer);
                    }
                    
                    // Upload lên Google Drive (chạy ngầm)
                    if (gasUrl && !isDemoMode) {
                        try {
                            const pdfDataUri = pdf.output('datauristring');
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
                        } catch (err) {
                            console.error("Lỗi trích xuất PDF data URI:", err);
                        }
                    }
                    resolve();
                }).catch(function(err) {
                    console.error("PDF generation error:", err);
                    resolve();
                });
            });
        }, 150);
    });
}

// ==================== EDIT CONTRACT ====================
function openEditContractModal(hdId) {
    const contract = state.contracts.find(c => c.Ma_HD === hdId);
    if (!contract) return;
    
    document.getElementById('modal-edit-hd-id').value = hdId;
    document.getElementById('modal-edit-hd-display').innerText = hdId;
    document.getElementById('modal-edit-customer-display').innerText = contract.Ten_Khach_Hang;
    
    const currentAmount = parseFloat(contract.So_Tien_Cam) || 0;
    document.getElementById('modal-edit-current-amount').innerText = formatVND(currentAmount);
    document.getElementById('modal-edit-amount-input').value = formatNumber(currentAmount);
    document.getElementById('modal-edit-notes').value = contract.Ghi_Chu || "";
    document.getElementById('modal-edit-reason').value = "";
    
    document.getElementById('edit-contract-modal').classList.remove('hidden');
}

function closeEditContractModal() {
    document.getElementById('edit-contract-modal').classList.add('hidden');
}

async function handleEditContract(e) {
    e.preventDefault();
    if (isSubmitting) return;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
    }
    isSubmitting = true;
    
    try {
        const hdId = document.getElementById('modal-edit-hd-id').value;
        const rawAmount = document.getElementById('modal-edit-amount-input').value.replace(/,/g, '');
        const newAmount = parseFloat(rawAmount) || 0;
        const newNotes = document.getElementById('modal-edit-notes').value.trim();
        const reason = document.getElementById('modal-edit-reason').value.trim();
        
        if (newAmount <= 0) {
            showToast("Số tiền cầm phải lớn hơn 0!", "error");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
            isSubmitting = false;
            return;
        }
        
        if (!reason) {
            showToast("Vui lòng nhập lý do chỉnh sửa!", "error");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
            isSubmitting = false;
            return;
        }
        
        showLoading(true, "Đang cập nhật hợp đồng...");
        
        const contract = state.contracts.find(c => c.Ma_HD === hdId);
        const oldAmount = contract ? (parseFloat(contract.So_Tien_Cam) || 0) : 0;
        const oldNotes = contract ? (contract.Ghi_Chu || "") : "";
        
        const payload = {
            action: "editContract",
            Ma_HD: hdId,
            So_Tien_Cam: newAmount,
            Ghi_Chu: newNotes,
            Ly_Do: reason
        };
        
        const res = await postToAPI(payload);
        
        if (res.success) {
            // Cập nhật local state
            const contractIdx = state.contracts.findIndex(c => c.Ma_HD === hdId);
            if (contractIdx > -1) {
                state.contracts[contractIdx].So_Tien_Cam = newAmount;
                state.contracts[contractIdx].Ghi_Chu = newNotes;
            }
            
            localStorage.setItem('pawnshop_contracts', JSON.stringify(state.contracts));
            
            closeEditContractModal();
            
            let changeLog = `Sửa HĐ ${hdId}: `;
            if (oldAmount !== newAmount) {
                changeLog += `Tiền cầm ${formatVND(oldAmount)} → ${formatVND(newAmount)}. `;
            }
            if (oldNotes !== newNotes) {
                changeLog += `Ghi chú đã cập nhật. `;
            }
            changeLog += `Lý do: ${reason}`;
            
            showToast(changeLog, "success");
            renderAll();
        } else {
            showToast("Lỗi khi sửa hợp đồng: " + (res.error || "Lỗi API"), "error");
        }
    } catch (error) {
        console.error("Lỗi trong handleEditContract:", error);
        showToast("Đã xảy ra lỗi hệ thống khi sửa hợp đồng!", "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
        isSubmitting = false;
        showLoading(false);
        syncData();
    }
}

// ==================== LIQUIDATION HELPERS ====================
function openLiquidateContractModal(hdId, customerName, principal) {
    const contract = state.contracts.find(c => c.Ma_HD === hdId);
    const currentStatus = contract ? contract.Trang_Thai : 'Liquidating';
    
    document.getElementById('modal-liquidate-hd-id').value = hdId;
    document.getElementById('modal-liquidate-customer-name').value = customerName;
    document.getElementById('modal-liquidate-hd-display').innerText = hdId;
    document.getElementById('modal-liquidate-customer-display').innerText = customerName;
    
    const principalVal = parseFloat(principal) || 0;
    document.getElementById('modal-liquidate-principal-display').innerText = formatVND(principalVal);
    
    document.getElementById('modal-liquidate-status-select').value = (currentStatus === 'Liquidating') ? 'Liquidating' : 'Liquidating';
    document.getElementById('modal-liquidate-amount-input').value = formatNumber(principalVal);
    
    toggleLiquidationAmountField();
    document.getElementById('liquidate-contract-modal').classList.remove('hidden');
}

function closeLiquidateContractModal() {
    document.getElementById('liquidate-contract-modal').classList.add('hidden');
}

function toggleLiquidationAmountField() {
    const select = document.getElementById('modal-liquidate-status-select');
    const container = document.getElementById('modal-liquidate-amount-container');
    const input = document.getElementById('modal-liquidate-amount-input');
    
    if (select.value === 'Liquidated') {
        container.classList.remove('hidden');
        input.required = true;
    } else {
        container.classList.add('hidden');
        input.required = false;
    }
}

async function handleLiquidateContract(e) {
    e.preventDefault();
    if (isSubmitting) return;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
    }
    isSubmitting = true;
    
    try {
        const hdId = document.getElementById('modal-liquidate-hd-id').value;
        const name = document.getElementById('modal-liquidate-customer-name').value;
        const newStatus = document.getElementById('modal-liquidate-status-select').value;
        const rawAmount = document.getElementById('modal-liquidate-amount-input').value.replace(/,/g, '');
        const amountVal = parseFloat(rawAmount) || 0;
        
        if (newStatus === 'Liquidated' && amountVal <= 0) {
            showToast("Số tiền thu hồi phải lớn hơn 0 khi đã thanh lý!", "error");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
            isSubmitting = false;
            return;
        }
        
        showLoading(true, "Đang cập nhật trạng thái thanh lý...");
        
        const payload = {
            action: "liquidateContract",
            Ma_HD: hdId,
            Trang_Thai: newStatus,
            So_Tien_Dong: newStatus === 'Liquidated' ? amountVal : 0,
            Ten_Khach_Hang: name
        };
        
        const res = await postToAPI(payload);
        
        if (res.success) {
            const contractIdx = state.contracts.findIndex(c => c.Ma_HD === hdId);
            if (contractIdx > -1) {
                state.contracts[contractIdx].Trang_Thai = newStatus;
            }
            
            if (newStatus === 'Liquidated' && amountVal > 0) {
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
                    Ghi_Chu: "Thanh lý tài sản thu hồi vốn"
                };
                
                state.history.push(newPayment);
            }
            
            localStorage.setItem('pawnshop_contracts', JSON.stringify(state.contracts));
            localStorage.setItem('pawnshop_history', JSON.stringify(state.history));
            
            closeLiquidateContractModal();
            showToast(`Đã chuyển trạng thái hợp đồng ${hdId}!`, "success");
            switchTab('active-contracts');
        } else {
            showToast("Lỗi khi thanh lý hợp đồng: " + (res.error || "Lỗi API"), "error");
        }
    } catch (error) {
        console.error("Lỗi trong handleLiquidateContract:", error);
        showToast("Đã xảy ra lỗi hệ thống khi thanh lý!", "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
        isSubmitting = false;
        showLoading(false);
        syncData();
    }
}

function toggleReceiptMobile() {
    const el = document.getElementById('receipt-preview-container');
    const icon = document.getElementById('toggle-receipt-icon');
    const text = document.getElementById('toggle-receipt-text');
    if (!el || !icon || !text) return;
    
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        icon.className = "fa-solid fa-eye-slash text-[10px]";
        text.innerText = "Ẩn xem trước";
    } else {
        el.classList.add('hidden');
        icon.className = "fa-solid fa-eye text-[10px]";
        text.innerText = "Hiện xem trước";
    }
}

function clearHistoryFiltersAndRefresh() {
    const searchInput = document.getElementById('search-history');
    const dateInput = document.getElementById('history-date-filter');
    if (searchInput) searchInput.value = "";
    if (dateInput) dateInput.value = "";
    filterHistory();
}

function toggleTheme() {
    const root = document.documentElement;
    const icon = document.getElementById('theme-toggle-icon');
    const text = document.getElementById('theme-toggle-text');
    
    if (root.classList.contains('theme-light')) {
        // Switch to dark mode
        root.classList.remove('theme-light');
        localStorage.setItem('pawnshop_theme', 'dark');
        if (icon) icon.className = "fa-solid fa-sun";
        if (text) text.innerText = "Giao diện sáng";
        showToast("Đã chuyển sang Giao diện tối!", "success");
    } else {
        // Switch to light mode
        root.classList.add('theme-light');
        localStorage.setItem('pawnshop_theme', 'light');
        if (icon) icon.className = "fa-solid fa-moon";
        if (text) text.innerText = "Giao diện tối";
        showToast("Đã chuyển sang Giao diện sáng!", "success");
    }
}

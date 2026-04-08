/**
 * Turtle WoW Tier Progression - Data Handler
 */
let consumablesData = [];
const REFRESH_INTERVAL_MS = 60000;
const GOOGLE_SHEET_CSV_URL = window.CONSUMABLES_SHEET_CSV_URL || null;

// 1. Data Mappings for Roles
const classRoles = {
    "all": ["tank", "healer", "melee", "ranged"],
    "warrior": ["tank", "melee"],
    "mage": ["ranged"],
    "rogue": ["melee", "tank"],
    "priest": ["healer", "ranged"],
    "hunter": ["melee", "ranged"],
    "warlock": ["ranged", "tank"],
    "druid": ["melee", "ranged", "tank", "healer"],
    "shaman": ["melee", "ranged", "tank", "healer"],
    "paladin": ["melee", "tank", "healer"]
};

const roleLabels = {
    "tank": "Tank",
    "healer": "Healer",
    "melee": "Melee DPS",
    "ranged": "Ranged DPS"
};

// 2. DOM Elements
const classSelect = document.getElementById('class-select');
const roleSelect = document.getElementById('role-select');
const tierSelect = document.getElementById('tier-select');
const tierSearch = document.getElementById('tier-search');
const tableBody = document.querySelector('#consumables-table tbody');

// 3. Update Role Menu
function updateRoleMenu() {
    const selectedClass = classSelect.value;
    const roles = classRoles[selectedClass] || classRoles["all"];
    roleSelect.innerHTML = '<option value="all">All Roles</option>';
    roles.forEach(roleKey => {
        const option = document.createElement('option');
        option.value = roleKey;
        option.textContent = roleLabels[roleKey];
        roleSelect.appendChild(option);
    });
    updateTable();
}

// 4. Load Data
function parseBoolean(value) {
    return String(value).trim().toLowerCase() === 'true';
}

function parseList(value) {
    if (!value) return [];
    return String(value)
        .split(/[|,;]/)
        .map(v => v.trim().toLowerCase())
        .filter(Boolean);
}

function normalizeHeader(header) {
    return String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getField(record, aliases) {
    for (const alias of aliases) {
        const value = record[alias];
        if (value !== undefined && String(value).trim() !== '') {
            return value;
        }
    }
    return '';
}

function parseId(value) {
    const id = String(value || '').trim();
    return /^\d+$/.test(id) ? id : '';
}

function buildDatabaseUrl(item) {
    if (item.id) {
        return `https://database.turtlecraft.gg/?item=${encodeURIComponent(item.id)}`;
    }
    return `https://database.turtlecraft.gg/?search=${encodeURIComponent(item.name)}`;
}

function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

function parseSheetCsv(text) {
    const rows = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (rows.length < 2) return [];

    const headers = parseCsvLine(rows[0]).map(normalizeHeader);

    return rows.slice(1).map(row => {
        const values = parseCsvLine(row);
        const record = {};

        headers.forEach((header, index) => {
            record[header] = values[index] ?? '';
        });

        return {
            id: parseId(getField(record, ['id', 'itemid', 'item'])),
            name: getField(record, ['name', 'itemname']),
            tier: parseList(getField(record, ['tier', 'tiers', 'raidtier'])),
            effect: getField(record, ['effect', 'buff', 'description']),
            duration: getField(record, ['duration', 'length']),
            persists: parseBoolean(getField(record, ['persists', 'persiststhroughdeath', 'deathpersist'])),
            stacks: getField(record, ['stacks', 'stacking', 'stackingnotes']),
            isFood: parseBoolean(getField(record, ['isfood', 'food', 'fooditem'])),
            roles: parseList(getField(record, ['roles', 'role'])),
            classes: parseList(getField(record, ['classes', 'class']))
        };
    }).filter(item => item.name);
}

async function loadTierData() {
    try {
        if (GOOGLE_SHEET_CSV_URL) {
            const response = await fetch(GOOGLE_SHEET_CSV_URL, { cache: 'no-store' });
            if (!response.ok) throw new Error('Could not load Google Sheet CSV');
            const csvText = await response.text();
            consumablesData = parseSheetCsv(csvText);
            if (consumablesData.length === 0) {
                throw new Error('Google Sheet returned no rows');
            }
        } else {
            const response = await fetch('consumables.json');
            if (!response.ok) throw new Error('Could not find consumables.json');
            consumablesData = await response.json();
        }
        // Initialize the table once data is loaded
        updateTable();
    } catch (error) {
        console.error('Error loading tier data:', error);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error loading data from Google Sheet or local JSON.</td></tr>`;
        }
    }
}

// 5. Filter and Render
function updateTable() {
    if (!tableBody) return;

    const selectedClass = classSelect.value;
    const selectedRole = roleSelect.value;
    const selectedTier = tierSelect.value;
    const query = tierSearch.value.toLowerCase().trim();

    const filtered = consumablesData.filter(item => {
        // Search filter (highest priority)
        if (query.length > 0) return item.name.toLowerCase().includes(query);

        // Tier check: Handles both string and array formats in JSON
        const itemTiers = Array.isArray(item.tier) ? item.tier : [item.tier];
        const tierMatch = (selectedTier === 'all' || itemTiers.includes(selectedTier));
        
        // Class check
        const classMatch = (selectedClass === 'all' || (item.classes && item.classes.includes(selectedClass)));

        // Role check
        const roleMatch = (selectedRole === 'all' || (item.roles && item.roles.includes(selectedRole)));

        return tierMatch && classMatch && roleMatch;
    });

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">No items match these filters.</td></tr>`;
        return;
    }

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        
        const nameLink = document.createElement('a');
        nameLink.href = buildDatabaseUrl(item);
        nameLink.target = "_blank";
        nameLink.textContent = item.name;

        // Tooltip logic
        nameLink.addEventListener('mouseenter', () => {
            const tooltip = document.getElementById('wow-tooltip');
            if (tooltip) {
                tooltip.style.display = 'block';
                tooltip.innerHTML = `
                    <div class="tooltip-title">${item.name}</div>
                    <div class="tooltip-sub">${item.duration} Duration</div>
                    <div class="tooltip-effect" style="color: #ffd100; margin-top: 8px;">${item.effect}</div>
                    <div class="tooltip-sub" style="margin-top: 8px; color: #aaa;"></div>
                `;
            }
        });

        nameLink.addEventListener('mousemove', (e) => {
            const tooltip = document.getElementById('wow-tooltip');
            if (tooltip) {
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
            }
        });

        nameLink.addEventListener('mouseleave', () => {
            const tooltip = document.getElementById('wow-tooltip');
            if (tooltip) tooltip.style.display = 'none';
        });

        tr.innerHTML = `
            <td class="item-name-cell"></td>
            <td>${item.effect}</td>
            <td>${item.duration}</td>
            <td>${item.persists ? "Yes" : "No"}</td>
            <td>${item.stacks || ''}</td>
        `;
        
        const nameCell = tr.querySelector('.item-name-cell');
        if (nameCell) nameCell.appendChild(nameLink);
        tableBody.appendChild(tr);
    });
}

// 6. Event Listeners
classSelect.addEventListener('change', updateRoleMenu);
roleSelect.addEventListener('change', updateTable);
tierSelect.addEventListener('change', updateTable);
tierSearch.addEventListener('input', updateTable);

// 7. Initialize
loadTierData();
setInterval(loadTierData, REFRESH_INTERVAL_MS);
/**
 * Turtle WoW Consumables - Data Handler
 */

let consumablesData = [];
const REFRESH_INTERVAL_MS = 60000;
const GOOGLE_SHEET_CSV_URL = window.CONSUMABLES_SHEET_CSV_URL || null;

// 1. Data Mappings
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

// 2. Grab DOM Elements
const classSelect = document.getElementById('class-select');
const roleSelect = document.getElementById('role-select');
const foodCheckbox = document.getElementById('food-checkbox');
const protectionCheckbox = document.getElementById('protection-checkbox'); // New Element
const originCheckboxes = Array.from(document.querySelectorAll('.origin-checkbox'));
const searchInput = document.getElementById('search-input');
const tableBody = document.querySelector('#consumables-table tbody');

// 3. Update Role Menu
function updateRoleMenu() {
    const selectedClass = classSelect.value;
    const roles = classRoles[selectedClass];
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

function formatTooltipOrigins(item) {
    const raw = item.origin;
    if (!raw) return '';
    const parts = Array.isArray(raw)
        ? raw.map(s => String(s).trim()).filter(Boolean)
        : parseList(String(raw));
    if (!parts.length) return '';
    return parts.join(', ');
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
            iconUrl: getField(record, ['iconurl', 'icon', 'iconlink', 'imageurl']),
            tier: parseList(getField(record, ['tier', 'tiers', 'raidtier'])),
            effect: getField(record, ['effect', 'buff', 'description']),
            duration: getField(record, ['duration', 'length']),
            persists: parseBoolean(getField(record, ['persists', 'persiststhroughdeath', 'deathpersist'])),
            stacks: getField(record, ['stacks', 'stacking', 'stackingnotes']),
            origin: parseList(getField(record, ['origin', 'origins', 'source', 'sources'])),
            isFood: parseBoolean(getField(record, ['isfood', 'food', 'fooditem'])),
            roles: parseList(getField(record, ['roles', 'role'])),
            classes: parseList(getField(record, ['classes', 'class']))
        };
    }).filter(item => item.name);
}

async function loadConsumables() {
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
        updateTable();
    } catch (error) {
        console.error(error);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: red;">Error: Could not load data from Google Sheet or local JSON.</td></tr>`;
    }
}

// 5. Filter and Render Function
function updateTable() {
    const selectedClass = classSelect.value;
    const selectedRole = roleSelect.value;
    const includeFood = foodCheckbox.checked;
    const includeProtection = protectionCheckbox.checked; // New State
    const selectedOrigins = originCheckboxes.filter(cb => cb.checked).map(cb => cb.value.toLowerCase());
    const allOriginsSelected = originCheckboxes.length > 0 && selectedOrigins.length === originCheckboxes.length;
    const query = searchInput.value.toLowerCase().trim();

    const filteredData = consumablesData.filter(item => {
        // --- SEARCH OVERRIDE LOGIC ---
        if (query.length > 0) {
            return item.name.toLowerCase().includes(query);
        }

        // --- NORMAL FILTER LOGIC ---
        // Protection Check: If unchecked, hide items with "Protection" in the name
        if (!includeProtection && item.name.toLowerCase().includes("protection")) return false;

        // Food check
        if (!includeFood && item.isFood) return false;

        // Origin check (backward-compatible with rows that do not define origin)
        if (selectedOrigins.length > 0 && !allOriginsSelected) {
            const itemOrigins = Array.isArray(item.origin) ? item.origin : parseList(item.origin);
            if (itemOrigins.length === 0) return false;
            const originMatch = itemOrigins.some(origin => selectedOrigins.includes(origin));
            if (!originMatch) return false;
        }
        
        // Class check
        const classMatch = (selectedClass === 'all' || item.classes.includes(selectedClass));
        
        // Role check
        const roleMatch = (selectedRole === 'all' || item.roles.includes(selectedRole));

        return classMatch && roleMatch;
    });

    tableBody.innerHTML = '';

    if (filteredData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No items match these filters.</td></tr>`;
        return;
    }

filteredData.forEach(item => {
    const tr = document.createElement('tr');
    
    const nameLink = document.createElement('a');
    nameLink.href = buildDatabaseUrl(item);
    nameLink.target = "_blank";
    nameLink.textContent = item.name;

    // Show Tooltip
    nameLink.addEventListener('mouseenter', () => {
        const tooltipEl = document.getElementById('wow-tooltip'); // Define inside or ensure global access
        tooltipEl.style.display = 'block';
        const iconHtml = item.iconUrl
            ? `<img class="tooltip-icon" src="${item.iconUrl}" alt="${item.name} icon" loading="lazy" referrerpolicy="no-referrer">`
            : '';
        const originText = formatTooltipOrigins(item);
        const originHtml = originText
            ? `<div class="tooltip-sub tooltip-origin">Origin: ${originText}</div>`
            : '';
        tooltipEl.innerHTML = `
            <div class="tooltip-header">
                ${iconHtml}
                <div class="tooltip-title">${item.name}</div>
            </div>
            <div class="tooltip-sub">${item.duration} Duration</div>
            <div class="tooltip-effect" style="color: #ffd100; margin-top: 8px;">${item.effect}</div>
            ${originHtml}
        `;
    });

    // Move Tooltip
    nameLink.addEventListener('mousemove', (e) => {
        const tooltipEl = document.getElementById('wow-tooltip');
        tooltipEl.style.left = (e.clientX + 15) + 'px';
        tooltipEl.style.top = (e.clientY + 15) + 'px';
    });

    // Hide Tooltip
    nameLink.addEventListener('mouseleave', () => {
        const tooltipEl = document.getElementById('wow-tooltip');
        tooltipEl.style.display = 'none';
    });

    tr.innerHTML = `
        <td class="item-name-cell"></td> 
        <td>${item.effect}</td>
        <td>${item.duration}</td>
        <td>${item.persists ? "Yes" : "No"}</td>
        <td>${item.stacks || ''}</td>
    `;
    
    tr.querySelector('.item-name-cell').appendChild(nameLink);
    tableBody.appendChild(tr);
});
}

// 6. Event Listeners
classSelect.addEventListener('change', updateRoleMenu);
roleSelect.addEventListener('change', updateTable);
foodCheckbox.addEventListener('change', updateTable);
protectionCheckbox.addEventListener('change', updateTable); // New Listener
originCheckboxes.forEach(cb => cb.addEventListener('change', updateTable));
searchInput.addEventListener('input', updateTable);

// 7. Initialize
loadConsumables();
setInterval(loadConsumables, REFRESH_INTERVAL_MS);
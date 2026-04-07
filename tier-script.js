/**
 * Turtle WoW Tier Progression - Data Handler
 */
let consumablesData = [];

// Data Mappings for Roles (from script.js)
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

// DOM Elements
const classSelect = document.getElementById('class-select');
const roleSelect = document.getElementById('role-select');
const tierSelect = document.getElementById('tier-select');
const tierSearch = document.getElementById('tier-search');
const tableBody = document.querySelector('#consumables-table tbody');

// Synchronize Role Menu (matches script.js)
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
    updateTierTable();
}

async function loadTierData() {
    try {
        const response = await fetch('consumables.json');
        if (!response.ok) throw new Error('Could not find consumables.json');
        consumablesData = await response.json();
        updateTierTable();
    } catch (error) {
        console.error(error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error loading data.</td></tr>`;
    }
}

function updateTierTable() {
    const selectedClass = classSelect.value;
    const selectedRole = roleSelect.value;
    const selectedTier = tierSelect.value;
    const query = tierSearch.value.toLowerCase().trim();

    const filtered = consumablesData.filter(item => {
        // 1. Search Override
        if (query.length > 0) {
            return item.name.toLowerCase().includes(query);
        }

        // 2. Tier Filter (Supports single string or array)
        const tierMatch = (selectedTier === 'all' || 
                          (Array.isArray(item.tier) ? item.tier.includes(selectedTier) : item.tier === selectedTier));
        
        // 3. Class Match
        const classMatch = (selectedClass === 'all' || item.classes.includes(selectedClass));

        // 4. Role Match
        const roleMatch = (selectedRole === 'all' || item.roles.includes(selectedRole));

        return tierMatch && classMatch && roleMatch;
    });

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">No items match these tier/class/role filters.</td></tr>`;
        return;
    }

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        const dbUrl = `https://database.turtlecraft.gg/?search=${encodeURIComponent(item.name)}`;
        
        tr.innerHTML = `
            <td><a href="${dbUrl}" target="_blank">${item.name}</a></td>
            <td>${item.effect}</td>
            <td>${item.duration}</td>
            <td>${item.persists ? "Yes" : "No"}</td>
            <td>${item.stacks}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// Event Listeners
classSelect.addEventListener('change', updateRoleMenu);
roleSelect.addEventListener('change', updateTierTable);
tierSelect.addEventListener('change', updateTierTable);
tierSearch.addEventListener('input', updateTierTable);

loadTierData();
/**
 * Turtle WoW Consumables - Data Handler
 */

let consumablesData = [];

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
async function loadConsumables() {
    try {
        const response = await fetch('consumables.json');
        if (!response.ok) throw new Error('Could not find consumables.json');
        consumablesData = await response.json();
        updateTable();
    } catch (error) {
        console.error(error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: red;">Error: Could not load data.</td></tr>`;
    }
}

// 5. Filter and Render Function
function updateTable() {
    const selectedClass = classSelect.value;
    const selectedRole = roleSelect.value;
    const includeFood = foodCheckbox.checked;
    const includeProtection = protectionCheckbox.checked; // New State
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
        
        // Class check
        const classMatch = (selectedClass === 'all' || item.classes.includes(selectedClass));
        
        // Role check
        const roleMatch = (selectedRole === 'all' || item.roles.includes(selectedRole));

        return classMatch && roleMatch;
    });

    tableBody.innerHTML = '';

    if (filteredData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">No items match these filters.</td></tr>`;
        return;
    }

    filteredData.forEach(item => {
        const tr = document.createElement('tr');
        const dbUrl = `https://database.turtlecraft.gg/?search=${encodeURIComponent(item.name)}`;
        tr.innerHTML = `
            <td><a href="${dbUrl}" target="_blank" rel="noopener noreferrer">${item.name}</a></td>
            <td>${item.effect}</td>
            <td>${item.duration}</td>
            <td>${item.persists ? "Yes" : "No"}</td>
            
        `;
        tableBody.appendChild(tr);
    });
}

// 6. Event Listeners
classSelect.addEventListener('change', updateRoleMenu);
roleSelect.addEventListener('change', updateTable);
foodCheckbox.addEventListener('change', updateTable);
protectionCheckbox.addEventListener('change', updateTable); // New Listener
searchInput.addEventListener('input', updateTable);

// 7. Initialize
loadConsumables();
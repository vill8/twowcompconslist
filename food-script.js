let foodData = [];

const foodTableBody = document.querySelector('#food-table tbody');
const statFilter = document.getElementById('stat-filter');
const foodSearch = document.getElementById('food-search');

async function loadFoodData() {
    try {
        const response = await fetch('food.json');
        if (!response.ok) throw new Error('Could not find food.json');
        foodData = await response.json();
        renderFoodTable();
    } catch (error) {
        console.error('Error:', error);
        foodTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Failed to load food data.</td></tr>`;
    }
}

function renderFoodTable() {
    const selectedStat = statFilter.value;
    const query = foodSearch.value.toLowerCase().trim();

    const filtered = foodData.filter(item => {
        const statMatch = selectedStat === 'all' || item.statType === selectedStat;
        const searchMatch = item.name.toLowerCase().includes(query);
        return statMatch && searchMatch;
    });

    foodTableBody.innerHTML = '';

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        const dbUrl = `https://database.turtlecraft.gg/?search=${encodeURIComponent(item.name)}`;
        
        tr.innerHTML = `
            <td><a href="${dbUrl}" target="_blank" rel="noopener noreferrer">${item.name}</a></td>
            <td>${item.buff}</td>
            <td><span class="stat-tag stat-${item.statType}">${item.statType}</span></td>
            <td>${item.duration}</td>
        `;
        foodTableBody.appendChild(tr);
    });
}

statFilter.addEventListener('change', renderFoodTable);
foodSearch.addEventListener('input', renderFoodTable);

loadFoodData();